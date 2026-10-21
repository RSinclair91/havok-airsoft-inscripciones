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

## Carrusel de fotos en "Nosotros"

La sección "Nosotros" mostraba una sola foto fija (`rifle-patch.jpg`). Ahora es un pequeño carrusel que rota automáticamente entre varias fotos del equipo, con puntos de navegación abajo para pasar manualmente a una foto específica.

- Fotos actuales en el carrusel: `rifle-patch.jpg` y `campo-equipo.jpg` (esta última ya se usaba como fondo del hero; se reutiliza también acá).
- Rota sola cada 5 segundos mientras la página está abierta; al hacer clic en un punto de navegación, salta directo a esa foto y el ciclo automático sigue desde ahí.
- El escudo (`havok-escudo.jpeg`) sigue flotando como insignia circular sobre la esquina de la foto activa, igual que antes.
- Está pensado para sumar más fotos fácilmente: alcanza con agregar el archivo a `assets/` y sumarlo a la lista `CAROUSEL_IMAGES` en `index.html`. Queda pendiente sumar una tercera foto (del equipo en el campo) apenas esté disponible el archivo.

Se verificó localmente con capturas de pantalla que el carrusel muestra la cantidad correcta de fotos y puntos, y que al hacer clic en un punto cambia efectivamente a la foto correspondiente.

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

### Dos roles: administrador (nivel 1) y moderadores (nivel 2)

El panel admin dejó de ser un único usuario: ahora hay dos niveles de acceso.

- **Administrador (nivel 1)**: es el usuario original. Puede ver y aprobar/rechazar inscripciones, borrar inscripciones, abrir la planilla de Google Sheets, cambiar su propio usuario/contraseña, y crear o eliminar moderadores.
- **Moderador (nivel 2)**: un tipo de usuario nuevo, pensado para sumar gente que ayude a revisar inscripciones sin darle acceso a todo. Un moderador puede ver la tabla de inscripciones (con los mismos datos que ve el administrador: DNI, contacto, contacto de emergencia, autorización de adulto, etc.) y aprobar o rechazar solicitudes. **No puede** borrar inscripciones, no puede abrir el enlace a la planilla de Google Sheets desde el panel, no ve la sección "Usuarios", y no puede crear, eliminar ni listar otros moderadores ni cambiar ninguna credencial. El backend rechaza cualquiera de esas acciones con "No autorizado" aunque el moderador conozca la URL del endpoint y arme el pedido a mano.
- Al loguearse, el panel identifica automáticamente qué rol tiene la cuenta (`role: "admin"` o `role: "moderador"`) y muestra u oculta las secciones correspondientes. La lógica de bloqueo por intentos fallidos (5 intentos → 15 minutos) es la misma para ambos roles, compartida entre sí.

Las credenciales de los moderadores se guardan en las Script Properties del proyecto de Apps Script (igual que las del administrador), con la contraseña siempre encriptada (hash + sal), nunca en texto plano.

### Panel de autogestión de credenciales ("Mis credenciales")

El administrador (nivel 1) ya no necesita pedirle a nadie que le cambie el usuario o la contraseña a mano desde Apps Script: dentro del panel admin, en la sección "Usuarios", hay una tarjeta "Mis credenciales" donde puede escribir su nuevo usuario y contraseña y guardarlos ahí mismo. El cambio pide la contraseña actual para autorizarlo (ya está logueado, así que el backend usa esas mismas credenciales) y, al confirmarse, cierra la sesión automáticamente para que haya que volver a entrar con los datos nuevos — así no queda ninguna sesión vieja dando vueltas en el navegador.

La contraseña nueva la escribe y la ve únicamente quien está frente a la pantalla del panel: no pasa por ningún otro lado ni queda registrada en ningún chat ni documento.

Como parte de este cambio, la contraseña del administrador (que hasta ahora se guardaba en texto plano en `ADMIN_PASS`) pasó a guardarse encriptada (hash + sal) en cuanto se usa por primera vez el panel de autogestión o se hace login exitoso; el backend sigue aceptando la contraseña vieja en texto plano como respaldo hasta que eso ocurra, así no se corta el acceso durante la transición.

### Recuperar la contraseña del administrador ("¿Olvidaste tu contraseña?")

