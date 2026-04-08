"""
Import Service - Handle importing data from files
Supports: CSV import with validation
Integrated with batch processing and error reporting
"""
import os
import csv
import json
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Any, Optional, Tuple
from uuid import uuid4

from django.conf import settings
from django.utils import timezone
from django.db import transaction as db_transaction

from api.models import Transactions, Accounts, Categories, Users

logger = logging.getLogger(__name__)


class ImportValidationError(Exception):
    """Exception for validation errors during import"""
    def __init__(self, row_number: int, field: str, message: str):
        self.row_number = row_number
        self.field = field
        self.message = message
        super().__init__(f"Row {row_number}, {field}: {message}")


class ImportService:
    """
    Service for handling data import with features:
    - CSV import for transactions
    - Comprehensive row-by-row validation
    - Batch processing with rollback
    - Detailed error reporting
    """
    
    IMPORT_DIR = os.path.join(settings.MEDIA_ROOT, 'imports')
    
    # Import transactions configuration
    TRANSACTION_REQUIRED_FIELDS = ['amount', 'transaction_type', 'transaction_date', 'account_name', 'category_name']
    TRANSACTION_OPTIONAL_FIELDS = ['description', 'note', 'location']
    
    TRANSACTION_TYPE_MAPPING = {
        'income': 'income',
        'thu nhập': 'income',
        'thu': 'income',
        'expense': 'expense',
        'chi tiêu': 'expense',
        'chi': 'expense',
    }
    
    MAX_BATCH_SIZE = 500  # Maximum rows processed per batch
    
    # ==================== MAIN IMPORT METHODS ====================
    
    @classmethod
    def import_transactions_from_csv(cls, file, user) -> Dict[str, Any]:
        """
        Import transactions from CSV file.
        
        CSV format expected:
        amount,transaction_type,transaction_date,account_name,category_name,description,note,location
        
        Returns: {
            'success': bool,
            'total_rows': int,
            'imported': int,
            'failed': int,
            'errors': List[Dict],
            'warnings': List[str],
        }
        """
        result = {
            'success': False,
            'total_rows': 0,
            'imported': 0,
            'failed': 0,
            'errors': [],
            'warnings': [],
            'created_transactions': [],
        }
        
        try:
            # Read and decode file
            content = file.read()
            
            # Try different encodings
            for encoding in ['utf-8-sig', 'utf-8', 'cp1252', 'latin-1']:
                try:
                    decoded_content = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("Cannot read file. Please use UTF-8 encoding.")
            
            # Parse CSV
            reader = csv.DictReader(decoded_content.splitlines())
            rows = list(reader)
            result['total_rows'] = len(rows)
            
            if result['total_rows'] == 0:
                result['warnings'].append("CSV file is empty or has no valid data")
                return result
            
            # Validate headers
            headers = reader.fieldnames or []
            missing_required = set(cls.TRANSACTION_REQUIRED_FIELDS) - set(headers)
            if missing_required:
                # Try to find equivalent Vietnamese headers
                header_mapping = cls._get_header_mapping(headers)
                if header_mapping:
                    rows = cls._remap_headers(rows, header_mapping)
                else:
                    raise ValueError(f"Missing required columns: {', '.join(missing_required)}")
            
            # Pre-fetch user's accounts and categories to optimize
            user_accounts = {acc.account_name.lower(): acc for acc in Accounts.objects.filter(user=user)}
            user_categories = {}
            for cat in Categories.objects.filter(user=user, is_deleted=False):
                key = f"{cat.category_name.lower()}_{cat.category_type}"
                user_categories[key] = cat
            
            # Process each batch
            validated_rows = []
            for idx, row in enumerate(rows, start=2):  # Start from 2 since row 1 is header
                try:
                    validated = cls._validate_transaction_row(
                        row, idx, user, user_accounts, user_categories
                    )
                    validated_rows.append(validated)
                except ImportValidationError as e:
                    result['failed'] += 1
                    result['errors'].append({
                        'row': e.row_number,
                        'field': e.field,
                        'message': e.message,
                        'data': row,
                    })
                except Exception as e:
                    result['failed'] += 1
                    result['errors'].append({
                        'row': idx,
                        'field': 'unknown',
                        'message': str(e),
                        'data': row,
                    })
            
            # Insert validated rows trong transaction
            if validated_rows:
                created_ids = cls._batch_insert_transactions(validated_rows, user)
                result['imported'] = len(created_ids)
                result['created_transactions'] = created_ids
            
            # Check results
            result['success'] = result['imported'] > 0
            
            # Add warning if there are errors
            if result['failed'] > 0:
                result['warnings'].append(
                    f"{result['failed']} rows could not be imported due to validation errors"
                )
            
            logger.info(
                f"[IMPORT] User {user.user_id}: {result['imported']}/{result['total_rows']} "
                f"transactions imported, {result['failed']} failed"
            )
            
        except Exception as e:
            logger.error(f"[IMPORT] Error importing CSV: {str(e)}", exc_info=True)
            result['errors'].append({
                'row': 0,
                'field': 'file',
                'message': str(e),
            })
        
        return result

    # ==================== VALIDATION METHODS ====================
    
    @classmethod
    def _validate_transaction_row(cls, row: Dict, row_num: int, user, 
                                   accounts_cache: Dict, categories_cache: Dict) -> Dict:
        """
        Validate a transaction row.
        Throws ImportValidationError if invalid.
        Returns: Validated data dict ready for insertion
        """
        validated = {}
        
        # 1. Validate amount
        amount_str = str(row.get('amount', '')).strip().replace(',', '.')
        try:
            amount = Decimal(amount_str)
            if amount <= 0:
                raise ImportValidationError(row_num, 'amount', 'Amount must be greater than 0')
            validated['amount'] = amount
        except (InvalidOperation, ValueError):
            raise ImportValidationError(row_num, 'amount', f'Invalid amount: "{amount_str}"')
        
        # 2. Validate transaction_type
        trans_type_raw = str(row.get('transaction_type', '')).strip().lower()
        trans_type = cls.TRANSACTION_TYPE_MAPPING.get(trans_type_raw)
        if not trans_type:
            raise ImportValidationError(
                row_num, 'transaction_type', 
                f'Invalid transaction type: "{trans_type_raw}". Accepted: income, expense'
            )
        validated['transaction_type'] = trans_type
        
        # 3. Validate transaction_date
        date_str = str(row.get('transaction_date', '')).strip()
        trans_date = cls._parse_date(date_str)
        if not trans_date:
            raise ImportValidationError(
                row_num, 'transaction_date', 
                f'Invalid date: "{date_str}". Format: YYYY-MM-DD or DD/MM/YYYY'
            )
        validated['transaction_date'] = trans_date
        
        # 4. Validate account
        account_name = str(row.get('account_name', '')).strip().lower()
        account = accounts_cache.get(account_name)
        if not account:
            raise ImportValidationError(
                row_num, 'account_name', 
                f'Account "{row.get("account_name")}" does not exist'
            )
        validated['account'] = account
        
        # 5. Validate category
        category_name = str(row.get('category_name', '')).strip().lower()
        category_key = f"{category_name}_{trans_type}"
        category = categories_cache.get(category_key)
        
        # Try to find category regardless of type
        if not category:
            for key, cat in categories_cache.items():
                if key.startswith(category_name):
                    if cat.category_type == trans_type:
                        category = cat
                        break
        
        if not category:
            raise ImportValidationError(
                row_num, 'category_name', 
                f'Category "{row.get("category_name")}" of type "{trans_type}" does not exist'
            )
        validated['category'] = category
        
        # 6. Optional fields
        validated['description'] = str(row.get('description', '')).strip()[:500]
        validated['note'] = str(row.get('note', '')).strip()[:500]
        validated['location'] = str(row.get('location', '')).strip()[:255]
        
        # 7. Validate balance (expense should not exceed account balance)
        # Only warn, don't block since user may want to import historical data
        if trans_type == 'expense' and amount > account.balance:
            validated['_warning'] = f'Expense amount ({amount}) exceeds account balance ({account.balance})'
        
        return validated

    @classmethod
    def _parse_date(cls, date_str: str) -> Optional[datetime]:
        """Parse date string with multiple formats"""
        formats = [
            '%Y-%m-%d',
            '%Y-%m-%d %H:%M:%S',
            '%d/%m/%Y',
            '%d/%m/%Y %H:%M:%S',
            '%d-%m-%Y',
            '%m/%d/%Y',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return timezone.make_aware(dt)
            except ValueError:
                continue
        
        return None

    @classmethod
    def _get_header_mapping(cls, headers: List[str]) -> Optional[Dict[str, str]]:
        """
        Map Vietnamese headers to English headers.
        Returns None if mapping is not possible.
        """
        vn_to_en = {
            'số tiền': 'amount',
            'so tien': 'amount',
            'loại': 'transaction_type',
            'loai': 'transaction_type',
            'loại giao dịch': 'transaction_type',
            'ngày': 'transaction_date',
            'ngay': 'transaction_date',
            'ngày giao dịch': 'transaction_date',
            'tài khoản': 'account_name',
            'tai khoan': 'account_name',
            'tên tài khoản': 'account_name',
            'danh mục': 'category_name',
            'danh muc': 'category_name',
            'mô tả': 'description',
            'mo ta': 'description',
            'ghi chú': 'note',
            'ghi chu': 'note',
            'địa điểm': 'location',
            'dia diem': 'location',
        }
        
        mapping = {}
        headers_lower = [h.lower().strip() for h in headers]
        
        for vn, en in vn_to_en.items():
            for idx, h in enumerate(headers_lower):
                if vn in h or h in vn:
                    mapping[headers[idx]] = en
                    break
        
        # Check if all required fields are covered
        mapped_values = set(mapping.values())
        if set(cls.TRANSACTION_REQUIRED_FIELDS).issubset(mapped_values):
            return mapping
        
        return None

    @classmethod
    def _remap_headers(cls, rows: List[Dict], mapping: Dict[str, str]) -> List[Dict]:
        """Remap headers trong rows theo mapping"""
        remapped = []
        for row in rows:
            new_row = {}
            for old_key, value in row.items():
                new_key = mapping.get(old_key, old_key)
                new_row[new_key] = value
            remapped.append(new_row)
        return remapped

    # ==================== DATABASE OPERATIONS ====================
    
    @classmethod
    def _batch_insert_transactions(cls, validated_rows: List[Dict], user) -> List[str]:
        """
        Batch insert transactions with atomic transaction.
        Updates account balances accordingly.
        """
        created_ids = []
        now = timezone.now()
        
        # Group by account to update balance efficiently
        account_deltas = {}  # account_id -> delta
        
        with db_transaction.atomic():
            for row in validated_rows:
                trans_id = f'TR-{str(uuid4())[:15]}'
                
                # Calculate delta for account
                account_id = row['account'].account_id
                delta = row['amount'] if row['transaction_type'] == 'income' else -row['amount']
                account_deltas[account_id] = account_deltas.get(account_id, Decimal('0')) + delta
                
                # Create transaction
                Transactions.objects.create(
                    transaction_id=trans_id,
                    user=user,
                    account=row['account'],
                    category=row['category'],
                    amount=row['amount'],
                    transaction_type=row['transaction_type'],
                    transaction_date=row['transaction_date'],
                    description=row.get('description', '') or 'Imported from CSV',
                    note=row.get('note', '') or 'Imported via bulk import',
                    location=row.get('location', ''),
                    receipt_image_url='',
                    is_recurring=False,
                    is_deleted=False,
                    created_at=now,
                    updated_at=now,
                )
                created_ids.append(trans_id)
            
            # Update account balances
            for account_id, delta in account_deltas.items():
                account = Accounts.objects.select_for_update().get(account_id=account_id)
                account.balance += delta
                account.updated_at = now
                account.save()
        
        logger.info(f"[IMPORT] Batch inserted {len(created_ids)} transactions")
        return created_ids

    # ==================== TEMPLATE METHODS ====================
    
    @classmethod
    def get_import_template_csv(cls, template_type: str = 'transactions') -> str:
        """
        Create CSV template for import.
        Returns: CSV content string
        """
        if template_type == 'transactions':
            headers = cls.TRANSACTION_REQUIRED_FIELDS + cls.TRANSACTION_OPTIONAL_FIELDS
            headers_vn = ['Amount', 'Type (income/expense)', 'Transaction Date', 
                         'Account Name', 'Category Name', 'Description', 'Note', 'Location']
            
            sample_data = [
                ['100000', 'expense', '2024-01-15', 'Cash Wallet', 'Food & Dining', 'Lunch', '', 'Office'],
                ['5000000', 'income', '2024-01-01', 'Bank', 'Salary', 'January salary', 'Received', ''],
            ]
            
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)  # English headers
            writer.writerow(['# ' + ', '.join(headers_vn)])  # Vietnamese guide (comment)
            for row in sample_data:
                writer.writerow(row)
            
            return output.getvalue()
        
        raise ValueError(f"Template type '{template_type}' is not supported")

    @classmethod
    def validate_import_file(cls, file) -> Dict[str, Any]:
        """
        Pre-validate file before import (check format, size, etc.)
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'preview': [],
        }
        
        # Check file size (max 10MB)
        if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
            result['valid'] = False
            result['errors'].append('File is too large (max 10MB)')
            return result
        
        # Check extension
        filename = getattr(file, 'name', '')
        if not filename.lower().endswith('.csv'):
            result['valid'] = False
            result['errors'].append('Only CSV files are supported')
            return result
        
        # Try to read and preview
        try:
            content = file.read()
            file.seek(0)  # Reset for actual import
            
            decoded = content.decode('utf-8-sig')
            reader = csv.DictReader(decoded.splitlines())
            rows = list(reader)
            
            if not rows:
                result['valid'] = False
                result['errors'].append('File is empty')
                return result
            
            # Preview first 5 rows
            result['preview'] = rows[:5]
            result['total_rows'] = len(rows)
            result['headers'] = reader.fieldnames
            
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f'Cannot read file: {str(e)}')
        
        return result


# Import this for CSV string IO
import io
