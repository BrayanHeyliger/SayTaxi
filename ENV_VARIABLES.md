# Variables de Entorno - WhatsApp Taxi SaaS

## Configuración Requerida

### Base de Datos
```
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/whatsapp_taxi
```
Formato: `mysql://[usuario]:[contraseña]@[host]:[puerto]/[base_datos]`

### Autenticación
```
JWT_SECRET=tu_clave_secreta_super_segura_minimo_32_caracteres
```
Genera una clave segura con: `openssl rand -base64 32`

### Aplicación
```
VITE_APP_TITLE=WhatsApp Taxi SaaS
VITE_APP_LOGO=https://tu-dominio.com/logo.png
NODE_ENV=development
```

## Configuración Opcional

### Stripe (Pagos)
```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```
Obtén en: https://dashboard.stripe.com/apikeys

### PayPal (Pagos)
```
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox
```
Obtén en: https://developer.paypal.com

### Google Maps
```
VITE_GOOGLE_MAPS_API_KEY=xxxxx
```
Obtén en: https://console.cloud.google.com

### Email (Notificaciones)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app
```

### LLM Local (Qwen + Ollama)
```bash
# Fuerza uso local para evitar consumo de creditos externos
LOCAL_LLM_ONLY=true

# URL de Ollama local
OLLAMA_BASE_URL=http://127.0.0.1:11434

# Modelo principal (si falla, el backend intenta fallbacks Qwen)
OLLAMA_MODEL=qwen2.5-coder:1.5b-base

# Intentar iniciar `ollama serve` automaticamente si no responde
OLLAMA_AUTOSTART=true

# Evita congelamiento en llamadas largas al modelo
LLM_REQUEST_TIMEOUT_MS=45000

# Tiempo maximo de espera al arrancar Ollama
OLLAMA_BOOT_TIMEOUT_MS=20000

# Cada cuanto revisar que Ollama siga vivo (ms)
OLLAMA_KEEPALIVE_MS=480000
```

## Cómo Configurar

1. Copia `.env.example` a `.env`
2. Edita los valores según tu configuración
3. No compartas el archivo `.env` (contiene secretos)
4. Reinicia el servidor después de cambios

## Seguridad

- Nunca commits `.env` a Git
- Usa contraseñas fuertes
- Regenera JWT_SECRET en producción
- Usa variables de entorno del servidor en producción
- No expongas claves públicas en el frontend

## Validación

Después de configurar, verifica que todo funcione:
```bash
npm run dev
# Debe iniciar sin errores de conexión
```
