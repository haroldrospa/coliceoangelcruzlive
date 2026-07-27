-- Supabase Cockfighting Betting Schema (Updated with Triggers)

-- 1. Tables Setup
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 1000.00 CHECK (balance >= 0), -- Initial gift $1000 for testing
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    user_email TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_number TEXT NOT NULL,
    gallo_a_name TEXT NOT NULL,
    gallo_b_name TEXT NOT NULL,
    gallo_a_weight TEXT,
    gallo_b_weight TEXT,
    gallo_a_odds DECIMAL(5, 2) DEFAULT 1.90,
    gallo_b_odds DECIMAL(5, 2) DEFAULT 1.90,
    status TEXT DEFAULT 'LIVE', -- 'LIVE', 'CLOSED', 'FINISHED'
    stream_url TEXT DEFAULT '', -- New column for RTMP/HLS source
    winner_side CHAR(1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    event_id UUID REFERENCES public.events(id),
    selected_side CHAR(1) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    odds_at_bet DECIMAL(5, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'WON', 'LOST'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    amount_change DECIMAL(15, 2) NOT NULL,
    type TEXT NOT NULL, -- 'DEPOSIT', 'WITHDRAW', 'BET_PLACED', 'BET_PAYOUT'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. AUTOMATION: Sync Supabase Auth Users to Public Users Table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  
  -- Initial Transaction Log for the gift balance
  INSERT INTO public.transactions (user_id, amount_change, type, description)
  VALUES (NEW.id, 1000.00, 'DEPOSIT', 'Bono de bienvenida plataforma');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for sync
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Enabling Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
