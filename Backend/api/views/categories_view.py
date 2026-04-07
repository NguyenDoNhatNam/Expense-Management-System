from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import Categories
from api.services.category_service import CategoryService
from api.services.activity_log_service import ActivityLogService
from api.serializers.categories_serializers import (
    CategoryListSerializer,
    CreateCategorySerializer,
    UpdateCategorySerializer,
    DeleteCategorySerializer
)
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse
from drf_spectacular.utils import OpenApiParameter
from api.pagination import CustomPagination

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
        parameters=[
            OpenApiParameter(name='p', description='Trang hiện tại (mặc định 1)', required=False, type=int),
            OpenApiParameter(name='ipp', description='Số lượng bản ghi mỗi trang', required=False, type=int),
            OpenApiParameter(name='search', description='Từ khóa tìm kiếm theo tên', required=False, type=str),
            OpenApiParameter(name='category_type', description='Loại (income/expense)', required=False, type=str),
            OpenApiParameter(name='is_default', description='Danh mục mặc định (true/false)', required=False, type=bool),
            OpenApiParameter(name='min_count', description='Số lượng GD tối thiểu', required=False, type=int),
            OpenApiParameter(name='max_count', description='Số lượng GD tối đa', required=False, type=int),
            OpenApiParameter(name='min_amount', description='Tổng tiền tối thiểu', required=False, type=float),
            OpenApiParameter(name='max_amount', description='Tổng tiền tối đa', required=False, type=float),
            OpenApiParameter(name='tree', description='Hiển thị dạng cây cha-con (true/false)', required=False, type=bool),
        ],
        responses={
            200: OpenApiResponse(description="Lấy danh sách danh mục thành công")
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_categories(self, request):
        try:
            
            queryset = CategoryService.get_categories(request.user)

            search_query = request.query_params.get('search', '').strip()
            category_type = request.query_params.get('category_type', '').strip()
            is_default = request.query_params.get('is_default', None)
            min_count = request.query_params.get('min_count')
            max_count = request.query_params.get('max_count')
            min_amount = request.query_params.get('min_amount')
            max_amount = request.query_params.get('max_amount')
            is_tree = request.query_params.get('tree', 'false').lower() == 'true'

            if search_query:
                queryset = queryset.filter(category_name__icontains=search_query)
            if category_type in ['income', 'expense']:
                queryset = queryset.filter(category_type=category_type)
            if is_default is not None:
                is_default_bool = str(is_default).lower() == 'true'
                queryset = queryset.filter(is_default=is_default_bool)
            if min_count is not None:
                queryset = queryset.filter(transaction_count__gte=min_count)
            if max_count is not None:
                queryset = queryset.filter(transaction_count__lte=max_count)
            if min_amount is not None:
                queryset = queryset.filter(total_amount__gte=min_amount)
            if max_amount is not None:
                queryset = queryset.filter(total_amount__lte=max_amount)

            queryset = queryset.order_by('-created_at')

            if is_tree:
                all_categories = list(queryset)
                cat_dict = {cat.category_id: cat for cat in all_categories}
                roots = []
                
                for cat in all_categories:
                    cat._children = []
                    
                for cat in all_categories:
                    if cat.parent_category_id and cat.parent_category_id in cat_dict:
                        cat_dict[cat.parent_category_id]._children.append(cat)
                    else:
                        roots.append(cat)
                
                paginator = CustomPagination()
                paginated_roots = paginator.paginate_queryset(roots, request)
                serializer = CategoryListSerializer(paginated_roots, many=True, context={'tree_mode': True})
                return paginator.get_paginated_response(serializer.data)

            paginator = CustomPagination()
            paginated_queryset = paginator.paginate_queryset(queryset, request)
            serializer = CategoryListSerializer(paginated_queryset, many=True, context={'tree_mode': False})
            return paginator.get_paginated_response(serializer.data)

        except Exception as e:
            return Response({
                'success': False,
                'message': f'Đã xảy ra lỗi khi lấy danh sách danh mục: {str(e)}'
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
            
            # Log activity
            ActivityLogService.log(
                request,
                action='CREATE_CATEGORY',
                details=f'Created category: {new_category.category_name}',
                level='ACTION'
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
                'message': f'Đã xảy ra lỗi khi tạo danh mục: {str(e)}'
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
            
            # Log activity
            ActivityLogService.log(
                request,
                action='UPDATE_CATEGORY',
                details=f'Updated category: {updated_cat.category_name}',
                level='ACTION'
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
            category_name = category.category_name
            result = CategoryService.delete_category(category, serializer.validated_data, request.user)
            
            # Log activity
            ActivityLogService.log(
                request,
                action='DELETE_CATEGORY',
                details=f'Deleted category: {category_name}',
                level='ACTION'
            )
            
            return Response({'success': True, 'message': 'Xóa danh mục thành công', 'data': result}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'message': 'Lỗi server khi xóa danh mục'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
