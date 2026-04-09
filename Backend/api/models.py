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


class ActivityLogs(models.Model):
    activity_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    user = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True)
    action = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    level = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    details = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    entity_type = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    entity_id = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    old_values = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    new_values = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    ip_address = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    user_agent = models.CharField(max_length=500, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    device = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    browser = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    os = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    current_page = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    status = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    error_message = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'activity_logs'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150, db_collation='SQL_Latin1_General_CP1_CI_AS')

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128, db_collation='SQL_Latin1_General_CP1_CI_AS')
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150, db_collation='SQL_Latin1_General_CP1_CI_AS')
    first_name = models.CharField(max_length=150, db_collation='SQL_Latin1_General_CP1_CI_AS')
    last_name = models.CharField(max_length=150, db_collation='SQL_Latin1_General_CP1_CI_AS')
    email = models.CharField(max_length=254, db_collation='SQL_Latin1_General_CP1_CI_AS')
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


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
    is_deleted = models.BooleanField()
    deleted_at = models.DateTimeField(blank=True, null=True)

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


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    object_repr = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS')
    action_flag = models.SmallIntegerField()
    change_message = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoCeleryBeatClockedschedule(models.Model):
    clocked_time = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_celery_beat_clockedschedule'


class DjangoCeleryBeatCrontabschedule(models.Model):
    minute = models.CharField(max_length=240, db_collation='SQL_Latin1_General_CP1_CI_AS')
    hour = models.CharField(max_length=96, db_collation='SQL_Latin1_General_CP1_CI_AS')
    day_of_week = models.CharField(max_length=64, db_collation='SQL_Latin1_General_CP1_CI_AS')
    day_of_month = models.CharField(max_length=124, db_collation='SQL_Latin1_General_CP1_CI_AS')
    month_of_year = models.CharField(max_length=64, db_collation='SQL_Latin1_General_CP1_CI_AS')
    timezone = models.CharField(max_length=63, db_collation='SQL_Latin1_General_CP1_CI_AS')

    class Meta:
        managed = False
        db_table = 'django_celery_beat_crontabschedule'


class DjangoCeleryBeatIntervalschedule(models.Model):
    every = models.IntegerField()
    period = models.CharField(max_length=24, db_collation='SQL_Latin1_General_CP1_CI_AS')

    class Meta:
        managed = False
        db_table = 'django_celery_beat_intervalschedule'


class DjangoCeleryBeatPeriodictask(models.Model):
    name = models.CharField(unique=True, max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS')
    task = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS')
    args = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    kwargs = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    queue = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    exchange = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    routing_key = models.CharField(max_length=200, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    expires = models.DateTimeField(blank=True, null=True)
    enabled = models.BooleanField()
    last_run_at = models.DateTimeField(blank=True, null=True)
    total_run_count = models.IntegerField()
    date_changed = models.DateTimeField()
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    crontab = models.ForeignKey(DjangoCeleryBeatCrontabschedule, models.DO_NOTHING, blank=True, null=True)
    interval = models.ForeignKey(DjangoCeleryBeatIntervalschedule, models.DO_NOTHING, blank=True, null=True)
    solar = models.ForeignKey('DjangoCeleryBeatSolarschedule', models.DO_NOTHING, blank=True, null=True)
    one_off = models.BooleanField()
    start_time = models.DateTimeField(blank=True, null=True)
    priority = models.IntegerField(blank=True, null=True)
    headers = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    clocked = models.ForeignKey(DjangoCeleryBeatClockedschedule, models.DO_NOTHING, blank=True, null=True)
    expire_seconds = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_periodictask'


class DjangoCeleryBeatPeriodictasks(models.Model):
    ident = models.SmallIntegerField(primary_key=True)
    last_update = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_celery_beat_periodictasks'


class DjangoCeleryBeatSolarschedule(models.Model):
    event = models.CharField(max_length=24, db_collation='SQL_Latin1_General_CP1_CI_AS')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    class Meta:
        managed = False
        db_table = 'django_celery_beat_solarschedule'
        unique_together = (('event', 'latitude', 'longitude'),)


class DjangoCeleryResultsChordcounter(models.Model):
    group_id = models.CharField(unique=True, max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    sub_tasks = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    count = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'django_celery_results_chordcounter'


class DjangoCeleryResultsGroupresult(models.Model):
    group_id = models.CharField(unique=True, max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    date_created = models.DateTimeField()
    date_done = models.DateTimeField()
    content_type = models.CharField(max_length=128, db_collation='SQL_Latin1_General_CP1_CI_AS')
    content_encoding = models.CharField(max_length=64, db_collation='SQL_Latin1_General_CP1_CI_AS')
    result = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_results_groupresult'


class DjangoCeleryResultsTaskresult(models.Model):
    task_id = models.CharField(unique=True, max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    status = models.CharField(max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    content_type = models.CharField(max_length=128, db_collation='SQL_Latin1_General_CP1_CI_AS')
    content_encoding = models.CharField(max_length=64, db_collation='SQL_Latin1_General_CP1_CI_AS')
    result = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    date_done = models.DateTimeField()
    traceback = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    meta = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    task_args = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    task_kwargs = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    task_name = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    worker = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    date_created = models.DateTimeField()
    periodic_task_name = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    date_started = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'django_celery_results_taskresult'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    model = models.CharField(max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    app = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    name = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40, db_collation='SQL_Latin1_General_CP1_CI_AS')
    session_data = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS')
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class EmailVerificationTokens(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey('Users', models.DO_NOTHING)
    token = models.CharField(unique=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    token_type = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS')
    is_used = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'email_verification_tokens'


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


class OtpCodes(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey('Users', models.DO_NOTHING)
    code = models.CharField(max_length=6, db_collation='SQL_Latin1_General_CP1_CI_AS')
    otp_type = models.CharField(max_length=20, db_collation='SQL_Latin1_General_CP1_CI_AS')
    is_used = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'otp_codes'


class Permissions(models.Model):
    permission_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    permission_name = models.CharField(unique=True, max_length=100, db_collation='SQL_Latin1_General_CP1_CI_AS')
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)  # This field type is a guess.

    class Meta:
        managed = False
        db_table = 'permissions'


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


class RefreshTokens(models.Model):
    id = models.BigAutoField(primary_key=True)
    token = models.CharField(unique=True, max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    replaced_by_token = models.CharField(max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    ip_address = models.CharField(max_length=45, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    user_agent = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'refresh_tokens'


class RememberTokens(models.Model):
    id = models.BigAutoField(primary_key=True)
    token_hash = models.CharField(unique=True, max_length=255, db_collation='SQL_Latin1_General_CP1_CI_AS')
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    ip_address = models.CharField(max_length=45, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    user_agent = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'remember_tokens'


class RolePermissions(models.Model):
    pk = models.CompositePrimaryKey('role_id', 'permission_id')
    role = models.ForeignKey('Roles', models.DO_NOTHING)
    permission = models.ForeignKey(Permissions, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'role_permissions'


class Roles(models.Model):
    role_id = models.CharField(primary_key=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    role_name = models.CharField(unique=True, max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    description = models.TextField(db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)  # This field type is a guess.

    class Meta:
        managed = False
        db_table = 'roles'


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
    category = models.ForeignKey(Categories, models.DO_NOTHING , related_name='transactions')
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
    is_deleted = models.BooleanField()
    deleted_at = models.DateTimeField(blank=True, null=True)

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
    role = models.ForeignKey(Roles, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'
