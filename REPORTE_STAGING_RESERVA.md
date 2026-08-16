# Reporte de staging y prueba de reserva — SayTaxi

**Fecha de ejecución:** 16 de agosto de 2026  
**Entorno:** staging local aislado en el sandbox  
**Estado:** configuración inicial completada y flujo de reserva persistente validado.

## Resultado ejecutivo

Se preparó una instancia aislada de MariaDB para staging, se aplicaron las cuatro migraciones registradas y se ejecutó dos veces un recorrido completo de reserva con identidades de prueba. Cada ejecución creó cuentas nuevas de cliente, conductor y despachador; generó una solicitud desde el cliente; confirmó su aparición en la cola de despacho; asignó un conductor; inició el viaje y lo completó. Los estados finales y sus marcas de tiempo se verificaron directamente en la base de datos.

> El entorno creado es **local y temporal**: no es un despliegue público, no tiene URL HTTPS externa y no está conectado a Stripe, correo, WhatsApp, mapas comerciales ni pagos reales. No se publicaron cambios en GitHub ni se aplicaron modificaciones a una base de producción.

| Componente | Configuración o prueba ejecutada | Resultado |
|---|---|---|
| Base de datos | MariaDB 10.11 local; base aislada `saytaxi_staging`. | Correcto |
| Aislamiento | Usuario de base exclusivo para staging y archivo de entorno fuera del repositorio, con permisos `0600`. | Correcto |
| Migraciones | Versiones `0000` a `0003` registradas en `__drizzle_migrations`. | 4 migraciones aplicadas |
| Modelo operativo | Usuarios, clientes, conductores, vehículos, despachadores, viajes y nuevos modelos de seguridad/facturación. | Correcto |
| Recorrido de reserva | Solicitud, cola, asignación, inicio y finalización. | 2 de 2 ejecuciones correctas |
| Verificaciones complementarias | `pnpm check`, 13 pruebas automatizadas y `pnpm build`. | Correcto |

## Flujo probado

La prueba reutilizable se encuentra en `scripts/run_staging_reservation_test.ts`. Está diseñada para usar una `DATABASE_URL` de staging y crear datos con un identificador único en cada ejecución. Con ello no depende de datos preexistentes y deja evidencia de cada transición en la tabla `trips`.

| Paso | Actor | Operación persistente comprobada | Estado esperado |
|---|---|---|---|
| 1 | Cliente | `tripOperations.requestTrip` crea una solicitud con origen y destino, calcula distancia y tarifa en el servidor y la guarda. | `requested` |
| 2 | Despachador | `dispatcherOperations.listQueue` devuelve la solicitud recién creada y valida que el despacho tenga permiso activo. | Visible en cola |
| 3 | Despachador | `dispatcherOperations.assignTrip` asigna un conductor activo y cambia el origen de la asignación a `dispatcher`. | `accepted` |
| 4 | Conductor | `tripOperations.startTrip` valida que el viaje pertenece al conductor y pasa al recorrido activo. | `in_progress` |
| 5 | Conductor | `tripOperations.completeTrip` termina el viaje; para pago en efectivo marca el pago como completado. | `completed` |
| 6 | Base de datos | Se consulta el viaje resultante y sus marcas de tiempo. | Conductor asignado, pago completado y cuatro hitos registrados |

## Evidencia de las ejecuciones

| Ejecución | Viaje | Distancia | Tarifa | Método de pago | Estado final | Origen final |
|---|---:|---:|---:|---|---|---|
| 1 | `1` | `10.26 km` | `14.82` | Efectivo | `completed` | `dispatcher` |
| 2 | `2` | `10.26 km` | `14.82` | Efectivo | `completed` | `dispatcher` |

La consulta final a staging confirmó que ambos viajes tienen conductor asignado y que `requestedAt`, `acceptedAt`, `startedAt` y `completedAt` no son nulos. También verificó que `paymentStatus` pasó a `completed` para los dos viajes en efectivo.

## Cambios necesarios para habilitar la prueba

Para que la reserva fuera verificable desde el servidor se incorporaron operaciones persistentes de viaje en `server/routers/tripOperations.ts`. El cliente puede crear una solicitud si posee un perfil de cliente, mientras que solo un conductor activo puede iniciar o completar un viaje asignado. La asignación continúa protegida por el perfil y los permisos de despacho en `server/routers/dispatcherOperations.ts`.