Hasta ahora, si el administrador (nivel 1) se olvidaba la contraseña, no había forma de recuperarla desde el panel — había que entrar directamente al editor de Apps Script y forzar el cambio a mano en las Script Properties. Ahora la pantalla de login tiene un enlace "¿Olvidaste tu contraseña de administrador?" que resuelve esto solo, sin depender de nadie con acceso al código:

1. Al tocarlo, se pide un código de un solo uso, que llega por email a `s.c.roberto.rs@gmail.com` (la misma casilla que ya recibe las notificaciones de inscripciones nuevas).
2. El código vence a los 15 minutos y solo sirve una vez. Para evitar que alguien spamee esa casilla de emails, no se puede pedir un código nuevo si ya se pidió uno hace menos de 2 minutos.
3. Con el código en mano, se completa un formulario con el código y la contraseña nueva (mínimo 8 caracteres, confirmada dos veces). Si el código está mal, se avisa sin revelar más información; después de 5 intentos fallidos con el mismo código, ese código se invalida y hay que pedir uno nuevo.
4. Al confirmarse, se actualiza la contraseña del administrador (el usuario no cambia, solo la contraseña) y también se levanta cualquier bloqueo por intentos fallidos que hubiera quedado activo, para que el acceso quede limpio.

Esto es exclusivo para el administrador de nivel 1: los moderadores no tienen (ni necesitan) esta opción, porque si un moderador se olvida su contraseña, el administrador puede simplemente eliminarlo y crearlo de nuevo con una contraseña provisoria (que, como se explica más abajo, el moderador va a tener que cambiar en su primer ingreso de todos modos).

Se probó localmente con Playwright (aparición del enlace, formulario de código bloqueado hasta pedirlo, rechazo de un código incorrecto sin perder el formulario, rechazo de confirmación de contraseñas que no coinciden antes de siquiera llamar al backend, y vuelta a la pantalla normal de login con mensaje de éxito tras un cambio válido) y contra el backend real con una función de prueba temporal en el editor de Apps Script: pedido de código (que sí llegó por email), segundo pedido inmediato correctamente bloqueado por el límite de 2 minutos, código incorrecto rechazado, contraseña demasiado corta rechazada, cambio válido aceptado y confirmado con un login posterior, limpieza del código tras usarlo (no se puede reutilizar), y restauración de la contraseña real del administrador al terminar la prueba (la función de prueba se borró después, sin dejar rastros en las Script Properties).

### Crear y eliminar moderadores

También dentro de la sección "Usuarios" (solo visible para el administrador de nivel 1), hay una tarjeta "Moderadores (nivel 2)" con:

- Una lista de los moderadores existentes, con la fecha en que se crearon.
- Un formulario para crear uno nuevo (usuario + contraseña).
- Un botón "Eliminar" junto a cada moderador de la lista, para darlo de baja.

Todo esto llama al mismo endpoint de Apps Script (`createModerator`, `deleteModerator`, `listModerators`), validado siempre con las credenciales del administrador de nivel 1 — un moderador no puede acceder a ninguna de estas tres acciones aunque las llame directamente.

Se probó de punta a punta contra el backend en producción: cambio de credenciales del administrador (ida y vuelta, confirmando que las viejas dejan de funcionar y las nuevas sí, y que la restauración a las credenciales reales funcionó igual), creación de un moderador de prueba, login de ese moderador con `role: "moderador"`, rechazo de las cinco acciones reservadas al administrador al intentarlas como moderador, y eliminación del moderador de prueba al final (sin dejar ningún dato de prueba en la planilla ni en las Script Properties).

### Autocompletado del navegador invadiendo campos que no correspondían, y sesión que quedaba en un estado confuso

Roberto reportó dos síntomas juntos en la sección "Usuarios": su propio usuario ("roberto.havok") aparecía precargado en el campo "Nuevo usuario" de "Mis credenciales" y en "Nuevo usuario moderador" de "Crear moderador" (dos campos que no tienen nada que ver con el login), y la tarjeta "Moderadores (nivel 2)" mostraba un error "No autorizado" en vez de la lista real.

