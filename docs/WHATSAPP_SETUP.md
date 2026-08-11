# Setup WhatsApp Bot

## Requisitos
- Meta Business Account
- WhatsApp Business Account
- Node.js 18+
- Docker (opcional)

## Variables de Entorno

```env
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxx
WHATSAPP_API_VERSION=v18.0
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_WEBHOOK_TOKEN=xxxxx
WHATSAPP_WEBHOOK_URL=https://tu-dominio.com/webhook/whatsapp
WHATSAPP_APP_SECRET=xxxxx
```

## Pasos
1. Crear app en Meta Developer: https://developers.facebook.com
2. Obtener credenciales de WhatsApp Cloud API.
3. Configurar el webhook en Meta con `GET /webhook/whatsapp`.
4. Levantar servicios:
   - `docker-compose up`
   - `pnpm dev`
5. Probar con un mensaje real en WhatsApp.
