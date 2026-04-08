from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class CustomPagination(PageNumberPagination):
    # Customize URL parameters
    page_query_param = 'p'
    page_size_query_param = 'ipp'
    
    # Default configuration
    page_size = 10
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'message': 'List retrieved successfully',
            'data': {
                'items': data,
                'pagination': {
                    'total_items': self.page.paginator.count,
                    'total_pages': self.page.paginator.num_pages,
                    'current_page': self.page.number,
                    'items_per_page': self.get_page_size(self.request),
                    'has_next': self.page.has_next(),
                    'has_previous': self.page.has_previous(),
                }
            }
        })