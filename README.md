# Havok Airsoft — Inscripciones

Página web de inscripción para el equipo de airsoft **Havok**: formulario de alta (miembro o evento puntual), sección de reglamento y un panel de administración simple.

## Estructura

- `index.html` — la página (landing, formulario, reglamento y panel admin).
- `support.js` — runtime que renderiza la página (carga React/ReactDOM/Babel desde CDN en el navegador).
- `nocturne-styles.css` — hoja de estilos del sistema de diseño usado.
- `assets/havok-escudo.jpeg` — escudo del equipo.
- `assets/campo-equipo.jpg` — foto real del equipo/campo de juego (fondo del hero).
- `assets/rifle-patch.jpg` — foto real de equipamiento con el parche Havok (sección "Nosotros" y banner de la cinta divisoria).
- `uploads/Reglamento_Equipo_Airsoft.docx` — reglamento interno original en Word.
- `uploads/foto-equipo.jpeg` — foto del equipo.
- `_ds/` — archivos fuente del sistema de diseño (tokens, guía de estilo). No son necesarios para que el sitio funcione; se conservan como referencia.

## Cómo verla

Es un sitio estático de un solo archivo HTML. Se puede abrir `index.html` directamente en el navegador, o publicarla con GitHub Pages (Settings → Pages → branch `main` → carpeta `/root`).

## Retoque visual (fotos reales, textura, animaciones de entrada)

El landing usaba antes solo el escudo como imagen (repetido en dos archivos idénticos) sobre fondos planos. Se sumaron dos fotos reales del equipo:

- El hero ahora usa `campo-equipo.jpg` de fondo (con degradado oscuro encima para que el texto siga siendo legible).
- La sección "Nosotros" usa `rifle-patch.jpg` como foto principal, con el escudo (`havok-escudo.jpeg`) flotando como insignia circular sobre la esquina de la foto.
- Se agregó una cinta/banner angosta entre "Nosotros" y "Reglamento" que reutiliza `rifle-patch.jpg` recortada como fondo, con una frase corta a modo de separador visual.
- La sección de reglamento tiene una textura diagonal sutil (solo CSS, sin imagen) para que no quede tan plana.
- El título, la bajada y los botones del hero entran con una animación sutil de aparición (fade + desplazamiento), respetando `prefers-reduced-motion`.
- Las tarjetas (`.card`) tienen ahora un leve efecto de elevación al pasar el mouse.
- Se corrigió además el responsive en mobile: el nav ahora hace wrap en pantallas chicas en vez de superponerse, y las grillas de dos columnas ("Nosotros" y "Reglamento") pasan a una sola columna por debajo de 720px.

Nada de esto tocó la lógica del formulario, el panel admin ni el backend — son cambios de estilo y de marcado estático dentro de `index.html`.

## Tipo de inscripción: elección obligatoria y más clara

Se detectó un caso real de confusión: alguien que quería anotarse como "Miembro del equipo" terminó enviando la inscripción como "Evento puntual" sin darse cuenta, porque esa opción venía preseleccionada por defecto y las dos opciones se distinguían solo por un borde fino apenas visible.

Para que no vuelva a pasar:

- Ya **no hay ninguna opción preseleccionada**: al abrir el formulario (o al reiniciarlo después de una inscripción) ninguna de las dos tarjetas aparece marcada, así que hay que elegir una a propósito.
- Cada opción ahora tiene un título y una descripción corta debajo ("Participás en una partida puntual, sin sumarte al equipo" / "Te sumás de forma estable, con cuota mensual"), y un texto arriba aclara que el dato no se puede cambiar después de enviar el formulario.
- La opción elegida se marca con un relleno dorado sólido y la etiqueta "✓ Seleccionado", en vez del borde fino de antes.
- El campo es obligatorio: si se intenta enviar el formulario sin elegir tipo, el navegador bloquea el envío (usando validación nativa HTML, con `required` atado a `{{ true }}` como ya se hacía con el check del reglamento) y también se valida en el código antes de armar la inscripción.

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

### DNI, teléfono, email y contacto de emergencia ahora sí llegan al panel admin

Se detectó que el formulario pedía DNI, teléfono, email y el contacto de emergencia (nombre, teléfono, relación), pero esos datos nunca se enviaban al backend ni se guardaban en la planilla — quedaban solo en la pantalla de quien se inscribía. El panel admin nunca pudo mostrarlos porque el dato no llegaba a existir del lado del servidor.

Se corrigió de punta a punta:

