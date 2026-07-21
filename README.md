# Havok Airsoft — Inscripciones

Página web de inscripción para el equipo de airsoft **Havok**: formulario de alta (miembro o evento puntual), sección de reglamento y un panel de administración simple.

## Estructura

- `index.html` — la página (landing, formulario, reglamento y panel admin).
- `support.js` — runtime que renderiza la página (carga React/ReactDOM/Babel desde CDN en el navegador).
- `nocturne-styles.css` — hoja de estilos del sistema de diseño usado.
- `assets/havok-escudo.jpeg` — escudo del equipo.
- `uploads/Reglamento_Equipo_Airsoft.docx` — reglamento interno original en Word.
- `uploads/foto-equipo.jpeg` — foto del equipo.
- `_ds/` — archivos fuente del sistema de diseño (tokens, guía de estilo). No son necesarios para que el sitio funcione; se conservan como referencia.

## Cómo verla

Es un sitio estático de un solo archivo HTML. Se puede abrir `index.html` directamente en el navegador, o publicarla con GitHub Pages (Settings → Pages → branch `main` → carpeta `/root`).

## Backend de inscripciones

El formulario envía cada inscripción (por `fetch`, sin bloquear la confirmación en pantalla) a un Google Apps Script publicado como app web, que agrega una fila a la planilla de Google Sheets **"Havok Airsoft - Inscripciones"**. El enlace "Abrir Google Sheet" del panel admin apunta a esa misma planilla.

- Planilla: https://docs.google.com/spreadsheets/d/1GyTeYw1uLySXn9UhW8YSmuWzfQ_qg_orwT8uSMfFWgU/edit
- Endpoint (Apps Script, deploy "Cualquiera" puede invocar): ver constante `INSCRIPCIONES_ENDPOINT` en `index.html`.
- Código del backend: vive en el proyecto de Apps Script vinculado a esa planilla (Extensiones → Apps Script desde la propia hoja), no en este repositorio.

Si el endpoint cambia (por ejemplo, se crea una nueva versión del deploy), hay que actualizar `INSCRIPCIONES_ENDPOINT` en `index.html` y volver a pushear.

El panel admin ya no muestra datos de ejemplo: al loguearse, pide al mismo endpoint (`action: "list"`, con el usuario/contraseña ingresados) todas las filas de la planilla y las muestra en la tabla y en los contadores. Esa acción también valida usuario/contraseña contra las mismas Script Properties que el login, así que solo responde con datos si las credenciales son correctas.

Cada fila de la tabla tiene un botón "Borrar" que pide confirmación (Confirmar / Cancelar) antes de borrar. Al confirmar, se llama al endpoint con `action: "delete"` (también validado con usuario/contraseña), que busca la fila por su **Id** (ver más abajo). La fila **no se elimina físicamente**: su Estado pasa a "Eliminado" y se registra la fecha en la columna `FechaEstado`, para conservar el historial en la planilla. La acción `list` (la que alimenta el panel) filtra las filas en estado "Eliminado", así que dejan de figurar en el sitio aunque sigan en la planilla.

También tiene botones "Aprobar" y "Rechazar" (se ocultan si la inscripción ya tiene ese estado) que llaman al endpoint con `action: "setEstado"` (también buscando la fila por su Id) para cambiar la columna Estado de esa fila en la planilla, sin necesidad de confirmación ya que es una acción reversible. Cada cambio de estado (incluido el borrado) actualiza la columna `FechaEstado` con la fecha/hora del cambio, y esa fecha se muestra en el panel admin en la columna "Actualizado".

El código de inscripción (`HVK-2026-####`) ya no lo genera el navegador: lo asigna el backend al recibir el envío del formulario (buscando el número más alto ya usado en la planilla y sumando uno), y lo devuelve en la respuesta. Esto evita que dos inscripciones terminen con el mismo código si se envían desde dos pestañas o sesiones distintas.

### Columna Id, códigos solo para miembros, y hoja "Eventuales"

Desde esta vuelta, el Código (`HVK-2026-####`) sólo se genera para inscripciones de tipo **"Miembro del equipo"**. Las de **"Evento puntual"** quedan con el Código vacío en la planilla y no muestran ningún código en la pantalla de confirmación — son participantes ocasionales, no forman parte de la numeración correlativa de miembros.

Como no todas las filas tienen ya un Código único (las eventuales lo tienen vacío), borrar/aprobar/rechazar dejó de identificar la fila por su Código y ahora usa una columna nueva, **`Id`** (un UUID generado por el backend al crear la fila), que sí es único siempre. Por eso la planilla principal tiene una columna `Id` después de `FechaEstado`; no hace falta tocarla a mano, la genera y la usa el backend solo.

Las inscripciones eventuales igual quedan registradas con fecha y datos en una hoja aparte de la misma planilla, **"Eventuales"** (columnas `Fecha`, `Nombre`, `Edad`, `Experiencia`, `VecesInscripto`), para tener un historial de cuántas veces se anotó cada jugador ocasional. `VecesInscripto` lo calcula el backend contando coincidencias previas de nombre (sin importar mayúsculas/espacios) en esa misma hoja. Esta hoja no se usa para nada del panel admin, es solo un registro de consulta manual.

Importante: como el número de Código nunca se reutiliza (el backend escanea también las filas "Eliminadas" al calcular el próximo número), borrar una inscripción de miembro por error o de prueba no libera su número — si hace falta reservar un código específico (por ejemplo, para los líderes del equipo), conviene borrar esa fila directamente en la planilla en lugar de usar el botón "Borrar" del panel.

## Login del panel admin

El usuario y la contraseña del panel admin **no** están en este código: se validan en el Apps Script contra "Script Properties" (`ADMIN_USER` / `ADMIN_PASS`), que solo son visibles desde el editor de Apps Script del proyecto (no viajan al navegador). El cliente le manda usuario/contraseña al mismo endpoint (`action: "adminLogin"`) y el backend responde si son correctos o no.

Esto evita que cualquiera que abra el código fuente de la página vea la contraseña en texto plano, pero como el resto del panel (qué se muestra tras loguearse) sigue siendo lógica de React en el navegador, no es una autenticación de nivel productivo — alcanza para disuadir a un visitante casual, no para proteger datos realmente sensibles.

Para cambiar el usuario o la contraseña: Apps Script del proyecto → ícono de engranaje (Configuración del proyecto) → Propiedades de las secuencias de comandos → editar `ADMIN_USER` / `ADMIN_PASS`.
