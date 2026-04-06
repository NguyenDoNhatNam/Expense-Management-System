# Expense Management System - Backend

## Tổng quan

Backend API cho hệ thống quản lý chi tiêu cá nhân, được xây dựng với Django REST Framework.

### Tech Stack

- **Framework**: Django 5.2 + Django REST Framework
- **Database**: Microsoft SQL Server
- **Cache/Queue**: Redis
- **Task Queue**: Celery + Celery Beat
- **Authentication**: JWT (Simple JWT)
- **Documentation**: drf-spectacular (OpenAPI/Swagger)

## Cài đặt

### Yêu cầu

- Python 3.11+
- Redis Server
- Microsoft SQL Server (hoặc Azure SQL)
- ODBC Driver 17 for SQL Server

### Bước 1: Clone và cài đặt dependencies

```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Bước 2: Cấu hình môi trường

Tạo file `.env` hoặc thiết lập biến môi trường:

```bash
# Database
DATABASE_NAME=ExpenseManagementDB
DATABASE_USER=sa
DATABASE_PASSWORD=your_password
DATABASE_HOST=127.0.0.1

# Email (cho OTP)
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# Backup (tùy chọn - cho S3)
BACKUP_ENCRYPTION_KEY=your_32_byte_hex_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BACKUP_BUCKET=your_bucket_name
```

### Bước 3: Khởi tạo database

```bash
python manage.py migrate
```

### Bước 4: Chạy server

```bash
# Development server
python manage.py runserver

# Production (với Gunicorn)
gunicorn expense.wsgi:application
```

### Bước 5: Chạy Celery (cho async tasks)

```bash
# Terminal 1: Celery Worker
celery -A expense worker -l INFO

# Terminal 2: Celery Beat (scheduled tasks)
celery -A expense beat -l INFO
```

## API Documentation

Sau khi chạy server, truy cập:
- **Swagger UI**: http://localhost:8000/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

## Cấu trúc Project

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
| POST | `/auth/register/` | Đăng ký tài khoản |
| POST | `/auth/login/` | Đăng nhập |
| POST | `/auth/refresh/` | Refresh token |
| POST | `/auth/verify-activation/` | Xác thực OTP |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions/list/` | Danh sách giao dịch |
| POST | `/transactions/create/` | Tạo giao dịch |
| PUT | `/transactions/update/{id}/` | Cập nhật giao dịch |
| DELETE | `/transactions/delete/{id}/` | Xóa giao dịch |

### Export (MỚI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exports/transactions/` | Export transactions (CSV/Excel/PDF) |
| GET | `/exports/accounts/` | Export accounts |
| GET | `/exports/list/` | Danh sách file export |
| GET | `/exports/status/{task_id}/` | Kiểm tra async export |

### Import (MỚI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/imports/transactions/` | Import transactions từ CSV |
| GET | `/imports/template/` | Download CSV template |
| POST | `/imports/validate/` | Validate file trước import |

### Backup (MỚI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backups/create/` | Tạo backup |
| GET | `/backups/list/` | Danh sách backups |
| GET | `/backups/download/{filename}/` | Download backup |
| GET | `/backups/preview/{filename}/` | Preview backup metadata |

### Các endpoints khác
- `/accounts/` - Quản lý tài khoản
- `/categories/` - Quản lý danh mục
- `/budgets/` - Quản lý ngân sách
- `/debts/` - Quản lý công nợ
- `/savings/` - Mục tiêu tiết kiệm
- `/transfers/` - Chuyển khoản nội bộ
- `/recurring/` - Giao dịch định kỳ
- `/reports/` - Báo cáo thống kê

## Export/Import/Backup Guide

### Export dữ liệu

```bash
# Export transactions ra Excel
GET /exports/transactions/?format=excel&start_date=2024-01-01&end_date=2024-12-31

# Export ra CSV
GET /exports/transactions/?format=csv

# Export ra PDF
GET /exports/transactions/?format=pdf
```

**Async Export**: Với dữ liệu lớn (>1000 dòng), hệ thống tự động chuyển sang async. Response sẽ trả về `task_id` để kiểm tra tiến độ.

### Import transactions

```bash
# Download template
GET /imports/template/?type=transactions

# Validate trước khi import
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
100000,expense,2024-01-15,Ví tiền mặt,Ăn uống,Tiền ăn trưa,,Công ty
5000000,income,2024-01-01,Ngân hàng,Lương,Lương tháng 1,Đã nhận,
```

### Backup dữ liệu

```bash
# Tạo backup (sync)
POST /backups/create/
{
  "encrypt": true,
  "upload_s3": false
}

# Tạo backup (async)
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
| `process_recurring_transactions` | 00:00 daily | Tạo giao dịch định kỳ |
| `process_debt_reminders` | 08:00 daily | Nhắc nhở khoản nợ |
| `daily_backup_all_users` | 02:00 daily | Backup tự động hàng ngày |
| `cleanup_old_exports` | 03:00 daily | Xóa file export cũ (>24h) |
| `cleanup_old_backups` | 04:00 weekly | Xóa backup cũ |

## Logging

Logs được lưu trong thư mục `logs/`:
- `app.log`: Application logs
- `celery.log`: Celery task logs

Format log:
```
[2024-01-15 10:30:00] INFO api.services.export_service - [EXPORT] Excel exported: /media/exports/user123/transactions_20240115.xlsx (500 rows)
```

## Security

### JWT Configuration
- Access Token: 1 giờ
- Refresh Token: 7 ngày (90 ngày nếu Remember Me)
- Refresh Token được lưu trong HttpOnly cookie

### Backup Encryption
- AES-256-CBC encryption
- User-specific key derived từ master key
- Checksum SHA-256 để verify integrity

### Permissions
Hệ thống sử dụng Role-Based Access Control:
- `view_own_expense`: Xem dữ liệu cá nhân
- `create_expense`: Tạo giao dịch
- `edit_own_expense`: Sửa dữ liệu cá nhân
- `delete_own_expense`: Xóa dữ liệu cá nhân
- Admin roles có thêm quyền `view_all`, `edit_all`, `delete_all`

## Production Deployment

### Checklist

1. **Environment Variables**:
   - Đặt `DEBUG=False`
   - Đổi `SECRET_KEY`
   - Đặt `BACKUP_ENCRYPTION_KEY` riêng
   - Cấu hình AWS credentials nếu dùng S3

2. **Database**:
   - Sử dụng Azure SQL hoặc SQL Server production
   - Bật SSL connection

3. **Redis**:
   - Sử dụng Redis Cloud hoặc managed Redis
   - Bật authentication

4. **Static Files**:
   ```bash
   python manage.py collectstatic
   ```

5. **HTTPS**:
   - Cấu hình nginx với SSL
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

### Celery không chạy tasks
```bash
# Kiểm tra Redis connection
redis-cli ping

# Kiểm tra Celery worker
celery -A expense inspect active
```

### Export PDF lỗi
```bash
# WeasyPrint cần GTK3
# macOS:
brew install pango

# Ubuntu:
apt-get install libpango-1.0-0 libpangocairo-1.0-0
```

### Import CSV encoding lỗi
- File CSV phải là UTF-8 (có thể có BOM)
- Nếu từ Excel, lưu dạng "CSV UTF-8"

## Contributing

1. Fork repository
2. Tạo branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Tạo Pull Request

## License

MIT License
