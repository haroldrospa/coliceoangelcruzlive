-- Coliseo Angel Cruz Finance Schema Extension (Deposits & Withdrawals)

-- 1. Deposits Table
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL, -- 'PAYPAL', 'CARD', 'TRANSFER'
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    proof_url TEXT, -- URL to the screenshot/proof (for Transfers)
    external_id TEXT, -- PayPal Transaction ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,
    details TEXT NOT NULL, -- Bank info/Wallet Address
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enabling Realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
