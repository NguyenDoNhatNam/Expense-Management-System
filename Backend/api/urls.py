from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import authentication_view , transaction_view , recepit_view
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
user = DefaultRouter()
user.register(r'auth', authentication_view.UserViewSet, basename='auth')
user.register(r'transactions', transaction_view.TransactionViewset, basename='transactions')
user.register(r'receipts', recepit_view.ReceiptUploadView, basename='receipts')


urlpatterns = [
    path('' , include(user.urls)) , 
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]