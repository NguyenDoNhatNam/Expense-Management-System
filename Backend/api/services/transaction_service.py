from django.utils import timezone 
from uuid import uuid4
from api.models import Accounts , Categories , Transactions , Budgets  , RecurringTransactions
from django.db import transaction
from django.db.models import Sum
from decimal import Decimal
from dateutil.relativedelta import relativedelta
class TransactionService: 

    @staticmethod
    def create_transaction(validated_data , user):
        account = validated_data['account']
        category = validated_data['category']
        amount = validated_data['amount']
        transaction_type = validated_data['transaction_type']
        budget_warning = []

        with transaction.atomic():
            transaction_id = f'TR-{str(uuid4())[:15]}'
            transaction = Transactions.objects.create(
                transaction_id = transaction_id , 
                user = user , 
                account = account , 
                category = category , 
                amount = amount , 
                transaction_type = transaction_type , 
                transaction_date = validated_data['transaction_date'],
                description = validated_data.get('description' ,''),
                note = validated_data.get('note' ,'') , 
                location = validated_data.get('location' , ''),
                receipt_image_url=validated_data.get('receipt_image_url', ''),
                is_recurring=validated_data.get('is_recurring', False),
                recurring_id=validated_data.get('recurring_id', ''),
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )

            #### Cập nhật số dư tài khoản 
            account_locked = Accounts.objects.select_for_update().get(
                account_id = account.account_id
            )

            if transaction_type == 'expense':
                new_balance = account_locked.balance - amount
                if new_balance < 0:
                    raise ValueError('Số dư tài khoản của bạn không đủ để thực hiện giao dịch')
                account_locked.balance = new_balance
            elif transaction_type == 'income':
                amount = account_locked.balance + amount 
                account_locked.balance = amount 
            elif transaction_type == 'transfer':
                new_balance = account_locked.balance - amount
                if new_balance < 0:
                    raise ValueError('Số dư tài khoản của bạn không đủ để thực hiện giao dịch')
                account_locked.balance = new_balance

            account_locked.updated_at = timezone.now()
            account_locked.save() 

            if transaction_type == 'expense':
                budget_warnings = TransactionService._check_budget(user, category, amount)

            
            if validated_data.get('is_recurring', False):
                TransactionService._link_recurring(validated_data, transaction, user)

            return {
                'transaction_id': transaction_id,
                'updated_balance': str(account_locked.balance),
                'budget_warnings': budget_warnings,
            }

    @staticmethod
    def _check_budget(user , category , amount):
        warnings = []
        budgets = Budgets.objects.filter(
            user = user , 
            category = category ,
            start_date__lte = timezone.now(), 
            end_date__gte = timezone.now() 

        )

        for budget in budgets:
            total_spent_result = Transactions.objects.filter(
                user = user , 
                category = category , 
                transaction_type ='expense' , 
                transaction_date__gte = budget.start_date , 
                transaction_date__lte = budget.end_date 
            ).aggregate(total = Sum('amount'))

            total_spent = total_spent_result['total'] or Decimal('0')

            if budget.alert_threshold and budget.amount > 0:
                percentage_spent = (total_spent / budget.amount) * 100 

                if total_spent > budget.amount: 
                    warnings.append({
                        'budget_id': budget.budget_id,
                        'type': 'exceeded',
                        'limit': str(budget.amount),
                        'spent': str(total_spent),
                        'percentage': float(round(percentage_spent, 1)),
                        'message': f'Da VUOT ngan sach: {total_spent}/{budget.amount} ({percentage_spent:.1f}%).',
                    })
                elif percentage_spent >= budget.alert_threshold:
                    warnings.append({
                        'budget_id': budget.budget_id,
                        'type': 'warning',
                        'limit': str(budget.amount),
                        'spent': str(total_spent),
                        'percentage': float(round(percentage_spent, 1)),
                        'message': f'Canh bao: Da chi {percentage_spent:.1f}% ngan sach ({total_spent}/{budget.amount}).',
                    })
        return warnings
        
    @staticmethod
    def _link_recurring(validated_data , transaction , user):
        recurring_id = validated_data.get('recurring_id', '')
        if not recurring_id:
            return
        
        try:
            recurring_transaction = RecurringTransactions.objects.select_for_update().get(
                recurring_id = recurring_id , 
                user = user
            )

            ### Quy ước các tần suất thành các khoảng thời gian tương ưunsg 
            frequency_map = {
                'daily': relativedelta(days=1),
                'weekly': relativedelta(weeks=1),
                'monthly': relativedelta(months=1),
                'yearly': relativedelta(years=1),
            }
            delta = frequency_map.get(recurring_transaction.frequency , relativedelta(months=1))
            next_date = transaction.transaction_date + delta 
            
            if next_date.date() > recurring_transaction.end_date:
                is_active = False 
                next_occurrence_date = None
            else:
                recurring_transaction.next_occurrence_date = next_date.date()
            
            recurring_transaction.save() 
        
        except RecurringTransactions.DoesNotExist:
            raise ValueError('Giao dịch định kỳ này không tồn tại')

















