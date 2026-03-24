from django.utils import timezone
from uuid import uuid4
from api.models import Accounts, Categories, Transactions, Budgets, RecurringTransactions
from django.db import transaction as db_transaction
from django.db.models import Sum
from decimal import Decimal
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)


class TransactionService:

    # ===================== CREATE =====================
    @staticmethod
    def create_transaction(validated_data, user):
        account = validated_data['account']
        category = validated_data['category']
        amount = validated_data['amount']
        transaction_type = validated_data['transaction_type']
        budget_warnings = []
        now = timezone.now()

        with db_transaction.atomic():
            transaction_id = f'TR-{str(uuid4())[:15]}'

            new_transaction = Transactions.objects.create(
                transaction_id=transaction_id,
                user=user,
                account=account,
                category=category,
                amount=amount,
                transaction_type=transaction_type,
                transaction_date=validated_data['transaction_date'],
                description=validated_data.get('description', ''),
                note=validated_data.get('note', ''),
                location=validated_data.get('location', ''),
                receipt_image_url=validated_data.get('receipt_image_url', ''),
                is_recurring=validated_data.get('is_recurring', False),
                recurring_id=validated_data.get('recurring_id', ''),
                is_deleted=False,
                created_at=now,
                updated_at=now,
            )

            # Cập nhật balance
            account_locked = Accounts.objects.select_for_update().get(
                account_id=account.account_id
            )

            if transaction_type == 'expense':
                new_balance = account_locked.balance - amount
                if new_balance < 0:
                    raise ValueError('Số dư tài khoản của bạn không đủ để thực hiện giao dịch')
                account_locked.balance = new_balance
            elif transaction_type == 'income':
                account_locked.balance = account_locked.balance + amount
            elif transaction_type == 'transfer':
                new_balance = account_locked.balance - amount
                if new_balance < 0:
                    raise ValueError('Số dư tài khoản của bạn không đủ để thực hiện chuyển khoản')
                account_locked.balance = new_balance

            account_locked.updated_at = now
            account_locked.save()

            if transaction_type == 'expense':
                budget_warnings = TransactionService._check_budget(user, category, amount)

            if validated_data.get('is_recurring', False) and validated_data.get('recurring_id'):
                TransactionService._link_recurring(validated_data, new_transaction, user)

        return {
            'transaction_id': transaction_id,
            'amount': str(amount),
            'transaction_type': transaction_type,
            'updated_balance': str(account_locked.balance),
            'budget_warnings': budget_warnings,
            'created_at': now.isoformat(),
        }

    # ===================== UPDATE =====================
    @staticmethod
    def update_transaction(transaction_id, validated_data, user):
        """
        Sửa giao dịch:
        1. Lấy giao dịch cũ
        2. Hoàn nguyên balance cũ
        3. Áp dụng balance mới
        4. Update record
        5. Re-calculate budget
        """
        now = timezone.now()
        budget_warnings = []

        with db_transaction.atomic():
            # 1. Lấy giao dịch cũ (lock row)
            try:
                old_transaction = Transactions.objects.select_for_update().get(
                    transaction_id=transaction_id,
                    user=user,
                    is_deleted=False,
                )
            except Transactions.DoesNotExist:
                raise ValueError('Giao dịch không tồn tại hoặc đã bị xóa')

            old_type = old_transaction.transaction_type
            old_amount = old_transaction.amount
            old_account = old_transaction.account
            old_category = old_transaction.category

            # Giá trị mới (lấy từ validated_data hoặc giữ nguyên cũ)
            new_account = validated_data.get('account', old_account)
            new_category = validated_data.get('category', old_category)
            new_type = validated_data.get('transaction_type', old_type)
            new_amount = validated_data.get('amount', old_amount)

            # 2. Hoàn nguyên balance tài khoản CŨ
            old_account_locked = Accounts.objects.select_for_update().get(
                account_id=old_account.account_id
            )

            if old_type == 'expense':
                old_account_locked.balance += old_amount 
            elif old_type == 'income':
                old_account_locked.balance -= old_amount  
            elif old_type == 'transfer':
                old_account_locked.balance += old_amount  

            old_account_locked.updated_at = now
            old_account_locked.save()

            # 3. Áp dụng balance cho tài khoản MỚI
            if new_account.account_id == old_account.account_id:
                # Cùng tài khoản → dùng lại object đã cập nhật
                new_account_locked = old_account_locked
            else:
                # Khác tài khoản → lock tài khoản mới
                new_account_locked = Accounts.objects.select_for_update().get(
                    account_id=new_account.account_id
                )

            if new_type == 'expense':
                new_balance = new_account_locked.balance - new_amount
                if new_balance < 0:
                    raise ValueError(
                        f'Số dư tài khoản không đủ. '
                        f'Hiện tại: {new_account_locked.balance}, cần: {new_amount}'
                    )
                new_account_locked.balance = new_balance
            elif new_type == 'income':
                new_account_locked.balance += new_amount
            elif new_type == 'transfer':
                new_balance = new_account_locked.balance - new_amount
                if new_balance < 0:
                    raise ValueError(
                        f'Số dư tài khoản không đủ để chuyển khoản. '
                        f'Hiện tại: {new_account_locked.balance}, cần: {new_amount}'
                    )
                new_account_locked.balance = new_balance

            new_account_locked.updated_at = now
            new_account_locked.save()

            # 4. Update record transaction
            old_transaction.account = new_account
            old_transaction.category = new_category
            old_transaction.amount = new_amount
            old_transaction.transaction_type = new_type
            old_transaction.transaction_date = validated_data.get(
                'transaction_date', old_transaction.transaction_date
            )
            old_transaction.description = validated_data.get(
                'description', old_transaction.description
            )
            old_transaction.note = validated_data.get('note', old_transaction.note)
            old_transaction.location = validated_data.get('location', old_transaction.location)
            old_transaction.receipt_image_url = validated_data.get(
                'receipt_image_url', old_transaction.receipt_image_url
            )
            old_transaction.is_recurring = validated_data.get(
                'is_recurring', old_transaction.is_recurring
            )
            old_transaction.recurring_id = validated_data.get(
                'recurring_id', old_transaction.recurring_id
            )
            old_transaction.updated_at = now
            old_transaction.save()

            # 5. Re-calculate budget cho cả category cũ và mới
            if old_type == 'expense':
                TransactionService._recalculate_budget(user, old_category)
            if new_type == 'expense':
                budget_warnings = TransactionService._check_budget(user, new_category, new_amount)

        return {
            'transaction_id': transaction_id,
            'old_amount': str(old_amount),
            'new_amount': str(new_amount),
            'old_type': old_type,
            'new_type': new_type,
            'updated_balance': str(new_account_locked.balance),
            'budget_warnings': budget_warnings,
            'updated_at': now.isoformat(),
        }

    # ===================== DELETE (Soft) =====================
    @staticmethod
    def delete_transaction(transaction_id, user, hard_delete=False):
        """
        Xóa giao dịch:
        - Soft delete (mặc định): set is_deleted=True, giữ lịch sử
        - Hard delete: xóa hoàn toàn khỏi DB
        Cả 2 đều hoàn nguyên balance và re-calculate budget
        """
        now = timezone.now()

        with db_transaction.atomic():
            # 1. Lấy giao dịch
            try:
                transaction_obj = Transactions.objects.select_for_update().get(
                    transaction_id=transaction_id,
                    user=user,
                    is_deleted=False,
                )
            except Transactions.DoesNotExist:
                raise ValueError('Giao dịch không tồn tại hoặc đã bị xóa')

            # 2. Kiểm tra giới hạn 30 ngày
            days_diff = (now - transaction_obj.transaction_date).days
            if days_diff > 30:
                raise ValueError(
                    f'Chỉ được phép xóa giao dịch trong vòng 30 ngày gần nhất. '
                    f'Giao dịch này đã được tạo cách đây {days_diff} ngày.'
                )

            old_type = transaction_obj.transaction_type
            old_amount = transaction_obj.amount
            old_category = transaction_obj.category

            # 3. Hoàn nguyên balance
            account_locked = Accounts.objects.select_for_update().get(
                account_id=transaction_obj.account_id
            )

            if old_type == 'expense':
                account_locked.balance += old_amount  # Hoàn tiền
            elif old_type == 'income':
                new_balance = account_locked.balance - old_amount
                if new_balance < 0:
                    raise ValueError(
                        f'Không thể xóa giao dịch thu nhập này vì sẽ làm số dư âm. '
                        f'Số dư hiện tại: {account_locked.balance}, hoàn nguyên: {old_amount}'
                    )
                account_locked.balance = new_balance
            elif old_type == 'transfer':
                account_locked.balance += old_amount  # Hoàn tiền chuyển

            account_locked.updated_at = now
            account_locked.save()

            # 4. Soft delete hoặc Hard delete
            if hard_delete:
                transaction_obj.delete()
            else:
                transaction_obj.is_deleted = True
                transaction_obj.deleted_at = now
                transaction_obj.updated_at = now
                transaction_obj.save()

            # 5. Re-calculate budget
            if old_type == 'expense':
                TransactionService._recalculate_budget(user, old_category)

        return {
            'transaction_id': transaction_id,
            'deleted_type': 'hard' if hard_delete else 'soft',
            'restored_amount': str(old_amount),
            'restored_type': old_type,
            'updated_balance': str(account_locked.balance),
            'deleted_at': now.isoformat(),
        }

    # ===================== HELPER: Check Budget =====================
    @staticmethod
    def _check_budget(user, category, amount):
        warnings = []
        now = timezone.now()
        from api.models import Notification

        budgets = Budgets.objects.filter(
            user=user,
            category=category,
            is_active=True,
            start_date__lte=now.date(),
            end_date__gte=now.date(),
        )

        for budget in budgets:
            total_spent_result = Transactions.objects.filter(
                user=user,
                category=category,
                transaction_type='expense',
                is_deleted=False,
                transaction_date__date__gte=budget.start_date,
                transaction_date__date__lte=budget.end_date,
            ).aggregate(total=Sum('amount'))

            total_spent = total_spent_result['total'] or Decimal('0')

            if budget.alert_threshold and budget.amount > 0:
                percentage_spent = (total_spent / budget.amount) * 100

                if percentage_spent >= 100:
                    message = f'Đã VƯỢT ngân sách "{budget.budget_name}": {total_spent}/{budget.amount} ({percentage_spent:.1f}%)'
                    warnings.append({
                        'budget_id': budget.budget_id,
                        'budget_name': budget.budget_name,
                        'type': 'danger',
                        'limit': str(budget.amount),
                        'spent': str(total_spent),
                        'percentage': float(round(percentage_spent, 1)),
                        'message': message,
                    })
                    
                    # Ghi Notification tránh spam (chỉ 1 thông báo chưa đọc cùng loại 1 ngày)
                    if not Notification.objects.filter(user=user, notification_type='budget_danger', related_id=budget.budget_id, is_read=False, created_at__date=now.date()).exists():
                        Notification.objects.create(
                            notification_id=f'NOT-{str(uuid4())[:15]}', user=user, notification_type='budget_danger',
                            title='Vượt Ngân Sách!', message=message, is_read=False, related_id=budget.budget_id, created_at=now
                        )
                elif percentage_spent >= budget.alert_threshold:
                    message = f'Cảnh báo ngân sách "{budget.budget_name}": Đã chi {percentage_spent:.1f}% ({total_spent}/{budget.amount})'
                    warnings.append({
                        'budget_id': budget.budget_id,
                        'budget_name': budget.budget_name,
                        'type': 'warning',
                        'limit': str(budget.amount),
                        'spent': str(total_spent),
                        'percentage': float(round(percentage_spent, 1)),
                        'message': message,
                    })
                    if not Notification.objects.filter(user=user, notification_type='budget_warning', related_id=budget.budget_id, is_read=False, created_at__date=now.date()).exists():
                        Notification.objects.create(
                            notification_id=f'NOT-{str(uuid4())[:15]}', user=user, notification_type='budget_warning',
                            title='Sắp Vượt Ngân Sách', message=message, is_read=False, related_id=budget.budget_id, created_at=now
                        )

        return warnings




    # ===================== HELPER: Recalculate Budget =====================
    @staticmethod
    def _recalculate_budget(user, category):
        """
        Re-calculate lại tổng spent cho tất cả budget liên quan
        khi sửa/xóa giao dịch.
        """
        now = timezone.now()

        budgets = Budgets.objects.filter(
            user=user,
            category=category,
            is_active=True,
            start_date__lte=now,
            end_date__gte=now,
        )

        for budget in budgets:
            total_spent_result = Transactions.objects.filter(
                user=user,
                category=category,
                transaction_type='expense',
                is_deleted=False,
                transaction_date__gte=budget.start_date,
                transaction_date__lte=budget.end_date,
            ).aggregate(total=Sum('amount'))

            total_spent = total_spent_result['total'] or Decimal('0')

            # Log để debug nếu cần
            logger.info(
                f'Budget "{budget.budget_name}" recalculated: '
                f'spent={total_spent}/{budget.amount}'
            )

    # ===================== HELPER: Link Recurring =====================
    @staticmethod
    def _link_recurring(validated_data, transaction_obj, user):
        recurring_id = validated_data.get('recurring_id')
        if not recurring_id:
            return

        try:
            recurring = RecurringTransactions.objects.select_for_update().get(
                recurring_id=recurring_id, user=user
            )
            frequency_map = {
                'daily': relativedelta(days=1),
                'weekly': relativedelta(weeks=1),
                'monthly': relativedelta(months=1),
                'yearly': relativedelta(years=1),
            }
            delta = frequency_map.get(recurring.frequency, relativedelta(months=1))
            next_date = transaction_obj.transaction_date + delta

            if next_date.date() > recurring.end_date:
                recurring.is_active = False
                recurring.next_occurrence_date = None
            else:
                recurring.next_occurrence_date = next_date.date()

            recurring.save()

        except RecurringTransactions.DoesNotExist:
            logger.warning(f'Recurring transaction {recurring_id} not found')
    

     # ===================== RESTORE =====================
    @staticmethod
    def restore_transaction(transaction_id, user):
        """Khôi phục giao dịch đã soft delete → áp dụng lại balance"""
        now = timezone.now()

        with db_transaction.atomic():
            try:
                transaction_obj = Transactions.objects.select_for_update().get(
                    transaction_id=transaction_id,
                    user=user,
                    is_deleted=True,
                )
            except Transactions.DoesNotExist:
                raise ValueError('Không tìm thấy giao dịch đã xóa')

            # Áp dụng lại balance
            account_locked = Accounts.objects.select_for_update().get(
                account_id=transaction_obj.account_id
            )

            if transaction_obj.transaction_type == 'expense':
                new_balance = account_locked.balance - transaction_obj.amount
                if new_balance < 0:
                    raise ValueError(
                        f'Không thể khôi phục: số dư không đủ. '
                        f'Hiện tại: {account_locked.balance}, cần trừ: {transaction_obj.amount}'
                    )
                account_locked.balance = new_balance
            elif transaction_obj.transaction_type == 'income':
                account_locked.balance += transaction_obj.amount
            elif transaction_obj.transaction_type == 'transfer':
                new_balance = account_locked.balance - transaction_obj.amount
                if new_balance < 0:
                    raise ValueError('Không thể khôi phục: số dư không đủ')
                account_locked.balance = new_balance

            account_locked.updated_at = now
            account_locked.save()

            # Bỏ soft delete
            transaction_obj.is_deleted = False
            transaction_obj.deleted_at = None
            transaction_obj.updated_at = now
            transaction_obj.save()

            # Re-calculate budget
            if transaction_obj.transaction_type == 'expense':
                TransactionService._recalculate_budget(user, transaction_obj.category)

        return {
            'transaction_id': transaction_id,
            'restored_amount': str(transaction_obj.amount),
            'restored_type': transaction_obj.transaction_type,
            'updated_balance': str(account_locked.balance),
            'restored_at': now.isoformat(),
        }