- La planilla principal tiene 6 columnas nuevas después de `Id`: `DNI`, `Telefono`, `Email`, `ContactoEmergenciaNombre`, `ContactoEmergenciaTelefono`, `ContactoEmergenciaRelacion`.
- El formulario ahora manda esos 6 campos al backend junto con el resto de la inscripción.
- El backend los guarda en las columnas correspondientes (buscándolas por nombre de columna, igual que ya hacía con `FechaEstado` e `Id`, así que no importa el orden de las columnas en la planilla).
- El panel admin muestra dos columnas nuevas en la tabla: **DNI** y **Contacto** (teléfono y email), y **Contacto de emergencia** (nombre, relación y teléfono). Se muestran para **ambos tipos de inscripción**, miembro y evento puntual.

Esto se probó de punta a punta contra el backend en producción (una inscripción de prueba con todos los campos, verificada en la planilla y luego borrada) y visualmente en el panel admin con datos simulados.

### Autorización del adulto responsable (menores de edad) también llega ahora al panel admin

Mismo problema que el anterior, pero con los datos que pide el formulario cuando quien se inscribe es menor de edad: nombre y DNI del adulto responsable, y la aceptación de la autorización. Se recolectaban en el formulario (son obligatorios si la edad cargada es menor a 18) pero tampoco se enviaban al backend ni se guardaban en la planilla.

Se corrigió igual que el caso anterior:

- La planilla principal tiene 3 columnas nuevas después de `ContactoEmergenciaRelacion`: `AutorizacionAdultoNombre`, `AutorizacionAdultoDni`, `AutorizacionAceptada` (esta última guarda "Si" cuando se aceptó).
- El formulario ahora manda esos 3 campos al backend junto con el resto de la inscripción, solo cuando corresponde (si no es menor, se mandan vacíos).
- El backend los guarda en las columnas correspondientes, buscándolas por nombre de columna igual que el resto de los campos.
- El panel admin muestra una columna nueva, **Autorización adulto**, con el nombre y DNI del adulto responsable. Queda vacía para inscripciones donde quien se anotó no era menor de edad.

Esto se probó de punta a punta contra el backend en producción (una inscripción de prueba simulando un menor con adulto responsable, verificada en la planilla y luego borrada) y también localmente, llenando el formulario completo como si fuera un menor y revisando que los datos correctos viajaran en el envío, además de una verificación visual del panel admin con datos simulados.

Importante: como el número de Código nunca se reutiliza (el backend escanea también las filas "Eliminadas" al calcular el próximo número), borrar una inscripción de miembro por error o de prueba no libera su número — si hace falta reservar un código específico (por ejemplo, para los líderes del equipo), conviene borrar esa fila directamente en la planilla en lugar de usar el botón "Borrar" del panel.

## Login del panel admin

El usuario y la contraseña del panel admin **no** están en este código: se validan en el Apps Script contra "Script Properties" (`ADMIN_USER` / `ADMIN_PASS`), que solo son visibles desde el editor de Apps Script del proyecto (no viajan al navegador). El cliente le manda usuario/contraseña al mismo endpoint (`action: "adminLogin"`) y el backend responde si son correctos o no.

Esto evita que cualquiera que abra el código fuente de la página vea la contraseña en texto plano, pero como el resto del panel (qué se muestra tras loguearse) sigue siendo lógica de React en el navegador, no es una autenticación de nivel productivo — alcanza para disuadir a un visitante casual, no para proteger datos realmente sensibles.

Para cambiar el usuario o la contraseña: Apps Script del proyecto → ícono de engranaje (Configuración del proyecto) → Propiedades de las secuencias de comandos → editar `ADMIN_USER` / `ADMIN_PASS`.

### Credenciales más fuertes y bloqueo temporal ante intentos fallidos

El usuario y contraseña originales (`adminhavok` / `havok2026`) eran cortos y fáciles de adivinar (una combinación obvia con el nombre del equipo y el año), y el backend no tenía ningún límite de intentos: se podía probar contraseñas en bucle sin restricción. Ahora que la planilla guarda DNI, teléfonos, emails y datos de menores, valía la pena reforzar esto antes de dar por cerrado el panel admin.

Se hicieron dos cambios:

