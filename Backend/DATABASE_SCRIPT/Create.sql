USE master;
GO
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'ExpenseManagementDB')
BEGIN
    -- set database to single user mode để drop nó --
    ALTER DATABASE ExpenseManagementDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ExpenseManagementDB;
END
GO

-- Tạo database expensemanagement --
CREATE DATABASE ExpenseManagementDB;
GO

--- Kiểm tra xem database đã được tạo chưa ---
USE ExpenseManagementDB;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('shared_access') AND type in (N'U'))
DROP TABLE shared_access;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('user_setting') AND type in (N'U'))
DROP TABLE user_setting ;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('notification') AND type in (N'U'))
DROP TABLE notification;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('debt_payment') AND type in (N'U'))
DROP TABLE debt_payment;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('savings_goals') AND type in (N'U'))
DROP TABLE savings_goals;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('transactions') AND type in (N'U'))
DROP TABLE transactions;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('recurring_transactions') AND type in (N'U'))
DROP TABLE recurring_transactions;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('budgets') AND type in (N'U'))
DROP TABLE budgets;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('transfers') AND type in (N'U'))
DROP TABLE transfers;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('debts') AND type in (N'U'))
DROP TABLE debts;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('categories') AND type in (N'U'))
DROP TABLE categories;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('accounts') AND type in (N'U'))
DROP TABLE accounts;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('users') AND type in (N'U'))
DROP TABLE users;
GO


--- Tạo bảng ----


--- Tạo bảng User ( đăng nhập ) ---

CREATE TABLE users(
    user_id VARCHAR(50) NOT NULL ,
    email VARCHAR(100) NOT NULL ,
    password VARCHAR(100) NOT NULL ,
    full_name NVARCHAR(100) NOT NULL ,
    phone VARCHAR(30) NOT NULL ,
    avatar_url VARCHAR(255),
    default_currency VARCHAR(3) DEFAULT 'VND' ,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME DEFAULT GETDATE() ,
    is_active BIT NOT NULL DEFAULT 1 ,
    CONSTRAINT pk_user PRIMARY KEY (user_id)
)
GO

--- Tạo bảng account ( tài khoản ) , quản lý các ví / tài khoản tài chính của ngừoi dùng ----
CREATE TABLE accounts(
    account_id VARCHAR(50) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    account_name NVARCHAR(255) NOT NULL ,
    account_type VARCHAR(50) NOT NULL ,
    balance DECIMAL(18,2) DEFAULT 0 ,
    currency VARCHAR(3) NOT NULL ,
    bank_name NVARCHAR(100) ,
    account_number VARCHAR(50) ,
    description NVARCHAR(MAX) ,
    is_include_in_total BIT ,
    created_at DATETIME DEFAULT GETDATE() ,
    updated_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_account PRIMARY KEY (account_id),
    CONSTRAINT fk_account FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT check_account_type CHECK (account_type IN ('cash', 'bank', 'credit_card', 'e_wallet', 'investment'))
)
GO

--- Tạo bảng categories(danh mục thu chi ) ----
CREATE TABLE categories(
    category_id VARCHAR(50) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    category_name NVARCHAR(100) NOT NULL ,
    category_type VARCHAR(20) NOT NULL ,
    icon VARCHAR(100) ,
    color VARCHAR(100) ,
    parent_category_id VARCHAR(50) ,
    created_at DATETIME DEFAULT GETDATE(),
    is_default BIT NOT NULL DEFAULT 1 ,
    CONSTRAINT pk_category PRIMARY KEY (category_id) ,
    CONSTRAINT fk_categoy_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE NO ACTION ,
    CONSTRAINT check_cateogry_type CHECK (category_type IN ('income', 'expense'))
)
GO

