from rest_framework import serializers
from api.models import Budgets, Categories

class BudgetListSerializer(serializers.ModelSerializer):
    category_id = serializers.CharField(source='category.category_id', allow_null=True)
    category_name = serializers.CharField(source='category.category_name', allow_null=True)
    spent_amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Budgets
        fields = [
            'budget_id', 'budget_name', 'amount', 'period', 'start_date', 'end_date', 
            'alert_threshold', 'is_active', 'category_id', 'category_name', 
            'spent_amount', 'percentage'
        ]

    def get_percentage(self, obj):
        spent = getattr(obj, 'spent_amount', 0)
        if obj.amount and obj.amount > 0:
            return min(round((spent / obj.amount) * 100, 1), 999.9)
        return 0

class CreateBudgetSerializer(serializers.Serializer):
    category_id = serializers.CharField(required=True)
    budget_name = serializers.CharField(required=True, max_length=100)
    amount = serializers.DecimalField(required=True, max_digits=18, decimal_places=2)
    period = serializers.ChoiceField(choices=['daily', 'weekly', 'monthly', 'yearly'])
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    alert_threshold = serializers.IntegerField(required=False, default=80)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Budget amount must be greater than 0")
        return value

    def validate_alert_threshold(self, value):
        if value < 1 or value > 100:
            raise serializers.ValidationError("Alert threshold must be between 1 and 100")
        return value
        
    def validate(self, data):
        user = self.context.get('user')
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must not be later than end date")
            
        try:
            category = Categories.objects.get(category_id=data['category_id'], user=user)
            if category.category_type != 'expense':
                raise serializers.ValidationError("Budgets can only be applied to expense categories")
            data['category'] = category
        except Categories.DoesNotExist:
            raise serializers.ValidationError("Category does not exist")
            
        # Check Overlap period
        overlapping = Budgets.objects.filter(
            user=user, category=category, is_active=True,
            start_date__lte=data['end_date'], end_date__gte=data['start_date']
        )
        if overlapping.exists():
            raise serializers.ValidationError("An active budget already exists for this category during this period")
            
        return data

class UpdateBudgetSerializer(serializers.Serializer):
    category_id = serializers.CharField(required=False)
    budget_name = serializers.CharField(required=False, max_length=100)
    amount = serializers.DecimalField(required=False, max_digits=18, decimal_places=2)
    period = serializers.ChoiceField(choices=['daily', 'weekly', 'monthly', 'yearly'], required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    alert_threshold = serializers.IntegerField(required=False)

    def validate(self, data):
        user = self.context.get('user')
        budget = self.context.get('budget')
        start_date = data.get('start_date', budget.start_date)
        end_date = data.get('end_date', budget.end_date)
        
        if start_date > end_date:
            raise serializers.ValidationError("Start date must not be later than end date")
            
        if 'start_date' in data or 'end_date' in data or 'category_id' in data:
            overlapping = Budgets.objects.filter(user=user, category=budget.category, is_active=True, start_date__lte=end_date, end_date__gte=start_date).exclude(budget_id=budget.budget_id)
            if overlapping.exists():
                raise serializers.ValidationError("Another active budget already exists during this period")
            
        return data
