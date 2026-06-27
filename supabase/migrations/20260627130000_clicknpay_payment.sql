-- Add clicknpay as a supported payment method
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'clicknpay';
