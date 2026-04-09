from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import (
    budget_view, authentication_view, transaction_view, recepit_view, 
    categories_view, report_view, recurring_view, saving_goal_view, 
    debt_view, transfer_view, account_view, data_management_view,
    activity_log_view, admin_users_view
)
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

user = DefaultRouter()
user.register(r'auth', authentication_view.UserViewSet, basename='auth')
user.register(r'transactions', transaction_view.TransactionViewset, basename='transactions')
user.register(r'receipts', recepit_view.ReceiptUploadView, basename='receipts')
user.register(r'categories', categories_view.CategoryViewSet, basename='categories')
user.register(r'budgets', budget_view.BudgetViewSet, basename='budgets')
user.register(r'reports', report_view.ReportViewSet, basename='reports')
user.register(r'recurring', recurring_view.RecurringViewSet, basename='recurring')
user.register(r'savings', saving_goal_view.SavingGoalViewSet, basename='savings')
user.register(r'debts', debt_view.DebtViewSet, basename='debts')
user.register(r'transfers', transfer_view.TransferViewSet, basename='transfers')
user.register(r'accounts', account_view.AccountViewSet, basename='accounts')
user.register(r'users', admin_users_view.AdminUsersViewSet, basename='users')

user.register(r'exports', data_management_view.ExportViewSet, basename='exports')
user.register(r'imports', data_management_view.ImportViewSet, basename='imports')
user.register(r'backups', data_management_view.BackupViewSet, basename='backups')

# Admin Activity Log
user.register(r'activity-logs', activity_log_view.ActivityLogViewSet, basename='activity-logs')

urlpatterns = [
    path('' , include(user.urls)) , 
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]