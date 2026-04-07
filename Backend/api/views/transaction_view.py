from api.services.transaction_service import TransactionService
from api.services.activity_log_service import ActivityLogService
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
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from api.pagination import CustomPagination

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
        parameters=[
            OpenApiParameter(name='keyword', description='Tìm kiếm theo mô tả hoặc ghi chú', required=False, type=str),
            OpenApiParameter(name='transaction_type', description='Loại giao dịch (income, expense, transfer)', required=False, type=str),
            OpenApiParameter(name='start_date', description='Từ ngày (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Đến ngày (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='category_ids', description='ID danh mục (ngăn cách bởi dấu phẩy)', required=False, type=str),
            OpenApiParameter(name='account_ids', description='ID tài khoản (ngăn cách bởi dấu phẩy)', required=False, type=str),
            OpenApiParameter(name='min_amount', description='Số tiền tối thiểu', required=False, type=float),
            OpenApiParameter(name='max_amount', description='Số tiền tối đa', required=False, type=float),
            OpenApiParameter(name='sort_by', description='Sắp xếp (newest, oldest, amount_desc, amount_asc)', required=False, type=str),
            OpenApiParameter(name='p', description='Trang hiện tại (mặc định 1)', required=False, type=int),
            OpenApiParameter(name='ipp', description='Số item trên trang (mặc định 10)', required=False, type=int),
        ],
        responses=TransactionListSerializer(many=True),
        description="Lấy danh sách giao dịch với bộ lọc nâng cao, phân trang và sắp xếp."
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_transactions(self, request, *args, **kwargs):
        """
        GET /api/transactions/list/
        """
        user = request.user
        queryset = Transactions.objects.filter(user=user, is_deleted=False)

        # 1. Lọc theo Keyword (Mô tả, ghi chú)
        keyword = request.query_params.get('keyword')
        if keyword:
            queryset = queryset.filter(Q(description__icontains=keyword) | Q(note__icontains=keyword))

        # 2. Lọc theo Loại giao dịch (Tabs)
        trans_type = request.query_params.get('transaction_type')
        if trans_type and trans_type in ['income', 'expense', 'transfer']:
            queryset = queryset.filter(transaction_type=trans_type)

        # 3. Lọc theo khoảng thời gian (Date Range)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(transaction_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__date__lte=end_date)

        # 4. Lọc theo Account (Multi-select)
        account_ids = request.query_params.get('account_ids')
        if account_ids:
            acc_list = [x.strip() for x in account_ids.split(',') if x.strip()]
            if acc_list:
                queryset = queryset.filter(account__account_id__in=acc_list)

        # 5. Lọc theo Category (Multi-select)
        category_ids = request.query_params.get('category_ids')
        if category_ids:
            cat_list = [x.strip() for x in category_ids.split(',') if x.strip()]
            if cat_list:
                queryset = queryset.filter(category__category_id__in=cat_list)

        # 6. Lọc theo khoảng số tiền (Range Slider)
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        if min_amount is not None:
            try:
                queryset = queryset.filter(amount__gte=float(min_amount))
            except ValueError:
                pass
        if max_amount is not None:
            try:
                queryset = queryset.filter(amount__lte=float(max_amount))
            except ValueError:
                pass

        # 7. Sắp xếp (Sorting)
        sort_by = request.query_params.get('sort_by', 'newest')
        if sort_by == 'newest':
            queryset = queryset.order_by('-transaction_date')
        elif sort_by == 'oldest':
            queryset = queryset.order_by('transaction_date')
        elif sort_by == 'amount_desc':
            queryset = queryset.order_by('-amount')
        elif sort_by == 'amount_asc':
            queryset = queryset.order_by('amount')
        else:
            queryset = queryset.order_by('-transaction_date')

        # 8. Phân trang (Pagination)
        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = TransactionListSerializer(paginated_queryset, many=True)

        return Response({
            'success': True, 
            'message': 'Lấy danh sách giao dịch thành công.', 
            'data': {
                'transactions': serializer.data,
                'pagination': {
                    'total_items': paginator.page.paginator.count,
                    'total_pages': paginator.page.paginator.num_pages,
                    'current_page': paginator.page.number,
                    'items_per_page': paginator.get_page_size(request),
                    'has_next': paginator.page.has_next(),
                    'has_previous': paginator.page.has_previous(),
                }
            }
        }, status=status.HTTP_200_OK)

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
        # print("=== DEBUG: ĐÃ VÀO create_transaction ===")
        # print("User từ request:", request.user)
        # print("Token header:", request.headers.get('Authorization'))
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
            
            # Log activity
            ActivityLogService.log(
                request,
                action='CREATE_TRANSACTION',
                details=f"Created transaction: {result.get('transaction_type', '')} - {result.get('amount', 0)}",
                level='ACTION'
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
            
            # Log activity
            ActivityLogService.log(
                request,
                action='UPDATE_TRANSACTION',
                details=f'Updated transaction ID: {transaction_id}',
                level='ACTION'
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
            
            # Log activity
            ActivityLogService.log(
                request,
                action='DELETE_TRANSACTION',
                details=f"Deleted transaction ID: {transaction_id} (hard_delete={hard_delete})",
                level='ACTION'
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
            
            # Log activity
            ActivityLogService.log(
                request,
                action='RESTORE_TRANSACTION',
                details=f'Restored transaction ID: {transaction_id}',
                level='ACTION'
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