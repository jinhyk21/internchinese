# Nạp dữ liệu

## Cách 1 (nhanh nhất): script nhập bằng tài khoản admin
```
ADMIN_EMAIL=email-admin ADMIN_PASSWORD=mat-khau node scripts/05_import.mjs
```
(Tài khoản phải có `profiles.role = 'admin'`.) Chạy lại không bị trùng.

## Cách 2: SQL Editor — chạy theo thứ tự
1. `../seed_more.sql`, `../seed_content_2.sql` (nếu chưa chạy)
2. `00_prepare.sql` → `01_categories.sql` → `02_scenarios_*.sql` → `03_vocab_industry_*.sql` → `04_vocab_hsk_01..11.sql`
3. `../seed_activity.sql` (dữ liệu hoạt động 6 tháng) — chạy SAU CÙNG
Xóa dữ liệu demo hoạt động: `../seed_activity_cleanup.sql`
