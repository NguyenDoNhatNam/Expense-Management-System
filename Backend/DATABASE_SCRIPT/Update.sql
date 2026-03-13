ALTER TABLE transactions ADD is_deleted BIT DEFAULT 0 NOT NULL;
ALTER TABLE transactions ADD deleted_at DATETIME NULL;

-- Bảng Roles (Vai trò)
CREATE TABLE roles (
    role_id VARCHAR(50) NOT NULL ,
    role_name VARCHAR(50) NOT NULL UNIQUE, -- 'user', 'admin', 'super_admin'
    description TEXT

    CONSTRAINT pk_roles PRIMARY KEY (role_id)
);

-- Bảng Permissions (Quyền)
CREATE TABLE permissions (
    permission_id VARCHAR(50) NOT NULL ,
    permission_name VARCHAR(100) NOT NULL UNIQUE, -- 'view_users', 'edit_transaction', etc
    description TEXT,
    CONSTRAINT pk_permissions PRIMARY KEY (permission_id)
);

-- Bảng Role_Permissions (Gán quyền cho role)
CREATE TABLE role_permissions (
    role_id VARCHAR(50) NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);

-- Thêm role_id vào bảng users
ALTER TABLE users ADD COLUMN role_id DEFAULT 'user';
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(role_id);


INSERT INTO roles (role_id, role_name, description) VALUES
('1', 'user', 'Người dùng thông thường - Có thể quản lý chi tiêu cá nhân'),
('2', 'admin', 'Quản trị viên - Quản lý người dùng và xem báo cáo tổng hợp'),
('3', 'super_admin', 'Quản trị viên cấp cao - Toàn quyền quản lý hệ thống');


-- 2. THÊM DỮ LIỆU BẢNG PERMISSIONS (Quyền)
-- =============================================

-- Quyền liên quan đến CHI TIÊU (Expenses)
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('1', 'create_expense', 'Tạo khoản chi tiêu mới'),
('2', 'view_own_expense', 'Xem chi tiêu của bản thân'),
('3', 'edit_own_expense', 'Sửa chi tiêu của bản thân'),
('4', 'delete_own_expense', 'Xóa chi tiêu của bản thân'),
('5', 'view_all_expenses', 'Xem tất cả chi tiêu của mọi người dùng'),
('6', 'edit_all_expenses', 'Sửa chi tiêu của bất kỳ người dùng nào'),
('7', 'delete_all_expenses', 'Xóa chi tiêu của bất kỳ người dùng nào');

-- Quyền liên quan đến DANH MỤC (Categories)
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('8', 'create_category', 'Tạo danh mục chi tiêu mới'),
('9', 'view_own_category', 'Xem danh mục của bản thân'),
('10', 'edit_own_category', 'Sửa danh mục của bản thân'),
('11', 'delete_own_category', 'Xóa danh mục của bản thân'),
('12', 'manage_default_categories', 'Quản lý danh mục mặc định của hệ thống');

-- Quyền liên quan đến NGÂN SÁCH (Budgets)
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('13', 'create_budget', 'Tạo ngân sách mới'),
('14', 'view_own_budget', 'Xem ngân sách của bản thân'),
('15', 'edit_own_budget', 'Sửa ngân sách của bản thân'),
('16', 'delete_own_budget', 'Xóa ngân sách của bản thân');

-- Quyền liên quan đến BÁO CÁO (Reports)
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('17', 'view_own_report', 'Xem báo cáo chi tiêu của bản thân'),
('18', 'export_own_report', 'Xuất báo cáo của bản thân'),
('19', 'view_all_reports', 'Xem báo cáo tổng hợp của tất cả người dùng'),
('20', 'export_all_reports', 'Xuất báo cáo tổng hợp hệ thống');

-- Quyền liên quan đến NGƯỜI DÙNG (Users)
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('21', 'view_own_profile', 'Xem thông tin cá nhân'),
('22', 'edit_own_profile', 'Sửa thông tin cá nhân'),
('23', 'change_own_password', 'Đổi mật khẩu của bản thân'),
('24', 'view_all_users', 'Xem danh sách tất cả người dùng'),
('25', 'edit_all_users', 'Sửa thông tin bất kỳ người dùng nào'),
('26', 'delete_users', 'Xóa người dùng'),
('27', 'change_user_role', 'Thay đổi vai trò người dùng');

