# Coliseo Angel Cruz | Plataforma de Apuestas y Streaming de Peleas de Gallos

Esta es una aplicación de clase mundial con estética **Fintech Premium**, construida con React y Ant Design.

## 🚀 Cómo empezar

Debido a que este entorno no tiene Node.js preinstalado, sigue estos pasos en tu máquina local:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

3. **Abrir en el navegador:**
   Ve a `http://localhost:3000`

## 🛠️ Stack Tecnológico
- **Frontend:** React + Vite + Ant Design (ConfigProvider personalizado).
- **Estética:** Modo Oscuro Puro (#000000) con Acentos Dorados (#D4AF37).
- **Video:** Compatible con HLS (vía video.js).
- **Base de Datos:** PostgreSQL (Esquema incluido en `/database/schema.sql`).

## 📱 Vistas Incluidas
1. **Usuario Final:** 
   - Pantalla de Streaming con reproductor 16:9.
   - Panel de apuestas rápidas con modal de confirmación.
   - Historial de resultados compacto.
   - Billetera/Wallet personalizada.
2. **Administrador:**
   - Panel de control de streaming.
   - Ajuste de cuotas en tiempo real.
   - Declaración de ganadores y cierre de apuestas.

## 🗄️ Lógica de Negocio (Base de Datos)
El archivo `database/schema.sql` contiene la estructura para:
- `users`: Gestión de perfiles y saldo.
- `events`: Control de las peleas en vivo y sus cuotas.
- `bets`: Registro de cada apuesta realizada.
- `transactions`: Historial de depósitos, retiros y pagos.

## 💡 Próximos pasos recomendados
1. Configurar un servidor **Node.js/Express** o **FastAPI** para manejar los WebSockets (Socket.io).
2. Implementar la conexión real con el reproductor HLS usando la URL de tu OBS/Larix.
3. Integrar una pasarela de pagos para depósitos reales.
