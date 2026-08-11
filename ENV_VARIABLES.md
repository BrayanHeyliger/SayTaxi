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

### WhatsApp Cloud API
```
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxx
WHATSAPP_API_VERSION=v18.0
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_WEBHOOK_TOKEN=xxxxx
WHATSAPP_WEBHOOK_URL=https://tu-dominio.com/webhook/whatsapp
WHATSAPP_APP_SECRET=xxxxx
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
