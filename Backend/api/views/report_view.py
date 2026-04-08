from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.services.report_service import ReportService
from drf_spectacular.utils import extend_schema, OpenApiParameter
import logging

logger = logging.getLogger(__name__)

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    # Map action to permission in DB (View own report)
    permission_map = {
        'get_dashboard': 'view_own_report',
    }

    @extend_schema(
        parameters=[
            OpenApiParameter(name='start_date', description='Start date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='keyword', description='Search keyword', required=False, type=str),
        ],
        responses={200: dict}
    )
    @action(detail=False, methods=['get'], url_path='dashboard')
    def get_dashboard(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        keyword = request.query_params.get('keyword')

        try:
            data = ReportService.get_dashboard_report(request.user, start_date, end_date, keyword)
            return Response({
                'success': True, 'message': 'Report retrieved successfully', 'data': data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}", exc_info=True)
            return Response({'success': False, 'message': f'An error occurred while generating report: {str(e)} '}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)