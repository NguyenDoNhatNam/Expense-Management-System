from django.db import transaction as db_transaction
from django.utils import timezone
from uuid import uuid4
from api.models import Budgets, Transactions
from django.db.models import OuterRef, Subquery, Sum, DecimalField
from django.db.models.functions import Coalesce
import logging

logger = logging.getLogger(__name__)

class BudgetService:
    @staticmethod
    def get_budgets(user):
        """Lấy danh sách ngân sách kèm theo tổng số tiền đã chi (spent_amount) realtime"""
        spent_subquery = Transactions.objects.filter(
            user=user,
            category=OuterRef('category_id'),
            transaction_type='expense',
            is_deleted=False,
            transaction_date__date__gte=OuterRef('start_date'),
            transaction_date__date__lte=OuterRef('end_date')
        ).values('category').annotate(
            total=Sum('amount')
        ).values('total')

        budgets = Budgets.objects.filter(user=user, is_active=True).annotate(
            spent_amount=Coalesce(
                Subquery(spent_subquery, output_field=DecimalField()), 
                0.0, output_field=DecimalField()
            )
        ).order_by('-start_date')
        
        return budgets

    @staticmethod
    def create_budget(validated_data, user):
        with db_transaction.atomic():
            budget_id = f'BUD-{str(uuid4())[:15]}'
            budget = Budgets.objects.create(
                budget_id=budget_id, user=user, category=validated_data['category'],
                budget_name=validated_data['budget_name'], amount=validated_data['amount'],
                period=validated_data['period'], start_date=validated_data['start_date'],
                end_date=validated_data['end_date'], alert_threshold=validated_data.get('alert_threshold', 80),
                is_active=True, created_at=timezone.now(), updated_at=timezone.now()
            )
        return budget

    @staticmethod
    def update_budget(budget, validated_data):
        with db_transaction.atomic():
            for key, value in validated_data.items():
                setattr(budget, key, value)
            budget.updated_at = timezone.now()
            budget.save()
        return budget

    @staticmethod
    def delete_budget(budget):
        with db_transaction.atomic():
            # Soft delete ngân sách
            budget.is_active = False
            budget.updated_at = timezone.now()
            budget.save()
        return True
