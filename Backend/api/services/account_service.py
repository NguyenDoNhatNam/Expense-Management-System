from django.db import transaction as db_transaction
from django.db.models import Sum, Count, Q, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from uuid import uuid4
from decimal import Decimal
from api.models import Accounts, Transactions, Categories

class AccountService:
    @staticmethod
    def get_accounts_summary(user):
        """
        Get list of accounts and calculate Net Worth.
        Only includes accounts with is_include_in_total = True
        """
        # Used to display transaction count, total_income, total_expense for each account
        accounts = Accounts.objects.filter(user=user).annotate(
            transaction_count=Count('transactions', filter=Q(transactions__is_deleted=False)),
            total_income=Coalesce(
                Sum('transactions__amount', filter=Q(transactions__transaction_type='income', transactions__is_deleted=False)),
                Value(Decimal('0.00'))
            ),
            total_expense=Coalesce(
                Sum('transactions__amount', filter=Q(transactions__transaction_type='expense', transactions__is_deleted=False)),
                Value(Decimal('0.00'))
            )
        ).order_by('-created_at')

        net_worth = accounts.filter(is_include_in_total=True).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0.00')

        return accounts, net_worth

    @staticmethod
    def create_account(validated_data, user):
        initial_balance = validated_data.pop('initial_balance', Decimal('0.00'))
        
        with db_transaction.atomic():
            account_id = f'ACC-{str(uuid4())[:15]}'
            
            new_account = Accounts.objects.create(
                account_id=account_id,
                user=user,
                account_name=validated_data['account_name'],
                account_type=validated_data['account_type'],
                currency=validated_data['currency'],
                balance=initial_balance,
                is_include_in_total=validated_data.get('is_include_in_total', True),
                bank_name=validated_data.get('bank_name', ''),
                account_number=validated_data.get('account_number', ''),
                description=validated_data.get('description', ''),
                created_at=timezone.now(),
                updated_at=timezone.now()
            )

            # Create initial transaction if initial balance > 0
            if initial_balance > 0:
                init_category, _ = Categories.objects.get_or_create(
                    user=user,
                    category_name='Initial Balance',
                    category_type='income',
                    defaults={
                        'category_id': f'CAT-{str(uuid4())[:15]}',
                        'icon': 'plus-circle',
                        'color': '#4CAF50',
                        'is_default': True,
                        'is_deleted' : False
                    }
                )

                Transactions.objects.create(
                    transaction_id=f'TR-{str(uuid4())[:15]}',
                    user=user,
                    account=new_account,
                    category=init_category,
                    amount=initial_balance,
                    transaction_type='income',
                    transaction_date=timezone.now(),
                    description=f'Initial balance setup',
                    note='Automatic transaction when creating account',
                    is_recurring=False,
                    is_deleted=False,
                    created_at=timezone.now(),
                    updated_at=timezone.now()
                )

        return new_account

    @staticmethod
    def update_account(account_obj, validated_data, user):
        with db_transaction.atomic():
            # Do not allow changing currency if transactions exist
            if 'currency' in validated_data and validated_data['currency'] != account_obj.currency:
                has_transactions = Transactions.objects.filter(account=account_obj, is_deleted=False).exists()
                if has_transactions:
                    raise ValueError("Cannot change currency when the account already has transactions")
                
            # Update fields
            for field, value in validated_data.items():
                setattr(account_obj, field, value)
                
            account_obj.updated_at = timezone.now()
            account_obj.save()
            
        return account_obj

    @staticmethod
    def delete_account(account_obj, user):
        with db_transaction.atomic():
            if account_obj.balance != 0:
                raise ValueError("Account balance must be 0 to delete. Please transfer all funds before deleting.")
            
            if Transactions.objects.filter(account=account_obj, is_deleted=False).exists():
                raise ValueError("Account has existing transactions. Please delete or transfer transactions to another account before deleting.")

            account_obj.delete()