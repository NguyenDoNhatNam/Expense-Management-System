from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import authentication_view 
user = DefaultRouter()
user.register(r'auth', authentication_view.UserViewSet, basename='auth')


urlpatterns = [
    path('' , include(user.urls)) , 
]