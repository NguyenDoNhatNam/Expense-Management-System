# Quick Reference - Transaction API Integration

## File Changes Summary

### Backend ✅

1. **`Backend/api/views/transaction_view.py`**
   - ✅ Added `list()` method for GET /api/transactions/
   - Supports pagination, filtering, search

2. **`Backend/api/serializers/transaction_serializer.py`**
   - ✅ Added `TransactionListSerializer` class
   - Returns formatted transaction data with related fields

### Frontend ✅

1. **`my-expense-app/lib/api/transactions.ts`** (NEW FILE)
   - ✅ API client functions for transactions
   - Handles: GET, POST, PUT, DELETE, restore, upload receipt

2. **`my-expense-app/lib/AppContext.tsx`**
   - ✅ Updated `addTransaction()` to call API
   - ✅ Updated `updateTransaction()` to call API
   - ✅ Updated `deleteTransaction()` to call API
   - ✅ Added `loadTransactions()` function
   - ✅ Added `uploadReceipt()` function
   - ✅ Auto-load transactions on mount

3. **`my-expense-app/components/forms/TransactionForm.tsx`**
   - ✅ Updated file upload to use API
   - ✅ Saves server URL instead of local blob

4. **`my-expense-app/components/pages/TransactionsPage.tsx`**
   - ✅ Added loading state
   - ✅ Added auto-refresh on wallet change
   - ✅ Improved delete confirmation

---

## API Endpoints

### Transactions

```
GET    /api/transactions/
       Query: ?page=1&page_size=10&type=expense&search=

POST   /api/transactions/create/
       Body: { account_id, category_id, amount, transaction_type, ... }

PUT    /api/transactions/update/{transaction_id}/
       Body: { amount, category_id, ... }

DELETE /api/transactions/delete/{transaction_id}/?hard_delete=false

POST   /api/transactions/restore/{transaction_id}/
```

### Receipts

```
POST   /api/receipts/upload-receipt/
       Body: FormData { file }
       Response: { receipt_image_url: "/media/receipts/..." }
```

---

## Components Usage

### TransactionsPage
```tsx
export default function TransactionsPage() {
  const { 
    transactions,        // From context/API
    loadTransactions,    // To load from API
    deleteTransaction,   // Calls API + refresh
    ...
  } = useApp();
}
```

### TransactionForm
```tsx
<TransactionForm
  editingId={txId}
  onClose={handleClose}
/>
// Calls: addTransaction(), updateTransaction(), uploadReceipt()
```

---

## Data Flow

### Load Transactions
```
Component Mount
  → useEffect([currentWallet])
    → loadTransactions()
      → getTransactionsApi()
        → API GET /api/transactions/
          → Response: { transactions[], pagination }
            → Map to frontend format
              → setTransactions(state)
                → UI updates
```

### Create Transaction
```
User Submit Form
  → addTransaction(data)
    → createTransactionApi(payload)
      → API POST /api/transactions/create/
        → Response: { success, updated_balance }
          → loadTransactions() [auto-refresh]
            → getTransactionsApi()
              → setTransactions(state)
                → UI updates
```

### Delete Transaction
```
User Click Delete + Confirm
  → deleteTransaction(id)
    → deleteTransactionApi(id)
      → API DELETE /api/transactions/delete/{id}/
        → Response: { success, updated_balance }
          → loadTransactions() [auto-refresh]
            → UI updates
```

### Upload Receipt
```
User Select File
  → uploadReceipt(file)
    → uploadReceiptApi(file)
      → API POST /api/receipts/upload-receipt/
        → Response: { receipt_image_url }
          → setFormData(attachmentUrl)
            → Form state updated
```

---

## Key Features

### ✅ Pagination
- Page size: 10 (configurable)
- Has next/previous indicators
- Total count

### ✅ Filtering
- By type (income/expense/transfer)
- By date range
- By category
- By account

### ✅ Search
- Description, note, location
- Real-time (client-side local filtering)

### ✅ Image Upload
- Max 5MB
- Formats: JPG, PNG, WebP
- Auto resize & compress
- Server storage at `/media/receipts/`

### ✅ Auto Refresh
- After create/update/delete
- Loads fresh data from API

### ✅ Loading States
- While fetching from API
- Clear user feedback

---

## Error Handling

### API Errors
```typescript
try {
  await addTransaction(data);
} catch (error) {
  console.error('Error:', error);
  alert('Failed to create transaction');
}
```

### Validation Errors
```typescript
// Backend returns:
{
  success: false,
  message: 'Insufficient account balance',
  errors: { ... }
}
```

### Network Errors
```typescript
// Auto-handled by axios interceptor
// 401 → redirect to login
// 4xx/5xx → error response
```

---

## Testing Commands

### Backend
```bash
# Test list endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://127.0.0.1:8000/api/transactions/

# Test with filters
curl -H "Authorization: Bearer TOKEN" \
  "http://127.0.0.1:8000/api/transactions/?page=1&type=expense&search=coffee"
```

### Frontend (Browser Console)
```javascript
// Check context
useApp()  // access all functions

// Manual API call
getTransactionsApi({ page: 1 })

// Check state
console.log({ transactions, loading })
```

---

## Environment Setup

```env
# Frontend
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api

# Backend
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# CORS (if needed)
CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000'
]
```

---

## Browser DevTools Checklist

- [ ] Network tab: All API calls < 500ms
- [ ] Console: No errors or warnings
- [ ] Application > LocalStorage: token exists
- [ ] Redux DevTools: State updates properly
- [ ] Performance: No memory leaks

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "No transactions found" | API returns empty | Check database, add test data |
| Upload fails | File > 5MB | Reduce file size |
| Balance not updating | `loadTransactions()` not called | Check useEffect dependencies |
| 401 Unauthorized | Token expired | User needs to re-login |
| CORS error | Backend CORS not configured | Check CORS_ALLOWED_ORIGINS |

---

## Next Steps

1. **Test all features** using TESTING_GUIDE.md
2. **Monitor Performance** (Network tab, Lighthouse)
3. **Add Error Toast Notifications** (better UX than alerts)
4. **Implement Pagination UI** (if >10 transactions)
5. **Add Caching** (reduce API calls)
6. **Real-time Updates** (WebSocket for collaborative features)

---

## Documentation Files

- 📄 **TRANSACTION_UPDATE_SUMMARY.md** - Detailed changes
- 📄 **TESTING_GUIDE.md** - Test cases & troubleshooting  
- 📄 **QUICK_REFERENCE.md** - This file
