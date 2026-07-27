-- Add table for rooster pool (waiting for matching)
CREATE TABLE IF NOT EXISTS public.cartelera_roosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traba TEXT NOT NULL,
    peso_libras INTEGER DEFAULT 0,
    peso_onzas INTEGER DEFAULT 0,
    peso_puntos INTEGER DEFAULT 0,
    total_oz DECIMAL(10, 2), -- Calculated field for easier sorting/matching
    color TEXT,
    marca INTEGER,
    status TEXT DEFAULT 'PENDING', -- PENDING, MATCHED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to calculate total_oz automatically
CREATE OR REPLACE FUNCTION calculate_rooster_oz()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_oz := (NEW.peso_libras * 16) + NEW.peso_onzas + (NEW.peso_puntos::decimal / 10);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_oz
BEFORE INSERT OR UPDATE ON public.cartelera_roosters
FOR EACH ROW EXECUTE FUNCTION calculate_rooster_oz();

ALTER TABLE public.cartelera_roosters REPLICA IDENTITY FULL;
