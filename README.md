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

Cada fila de la tabla tiene un botón "Borrar" que pide confirmación (Confirmar / Cancelar) antes de borrar. Al confirmar, se llama al endpoint con `action: "delete"` (también validado con usuario/contraseña), que busca la fila por su Código. La fila **no se elimina físicamente**: su Estado pasa a "Eliminado" y se registra la fecha en la columna `FechaEstado`, para conservar el historial en la planilla. La acción `list` (la que alimenta el panel) filtra las filas en estado "Eliminado", así que dejan de figurar en el sitio aunque sigan en la planilla.

También tiene botones "Aprobar" y "Rechazar" (se ocultan si la inscripción ya tiene ese estado) que llaman al endpoint con `action: "setEstado"` para cambiar la columna Estado de esa fila en la planilla, sin necesidad de confirmación ya que es una acción reversible. Cada cambio de estado (incluido el borrado) actualiza la columna `FechaEstado` con la fecha/hora del cambio, y esa fecha se muestra en el panel admin en la columna "Actualizado".

El código de inscripción (`HVK-2026-####`) ya no lo genera el navegador: lo asigna el backend al recibir el envío del formulario (buscando el número más alto ya usado en la planilla y sumando uno), y lo devuelve en la respuesta. Esto evita que dos inscripciones terminen con el mismo código si se envían desde dos pestañas o sesiones distintas.

## Login del panel admin

El usuario y la contraseña del panel admin **no** están en este código: se validan en el Apps Script contra "Script Properties" (`ADMIN_USER` / `ADMIN_PASS`), que solo son visibles desde el editor de Apps Script del proyecto (no viajan al navegador). El cliente le manda usuario/contraseña al mismo endpoint (`action: "adminLogin"`) y el backend responde si son correctos o no.

Esto evita que cualquiera que abra el código fuente de la página vea la contraseña en texto plano, pero como el resto del panel (qué se muestra tras loguearse) sigue siendo lógica de React en el navegador, no es una autenticación de nivel productivo — alcanza para disuadir a un visitante casual, no para proteger datos realmente sensibles.

Para cambiar el usuario o la contraseña: Apps Script del proyecto → ícono de engranaje (Configuración del proyecto) → Propiedades de las secuencias de comandos → editar `ADMIN_USER` / `ADMIN_PASS`.
