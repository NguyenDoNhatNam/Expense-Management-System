from rest_framework import viewsets , status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from api.services.upload_service import UploadService
from api.permissions.permission import HasPermission

class ReceiptUploadView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, HasPermission]
    parser_classes = [MultiPartParser, FormParser]

    permission_required = 'create_expense'
    @action(detail=False , methods=['post'] , url_path='upload-receipt')
    def upload_receipt(self, request):
        """
        POST /api/upload/receipt/
        Content-Type: multipart/form-data
        Body: file=<image_file>
        
        Response: { "receipt_image_url": "/media/receipts/USER-xxx/abc123.webp" }
        """
        file = request.FILES.get('file')

        if not file:
            return Response(
                {'success': False, 'message': 'Please select an image file'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate
        errors = UploadService.validate_receipt_image(file)
        if errors:
            return Response(
                {'success': False, 'message': errors[0], 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            file_url = UploadService.upload_receipt_image(file, request.user)
            return Response(
                {
                    'success': True,
                    'message': 'Receipt image uploaded successfully',
                    'data': {'receipt_image_url': file_url},
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {'success': False, 'message': 'Error uploading image'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )