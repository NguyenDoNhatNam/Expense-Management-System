from rest_framework import serializers
from api.models import Accounts

class AccountListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accounts
        fields = [
            'account_id', 'account_name', 'account_type', 'balance', 
            'currency', 'bank_name', 'account_number', 'description', 
            'is_include_in_total', 'created_at', 'updated_at'
        ]

class CreateAccountSerializer(serializers.Serializer):
    account_name = serializers.CharField(max_length=255, required=True)
    account_type = serializers.ChoiceField(
        choices=['cash', 'bank', 'credit_card', 'e_wallet', 'investment'],
        required=True
    )
    currency = serializers.CharField(max_length=3, required=True)
    initial_balance = serializers.DecimalField(max_digits=18, decimal_places=2, default=0)
    is_include_in_total = serializers.BooleanField(default=True)
    bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    account_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_initial_balance(self, value):
        if value < 0:
            raise serializers.ValidationError("Số dư ban đầu phải lớn hơn hoặc bằng 0")
        return value

    def validate(self, data):
        user = self.context.get('user')
        if Accounts.objects.filter(user=user, account_name__iexact=data.get('account_name')).exists():
            raise serializers.ValidationError("Tên tài khoản này đã tồn tại trong danh sách của bạn")
        return data

class UpdateAccountSerializer(serializers.Serializer):
    account_name = serializers.CharField(max_length=255, required=False)
    account_type = serializers.ChoiceField(
        choices=['cash', 'bank', 'credit_card', 'e_wallet', 'investment'],
        required=False
    )
    currency = serializers.CharField(max_length=3, required=False)
    is_include_in_total = serializers.BooleanField(required=False)
    bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    account_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        user = self.context.get('user')
        account = self.context.get('account')
        
        new_name = data.get('account_name')
        # Kiểm tra nếu người dùng thay đổi tên tài khoản
        if new_name and new_name.lower() != account.account_name.lower():
            if Accounts.objects.filter(user=user, account_name__iexact=new_name).exists():
                raise serializers.ValidationError("Tên tài khoản này đã tồn tại")
        
        # Nếu truyền vào loại tiền tệ rỗng thì không hợp lệ
        if 'currency' in data and not data['currency'].strip():
            raise serializers.ValidationError("Loại tiền tệ không được để trống")
            
        return data