Lo primero es autocompletado del navegador: ninguno de los campos de estos formularios tenía un atributo `autocomplete`, así que Chrome, al ver varios campos de usuario/contraseña en la misma página, sugería (o directamente completaba) el usuario y la contraseña guardados del login real en formularios que en realidad sirven para crear un usuario *nuevo* — no para iniciar sesión. Se corrigió agregando el atributo correcto a cada campo: `autocomplete="username"` / `"current-password"` en el login real (para que el autocompletado siga funcionando ahí, que es donde tiene sentido), y `autocomplete="off"` (usuarios nuevos) o `"new-password"` (contraseñas nuevas) en los campos de "Mis credenciales", "Crear moderador", el cambio de contraseña obligatorio del moderador y la recuperación de contraseña del administrador — así el navegador ya no confunde "crear algo nuevo" con "iniciar sesión con lo de siempre".

Lo segundo se investigó a fondo porque, a diferencia del primero, podía ser un problema real del backend. Se armó una verificación de punta a punta contra el servidor en producción (usando el usuario administrador real, pero con una contraseña de prueba generada y descartada en el momento, nunca la contraseña real de Roberto) que confirmó que el backend funciona perfectamente: con las credenciales correctas, `listModerators` devuelve la lista real sin problema; con una contraseña incorrecta, rechaza el pedido con "No autorizado", tal cual se espera. Es decir, el backend nunca estuvo roto. Lo que sí puede pasar (y es exactamente el tipo de situación que el arreglo del autocompletado reduce) es que el navegador tuviera guardada una contraseña vieja y la sesión terminara usando una contraseña que ya no es la vigente al pedir la lista de moderadores.

Como corrección adicional, y para que esto nunca vuelva a mostrarse como un error confuso, se cambió el manejo de esa respuesta: si el panel pide la lista de moderadores y el servidor contesta "No autorizado" estando supuestamente logueado, ya no se queda mostrando la tarjeta rota — cierra la sesión automáticamente y vuelve a la pantalla de login con un mensaje claro ("Tu sesión ya no es válida. Iniciá sesión de nuevo."), para que sea evidente qué hacer en vez de dejar dudas.

Se probó localmente con Playwright: los atributos `autocomplete` correctos en cada campo, que la lista de moderadores se muestra normalmente cuando el backend responde bien, y que una respuesta "No autorizado" en `listModerators` fuerza la vuelta a la pantalla de login con el mensaje de sesión vencida (en vez de quedar en un estado roto). También se repitieron las verificaciones ya existentes de las funciones relacionadas (cambio de contraseña obligatorio del moderador, recuperación de contraseña del administrador) para confirmar que nada se rompió.

### Cambio de contraseña obligatorio en el primer ingreso de un moderador

Cuando el administrador crea un moderador, le da él mismo una contraseña por defecto (la que eligió al completar el formulario "Crear moderador"). Para que esa contraseña provisoria no quede en uso indefinidamente, cada moderador nuevo se marca internamente con una bandera `mustChangePassword`, y la primera vez que ese moderador inicia sesión, el panel lo bloquea con una pantalla de "Cambio de contraseña obligatorio": no puede ver las solicitudes ni hacer nada más hasta que elija una contraseña nueva (de al menos 8 caracteres, confirmada dos veces). Recién ahí se le libera el resto del panel, sin necesidad de volver a loguearse — sigue en la misma sesión, ya con la contraseña nueva.

Esto se resolvió agregando la bandera al registro del moderador (se guarda encriptada como el resto de sus datos, nunca en texto plano), propagándola en la respuesta del login (`adminLogin`) y agregando una acción nueva, `changeModeratorPassword`, que solo un moderador logueado puede usar sobre su propia cuenta para fijar la contraseña definitiva y apagar la bandera. El administrador (nivel 1) nunca pasa por esta pantalla, porque su propio cambio de contraseña ya se resuelve con el panel "Mis credenciales" descripto más arriba.

Se probó localmente con Playwright (login simulado con la bandera en distintos estados: moderador nuevo bloqueado, intento de contraseña demasiado corta rechazado, cambio exitoso que libera el panel en la misma sesión, y moderador ya "graduado" que entra directo sin ver la pantalla de bloqueo) y contra el backend real mediante una función de prueba temporal en el editor de Apps Script (creada y borrada en la misma verificación, sin dejar rastros en las Script Properties): confirma que la contraseña por defecto deja de funcionar apenas se cambia, que la nueva sí funciona, y que `mustChangePassword` pasa a `false` tanto en un login posterior como en la respuesta inmediata del cambio.

### Registro de moderadores en la planilla, y reversión de aprobaciones/rechazos