-- Quyền liên quan đến HỆ THỐNG (System)
INSERT INTO permissions (permission_id, permission_name, description) VALUES
('28', 'view_system_settings', 'Xem cài đặt hệ thống'),
('29', 'edit_system_settings', 'Sửa cài đặt hệ thống'),
('30', 'view_system_logs', 'Xem nhật ký hệ thống'),
('31', 'manage_roles', 'Quản lý vai trò'),
('32', 'manage_permissions', 'Quản lý quyền hạn');


-- 3. THÊM DỮ LIỆU BẢNG ROLE_PERMISSIONS (Gán quyền cho vai trò)
-- =============================================

-- Quyền cho USER (role_id = 1)
-- User có thể quản lý chi tiêu, danh mục, ngân sách và báo cáo của bản thân
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Chi tiêu
('1', '1'),   -- create_expense
('1', '2'),   -- view_own_expense
('1', '3'),   -- edit_own_expense
('1', '4'),   -- delete_own_expense
-- Danh mục
('1', '8'   ),   -- create_category
('1', '9'),   -- view_own_category
('1', '10'),  -- edit_own_category
('1', '11'),  -- delete_own_category
-- Ngân sách
('1', '13'),  -- create_budget
('1', '14'),  -- view_own_budget
('1', '15'),  -- edit_own_budget
('1', '16'),  -- delete_own_budget
-- Báo cáo
('1', '17'),  -- view_own_report
('1', '18'),  -- export_own_report
-- Profile
('1', '21'),  -- view_own_profile
('1', '22'),  -- edit_own_profile
('1', '23');  -- change_own_password


-- Quyền cho ADMIN (role_id = 2)
-- Admin có tất cả quyền của User + quản lý người dùng + xem báo cáo tổng hợp
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Chi tiêu (của bản thân)
('2', '1'),   -- create_expense
('2', '2'),   -- view_own_expense
('2', '3'),   -- edit_own_expense
('2', '4'),   -- delete_own_expense
-- Chi tiêu (của tất cả)
('2', '5'),   -- view_all_expenses
('2', '6'),   -- edit_all_expenses
('2', '7'),   -- delete_all_expenses
-- Danh mục
('2', '8'),   -- create_category
('2', '9'),   -- view_own_category
('2', '10'),  -- edit_own_category
('2', '11'),  -- delete_own_category
('2', '12'),  -- manage_default_categories
-- Ngân sách
('2', '13'),  -- create_budget
('2', '14'),  -- view_own_budget
('2', '15'),  -- edit_own_budget
('2', '16'),  -- delete_own_budget
-- Báo cáo
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


-- Quyền cho SUPER_ADMIN (role_id = 3)
-- Super Admin có TOÀN QUYỀN
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Chi tiêu
('3', '1'),   -- create_expense
('3', '2'),   -- view_own_expense
('3', '3'),   -- edit_own_expense
('3', '4'),   -- delete_own_expense
('3', '5'),   -- view_all_expenses
('3', '6'),   -- edit_all_expenses
('3', '7'),   -- delete_all_expenses
-- Danh mục
('3', '8'),   -- create_category
('3', '9'),   -- view_own_category
('3', '10'),  -- edit_own_category
('3', '11'),  -- delete_own_category
('3', '12'),  -- manage_default_categories
-- Ngân sách
('3', '13'),  -- create_budget
('3', '14'),  -- view_own_budget
('3', '15'),  -- edit_own_budget
('3', '16'),  -- delete_own_budget
-- Báo cáo
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


-- 4. CẬP NHẬT ROLE MẶC ĐỊNH CHO USER HIỆN TẠI (nếu cần)
-- =============================================
-- Đặt tất cả user hiện tại thành role 'user' (role_id = 1)
UPDATE users SET role_id = 1 WHERE role_id IS NULL;
