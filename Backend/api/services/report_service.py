from django.db.models import Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.core.cache import cache
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from api.models import Transactions
import hashlib
import json

class ReportService:

    @staticmethod
    def get_dashboard_report(user, start_date_str, end_date_str, keyword=None):
        now = timezone.now().date()
        
        # Xử lý chuỗi ngày tháng, mặc định là tháng hiện tại nếu không truyền
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            start_date = now.replace(day=1)
            end_date = (start_date + relativedelta(months=1)) - timedelta(days=1)

        # 1. Xác định thời gian Cache
        current_month_start = now.replace(day=1)
        last_month_start = current_month_start - relativedelta(months=1)

        if end_date >= current_month_start:
            cache_timeout = 300  # Tháng hiện tại: 5 phút
        elif end_date >= last_month_start:
            cache_timeout = 3600  # Tháng trước: 1 giờ
        else:
            cache_timeout = 86400  # Cũ hơn: 24 giờ

        # 2. Tạo Cache Key (Hash để tránh key quá dài hoặc có ký tự đặc biệt)
        raw_key = f"report_{user.user_id}_{start_date}_{end_date}_{keyword or ''}"
        cache_key = hashlib.md5(raw_key.encode('utf-8')).hexdigest()

        # Kiểm tra Cache
        cached_data = cache.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

        # 3. Query Động cho kỳ hiện tại
        transactions = Transactions.objects.filter(
            user=user,
            is_deleted=False,
            transaction_date__date__gte=start_date,
            transaction_date__date__lte=end_date
        )

        if keyword:
            transactions = transactions.filter(
                Q(description__icontains=keyword) | Q(note__icontains=keyword)
            )

        # A. TỔNG QUAN (Overview)
        current_income = transactions.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0
        current_expense = transactions.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0
        current_balance = current_income - current_expense

        # B. SO SÁNH KỲ TRƯỚC ( so sánh với kỳ trước cùng độ dài)
        duration = (end_date - start_date).days + 1
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=duration - 1)

        prev_transactions = Transactions.objects.filter(
            user=user,
            is_deleted=False,
            transaction_date__date__gte=prev_start_date,
            transaction_date__date__lte=prev_end_date
        )

        if keyword:
            prev_transactions = prev_transactions.filter(
                Q(description__icontains=keyword) | Q(note__icontains=keyword)
            )

        prev_income = prev_transactions.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0
        prev_expense = prev_transactions.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0

        def calculate_change(current, prev):
            if prev == 0:
                return 100.0 if current > 0 else 0.0
            return float(round(((current - prev) / prev) * 100, 2))

        # C. THEO DANH MỤC (Pie Chart)
        category_stats = transactions.values(
            'category__category_name', 'category__color', 'transaction_type'
        ).annotate(total=Sum('amount')).order_by('-total')

        category_data = {
            'income': [],
            'expense': []
        }
        
        for stat in category_stats:
            cat_type = stat['transaction_type']
            amount = float(stat['total'])
            total_ref = current_income if cat_type == 'income' else current_expense
            percentage = round((amount / float(total_ref)) * 100, 2) if total_ref > 0 else 0

            item = {
                'name': stat['category__category_name'],
                'color': stat['category__color'],
                'value': amount,
                'percentage': percentage
            }
            if cat_type == 'income':
                category_data['income'].append(item)
            elif cat_type == 'expense':
                category_data['expense'].append(item)

        # D. THEO THỜI GIAN (Line/Bar Chart)
        # Group by TruncDate (Ngày)
        time_stats = transactions.annotate(date=TruncDate('transaction_date')).values('date', 'transaction_type').annotate(total=Sum('amount')).order_by('date')
        
        chart_data_map = {}
        for stat in time_stats:
            date_str = stat['date'].strftime('%Y-%m-%d')
            if date_str not in chart_data_map:
                chart_data_map[date_str] = {'date': date_str, 'income': 0, 'expense': 0}
            
            if stat['transaction_type'] == 'income':
                chart_data_map[date_str]['income'] = float(stat['total'])
            elif stat['transaction_type'] == 'expense':
                chart_data_map[date_str]['expense'] = float(stat['total'])

        time_chart_data = list(chart_data_map.values())

        # 4. Gom Data & Lưu Cache
        report_result = {
            'overview': {
                'income': float(current_income),
                'expense': float(current_expense),
                'balance': float(current_balance),
                'changes': {
                    'income_percentage': calculate_change(float(current_income), float(prev_income)),
                    'expense_percentage': calculate_change(float(current_expense), float(prev_expense))
                }
            },
            'categories': category_data,
            'trends': time_chart_data,
            'metadata': {
                'cached': True,
                'generated_at': now.strftime('%Y-%m-%d %H:%M:%S')
            }
        }
        cache.set(cache_key, json.dumps(report_result), timeout=cache_timeout)
        report_result['metadata']['cached'] = False  
        return report_result