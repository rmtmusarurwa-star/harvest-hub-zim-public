-- Ensure the designated admin is in user_roles so that is_admin() returns true
-- for DB-level RLS policies (admin can see all orders, etc.)
-- We look up the user by their known email to avoid hardcoding a UUID.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'rmtmusarurwa@icloud.com'
ON CONFLICT (user_id, role) DO NOTHING;
