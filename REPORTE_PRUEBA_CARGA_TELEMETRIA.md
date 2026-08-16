# Resumen de Ejecución y Entrega — Prueba de carga de telemetría

**Fecha de ejecución:** 16 de agosto de 2026  
**Entorno:** staging local aislado con MariaDB y Redis locales  
**Alcance:** telemetría de conductor autenticada mediante Socket.IO, Redis para última ubicación y un cliente observador por viaje.

## 1. Veredicto ejecutivo

La primera campaña controlada fue **satisfactoria** para el objetivo de beta local: el servidor sostuvo **500 conductores y 500 clientes observadores**, equivalentes a **1,000 conexiones Socket.IO simultáneas**, durante 60 segundos de telemetría a intervalos de cinco segundos. Se procesaron y entregaron correctamente las **6,798 actualizaciones** emitidas, sin errores de conexión, acknowledgements rechazados, pérdidas de broadcast ni residuos de datos de prueba.

| Indicador | Resultado de la ejecución final | Umbral inicial | Estado |
|---|---:|---:|---|
| Conductores conectados | 500 / 500 | 500 | Aprobado |
| Clientes conectados | 500 / 500 | 500 | Aprobado |
| Conexiones fallidas | 0 | < 1% | Aprobado |
| Actualizaciones enviadas | 6,798 | No aplica | Aprobado |
| Acknowledgements correctos | 6,798 / 6,798 | ≥ 99.9% | Aprobado |
| Broadcasts recibidos | 6,798 / 6,798 | ≥ 99.9% | Aprobado |
| Latencia de acknowledgement, p95 | 3 ms | < 250 ms | Aprobado |
| Latencia extremo a extremo, p95 | 3 ms | < 1,000 ms | Aprobado |
| Latencia extremo a extremo, p99 | 4 ms | < 2,000 ms | Aprobado |
| Claves Redis residuales | 0 | 0 | Aprobado |

> El resultado mide un entorno **local de una sola instancia**, donde generadores, servidor, Redis y base de datos comparten la misma máquina. Por lo tanto, valida la lógica, el protocolo y la capacidad local, pero **no es una medición representativa de latencia de Internet ni prueba aún el escalamiento horizontal**.

## 2. Errores encontrados y soluciones

| Error o riesgo detectado | Impacto | Solución aplicada | Verificación |
|---|---|---|---|
| Las primeras 200 conexiones devolvían `Unauthorized`. | El generador no podía probar la ruta real de autenticación. | Se configuró un `VITE_APP_ID` explícito en el entorno local de staging; el SDK exige que ese campo exista en el JWT de sesión. | La rampa posterior conectó 200/200 pares y la final 500/500 pares sin fallos. |
| El broadcast de ubicación no incluía la secuencia de la muestra. | El receptor no podía correlacionar un evento con el instante de emisión para medir latencia extremo a extremo. | Se añadió `sequence` al evento `trip_location` y el generador correlaciona por `tripId:sequence`. | La ejecución final registró 6,798 broadcasts correlacionados y 0 pérdidas. |
| Las ejecuciones de carga iniciales dejaban claves de última ubicación hasta su TTL. | Un staging repetido podía conservar posiciones efímeras de pruebas cerradas. | Se añadió limpieza explícita de las claves Redis de cada viaje simulado al finalizar el generador. | Tras la ejecución final: 0 claves `trip:*:location` y 0 claves `trip:*:sequence`. |
| No existía un módulo de telemetría ejecutable en el servidor. | El diseño anterior era documental; no se podía probar un flujo GPS real. | Se implementó el módulo de telemetría con autorización de conductor, TTL, muestreo a MySQL, secuencia y adapter Redis. | Tipos, 13 pruebas existentes, build y carga final aprobados. |

## 3. Mejoras aplicadas

### Servicio de telemetría de producción

Se creó `server/realtime/telemetry.ts` y se conectó a `server/_core/index.ts`. El servicio recibe `trip_location_update`, deriva la identidad desde el socket autenticado, confirma que el conductor sea el asignado al viaje y exige que el estado sea `accepted` o `in_progress`. Después valida coordenadas, precisión, reloj, frecuencia, secuencia y velocidad plausible antes de actualizar Redis y enviar la posición exclusivamente a la sala del viaje.

| Control | Comportamiento implementado | Valor operativo |
|---|---|---|
| Autorización | Solo un conductor autenticado y asignado puede publicar. | Impide suplantar la posición de otro taxi. |
| Aislamiento | Broadcast únicamente a la sala del viaje. | Evita exponer una flota global a clientes ajenos. |
| Orden | `sequence` creciente y descarte de paquetes antiguos. | Evita que una coordenada retrasada retroceda el marcador. |
| Calidad | Límite de precisión, antigüedad del reloj y velocidad plausible. | Reduce ruido y posiciones anómalas. |
| Redis | Última posición y secuencia con TTL de 120 segundos. | El estado se vence en ausencia de señal. |
| MySQL | Persistencia selectiva por distancia o intervalo. | Mantiene trazabilidad sin escribir cada paquete. |
| Recuperación | Snapshot al entrar en una sala autorizada. | Permite que el cliente se sincronice al reconectar. |

Socket.IO recomienda usar su cliente para generar muchas conexiones, ya que el protocolo maneja handshake, heartbeats y codificación propia. [1] La implementación usa `@socket.io/redis-adapter` para que los broadcasts puedan cruzar instancias al escalar. Redis debe mantenerse en red privada, con TLS, ACL y credenciales dedicadas; el adapter no firma ni cifra los mensajes por sí mismo. [2]

### Persistencia y configuración

