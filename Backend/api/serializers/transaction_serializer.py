from rest_framework import serializers
from api.models import Accounts , Categories , Transactions , RecurringTransactions , Budgets
from uuid import uuid4
from django.utils import timezone  
from dateutil.relativedelta import relativedelta
from decimal import Decimal

class TransactionListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
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
            'category_color',
            'account_id',
            'account_name',
            'is_recurring',
            'receipt_image_url',
            'location',
        ]

class CreateTransactionSerializer(serializers.Serializer):
    account_id = serializers.CharField(required = True )
    category_id = serializers.CharField(required = True) 
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=True)
    transaction_type = serializers.ChoiceField(
        required=True, choices=[('income', 'Income'), ('expense', 'Expense') , ('transfer', 'Transfer')]
    )
    transaction_date = serializers.DateTimeField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    receipt_image_url = serializers.CharField(required=False, allow_blank=True, max_length=255, default='')
    is_recurring = serializers.BooleanField(required=False, default=False)
    recurring_id = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')


    def validate_amount(self , value):
        if value <= 0:
            raise serializers.ValidationError('Amount must not be negative or zero')
        return value 
    
    def validate_receipt_image_url(self, value):
        """Validate receipt_image_url if it has a value."""
        if not value or value.strip() == '':
            return ''

        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        lower_value = value.lower()

        if not any(lower_value.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                'Receipt image URL must have .jpg, .jpeg, .png or .webp format'
            )

        if len(value) > 255:
            raise serializers.ValidationError('Receipt image URL must not exceed 255 characters')

        return value

    def validate_transaction_date(self , value):
        now = timezone.now()
        if value > now + relativedelta(years=1):
            raise serializers.ValidationError("Transaction date must not exceed 1 year in the future")
        if value < now - relativedelta(years=5):
            raise serializers.ValidationError("Transaction date must not exceed 5 years in the past")
        return value
    
    def validate(self, data):
        '''
        Get user data from context to check access permissions
        not from user-submitted data
        '''
        
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError({'user': 'User does not exist'})
        account_id = data.get('account_id')
        category_id = data.get('category_id')
        transaction_type = data.get('transaction_type')
        try:
            account = Accounts.objects.get(account_id = account_id , user = user)
        except Accounts.DoesNotExist:
            raise serializers.ValidationError({'account_id': 'This account does not exist or does not belong to the current user'})
        
        data['account'] = account
        
        try:
            category = Categories.objects.get(category_id=category_id, user=user, is_deleted=False)
        except Categories.DoesNotExist:
            raise serializers.ValidationError({'category_id': 'This category does not exist'})
    
        if transaction_type in ['income', 'expense']: 
            if transaction_type != category.category_type:
                raise serializers.ValidationError({
                    'transaction_type': f'Category type {category.category_type} does not match transaction type {transaction_type}'
                })

        data['category'] = category

        ### Check balance if expense
        if transaction_type == 'expense':
            amount = data.get('amount')
            account_balance = account.balance if account.balance is not None else Decimal('0')
            if account_balance < amount:
                raise serializers.ValidationError({'amount': 'Your account balance is insufficient to perform this transaction'})
            
        if data.get('is_recurring') and data.get('recurring_id'):
            try:
                recurring_transaction = RecurringTransactions.objects.get(recurring_id = data.get('recurring_id') , user = user)
            except RecurringTransactions.DoesNotExist:
                raise serializers.ValidationError({'recurring_id': 'This recurring transaction does not exist'})
            
            data['recurring_transaction'] = recurring_transaction

        return data

