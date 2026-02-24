from django.shortcuts import render
from rest_framework import viewsets
from api.serializers.authentication_serializer import UserSerializer , UserRegistrationSerializer , UserLoginSerializer , AccountSerializer , CategorySerializer , UserSettingSerializer
from api.models import Users
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action , permission_classes 
from api.authentication import get_tokens_for_user
from rest_framework.permissions import AllowAny , IsAuthenticated
from django.utils import timezone
# Create your views here.


class UserViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False , methods=['post'] , url_path='register')
    def user_registration(self ,request , *args , **kwargs):
        serializer = UserRegistrationSerializer(data = request.data)
        if serializer.is_valid(raise_exception = True):
            user = serializer.save()
            token = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'status': '201 Created' , 
                'data' : {
                    'user': user_data , 
                    'account': AccountSerializer(user.default_account).data,
                    'categories': CategorySerializer(user.default_categories, many=True).data,
                    'setting': UserSettingSerializer(user.default_setting).data,
                    'access_token' : token['access'], 
                    'refresh_token' : token['refresh'] ,
                },
                'message': 'Tài khoản đã được tạo thành công'
            }, status = status.HTTP_201_CREATED)
        return Response({
            'status' : '400 Bad Request' ,
            'error' : serializer.errors , 
            'message' : 'Đăng ký thất bại'
        }, status = status.HTTP_400_BAD_REQUEST)
    

    @action(detail=False , methods= ['post'] , url_path='login')
    def user_login(self , request , *args , **kwargs):
        serializer = UserLoginSerializer(data = request.data)
        if serializer.is_valid(raise_exception = True):
            user = serializer.validated_data['user']
            user.last_login = timezone.now() 
            user.save(update_fields=['last_login'])
            token = get_tokens_for_user(user)
            user_data = UserSerializer(user).data

            return Response({
                'status': '200 OK' , 
                'data' : {
                    'user' : user_data ,
                    'access_token': token['access'],
                    'access_token' : token['access'],
                    'refresh_token': token['refresh'] ,
                } , 
                'message' : 'Đăng nhập thành công'
            } , status = status.HTTP_200_OK)
        
        return Response({
            'status' : '400 Bad Request' ,
            'error' : serializer.errors ,
            'message' : 'Đăng nhập thất bại'
        } , status = status.HTTP_400_BAD_REQUEST)
        
