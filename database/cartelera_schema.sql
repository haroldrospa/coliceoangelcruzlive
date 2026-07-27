-- Module: Cartelera de Gallos (Coliseo App)
-- Schema for management of fights with mirror attributes

CREATE TABLE IF NOT EXISTS public.cartelera_fights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pelea SERIAL,
    posta DECIMAL(15, 2) DEFAULT 0.00,
    fecha_evento DATE DEFAULT CURRENT_DATE,
    locked BOOLEAN DEFAULT FALSE, -- Cierre de Cartelera flag
    
    -- Competitor Side A
    turno_a TEXT,
    traba_a TEXT,
    peso_libras_a INTEGER DEFAULT 0,
    peso_onzas_a INTEGER DEFAULT 0 CHECK (peso_onzas_a BETWEEN 0 AND 15),
    peso_puntos_a INTEGER DEFAULT 0 CHECK (peso_puntos_a BETWEEN 0 AND 9),
    color_a TEXT, -- Enum: Indio, Joco, Jabao, Cenizo, Canelo, Blanco
    marca_a INTEGER,
    
    -- Competitor Side B
    turno_b TEXT,
    traba_b TEXT,
    peso_libras_b INTEGER DEFAULT 0,
    peso_onzas_b INTEGER DEFAULT 0 CHECK (peso_onzas_b BETWEEN 0 AND 15),
    peso_puntos_b INTEGER DEFAULT 0 CHECK (peso_puntos_b BETWEEN 0 AND 9),
    color_b TEXT,
    marca_b INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for this table
ALTER TABLE public.cartelera_fights REPLICA IDENTITY FULL;
COMMENT ON TABLE public.cartelera_fights IS 'Tabla principal para la gestión de la cartelera de gallos (Santiago Style)';
