"""
Data Management Views - Export, Import, Backup
Provides endpoints for:
- Data export (CSV, Excel, PDF)
- Import transactions from CSV
- Backup & restore
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse, HttpResponse
from django.core.cache import cache
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
import os
import logging

from api.models import Transactions, Accounts, Budgets, Debts, SavingsGoals
from api.services.export_service import ExportService
from api.services.import_service import ImportService
from api.services.backup_service import BackupService
from api.tasks import async_export_data, create_user_backup, send_export_ready_email
from api.permissions.permission import DynamicPermission

logger = logging.getLogger(__name__)

#### Export data #####
class ExportViewSet(viewsets.ViewSet):
    """
    - Export transactions, accounts, budgets, debts, savings
    - Formats: CSV, Excel, PDF
    - Sync export for small data, async export for large data
    """
    permission_classes = [IsAuthenticated, DynamicPermission]
    permission_map = {
        'export_transactions': 'view_own_expense',
        'export_accounts': 'view_own_expense',
        'export_budgets': 'view_own_expense',
        'list_exports': 'view_own_expense',
        'download': 'view_own_expense',
        'check_status': 'view_own_expense',
    }

    @extend_schema(
        parameters=[
            OpenApiParameter(name='format', description='Export format: csv, excel, pdf', required=True, type=str),
            OpenApiParameter(name='start_date', description='Start date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date (YYYY-MM-DD)', required=False, type=str),
        ],
        responses={200: OpenApiResponse(description="Export successful")}
    )
    @action(detail=False, methods=['get'], url_path='transactions')
    def export_transactions(self, request):
        """
        Export transactions to file.
        GET /api/exports/transactions/?format=excel&start_date=2024-01-01
        """
        user = request.user
        export_format = request.query_params.get('format', 'excel').lower()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if export_format not in ['csv', 'excel', 'pdf']:
            return Response({
                'success': False,
                'message': 'Invalid format. Choose: csv, excel, pdf'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = Transactions.objects.filter(user=user, is_deleted=False)
        
        if start_date:
            queryset = queryset.filter(transaction_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__date__lte=end_date)
        
        queryset = queryset.select_related('account', 'category').order_by('-transaction_date')
        
        row_count = queryset.count()
        
        if row_count == 0:
            return Response({
                'success': False,
                'message': 'No data to export'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if ExportService.should_use_async(queryset):
            filters = {'start_date': start_date, 'end_date': end_date}
            task = async_export_data.delay(user.user_id, 'transactions', export_format, filters)
            
            return Response({
                'success': True,
                'message': f'Export is being processed ({row_count} transactions). You will be notified when complete.',
                'data': {
                    'task_id': task.id,
                    'async': True,
                    'estimated_rows': row_count,
                }
            }, status=status.HTTP_202_ACCEPTED)
        
        # Sync export
        try:
            if export_format == 'csv':
                filepath = ExportService.export_to_csv('transactions', queryset, user)
            elif export_format == 'excel':
                filepath = ExportService.export_to_excel('transactions', queryset, user)
            else:  # pdf
                filepath = ExportService.export_to_pdf('transactions', queryset, user)
            
            download_url = ExportService.get_export_file_url(filepath)
            
            return Response({
                'success': True,
                'message': f'Successfully exported {row_count} transactions',
                'data': {
                    'download_url': download_url,
                    'filename': os.path.basename(filepath),
                    'rows_exported': row_count,
                    'format': export_format,
                }
            })
            
        except Exception as e:
            logger.error(f"[EXPORT] Error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Export error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='accounts')
    def export_accounts(self, request):
        """Export accounts to file."""
        user = request.user
        export_format = request.query_params.get('format', 'excel').lower()
        
        if export_format not in ['csv', 'excel', 'pdf']:
            return Response({
                'success': False,
                'message': 'Invalid format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = Accounts.objects.filter(user=user)
        
        if not queryset.exists():
            return Response({
                'success': False,
                'message': 'No data to export'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            if export_format == 'csv':
                filepath = ExportService.export_to_csv('accounts', queryset, user)
            elif export_format == 'excel':
                filepath = ExportService.export_to_excel('accounts', queryset, user)
            else:
                filepath = ExportService.export_to_pdf('accounts', queryset, user)
            
            return Response({
                'success': True,
                'message': 'Export successful',
                'data': {
                    'download_url': ExportService.get_export_file_url(filepath),
                    'filename': os.path.basename(filepath),
                }
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='list')
    def list_exports(self, request):
        """
        List recent export files for the user.
        GET /api/exports/list/
        """
        user = request.user
        exports = ExportService.list_user_exports(user, limit=20)
        
        return Response({
            'success': True,
            'data': exports
        })

    @action(detail=False, methods=['get'], url_path='status/(?P<task_id>[^/.]+)')
    def check_status(self, request, task_id=None):
        """
        Check async export task status.
        GET /api/exports/status/{task_id}/
        """
        cache_key = f"export_task_{task_id}"
        task_status = cache.get(cache_key)
        
        if not task_status:
            return Response({
                'success': False,
                'message': 'Task not found or task has expired'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'success': True,
            'data': task_status
        })


class ImportViewSet(viewsets.ViewSet):
    """
    ViewSet for data import.
    
    Supports:
    - Import transactions from CSV
    - Validation and error reporting
    - Download template
    """
    permission_classes = [IsAuthenticated, DynamicPermission]
    parser_classes = [MultiPartParser, FormParser]
    permission_map = {
        'import_transactions': 'create_expense',
        'download_template': 'view_own_expense',
        'validate_file': 'view_own_expense',
    }

    @extend_schema(
        request={'multipart/form-data': {
            'type': 'object',
            'properties': {'file': {'type': 'string', 'format': 'binary'}}
        }},
        responses={200: OpenApiResponse(description="Import successful")}
    )
    @action(detail=False, methods=['post'], url_path='transactions')
    def import_transactions(self, request):
        """
        Import transactions from CSV file.
        POST /api/imports/transactions/
        Body: multipart/form-data with CSV file
        """
        user = request.user
        
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'message': 'Please upload a CSV file'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Validate file first
        validation = ImportService.validate_import_file(file)
        if not validation['valid']:
            return Response({
                'success': False,
                'message': 'Invalid file',
                'errors': validation['errors']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Import
        result = ImportService.import_transactions_from_csv(file, user)
        
        response_status = status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST
        
        return Response({
            'success': result['success'],
            'message': f"Imported {result['imported']}/{result['total_rows']} transactions",
            'data': {
                'total_rows': result['total_rows'],
                'imported': result['imported'],
                'failed': result['failed'],
                'errors': result['errors'][:10],  # Limit to first 10 errors
                'warnings': result['warnings'],
            }
        }, status=response_status)

    @action(detail=False, methods=['get'], url_path='template')
    def download_template(self, request):
        """
        Download CSV template for import.
        GET /api/imports/template/?type=transactions
        """
        template_type = request.query_params.get('type', 'transactions')
        
        try:
            csv_content = ImportService.get_import_template_csv(template_type)
            
            response = HttpResponse(csv_content, content_type='text/csv; charset=utf-8-sig')
            response['Content-Disposition'] = f'attachment; filename="{template_type}_template.csv"'
            return response
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='validate')
    def validate_file(self, request):
        """
        Validate file before import (preview).
        POST /api/imports/validate/
        """
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'message': 'Please upload a file'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        result = ImportService.validate_import_file(file)
        
        return Response({
            'success': result['valid'],
            'data': {
                'valid': result['valid'],
                'errors': result['errors'],
                'warnings': result['warnings'],
                'preview': result.get('preview', []),
                'total_rows': result.get('total_rows', 0),
                'headers': result.get('headers', []),
            }
        })


class BackupViewSet(viewsets.ViewSet):
    """
    Supports:
    - Create backup (manual or async)
    - List backups
    - Download backup
    - Configure backup settings
    """
    permission_classes = [IsAuthenticated, DynamicPermission]
    permission_map = {
        'create_backup': 'view_own_expense',
        'list_backups': 'view_own_expense',
        'download_backup': 'view_own_expense',
        'preview_backup': 'view_own_expense',
        'restore_backup': 'create_expense',
    }

    @extend_schema(
        parameters=[
            OpenApiParameter(name='encrypt', description='Encrypt backup', required=False, type=bool),
            OpenApiParameter(name='upload_s3', description='Upload to S3', required=False, type=bool),
        ],
        responses={202: OpenApiResponse(description="Backup is being created")}
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_backup(self, request):
        """
        Create personal data backup.
        POST /api/backups/create/
        """
        user = request.user
        encrypt = request.data.get('encrypt', True)
        upload_s3 = request.data.get('upload_s3', True)
        async_mode = request.data.get('async', False)
        
        if async_mode:
            # Async backup
            task = create_user_backup.delay(user.user_id, encrypt=encrypt, upload_s3=upload_s3)
            
            return Response({
                'success': True,
                'message': 'Backup is being created. You will be notified when complete.',
                'data': {
                    'task_id': task.id,
                    'async': True,
                }
            }, status=status.HTTP_202_ACCEPTED)
        
        # Sync backup
        try:
            result = BackupService.create_backup(user, encrypt=encrypt, upload_s3=upload_s3)
            
            if result['success']:
                return Response({
                    'success': True,
                    'message': 'Backup created successfully',
                    'data': {
                        'backup_id': result['backup_id'],
                        'size': result['size'],
                        'encrypted': result['encrypted'],
                        'local_path': os.path.basename(result['local_path']),
                    }
                })
            else:
                return Response({
                    'success': False,
                    'message': result.get('error', 'Backup creation failed')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"[BACKUP] Create backup error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='list')
    def list_backups(self, request):
        """
                List all backups for the user.
        GET /api/backups/list/
        """
        user = request.user
        backups = BackupService.list_backups(user)
        
        return Response({
            'success': True,
            'data': backups
        })

    @action(detail=False, methods=['get'], url_path='download/(?P<filename>[^/.]+)')
    def download_backup(self, request, filename=None):
        """
        Download file backup.
        GET /api/backups/download/{filename}/
        """
        user = request.user
        source = request.query_params.get('source', 'local')
        
        try:
            # Add extension if missing
            if not filename.endswith(('.enc', '.gz')):
                # Try to find matching file
                backups = BackupService.list_backups(user)
                matching = [b for b in backups.get('local', []) if b['filename'].startswith(filename)]
                if matching:
                    filename = matching[0]['filename']
                else:
                    return Response({
                        'success': False,
                        'message': 'Backup file not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            backup_data = BackupService.download_backup(user, filename, source)
            
            response = HttpResponse(backup_data, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except FileNotFoundError:
            return Response({
                'success': False,
                'message': 'Backup file does not exist'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='preview/(?P<filename>[^/.]+)')
    def preview_backup(self, request, filename=None):
        """
        Preview backup content (metadata).
        GET /api/backups/preview/{filename}/
        """
        user = request.user
        
        try:
            backup_data = BackupService.download_backup(user, filename)
            encrypted = '.enc' in filename
            
            data = BackupService.decrypt_and_extract(backup_data, user, encrypted=encrypted)
            
            # Only return metadata and statistics, not full data
            return Response({
                'success': True,
                'data': {
                    'metadata': data.get('metadata', {}),
                    'has_accounts': len(data.get('accounts', [])) > 0,
                    'has_transactions': len(data.get('transactions', [])) > 0,
                    'has_budgets': len(data.get('budgets', [])) > 0,
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'filename': {'type': 'string', 'description': 'Backup file name'},
                    'strategy': {'type': 'string', 'enum': ['merge', 'replace']},
                    'restore_options': {
                        'type': 'object',
                        'properties': {
                            'accounts': {'type': 'boolean'},
                            'transactions': {'type': 'boolean'},
                            'budgets': {'type': 'boolean'},
                            'categories': {'type': 'boolean'},
                            'debts': {'type': 'boolean'},
                            'savings_goals': {'type': 'boolean'},
                        }
                    }
                }
            }
        },
        responses={200: OpenApiResponse(description="Restore successful")}
    )
    @action(detail=False, methods=['post'], url_path='restore')
    def restore_backup(self, request):
        """
        Restore data from backup.
        POST /api/backups/restore/
        
        Body:
        {
            "filename": "backup_2024-01-15_abc123.enc",
            "strategy": "merge",  // or "replace"
            "restore_options": {
                "accounts": true,
                "transactions": true,
                "budgets": true
            }
        }
        """
        user = request.user
        filename = request.data.get('filename')
        strategy = request.data.get('strategy', 'merge')
        restore_options = request.data.get('restore_options')
        source = request.data.get('source', 'local')
        
        if not filename:
            return Response({
                'success': False,
                'message': 'Please provide backup filename'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if strategy not in ['merge', 'replace']:
            return Response({
                'success': False,
                'message': 'Strategy must be "merge" or "replace"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Warning cho replace strategy
        if strategy == 'replace':
            confirm = request.data.get('confirm_replace', False)
            if not confirm:
                return Response({
                    'success': False,
                    'message': 'Strategy "replace" will DELETE all current data. Resend with confirm_replace=true to confirm.',
                    'require_confirmation': True
                }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from api.services.backup_service import RestoreService
            
            result = RestoreService.restore_from_backup(
                user=user,
                backup_filename=filename,
                strategy=strategy,
                restore_options=restore_options,
                source=source
            )
            
            if result['success']:
                return Response({
                    'success': True,
                    'message': 'Data restored successfully',
                    'data': {
                        'strategy': result['strategy'],
                        'restored': result['restored'],
                        'pre_backup_id': result['pre_backup_id'],
                    }
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Restore failed',
                    'errors': result['errors']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except FileNotFoundError:
            return Response({
                'success': False,
                'message': 'Backup file not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"[RESTORE] Error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