La utilidad `rawMutate` ahora devuelve el identificador de inserción cuando existe. Esto permite que la API y la prueba rastreen de forma exacta el viaje recién creado sin depender de consultas imprecisas. El enrutador principal incorpora las nuevas operaciones bajo `tripOperations`.

| Archivo | Cambio aplicado |
|---|---|
| `server/db.ts` | Devuelve `insertId` además de filas afectadas para mutaciones de inserción. |
| `server/routers/tripOperations.ts` | Añade solicitud de viaje, inicio y finalización con validación de rol y propiedad. |
| `server/routers.ts` | Registra las operaciones de viaje. |
| `scripts/run_staging_reservation_test.ts` | Crea datos aislados y ejecuta el recorrido de prueba reproducible. |
| `/home/ubuntu/.saytaxi_staging.env` | Guarda la configuración local de staging fuera del repositorio con permisos restringidos. |

## Errores encontrados y soluciones

| Problema | Solución aplicada |
|---|---|
| MariaDB no estaba instalado ni iniciado. | Se instaló MariaDB y se inició el servicio local para staging. |
| La cuenta `root` requería autenticación por socket del sistema. | La creación de base y usuario se realizó mediante administración local con privilegios del sistema. |
| El comando de migración finalizó sin completar `0003`. | Se validó el estado de migraciones, se aplicó `0003_secure_user_roles.sql` sobre la base aislada y se registró su hash en el historial de Drizzle. |
| La primera prueba mostró éxito pero mantuvo el proceso abierto por conexiones del pool de aplicación. | La prueba de staging termina explícitamente al cerrar su conexión de MySQL; la segunda ejecución finalizó limpiamente. |
| El archivo de entorno local apareció como no rastreado en el repositorio. | Se trasladó fuera del repositorio y se restringió a permisos `0600`. |

## Límites actuales del staging

La prueba ejecutada recorre las operaciones reales de aplicación mediante tRPC y una base de datos real de staging. No sustituye aún una prueba navegada por navegador ni prueba las integraciones de terceros. El proyecto todavía requiere una fase de staging hospedado antes de operar con usuarios externos.

| Área pendiente | Requisito antes de beta externa |
|---|---|
| Interfaz de cliente | Conectar la pantalla de solicitud de viaje a `tripOperations.requestTrip` y probarla mediante navegador. |
| Pagos con tarjeta | Cargar claves sandbox de Stripe, registrar webhook HTTPS y validar un evento firmado. |
| Mapas | Configurar un proveedor apto para producción y validar geocodificación/rutas. |
| Notificaciones | Integrar proveedor de correo, push o WhatsApp con trazabilidad de entrega. |
| Tiempo real | Arrancar el servidor staging, conectar dos sesiones autenticadas y validar Socket.IO por viaje. |
| Despliegue externo | Publicar un entorno de staging con HTTPS, secretos administrados, copias de seguridad, monitoreo y restricciones de acceso. |

## Hoja de ruta priorizada

1. **Alta prioridad — staging hospedado y pruebas de navegador.** Publicar un entorno restringido por HTTPS, conectar la interfaz real de cliente y ejecutar el recorrido de reserva desde sesiones independientes de cliente, despachador y conductor. Esto comprueba no solo el servidor, sino también la experiencia visible.
2. **Alta prioridad — integraciones de pago y comunicación en sandbox.** Configurar Stripe de pruebas, un proveedor de notificaciones y el webhook firmado. Esto permite verificar cobros, estados y avisos sin riesgo financiero.
3. **Media prioridad — pruebas E2E automatizadas.** Convertir este recorrido de staging en una suite de navegador que cubra autorización, reserva, asignación, cancelación y cierre. Esto reduce regresiones en versiones futuras.
4. **Media prioridad — observabilidad.** Añadir registro estructurado, trazas por identificador de viaje, alertas de error y panel de salud de dependencias.
5. **Baja prioridad — optimización del cliente.** Dividir la carga de paneles, mapas y gráficas para reducir el paquete principal antes de escalar tráfico.

## Conclusión

La configuración inicial de staging y la prueba completa de reserva fueron exitosas. La aplicación demostró persistencia y transiciones correctas para el ciclo **solicitud → despacho → asignación → inicio → finalización**, con control de roles y auditoría temporal en una base aislada. El siguiente hito recomendado es un staging hospedado con la interfaz de cliente conectada y proveedores sandbox configurados.
