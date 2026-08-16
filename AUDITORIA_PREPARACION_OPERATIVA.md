# Auditoría de preparación operativa — SayTaxi

**Fecha de evaluación:** 16 de agosto de 2026  
**Alcance:** revisión estática del repositorio, configuración disponible en el entorno de auditoría, validaciones locales de tipos, pruebas y compilación. No se realizaron transacciones, envíos de correo, conexiones a una base de datos externa ni despliegues.

## Veredicto ejecutivo

> **SayTaxi no está listo para operar con usuarios reales ni para lanzar el panel administrativo en producción.**

La aplicación **sí compila**, pasa las comprobaciones de TypeScript y las pruebas existentes; esto confirma que la base técnica puede construirse. Sin embargo, estas validaciones no prueban que los procesos de negocio sean operables. Se encontraron bloqueos críticos de configuración, seguridad y persistencia que impiden afirmar que los viajes, pagos, despacho y administración funcionen de extremo a extremo.

## Evidencia de validación local

| Comprobación | Resultado | Lectura operativa |
|---|---:|---|
| `pnpm check` | Correcta | El chequeo de tipos TypeScript finalizó sin errores. |
| `pnpm test` | Correcta | 4 archivos y 6 pruebas aprobadas. La cobertura actual es limitada. |
| `pnpm build` | Correcta | Se generó una compilación de producción. |
| Tamaño del paquete principal | 1.74 MB sin comprimir; 429.49 kB gzip | Hay una advertencia de empaquetado grande; debe optimizarse, pero no bloquea por sí sola el lanzamiento. |
| Servicios configurados en este entorno | No configurados | No se detectaron `DATABASE_URL`, `JWT_SECRET`, Stripe, SMTP ni clave de mapas, ni archivos `.env` bajo el alcance inspeccionado. |

## Estado funcional por área

| Área | Estado | Evidencia y conclusión |
|---|---|---|
| Landing y contenido comercial | **Condicional** | La interfaz compila y contiene una estructura comercial completa. Aún requiere dominio, configuración de producción y pruebas reales en navegador. |
| Registro e inicio de sesión | **No apto** | El alta de una cuenta con rol `fleet` se convierte en rol `admin` en el servidor. Además, la contraseña se procesa con SHA-256 sin sal ni algoritmo específico para contraseñas. |
| Panel de administración | **No apto** | Varias consultas administrativas se exponen como públicas y funciones importantes del panel trabajan con datos simulados o solo cambian el estado visual. |
| Conductores, clientes y analítica administrativa | **Demostrativo** | `AdminDashboard` inicializa conductores, clientes y gráficas con `MOCK_*`; aprobar, suspender, eliminar, modificar permisos o enviar mensajes no persiste esas acciones en el servidor. |
| Despacho y gestión de flota | **Demostrativo** | Los paneles de despacho y flota incluyen datos de ejemplo y simulaciones de asignación. No deben usarse para coordinar viajes reales. |
| Viajes de pasajero y conductor | **No verificado de extremo a extremo** | Hay interacción de interfaz, temporizadores y almacenamiento local. No se validó una creación, asignación, aceptación, inicio y cierre de viaje persistentes con base de datos real. |
| Pagos | **No apto** | Solo existe la creación de una sesión de Stripe; no hay flujo de webhook verificado para confirmar cobros, activar suscripciones ni manejar reintentos. La clave de Stripe no está configurada en este entorno. |
| Correo y notificaciones | **No apto** | SMTP no está configurado. El envío masivo mostrado en el panel se actualiza localmente; no constituye un sistema de entrega real. |
| Paquetería, anuncios, seguridad y referidos | **Condicional** | Existen procedimientos de servidor y algunos están protegidos por rol. Requieren una base de datos configurada, datos reales y pruebas de autorización antes de habilitarse. |
| Mapa, geocodificación y tiempo real | **No apto para producción** | La geocodificación se realiza directamente contra Nominatim desde el cliente; debe sustituirse o encapsularse en un proveedor con condiciones de producción. Socket.IO permite origen `*` y acepta uniones a salas desde datos proporcionados por el cliente, sin validación de identidad observada. |

## Bloqueos críticos que deben corregirse antes de operar

| Prioridad | Hallazgo | Riesgo | Corrección requerida |
|---|---|---|---|
| Crítica | Alta de `fleet` convertida automáticamente a `admin` | Cualquier usuario puede obtener privilegios administrativos mediante registro. | Separar el rol de flota del rol de administrador y restringir la creación o elevación de roles a una acción administrativa autorizada. |
| Crítica | Procedimientos `adminDashboard` declarados como públicos | Se pueden exponer conductores, viajes y ubicaciones operativas a visitantes no autorizados. | Reemplazar `publicProcedure` por `adminProcedure`, añadir pruebas de acceso denegado y revisar todos los endpoints administrativos. |
| Crítica | Panel administrativo con datos simulados y acciones locales | Las aparentes aprobaciones, suspensiones, permisos, mensajes, analítica y reservas no quedan guardados ni ejecutan operaciones reales. | Implementar procedimientos de lectura/escritura, eliminar los arreglos `MOCK_*` de producción y conectar cada control a una mutación autorizada y auditable. |
| Crítica | Configuración operativa ausente en el entorno auditado | La aplicación no puede conectar base de datos, firmar sesiones, cobrar, enviar correos ni configurar mapas. | Crear secretos de producción en el proveedor de despliegue, usar una base de datos gestionada, ejecutar migraciones y confirmar conectividad sin exponer valores. |
| Crítica | Pagos sin confirmación de webhook | El sistema no tiene una fuente confiable para activar o cancelar suscripciones tras un pago. | Implementar, verificar y probar un webhook firmado de Stripe; persistir eventos idempotentes y reconciliar el estado de suscripciones. |
| Crítica | Canales Socket.IO sin autenticación observada y CORS abierto | Riesgo de acceso a salas, suplantación de identidad y exposición de eventos de viaje/chat. | Autenticar el handshake, derivar usuario y permisos desde la sesión del servidor, autorizar cada sala y restringir orígenes a los dominios de producción. |
| Alta | Contraseñas con SHA-256 simple | Riesgo de compromiso rápido de credenciales si la base de datos se filtra. | Migrar a Argon2id o bcrypt con parámetros robustos, sal por contraseña y política de restablecimiento seguro. |
| Alta | Pruebas insuficientes | Los 6 casos actuales no cubren autorización, persistencia, pagos, despacho ni recorridos por rol. | Añadir pruebas unitarias, de integración y de extremo a extremo antes de publicar. |

