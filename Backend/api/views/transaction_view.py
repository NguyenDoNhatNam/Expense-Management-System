from api.services.transaction_service import TransactionService 
from api.serializers.transaction_serializer import CreateTransactionSerializer
from rest_framework import viewsets , status
from rest_framework.response import Response 
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

class TransactionViewset(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]


    @action(detail= False , methods=['post'], url_path='create')
    def create_transaction(self , request , *args , **kwargs):
        serializer = CreateTransactionSerializer(
            data = request.data , 
            context = {
                'user' : request.user
            }
        )
        if not serializer.is_valid(): 
            return Response({
                'status': '400' , 
                'error': serializer.errors, 
                'message' : "Dữ liệu không hợp lệ"
            })

        try: 
            result = TransactionService.create_transaction(serializer.validated_data , request.user)
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
                {
                    'success': False,
                    'message': str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'message': 'Đã xảy ra lỗi khi tạo giao dịch',
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