Roberto pidió, además, poder ver un registro de los moderadores directamente en la planilla de Google Sheets (no solo en el panel), y poder revertir una aprobación o rechazo si un moderador (o el propio administrador) se equivoca.

Se agregaron dos hojas nuevas a la planilla, separadas de la hoja principal de inscripciones:

- **Moderadores**: cada vez que se crea un moderador desde el panel, se agrega una fila con su usuario y la fecha de alta, con Estado "Activo". Al eliminarlo, esa fila no se borra: pasa a Estado "Eliminado" con la fecha del cambio, para conservar el historial de quién tuvo acceso y cuándo (mismo criterio que ya se usaba para las inscripciones borradas). La contraseña del moderador **no** se guarda acá ni en ningún otro lado en texto plano — solo queda su versión encriptada (hash + sal) en las Script Properties, igual que la del administrador.
- **HistorialAcciones**: cada vez que alguien (administrador o moderador) aprueba o rechaza una solicitud, se agrega una fila con la fecha, quién lo hizo, su rol, el Id de la inscripción, y el estado anterior y nuevo.

Con ese historial, el administrador de nivel 1 tiene ahora un botón **"Revertir"** en cada solicitud que ya fue aprobada o rechazada (no aparece en las que siguen "Pendiente", porque ahí no hay nada que revertir). A diferencia de la primera versión de esta función, **no hay límite de tiempo**: el botón sigue disponible sin importar cuánto haya pasado desde el cambio de estado, para que Roberto pueda corregir un error de un moderador (o propio) cuando lo note, sin tener que apurarse ni volver a incomodar al aspirante pidiéndole que se vuelva a inscribir. Al usarlo, el backend busca el último cambio registrado para esa inscripción en `HistorialAcciones` y la devuelve al estado que tenía antes, dejando además una nueva fila con la reversión (para que quede registrado que se revirtió, y cuándo). Los moderadores no ven este botón ni pueden llamar a esta acción (`revertirEstado`) directamente: está reservada al administrador de nivel 1, igual que borrar inscripciones.

Se probó localmente (con datos simulados) que el botón aparece en filas Aprobadas/Rechazadas sin importar su antigüedad y no aparece en las Pendientes, y que al usarlo se actualiza el estado mostrado en el panel. También se verificó mediante funciones de prueba temporales ejecutadas directamente en el editor de Apps Script (sin pasar por el login, y borradas después de usarlas) que la escritura en la hoja "Moderadores", el marcado como "Eliminado", el registro en "HistorialAcciones", y que un cambio de estado de hace varios días (que con el límite de 30 minutos original hubiera sido rechazado) ahora se revierte sin problema.

### Una vez decidida una solicitud, solo el administrador puede volver a cambiarla

Roberto pidió que, cuando un moderador (o él mismo) apruebe o rechace a un nuevo miembro, solo él como administrador de nivel 1 pueda volver a modificar el estado de esa solicitud. En concreto: en cuanto un moderador hace clic en "Aprobar" o "Rechazar", esos botones tienen que dejar de aparecerle para esa solicitud.

Se agregó una validación en el backend (acción `setEstado`, en `Code.gs`): antes de aplicar el cambio de estado, revisa cuál era el estado anterior de la solicitud. Si ya no está "Pendiente" (es decir, ya fue aprobada o rechazada por alguien) y quien hace el pedido no es el administrador, la acción se rechaza con el mensaje "Solo el administrador puede modificar una solicitud ya definida.", sin tocar la planilla. Si el estado anterior era "Pendiente", o si quien pide el cambio es el administrador, se procesa como siempre. Esto es lo que de verdad protege los datos: aunque alguien manipulara la página para forzar el pedido, el servidor lo rechaza igual.

En el panel (`index.html`) se ajustó en paralelo la lógica que decide qué botones mostrar en cada fila: los botones "Aprobar" y "Rechazar" ahora solo aparecen para un moderador si la solicitud todavía está "Pendiente". Una vez que pasa a "Aprobado" o "Rechazado", esos botones desaparecen de su vista. El administrador de nivel 1 no tiene esta restricción: sigue viendo el botón correspondiente para cambiar de opinión (por ejemplo, "Rechazar" en una que ya está aprobada), igual que antes.

