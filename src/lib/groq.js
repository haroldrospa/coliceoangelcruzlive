import { rawFetch } from "./supabase";

export const scanScoreboardWithGroq = async (base64Image) => {
    try {
        // 1. Get API Key from current settings 
        const settings = await rawFetch('settings');
        let groqKey = settings?.find(s => s.id === 'groq_api_key')?.value;

        if (!groqKey || groqKey.length < 10) {
            throw new Error("API KEY DE GROQ NO CONFIGURADA. Ve al panel admin y guárdala.");
        }

        const prompt = `
            Eres un experto en OCR y análisis de marcadores de peleas de gallos. Analiza la imagen y extrae los datos siguiendo estrictamente estas reglas visuales:
            
            1. post_number: Es el número que aparece dentro del recuadro de color ROJO a la izquierda (dice PELEA seguido del número).
            2. gallo_a_name (Gallo Azul): Es el texto que aparece dentro del recuadro largo con fondo de color AZUL.
            3. gallo_b_name (Gallo Blanco): Es el texto que aparece dentro del recuadro largo con fondo de color BLANCO o GRIS CLARO.
            4. winner_side: Identifica quién ganó observando una marca (un cotejo "✓", un punto o un indicador de color):
               - Si la marca está en la fila AZUL o en el cuadrito que dice "Azul" -> Devuelve "A".
               - Si la marca está en la fila BLANCA o en el cuadrito que dice "Blanco" -> Devuelve "B".
               - Si hay un círculo rojo o una marca en el cuadrito que dice "Tabla" -> Devuelve "D".

            IMPORTANTE: No mezcles los nombres. Si el recuadro azul dice "VIDRIERA RODRIGUEZ", ese es el nombre completo para gallo_a_name.
            
            Devuelve un objeto JSON válido con este formato:
            {"post_number": "N", "gallo_a_name": "NOMBRE_AZUL", "gallo_b_name": "NOMBRE_BLANCO", "winner_side": "A" | "B" | "D"}
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Error en la API de Groq");
        }

        const result = await response.json();
        const content = result.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Groq Scan Error:", error);
        throw error;
    }
};
