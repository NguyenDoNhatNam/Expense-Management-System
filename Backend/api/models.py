# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Accounts(models.Model):
    account_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    account_name = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    account_type = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    balance = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, db_collation='SQL_Latin1_General_CP1_CI_AS')
    bank_name = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    account_number = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    is_include_in_total = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'accounts'


class Budgets(models.Model):
    budget_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    category = models.ForeignKey('Categories', models.DO_NOTHING, blank=True, null=True)
    budget_name = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    period = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS')
    start_date = models.DateField()
    end_date = models.DateField()
    alert_threshold = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField()
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'budgets'


class Categories(models.Model):
    category_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    category_name = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    category_type = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS')
    icon = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    color = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    parent_category = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    is_default = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'categories'


class DebtPayment(models.Model):
    payment_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    debt = models.ForeignKey('Debts', models.DO_NOTHING)
    payment_amount = models.DecimalField(max_digits=18, decimal_places=2)
    payment_date = models.DateField(blank=True, null=True)
    note = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'debt_payment'


class Debts(models.Model):
    debt_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    debt_type = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    person_name = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=18, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    start_date = models.DateField()
    due_date = models.DateField()
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    status = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'debts'


class Notification(models.Model):
    notification_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    notification_type = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    title = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    message = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    is_read = models.BooleanField()
    related_id = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'notification'


class RecurringTransactions(models.Model):
    recurring_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    account = models.ForeignKey(Accounts, models.DO_NOTHING)
    category = models.ForeignKey(Categories, models.DO_NOTHING)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    transaction_type = models.CharField(max_length=500, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    frequency = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    start_date = models.DateField()
    end_date = models.DateField()
    next_occurrence_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'recurring_transactions'


class SavingsGoals(models.Model):
    goal_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    goal_name = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS')
    target_amount = models.DecimalField(max_digits=18, decimal_places=2)
    current_amount = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    target_date = models.DateField()
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    priority = models.CharField(max_length=30, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    status = models.CharField(max_length=30, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'savings_goals'


class SharedAccess(models.Model):
    share_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    owner = models.ForeignKey('Users', models.DO_NOTHING)
    shared_with_user = models.ForeignKey('Users', models.DO_NOTHING, related_name='sharedaccess_shared_with_user_set')
    permission_level = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'shared_access'


class Transactions(models.Model):
    transaction_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    account = models.ForeignKey(Accounts, models.DO_NOTHING)
    category = models.ForeignKey(Categories, models.DO_NOTHING)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    transaction_type = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS')
    transaction_date = models.DateTimeField()
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    note = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    location = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    receipt_image_url = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    is_recurring = models.BooleanField()
    recurring_id = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transactions'


class Transfers(models.Model):
    transfer_id = models.CharField(primary_key=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    from_account = models.ForeignKey(Accounts, models.DO_NOTHING)
    to_account = models.ForeignKey(Accounts, models.DO_NOTHING, related_name='transfers_to_account_set')
    amount = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    fee = models.DecimalField(max_digits=18, decimal_places=2, blank=True, null=True)
    transfer_date = models.DateField()
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transfers'


class UserSetting(models.Model):
    setting_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING)
    language = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    date_format = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    enable_notification = models.BooleanField(blank=True, null=True)
    budget_alert_enabled = models.BooleanField(blank=True, null=True)
    weekly_report_enabled = models.BooleanField(blank=True, null=True)
    monthly_report_enabled = models.BooleanField(blank=True, null=True)
    theme = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'user_setting'


class Users(models.Model):
    user_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    email = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    password = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    full_name = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    phone = models.CharField(max_length=30, db_collation='SQL_Latin1_General_CP1_CI_AS')
    avatar_url = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    default_currency = models.CharField(max_length=3, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    last_login = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'users'