Como red de seguridad para el caso poco frecuente de que dos personas actúen sobre la misma solicitud casi al mismo tiempo (por ejemplo, un moderador con la página abierta desde antes de que el administrador ya la haya decidido), si el backend rechaza el cambio se muestra el mensaje de error específico y se vuelve a cargar la lista de solicitudes automáticamente, para que la fila refleje el estado real y los botones se actualicen.

Se verificó el cambio de dos formas. Contra el backend real, con una función de prueba temporal (creada y borrada en la misma sesión, sin dejar rastros ni tocar datos reales) que confirmó los tres escenarios: un moderador aprobando una solicitud Pendiente funciona igual que antes, un moderador intentando cambiar una ya decidida es rechazado con el mensaje nuevo, y el administrador puede cambiarla igual sin restricción. Contra el panel, con pruebas automatizadas (Playwright) que comprueban que un moderador ve los botones solo en la fila Pendiente y no en las ya decididas, que el administrador conserva el botón para revertir la decisión, y que ante un rechazo del backend se muestra el mensaje correcto y la lista se refresca.

### El botón "Revertir" no aplicaba el cambio

Roberto avisó que, al probar el botón "Revertir" sobre una decisión de un moderador, no pasaba nada visible en el panel. Investigando el backend se encontró la causa: la acción `revertirEstado` en `Code.gs` había sido migrada en algún momento anterior a usar una función auxiliar más nueva, `requireAuth(data, true)`, que devuelve el resultado de la autenticación envuelto en un objeto (`{ auth: { ok, role, user, ... } }`). Pero el código que registra la reversión en `HistorialAcciones` seguía escrito como si existiera una variable `auth` propia (`auth.user`, `auth.role`), algo que sí es válido en la acción `setEstado` (que llama a `checkAuth` directamente) pero no en `revertirEstado`. Como esa variable no existía en ese punto del código, la línea fallaba con un error de JavaScript ("auth is not defined").

Lo más engañoso del bug es que el estado de la solicitud sí se llegaba a revertir en la planilla (esa escritura ocurre antes en el código), pero como la falla pasaba justo después, al intentar dejar registro del cambio en el historial, el pedido completo terminaba devolviendo un error al panel. El panel, al recibir un error, no actualiza lo que muestra en pantalla — por eso Roberto veía que "no pasaba nada", cuando en realidad el dato sí había cambiado por detrás, pero sin quedar registrado en el historial de acciones.

Se corrigió la línea para que use la referencia correcta (`guardRev.auth.user` y `guardRev.auth.role`, en vez de `auth.user` y `auth.role`). Se revisaron también las otras acciones que usan `requireAuth` (crear y eliminar moderadores, entre otras) para confirmar que ninguna tenía el mismo problema — solo afectaba a `revertirEstado`.

Se verificó el arreglo con una prueba temporal contra el backend real (creada y eliminada en la misma sesión, sin dejar rastros): se simuló una solicitud ya aprobada por un moderador, con su registro correspondiente en `HistorialAcciones`, y se llamó a la acción `revertirEstado` sin usar credenciales reales (se sustituyó momentáneamente la verificación de autenticación por una de prueba, sólo durante el test). Antes de la corrección esa llamada fallaba; después, revierte correctamente el estado a "Pendiente", no lanza ningún error, y queda una fila nueva en `HistorialAcciones` registrando la reversión. Se desplegó como una nueva versión del backend para que el botón funcione ya mismo en producción.

### Tabla de solicitudes más ancha en pantallas de escritorio

Roberto pidió que la tabla de solicitudes se viera completa en la versión de PC de escritorio, sin tener que desplazar la barra horizontal para ver las últimas columnas (Estado, Actualizado, Acción).

La tabla en sí ya tenía un ancho mínimo generoso (1380px) para que cada columna tuviera espacio legible, pero el contenedor que envuelve todo el panel admin (formulario de cambio de contraseña, barra de navegación, tarjetas de resumen y la tabla) tenía un ancho máximo fijo de 1100px — mucho menor que el ancho mínimo de la tabla. Por eso, aunque la ventana del navegador fuera bien ancha, la tabla quedaba igual apretada dentro de ese contenedor angosto y aparecía la barra de scroll horizontal.

Se amplió ese ancho máximo del panel de 1100px a 1500px. Al ser un `max-width` (no un ancho fijo), no afecta a pantallas más chicas: en una ventana angosta el panel simplemente ocupa el ancho disponible, igual que antes.

