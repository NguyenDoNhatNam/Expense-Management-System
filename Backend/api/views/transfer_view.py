from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.services.transfer_service import TransferService
from api.serializers.transfer_serializer import TransferListSerializer, CreateTransferSerializer
from drf_spectacular.utils import extend_schema

class TransferViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_transfers': 'view_own_expense',
        'create_transfer': 'create_expense',
        'delete_transfer': 'delete_own_expense',
    }

    @extend_schema(responses={200: TransferListSerializer(many=True)})
    @action(detail=False, methods=['get'], url_path='list')
    def list_transfers(self, request):
        transfers = TransferService.get_transfers(request.user)
        serializer = TransferListSerializer(transfers, many=True)
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(request=CreateTransferSerializer)
    @action(detail=False, methods=['post'], url_path='create')
    def create_transfer(self, request):
        serializer = CreateTransferSerializer(data=request.data)
        if serializer.is_valid():
            try:
                transfer = TransferService.create_transfer(serializer.validated_data, request.user)
                return Response({
                    'success': True, 
                    'message': 'Chuyển khoản thành công',
                    'data': {'transfer_id': transfer.transfer_id}
                }, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'], url_path='delete/(?P<transfer_id>[^/.]+)')
    def delete_transfer(self, request, transfer_id=None):
        try:
            TransferService.delete_transfer(transfer_id, request.user)
            return Response({'success': True, 'message': 'Đã xóa và hoàn nguyên số dư thành công'})
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)