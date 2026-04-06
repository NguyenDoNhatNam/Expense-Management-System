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
        Lấy danh sách tài khoản và tính tổng tài sản (Net Worth).
        Chỉ tính các tài khoản có is_include_in_total = True
        """
        # Được sử dụng để hiện thị transaction count, total_income, total_expense trên mỗi account
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

            # Tạo giao dịch khởi tạo nếu số dư ban đầu > 0
            if initial_balance > 0:
                init_category, _ = Categories.objects.get_or_create(
                    user=user,
                    category_name='Khởi tạo số dư',
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
                    description=f'Khởi tạo số dư ban đầu',
                    note='Giao dịch tự động khi tạo tài khoản',
                    is_recurring=False,
                    is_deleted=False,
                    created_at=timezone.now(),
                    updated_at=timezone.now()
                )

        return new_account

    @staticmethod
    def update_account(account_obj, validated_data, user):
        with db_transaction.atomic():
            # Không cho phép đổi loại tiền tệ nếu đã có giao dịch
            if 'currency' in validated_data and validated_data['currency'] != account_obj.currency:
                has_transactions = Transactions.objects.filter(account=account_obj, is_deleted=False).exists()
                if has_transactions:
                    raise ValueError("Không thể thay đổi loại tiền tệ khi tài khoản đã có giao dịch")
                
            # Cập nhật các trường
            for field, value in validated_data.items():
                setattr(account_obj, field, value)
                
            account_obj.updated_at = timezone.now()
            account_obj.save()
            
        return account_obj

    @staticmethod
    def delete_account(account_obj, user):
        with db_transaction.atomic():
            if account_obj.balance != 0:
                raise ValueError("Số dư tài khoản phải bằng 0 mới có thể xóa. Vui lòng chuyển hết tiền trước khi xóa.")
            
            if Transactions.objects.filter(account=account_obj, is_deleted=False).exists():
                raise ValueError("Tài khoản đang có giao dịch. Vui lòng xóa hoặc chuyển giao dịch sang tài khoản khác trước khi xóa.")

            account_obj.delete()