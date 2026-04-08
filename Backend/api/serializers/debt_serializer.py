from rest_framework import serializers
from api.models import Debts, DebtPayment

class DebtListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debts
        fields = '__all__'

class CreateDebtSerializer(serializers.Serializer):
    debt_type = serializers.ChoiceField(choices=['lend', 'borrow'], required=True)
    person_name = serializers.CharField(max_length=200, required=True)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=True)
    interest_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    start_date = serializers.DateField(required=True)
    due_date = serializers.DateField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['start_date'] > data['due_date']:
            raise serializers.ValidationError("Start date must not be later than due date")
        if data['amount'] <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return data

class CreateDebtPaymentSerializer(serializers.Serializer):
    payment_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=True)
    payment_date = serializers.DateField(required=True)
    note = serializers.CharField(required=False, allow_blank=True, default='')
    # Validation amount can additionally check less than remaining_amount in Service