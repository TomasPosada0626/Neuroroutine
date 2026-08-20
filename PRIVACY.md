# Política de Privacidad de NeuroRoutine

**Última actualización:** 2026-08-20

Esta política describe qué datos recoge NeuroRoutine, para qué se usan, con quién se comparten y
qué derechos tienes sobre ellos. Está escrita para reflejar lo que la aplicación realmente hace
hoy, no una plantilla genérica.

## 1. Responsable del tratamiento

NeuroRoutine es un proyecto desarrollado y operado por **Tomas Posada**, a título individual (no
existe una entidad legal registrada detrás del proyecto a la fecha de esta política).

Contacto para cualquier tema de privacidad: **agendatomas2025@gmail.com**

> **Nota para quien publique esta política:** si en el futuro operas NeuroRoutine bajo una empresa
> registrada, o si tu país exige datos adicionales del responsable (domicilio fiscal, NIT/RFC/CUIT,
> etc.), esta sección debe actualizarse antes de aceptar clientes bajo esa nueva estructura.

## 2. Qué datos recopilamos

### 2.1 Datos de cuenta

Al registrarte, Supabase Auth (nuestro proveedor de autenticación) gestiona tu contraseña de forma
segura; nosotros nunca la vemos ni la almacenamos en texto plano. Además guardamos en nuestra base
de datos:

- Correo electrónico
- Nombre de usuario
- Nombre y apellido (opcionales)

### 2.2 Contenido que tú creas

- Tus rutinas y tareas: títulos, descripciones, fechas, horarios, y si son recurrentes (hábitos).
- Tus preferencias de recordatorios: si quieres recibir recordatorios por email, a qué hora y en
  qué zona horaria.

### 2.3 Datos de uso (analítica mínima, sin PII por diseño)

Registramos eventos como "rutina creada", "tarea completada", "sesión iniciada", etc., para poder
calcular tus rachas de consistencia y mejorar el producto. Este registro está construido para
**excluir activamente** información identificable: el código bloquea explícitamente cualquier
campo llamado `title`, `description`, `email`, `username`, `first_name`, `last_name` o `password`
antes de guardar el evento (ver `frontend/src/shared/observability/eventLog.ts`). Lo que sí se
guarda es el tipo de evento y, cuando aplica, valores cortos no identificables (números, booleanos,
textos genéricos de hasta 80 caracteres).

Por separado, guardamos un historial de eventos de tareas completadas/no completadas
(`routine_task_events`) para calcular rachas — este historial es **inmutable**: ni siquiera tú
puedes editarlo después de creado, para que el cálculo de consistencia no pueda manipularse.

### 2.4 Dirección IP

Cuando intentas iniciar sesión con nombre de usuario (en vez de email), tu IP se usa de forma
transitoria para limitar cuántos intentos puedes hacer por minuto (protección contra fuerza bruta
y enumeración de usuarios). No mantenemos un historial de tus IPs; solo un contador que se reinicia
cada minuto.

### 2.5 Datos técnicos y de errores

Usamos **Sentry** para detectar errores y medir el rendimiento de la aplicación. Está configurado
explícitamente para **no enviar información personal por defecto** (`sendDefaultPii: false` en
`frontend/src/shared/observability/initSentry.ts`). Aun así, como con cualquier proveedor que
recibe peticiones HTTP, es posible que Sentry procese de forma estándar metadatos técnicos básicos
de la conexión (por ejemplo, la IP de origen) como parte de su infraestructura, incluso sin que
nuestra aplicación se lo pida explícitamente.

### 2.6 Cookies y almacenamiento local

NeuroRoutine no usa cookies de seguimiento ni publicidad de terceros. Usamos `localStorage` de tu
navegador para: mantener tu sesión iniciada, recordar tu preferencia de tema (claro/oscuro),
guardar tus preferencias del panel, evitar notificaciones duplicadas el mismo día, y encolar
cambios hechos sin conexión (modo offline) hasta poder sincronizarlos.

## 3. Para qué usamos tus datos