Se añadió la migración `drizzle/0004_trip_telemetry.sql`, que crea `trip_location_samples` con índices por viaje/conductor y hora de captura. Se agregaron `REDIS_URL` y `TELEMETRY_ENABLED` a la plantilla de entorno y la validación de producción falla si se activa telemetría sin URL de Redis.

### Generador de carga reproducible

Se creó `scripts/run_telemetry_load.ts`. Este genera conductores, clientes y viajes aislados directamente en staging, firma sesiones reales, establece un socket para conductor y otro para cliente, publica telemetría, mide acknowledgement y broadcast extremo a extremo, borra actores sintéticos y limpia Redis al terminar.

## 4. Resultados de la campaña

| Ejecución | Sockets simultáneos | Telemetría | Acknowledgement p95 / p99 | E2E p95 / p99 | Resultado |
|---|---:|---:|---:|---:|---|
| Rampa inicial corregida | 400 (200 conductores + 200 clientes) | 2,615 eventos | 3 ms / 4 ms | 4 ms / 4 ms | Aprobado |
| Objetivo beta final | 1,000 (500 conductores + 500 clientes) | 6,798 eventos | 3 ms / 4 ms | 3 ms / 4 ms | Aprobado |

La carga final representa aproximadamente 100 actualizaciones de conductor por segundo durante el periodo estable, al usar 500 conductores con intervalo de cinco segundos. Cada actualización fue entregada a su cliente asignado y confirmada por el servidor.

La validación de software posterior a la carga también fue correcta.

| Validación | Resultado |
|---|---|
| `pnpm check` | Aprobado |
| `pnpm test` | 13 pruebas aprobadas en 5 archivos |
| `pnpm build` | Aprobado |
| `git diff --check` | Aprobado |
| Actores sintéticos restantes | 0 usuarios, 0 viajes, 0 muestras |
| Claves Redis de carga restantes | 0 de ubicación y 0 de secuencia |

## 5. Limitaciones de la prueba

La campaña no demuestra todavía una capacidad pública de producción de 500 conductores en Internet. Es una prueba de staging local que no incorpora latencia móvil, balanceador, TLS externo, pérdida de red móvil, múltiples nodos ni un proveedor de rutas activo.

| Alcance pendiente | Razón | Criterio para cerrarlo |
|---|---|---|
| Múltiples instancias Socket.IO | El test usó una sola instancia. | Dos o más instancias detrás de balanceador y cliente/conductor en nodos distintos. |
| Afinidad de sesión | No había balanceador. | Si se conserva `polling`, configurar sticky sessions. [3] |
| Soak test | La carga duró 60 segundos. | 2–4 horas con 300–500 conductores y revisión de memoria, Redis y MySQL. |
| Red real | Todo ocurrió en localhost. | Generadores en región/red distinta y dispositivos móviles representativos. |
| Fallos inducidos | No se desconectó Redis/MySQL ni se reinició un nodo. | Ensayos controlados de reconexión y degradación. |
| Seguridad bajo carga | No se mezclaron aún clientes maliciosos. | Clientes que intenten publicar viajes ajenos, secuencias repetidas y exceso de frecuencia. |

## 6. Hoja de ruta para escalabilidad (priorizada)

1. **Alta prioridad — prueba multiinstancia y persistencia.** Desplegar dos instancias del servidor detrás de un balanceador con Redis administrado/privado, ejecutar 500 conductores con cliente y conductor distribuidos entre nodos, y verificar que cada broadcast cruza el adapter. Si se mantiene HTTP long-polling, Socket.IO requiere afinidad de sesión. [3]
2. **Alta prioridad — soak y observabilidad.** Ejecutar 2–4 horas a 300–500 conductores y registrar métricas de conexiones activas, latencia p95/p99, CPU, RSS, GC, operaciones Redis, pool MySQL y claves vencidas. Los thresholds deben marcar automáticamente una ejecución como fallida cuando no alcance el SLO. [4]
3. **Alta prioridad — pruebas de autorización bajo carga.** Incluir 1–5% de clientes negativos que intenten enviar coordenadas sin rol, de otro viaje, con precisión baja o en una frecuencia superior al límite.
4. **Media prioridad — ejecución distribuida.** Usar máquinas generadoras externas y datos de red reales; la latencia local de 3–4 ms no representa la experiencia móvil.
5. **Media prioridad — ETA y mapas.** Probar la telemetría junto con el backend de rutas usando un mock primero y un presupuesto/alertas para el proveedor real después.
6. **Baja prioridad — partición por zona.** Si la flota crece, añadir segmentación operativa por ciudad/zona para dashboards de despacho y agregados, conservando la sala por viaje como límite de privacidad.

## 7. Archivos principales de la entrega

| Archivo | Finalidad |
|---|---|
| `server/realtime/telemetry.ts` | Servicio de telemetría con Socket.IO y Redis. |
| `scripts/run_telemetry_load.ts` | Generador reproducible de carga aislada. |
| `drizzle/0004_trip_telemetry.sql` | Migración de historial GPS. |
| `load-results/telemetry-1786903495795_23987.json` | Resultado de 200 conductores. |
| `load-results/telemetry-1786903712733_42285.json` | Resultado final de 500 conductores. |

## Referencias

[1]: https://socket.io/docs/v4/load-testing/ "Load testing — Socket.IO"
[2]: https://socket.io/docs/v4/redis-adapter/ "Redis adapter — Socket.IO"
[3]: https://socket.io/docs/v4/using-multiple-nodes/ "Using multiple nodes — Socket.IO"
[4]: https://grafana.com/docs/k6/latest/using-k6/thresholds/ "Thresholds — Grafana k6"
