import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { DEFAULT_SITE_CONFIG, useSiteConfig } from "@/contexts/SiteConfigContext";
import { ArrowLeft, FileText, ShieldCheck, Building2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

function getSlug(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

type FooterMeta = {
  category: string;
  lead: string;
  highlights: string[];
  accent: string;
};

type FooterPage = {
  title: string;
  content: string;
};

const footerMeta: Record<string, FooterMeta> = {
  about: {
    category: "Empresa",
    lead: "Conoce nuestra historia, enfoque operativo y compromiso con empresas de taxi en crecimiento.",
    highlights: ["Operacion estable", "Enfoque SaaS", "Equipo especializado"],
    accent: "oklch(0.74 0.16 148)",
  },
  changelog: {
    category: "Producto",
    lead: "Transparencia total sobre mejoras, ajustes y nuevas capacidades de la plataforma.",
    highlights: ["Nuevas funciones", "Rendimiento", "Correcciones"],
    accent: "oklch(0.7 0.13 210)",
  },
  roadmap: {
    category: "Producto",
    lead: "La direccion estrategica del producto para crecer tu operacion con menos friccion.",
    highlights: ["Escalabilidad", "Automatizacion", "Integraciones"],
    accent: "oklch(0.68 0.15 260)",
  },
  blog: {
    category: "Recursos",
    lead: "Ideas practicas para mejorar conversion, retention y eficiencia de tu flotilla.",
    highlights: ["Contenido practico", "Casos reales", "Playbooks"],
    accent: "oklch(0.72 0.14 190)",
  },
  careers: {
    category: "Empresa",
    lead: "Buscamos talento que quiera construir tecnologia util para movilidad real en LATAM.",
    highlights: ["Impacto real", "Cultura de ownership", "Trabajo orientado a resultados"],
    accent: "oklch(0.73 0.16 140)",
  },
  press: {
    category: "Empresa",
    lead: "Informacion para medios, prensa y aliados estrategicos.",
    highlights: ["Kit de marca", "Contacto directo", "Datos institucionales"],
    accent: "oklch(0.74 0.11 230)",
  },
  docs: {
    category: "Recursos",
    lead: "Documentacion operativa para poner en marcha y escalar tu plataforma con confianza.",
    highlights: ["Implementacion", "Configuracion", "Buenas practicas"],
    accent: "oklch(0.72 0.13 170)",
  },
  guides: {
    category: "Recursos",
    lead: "Guias accionables para equipos de operacion, administracion y dispatch.",
    highlights: ["Playbooks", "KPIs", "Ejecucion diaria"],
    accent: "oklch(0.71 0.14 120)",
  },
  privacy: {
    category: "Legal",
    lead: "Politica clara sobre datos, privacidad y controles de seguridad para tu operacion.",
    highlights: ["Proteccion de datos", "Uso responsable", "Cumplimiento"],
    accent: "oklch(0.71 0.14 145)",
  },
  terms: {
    category: "Legal",
    lead: "Condiciones de uso para operar con claridad entre empresa, conductores y clientes.",
    highlights: ["Reglas de uso", "Responsabilidades", "Disponibilidad"],
    accent: "oklch(0.72 0.12 260)",
  },
  cookies: {
    category: "Legal",
    lead: "Informacion sobre cookies y tecnologias similares para mejorar experiencia y analitica.",
    highlights: ["Sesion", "Preferencias", "Analitica"],
    accent: "oklch(0.73 0.13 90)",
  },
  gdpr: {
    category: "Legal",
    lead: "Enfoque de cumplimiento para operaciones con usuarios y datos en contextos internacionales.",
    highlights: ["Acceso", "Rectificacion", "Eliminacion"],
    accent: "oklch(0.69 0.15 220)",
  },
  arbitration: {
    category: "Legal",
    lead: "Acuerdo de arbitraje vinculante para resolucion de disputas bajo reglas AAA.",
    highlights: ["Binding arbitration", "Class action waiver", "Orlando, Florida"],
    accent: "oklch(0.72 0.13 250)",
  },
  "zero-tolerance": {
    category: "Legal",
    lead: "Politica de tolerancia cero para seguridad de pasajeros y conductores en la plataforma.",
    highlights: ["No discriminacion", "No acoso", "Cero alcohol/drogas"],
    accent: "oklch(0.74 0.14 25)",
  },
  "insurance-requirements": {
    category: "Legal",
    lead: "Requisitos minimos de seguro para operar como conductor independiente en la plataforma.",
    highlights: ["Poliza vigente", "Rideshare endorsement", "Responsabilidad del conductor"],
    accent: "oklch(0.72 0.11 120)",
  },
  "driver-subscription-agreement": {
    category: "Legal",
    lead: "Contrato de suscripcion SaaS para conductores independientes, sin relacion laboral.",
    highlights: ["Acceso al software", "Renovacion automatica", "Responsabilidad fiscal 1099"],
    accent: "oklch(0.71 0.12 180)",
  },
  support: {
    category: "Recursos",
    lead: "Canales oficiales de soporte para pasajeros, conductores y empresas usuarias del software.",
    highlights: ["Email", "WhatsApp", "SLA prioritario"],
    accent: "oklch(0.73 0.11 205)",
  },
};

const footerPageTitles: Record<string, string> = {
  about: "Sobre nosotros",
  changelog: "Changelog",
  roadmap: "Roadmap",
  blog: "Blog",
  careers: "Carreras",
  press: "Prensa",
  docs: "Documentacion",
  guides: "Guias",
  privacy: "Politica de Privacidad",
  terms: "Terminos de Servicio",
  cookies: "Politica de Cookies",
  gdpr: "Cumplimiento GDPR",
  arbitration: "Acuerdo de Arbitraje",
  "zero-tolerance": "Politica de Tolerancia Cero",
  "insurance-requirements": "Requisitos de Seguro para Conductores",
  "driver-subscription-agreement": "Contrato de Suscripcion para Conductores",
  support: "Soporte",
};

const fallbackFooterPageContent: Record<string, string> = {
  about: `
<h2>Quienes somos</h2>
<p>Passenger es una compania de infraestructura de software para movilidad privada y operaciones de flotilla. Nuestra plataforma integra onboarding, despacho, tracking, pagos, seguridad operacional, cumplimiento documental y analitica ejecutiva en una sola experiencia.</p>
<p>El objetivo de Passenger es simple: permitir que empresas de movilidad y conductores independientes operen con calidad enterprise sin aumentar su complejidad diaria. Diseñamos procesos digitales claros para que cada area del negocio tenga trazabilidad: operaciones, legal, finanzas, soporte y crecimiento.</p>

<h2>Lo que hacemos</h2>
<ul>
  <li><strong>Infraestructura SaaS:</strong> plataforma multi-rol para pasajero, conductor, dispatcher, flotilla y super admin.</li>
  <li><strong>Orquestacion operativa:</strong> estados de viaje, eventos auditables, bitacora de decisiones y historico de interacciones.</li>
  <li><strong>Cumplimiento visible:</strong> politicas legales publicas, documentos de responsabilidad y controles administrativos.</li>
  <li><strong>Ejecucion con datos:</strong> dashboards para conversion, tiempos de aceptacion, cancelaciones, SLA y rendimiento.</li>
</ul>

<h2>Nuestro enfoque</h2>
<p>No operamos como una central de transporte tradicional. Construimos y mantenemos la capa tecnologica que permite a terceros operar con estandares profesionales. Esta separacion entre infraestructura y operacion reduce riesgos, mejora gobierno interno y acelera escalabilidad.</p>
<p>Passenger prioriza seguridad, resiliencia y claridad legal. Cada mejora de producto busca un impacto medible en experiencia, costos operativos y cumplimiento.</p>

<h2>Compromiso de largo plazo</h2>
<p>La compania invierte en arquitectura robusta, observabilidad, seguridad de datos y ciclos de mejora continua. Nuestro roadmap esta alineado con crecimiento sostenible, expansion regional y capacidad de adaptacion regulatoria para distintos estados y paises.</p>
`,
  changelog: `
<h2>Politica de cambios de producto</h2>
<p>Passenger publica cambios de producto de forma transparente para que clientes empresariales y conductores comprendan impacto funcional, riesgos de migracion y beneficios esperados. El changelog es parte de nuestro control de calidad y gobierno de plataforma.</p>

<h2>Categorias de cambios</h2>
<ul>
  <li><strong>Nuevas capacidades:</strong> funciones que amplian cobertura operativa o mejoran conversion.</li>
  <li><strong>Mejoras UX/UI:</strong> ajustes premium de interfaz sin alterar la esencia visual del producto.</li>
  <li><strong>Correcciones:</strong> fixes funcionales, estabilidad y reduccion de errores de flujo.</li>
  <li><strong>Seguridad y cumplimiento:</strong> controles legales, privacidad y endurecimiento de acceso.</li>
</ul>

<h2>Reglas de versionado</h2>
<p>Aplicamos una politica semantica para diferenciar cambios compatibles, cambios de comportamiento y ajustes de mantenimiento. Cuando un cambio puede afectar procesos existentes, se documenta con recomendaciones de adopcion y validacion.</p>

<h2>Garantia operativa</h2>
<p>Antes de publicar una version, validamos rutas criticas entre paneles: login, registro, panel cliente, panel conductor, panel flotilla, panel dispatcher, super admin y flujo legal del footer. Esta disciplina evita regresiones y protege la continuidad del negocio.</p>
`,
  roadmap: `
<h2>Direccion estrategica</h2>
<p>El roadmap de Passenger se estructura en tres ejes: confiabilidad operativa, inteligencia de negocio y expansion empresarial. Cada iniciativa se prioriza por impacto en ingresos, seguridad y eficiencia.</p>

<h2>Eje 1: Confiabilidad operativa</h2>
<ul>
  <li>Mejoras de latencia en asignacion y confirmacion de viajes.</li>
  <li>Mayor tolerancia a fallos en servicios criticos y colas de eventos.</li>
  <li>Observabilidad por rol con alertas accionables para soporte y operaciones.</li>
</ul>

<h2>Eje 2: Inteligencia y automatizacion</h2>
<ul>
  <li>Modelos de scoring de conductores y prediccion de demanda por zona.</li>
  <li>Recomendaciones de tarifa dinamica con controles administrativos.</li>
  <li>Automatizaciones de cumplimiento documental y vencimientos.</li>
</ul>

<h2>Eje 3: Escalabilidad comercial</h2>
<ul>
  <li>Capas multi-tenant robustas para crecimiento por pais y ciudad.</li>
  <li>Plantillas legales por jurisdiccion (incluyendo marcos de EE.UU.).</li>
  <li>Integraciones financieras y herramientas de revenue assurance.</li>
</ul>

<p>La hoja de ruta se revisa periodicamente con base en datos de uso real y feedback de clientes empresariales.</p>
`,
  blog: `
<h2>Centro editorial Passenger</h2>
<p>El blog de Passenger publica analisis operativos, guias de crecimiento y marcos de cumplimiento para companias de movilidad. No es contenido promocional vacio: es documentacion accionable para equipos de direccion, operaciones y producto.</p>

<h2>Lineas de contenido</h2>
<ul>
  <li>Estrategia de despacho y reduccion de tiempos de espera.</li>
  <li>Economia unitaria para flotillas y gestion de comisiones.</li>
  <li>Seguridad operacional y politicas de tolerancia cero.</li>
  <li>Retencion de conductores y mejora de experiencia del pasajero.</li>
</ul>

<h2>Estilo y estandar</h2>
<p>Cada articulo incluye contexto, problema, decisiones, riesgos y pasos de implementacion. Priorizamos claridad ejecutiva y utilidad operativa para que el contenido sirva como manual de trabajo real.</p>
`,
  careers: `
<h2>Carreras en Passenger</h2>
<p>Buscamos talento que quiera construir infraestructura critica para movilidad. Nuestro entorno exige excelencia tecnica, criterio de producto y responsabilidad operativa.</p>

<h2>Principios culturales</h2>
<ul>
  <li><strong>Ownership:</strong> cada equipo lidera resultados de punta a punta.</li>
  <li><strong>Claridad:</strong> decisiones documentadas y medibles.</li>
  <li><strong>Calidad:</strong> lanzamientos con estandares enterprise.</li>
  <li><strong>Respeto legal:</strong> cumplimiento como parte del producto, no como anexo.</li>
</ul>

<h2>Perfiles prioritarios</h2>
<p>Ingenieria full-stack, plataforma backend, seguridad aplicada, operaciones de producto, experiencia de usuario y analitica. Valoramos perfiles que sepan balancear velocidad con confiabilidad.</p>
`,
  press: `
<h2>Prensa y aliados institucionales</h2>
<p>Passenger mantiene canales oficiales para prensa, analistas y socios estrategicos. Compartimos informacion corporativa verificable sobre producto, cobertura funcional, enfoque de cumplimiento y evolucion de la plataforma.</p>

<h2>Informacion disponible</h2>
<ul>
  <li>Descripcion corporativa y posicionamiento de infraestructura SaaS.</li>
  <li>Material visual de marca y lineamientos de uso.</li>
  <li>Datos de producto y casos de implementacion.</li>
  <li>Contacto institucional para comunicados y entrevistas.</li>
</ul>

<p>Para solicitudes editoriales, prepara contexto, alcance y fecha objetivo para respuesta oportuna del equipo.</p>
`,
  docs: `
<h2>Documentacion oficial</h2>
<p>La documentacion de Passenger define como implementar, operar y gobernar la plataforma en ambientes reales. Esta base cubre configuracion inicial, modelos de datos, roles, seguridad y mejores practicas.</p>

<h2>Bloques principales</h2>
<ul>
  <li>Configuracion del sistema y variables de entorno.</li>
  <li>Flujos por rol: cliente, conductor, flotilla, dispatcher y super admin.</li>
  <li>Politicas de acceso, sesiones y auditoria.</li>
  <li>Runbooks de incidentes y continuidad operativa.</li>
</ul>

<h2>Uso recomendado</h2>
<p>Para implementaciones empresariales, sugerimos adoptar un ciclo de pruebas por entorno, checklist legal y revision mensual de configuraciones criticas.</p>
`,
  guides: `
<h2>Guias operativas</h2>
<p>Las guias de Passenger convierten capacidades tecnicas en procedimientos de trabajo para operaciones diarias. Cada guia esta orientada a reducir errores de ejecucion y aumentar estandarizacion.</p>

<h2>Guias clave</h2>
<ul>
  <li>Activacion de conductores y validacion documental.</li>
  <li>Configuracion de tarifas y politicas comerciales.</li>
  <li>Gestion de incidencias y escalamiento por severidad.</li>
  <li>Monitoreo de KPIs: aceptacion, cancelacion, NPS, SLA.</li>
</ul>

<p>Estas guias se alinean con una operacion profesional de escala y estan pensadas para equipos de alto rendimiento.</p>
`,
  privacy: `
<h2>Politica de Privacidad de Passenger</h2>
<p><strong>Ultima actualizacion:</strong> Agosto 2026. Esta politica describe como Passenger, en su rol de proveedor de software e infraestructura digital, recopila, usa, conserva y protege informacion personal en los servicios web y paneles administrativos de la plataforma.</p>

<h2>1. Alcance</h2>
<p>Esta politica aplica a usuarios que interactuan con Passenger como pasajeros, conductores, personal operativo, empresas cliente y visitantes del sitio. Passenger presta servicios de software; la operacion de transporte es ejecutada por terceros independientes segun su propia regulacion local.</p>

<h2>2. Datos que podemos tratar</h2>
<ul>
  <li>Datos de identidad y contacto: nombre, correo, telefono, identificadores de cuenta.</li>
  <li>Datos operativos: eventos de viaje, estados de solicitud, tiempos, referencias de pago.</li>
  <li>Datos tecnicos: direccion IP, navegador, dispositivo, logs de aplicacion y telemetria.</li>
  <li>Datos de cumplimiento: evidencia documental requerida por el cliente empresarial.</li>
</ul>

<h2>3. Finalidades del tratamiento</h2>
<ul>
  <li>Operacion y mantenimiento de la plataforma.</li>
  <li>Seguridad, prevencion de fraude y auditoria.</li>
  <li>Soporte tecnico, mejora continua y analitica agregada.</li>
  <li>Cumplimiento de obligaciones legales y regulatorias aplicables.</li>
</ul>

<h2>4. Bases legales (EE.UU. y marcos internacionales)</h2>
<p>El tratamiento puede basarse en ejecucion contractual, interes legitimo operacional, consentimiento cuando corresponda y cumplimiento normativo. Cuando aplique GDPR u otros marcos equivalentes, Passenger implementa controles para derechos del titular.</p>

<h2>5. Comparticion de datos</h2>
<p>Passenger puede compartir datos con proveedores de infraestructura, servicios de autenticacion, mensajeria, pagos y herramientas anti-fraude bajo obligaciones contractuales de confidencialidad y seguridad. No vendemos datos personales.</p>

<h2>6. Retencion y seguridad</h2>
<p>Conservamos informacion por el tiempo necesario para operar, auditar y cumplir obligaciones legales. Aplicamos medidas tecnicas y organizativas razonables: control de acceso, segregacion por rol, cifrado en transito, monitoreo y respaldo.</p>

<h2>7. Derechos de los titulares</h2>
<p>Dependiendo de la jurisdiccion, el titular puede solicitar acceso, correccion, eliminacion, restriccion u oposicion al tratamiento. Las solicitudes se atienden dentro de plazos razonables y conforme a ley aplicable.</p>

<h2>8. Menores de edad</h2>
<p>La plataforma no esta dirigida a menores de edad sin autorizacion valida del responsable legal, cuando la ley lo requiera.</p>

<h2>9. Contacto de privacidad</h2>
<p>Para consultas o solicitudes de privacidad, utiliza los canales oficiales de soporte publicados en esta web.</p>
`,
  terms: `
<h2>Terminos de Servicio</h2>
<p><strong>Ultima actualizacion:</strong> Agosto 2026. Estos terminos regulan el acceso y uso de Passenger como servicio de software (SaaS). Al usar la plataforma, aceptas estas condiciones y cualquier politica vinculada publicada en las secciones legales.</p>

<h2>1. Naturaleza del servicio</h2>
<p>Passenger ofrece tecnologia para orquestar operaciones de movilidad. Passenger no actua como transportista, operador de flota ni empleador de conductores. La prestacion del transporte es responsabilidad de terceros independientes.</p>

<h2>2. Cuentas y seguridad</h2>
<p>El usuario es responsable de la veracidad de datos de registro, custodia de credenciales y actividad en su cuenta. Passenger puede suspender cuentas por uso indebido, fraude, actividades ilicitas o riesgo operativo.</p>

<h2>3. Uso permitido</h2>
<ul>
  <li>Cumplir leyes aplicables y terminos de la plataforma.</li>
  <li>No interferir con la disponibilidad, integridad o seguridad del sistema.</li>
  <li>No realizar acceso automatizado no autorizado o scraping abusivo.</li>
  <li>No usar la plataforma para actividades ilicitas, discriminatorias o peligrosas.</li>
</ul>

<h2>4. Propiedad intelectual</h2>
<p>El software, interfaces, marcas y contenido de Passenger estan protegidos por derechos de propiedad intelectual. El cliente recibe una licencia de uso limitada, no exclusiva y revocable segun contrato.</p>

<h2>5. Limitacion de responsabilidad</h2>
<p>En la maxima medida permitida por ley, Passenger no sera responsable por daños indirectos, incidentales o lucro cesante derivados del uso de la plataforma. La responsabilidad total agregada se limita al monto efectivamente pagado por el cliente por el servicio en el periodo definido contractualmente.</p>

<h2>6. Disponibilidad y cambios</h2>
<p>Passenger puede actualizar funciones, interfaces y politicas para mejorar seguridad y rendimiento. Se procura continuidad operativa y comunicacion razonable de cambios relevantes.</p>

<h2>7. Ley aplicable</h2>
<p>Salvo pacto expreso en contrario, los terminos se interpretan conforme a ley del Estado de Florida y normativa federal de EE.UU. aplicable.</p>
`,
  cookies: `
<h2>Politica de Cookies</h2>
<p>Passenger utiliza cookies y tecnologias similares para mantener sesiones, recordar preferencias, reforzar seguridad y analizar rendimiento del producto.</p>

<h2>Tipos de cookies</h2>
<ul>
  <li><strong>Esenciales:</strong> autenticacion, seguridad y funciones basicas de navegacion.</li>
  <li><strong>Preferencias:</strong> idioma, configuraciones de interfaz y elecciones del usuario.</li>
  <li><strong>Analitica:</strong> medicion de uso para mejorar experiencia y estabilidad.</li>
</ul>

<h2>Control del usuario</h2>
<p>Puedes configurar tu navegador para bloquear o eliminar cookies; sin embargo, ciertas funciones de la plataforma podrian degradarse o no estar disponibles.</p>

<h2>Retencion</h2>
<p>El tiempo de retencion depende de la finalidad de cada cookie y del marco legal aplicable. Las cookies de sesion se eliminan al cerrar sesion o expirar.</p>
`,
  gdpr: `
<h2>Cumplimiento GDPR y marcos internacionales</h2>
<p>Aunque Passenger opera principalmente como proveedor de software para clientes empresariales, aplica controles de privacidad alineados con principios de minimizacion, proporcionalidad, seguridad y responsabilidad demostrable.</p>

<h2>Derechos del titular</h2>
<ul>
  <li>Acceso a datos personales tratados.</li>
  <li>Rectificacion de datos inexactos.</li>
  <li>Supresion cuando proceda legalmente.</li>
  <li>Limitacion u oposicion al tratamiento.</li>
  <li>Portabilidad en contextos aplicables.</li>
</ul>

<h2>Transferencias y proveedores</h2>
<p>Cuando se utilicen subprocesadores o transferencias internacionales, Passenger adopta salvaguardas contractuales y medidas tecnicas razonables para proteger la informacion.</p>

<h2>Gobernanza</h2>
<p>Las solicitudes se gestionan con trazabilidad y respuesta en plazos razonables segun la jurisdiccion del solicitante y obligaciones aplicables.</p>
`,
  arbitration: `
<h2>Acuerdo de Arbitraje (Florida, EE.UU.)</h2>
<p>Este acuerdo establece que, salvo excepciones legales, las controversias relacionadas con el uso de Passenger se resolveran mediante arbitraje individual y vinculante, en lugar de litigio judicial ordinario.</p>

<h2>1. Alcance de disputas</h2>
<p>Incluye reclamaciones contractuales, extracontractuales, de consumo, tecnologia o cualquier disputa vinculada al acceso y uso de la plataforma, en la medida permitida por ley.</p>

<h2>2. Renuncia a acciones colectivas</h2>
<p>Las partes acuerdan resolver disputas de forma individual. No se permiten class actions, representative actions ni procedimientos colectivos, salvo que una norma imperativa establezca lo contrario.</p>

<h2>3. Reglas de arbitraje</h2>
<p>El procedimiento podra administrarse conforme a reglas comerciales de la American Arbitration Association (AAA) o reglas equivalentes pactadas por las partes, con sede principal en Orlando, Florida, salvo acuerdo distinto por escrito.</p>

<h2>4. Ley aplicable y jurisdiccion de apoyo</h2>
<p>El acuerdo se interpreta bajo ley del Estado de Florida y Federal Arbitration Act (FAA), segun corresponda. Cualquier accion judicial de apoyo, ejecucion o medidas cautelares se presentara ante tribunales competentes en Florida.</p>

<h2>5. Excepciones</h2>
<p>No obstante lo anterior, cualquiera de las partes puede solicitar medidas cautelares urgentes para proteger secretos comerciales, propiedad intelectual o seguridad de la plataforma.</p>
`,
  "zero-tolerance": `
<h2>Politica de Tolerancia Cero</h2>
<p>Passenger exige un estandar estricto de conducta para todos los actores que usan la infraestructura de software. Esta politica busca prevenir abuso, acoso, discriminacion, violencia y conductas de alto riesgo.</p>

<h2>Conductas prohibidas</h2>
<ul>
  <li>Acoso verbal o fisico, amenazas o intimidacion.</li>
  <li>Discriminacion por raza, genero, orientacion sexual, religion, nacionalidad o discapacidad.</li>
  <li>Conduccion bajo influencia de alcohol o drogas.</li>
  <li>Uso de la plataforma para actividades delictivas.</li>
</ul>

<h2>Aplicacion</h2>
<p>Ante reportes verificados, Passenger y/o el cliente empresarial podran suspender acceso, limitar funcionalidades, escalar incidentes a autoridades y conservar evidencia para auditoria y cumplimiento legal.</p>

<h2>Canales de reporte</h2>
<p>Los incidentes deben reportarse por canales oficiales de soporte con fecha, hora, ubicacion y descripcion objetiva del evento para su evaluacion y respuesta.</p>
`,
  "insurance-requirements": `
<h2>Requisitos de Seguro para Conductores (EE.UU./Florida)</h2>
<p>Los conductores que utilicen la plataforma deben mantener cobertura de seguro vigente conforme a ley local y condiciones comerciales del cliente empresarial que opera el servicio de movilidad.</p>

<h2>Requisitos minimos esperados</h2>
<ul>
  <li>Poliza de auto vigente emitida por aseguradora autorizada.</li>
  <li>Cobertura de responsabilidad civil corporal y de propiedad segun minimos estatales.</li>
  <li>Cuando aplique, endorsement o cobertura especifica para rideshare/TNC.</li>
  <li>Evidencia documental actualizada y verificable.</li>
</ul>

<h2>Responsabilidad del conductor</h2>
<p>El conductor es responsable de mantener su cobertura activa, veraz y suficiente. La falta de seguro adecuado puede derivar en suspension inmediata de acceso y otras medidas contractuales.</p>

<h2>Rol de Passenger</h2>
<p>Passenger no actua como aseguradora ni como garante de coberturas. Passenger provee software y controles de registro documental, pero la validez de la poliza y su mantenimiento corresponde al conductor y/o al operador de flotilla.</p>
`,
  "driver-subscription-agreement": `
<h2>Contrato de Suscripcion para Conductores</h2>
<p>Este acuerdo regula el acceso de conductores independientes a la plataforma Passenger como servicio de software. No constituye contrato laboral, franquicia, joint venture ni relacion de agencia.</p>

<h2>1. Naturaleza de la relacion</h2>
<p>El conductor utiliza herramientas tecnologicas para gestionar solicitudes y operacion digital. El conductor decide su disponibilidad, acepta o rechaza oportunidades y asume su cumplimiento legal, fiscal y operativo.</p>

<h2>2. No responsabilidad sobre transporte</h2>
<p>Passenger es proveedor de software. Passenger no presta transporte, no controla la conduccion, no administra vehiculos y no asume responsabilidad directa por incidentes de viaje entre terceros, salvo obligaciones legales no renunciables.</p>

<h2>3. Tarifas y suscripcion</h2>
<p>El acceso puede requerir pago de suscripcion o comision segun plan vigente. Los cargos, renovaciones y condiciones se informan en panel y/o acuerdo comercial aplicable.</p>

<h2>4. Obligaciones del conductor</h2>
<ul>
  <li>Mantener licencias, permisos, documentos y seguros vigentes.</li>
  <li>Cumplir normas de seguridad, trato digno y legalidad.</li>
  <li>No manipular tarifas, identidad ni eventos operativos.</li>
  <li>Respetar politicas de privacidad y uso de datos.</li>
</ul>

<h2>5. Fiscalidad y clasificacion</h2>
<p>El conductor es responsable de sus obligaciones tributarias y de su clasificacion como contratista independiente cuando corresponda. Passenger no retiene ni declara impuestos del conductor salvo mandato legal especifico.</p>

<h2>6. Terminacion</h2>
<p>Passenger o el operador cliente podran suspender o terminar acceso por incumplimientos graves, fraude, riesgos de seguridad, falta documental o violaciones de politicas criticas.</p>
`,
  support: `
<h2>Soporte oficial</h2>
<p>Passenger ofrece soporte tecnico y operativo para asegurar continuidad de servicio, estabilidad de plataforma y resolucion efectiva de incidencias.</p>

<h2>Canales de atencion</h2>
<ul>
  <li>Soporte funcional de usuarios (paneles y flujos).</li>
  <li>Soporte tecnico para admins y equipos operativos.</li>
  <li>Escalamiento de incidentes criticos por prioridad.</li>
</ul>

<h2>Modelo de respuesta</h2>
<p>Los tickets se clasifican por severidad e impacto. Los casos de bloqueo operativo se priorizan por encima de solicitudes cosmeticas. Se mantiene trazabilidad y seguimiento hasta cierre.</p>

<h2>Informacion recomendada al reportar</h2>
<ul>
  <li>Rol del usuario afectado y ruta exacta.</li>
  <li>Hora, contexto y pasos para reproducir.</li>
  <li>Capturas o evidencia del comportamiento observado.</li>
  <li>Impacto operativo y urgencia del caso.</li>
</ul>
`,
};

const fallbackFooterPages: Record<string, FooterPage> = Object.fromEntries(
  Object.entries(footerMeta).map(([slug, meta]) => [
    slug,
    {
      title: footerPageTitles[slug] || "Informacion",
      content:
        fallbackFooterPageContent[slug] ||
        [
          `${footerPageTitles[slug] || "Informacion"}`,
          "",
          `${meta.lead}`,
          "",
          "Este contenido sirve como version base mientras se publica una version extendida desde el panel administrativo.",
          "",
          "Passenger mantiene visibilidad legal y operativa para empresas, conductores y pasajeros.",
        ].join("\n"),
    },
  ])
) as Record<string, FooterPage>;

function buildBannerDataUri(title: string, accent: string) {
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#0f172a'/>
      <stop offset='100%' stop-color='#1e293b'/>
    </linearGradient>
    <radialGradient id='orb' cx='50%' cy='50%' r='60%'>
      <stop offset='0%' stop-color='${accent}' stop-opacity='0.55'/>
      <stop offset='100%' stop-color='${accent}' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='1200' height='700' fill='url(#bg)'/>
  <circle cx='930' cy='190' r='240' fill='url(#orb)'/>
  <circle cx='220' cy='590' r='180' fill='url(#orb)'/>
  <rect x='90' y='130' rx='20' ry='20' width='560' height='430' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.15)'/>
  <text x='130' y='220' fill='white' font-size='56' font-family='Arial, sans-serif' font-weight='700'>Passenger</text>
  <text x='130' y='300' fill='rgba(255,255,255,0.86)' font-size='38' font-family='Arial, sans-serif'>${safeTitle}</text>
  <text x='130' y='375' fill='rgba(255,255,255,0.68)' font-size='28' font-family='Arial, sans-serif'>Operacion profesional para flotillas modernas</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function sanitizeAllowedHtml(input: string) {
  if (!input) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const allowedTags = new Set(["P", "BR", "STRONG", "EM", "UL", "OL", "LI", "A", "H1", "H2", "H3", "DIV", "SPAN"]);

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!allowedTags.has(el.tagName)) {
          const text = document.createTextNode(el.textContent || "");
          node.replaceChild(text, el);
          continue;
        }

        // Remove all attributes except safe href on links.
        for (const attr of Array.from(el.attributes)) {
          if (el.tagName === "A" && attr.name === "href") continue;
          el.removeAttribute(attr.name);
        }

        if (el.tagName === "A") {
          const href = el.getAttribute("href") || "";
          if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
            el.removeAttribute("href");
          }
          el.setAttribute("rel", "noopener noreferrer");
          if (href.startsWith("http")) el.setAttribute("target", "_blank");
        }

        walk(el);
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

function normalizeContent(content: string) {
  const raw = content || "";
  const hasMarkup = raw.includes("<") && raw.includes(">");
  const html = hasMarkup ? raw : raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  return sanitizeAllowedHtml(html);
}

export default function FooterInfoPage() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const { config } = useSiteConfig();
  const [location] = useLocation();
  const slug = getSlug(location);
  const configuredPages = ((config as unknown as { footerPages?: Record<string, FooterPage> })?.footerPages) || {};
  const configured = configuredPages[slug];
  const fallback = fallbackFooterPages[slug];
  const page = configured && configured.content?.trim()?.length > 30 ? configured : fallback;
  const meta = footerMeta[slug];
  const bannerSrc = page ? buildBannerDataUri(page.title, meta?.accent || "oklch(0.74 0.16 148)") : "";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.13 220 / 0.32) 0%, oklch(0.75 0.13 220 / 0) 68%)" }}
        />
        <div
          className="absolute top-32 -left-28 h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.14 165 / 0.2) 0%, oklch(0.72 0.14 165 / 0) 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 h-[26rem] w-[26rem] translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.68 0.14 280 / 0.18) 0%, oklch(0.68 0.14 280 / 0) 72%)" }}
        />
      </div>

      <Navbar user={user} isAuthenticated={isAuthenticated} onLogout={logout} onLogin={() => { window.location.href = "/login"; }} />

      <main className="container relative z-10 pt-28 pb-14 max-w-6xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white hover:underline mb-8"
        >
          <ArrowLeft size={14} />
          Volver al inicio
        </a>

        {page ? (
          <div className="space-y-6">
            <section className="grid lg:grid-cols-2 gap-5">
              <article className="rounded-3xl p-6 lg:p-8 text-white overflow-hidden relative" style={{ background: "linear-gradient(135deg, oklch(0.14 0.01 250), oklch(0.18 0.02 215))" }}>
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ background: "oklch(1 0 0 / 0.12)" }}>
                  <Sparkles size={12} />
                  {meta?.category || "Informacion"}
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {page.title}
                </h1>
                <p className="text-white/75 leading-relaxed mb-6">
                  {meta?.lead || "Contenido institucional de Passenger."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(meta?.highlights || ["Calidad", "Confianza", "Escala"]).map((item) => (
                    <div key={item} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "oklch(1 0 0 / 0.08)", border: "1px solid oklch(1 0 0 / 0.14)" }}>
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <div className="rounded-3xl overflow-hidden border border-white/15 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
                <img src={bannerSrc} alt={page.title} className="w-full h-full object-cover min-h-[280px]" />
              </div>
            </section>

            <section className="grid lg:grid-cols-[2fr_1fr] gap-5">
              <article className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 bg-white/10 text-white/85 border border-white/15">
                  <FileText size={12} />
                  Documento oficial
                </div>
                <div
                  className="prose prose-sm prose-invert max-w-none text-white/85 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: normalizeContent(page.content) }}
                />
              </article>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">Compromiso</p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <ShieldCheck size={18} className="text-[oklch(0.78_0.12_170)]" />
                    <p className="text-sm text-white font-semibold">Operacion segura y consistente</p>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">Diseñamos procesos y producto para que tu servicio de taxi opere con confianza, trazabilidad y buena experiencia de usuario.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">Empresa</p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Building2 size={18} className="text-[oklch(0.78_0.11_225)]" />
                    <p className="text-sm text-white font-semibold">Passenger</p>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">Plataforma enfocada en crecimiento sostenible para flotillas, con visibilidad operativa y herramientas para escalar sin complejidad.</p>
                </div>
              </aside>
            </section>
          </div>
        ) : (
          <article className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-6 lg:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h1 className="text-2xl font-extrabold text-white mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
              Contenido no disponible
            </h1>
            <p className="text-white/70">
              Esta seccion aun no tiene informacion publicada.
            </p>
          </article>
        )}
      </main>

      <FooterSection />
    </div>
  );
}
