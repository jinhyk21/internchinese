-- Chạy trong Supabase SQL Editor: cho phép admin sửa hồ sơ của chính mình
-- (policy cũ bắt role = 'student' nên admin bị chặn), nhưng user thường vẫn không tự nâng quyền.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
);
