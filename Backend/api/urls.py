from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import authentication_view , transaction_view , recepit_view
user = DefaultRouter()
user.register(r'auth', authentication_view.UserViewSet, basename='auth')
user.register(r'transactions', transaction_view.TransactionViewset, basename='transactions')
user.register(r'receipts', recepit_view.ReceiptUploadView, basename='receipts')


urlpatterns = [
    path('' , include(user.urls)) , 
]