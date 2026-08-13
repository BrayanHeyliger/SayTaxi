# WhatsApp Taxi SaaS - Resumen del Proyecto

## Estado Actual
- **Landing Page:** Completa con diseño Verde Operacional, demostración animada del bot
- **Backend:** Node.js + Express + tRPC configurado
- **Base de Datos:** MySQL con 10 tablas (users, clients, drivers, vehicles, trips, ratings, payments, pricingRules, subscriptions, companySubscriptions)
- **Autenticación:** OAuth integrado
- **Sistema de Roles:** user, admin, client, driver

## Credenciales Super Admin
- **Usuario:** Heyliger
- **Contraseña:** Hosting01
- **Rol:** admin

## Próximas Fases (Para Completar)

### Fase 1: Paneles de Cliente y Conductor
- Panel de cliente: solicitar viajes, historial, calificaciones
- Panel de conductor: aceptar viajes, ganancias, perfil
- Integración con Google Maps

### Fase 2: Integración de Pagos
- Stripe integration
- PayPal integration
- Sistema de comisiones

### Fase 3: Editor Visual
- Editor WYSIWYG en tiempo real
- Gestión de contenido dinámico
- Personalización de colores y textos

### Fase 4: Instalador
- Wizard de instalación paso a paso
- Configuración automática de BD
- Sistema de licencias

## Cómo Continuar

1. **Descargar el código:** Usa el botón "Download as ZIP" en el panel de Management
2. **Instalar localmente:** npm install / pnpm install
3. **Configurar BD:** Actualiza DATABASE_URL en .env
4. **Ejecutar:** npm run dev

## Stack Tecnológico
- Frontend: React 19 + Tailwind CSS 4
- Backend: Node.js + Express + tRPC
- BD: MySQL 8.x
- Auth: OAuth
- Pagos: Stripe + PayPal (pendiente)
- Mapas: Google Maps API

## Archivos Clave
- `/client/src/pages/Home.tsx` - Landing page
- `/drizzle/schema.ts` - Schema de base de datos
- `/server/routers.ts` - APIs tRPC
- `/server/db.ts` - Queries de BD