- **Credenciales nuevas**: se generaron un usuario y una contraseña aleatorios y largos (20+ caracteres, con mayúsculas, minúsculas, números y símbolos) y se cargaron en las mismas Script Properties (`ADMIN_USER` / `ADMIN_PASS`). Roberto tiene las credenciales nuevas por separado; no se repiten acá.
- **Bloqueo temporal (rate limiting)**: el backend ahora cuenta los intentos fallidos de login (compartido entre `adminLogin`, `list`, `delete` y `setEstado`, ya que las cuatro acciones validan usuario/contraseña) usando `CacheService`. Al quinto intento fallido seguido, cualquier acción que requiera login queda bloqueada durante 15 minutos, devolviendo el mensaje "Demasiados intentos fallidos. Proba de nuevo en X minutos." — incluso si después se manda la contraseña correcta. Un login exitoso resetea el contador. Esto significa que si el propio Roberto se equivoca de contraseña 5 veces seguidas, también va a tener que esperar los 15 minutos; es una limitación conocida y aceptada de este tipo de protección simple (no hay forma de distinguir "intentos legítimos con error de tipeo" de "un ataque").

Se probó de punta a punta contra el backend en producción: se confirmó que las credenciales viejas ya no funcionan, que las nuevas sí, que el quinto intento fallido dispara el bloqueo (con las cuatro acciones respetándolo), y que ni siquiera la contraseña correcta pasa mientras dura el bloqueo.

## Filtro antispam en el formulario de inscripción (honeypot + tiempo mínimo)

El formulario público de inscripción no tenía ninguna protección contra envíos automatizados (bots): cualquiera que encontrara la URL del endpoint de Apps Script (que es pública, porque está en el código fuente de la página) podía mandarle inscripciones falsas en bucle. Se agregó una protección liviana, sin dependencias externas ni fricción para la persona que se inscribe de verdad.

Se combinaron dos técnicas, ambas verificadas del lado del servidor (en `Code.gs`), porque cualquier chequeo que viva solo en el navegador puede ser evitado por un bot que le pegue directo al endpoint:

- **Honeypot**: se agregó un campo (`website`) que está en el formulario pero oculto fuera de la pantalla (no con `display:none`, que algunos bots detectan y evitan) y con `tabindex="-1"` para que ni siquiera sea alcanzable con el teclado. Una persona real nunca lo completa; un bot que llena todos los campos de un formulario automáticamente sí.
- **Tiempo mínimo**: el frontend guarda el momento en que se abrió el formulario y, al enviarlo, calcula cuánto tiempo pasó (`elapsedMs`). Si el envío llega en menos de 2,5 segundos desde que se abrió el formulario (o si ese dato directamente no viene, como pasaría si un bot arma el pedido a mano sin pasar por la página), se lo trata como sospechoso — ninguna persona completa un formulario con estos campos en menos de eso.

Si cualquiera de las dos condiciones se cumple, el backend responde con un **éxito falso** (`{result: "ok", codigo: ""}`) sin guardar ninguna fila en la planilla ni mandar el correo de aviso. Esto es intencional: como no hay ningún indicio de error, un bot simple no tiene forma de saber que fue descartado y no tiene motivo para insistir con otra estrategia.

Limitaciones conocidas: esto frena bots genéricos y poco sofisticados, que es la inmensa mayoría del spam automatizado. No frena a alguien que mire el código fuente de la página, entienda el mecanismo y arme un pedido que imite exactamente el comportamiento real (dejando `website` vacío y mandando un `elapsedMs` alto). Para ese nivel de ataque dirigido haría falta algo más fuerte, como reCAPTCHA — se dejó afuera por ahora porque agrega fricción y una dependencia externa (Google) que no se justifican para el volumen y el perfil de este formulario.

Se probó de punta a punta contra el backend en producción: un envío con el honeypot completado y uno con tiempo insuficiente (o sin `elapsedMs`) devuelven el mismo `{result:"ok"}` de siempre pero no crean ninguna fila en la planilla; un envío normal, con el honeypot vacío y un tiempo de espera realista, sigue registrándose sin problemas.

## Aviso por correo de nuevas inscripciones

Cada vez que se recibe una inscripción nueva (sea "Miembro" o "Evento puntual"), el backend envía un correo de aviso a `s.c.roberto.rs@gmail.com` con el nombre, tipo, código (si es miembro), edad, experiencia y fecha. El envío usa `MailApp.sendEmail` de Apps Script y está envuelto en su propio `try/catch`: si por algún motivo el envío del correo fallara, la inscripción se guarda igual en la planilla y la respuesta al formulario no se ve afectada — el aviso por correo es un extra, no una condición para que la inscripción se registre.

La primera vez que se agregó esta función fue necesario autorizar manualmente el permiso de envío de correo desde el editor de Apps Script (ejecutando la función una vez y aceptando el permiso solicitado); si en el futuro se mueve el proyecto a otra cuenta de Google, habría que repetir ese paso una vez.
