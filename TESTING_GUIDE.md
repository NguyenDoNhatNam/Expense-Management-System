# Hướng Dẫn Kiểm Thử Tính Năng Transactions

## Yêu Cầu Chuẩn Bị
1. Backend Django chạy trên `http://127.0.0.1:8000`
2. Frontend Next.js chạy trên `http://localhost:3000`
3. User đã đăng nhập
4. Có ít nhất 1 wallet/account
5. Có ít nhất 1 category trong hệ thống

## Test Cases

### 1. Load Danh Sách Giao Dịch

**Bước thực hiện**:
1. Đăng nhập vào ứng dụng
2. Chọn wallet/account
3. Vào trang "Transactions"
4. Chờ dữ liệu load từ server

**Kết quả mong đợi**:
- ✅ Thấy "Loading transactions..." trong lúc chờ
- ✅ Danh sách giao dịch từ backend hiển thị
- ✅ Pagination info hiển thị (ví dụ: "10 transactions found")
- ❌ Không có lỗi JavaScript trong console

**Debug nếu lỗi**:
```bash
# Kiểm tra backend endpoint
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8000/api/transactions/

# Kiểm tra network tab trong DevTools
# - Status: 200 OK
# - Response format đúng
```

---

### 2. Tạo Giao Dịch Mới

**Bước thực hiện**:
1. Vào trang Transactions
2. Click "+ Add Transaction"
3. Điền form:
   - Type: Expense
   - Category: Chọn một category
   - Amount: 100000
   - Description: "Test transaction"
   - Date: Today
4. Click "Add Transaction"

**Kết quả mong đợi**:
- ✅ Form đóng
- ✅ Giao dịch mới xuất hiện trong danh sách
- ✅ Wallet balance cập nhật (giảm đi khoản chi)
- ✅ Thông báo thành công

**Debug nếu lỗi**:
```javascript
// Kiểm tra console
// Error: "Số dư tài khoản không đủ"
//   → Wallet balance không đủ, cần top-up

// Error: "Danh mục không tồn tại"
//   → Category ID không hợp lệ

// Network error
//   → Backend không chạy hoặc token hết hạn
```

---

### 3. Upload Ảnh Hóa Đơn

**Bước thực hiện**:
1. Vào form tạo/sửa giao dịch
2. Click input file "Receipt Image"
3. Chọn file ảnh (JPG/PNG/WebP, < 5MB)
4. Chờ upload hoàn thành

**Kết quả mong đợi**:
- ✅ Ảnh preview hiển thị sau upload
- ✅ URL ảnh được lưu: `/media/receipts/USER-xxx/abc123.webp`
- ✅ Ảnh tự động resize và nén
- ❌ Không có lỗi "Lỗi khi upload ảnh"

**Debug nếu lỗi**:
```bash
# Kiểm tra file size
ls -lh your-image.jpg  # Phải < 5MB

# Kiểm tra format
file your-image.jpg    # Phải là JPEG/PNG/WebP

# Kiểm tra thư mục lưu trữ
ls -la Backend/media/receipts/
```

---

### 4. Cập Nhật Giao Dịch

**Bước thực hiện**:
1. Tìm giao dịch trong danh sách
2. Click "Edit"
3. Thay đổi:
   - Amount: tăng/giảm
   - Category: chọn category khác
   - Description: sửa
4. Click "Update Transaction"

**Kết quả mong đợi**:
- ✅ Giao dịch cập nhật trong danh sách
- ✅ Balance của cả tài khoản cũ & mới được điều chỉnh
- ✅ Category icon/name cập nhật

**Debug nếu lỗi**:
```javascript
// Error: "Số dư tài khoản không đủ sau khi cập nhật"
//   → Giảm amount hoặc chuyển sang tài khoản khác có balance

// Error: "Danh mục không tồn tại"
//   → Reload page để refresh category list
```

---

### 5. Xóa Giao Dịch

**Bước thực hiện**:
1. Tìm giao dịch trong danh sách
2. Click "Delete"
3. Xác nhận "Are you sure?"
4. Chờ xóa hoàn thành

**Kết quả mong đợi**:
- ✅ Giao dịch biến mất khỏi danh sách
- ✅ Wallet balance cập nhật (hoàn nguyên)
- ✅ Không có lỗi

**Debug nếu lỗi**:
```javascript
// Error: "Chỉ được phép xóa giao dịch trong vòng 30 ngày"
//   → Giao dịch > 30 ngày, không thể xóa
//   → Dùng admin panel để force delete

// Error: "Giao dịch không tồn tại hoặc đã bị xóa"
//   → Giao dịch đã bị xóa trước đó, reload danh sách
```

---

### 6. Tìm Kiếm & Lọc