--- Tạo bảng budgets : ngân sách ---
CREATE TABLE budgets(
    budget_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    category_id VARCHAR(50) NULL ,
    budget_name VARCHAR(100) NOT NULL ,
    amount DECIMAL(18,2) NOT NULL ,
    period VARCHAR(20) NOT NULL ,
    start_date DATE NOT NULL ,
    end_date DATE NOT NULL ,
    alert_threshold INT DEFAULT 80 ,
    is_active BIT NOT NULL DEFAULT 1 ,
    created_at DATETIME DEFAULT GETDATE() ,
    updated_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_budget PRIMARY KEY (budget_id),
    CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT fk_budget_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE NO ACTION ,
    CONSTRAINT check_budget_period CHECK (period IN ('daily' , 'weekly' ,'monthly' , 'yearly'))
)
GO

--- Tạo bảng recurring transactions ( giao dịch định kì ) -----
CREATE TABLE recurring_transactions(
    recurring_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    account_id VARCHAR(50) NOT NULL ,
    category_id VARCHAR(50) NOT NULL ,
    amount DECIMAL(18,2) NOT NULL ,
    transaction_type VARCHAR(500) ,
    description NVARCHAR(MAX) ,
    frequency VARCHAR(50) NOT NULL ,
    start_date DATE NOT NULL ,
    end_date DATE NOT NULL ,
    next_occurrence_date DATE ,
    is_active BIT NOT NULL DEFAULT 1 ,
    created_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_recurring_id PRIMARY KEY (recurring_id) ,
    CONSTRAINT fk_recurring_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT fk_recurring_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE NO ACTION ,
    CONSTRAINT fk_recurring_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE NO ACTION ,
    CONSTRAINT check_recurring_transaction_type CHECK (transaction_type IN ('income' , 'expense')) ,
    CONSTRAINT check_frequency CHECK (frequency IN ('daily' , 'weekly' , 'monthly' , 'yearly'))
)
GO

--- Tạo bảng transaction ( lưu trữ lịch sử giao dịch )
CREATE TABLE transactions(
    transaction_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    account_id VARCHAR(50) NOT NULL ,
    category_id VARCHAR(50) NOT NULL ,
    amount DECIMAL(18,2) NOT NULL ,
    transaction_type VARCHAR(20) NOT NULL ,
    transaction_date DATETIME NOT NULL ,
    description NVARCHAR(MAX),
    note NVARCHAR(MAX) ,
    location NVARCHAR(255) ,
    receipt_image_url VARCHAR(255) ,
    is_recurring BIT NOT NULL DEFAULT 0 ,
    recurring_id VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE() ,
    updated_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_transaction PRIMARY KEY (transaction_id),
    CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT fk_transaction_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE NO ACTION ,
    CONSTRAINT fk_transaction_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE NO ACTION ,
    CONSTRAINT check_trans_type CHECK (transaction_type IN ('income' , 'expense' , 'transfer'))
)
GO


--- TẠO BẢNG TRANSFER ( chuyển khoản giữa các tài khoản ) ----
CREATE TABLE transfers(
    transfer_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    from_account_id VARCHAR(50) NOT NULL ,
    to_account_id VARCHAR(50) NOT NULL ,
    amount DECIMAL(18,2),
    fee DECIMAL(18,2) ,
    transfer_date DATE NOT NULL ,
    description NVARCHAR(MAX) ,
    created_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_transfer PRIMARY KEY (transfer_id) ,
    CONSTRAINT fk_transfer_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT fk_transfer_from_account FOREIGN KEY (from_account_id) REFERENCES accounts(account_id) ON DELETE NO ACTION ,
    CONSTRAINT fk_transfer_to_account FOREIGN KEY (to_account_id) REFERENCES accounts(account_id) ON DELETE NO ACTION
)
GO


----- TẠO BẢNG DEBTS ( QUẢN LÝ KHOẢN NỢ) QUẢN LÝ CÁC KHOẢN NỢ ( VAY HOẶC CHO VAY ) -----
CREATE TABLE debts(
    debt_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    debt_type VARCHAR(50) ,
    person_name NVARCHAR(200),
    amount DECIMAL(18,2) NOT NULL ,
    remaining_amount DECIMAL(18,2) NOT NULL ,
    interest_rate DECIMAL(5,2),
    start_date DATE NOT NULL ,
    due_date DATE NOT NULL ,
    description NVARCHAR(MAX) ,
    status VARCHAR(50) NOT NULL DEFAULT 'active' ,
    created_at DATETIME DEFAULT GETDATE() ,
    updated_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_debt PRIMARY KEY (debt_id) ,
    CONSTRAINT fk_debt_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT check_debt_type CHECK (debt_type IN ('lend' , 'borrow')) ,
    CONSTRAINT check_debt_status CHECK (status IN ('active', 'completed', 'overdue'))
)
GO

---- tạo bảng debt_payment ( lịch sử thanh toán khoản nợ ) ----
CREATE TABLE debt_payment(
    payment_id VARCHAR(100) NOT NULL ,
    debt_id VARCHAR(100) NOT NULL ,
    payment_amount DECIMAL(18,2) NOT NULL ,
    payment_date DATE ,
    note NVARCHAR(MAX) ,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT pk_payment PRIMARY KEY (payment_id),
    CONSTRAINT fk_payment_debt FOREIGN KEY (debt_id) REFERENCES debts(debt_id) ON DELETE CASCADE
)
GO


---  TẠO BẢNG SAVING GOALS ( MỤC TIÊU TIẾT KIỆM ) ----
CREATE TABLE savings_goals(
    goal_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    goal_name NVARCHAR(200) NOT NULL ,
    target_amount DECIMAL(18,2) NOT NULL ,
    current_amount DECIMAL(18,2) DEFAULT 0 ,
    target_date DATE NOT NULL ,
    description NVARCHAR(MAX) ,
    priority VARCHAR(30) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'active' ,
    created_at DATETIME DEFAULT GETDATE() ,
    updated_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_goal PRIMARY KEY (goal_id) ,
    CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ,
    CONSTRAINT check_priority CHECK (priority IN ('low' , 'medium' , 'high')),
    CONSTRAINT check_goal_status CHECK (status IN ('active', 'completed', 'cancelled'))
)
GO

--- Tạo bảng notification ----
CREATE TABLE notification(
    notification_id VARCHAR(100) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    notification_type VARCHAR(50) NOT NULL ,
    title NVARCHAR(200) ,
    message NVARCHAR(MAX),
    is_read BIT NOT NULL DEFAULT 0 ,
    related_id VARCHAR(100) ,
    created_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_notification PRIMARY KEY (notification_id) ,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)
GO

--- Tạo bảng user_setting ( cai dat nguoi dung ) ----
CREATE TABLE user_setting (
    setting_id VARCHAR(50) NOT NULL ,
    user_id VARCHAR(50) NOT NULL ,
    language VARCHAR(50) ,
    date_format VARCHAR(50) ,
    enable_notification BIT DEFAULT 1 ,
    budget_alert_enabled BIT DEFAULT 1 ,
    weekly_report_enabled BIT DEFAULT 1 ,
    monthly_report_enabled BIT DEFAULT 1 ,
    theme VARCHAR(50) ,
    created_at DATETIME DEFAULT GETDATE() ,
    updated_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_setting PRIMARY KEY (setting_id) ,
    CONSTRAINT fk_setting_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)
GO


CREATE TABLE shared_access
(
    share_id VARCHAR(100) NOT NULL ,
    owner_id VARCHAR(50) NOT NULL ,
    shared_with_user_id VARCHAR(50) NOT NULL ,
    permission_level VARCHAR(50) ,
    created_at DATETIME DEFAULT GETDATE() ,
    CONSTRAINT pk_share PRIMARY KEY (share_id) ,
    CONSTRAINT fk_share_owner FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE NO ACTION ,
    CONSTRAINT fk_share_user FOREIGN KEY (shared_with_user_id) REFERENCES users(user_id) ON DELETE NO ACTION ,
    CONSTRAINT check_permission_level CHECK (permission_level IN ('view' ,'edit'))
)
GO

---- TẠO INDEXES -----

CREATE NONCLUSTERED INDEX ix_user_email
ON users(email);
GO

CREATE NONCLUSTERED INDEX ix_account_user
ON accounts(user_id);
GO

CREATE NONCLUSTERED INDEX ix_account_user_type_currency
ON accounts(user_id, account_type, currency)
INCLUDE (balance , account_name);
GO

CREATE NONCLUSTERED INDEX ix_categories_user_id_type
ON categories(user_id , category_type);
GO

--- Tạo index cho transaction ---

CREATE NONCLUSTERED INDEX ix_transaction_user_id_date
ON transactions(user_id , transaction_date DESC)
INCLUDE (amount , transaction_type , category_id , account_id , description);
GO

CREATE NONCLUSTERED INDEX ix_transactions_account_id_date
ON transactions(account_id , transaction_date DESC)
INCLUDE (amount , transaction_type , user_id , category_id);
GO

CREATE NONCLUSTERED INDEX ix_transactions_category_id_date
ON transactions(category_id , transaction_date)
INCLUDE (amount , transaction_type , user_id , account_id);
GO

CREATE NONCLUSTERED INDEX ix_transaction_type_date_user
ON transactions(transaction_type , transaction_date DESC)
INCLUDE (user_id, amount , account_id, category_id);
GO

-- Filtered index nếu muốn tối ưu hơn
CREATE NONCLUSTERED INDEX IX_transactions_type_date_user_filtered
ON transactions(transaction_type, transaction_date DESC)
INCLUDE (user_id, amount, account_id, category_id)
WHERE is_recurring = 0;
GO

-- transfers
CREATE NONCLUSTERED INDEX IX_transfers_user_id_date
ON transfers(user_id, transfer_date DESC)
INCLUDE (from_account_id, to_account_id, amount);
GO

CREATE NONCLUSTERED INDEX IX_transfers_from_account_date
ON transfers(from_account_id, transfer_date DESC);
GO

-- budgets
CREATE NONCLUSTERED INDEX IX_budgets_user_id_period
ON budgets(user_id, period, start_date, end_date)
INCLUDE (category_id, amount, budget_name);
GO

-- recurring_transactions
CREATE NONCLUSTERED INDEX IX_recurring_user_next_date
ON recurring_transactions(user_id, next_occurrence_date)
INCLUDE (account_id, category_id, amount, frequency, is_active)
WHERE is_active = 1;
GO

-- debts
CREATE NONCLUSTERED INDEX IX_debts_user_id_status_due
ON debts(user_id, status, due_date)
INCLUDE (debt_type, person_name, remaining_amount, amount);
GO

-- debt_payments
CREATE NONCLUSTERED INDEX IX_debt_payments_debt_id_date
ON debt_payment(debt_id, payment_date DESC);
GO

-- savings_goals
CREATE NONCLUSTERED INDEX IX_savings_goals_user_id_status_target
ON savings_goals(user_id, status, target_date)
INCLUDE (goal_name, target_amount, current_amount);
GO

-- notification
CREATE NONCLUSTERED INDEX IX_notifications_user_read_date
ON notification(user_id, is_read, created_at DESC)
INCLUDE (notification_type, title, related_id);
GO

-- user_setting & shared_access
CREATE NONCLUSTERED INDEX IX_user_setting_user
ON user_setting(user_id);
GO

CREATE NONCLUSTERED INDEX IX_shared_access_owner
ON shared_access(owner_id);
GO

CREATE NONCLUSTERED INDEX IX_shared_access_shared_with
ON shared_access(shared_with_user_id);
GO