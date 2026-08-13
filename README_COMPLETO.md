# WhatsApp Taxi SaaS - Plataforma Completa

## 🧠 Modo de trabajo del repositorio
- Priorizar trabajo local/offline siempre que sea posible.
- Usar los modelos Qwen configurados localmente vía Ollama para tareas de desarrollo.
- Evitar servicios en la nube, de pago o que consuman crédito salvo que se pidan explícitamente.

## 📱 Descripción
Plataforma SaaS profesional para gestionar servicios de taxi a través de WhatsApp. Incluye landing page, paneles de administración, gestión de conductores, clientes y pagos.

## ✨ Características Implementadas

### Landing Page
- Diseño moderno "Verde Operacional" (colores WhatsApp)
- Demostración animada del bot en acción
- Secciones: Hero, Características, Cómo Funciona, Módulos, Stack Técnico, Precios, Contacto
- Responsive y optimizado para móviles

### Backend
- Node.js + Express + tRPC
- Autenticación OAuth integrada
- Sistema de roles (user, admin, client, driver)
- APIs REST completas

### Base de Datos
- MySQL 8.x con 10 tablas
- Schema completo para: usuarios, clientes, conductores, vehículos, viajes, pagos, calificaciones
- Relaciones y constraints configurados

### Seguridad
- Autenticación OAuth
- Roles y permisos
- Validación de datos
- Protección CSRF

## 🚀 Instalación Rápida

### Requisitos
- Node.js 18+
- MySQL 8.0+
- NPM o PNPM

### Pasos
```bash
# 1. Descargar y extraer
unzip whatsapp-taxi-saas.zip
cd whatsapp-taxi-saas

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp .env.example .env
# Edita DATABASE_URL y otras variables

# 4. Crear base de datos
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 5. Iniciar
npm run dev
```

Accede a `http://localhost:3000`

## 👤 Credenciales Super Admin
- **Usuario:** Heyliger
- **Contraseña:** Hosting01
- **Rol:** admin (acceso total)

## 📁 Estructura del Proyecto

```
whatsapp-taxi-saas/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Home, etc)
│   │   ├── components/    # Componentes reutilizables
│   │   └── lib/           # Utilidades
│   └── public/            # Archivos estáticos
├── server/                # Backend Node.js
│   ├── routers.ts         # APIs tRPC
│   ├── db.ts              # Queries de BD
│   └── _core/             # Configuración interna
├── drizzle/               # Schema y migraciones
│   └── schema.ts          # Definición de tablas
├── shared/                # Código compartido
└── package.json           # Dependencias
```

## 🔧 Configuración

### Variables de Entorno (.env)
```
DATABASE_URL=mysql://user:password@localhost:3306/db
JWT_SECRET=tu_clave_secreta
VITE_APP_TITLE=WhatsApp Taxi SaaS
```

### Base de Datos
Las tablas se crean automáticamente con:
```bash
pnpm drizzle-kit migrate
```

## 📊 Tablas de Base de Datos

- **users** - Usuarios del sistema
- **clients** - Clientes (pasajeros)
- **drivers** - Conductores
- **vehicles** - Vehículos/Flota
- **trips** - Viajes solicitados
- **ratings** - Calificaciones
- **payments** - Historial de pagos
- **pricingRules** - Reglas de tarifas
- **subscriptions** - Planes SaaS
- **companySubscriptions** - Suscripciones de empresas

## 🎨 Personalización

### Colores
Edita `/client/src/index.css` para cambiar la paleta:
```css
--primary: oklch(0.76 0.18 148);  /* Verde WhatsApp */
--background: oklch(0.98 0.002 100);  /* Blanco */
```

### Textos
Edita los componentes en `/client/src/pages/` y `/client/src/components/`

### Logo
Reemplaza `/client/public/logo.png`

## 🚢 Deployment

### Vercel
```bash
vercel deploy
```

### Railway/Render
1. Conecta tu repositorio Git
2. Configura variables de entorno
3. Deploy automático

### Hosting Tradicional
```bash
npm run build
# Sube la carpeta dist/ a tu servidor
node dist/index.js
```

## 📝 Próximas Funcionalidades (Por Implementar)

- [ ] Panel de Cliente (solicitar viajes)
- [ ] Panel de Conductor (aceptar viajes)
- [ ] Integración Stripe
- [ ] Integración PayPal
- [ ] Editor Visual WYSIWYG
- [ ] Instalador Automático
- [ ] Sistema de Notificaciones
- [ ] Seguimiento GPS en tiempo real

## 🔐 Seguridad

- Cambiar contraseña del super admin después de instalar
- Usar HTTPS en producción
- Configurar CORS correctamente
- Mantener dependencias actualizadas

## 📞 Soporte

Para problemas técnicos:
1. Revisa los logs en `.passenger-logs/`
2. Verifica la configuración de .env
3. Asegúrate que MySQL esté corriendo
4. Reinstala dependencias si es necesario

## 📄 Licencia

Este código es tuyo. Puedes usarlo, modificarlo y distribuirlo libremente.

---

**Versión:** 1.0.0  
**Última actualización:** Agosto 2026  
**Desarrollado con:** React, Node.js, MySQL, Tailwind CSS
