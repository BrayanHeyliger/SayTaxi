# Guía de Instalación - WhatsApp Taxi SaaS

## Requisitos del Sistema
- Node.js 18+ o PHP 8.0+
- MySQL 8.0+
- NPM o PNPM
- 500MB de espacio en disco

## Instalación Paso a Paso

### Paso 1: Descargar y Extraer
1. Descarga el archivo `whatsapp-taxi-saas.zip`
2. Extrae el contenido en tu servidor web
3. Navega a la carpeta del proyecto

### Paso 2: Instalar Dependencias
```bash
cd whatsapp-taxi-saas
npm install
# o
pnpm install
```

### Paso 3: Configurar Base de Datos
1. Crea una nueva base de datos MySQL
2. Copia el archivo `.env.example` a `.env`
3. Actualiza las variables:
```
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/whatsapp_taxi
JWT_SECRET=tu_clave_secreta_aqui
```

### Paso 4: Crear Tablas
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Paso 5: Iniciar el Servidor
```bash
npm run dev
```

El sitio estará disponible en `http://localhost:3000`

## Credenciales Super Admin
- **Usuario:** Heyliger
- **Contraseña:** Hosting01
- **URL de acceso:** http://tu-dominio.com/admin

## Configuración de Producción

### Para Vercel/Railway/Render:
1. Conecta tu repositorio Git
2. Configura las variables de entorno en el panel
3. Deploy automático

### Para Hosting Tradicional:
1. Compila el proyecto: `npm run build`
2. Sube la carpeta `dist/` a tu servidor
3. Configura Node.js para ejecutar: `node dist/index.js`
4. Usa PM2 o similar para mantener el proceso activo

## Configuración de Dominio
1. Apunta tu dominio a la IP del servidor
2. Configura SSL/HTTPS
3. Actualiza las URLs en `.env`

## Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
npm run build
```

### Error de Conexión a BD
- Verifica que MySQL esté corriendo
- Comprueba las credenciales en `.env`
- Asegúrate que la BD existe

### Error 500 en el servidor
- Revisa los logs: `tail -f .passenger-logs/devserver.log`
- Verifica que todas las variables de entorno estén configuradas

## Próximos Pasos
1. Configura Stripe y PayPal en el panel admin
2. Personaliza los colores y textos desde el editor
3. Carga documentos de conductores
4. Configura las tarifas de viajes

## Soporte
Para problemas técnicos, revisa la documentación en `/docs` o contacta al desarrollador.
