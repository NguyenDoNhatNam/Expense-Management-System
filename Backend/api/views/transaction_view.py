from api.services.transaction_service import TransactionService
from api.serializers.transaction_serializer import (
    CreateTransactionSerializer,
    UpdateTransactionSerializer,
    DeleteTransactionSerializer,
)
from api.models import Transactions
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
import logging

logger = logging.getLogger(__name__)


class TransactionViewset(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    # ===================== CREATE =====================
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

    # ===================== RESTORE (Bonus) =====================
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