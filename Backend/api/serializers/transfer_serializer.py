from rest_framework import serializers
from api.models import Transfers
from django.utils import timezone

class TransferListSerializer(serializers.ModelSerializer):
    from_account_name = serializers.CharField(source='from_account.account_name', read_only=True)
    to_account_name = serializers.CharField(source='to_account.account_name', read_only=True)

    class Meta:
        model = Transfers
        fields = '__all__'

class CreateTransferSerializer(serializers.Serializer):
    from_account_id = serializers.CharField(required=True)
    to_account_id = serializers.CharField(required=True)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=True)
    fee = serializers.DecimalField(max_digits=18, decimal_places=2, required=False, default=0)
    transfer_date = serializers.DateField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['amount'] <= 0:
            raise serializers.ValidationError("Số tiền chuyển phải lớn hơn 0")
        if data.get('fee', 0) < 0:
            raise serializers.ValidationError("Phí chuyển khoản không được âm")
        if data['from_account_id'] == data['to_account_id']:
            raise serializers.ValidationError("Tài khoản nguồn và đích không được phép trùng nhau")
        
        # Nếu yêu cầu khắt khe có thể chặn ngày chuyển tiền ở tương lai
        if data['transfer_date'] > timezone.now().date():
            raise serializers.ValidationError("Ngày chuyển tiền không được ở tương lai")
        return data