**Test Search**:
1. Nhập vào input "Search transactions"
2. Gõ một phần description (ví dụ: "test")
3. Danh sách tự động lọc

**Test Filter by Type**:
1. Click dropdown "All Types"
2. Chọn "Income" hoặc "Expense"
3. Danh sách hiển thị chỉ loại đó

**Kết quả mong đợi**:
- ✅ Tìm kiếm real-time (không cần reload)
- ✅ Lọc hoạt động chính xác
- ✅ Kết hợp search + filter cùng lúc

---

### 7. Phân Trang (Nếu có nhiều giao dịch)

**Bước thực hiện**:
1. Backend trả về `page_size=10`
2. Nếu có > 10 giao dịch
3. Kiểm tra pagination info

**Kết quả mong đợi**:
- ✅ Thông báo "X transactions found"
- ✅ Nếu cần, thêm pagination UI (next/prev page)

---

## Kiểm Tra Kỹ Thuật

### Backend API Responses

```bash
# Lấy danh sách (200 OK)
curl -H "Authorization: Bearer TOKEN" \
  http://127.0.0.1:8000/api/transactions/

# Response example:
{
  "success": true,
  "message": "Lấy danh sách giao dịch thành công",
  "data": {
    "transactions": [
      {
        "transaction_id": "TR-abc123",
        "amount": "100000.00",
        "transaction_type": "expense",
        "transaction_date": "2024-01-15T10:30:00Z",
        "description": "Coffee",
        "category_name": "Food & Drinks",
        "category_icon": "🍔",
        "account_name": "Main Account",
        "receipt_image_url": "/media/receipts/USER-xxx/abc123.webp"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total_pages": 1,
      "total_items": 1,
      "has_next": false,
      "has_previous": false
    }
  }
}
```

### Frontend Console Logs

```javascript
// Kiểm tra trong DevTools Console

// 1. AppContext init
console.log('User:', currentUser)
console.log('Wallet:', currentWallet)
console.log('Transactions loaded:', transactions.length)

// 2. API call logs
// Nên thấy logs từ API layer nếu có

// 3. Error logs
// Không nên có lỗi undefined, null references
```

### Network Tab

| Request | Method | Status | Response Time |
|---------|--------|--------|---------------|
| `/api/transactions/` | GET | 200 | < 500ms |
| `/transactions/create/` | POST | 201 | < 500ms |
| `/transactions/update/ID/` | PUT | 200 | < 500ms |
| `/transactions/delete/ID/` | DELETE | 200 | < 500ms |
| `/receipts/upload-receipt/` | POST | 201 | < 1000ms |

---

## Troubleshooting

### Vấn đề: "Failed to fetch transactions"

**Nguyên nhân có thể**:
1. Backend không chạy
2. Token hết hạn
3. CORS policy bị từ chối

**Giải pháp**:
1. Kiểm tra backend chạy: `python manage.py runserver`
2. Kiểm tra token: `localStorage.access_token`
3. Kiểm tra CORS settings trong `settings.py`

---

### Vấn đề: "Ảnh không upload được"

**Nguyên nhân có thể**:
1. File > 5MB
2. Định dạng không hỗ trợ
3. Folder `/media/receipts/` không có quyền ghi

**Giải pháp**:
```bash
# 1. Check file size
du -h upload-file.jpg

# 2. Check format
file upload-file.jpg

# 3. Tạo folder & set permissions
mkdir -p Backend/media/receipts/
chmod 755 Backend/media/receipts/
```

---

### Vấn đề: "Transaction list không cập nhật sau khi tạo"

**Nguyên nhân có thể**:
1. `loadTransactions()` không được gọi
2. Response từ backend không chính xác
3. State update bị block

**Giải pháp**:
1. Thêm console.log trong `loadTransactions()`
2. Kiểm tra response format
3. Kiểm tra dependency array của useEffect

---

## Performance Tips

1. **Giảm API calls**: Thêm caching hoặc infinite scroll
2. **Tối ưu search**: Debounce input trước khi gọi API
3. **Lazy load images**: Preview ảnh hóa đơn chỉ khi hover
4. **Pagination**: Luôn sử dụng page_size hợp lý (10-50)

---

## Checklist Hoàn Thành

- [ ] Load danh sách giao dịch từ backend
- [ ] Tính năng tạo -> backend cập nhật -> list refresh
- [ ] Upload ảnh hóa đơn thành công
- [ ] Tính năng sửa -> backend cập nhật -> list refresh
- [ ] Tính năng xóa -> backend cập nhật -> list refresh
- [ ] Tìm kiếm & lọc hoạt động
- [ ] Error handling đầy đủ
- [ ] Wallet balance cập nhật đúng
- [ ] Performance tốt (< 500ms API response)
- [ ] Không có console errors
