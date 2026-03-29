from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import budget_view , authentication_view , transaction_view , recepit_view , categories_view, report_view
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
user = DefaultRouter()
user.register(r'auth', authentication_view.UserViewSet, basename='auth')
user.register(r'transactions', transaction_view.TransactionViewset, basename='transactions')
user.register(r'receipts', recepit_view.ReceiptUploadView, basename='receipts')
user.register(r'categories', categories_view.CategoryViewSet, basename='categories')
user.register(r'budgets', budget_view.BudgetViewSet, basename='budgets')
user.register(r'reports', report_view.ReportViewSet, basename='reports')

urlpatterns = [
    path('' , include(user.urls)) , 
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]