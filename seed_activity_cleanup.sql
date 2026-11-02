-- Xóa toàn bộ dữ liệu demo (cascade: profiles → sessions → messages/evaluations, user_vocabulary, bookmarks)
DELETE FROM auth.users WHERE email LIKE 'demo%@internchinese.demo';
