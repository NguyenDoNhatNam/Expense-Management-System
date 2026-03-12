from rest_framework import serializers
from api.models import Accounts , Categories , Transactions , RecurringTransactions , Budgets
from uuid import uuid4
from django.utils import timezone  
from dateutil.relativedelta import relativedelta

class CreateTransactionSerializer(serializers.Serializer):
    account_id = serializers.CharField(required = True )
    category_id = serializers.CharField(required = True) 
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    transaction_type = serializers.ChoiceField(
        required=True, choices=[('income', 'Income'), ('expense', 'Expense') , ('transfer', 'Transfer')]
    )
    transaction_date = serializers.DateTimeField(required=True)
    description = serializers.CharField(required = False , allow_null = True , default = '' )
    note =serializers.CharField(required = False , allow_null= True , default = '' )
    location = serializers.CharField(required = False , allow_null = True , default = '' )
    receipt_image_url = serializers.CharField(required=False, allow_blank=True, max_length=255, default='')
    is_recurring = serializers.BooleanField(required=False, default=False)
    recurring_id = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')


    def validate_amount(self , value):
        if value <= 0:
            raise serializers.ValidationError('Giá tiền không được phép âm hoặc bằng 0')
        return value 
    
    def validate_receipt_image_url(self, value):
        """Validate receipt_image_url nếu có giá trị."""
        if not value or value.strip() == '':
            return ''

        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        lower_value = value.lower()

        if not any(lower_value.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                'URL ảnh hóa đơn phải có định dạng .jpg, .jpeg, .png hoặc .webp'
            )

        if len(value) > 255:
            raise serializers.ValidationError('URL ảnh hóa đơn không được vượt quá 255 ký tự')

        return value

    def validate_transaction_date(self , value):
        now = timezone.now()
        if value > now + relativedelta(years=1):
            raise serializers.ValidationError("Ngày giao dịch không được vượt quá 1 năm trong tương lai")
        if value < now - relativedelta(years=5):
            raise serializers.ValidationError("Ngày giao dịch không được vượt quá 5 năm trong quá khứ")
        return value
    
    def validate(self, data):
        '''
        lấy dữ liệu user từ context để kiểm tra quyền truy cập 
        chứ không phải là từ người dùng gửi tới
        '''
        
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError('User không tồn tại')
        account_id = data.get('account_id')
        category_id = data.get('category_id')
        transaction_type = data.get('transaction_type')
        try:
            account = Accounts.objects.get(account_id = account_id , user = user)
        except Accounts.DoesNotExist:
            raise serializers.ValidationError('Tài khoản này không tồn tại hoặc không thuộc ngừoi dùng hiện tại')
        
        data['account'] = account
        
        try: 
            category = Categories.objects.get(category_id = category_id , user = user)
        except Categories.DoesNotExist:
            raise serializers.ValidationError('Danh mục này không tồn tại ')
    
        if transaction_type in ['income', 'expense']: 
            if transaction_type != category.category_type:
                raise serializers.ValidationError(f'Danh mục loại {category.category_type} không khớp với loại giao dịch {transaction_type}')

        data['category'] = category

        ### Kiểm tra số dư nếu là expense
        if transaction_type == 'expense':
            amount = data.get('amount')
            if account.balance < amount:
                raise serializers.ValidationError('Số dư trong tài khoản của bạn không đủ để thực hiện giao dịch này')
            
        if data.get('is_recurring') and data.get('recurring_id'):
            try:
                recurring_transaction = RecurringTransactions.objects.get(recurring_id = data.get('recurring_id') , user = user)
            except RecurringTransactions.DoesNotExist:
                raise serializers.ValidationError('Giao dịch định kỳ này không tồn tại')
            
            data['recurring_transaction'] = recurring_transaction

        return data