## Mejoras no bloqueantes, pero necesarias

El paquete principal de JavaScript supera el umbral recomendado por la propia compilación. Conviene aplicar carga diferida a paneles, mapas, gráficas y componentes pesados para mejorar el primer renderizado. También se observó una advertencia de `pnpm` sobre opciones de parches y sobreescrituras ignoradas con la configuración actual; se debe migrar esa configuración al archivo de espacio de trabajo correspondiente para preservar instalaciones reproducibles.

## Secuencia de corrección recomendada

1. **Cerrar la superficie de seguridad.** Corregir la escalada de rol `fleet → admin`, proteger todas las rutas y procedimientos administrativos, reforzar contraseñas, endurecer cookies/sesiones y asegurar Socket.IO.
2. **Convertir los flujos simulados en operaciones persistentes.** Modelar y conectar usuarios, conductores, vehículos, viajes, asignaciones, estados, permisos, mensajes y métricas mediante base de datos y mutaciones auditables.
3. **Preparar infraestructura de producción.** Configurar base de datos, secretos, migraciones, respaldo, dominio HTTPS, correo transaccional, proveedor de mapas y monitoreo.
4. **Completar pagos y comunicaciones.** Integrar Stripe con webhooks firmados, trazabilidad de suscripciones, validaciones de importe y pruebas en modo sandbox. Implementar entrega real para correo, notificaciones o WhatsApp según el canal elegido.
5. **Validar un lanzamiento controlado.** Crear cuentas de prueba para cada rol, ejecutar recorridos completos, registrar fallos y solo después realizar una beta cerrada con capacidad limitada.

## Criterio de salida para lanzar

SayTaxi estará en condiciones de una beta operativa cuando, como mínimo, cada acción sensible esté autenticada y autorizada en el servidor; los paneles no utilicen datos simulados; un viaje completo se persista y se audite; pagos y correo se prueben en sandbox; la base de datos y los secretos estén configurados en el entorno de despliegue; y una suite de pruebas cubra los flujos principales por rol.

## 1. Errores Encontrados y Soluciones

- **Panel administrativo parcialmente demostrativo y con rutas administrativas expuestas:** varios módulos muestran acciones sin persistencia y `adminDashboard` usa procedimientos públicos.
  - **Solución:** reemplazar datos simulados por consultas y mutaciones seguras, protegidas con autorización de servidor y registros de auditoría.
- **Escalada de privilegios en el alta de flota:** el rol de flota recibe privilegios administrativos.
  - **Solución:** crear un rol de flota independiente y reservar la promoción a administrador para un flujo controlado.
- **Servicios de operación sin configuración local disponible:** no se detectaron los secretos y conexiones requeridos.
  - **Solución:** definir secretos en el entorno de despliegue, aplicar migraciones y realizar pruebas de humo con servicios sandbox.

## 2. Mejoras Aplicadas

- **Auditoría reproducible de tipos, pruebas y compilación:** se instalaron las dependencias con archivo de bloqueo y se ejecutaron las verificaciones locales sin modificar el código ni publicar cambios.
- **Valor:** se distinguió entre una aplicación que construye correctamente y una plataforma que puede operar procesos reales de forma segura, evitando un lanzamiento prematuro.

## 3. Hoja de Ruta para Escalabilidad (Priorizada)

1. **[Alta prioridad] Seguridad y persistencia administrativa:** proteger procedimientos, eliminar datos simulados y registrar todas las acciones de administración.
2. **[Alta prioridad] Ciclo real de viajes, pagos y despacho:** persistir cada transición de estado, añadir webhooks de pago y validar operaciones extremo a extremo.
3. **[Media prioridad] Observabilidad y rendimiento:** incorporar registros estructurados, alertas, copias de seguridad, límites de tasa y división de paquetes para reducir el tamaño inicial.
4. **[Media prioridad] Integraciones de producción:** elegir proveedores de mapas, correo y mensajería con contratos de producción y controles de coste.
5. **[Baja prioridad] Modernización estética:** continuar el rediseño visual una vez que los flujos críticos sean operables y seguros.

## Referencias internas

- `server/routers.ts`: composición de routers y procedimientos del panel superadministrador.
- `server/_core/trpc.ts`: definición de procedimientos públicos, protegidos y de administrador.
- `server/routers/localAuth.ts`: flujo de registro/inicio de sesión y asignación de roles.
- `server/routers/payments.ts`: creación de checkout de Stripe.
- `client/src/pages/AdminDashboard.tsx`: funciones del panel y datos simulados.
- `client/src/pages/DispatcherDashboard.tsx` y `client/src/pages/FleetDashboard.tsx`: datos y flujos de demostración.
- `server/_core/index.ts`: Socket.IO y política de CORS.
- `ENV_VARIABLES.md`: inventario de variables requeridas.