class UpdateTransactionSerializer(serializers.Serializer):
    """Serializer for updating transactions - all fields are optional"""
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
            raise serializers.ValidationError('Amount must not be negative or zero')
        return value

    def validate_receipt_image_url(self, value):
        if not value or value.strip() == '':
            return ''
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        if not any(value.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                'Receipt image URL must have .jpg, .jpeg, .png or .webp format'
            )
        return value

    def validate_transaction_date(self, value):
        if value is None:
            return value
        now = timezone.now()
        if value > now + relativedelta(years=1):
            raise serializers.ValidationError("Transaction date must not exceed 1 year in the future")
        if value < now - relativedelta(years=5):
            raise serializers.ValidationError("Transaction date must not exceed 5 years in the past")
        return value

    def validate(self, data):
        user = self.context.get('user')
        old_transaction = self.context.get('old_transaction')

        if not user:
            raise serializers.ValidationError({'user': 'User does not exist'})
        if not old_transaction:
            raise serializers.ValidationError({'transaction_id': 'Old transaction not found'})

        # Get new values or keep old values
        account_id = data.get('account_id', old_transaction.account_id)
        category_id = data.get('category_id', old_transaction.category_id)
        transaction_type = data.get('transaction_type', old_transaction.transaction_type)
        amount = data.get('amount', old_transaction.amount)

        # Validate account
        try:
            account = Accounts.objects.get(account_id=account_id, user=user)
        except Accounts.DoesNotExist:
            raise serializers.ValidationError({'account_id': 'This account does not exist or does not belong to the current user'})
        data['account'] = account

        # Validate category
        try:
            category = Categories.objects.get(category_id=category_id, user=user, is_deleted=False)
        except Categories.DoesNotExist:
            raise serializers.ValidationError({'category_id': 'This category does not exist'})

        if transaction_type in ['income', 'expense']:
            if transaction_type != category.category_type:
                raise serializers.ValidationError({
                    'transaction_type': f'Category type "{category.category_type}" does not match transaction type "{transaction_type}"'
                })
        data['category'] = category

        # Simulate balance to check if sufficient
        old_type = old_transaction.transaction_type
        old_amount = old_transaction.amount
        new_type = transaction_type
        new_amount = amount

        # Reverse old balance
        simulated_balance = account.balance
        if old_transaction.account_id == account.account_id:
            # Same account: reverse old transaction first
            if old_type == 'expense':
                simulated_balance += old_amount
            elif old_type == 'income':
                simulated_balance -= old_amount
            elif old_type == 'transfer':
                simulated_balance += old_amount

        # Apply new transaction
        if new_type == 'expense':
            simulated_balance -= new_amount
        elif new_type == 'income':
            simulated_balance += new_amount
        elif new_type == 'transfer':
            simulated_balance -= new_amount

        if simulated_balance < 0 and new_type in ['expense', 'transfer']:
            raise serializers.ValidationError({
                'amount': 'Insufficient account balance after updating this transaction'
            })

        # Validate recurring if applicable
        is_recurring = data.get('is_recurring', old_transaction.is_recurring)
        recurring_id = data.get('recurring_id', old_transaction.recurring_id or '')
        if is_recurring and recurring_id:
            try:
                RecurringTransactions.objects.get(recurring_id=recurring_id, user=user)
            except RecurringTransactions.DoesNotExist:
                raise serializers.ValidationError({'recurring_id': 'This recurring transaction does not exist'})

        return data
    

class DeleteTransactionSerializer(serializers.Serializer):
    """Serializer for deleting transactions"""
    hard_delete = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        user = self.context.get('user')
        transaction_obj = self.context.get('transaction')

        if not user:
            raise serializers.ValidationError('User does not exist')
        if not transaction_obj:
            raise serializers.ValidationError('Transaction not found')

        # Only allow deleting transactions within the last 30 days
        now = timezone.now()
        days_diff = (now - transaction_obj.transaction_date).days
        if days_diff > 30:
            raise serializers.ValidationError(
                'Only transactions within the last 30 days can be deleted. '
                f'This transaction was created {days_diff} days ago.'
            )

        # Check if hard delete expense → whether reversing balance is valid
        # (Always valid since reversing only adds or subtracts)
        data['transaction'] = transaction_obj
        return data