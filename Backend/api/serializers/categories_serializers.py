from rest_framework import serializers
from api.models import Categories

class CategoryListSerializer(serializers.Serializer):
    category_id = serializers.CharField()
    category_name = serializers.CharField()
    category_type = serializers.CharField()
    icon = serializers.CharField(allow_null=True)
    color = serializers.CharField(allow_null=True)
    is_default = serializers.BooleanField()
    parent_category_id = serializers.CharField(source='parent_category.category_id', allow_null=True)
    
    transaction_count = serializers.IntegerField(default=0)
    total_amount = serializers.DecimalField(max_digits=18, decimal_places=2, default=0)

    children = serializers.SerializerMethodField()

    def get_children(self, obj):
        if self.context.get('tree_mode', False):
            children = getattr(obj, '_children', [])
            return CategoryListSerializer(children, many=True, context=self.context).data
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get('tree_mode', False):
            data.pop('children', None)
        return data

class CreateCategorySerializer(serializers.Serializer):
    category_name = serializers.CharField(max_length=100, required=True)
    category_type = serializers.ChoiceField(choices=[('income', 'Income'), ('expense', 'Expense')], required=True)
    icon = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    color = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    parent_category_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    is_default = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        user = self.context.get('user')
        
        # Check category name uniqueness for this user and type
        if Categories.objects.filter(
            user=user, 
            category_name__iexact=data.get('category_name'),
            category_type=data.get('category_type')
        ).exists():
            raise serializers.ValidationError('This category name already exists in your account')

        # 2. Validate: parent_category_id must belong to this user if provided
        parent_id = data.get('parent_category_id')
        if parent_id:
            try:
                parent_cat = Categories.objects.get(category_id=parent_id, user=user)
                # Check that parent and child must have the same type
                if parent_cat.category_type != data.get('category_type'):
                    raise serializers.ValidationError('Parent and child categories must be the same type (Income/Expense)')
                data['parent_category'] = parent_cat
            except Categories.DoesNotExist:
                raise serializers.ValidationError('Parent category does not exist or does not belong to you')
        else:
            data['parent_category'] = None

        return data


class UpdateCategorySerializer(serializers.Serializer):
    category_name = serializers.CharField(max_length=100, required=False)
    icon = serializers.CharField(max_length=100, required=False, allow_blank=True)
    color = serializers.CharField(max_length=100, required=False, allow_blank=True)
    parent_category_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    is_default = serializers.BooleanField(required=False)

    def validate(self, data):
        user = self.context.get('user')
        category = self.context.get('category')

        # 1. Validate duplicate name (if renaming)
        new_name = data.get('category_name')
        if new_name and new_name.lower() != category.category_name.lower():
            if Categories.objects.filter(user=user, category_name__iexact=new_name, category_type=category.category_type).exists():
                raise serializers.ValidationError('This category name already exists in your account')

        # 2. Validate parent_category_id
        if 'parent_category_id' in data:
            parent_id = data.get('parent_category_id')
            if parent_id:
                if parent_id == category.category_id:
                    raise serializers.ValidationError('A category cannot be its own parent')
                try:
                    parent_cat = Categories.objects.get(category_id=parent_id, user=user)
                    if parent_cat.category_type != category.category_type:
                        raise serializers.ValidationError('Parent and child categories must be the same type (Income/Expense)')
                    data['parent_category'] = parent_cat
                except Categories.DoesNotExist:
                    raise serializers.ValidationError('Parent category does not exist')
            else:
                data['parent_category'] = None

        return data


class DeleteCategorySerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[('delete_all', 'Delete with transactions'), ('migrate', 'Migrate transactions')],
        required=False
    )
    target_category_id = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate(self, data):
        action = data.get('action')
        target_category_id = data.get('target_category_id')
        user = self.context.get('user')
        category = self.context.get('category')

        if action == 'migrate':
            if not target_category_id:
                raise serializers.ValidationError('Please select a target category to migrate transactions')
            try:
                target_cat = Categories.objects.get(category_id=target_category_id, user=user)
                if target_cat.category_type != category.category_type:
                    raise serializers.ValidationError('Target category must be the same type (Income/Expense) as the category being deleted')
                data['target_category'] = target_cat
            except Categories.DoesNotExist:
                raise serializers.ValidationError('Target category does not exist')
        return data