Se verificó con pruebas automatizadas (Playwright) en varias resoluciones típicas: en 1920×1080 y en 1440×900 (las más comunes en monitores de escritorio) la tabla ahora entra completa, sin necesidad de scroll horizontal. En notebooks con pantallas más chicas (1366×768 o 1280×800) todavía aparece un scroll horizontal leve, porque a ese ancho no entran las 12 columnas con un tamaño de letra cómodo — reducir la tabla para que quepa ahí iría en contra de lo que pidió Roberto (que se vea más ancha, no más apretada).

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

## Fichas de usuario (foto, scoring de bajas y grados)

Roberto pidió una ficha individual para cada persona del equipo — con lugar para una foto — donde cada uno pueda cargar la cantidad de bajas causadas en la partida del día, que esas bajas se vayan acumulando en un total visible en la ficha, y eventualmente asignar grados para armar un ranking. Tres niveles de acceso: administrador (Roberto), moderadores, y miembros del equipo — estos últimos solo pueden ver y cargar su propia ficha, nunca la de otra persona.

### Cómo se crea la cuenta de una ficha

Antes de tener ficha, alguien tiene que ser ya un miembro **aprobado** (Tipo "Miembro del equipo", Estado "Aprobado" en la planilla principal de inscripciones). Desde el botón **"Mi Ficha"** en la barra superior del sitio, esa persona entra a una pantalla de login separada del panel admin; ahí puede elegir "¿Sos miembro aprobado y todavía no creaste tu usuario?" para llegar a un formulario de alta que pide su DNI y el Código de inscripción que recibió al anotarse (`HVK-2026-####`), un callsign opcional, un usuario y contraseña a elección, y **una foto** (obligatoria). El backend valida ese DNI + Código contra la fila aprobada correspondiente antes de crear la cuenta, así que nadie puede crearse una ficha sin haber sido aprobado antes como miembro, y no se puede crear dos veces una cuenta para la misma inscripción.

El administrador y los moderadores no pasan por este alta: como ya tienen sus propias credenciales (las mismas del panel admin), su ficha se crea automáticamente la primera vez que entran a "Mi Ficha" con esas credenciales, con grado por defecto "Comandante" (admin) o "Tropa" (moderador) y 0 bajas, y pueden completar después su callsign y foto desde su propia ficha. Además, desde dentro del panel admin hay un botón **"Mi Ficha"** que entra directo a la ficha reutilizando el usuario y contraseña ya ingresados, sin pedir loguearse una segunda vez — antes solo se podía llegar volviendo al sitio público.

### La foto se guarda en la propia planilla, no en Google Drive

Para evitar tener que pedir permisos nuevos de Google Drive al deploy existente (lo que hubiera significado una pantalla de reconsentimiento y el riesgo de romper el acceso público anónimo que ya tiene la app), la foto no se sube a Drive: el navegador la redimensiona localmente (máximo 300px de lado más largo, JPEG con compresión) antes de mandarla, y el backend la guarda como texto (formato `data:image/jpeg;base64,...`) directamente en una celda de la planilla. Con ese tamaño, cada foto ocupa bastante menos que el límite de 45.000 caracteres que valida el backend antes de guardarla.

### Estructura en la planilla

Se agregaron dos hojas nuevas, separadas de las de inscripciones:

- **Fichas**: una fila por persona con cuenta creada — `Usuario`, `Rol` (admin/moderador/miembro), `InscripcionId` (el Id de su fila en la planilla de inscripciones, vacío para admin/moderador), `Nombre`, `Callsign`, `FotoBase64`, `Grado`, `BajasTotales`, `PassHash`, `PassSalt` (la contraseña de la ficha se guarda encriptada, igual que la de moderadores y admin — nunca en texto plano), `Estado`, `FechaCreado`.
- **ScoringHistorial**: un registro de cada vez que alguien suma bajas — fecha, usuario, rol, cuántas bajas sumó en esa carga puntual, y el total acumulado resultante. Sirve como historial de auditoría; la ficha en sí solo muestra el total acumulado (`BajasTotales`), no este detalle día por día.

### Qué puede hacer cada nivel

