-- Tabla para configuraciones globales del sistema (como la URL de transmisión)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar la URL de Castr inicial proporcionada por el usuario
INSERT INTO public.settings (id, value) 
VALUES ('live_stream_url', 'https://player.castr.com/live_1ed450102e0911f1aefefdfd73416729')
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;

-- Habilitar Realtime para que los usuarios vean el cambio de señal al instante
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
