# Expense Management System - Backend

## Overview

Backend API for the personal expense management system, built with Django REST Framework.

### Tech Stack

- **Framework**: Django 5.2 + Django REST Framework
- **Database**: Microsoft SQL Server
- **Cache/Queue**: Redis
- **Task Queue**: Celery + Celery Beat
- **Authentication**: JWT (Simple JWT)
- **Documentation**: drf-spectacular (OpenAPI/Swagger)

## Installation

### Requirements

- Python 3.11+
- Redis Server
- Microsoft SQL Server (or Azure SQL)
- ODBC Driver 17 for SQL Server

### Step 1: Clone and install dependencies

```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Configure environment

Create a `.env` file or set environment variables:

```bash
# Database
DATABASE_NAME=ExpenseManagementDB
DATABASE_USER=sa
DATABASE_PASSWORD=your_password
DATABASE_HOST=127.0.0.1

# Email (for OTP)
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# Backup (optional - for S3)
BACKUP_ENCRYPTION_KEY=your_32_byte_hex_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BACKUP_BUCKET=your_bucket_name
```

### Step 3: Initialize database

```bash
python manage.py migrate
```

### Step 4: Run server

```bash
# Development server
python manage.py runserver

# Production (with Gunicorn)
gunicorn expense.wsgi:application
```

### Step 5: Run Celery (for async tasks)

```bash
# Terminal 1: Celery Worker
celery -A expense worker -l INFO

# Terminal 2: Celery Beat (scheduled tasks)
celery -A expense beat -l INFO
```

## API Documentation

After running the server, visit:
- **Swagger UI**: http://localhost:8000/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## Project Structure

```
Backend/
├── api/
│   ├── models.py              # Database models
│   ├── urls.py                # API routes
│   ├── tasks.py               # Celery tasks
│   ├── authentication.py      # JWT authentication
│   ├── permissions/           # Permission classes
│   ├── serializers/           # Request/Response serializers
│   ├── services/              # Business logic layer
│   │   ├── account_service.py
│   │   ├── transaction_service.py
│   │   ├── budget_service.py
│   │   ├── export_service.py  # CSV/Excel/PDF export
│   │   ├── import_service.py  # CSV import
│   │   └── backup_service.py  # Backup & encryption
│   └── views/                 # API endpoints
│       ├── transaction_view.py
│       ├── data_management_view.py  # Export/Import/Backup
│       └── ...
├── expense/
│   ├── settings.py            # Django settings
│   ├── celery.py              # Celery configuration
│   └── urls.py                # Root URL config
├── templates/                 # Email templates
├── logs/                      # Application logs
└── requirements.txt
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register/` | Register account |
| POST | `/auth/login/` | Login |
| POST | `/auth/refresh/` | Refresh token |
| POST | `/auth/verify-activation/` | Verify OTP |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions/list/` | List transactions |
| POST | `/transactions/create/` | Create transaction |
| PUT | `/transactions/update/{id}/` | Update transaction |
| DELETE | `/transactions/delete/{id}/` | Delete transaction |

### Export (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exports/transactions/` | Export transactions (CSV/Excel/PDF) |
| GET | `/exports/accounts/` | Export accounts |
| GET | `/exports/list/` | List export files |
| GET | `/exports/status/{task_id}/` | Check async export status |

### Import (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/imports/transactions/` | Import transactions from CSV |
| GET | `/imports/template/` | Download CSV template |
| POST | `/imports/validate/` | Validate file before import |

### Backup (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backups/create/` | Create backup |
| GET | `/backups/list/` | List backups |
| GET | `/backups/download/{filename}/` | Download backup |
| GET | `/backups/preview/{filename}/` | Preview backup metadata |

### Other endpoints
- `/accounts/` - Account management
- `/categories/` - Category management
- `/budgets/` - Budget management
- `/debts/` - Debt management
- `/savings/` - Savings goals
- `/transfers/` - Internal transfers
- `/recurring/` - Recurring transactions
- `/reports/` - Statistical reports

