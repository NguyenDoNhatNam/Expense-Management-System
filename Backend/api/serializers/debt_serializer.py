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
            raise serializers.ValidationError("Ngày bắt đầu không được lớn hơn ngày đáo hạn")
        if data['amount'] <= 0:
            raise serializers.ValidationError("Số tiền phải lớn hơn 0")
        return data

class CreateDebtPaymentSerializer(serializers.Serializer):
    payment_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=True)
    payment_date = serializers.DateField(required=True)
    note = serializers.CharField(required=False, allow_blank=True, default='')
    # Validation amount có thể check thêm nhỏ hơn remaining_amount trong Service