- Darte acceso a tu cuenta y a tus rutinas/tareas.
- Calcular tus rachas y estadísticas de consistencia.
- Enviarte recordatorios de tareas pendientes por email (si los activaste) o por notificación del
  navegador.
- Detectar y corregir errores técnicos.
- Prevenir abuso (por ejemplo, ataques de fuerza bruta o enumeración de usuarios).

No usamos tus datos para publicidad ni los vendemos a terceros.

## 4. Con quién compartimos tus datos

No vendemos tus datos. Los compartimos únicamente con los proveedores que nos ayudan a operar el
servicio, y solo con lo que cada uno necesita para cumplir su función:

| Proveedor | Para qué lo usamos | Qué datos recibe |
|---|---|---|
| **Supabase** | Autenticación, base de datos, funciones programadas | Todos los datos de cuenta, contenido y uso descritos arriba |
| **Resend** | Envío de los emails de recordatorio | Tu email, tu nombre (si lo diste), y los títulos de las tareas/rutinas vencidas ese día (necesarios para redactar el correo) |
| **Sentry** | Monitoreo de errores y rendimiento | Datos técnicos del error/sesión, sin PII por defecto (ver 2.5) |
| **Vercel** / **Render** | Alojamiento de la aplicación | Datos estándar de cualquier solicitud HTTP a la app |

Estos proveedores pueden procesar datos en servidores ubicados fuera de tu país. Cada uno tiene su
propia política de privacidad como procesador de datos.

## 5. Cuánto tiempo conservamos tus datos

Conservamos los datos de tu cuenta mientras esta exista. Puedes eliminar tu cuenta y todos tus
datos en cualquier momento desde la propia app (ver sección 6) o pidiéndonoslo por email.
NeuroRoutine todavía no purga automáticamente tu historial de eventos si conservas la cuenta
activa; esto es una limitación conocida del producto en su etapa actual, no una decisión de
retención indefinida deliberada.

## 6. Tus derechos

Puedes ejercer los siguientes derechos sobre tus datos, reconocidos por la Ley 1581 de 2012 de
Colombia (Ley de Protección de Datos Personales) y normas equivalentes de otras jurisdicciones:

- **Acceso**: conocer los datos que tenemos sobre ti.
- **Corrección**: corregir datos incorrectos (algunos, como tu nombre, también puedes editarlos
  tú mismo desde la app).
- **Eliminación**: eliminar tu cuenta y tus datos. Puedes hacerlo tú mismo en cualquier momento
  desde **Personalizar dashboard -> Zona de peligro -> Eliminar mi cuenta**, sin necesidad de
  escribirnos: la acción borra tu cuenta y en cascada tus rutinas, tareas, historial y
  preferencias, de forma inmediata e irreversible.
- **Portabilidad**: solicitar copia de tus datos en un formato exportable.

Para corrección o portabilidad, o si prefieres que lo hagamos nosotros en vez de usar el botón de
la app, escríbenos a **agendatomas2025@gmail.com** y haremos el mejor esfuerzo por resolver tu
solicitud en un plazo razonable (máximo 15 días hábiles).

## 7. Seguridad

- Tus datos están aislados a nivel de base de datos: cada usuario solo puede leer o modificar sus
  propias rutinas, tareas y preferencias, reforzado por Row-Level Security en Postgres (no solo
  por la interfaz).
- Toda la comunicación con la aplicación viaja cifrada (HTTPS).
- Las credenciales de administrador del sistema nunca se exponen en el código que corre en tu
  navegador.
- Aplicamos límites de intentos en operaciones sensibles para dificultar ataques automatizados.

Ninguna aplicación es 100% invulnerable; si detectas un problema de seguridad, repórtalo siguiendo
[SECURITY.md](SECURITY.md).

## 8. Menores de edad

NeuroRoutine no está dirigido a menores de 14 años y no recopilamos deliberadamente datos de
menores de esa edad. Si crees que un menor nos proporcionó datos, contáctanos para eliminarlos.

## 9. Cambios a esta política

Podemos actualizar esta política cuando cambie el producto o los proveedores que usamos. Si el
cambio es significativo, lo indicaremos en la aplicación o por email.

## 10. Contacto

**agendatomas2025@gmail.com**
