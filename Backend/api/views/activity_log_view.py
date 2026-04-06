"""
Activity Log Views
API endpoints cho Admin Activity Terminal.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
import csv
import logging

from api.models import ActivityLogs
from api.services.activity_log_service import ActivityLogService
from api.serializers.activity_log_serializer import (
    ActivityLogSerializer,
    ActivityLogDetailSerializer,
    ActivityLogStatsSerializer,
    UserDetailFromActivitySerializer
)
from api.permissions.permission import DynamicPermission

logger = logging.getLogger(__name__)


class ActivityLogViewSet(viewsets.ViewSet):
    """
    ViewSet cho Activity Log API.
    
    Endpoints:
    - GET /activity-logs/list/ - Lấy danh sách logs với filter và phân trang
    - GET /activity-logs/stats/ - Lấy thống kê hoạt động
    - GET /activity-logs/user/{user_id}/ - Lấy thông tin chi tiết user
    - GET /activity-logs/export/ - Export logs ra CSV
    - GET /activity-logs/realtime/ - Endpoint cho polling realtime data
    """
    permission_classes = [IsAuthenticated, DynamicPermission]
    permission_map = {
        'list_logs': 'view_activity_logs',
        'get_stats': 'view_activity_logs',
        'get_user_detail': 'view_activity_logs',
        'export_logs': 'export_activity_logs',
        'realtime': 'view_activity_logs',
    }

    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', description='Số trang', required=False, type=int),
            OpenApiParameter(name='page_size', description='Số items mỗi trang', required=False, type=int),
            OpenApiParameter(name='level', description='Filter theo level: INFO, ACTION, WARNING, ERROR', required=False, type=str),
            OpenApiParameter(name='action', description='Filter theo action type', required=False, type=str),
            OpenApiParameter(name='user_id', description='Filter theo user ID', required=False, type=str),
            OpenApiParameter(name='search', description='Tìm kiếm trong user, action, details, IP', required=False, type=str),
            OpenApiParameter(name='start_date', description='Từ ngày (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Đến ngày (YYYY-MM-DD)', required=False, type=str),
        ],
        responses={200: ActivityLogSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_logs(self, request):
        """
        Lấy danh sách activity logs.
        GET /api/activity-logs/list/?page=1&page_size=50&level=ERROR
        """
        # Log activity (view logs)
        ActivityLogService.log(request, 'VIEW_ACTIVITY_LOGS', 'Admin viewed activity logs')
        
        # Parse query params
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        page_size = min(page_size, 200)  # Max 200 items per page
        
        filters = {}
        
        if request.query_params.get('level'):
            filters['level'] = request.query_params['level'].upper()
        
        if request.query_params.get('action'):
            filters['action'] = request.query_params['action']
        
        if request.query_params.get('user_id'):
            filters['user_id'] = request.query_params['user_id']
        
        if request.query_params.get('search'):
            filters['search'] = request.query_params['search']
        
        if request.query_params.get('start_date'):
            filters['start_date'] = request.query_params['start_date']
        
        if request.query_params.get('end_date'):
            filters['end_date'] = request.query_params['end_date']
        
        result = ActivityLogService.get_logs(filters, page, page_size)
        
        serializer = ActivityLogSerializer(result['logs'], many=True)
        
        return Response({
            'success': True,
            'data': {
                'logs': serializer.data,
                'pagination': {
                    'total': result['total'],
                    'page': result['page'],
                    'page_size': result['page_size'],
                    'total_pages': result['total_pages'],
                }
            }
        })

    @extend_schema(
        responses={200: ActivityLogStatsSerializer}
    )
    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        Lấy thống kê hoạt động.
        GET /api/activity-logs/stats/
        """
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        stats = ActivityLogService.get_stats(start_date, end_date)
        
        return Response({
            'success': True,
            'data': stats
        })

    @extend_schema(
        parameters=[
            OpenApiParameter(name='user_id', description='User ID', required=True, type=str, location='path')
        ],
        responses={200: UserDetailFromActivitySerializer}
    )
    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[^/.]+)')
    def get_user_detail(self, request, user_id=None):
        """
        Lấy thông tin chi tiết user từ activity logs.
        GET /api/activity-logs/user/{user_id}/
        """
        user_detail = ActivityLogService.get_user_detail(user_id)
        
        if not user_detail:
            return Response({
                'success': False,
                'message': 'User không tồn tại'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Serialize recent logs
        user_detail['recent_logs'] = ActivityLogSerializer(
            user_detail['recent_logs'], many=True
        ).data
        
        return Response({
            'success': True,
            'data': user_detail
        })

    @extend_schema(
        parameters=[
            OpenApiParameter(name='level', description='Filter theo level', required=False, type=str),
            OpenApiParameter(name='action', description='Filter theo action', required=False, type=str),
            OpenApiParameter(name='start_date', description='Từ ngày (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Đến ngày (YYYY-MM-DD)', required=False, type=str),
        ],
        responses={200: OpenApiResponse(description="CSV file")}
    )
    @action(detail=False, methods=['get'], url_path='export')
    def export_logs(self, request):
        """
        Export activity logs ra CSV.
        GET /api/activity-logs/export/?start_date=2024-01-01&end_date=2024-01-31
        """
        # Log export action
        ActivityLogService.log(request, 'EXPORT_ACTIVITY_LOGS', 'Admin exported activity logs')
        
        filters = {}
        if request.query_params.get('level'):
            filters['level'] = request.query_params['level'].upper()
        if request.query_params.get('action'):
            filters['action'] = request.query_params['action']
        if request.query_params.get('start_date'):
            filters['start_date'] = request.query_params['start_date']
        if request.query_params.get('end_date'):
            filters['end_date'] = request.query_params['end_date']
        
        # Get all logs (no pagination for export)
        result = ActivityLogService.get_logs(filters, page=1, page_size=10000)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="activity_logs_{request.query_params.get("start_date", "all")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp', 'Level', 'User', 'Email', 'Action', 'Details',
            'IP Address', 'Device', 'Browser', 'OS', 'Status'
        ])
        
        for log in result['logs']:
            writer.writerow([
                log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else '',
                log.level,
                log.user.full_name if log.user else 'Anonymous',
                log.user.email if log.user else '',
                log.action,
                log.details or '',
                log.ip_address or '',
                log.device or '',
                log.browser or '',
                log.os or '',
                log.status,
            ])
        
        return response

    @extend_schema(
        parameters=[
            OpenApiParameter(name='since', description='Lấy logs từ timestamp này (ISO format)', required=False, type=str),
        ],
        responses={200: ActivityLogSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='realtime')
    def realtime(self, request):
        """
        Endpoint cho polling realtime data.
        GET /api/activity-logs/realtime/?since=2024-01-01T12:00:00
        
        Trả về:
        - new_logs: Logs mới từ timestamp
        - stats: Thống kê cập nhật
        """
        since = request.query_params.get('since')
        
        # Get new logs since timestamp
        queryset = ActivityLogs.objects.select_related('user').order_by('-created_at')
        
        if since:
            from django.utils.dateparse import parse_datetime
            since_dt = parse_datetime(since)
            if since_dt:
                queryset = queryset.filter(created_at__gt=since_dt)
        
        new_logs = queryset[:20]  # Max 20 new logs per poll
        
        # Get updated stats
        stats = ActivityLogService.get_stats()
        
        serializer = ActivityLogSerializer(new_logs, many=True)
        
        return Response({
            'success': True,
            'data': {
                'new_logs': serializer.data,
                'stats': stats,
                'server_time': timezone.now().isoformat(),
            }
        })
