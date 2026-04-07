from django.db import transaction as db_transaction
from django.db.models import Count, DecimalField, Sum, Q, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from uuid import uuid4
from api.models import Categories, Transactions
from api.services.transaction_service import TransactionService
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class CategoryService:

    @staticmethod
    def get_categories(user):
        logger.debug(f"Fetching categories for user {user.user_id}")
        categories = Categories.objects.filter(user=user, is_deleted=False).annotate(
            transaction_count=Count(
                'transactions',
                filter=Q(transactions__is_deleted=False, transactions__user=user)
            ),
            total_amount=Coalesce(
                Sum(
                    'transactions__amount',
                    filter=Q(transactions__is_deleted=False, transactions__user=user)
                ),
                Value(Decimal('0.00')),
                output_field=DecimalField(max_digits=18, decimal_places=2),
            )
        ).order_by('category_type', 'category_name')
        
        return categories

    @staticmethod
    def create_category(validated_data, user):
       
        is_default = validated_data.get('is_default', False)
        if is_default:
            is_admin = user.role and user.role.role_name in ['admin', 'super_admin']
            if not is_admin:
                is_default = False 

        with db_transaction.atomic():
            category_id = f'CAT-{str(uuid4())[:15]}'
            
            new_category = Categories.objects.create(
                category_id=category_id,
                user=user,
                category_name=validated_data['category_name'],
                category_type=validated_data['category_type'],
                icon=validated_data.get('icon', ''),
                color=validated_data.get('color', ''),
                parent_category=validated_data.get('parent_category', None),
                is_default=is_default,
                is_deleted = False, 
                created_at=timezone.now()
            )
            
        return new_category

    @staticmethod
    def update_category(category_obj, validated_data, user):
        """Cập nhật danh mục"""
        with db_transaction.atomic():
            if 'category_name' in validated_data:
                category_obj.category_name = validated_data['category_name']
            if 'icon' in validated_data:
                category_obj.icon = validated_data['icon']
            if 'color' in validated_data:
                category_obj.color = validated_data['color']
            if 'parent_category' in validated_data:
                category_obj.parent_category = validated_data['parent_category']
            
            #### Chỉ có admin mới có quyền sửa category default ######
            if 'is_default' in validated_data:
                is_admin = user.role and user.role.role_name in ['admin', 'super_admin']
                if is_admin:
                    category_obj.is_default = validated_data['is_default']

            category_obj.save()
        return category_obj

    @staticmethod
    def delete_category(category_obj, validated_data, user):
        """
        Xóa danh mục:
        1. Nâng cấp các danh mục con (con thành gốc).
        2. Xử lý giao dịch đang chứa danh mục này.
        3. Xóa danh mục.
        """
        action = validated_data.get('action')
        target_category = validated_data.get('target_category')
        now = timezone.now()

        with db_transaction.atomic():
            #  Đưa các danh mục con thành danh mục gốc
            Categories.objects.filter(parent_category=category_obj).update(parent_category=None)

            # Xử lý giao dịch liên quan
            # Lấy tất cả giao dịch (kể cả soft deleted để chuyển cho đồng bộ data)
            related_transactions = Transactions.objects.filter(category=category_obj)
            transaction_count = related_transactions.count()

            if transaction_count > 0:
                if not action:
                    raise ValueError("Danh mục này đang có giao dịch. Vui lòng chọn hành động (Xóa giao dịch hoặc Di chuyển sang danh mục khác).")
                
                if action == 'migrate':
                    # Đổi category_id của các giao dịch sang danh mục đích
                    related_transactions.update(
                        category=target_category,
                        updated_at=now
                    )
                    
                elif action == 'delete_all':
                    # Soft Delete tất cả giao dịch thuộc danh mục này
                    # Khi xóa giao dịch (Expense/Income), 
                    # ta phải hoàn nguyên Balance của Account. 
                    
                    active_transactions = related_transactions.filter(is_deleted=False)
                    for trans in active_transactions:
                        # Phải hoàn nguyên số dư tài khoản
                        try:
                            TransactionService.delete_transaction(
                                transaction_id=trans.transaction_id,
                                user=user,
                                hard_delete=False 
                            )
                        except Exception as e:
                            raise ValueError(f"Lỗi khi xóa giao dịch {trans.transaction_id}: {str(e)}")

            # 3. Xóa danh mục
            category_obj.delete()

        return {
            "success": True,
            "transactions_affected": transaction_count,
            "action_taken": action if transaction_count > 0 else "direct_delete"
        }
