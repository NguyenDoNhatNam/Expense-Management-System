from rest_framework import serializers
from api.models import Accounts , Categories , Transactions , RecurringTransactions , Budgets
from uuid import uuid4
from django.utils import timezone  
from dateutil.relativedelta import relativedelta

class TransactionListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    account_id = serializers.CharField(source='account.account_id', read_only=True)
    category_id = serializers.CharField(source='category.category_id', read_only=True)

    class Meta:
        model = Transactions
        fields = [
            'transaction_id',
            'amount',
            'transaction_type',
            'transaction_date',
            'description',
            'note',
            'category_id',
            'category_name',
            'category_icon',
            'account_id',
            'account_name',
            'is_recurring',
            'receipt_image_url',
            'location',
        ]

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

class UpdateTransactionSerializer(serializers.Serializer):
    """Serializer cho việc sửa giao dịch - tất cả field đều optional"""
    account_id = serializers.CharField(required=False)
    category_id = serializers.CharField(required=False)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    transaction_type = serializers.ChoiceField(
        required=False, choices=[('income', 'Income'), ('expense', 'Expense'), ('transfer', 'Transfer')]
    )
    transaction_date = serializers.DateTimeField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    receipt_image_url = serializers.CharField(required=False, allow_blank=True, max_length=255)
    is_recurring = serializers.BooleanField(required=False)
    recurring_id = serializers.CharField(required=False, allow_blank=True, max_length=100)

    def validate_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Giá tiền không được phép âm hoặc bằng 0')
        return value

    def validate_receipt_image_url(self, value):
        if not value or value.strip() == '':
            return ''
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        if not any(value.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                'URL ảnh hóa đơn phải có định dạng .jpg, .jpeg, .png hoặc .webp'
            )
        return value

    def validate_transaction_date(self, value):
        if value is None:
            return value
        now = timezone.now()
        if value > now + relativedelta(years=1):
            raise serializers.ValidationError("Ngày giao dịch không được vượt quá 1 năm trong tương lai")
        if value < now - relativedelta(years=5):
            raise serializers.ValidationError("Ngày giao dịch không được vượt quá 5 năm trong quá khứ")
        return value

    def validate(self, data):
        user = self.context.get('user')
        old_transaction = self.context.get('old_transaction')

        if not user:
            raise serializers.ValidationError('User không tồn tại')
        if not old_transaction:
            raise serializers.ValidationError('Không tìm thấy giao dịch cũ')

        # Lấy giá trị mới hoặc giữ nguyên giá trị cũ
        account_id = data.get('account_id', old_transaction.account_id)
        category_id = data.get('category_id', old_transaction.category_id)
        transaction_type = data.get('transaction_type', old_transaction.transaction_type)
        amount = data.get('amount', old_transaction.amount)

        # Validate account
        try:
            account = Accounts.objects.get(account_id=account_id, user=user)
        except Accounts.DoesNotExist:
            raise serializers.ValidationError('Tài khoản này không tồn tại hoặc không thuộc người dùng hiện tại')
        data['account'] = account

        # Validate category
        try:
            category = Categories.objects.get(category_id=category_id, user=user)
        except Categories.DoesNotExist:
            raise serializers.ValidationError('Danh mục này không tồn tại')

        if transaction_type in ['income', 'expense']:
            if transaction_type != category.category_type:
                raise serializers.ValidationError(
                    f'Danh mục loại "{category.category_type}" không khớp với loại giao dịch "{transaction_type}"'
                )
        data['category'] = category

        # Tính toán balance giả lập để kiểm tra có đủ số dư không
        old_type = old_transaction.transaction_type
        old_amount = old_transaction.amount
        new_type = transaction_type
        new_amount = amount

        # Hoàn nguyên balance cũ
        simulated_balance = account.balance
        if old_transaction.account_id == account.account_id:
            # Cùng tài khoản: hoàn nguyên giao dịch cũ trước
            if old_type == 'expense':
                simulated_balance += old_amount
            elif old_type == 'income':
                simulated_balance -= old_amount
            elif old_type == 'transfer':
                simulated_balance += old_amount

        # Áp dụng giao dịch mới
        if new_type == 'expense':
            simulated_balance -= new_amount
        elif new_type == 'income':
            simulated_balance += new_amount
        elif new_type == 'transfer':
            simulated_balance -= new_amount

        if simulated_balance < 0 and new_type in ['expense', 'transfer']:
            raise serializers.ValidationError(
                'Số dư tài khoản không đủ sau khi cập nhật giao dịch này'
            )

        # Validate recurring nếu có
        is_recurring = data.get('is_recurring', old_transaction.is_recurring)
        recurring_id = data.get('recurring_id', old_transaction.recurring_id or '')
        if is_recurring and recurring_id:
            try:
                RecurringTransactions.objects.get(recurring_id=recurring_id, user=user)
            except RecurringTransactions.DoesNotExist:
                raise serializers.ValidationError('Giao dịch định kỳ này không tồn tại')

        return data
    

class DeleteTransactionSerializer(serializers.Serializer):
    """Serializer cho việc xóa giao dịch"""
    hard_delete = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        user = self.context.get('user')
        transaction_obj = self.context.get('transaction')

        if not user:
            raise serializers.ValidationError('User không tồn tại')
        if not transaction_obj:
            raise serializers.ValidationError('Không tìm thấy giao dịch')

        # Chỉ cho phép xóa giao dịch trong 30 ngày gần nhất
        now = timezone.now()
        days_diff = (now - transaction_obj.transaction_date).days
        if days_diff > 30:
            raise serializers.ValidationError(
                'Chỉ được phép xóa giao dịch trong vòng 30 ngày gần nhất. '
                f'Giao dịch này đã được tạo cách đây {days_diff} ngày.'
            )

        # Kiểm tra nếu hard delete expense → hoàn nguyên balance có hợp lệ không
        # (Luôn hợp lệ vì hoàn nguyên chỉ cộng thêm hoặc trừ bớt)
        data['transaction'] = transaction_obj
        return data