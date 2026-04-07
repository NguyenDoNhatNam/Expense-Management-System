from api.services.transaction_service import TransactionService
from api.serializers.transaction_serializer import (
    CreateTransactionSerializer,
    UpdateTransactionSerializer,
    DeleteTransactionSerializer,
    TransactionListSerializer,
)
from api.models import Transactions
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Q
import logging
from api.permissions.permission import PermissionMixin , DynamicPermission ,HasPermission
logger = logging.getLogger(__name__)
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse

class TransactionViewset(viewsets.ViewSet):
    permission_classes = [IsAuthenticated , DynamicPermission] 
    permission_map = {
        'list_transactions': 'view_own_expense',
        'create_transaction': 'create_expense',
        'update_transaction': 'edit_own_expense',
        'delete_transaction': 'delete_own_expense',
        'restore_transaction': 'edit_own_expense',   
    }

    
    # ===================== LIST =====================
    @extend_schema(
        responses=TransactionListSerializer(many=True),
        description="Lấy danh sách giao dịch của người dùng với các bộ lọc tùy chọn."
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_transactions(self, request, *args, **kwargs):
        """
        GET /api/transactions/list/
        """
        user = request.user
        queryset = Transactions.objects.filter(user=user, is_deleted=False).order_by('-transaction_date')
        account_id = request.query_params.get('account_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        trans_type = request.query_params.get('transaction_type')
        keyword = request.query_params.get('keyword')
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        category_ids = request.query_params.get('category_ids')
        sort_by = request.query_params.get('sort_by')

        if account_id:
            queryset = queryset.filter(account__account_id=account_id)
        if start_date:
            queryset = queryset.filter(transaction_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__date__lte=end_date)
        if trans_type and trans_type in ['income', 'expense']:
            queryset = queryset.filter(transaction_type=trans_type)
        if keyword:
            queryset = queryset.filter(Q(description__icontains=keyword) | Q(note__icontains=keyword))
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        if category_ids:
            ids = [cid.strip() for cid in category_ids.split(',') if cid.strip()]
            if ids:
                queryset = queryset.filter(category__category_id__in=ids)

        sort_mapping = {
            'newest': '-transaction_date',
            'oldest': 'transaction_date',
            'amount_desc': '-amount',
            'amount_asc': 'amount',
        }
        if sort_by and sort_by in sort_mapping:
            queryset = queryset.order_by(sort_mapping[sort_by])

        serializer = TransactionListSerializer(queryset, many=True)
        return Response({'success': True, 'message': 'Lấy danh sách giao dịch thành công.', 'data': serializer.data,}, status=status.HTTP_200_OK)
    # ===================== CREATE =====================
    @extend_schema(
        request=CreateTransactionSerializer,
        responses={
            200: OpenApiResponse(
                description="Lấy danh sách ngân sách "
            )
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_transaction(self, request, *args, **kwargs):
        serializer = CreateTransactionSerializer(
            data=request.data,
            context={'user': request.user}
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Dữ liệu không hợp lệ',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = TransactionService.create_transaction(
                serializer.validated_data, request.user
            )
            return Response(
                {
                    'success': True,
                    'message': 'Tạo giao dịch thành công',
                    'data': result,
                },
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error creating transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'Đã xảy ra lỗi khi tạo giao dịch'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ===================== UPDATE =====================
    @extend_schema(
        request=UpdateTransactionSerializer,
        responses={
            200: OpenApiResponse(
                description="Lấy danh sách ngân sách "
            )
        }
    )
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<transaction_id>[^/.]+)')
    def update_transaction(self, request, transaction_id=None, *args, **kwargs):
        """
        PUT/PATCH /api/transactions/update/{transaction_id}/
        """
        # 1. Lấy giao dịch cũ để truyền vào context
        try:
            old_transaction = Transactions.objects.get(
                transaction_id=transaction_id,
                user=request.user,
                is_deleted=False,
            )
        except Transactions.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Giao dịch không tồn tại hoặc đã bị xóa'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Validate dữ liệu mới
        serializer = UpdateTransactionSerializer(
            data=request.data,
            context={
                'user': request.user,
                'old_transaction': old_transaction,
            }
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Dữ liệu không hợp lệ',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Thực hiện update
        try:
            result = TransactionService.update_transaction(
                transaction_id=transaction_id,
                validated_data=serializer.validated_data,
                user=request.user,
            )
            return Response(
                {
                    'success': True,
                    'message': 'Cập nhật giao dịch thành công',
                    'data': result,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error updating transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'Đã xảy ra lỗi khi cập nhật giao dịch'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ===================== DELETE =====================
    @extend_schema(
        request=DeleteTransactionSerializer,
        responses={
            200: OpenApiResponse(
                description="Lấy danh sách ngân sách "
            )
        }
    )
    @action(detail=False, methods=['delete'], url_path='delete/(?P<transaction_id>[^/.]+)')
    def delete_transaction(self, request, transaction_id=None, *args, **kwargs):
        """
        DELETE /api/transactions/delete/{transaction_id}/
        Query params: ?hard_delete=true (optional, mặc định soft delete)
        """
        # 1. Lấy giao dịch
        try:
            transaction_obj = Transactions.objects.get(
                transaction_id=transaction_id,
                user=request.user,
                is_deleted=False,
            )
        except Transactions.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Giao dịch không tồn tại hoặc đã bị xóa'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Validate (kiểm tra giới hạn 30 ngày, ...)
        serializer = DeleteTransactionSerializer(
            data={
                'hard_delete': request.query_params.get('hard_delete', 'false').lower() == 'true',
            },
            context={
                'user': request.user,
                'transaction': transaction_obj,
            }
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Không thể xóa giao dịch',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Thực hiện xóa
        try:
            hard_delete = serializer.validated_data.get('hard_delete', False)
            result = TransactionService.delete_transaction(
                transaction_id=transaction_id,
                user=request.user,
                hard_delete=hard_delete,
            )
            return Response(
                {
                    'success': True,
                    'message': 'Xóa giao dịch thành công',
                    'data': result,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error deleting transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'Đã xảy ra lỗi khi xóa giao dịch'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ===================== RESTORE =====================
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Lấy danh sách ngân sách "
            )
        }
    )
    @action(detail=False, methods=['post'], url_path='restore/(?P<transaction_id>[^/.]+)')
    def restore_transaction(self, request, transaction_id=None, *args, **kwargs):
        """
        POST /api/transactions/restore/{transaction_id}/
        Khôi phục giao dịch đã soft delete.
        """
        try:
            transaction_obj = Transactions.objects.get(
                transaction_id=transaction_id,
                user=request.user,
                is_deleted=True,
            )
        except Transactions.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Không tìm thấy giao dịch đã xóa'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            result = TransactionService.restore_transaction(
                transaction_id=transaction_id,
                user=request.user,
            )
            return Response(
                {
                    'success': True,
                    'message': 'Khôi phục giao dịch thành công',
                    'data': result,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error restoring transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'Đã xảy ra lỗi khi khôi phục giao dịch'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )