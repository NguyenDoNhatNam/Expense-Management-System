ALTER TABLE transactions ADD is_deleted BIT DEFAULT 0 NOT NULL;
ALTER TABLE transactions ADD deleted_at DATETIME NULL;
GO
-- Roles table
CREATE TABLE roles (
    role_id VARCHAR(50) NOT NULL ,
    role_name VARCHAR(50) NOT NULL UNIQUE, -- 'user', 'admin', 'super_admin'
    description TEXT

    CONSTRAINT pk_roles PRIMARY KEY (role_id)
);

GO
-- Permissions table
CREATE TABLE permissions (
    permission_id VARCHAR(50) NOT NULL ,
    permission_name VARCHAR(100) NOT NULL UNIQUE, -- 'view_users', 'edit_transaction', etc
    description TEXT,
    CONSTRAINT pk_permissions PRIMARY KEY (permission_id)
);
GO
-- Role_Permissions table (assign permissions to roles)
CREATE TABLE role_permissions (
    role_id VARCHAR(50) NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);

GO
-- Add role_id to users table
ALTER TABLE users ADD COLUMN role_id DEFAULT 'user';
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(role_id);

GO

INSERT INTO roles (role_id, role_name, description) VALUES
('1', 'user', 'Regular user - Can manage personal expenses'),
('2', 'admin', 'Administrator - Manage users and view consolidated reports'),
('3', 'super_admin', 'Super administrator - Full system management privileges');


-- 2. INSERT PERMISSIONS DATA
-- =============================================

-- Expense-related permissions
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('1', 'create_expense', 'Create new expense'),
('2', 'view_own_expense', 'View own expenses'),
('3', 'edit_own_expense', 'Edit own expenses'),
('4', 'delete_own_expense', 'Delete own expenses'),
('5', 'view_all_expenses', 'View all users expenses'),
('6', 'edit_all_expenses', 'Edit any user expenses'),
('7', 'delete_all_expenses', 'Delete any user expenses');

-- Category-related permissions
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('8', 'create_category', 'Create new expense category'),
('9', 'view_own_category', 'View own categories'),
('10', 'edit_own_category', 'Edit own categories'),
('11', 'delete_own_category', 'Delete own categories'),
('12', 'manage_default_categories', 'Manage system default categories');

-- Budget-related permissions
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('13', 'create_budget', 'Create new budget'),
('14', 'view_own_budget', 'View own budgets'),
('15', 'edit_own_budget', 'Edit own budgets'),
('16', 'delete_own_budget', 'Delete own budgets');

-- Report-related permissions
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('17', 'view_own_report', 'View own expense reports'),
('18', 'export_own_report', 'Export own reports'),
('19', 'view_all_reports', 'View consolidated reports of all users'),
('20', 'export_all_reports', 'Export system consolidated reports');

-- User-related permissions
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('21', 'view_own_profile', 'View own profile'),
('22', 'edit_own_profile', 'Edit own profile'),
('23', 'change_own_password', 'Change own password'),
('24', 'view_all_users', 'View all users list'),
('25', 'edit_all_users', 'Edit any user information'),
('26', 'delete_users', 'Delete users'),
('27', 'change_user_role', 'Change user roles');

-- System-related permissions
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('28', 'view_system_settings', 'View system settings'),
('29', 'edit_system_settings', 'Edit system settings'),
('30', 'view_system_logs', 'View system logs'),
('31', 'manage_roles', 'Manage roles'),
('32', 'manage_permissions', 'Manage permissions');


-- 3. INSERT ROLE_PERMISSIONS DATA (assign permissions to roles)
-- =============================================

-- Permissions for USER (role_id = 1)
-- User can manage own expenses, categories, budgets and reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Expenses
('1', '1'),   -- create_expense
('1', '2'),   -- view_own_expense
('1', '3'),   -- edit_own_expense
('1', '4'),   -- delete_own_expense
-- Categories
('1', '8'   ),   -- create_category
('1', '9'),   -- view_own_category
('1', '10'),  -- edit_own_category
('1', '11'),  -- delete_own_category
-- Budgets
('1', '13'),  -- create_budget
('1', '14'),  -- view_own_budget
('1', '15'),  -- edit_own_budget
('1', '16'),  -- delete_own_budget
-- Reports
('1', '17'),  -- view_own_report
('1', '18'),  -- export_own_report
-- Profile
('1', '21'),  -- view_own_profile
('1', '22'),  -- edit_own_profile
('1', '23');  -- change_own_password


-- Permissions for ADMIN (role_id = 2)
-- Admin has all User permissions + user management + consolidated reports
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Expenses (own)
('2', '1'),   -- create_expense
('2', '2'),   -- view_own_expense
('2', '3'),   -- edit_own_expense
('2', '4'),   -- delete_own_expense
-- Expenses (all)
('2', '5'),   -- view_all_expenses
('2', '6'),   -- edit_all_expenses
('2', '7'),   -- delete_all_expenses
-- Categories
('2', '8'),   -- create_category
('2', '9'),   -- view_own_category
('2', '10'),  -- edit_own_category
('2', '11'),  -- delete_own_category
('2', '12'),  -- manage_default_categories
-- Budgets
('2', '13'),  -- create_budget
('2', '14'),  -- view_own_budget
('2', '15'),  -- edit_own_budget
('2', '16'),  -- delete_own_budget
-- Reports
('2', '17'),  -- view_own_report
('2', '18'),  -- export_own_report
('2', '19'),  -- view_all_reports
('2', '20'  ),  -- export_all_reports
-- Profile & Users
('2', '21'),  -- view_own_profile
('2', '22'),  -- edit_own_profile
('2', '23'),  -- change_own_password
('2', '24'),  -- view_all_users
('2', '25'),  -- edit_all_users
-- System
('2', '28');  -- view_system_settings


-- Permissions for SUPER_ADMIN (role_id = 3)
-- Super Admin has FULL PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Expenses
('3', '1'),   -- create_expense
('3', '2'),   -- view_own_expense
('3', '3'),   -- edit_own_expense
('3', '4'),   -- delete_own_expense
('3', '5'),   -- view_all_expenses
('3', '6'),   -- edit_all_expenses
('3', '7'),   -- delete_all_expenses
-- Categories
('3', '8'),   -- create_category
('3', '9'),   -- view_own_category
('3', '10'),  -- edit_own_category
('3', '11'),  -- delete_own_category
('3', '12'),  -- manage_default_categories
-- Budgets
('3', '13'),  -- create_budget
('3', '14'),  -- view_own_budget
('3', '15'),  -- edit_own_budget
('3', '16'),  -- delete_own_budget
-- Reports
('3', '17'),  -- view_own_report
('3', '18'),  -- export_own_report
('3', '19'),  -- view_all_reports
('3', '20'),  -- export_all_reports
-- Users
('3', '21'),  -- view_own_profile
('3', '22'),  -- edit_own_profile
('3', '23'),  -- change_own_password
('3', '24'),  -- view_all_users
('3', '25'),  -- edit_all_users
('3', '26'),  -- delete_users
('3', '27'),  -- change_user_role
-- System
('3', '28'),  -- view_system_settings
('3', '29'),  -- edit_system_settings
('3', '30'),  -- view_system_logs
('3', '31'),  -- manage_roles
('3', '32');  -- manage_permissions


-- 4. UPDATE DEFAULT ROLE FOR EXISTING USERS (if needed)
-- =============================================
-- Set all existing users to 'user' role (role_id = 1)
UPDATE users SET role_id = 1 WHERE role_id IS NULL;

-- OTP Codes table
CREATE TABLE otp_codes (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    user_id VARCHAR(50) NOT NULL,
    code VARCHAR(6) NOT NULL,
    otp_type VARCHAR(20) NOT NULL,           -- activation, reset_password, login
    is_used BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT check_otp_type CHECK (otp_type IN ('activation', 'reset_password', 'login'))
);

-- Email Verification Token table
CREATE TABLE email_verification_tokens (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    user_id VARCHAR(50) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL,
    is_used BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    expires_at DATETIME NOT NULL,
    CONSTRAINT fk_email_token_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT check_token_type CHECK (token_type IN ('activation', 'reset_password', 'login'))
);

-- Index for fast query
CREATE INDEX idx_otp_user_type ON otp_codes(user_id, otp_type, is_used);
CREATE INDEX idx_email_token_user ON email_verification_tokens(user_id, token_type, is_used);

GO
-- =============================================
-- ACTIVITY_LOGS TABLE - Track user activities
-- =============================================
CREATE TABLE activity_logs (
    activity_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NULL,
    
    -- Action info
    action VARCHAR(100) NOT NULL,           -- LOGIN_SUCCESS, CREATE_TRANSACTION, VIEW_BUDGET, etc.
    level VARCHAR(20) DEFAULT 'INFO',       -- INFO, ACTION, WARNING, ERROR
    details NVARCHAR(MAX) NULL,             -- Action details
    
    -- Entity tracking (to track changes on which entity)
    entity_type VARCHAR(50) NULL,           -- transaction, account, budget, etc.
    entity_id VARCHAR(50) NULL,             -- ID of affected entity
    old_values NVARCHAR(MAX) NULL,          -- JSON containing old values
    new_values NVARCHAR(MAX) NULL,          -- JSON containing new values
    
    -- Request context
    ip_address VARCHAR(50) NULL,
    user_agent VARCHAR(500) NULL,
    device VARCHAR(100) NULL,               -- Desktop, Mobile, Tablet
    browser VARCHAR(100) NULL,              -- Chrome 128, Firefox 120, etc.
    os VARCHAR(100) NULL,                   -- Windows 11, macOS, iOS, etc.
    current_page VARCHAR(255) NULL,         -- URL/path being accessed
    
    -- Status
    status VARCHAR(20) DEFAULT 'success',   -- success, failed
    error_message NVARCHAR(MAX) NULL,
    
    -- Timestamp
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT pk_activity_logs PRIMARY KEY (activity_id),
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

GO
-- Index for fast query by user and time
CREATE INDEX idx_activity_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_level ON activity_logs(level, created_at DESC);
CREATE INDEX idx_activity_action ON activity_logs(action, created_at DESC);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

GO
-- Add permissions for activity logs
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('33', 'view_activity_logs', 'View user activity logs'),
('34', 'export_activity_logs', 'Export activity logs');

GO
-- Assign permissions to admin and super_admin
INSERT INTO role_permissions (role_id, permission_id) VALUES
('2', '33'),  -- admin can view activity logs
('2', '34'),  -- admin can export activity logs
('3', '33'),  -- super_admin can view activity logs
('3', '34');  -- super_admin can export activity logs