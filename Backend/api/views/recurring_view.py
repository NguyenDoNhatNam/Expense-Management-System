from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.services.recurring_service import RecurringService
from api.serializers.recurring_serializer import RecurringListSerializer, CreateRecurringSerializer, UpdateRecurringSerializer
from api.models import RecurringTransactions
from drf_spectacular.utils import extend_schema
import logging

logger = logging.getLogger(__name__)

class RecurringViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_recurring': 'view_own_expense',
        'create_recurring': 'create_expense',
        'update_recurring': 'edit_own_expense',
        'delete_recurring': 'delete_own_expense',
    }

    @extend_schema(responses={200: RecurringListSerializer(many=True)})
    @action(detail=False, methods=['get'], url_path='list')
    def list_recurring(self, request):
        recurrings = RecurringService.get_active_recurrings(request.user)
        serializer = RecurringListSerializer(recurrings, many=True)
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(request=CreateRecurringSerializer)
    @action(detail=False, methods=['post'], url_path='create')
    def create_recurring(self, request):
        serializer = CreateRecurringSerializer(data=request.data, context={'user': request.user})
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            record = RecurringService.create_recurring(serializer.validated_data, request.user)
            return Response({'success': True, 'data': {'recurring_id': record.recurring_id}}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'message': 'Lỗi server'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(request=UpdateRecurringSerializer)
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<recurring_id>[^/.]+)')
    def update_recurring(self, request, recurring_id=None):
        try:
            recurring_obj = RecurringTransactions.objects.get(recurring_id=recurring_id, user=request.user, is_active=True)
            serializer = UpdateRecurringSerializer(data=request.data)
            if serializer.is_valid():
                RecurringService.update_recurring(recurring_obj, serializer.validated_data, request.user)
                return Response({'success': True, 'message': 'Cập nhật thành công'})
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except RecurringTransactions.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy'}, status=status.HTTP_404_NOT_FOUND)
            
    @action(detail=False, methods=['delete'], url_path='delete/(?P<recurring_id>[^/.]+)')
    def delete_recurring(self, request, recurring_id=None):
        RecurringService.delete_recurring(recurring_id, request.user)
        return Response({'success': True, 'message': 'Xóa thành công'})
