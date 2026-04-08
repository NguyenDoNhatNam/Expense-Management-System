from rest_framework import serializers
from api.models import RecurringTransactions, Accounts, Categories

class RecurringListSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    category_name = serializers.CharField(source='category.category_name', read_only=True)

    class Meta:
        model = RecurringTransactions
        fields = '__all__'

class CreateRecurringSerializer(serializers.Serializer):
    account_id = serializers.CharField()
    category_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=2)
    transaction_type = serializers.ChoiceField(choices=['income', 'expense'])
    frequency = serializers.ChoiceField(choices=['daily', 'weekly', 'monthly', 'yearly'])
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        user = self.context.get('user')
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must not be later than end date")

        try:
            data['account'] = Accounts.objects.get(account_id=data['account_id'], user=user)
        except Accounts.DoesNotExist:
            raise serializers.ValidationError("Account does not exist or does not belong to you")

        try:
            category = Categories.objects.get(category_id=data['category_id'], user=user)
            if category.category_type != data['transaction_type']:
                raise serializers.ValidationError("Category type does not match the transaction type")
            data['category'] = category
        except Categories.DoesNotExist:
            raise serializers.ValidationError("Category does not exist")

        return data

class UpdateRecurringSerializer(serializers.Serializer):
    account_id = serializers.CharField(required=False)
    category_id = serializers.CharField(required=False)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    transaction_type = serializers.ChoiceField(choices=['income', 'expense'], required=False)
    frequency = serializers.ChoiceField(choices=['daily', 'weekly', 'monthly', 'yearly'], required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate(self, data):
        
        if 'start_date' in data and 'end_date' in data and data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date must not be later than end date")
        return data
