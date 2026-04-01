from django.db import transaction as db_transaction
from django.utils import timezone
from datetime import timedelta
from uuid import uuid4
from api.models import Debts, DebtPayment, Notification
import logging

logger = logging.getLogger(__name__)

class DebtService:
    @staticmethod
    def get_debts(user):
        return Debts.objects.filter(user=user).order_by('-created_at')

    @staticmethod
    def create_debt(validated_data, user):
        with db_transaction.atomic():
            debt_id = f'DEBT-{str(uuid4())[:14]}'
            debt = Debts.objects.create(
                debt_id=debt_id,
                user=user,
                debt_type=validated_data['debt_type'],
                person_name=validated_data['person_name'],
                amount=validated_data['amount'],
                remaining_amount=validated_data['amount'], # Ban đầu chưa trả -> Còn nợ nguyên
                interest_rate=validated_data.get('interest_rate', 0),
                start_date=validated_data['start_date'],
                due_date=validated_data['due_date'],
                description=validated_data.get('description', ''),
                status='active',
                created_at=timezone.now(),
                updated_at=timezone.now()
            )
        return debt

    @staticmethod
    def add_payment(debt_obj, validated_data):
        with db_transaction.atomic():
            payment_amount = validated_data['payment_amount']
            
            if payment_amount > debt_obj.remaining_amount:
                raise ValueError("Số tiền thanh toán không được lớn hơn số nợ còn lại")

            payment_id = f'PAY-{str(uuid4())[:15]}'
            DebtPayment.objects.create(
                payment_id=payment_id,
                debt=debt_obj,
                payment_amount=payment_amount,
                payment_date=validated_data['payment_date'],
                note=validated_data.get('note', ''),
                created_at=timezone.now()
            )
            
            # Trừ nợ
            debt_obj.remaining_amount -= payment_amount
            if debt_obj.remaining_amount <= 0:
                debt_obj.status = 'completed'
            
            debt_obj.updated_at = timezone.now()
            debt_obj.save()
        return debt_obj

    @staticmethod
    def process_daily_debts():
        """Cronjob hàng ngày xử lý nhắc nợ và đánh dấu quá hạn"""
        today = timezone.now().date()
        warning_date = today + timedelta(days=3)
        now = timezone.now()

        # 1. Đánh dấu các khoản nợ quá hạn
        overdue_debts = Debts.objects.filter(status='active', due_date__lt=today)
        for debt in overdue_debts:
            debt.status = 'overdue'
            debt.save()

        # 2. Gửi thông báo cho khoản nợ sắp đến hạn (Trong vòng 3 ngày) hoặc quá hạn
        active_debts = Debts.objects.filter(status__in=['active', 'overdue'], due_date__lte=warning_date)
        
        count = 0
        for debt in active_debts:
            title = 'Khoản nợ QUÁ HẠN!' if debt.status == 'overdue' else 'Sắp đến hạn thanh toán nợ'
            action_str = 'phải trả cho' if debt.debt_type == 'borrow' else 'thu từ'
            message = f"Bạn có khoản nợ {action_str} {debt.person_name} số tiền {debt.remaining_amount} đến hạn vào ngày {debt.due_date.strftime('%d/%m/%Y')}."
            
            # Tạo notification (tránh spam cùng 1 khoản nợ chưa đọc trong 1 ngày)
            if not Notification.objects.filter(user=debt.user, related_id=debt.debt_id, is_read=False, created_at__date=today).exists():
                Notification.objects.create(
                    notification_id=f'NOT-{str(uuid4())[:15]}', user=debt.user, notification_type='debt_reminder',
                    title=title, message=message, is_read=False, related_id=debt.debt_id, created_at=now
                )
                count += 1
                
        return count