- **Miembro**: ve solo su propia ficha (foto, callsign, nombre y apellido real, grado, bajas totales y fecha desde que es miembro), puede cargar la cantidad de últimas bajas causadas (se suma al total, no lo reemplaza) y puede editar su callsign, su nombre completo y su foto. No ve la ficha de nadie más, el ranking del equipo, ni puede cambiar su propio grado.
- **Moderador**: además de su propia ficha, ve el **ranking del equipo** — el listado completo de fichas ordenado por bajas totales (de mayor a menor), con foto, callsign, nombre y apellido real, y grado de cada persona. No puede cambiar el grado de nadie, ni siquiera el propio.
- **Administrador**: todo lo anterior, más la posibilidad de asignarle un grado nuevo a cualquier ficha desde el ranking (un selector con los grados disponibles y un botón "Guardar" por fila), y también puede editar su propio grado con el mismo tipo de selector directamente desde "Mi Ficha", sin tener que ir al ranking.

Los grados disponibles son solo tres, ordenados de mayor a menor: **Comandante**, **Tropa** y **Recluta**.

Debajo del callsign —tanto en "Mi Ficha" como en cada fila del ranking— figura solo el nombre y apellido real de la persona, no su rol ni su grado mezclados en el mismo texto. Para un miembro ese nombre real llega automáticamente desde su inscripción aprobada; como el administrador y los moderadores no tienen inscripción (su ficha se autogenera con su nombre de usuario como placeholder), ahora pueden cargar su nombre y apellido real desde el formulario "Editar ficha" en su propia ficha — el mismo campo `Nombre` de la planilla, editable junto con el callsign y la foto a través de la acción `completarFicha`.

En el ranking, el grado tiene su propia columna, separada del nombre y de las bajas totales: para el administrador es el mismo selector editable de siempre (con su botón "Guardar" por fila); para moderadores, que no pueden editar el grado de nadie, esa columna muestra el grado como texto simple con la etiqueta "Grado" debajo, en el mismo lugar donde el administrador ve el selector.

Estos permisos están validados en el backend (`Code.gs`), no solo ocultando botones en la pantalla: las acciones `listFichas` y `setGrado` rechazan el pedido si quien lo hace no tiene el rol necesario, así que aunque alguien manipulara la página no podría ver el ranking siendo miembro ni cambiar un grado sin ser administrador. El selector de grado que ve el administrador (tanto en el ranking como en su propia ficha) reutiliza esta misma acción `setGrado` — no hay un camino separado para editar el grado propio, así que la misma validación de rol aplica en los dos casos.

### Verificación

El backend se probó de punta a punta contra la planilla y el login reales, con una función de prueba temporal en el editor de Apps Script (creaba fichas y filas de historial de prueba, ejercitaba las siete acciones nuevas —incluyendo el alta completa de una ficha de miembro simulando una inscripción ya aprobada—, verificaba los resultados y borraba todo lo que había creado antes de terminar, sin dejar rastros en las hojas reales). Se desplegó como una nueva versión del deploy existente una vez confirmado que las 14 verificaciones pasaban y que las hojas quedaban limpias.

El frontend (la pantalla "Mi Ficha", el login/alta, la carga de bajas, la edición de ficha propia y el ranking con edición de grado) se probó localmente con Playwright simulando las respuestas del backend real: login y vista de ficha de un miembro (con su foto, callsign y bajas totales), carga de bajas del día y edición de callsign, y para un administrador el ranking completo con cambio de grado de otra persona (confirmando que el pedido al backend lleva el usuario y el grado correctos). También se probó el alta de cuenta nueva: que no se puede enviar sin elegir una foto, que la foto se redimensiona correctamente por debajo del límite de tamaño, y que al crear la cuenta con éxito vuelve a la pantalla de login con un aviso para iniciar sesión con los datos nuevos. Se agregó además una prueba específica para el campo "Nombre completo": que aparece precargado en el formulario "Editar ficha" con el nombre real ya guardado, que al guardarlo se envía correctamente en el pedido `completarFicha`, y que tanto en la ficha individual como en cada fila del ranking el texto debajo del callsign muestra ese nombre real en vez del rol.

La primera vez que se agregó esta función fue necesario autorizar manualmente el permiso de envío de correo desde el editor de Apps Script (ejecutando la función una vez y aceptando el permiso solicitado); si en el futuro se mueve el proyecto a otra cuenta de Google, habría que repetir ese paso una vez.
