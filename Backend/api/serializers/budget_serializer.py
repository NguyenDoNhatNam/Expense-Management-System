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
            raise serializers.ValidationError("Ngân sách phải lớn hơn 0")
        return value

    def validate_alert_threshold(self, value):
        if value < 1 or value > 100:
            raise serializers.ValidationError("Ngưỡng cảnh báo phải nằm trong khoảng 1 đến 100")
        return value
        
    def validate(self, data):
        user = self.context.get('user')
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Ngày bắt đầu không được lớn hơn ngày kết thúc")
            
        try:
            category = Categories.objects.get(category_id=data['category_id'], user=user)
            if category.category_type != 'expense':
                raise serializers.ValidationError("Ngân sách chỉ áp dụng cho danh mục chi tiêu (expense)")
            data['category'] = category
        except Categories.DoesNotExist:
            raise serializers.ValidationError("Danh mục không tồn tại")
            
        # Kiểm tra Overlap period
        overlapping = Budgets.objects.filter(
            user=user, category=category, is_active=True,
            start_date__lte=data['end_date'], end_date__gte=data['start_date']
        )
        if overlapping.exists():
            raise serializers.ValidationError("Đã có ngân sách hoạt động trong khoảng thời gian này cho danh mục được chọn")
            
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
            raise serializers.ValidationError("Ngày bắt đầu không được lớn hơn ngày kết thúc")
            
        if 'start_date' in data or 'end_date' in data or 'category_id' in data:
            overlapping = Budgets.objects.filter(user=user, category=budget.category, is_active=True, start_date__lte=end_date, end_date__gte=start_date).exclude(budget_id=budget.budget_id)
            if overlapping.exists():
                raise serializers.ValidationError("Đã có ngân sách khác hoạt động trong khoảng thời gian này")
            
        return data