## Export/Import/Backup Guide

### Export data

```bash
# Export transactions ra Excel
GET /exports/transactions/?format=excel&start_date=2024-01-01&end_date=2024-12-31

# Export ra CSV
GET /exports/transactions/?format=csv

# Export ra PDF
GET /exports/transactions/?format=pdf
```

**Async Export**: For large data (>1000 rows), the system automatically switches to async. Response will return a `task_id` to check progress.

### Import transactions

```bash
# Download template
GET /imports/template/?type=transactions

# Validate before import
POST /imports/validate/
Content-Type: multipart/form-data
file: transactions.csv

# Import
POST /imports/transactions/
Content-Type: multipart/form-data
file: transactions.csv
```

**CSV Format**:
```csv
amount,transaction_type,transaction_date,account_name,category_name,description,note,location
100000,expense,2024-01-15,Cash wallet,Food & Dining,Lunch,,Office
5000000,income,2024-01-01,Bank,Salary,January salary,Received,
```

### Backup data

```bash
# Create backup (sync)
POST /backups/create/
{
  "encrypt": true,
  "upload_s3": false
}

# Create backup (async)
POST /backups/create/
{
  "async": true,
  "encrypt": true
}

# Download backup
GET /backups/download/{filename}/
```

## Scheduled Tasks (Celery Beat)

| Task | Schedule | Description |
|------|----------|-------------|
| `process_recurring_transactions` | 00:00 daily | Create recurring transactions |
| `process_debt_reminders` | 08:00 daily | Debt reminders |
| `daily_backup_all_users` | 02:00 daily | Automatic daily backup |
| `cleanup_old_exports` | 03:00 daily | Delete old export files (>24h) |
| `cleanup_old_backups` | 04:00 weekly | Delete old backups |

## Logging

Logs are saved in the `logs/` directory:
- `app.log`: Application logs
- `celery.log`: Celery task logs

Format log:
```
[2024-01-15 10:30:00] INFO api.services.export_service - [EXPORT] Excel exported: /media/exports/user123/transactions_20240115.xlsx (500 rows)
```

## Security

### JWT Configuration
- Access Token: 1 hour
- Refresh Token: 7 days (90 days if Remember Me)
- Refresh Token is stored in HttpOnly cookie

### Backup Encryption
- AES-256-CBC encryption
- User-specific key derived from master key
- Checksum SHA-256 to verify integrity

### Permissions
The system uses Role-Based Access Control:
- `view_own_expense`: View personal data
- `create_expense`: Create transactions
- `edit_own_expense`: Edit personal data
- `delete_own_expense`: Delete personal data
- Admin roles have additional `view_all`, `edit_all`, `delete_all` permissions

## Production Deployment

### Checklist

1. **Environment Variables**:
   - Set `DEBUG=False`
   - Change `SECRET_KEY`
   - Set a separate `BACKUP_ENCRYPTION_KEY`
   - Configure AWS credentials if using S3

2. **Database**:
   - Use Azure SQL or production SQL Server
   - Enable SSL connection

3. **Redis**:
   - Use Redis Cloud or managed Redis
   - Enable authentication

4. **Static Files**:
   ```bash
   python manage.py collectstatic
   ```

5. **HTTPS**:
   - Configure nginx with SSL
   - Set `SECURE_SSL_REDIRECT = True`

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "expense.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## Troubleshooting

### Celery not running tasks
```bash
# Check Redis connection
redis-cli ping

# Check Celery worker
celery -A expense inspect active
```

### Export PDF errors
```bash
# WeasyPrint requires GTK3
# macOS:
brew install pango

# Ubuntu:
apt-get install libpango-1.0-0 libpangocairo-1.0-0
```

### Import CSV encoding errors
- CSV file must be UTF-8 (may include BOM)
- If from Excel, save as "CSV UTF-8"

## Contributing

1. Fork repository
2. Create branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Create Pull Request

## License

MIT License
