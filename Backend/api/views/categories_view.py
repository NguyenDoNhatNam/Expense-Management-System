from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import Categories
from api.services.category_service import CategoryService
from api.serializers.categories_serializers import (
    CategoryListSerializer,
    CreateCategorySerializer,
    UpdateCategorySerializer,
    DeleteCategorySerializer
)
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse

class CategoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_categories': 'view_own_category',
        'create_category': 'create_category',
        'update_category': 'edit_own_category',
        'delete_category': 'delete_own_category',
    }

    # ===================== LIST CATEGORIES =====================

    @extend_schema(
        request=CategoryListSerializer,
        responses={
            200: OpenApiResponse(
                description="Lấy danh sách danh mục "
            )
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_categories(self, request):
        try:
            categories = CategoryService.get_categories(request.user)
            serializer = CategoryListSerializer(categories, many=True)
            
            return Response({
                'success': True,
                'message': 'Lấy danh sách danh mục thành công',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Đã xảy ra lỗi khi lấy danh sách danh mục'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ===================== CREATE NEW CATEGORY =====================
    @extend_schema(
        request=CreateCategorySerializer,
        responses={
            201: OpenApiResponse(
                description="Tạo danh mục thành công"
            )
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_category(self, request):
        serializer = CreateCategorySerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Dữ liệu không hợp lệ',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_category = CategoryService.create_category(
                serializer.validated_data, 
                request.user
            )
            
            return Response({
                'success': True,
                'message': 'Tạo danh mục thành công',
                'data': {
                    'category_id': new_category.category_id,
                    'category_name': new_category.category_name
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Đã xảy ra lỗi khi tạo danh mục'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ===================== UPDATE  =====================
    @extend_schema(
        request=UpdateCategorySerializer,
        responses={
            200: OpenApiResponse(
                description="Cập nhật danh mục thành công"
            )
        }
    )
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<category_id>[^/.]+)')
    def update_category(self, request, category_id=None):
        try:
            category = Categories.objects.get(category_id=category_id, user=request.user)
        except Categories.DoesNotExist:
            return Response({
                'success': False, 'message': 'Danh mục không tồn tại'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateCategorySerializer(
            data=request.data,
            context={'user': request.user, 'category': category}
        )

        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Dữ liệu không hợp lệ',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_cat = CategoryService.update_category(
                category, 
                serializer.validated_data, 
                request.user
            )
            return Response({
                'success': True,
                'message': 'Cập nhật danh mục thành công',
                'data': {
                    'category_id': updated_cat.category_id,
                    'category_name': updated_cat.category_name
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Đã xảy ra lỗi khi cập nhật danh mục'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ===================== DELETE CATEGORY =====================
    @action(detail=False, methods=['delete'], url_path='delete/(?P<category_id>[^/.]+)')
    @extend_schema(
        request=DeleteCategorySerializer,
        responses={
            200: OpenApiResponse(
                description="Xoá danh mục thành công"
            )
        }
    )
    def delete_category(self, request, category_id=None):
        try:
            category = Categories.objects.get(category_id=category_id, user=request.user)
        except Categories.DoesNotExist:
            return Response({
                'success': False, 'message': 'Danh mục không tồn tại'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = DeleteCategorySerializer(
            data=request.query_params if request.method == 'GET' else request.data,
            context={'user': request.user, 'category': category}
        )

        if not serializer.is_valid():
            return Response({
                'success': False, 'message': 'Không thể xóa', 'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = CategoryService.delete_category(category, serializer.validated_data, request.user)
            return Response({'success': True, 'message': 'Xóa danh mục thành công', 'data': result}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'message': 'Lỗi server khi xóa danh mục'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
