function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var authResponse = handleAuthActions_(data);
    if (authResponse) return authResponse;

    if (data.action === 'fichaLogin') {
      var authFichaLogin = loginAttempt_(data.user, data.pass);
      if (authFichaLogin.locked) return lockedOut_(authFichaLogin.waitMin);
      if (!authFichaLogin.ok) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Usuario o contraseña incorrectos.'})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', role: authFichaLogin.role, mustChangePassword: !!authFichaLogin.mustChangePassword})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'crearFichaMiembro') {
      var dniNueva = String(data.dni || '').trim();
      var codigoNueva = String(data.codigo || '').trim();
      var usuarioNueva = String(data.usuario || '').trim();
      var passNueva = String(data.pass || '');
      var callsignNueva = String(data.callsign || '').trim();
      var fotoNueva = String(data.fotoBase64 || '');

      if (!dniNueva || !codigoNueva || !usuarioNueva || !passNueva) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Completá todos los campos obligatorios.'})).setMimeType(ContentService.MimeType.JSON);
      }
      if (usuarioNueva.length < 3) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'El usuario debe tener al menos 3 caracteres.'})).setMimeType(ContentService.MimeType.JSON);
      }
      if (passNueva.length < 8) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'La contraseña debe tener al menos 8 caracteres.'})).setMimeType(ContentService.MimeType.JSON);
      }
      if (fotoNueva && fotoNueva.length > 45000) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'La foto es demasiado pesada. Proba con una mas liviana.'})).setMimeType(ContentService.MimeType.JSON);
      }

      var adminUserProp = PropertiesService.getScriptProperties().getProperty('ADMIN_USER') || '';
      var modsExistentes = getModerators();
      var usuarioEnUso = usuarioNueva.toLowerCase() === adminUserProp.toLowerCase() ||
        modsExistentes.some(function (mm) { return String(mm.user).toLowerCase() === usuarioNueva.toLowerCase(); });

      var fichaSheetNueva = getFichaSheet_();
      var fichaDataNueva = fichaSheetNueva.getDataRange().getValues();
      for (var fi = 1; fi < fichaDataNueva.length; fi++) {
        if (String(fichaDataNueva[fi][0]).toLowerCase() === usuarioNueva.toLowerCase()) usuarioEnUso = true;
      }
      if (usuarioEnUso) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ese nombre de usuario ya esta en uso.'})).setMimeType(ContentService.MimeType.JSON);
      }

      var inscripcionMatch = findAprobadoMiembroByDniCodigo_(dniNueva, codigoNueva);
      if (!inscripcionMatch) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No encontramos una inscripcion aprobada como miembro con ese DNI y codigo.'})).setMimeType(ContentService.MimeType.JSON);
      }

      for (var fj = 1; fj < fichaDataNueva.length; fj++) {
        if (String(fichaDataNueva[fj][2]) === inscripcionMatch.id) {
          return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ya existe un usuario creado para esta inscripcion.'})).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var saltNueva = Utilities.getUuid();
      var hashNueva = hashPassword(passNueva, saltNueva);
      fichaSheetNueva.appendRow([
        usuarioNueva, 'miembro', inscripcionMatch.id, inscripcionMatch.nombre,
        callsignNueva || inscripcionMatch.nombre, fotoNueva, '', 0,
        hashNueva, saltNueva, 'Activo', new Date()
      ]);
      return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'getMiFicha') {
      var guardMiFicha = requireFichaAuth_(data, null);
      if (guardMiFicha.error) return guardMiFicha.error;
      var fichaPropia = ensureFichaForRole_(guardMiFicha.auth.user, guardMiFicha.auth.role);
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', ficha: fichaRowToObject_(fichaPropia.values)})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'completarFicha') {
      var guardCompletar = requireFichaAuth_(data, null);
      if (guardCompletar.error) return guardCompletar.error;
      var fotoCompletar = String(data.fotoBase64 || '');
      var callsignCompletar = String(data.callsign || '').trim();
      var nombreCompletar = String(data.nombre || '').trim();
      if (fotoCompletar && fotoCompletar.length > 45000) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'La foto es demasiado pesada. Proba con una mas liviana.'})).setMimeType(ContentService.MimeType.JSON);
      }
      var sheetCompletar = getFichaSheet_();
      var fichaCompletar = ensureFichaForRole_(guardCompletar.auth.user, guardCompletar.auth.role);
      if (callsignCompletar) sheetCompletar.getRange(fichaCompletar.rowNum, 5).setValue(callsignCompletar);
      if (nombreCompletar) sheetCompletar.getRange(fichaCompletar.rowNum, 4).setValue(nombreCompletar);
      if (fotoCompletar) sheetCompletar.getRange(fichaCompletar.rowNum, 6).setValue(fotoCompletar);
      return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'sumarBajas') {
      var guardSumar = requireFichaAuth_(data, null);
      if (guardSumar.error) return guardSumar.error;
      var cantidadSumar = Number(data.cantidad);
      if (!isFinite(cantidadSumar) || cantidadSumar <= 0 || cantidadSumar > 999 || Math.floor(cantidadSumar) !== cantidadSumar) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ingresa un numero entero entre 1 y 999.'})).setMimeType(ContentService.MimeType.JSON);
      }
      var sheetSumar = getFichaSheet_();
      var fichaSumar = ensureFichaForRole_(guardSumar.auth.user, guardSumar.auth.role);
      var totalNuevo = (Number(fichaSumar.values[7]) || 0) + cantidadSumar;
      sheetSumar.getRange(fichaSumar.rowNum, 8).setValue(totalNuevo);
      getScoringSheet_().appendRow([new Date(), guardSumar.auth.user, guardSumar.auth.role, cantidadSumar, totalNuevo]);
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', bajasTotales: totalNuevo})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'listFichas') {
      var guardListFichas = requireFichaAuth_(data, ['admin', 'moderador']);
      if (guardListFichas.error) return guardListFichas.error;
      var sheetListFichas = getFichaSheet_();
      var dataListFichas = sheetListFichas.getDataRange().getValues();
      var fichasList = [];
      for (var li = 1; li < dataListFichas.length; li++) {
        fichasList.push(fichaRowToObject_(dataListFichas[li]));
      }
      fichasList.sort(function (a, b) { return b.bajasTotales - a.bajasTotales; });
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', fichas: fichasList})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'adminLogin') {
      var guardAL = requireAuth(data, false);
      if (guardAL.error) return guardAL.error;
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', role: guardAL.auth.role, mustChangePassword: !!guardAL.auth.mustChangePassword})).setMimeType(ContentService.MimeType.JSON);
    }
  if (data.action === 'requestAdminPasswordReset') {
    var cache3 = CacheService.getScriptCache();
    var lastReq3 = Number(cache3.get('adminResetLastReq') || 0);
    var now3 = new Date().getTime();
    if (lastReq3 && (now3 - lastReq3) < 2 * 60 * 1000) {
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ya se envio un codigo hace poco. Revisa tu email o espera unos minutos antes de pedir uno nuevo.'})).setMimeType(ContentService.MimeType.JSON);
    }
    cache3.put('adminResetLastReq', String(now3), 600);
    var resetCode = generateResetCode();
    var resetSalt = Utilities.getUuid();
    var resetHash = hashPassword(resetCode, resetSalt);
    cache3.put('adminResetCodeHash', resetHash, 900);
    cache3.put('adminResetCodeSalt', resetSalt, 900);
    cache3.remove('adminResetAttempts');
    MailApp.sendEmail('s.c.roberto.rs@gmail.com', 'Codigo para recuperar tu contrasena - Havok Airsoft', 'Tu codigo de recuperacion es: ' + resetCode + '\n\nEste codigo vence en 15 minutos y sirve una sola vez. Si vos no pediste este cambio, ignora este mensaje.');
    return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
  }

  if (data.action === 'confirmAdminPasswordReset') {
    var cache4 = CacheService.getScriptCache();
    var storedHash4 = cache4.get('adminResetCodeHash');
    var storedSalt4 = cache4.get('adminResetCodeSalt');
    if (!storedHash4 || !storedSalt4) {
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No hay ningun codigo activo. Pedi uno nuevo.'})).setMimeType(ContentService.MimeType.JSON);
    }
    var attempts4 = Number(cache4.get('adminResetAttempts') || 0);
    if (attempts4 >= 5) {
      cache4.remove('adminResetCodeHash');
      cache4.remove('adminResetCodeSalt');
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Demasiados intentos fallidos. Pedi un codigo nuevo.'})).setMimeType(ContentService.MimeType.JSON);
    }
    var codeIn4 = (data.code || '').toString().trim().toUpperCase();
    var newPass4 = (data.newPass || '').toString();
    if (hashPassword(codeIn4, storedSalt4) !== storedHash4) {
      cache4.put('adminResetAttempts', String(attempts4 + 1), 900);
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Codigo incorrecto.'})).setMimeType(ContentService.MimeType.JSON);
    }
    if (newPass4.length < 8) {
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'La contrasena debe tener al menos 8 caracteres.'})).setMimeType(ContentService.MimeType.JSON);
    }
    var salt4 = Utilities.getUuid();
    var hash4 = hashPassword(newPass4, salt4);
    var props4 = PropertiesService.getScriptProperties();
    props4.setProperty('ADMIN_PASS_HASH', hash4);
    props4.setProperty('ADMIN_PASS_SALT', salt4);
    props4.deleteProperty('ADMIN_PASS');
    cache4.remove('adminResetCodeHash');
    cache4.remove('adminResetCodeSalt');
    cache4.remove('adminResetAttempts');
    cache4.remove('adminFailCount');
    cache4.remove('adminLockUntil');
    var adminKey4 = userKey_(props4.getProperty('ADMIN_USER'));
    cache4.remove('lock_' + adminKey4);
    cache4.remove('fail_' + adminKey4);
    return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
  }


    if (data.action === 'list') {
      var guardStaff = requireAuth(data, false);
      if (guardStaff.error) return guardStaff.error;
      var auth = guardStaff.auth;
      var listSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var listValues = listSheet.getDataRange().getValues();
      var listHeaders = listValues[0];
      var listRows = [];
      for (var li = 1; li < listValues.length; li++) {
        var listRow = listValues[li];
        var listObj = {};
        for (var lj = 0; lj < listHeaders.length; lj++) {
          listObj[listHeaders[lj]] = listRow[lj];
        }
        if (listObj['Estado'] === 'Eliminado') continue;
        listRows.push(listObj);
      }
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', rows: listRows})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'delete') {
      var guardStaff = requireAuth(data, false);
      if (guardStaff.error) return guardStaff.error;
      var auth = guardStaff.auth;
      if (auth.role !== 'admin') {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No autorizado (accion reservada al administrador)'})).setMimeType(ContentService.MimeType.JSON);
      }
      var delSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var delValues = delSheet.getDataRange().getValues();
      var delHeaders = delValues[0];
      var delIdCol = delHeaders.indexOf('Id');
      var delEstadoCol = delHeaders.indexOf('Estado');
      var delFechaEstadoCol = delHeaders.indexOf('FechaEstado');
      var delDone = false;
      for (var di = delValues.length - 1; di >= 1; di--) {
        if (delValues[di][delIdCol] === data.id) {
          delSheet.getRange(di + 1, delEstadoCol + 1).setValue('Eliminado');
          if (delFechaEstadoCol !== -1) {
            delSheet.getRange(di + 1, delFechaEstadoCol + 1).setValue(new Date());
          }
          delDone = true;
          break;
        }
      }
      if (delDone) {
        return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No se encontro esa inscripcion'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'setEstado') {
      var guardStaff = requireAuth(data, false);
      if (guardStaff.error) return guardStaff.error;
      var auth = guardStaff.auth;
      var estSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var estValues = estSheet.getDataRange().getValues();
      var estHeaders = estValues[0];
      var estIdCol = estHeaders.indexOf('Id');
      var estEstadoCol = estHeaders.indexOf('Estado');
      var estFechaEstadoCol = estHeaders.indexOf('FechaEstado');
      var estDone = false;
      for (var ei = estValues.length - 1; ei >= 1; ei--) {
        if (estValues[ei][estIdCol] === data.id) {
          var estadoAnterior = estValues[ei][estEstadoCol] || 'Pendiente';
          if (estadoAnterior !== 'Pendiente' && auth.role !== 'admin') {
            return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Solo el administrador puede modificar una solicitud ya definida.'})).setMimeType(ContentService.MimeType.JSON);
          }
          estSheet.getRange(ei + 1, estEstadoCol + 1).setValue(data.estado || 'Pendiente');
          if (estFechaEstadoCol !== -1) {
            estSheet.getRange(ei + 1, estFechaEstadoCol + 1).setValue(new Date());
          }

                  if (data.estado === 'Aprobado' && estadoAnterior !== 'Aprobado') {
                            var estEmailCol = estHeaders.indexOf('Email');
                                      var estCodigoCol = estHeaders.indexOf('Codigo');
                                                var estNombreCol = estHeaders.indexOf('Nombre');
                                                          var destEmail = estEmailCol !== -1 ? String(estValues[ei][estEmailCol] || '').trim() : '';
                                                                    if (destEmail) {
                                                                              var destNombre = estNombreCol !== -1 ? String(estValues[ei][estNombreCol] || '') : '';
                                                                                        var destCodigo = estCodigoCol !== -1 ? String(estValues[ei][estCodigoCol] || '') : '';
                                                                                                  try {
                                                                                                            MailApp.sendEmail(destEmail, 'Tu inscripcion fue aprobada - Havok Airsoft', 'Hola ' + destNombre + ',\n\nTu inscripcion en Havok Airsoft fue aprobada.\n\nTu codigo de inscripcion es: ' + destCodigo + '\n\nCon tu DNI y este codigo podes crear tu usuario para ver tu ficha y el ranking del equipo, desde el boton "Ingresar" del sitio, opcion "Crear mi usuario".\n\nBienvenido/a al equipo!');
                                                                                                                      } catch (errMailAprob) {
                                                                                                                                Logger.log('Error enviando mail de aprobacion: ' + errMailAprob);
                                                                                                                                          }
                                                                                                                                                    }
                                                                                                                                                            }
          var histSheet = getOrCreateSheet('HistorialAcciones', ['Fecha', 'Usuario', 'Rol', 'Id', 'EstadoAnterior', 'EstadoNuevo']);
          histSheet.appendRow([new Date(), auth.user, auth.role, data.id, estadoAnterior, data.estado || 'Pendiente']);
          estDone = true;
          break;
        }
      }
      if (estDone) {
        return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No se encontro esa inscripcion'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'revertirEstado') {
      var guardRev = requireAuth(data, true);
      if (guardRev.error) return guardRev.error;
      var revSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var revValues = revSheet.getDataRange().getValues();
      var revHeaders = revValues[0];
      var revIdCol = revHeaders.indexOf('Id');
      var revEstadoCol = revHeaders.indexOf('Estado');
      var revFechaEstadoCol = revHeaders.indexOf('FechaEstado');
      var revRowIndex = -1;
      for (var ri = revValues.length - 1; ri >= 1; ri--) {
        if (revValues[ri][revIdCol] === data.id) { revRowIndex = ri; break; }
      }
      if (revRowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No se encontro esa inscripcion'})).setMimeType(ContentService.MimeType.JSON);
      }
      var histSheet2 = getOrCreateSheet('HistorialAcciones', ['Fecha', 'Usuario', 'Rol', 'Id', 'EstadoAnterior', 'EstadoNuevo']);
      var histValues = histSheet2.getDataRange().getValues();
      var lastEntry = null;
      for (var hi = histValues.length - 1; hi >= 1; hi--) {
        if (histValues[hi][3] === data.id) { lastEntry = histValues[hi]; break; }
      }
      if (!lastEntry) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No hay ninguna accion registrada para revertir en esta inscripcion.'})).setMimeType(ContentService.MimeType.JSON);
      }
      var estadoRestaurado = lastEntry[4];
      revSheet.getRange(revRowIndex + 1, revEstadoCol + 1).setValue(estadoRestaurado);
      if (revFechaEstadoCol !== -1) {
        revSheet.getRange(revRowIndex + 1, revFechaEstadoCol + 1).setValue(new Date());
      }
      histSheet2.appendRow([new Date(), guardRev.auth.user, guardRev.auth.role, data.id, lastEntry[5], estadoRestaurado]);
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', estado: estadoRestaurado})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'changeCredentials') {
      var guard1 = requireAuth(data, true);
      if (guard1.error) return guard1.error;
      var newUser = (data.newUser || '').toString().trim();
      var newPass = (data.newPass || '').toString();
      if (newUser.length < 3 || newPass.length < 8) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'El usuario debe tener al menos 3 caracteres y la contrasena al menos 8.'})).setMimeType(ContentService.MimeType.JSON);
      }
      if (getModerators().some(function (m) { return m.user === newUser; })) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ese usuario ya esta en uso por un moderador.'})).setMimeType(ContentService.MimeType.JSON);
      }
      var salt1 = Utilities.getUuid();
      var hash1 = hashPassword(newPass, salt1);
      var props1 = PropertiesService.getScriptProperties();
      props1.setProperty('ADMIN_USER', newUser);
      props1.setProperty('ADMIN_PASS_HASH', hash1);
      props1.setProperty('ADMIN_PASS_SALT', salt1);
      props1.deleteProperty('ADMIN_PASS');
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', token: createSession_(newUser, 'admin')})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'createModerator') {
      var guard2 = requireAuth(data, true);
      if (guard2.error) return guard2.error;
      var modUser = (data.newModUser || '').toString().trim();
      var modPass = (data.newModPass || '').toString();
      var modEmail = (data.newModEmail || '').toString().trim();
      if (modEmail && !isValidEmail_(modEmail)) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ese email no parece valido.'})).setMimeType(ContentService.MimeType.JSON);
      }
      if (modUser.length < 3 || modPass.length < 8) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'El usuario debe tener al menos 3 caracteres y la contrasena al menos 8.'})).setMimeType(ContentService.MimeType.JSON);
      }
      if (modUser === PropertiesService.getScriptProperties().getProperty('ADMIN_USER')) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ese usuario ya esta en uso por el administrador.'})).setMimeType(ContentService.MimeType.JSON);
      }
      var mods2 = getModerators();
      if (mods2.some(function (m) { return m.user === modUser; })) {
        return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Ya existe un moderador con ese usuario.'})).setMimeType(ContentService.MimeType.JSON);
      }
      var salt2 = Utilities.getUuid();
      var hash2 = hashPassword(modPass, salt2);
      mods2.push({ user: modUser, salt: salt2, hash: hash2, creado: new Date().toISOString(), mustChangePassword: true, email: modEmail });
      saveModerators(mods2);
      var modSheet = getOrCreateSheet('Moderadores', ['Usuario', 'Creado', 'Estado', 'FechaEstado']);
      modSheet.appendRow([modUser, new Date(), 'Activo', new Date()]);
      return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'deleteModerator') {
      var guard3 = requireAuth(data, true);
      if (guard3.error) return guard3.error;
      var mods3 = getModerators().filter(function (m) { return m.user !== data.targetUser; });
      saveModerators(mods3);
      var modSheet2 = getOrCreateSheet('Moderadores', ['Usuario', 'Creado', 'Estado', 'FechaEstado']);
      var modSheetValues = modSheet2.getDataRange().getValues();
      for (var msi = modSheetValues.length - 1; msi >= 1; msi--) {
        if (modSheetValues[msi][0] === data.targetUser && modSheetValues[msi][2] === 'Activo') {
          modSheet2.getRange(msi + 1, 3).setValue('Eliminado');
          modSheet2.getRange(msi + 1, 4).setValue(new Date());
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({result: 'ok'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'listModerators') {
      var guard4 = requireAuth(data, true);
      if (guard4.error) return guard4.error;
      var mods4 = getModerators().map(function (m) { return { user: m.user, creado: m.creado, email: m.email || '' }; });
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', moderadores: mods4})).setMimeType(ContentService.MimeType.JSON);
    }
  if (data.action === 'changeModeratorPassword') {
    var guard5 = requireAuth(data, false);
    if (guard5.error) return guard5.error;
    if (guard5.auth.role !== 'moderador') {
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'No autorizado'})).setMimeType(ContentService.MimeType.JSON);
    }
    var newPass5 = (data.newPass || '').toString();
    if (newPass5.length < 8) {
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'La contrasena debe tener al menos 8 caracteres.'})).setMimeType(ContentService.MimeType.JSON);
    }
    if (!setPassword_(guard5.auth.user, 'moderador', newPass5)) {
      return ContentService.createTextOutput(JSON.stringify({result: 'error', message: 'Usuario no encontrado.'})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({result: 'ok', token: createSession_(guard5.auth.user, 'moderador')})).setMimeType(ContentService.MimeType.JSON);
  }

    var hpFilled = data.website && String(data.website).trim() !== '';
    var elapsedNum = Number(data.elapsedMs);
    var tooFast = !(elapsedNum >= 2500);
    if (hpFilled || tooFast) {
      return ContentService.createTextOutput(JSON.stringify({result: 'ok', codigo: ''})).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var codigoCol = headers.indexOf('Codigo');
    var fechaEstadoCol = headers.indexOf('FechaEstado');
    var idCol = headers.indexOf('Id'); var esMiembro = data.tipo === 'Miembro'; var nuevoCodigo = ''; if (esMiembro) { var maxNum = 0;
    for (var ri = 1; ri < values.length; ri++) {
      var existingCodigo = String(values[ri][codigoCol] || '');
      var match = existingCodigo.match(/HVK-2026-(\d+)/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    nuevoCodigo = 'HVK-2026-' + String(maxNum + 1).padStart(4, '0'); }
    var now = new Date(); var nuevoId = Utilities.getUuid();
    var nuevaFila = [now, nuevoCodigo, data.nombre || '', data.edad || '', data.tipo || '', data.experiencia || '', data.estado || 'Pendiente'];
    if (fechaEstadoCol !== -1) {
      nuevaFila[fechaEstadoCol] = now;
    var dniCol = headers.indexOf('DNI'); if (dniCol !== -1) { nuevaFila[dniCol] = data.dni || ''; }}
    var telefonoCol = headers.indexOf('Telefono'); if (telefonoCol !== -1) { nuevaFila[telefonoCol] = data.telefono || ''; }
    var emailCol = headers.indexOf('Email'); if (emailCol !== -1) { nuevaFila[emailCol] = data.email || ''; }
    var emNombreCol = headers.indexOf('ContactoEmergenciaNombre'); if (emNombreCol !== -1) { nuevaFila[emNombreCol] = data.emNombre || ''; }
    var emTelefonoCol = headers.indexOf('ContactoEmergenciaTelefono'); if (emTelefonoCol !== -1) { nuevaFila[emTelefonoCol] = data.emTelefono || ''; }
    var emRelacionCol = headers.indexOf('ContactoEmergenciaRelacion'); if (emRelacionCol !== -1) { nuevaFila[emRelacionCol] = data.emRelacion || ''; }

var autNombreCol = headers.indexOf('AutorizacionAdultoNombre'); if (autNombreCol !== -1) { nuevaFila[autNombreCol] = data.autNombre || ''; }
var autDniCol = headers.indexOf('AutorizacionAdultoDni'); if (autDniCol !== -1) { nuevaFila[autDniCol] = data.autDni || ''; }
var autAceptadaCol = headers.indexOf('AutorizacionAceptada'); if (autAceptadaCol !== -1) { nuevaFila[autAceptadaCol] = data.autAceptado ? 'Si' : ''; }
    if (idCol !== -1) { nuevaFila[idCol] = nuevoId; } sheet.appendRow(nuevaFila); if (!esMiembro) { var evSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Eventuales'); if (!evSheet) { evSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Eventuales'); evSheet.appendRow(['Fecha', 'Nombre', 'Edad', 'Experiencia', 'VecesInscripto']); } var evValues = evSheet.getDataRange().getValues(); var nombreNormalizado = String(data.nombre || '').trim().toLowerCase(); var vecesInscripto = 1; if (nombreNormalizado !== '') { for (var vi = 1; vi < evValues.length; vi++) { var evNombre = String(evValues[vi][1] || '').trim().toLowerCase(); if (evNombre === nombreNormalizado) { vecesInscripto++; } } } evSheet.appendRow([now, data.nombre || '', data.edad || '', data.experiencia || '', vecesInscripto]); }
    try { var tipoLabel = data.tipo || (esMiembro ? 'Miembro' : 'Evento puntual'); var asunto = 'Nueva inscripcion Havok: ' + (data.nombre || '(sin nombre)') + ' (' + tipoLabel + ')'; var cuerpo = 'Nombre: ' + (data.nombre || '') + '\nTipo: ' + tipoLabel + (esMiembro ? ('\nCodigo: ' + nuevoCodigo) : '') + '\nEdad: ' + (data.edad || '') + '\nExperiencia: ' + (data.experiencia || '') + '\nFecha: ' + now; MailApp.sendEmail('s.c.roberto.rs@gmail.com', asunto, cuerpo); } catch (mailErr) {} return ContentService.createTextOutput(JSON.stringify({result: 'ok', codigo: nuevoCodigo})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function generateResetCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function hashPassword(pass, salt) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pass);
  var hex = '';
  for (var i = 0; i < digest.length; i++) {
    var b = digest[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    hex += h.length === 1 ? '0' + h : h;
  }
  return hex;
}

function checkLevel1Auth(user, pass) {
  var props = PropertiesService.getScriptProperties();
  var storedUser = props.getProperty('ADMIN_USER');
  if (user !== storedUser) return false;
  var hash = props.getProperty('ADMIN_PASS_HASH');
  var salt = props.getProperty('ADMIN_PASS_SALT');
  if (hash && salt) {
    return hashPassword(pass, salt) === hash;
  }
  var legacyPass = props.getProperty('ADMIN_PASS');
  return !!legacyPass && pass === legacyPass;
}

function getModerators() {
  var raw = PropertiesService.getScriptProperties().getProperty('MODERATORS_JSON');
  if (!raw) return [];
  try {
    var list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveModerators(list) {
  PropertiesService.getScriptProperties().setProperty('MODERATORS_JSON', JSON.stringify(list));
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function checkLevel2Auth(user, pass) {
  var list = getModerators();
  for (var i = 0; i < list.length; i++) {
    if (list[i].user === user) {
      if (hashPassword(pass, list[i].salt) !== list[i].hash) return false;
      return { valid: true, mustChangePassword: !!list[i].mustChangePassword };
    }
  }
  return false;
}

function getFichaSheet_() {
  return getOrCreateSheet('Fichas', ['Usuario', 'Rol', 'InscripcionId', 'Nombre', 'Callsign', 'FotoBase64', 'Grado', 'BajasTotales', 'PassHash', 'PassSalt', 'Estado', 'FechaCreado']);
}

function getScoringSheet_() {
  return getOrCreateSheet('ScoringHistorial', ['Fecha', 'Usuario', 'Rol', 'BajasSumadas', 'BajasTotalDespues']);
}

function checkLevel3Auth(user, pass) {
  var sheet = getFichaSheet_();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).toLowerCase() === String(user).toLowerCase() && row[1] === 'miembro') {
      if (row[10] !== 'Activo') return { valid: false };
      var hash = hashPassword(pass, row[9]);
      return { valid: hash === row[8], user: String(row[0]) };
    }
  }
  return { valid: false };
}

function findFichaRow_(sheet, usuario, rol) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(usuario).toLowerCase() && (!rol || data[i][1] === rol)) {
      return { rowNum: i + 1, values: data[i] };
    }
  }
  return null;
}

function fichaRowToObject_(values) {
  return {
    usuario: values[0],
    rol: values[1],
    inscripcionId: values[2],
    nombre: values[3],
    callsign: values[4],
    fotoBase64: values[5],
    grado: values[6],
    bajasTotales: Number(values[7]) || 0,
    estado: values[10],
    fechaCreado: values[11]
  };
}

function ensureFichaForRole_(user, role) {
  var sheet = getFichaSheet_();
  var existing = findFichaRow_(sheet, user, role);
  if (existing) return existing;
  var newRow = [user, role, '', user, user, '', '', 0, '', '', 'Activo', new Date()];
  sheet.appendRow(newRow);
  return { rowNum: sheet.getLastRow(), values: newRow };
}

function findAprobadoMiembroByDniCodigo_(dni, codigo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxDni = headers.indexOf('DNI');
  var idxCodigo = headers.indexOf('Codigo');
  var idxEstado = headers.indexOf('Estado');
  var idxTipo = headers.indexOf('Tipo');
  var idxNombre = headers.indexOf('Nombre');
  var idxId = headers.indexOf('Id');
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[idxDni]).trim() === dni &&
        String(row[idxCodigo]).trim().toLowerCase() === codigo.toLowerCase() &&
        row[idxEstado] === 'Aprobado' && row[idxTipo] === 'Miembro') {
      return { id: String(row[idxId]), nombre: row[idxNombre] };
    }
  }
  return null;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({result: 'ok', message: 'Servidor de inscripciones Havok Airsoft activo'})).setMimeType(ContentService.MimeType.JSON);
}

// ===================== Sesiones, login unificado y recuperacion de contrasena =====================

var SESSION_TTL_SEC = 21600;          // 6 horas (maximo que permite CacheService); se renueva con cada uso
var USER_MAX_FAILS = 5;               // intentos fallidos seguidos permitidos por usuario
var LOCK_MS = 15 * 60 * 1000;         // bloqueo de 15 minutos
var GLOBAL_MAX_FAILS = 50;            // freno general ante ataques que prueban muchos usuarios distintos
var RESET_GLOBAL_MAX_PER_HOUR = 30;   // tope de emails de recuperacion por hora (cuida la cuota de MailApp)
var ADMIN_EMAIL = 's.c.roberto.rs@gmail.com';

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function userKey_(user) {
  return String(user || '').trim().toLowerCase();
}

function lockedOut_(waitMin) {
  return jsonOut_({result: 'error', message: 'Demasiados intentos fallidos. Proba de nuevo en ' + waitMin + ' minutos.'});
}

// Verifica usuario + contrasena contra los tres niveles. No cuenta intentos (eso lo hace loginAttempt_).
function verifyPassword_(user, pass) {
  user = String(user || '');
  pass = String(pass || '');
  if (!user || !pass) return null;
  if (checkLevel1Auth(user, pass)) return { user: user, role: 'admin', mustChangePassword: false };
  var lvl2 = checkLevel2Auth(user, pass);
  if (lvl2) return { user: user, role: 'moderador', mustChangePassword: !!lvl2.mustChangePassword };
  var lvl3 = checkLevel3Auth(user, pass);
  if (lvl3.valid) return { user: lvl3.user, role: 'miembro', mustChangePassword: false };
  return null;
}

// Intento de login con bloqueo POR USUARIO (antes era un contador unico para todos).
function loginAttempt_(user, pass) {
  var cache = CacheService.getScriptCache();
  var now = new Date().getTime();
  var key = userKey_(user);

  var globalLock = Number(cache.get('globalLockUntil') || 0);
  if (globalLock && now < globalLock) {
    return { ok: false, locked: true, waitMin: Math.ceil((globalLock - now) / 60000) };
  }
  var lockUntil = Number(cache.get('lock_' + key) || 0);
  if (lockUntil && now < lockUntil) {
    return { ok: false, locked: true, waitMin: Math.ceil((lockUntil - now) / 60000) };
  }

  var who = verifyPassword_(user, pass);
  if (who) {
    cache.remove('fail_' + key);
    cache.remove('lock_' + key);
    who.ok = true;
    who.locked = false;
    return who;
  }

  var fails = Number(cache.get('fail_' + key) || 0) + 1;
  var lockedNow = fails >= USER_MAX_FAILS;
  if (lockedNow) {
    cache.put('lock_' + key, String(now + LOCK_MS), 21600);
    cache.remove('fail_' + key);
  } else {
    cache.put('fail_' + key, String(fails), 900);
  }

  var globalFails = Number(cache.get('failGlobal') || 0) + 1;
  if (globalFails >= GLOBAL_MAX_FAILS) {
    cache.put('globalLockUntil', String(now + LOCK_MS), 21600);
    cache.remove('failGlobal');
  } else {
    cache.put('failGlobal', String(globalFails), 900);
  }

  if (lockedNow) return { ok: false, locked: true, waitMin: 15 };
  return { ok: false, locked: false };
}

// "Version" de las credenciales: si la contrasena cambia o la cuenta se borra, las sesiones viejas dejan de valer.
function credVersion_(user, role) {
  var props = PropertiesService.getScriptProperties();
  if (role === 'admin') {
    if (user !== props.getProperty('ADMIN_USER')) return null;
    var salt = props.getProperty('ADMIN_PASS_SALT');
    if (salt) return salt;
    var legacy = props.getProperty('ADMIN_PASS');
    return legacy ? 'legacy:' + hashPassword(legacy, 'version') : null;
  }
  if (role === 'moderador') {
    var mods = getModerators();
    for (var i = 0; i < mods.length; i++) {
      if (mods[i].user === user) return String(mods[i].salt);
    }
    return null;
  }
  if (role === 'miembro') {
    var f = findFichaRow_(getFichaSheet_(), user, 'miembro');
    if (!f || f.values[10] !== 'Activo') return null;
    return String(f.values[9]);
  }
  return null;
}

function createSession_(user, role) {
  var ver = credVersion_(user, role);
  if (!ver) return '';
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify({ u: user, r: role, v: ver }), SESSION_TTL_SEC);
  return token;
}

function getSession_(token) {
  token = String(token || '');
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  var cache = CacheService.getScriptCache();
  var raw = cache.get('sess_' + token);
  if (!raw) return null;
  var s;
  try { s = JSON.parse(raw); } catch (e) { return null; }
  if (!s || credVersion_(s.u, s.r) !== s.v) {
    cache.remove('sess_' + token);
    return null;
  }
  cache.put('sess_' + token, raw, SESSION_TTL_SEC);
  var mustChange = false;
  if (s.r === 'moderador') {
    var mods = getModerators();
    for (var i = 0; i < mods.length; i++) {
      if (mods[i].user === s.u) { mustChange = !!mods[i].mustChangePassword; break; }
    }
  }
  return { ok: true, locked: false, user: s.u, role: s.r, mustChangePassword: mustChange };
}

// Acepta token de sesion (sitio nuevo) o usuario+contrasena (compatibilidad con la version anterior del sitio).
function authFromData_(data) {
  if (data.token) {
    var s = getSession_(data.token);
    if (!s) return { ok: false, expired: true };
    return s;
  }
  return loginAttempt_(data.user, data.pass);
}

function authErrorOut_(auth) {
  if (auth.locked) return lockedOut_(auth.waitMin);
  if (auth.expired) return jsonOut_({result: 'error', sessionExpired: true, message: 'Tu sesion vencio. Ingresa de nuevo.'});
  return jsonOut_({result: 'error', message: 'No autorizado'});
}

// Staff (admin o moderador). Con requireAdminRole, solo admin.
function requireAuth(data, requireAdminRole) {
  var auth = authFromData_(data);
  if (!auth.ok) return { error: authErrorOut_(auth) };
  if (auth.role !== 'admin' && auth.role !== 'moderador') {
    return { error: jsonOut_({result: 'error', message: 'No autorizado'}) };
  }
  if (requireAdminRole && auth.role !== 'admin') {
    return { error: jsonOut_({result: 'error', message: 'No autorizado'}) };
  }
  return { auth: auth };
}

// Cualquier rol (admin, moderador o miembro), opcionalmente filtrado.
function requireFichaAuth_(data, allowedRoles) {
  var auth = authFromData_(data);
  if (!auth.ok) return { error: authErrorOut_(auth) };
  if (allowedRoles && allowedRoles.indexOf(auth.role) === -1) {
    return { error: jsonOut_({result: 'error', message: 'No autorizado'}) };
  }
  return { auth: auth };
}

// Cambia la contrasena de cualquier rol. Devuelve true si encontro la cuenta.
function setPassword_(user, role, newPass) {
  var salt = Utilities.getUuid();
  var hash = hashPassword(newPass, salt);
  if (role === 'admin') {
    var props = PropertiesService.getScriptProperties();
    if (user !== props.getProperty('ADMIN_USER')) return false;
    props.setProperty('ADMIN_PASS_HASH', hash);
    props.setProperty('ADMIN_PASS_SALT', salt);
    props.deleteProperty('ADMIN_PASS');
    return true;
  }
  if (role === 'moderador') {
    var mods = getModerators();
    for (var i = 0; i < mods.length; i++) {
      if (mods[i].user === user) {
        mods[i].salt = salt;
        mods[i].hash = hash;
        mods[i].mustChangePassword = false;
        saveModerators(mods);
        return true;
      }
    }
    return false;
  }
  if (role === 'miembro') {
    var sheet = getFichaSheet_();
    var f = findFichaRow_(sheet, user, 'miembro');
    if (!f) return false;
    sheet.getRange(f.rowNum, 9).setValue(hash);
    sheet.getRange(f.rowNum, 10).setValue(salt);
    return true;
  }
  return false;
}

// Busca la cuenta y el email al que mandar el codigo de recuperacion.
function findAccountForReset_(user) {
  var key = userKey_(user);
  if (!key) return null;
  var adminUser = PropertiesService.getScriptProperties().getProperty('ADMIN_USER') || '';
  if (userKey_(adminUser) === key) return { user: adminUser, role: 'admin', email: ADMIN_EMAIL };

  var mods = getModerators();
  for (var i = 0; i < mods.length; i++) {
    if (userKey_(mods[i].user) === key) return { user: mods[i].user, role: 'moderador', email: String(mods[i].email || '') };
  }

  var f = findFichaRow_(getFichaSheet_(), user, 'miembro');
  if (!f || f.values[10] !== 'Activo') return null;
  var inscripcionId = String(f.values[2] || '');
  var email = '';
  if (inscripcionId) {
    var main = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var rows = main.getDataRange().getValues();
    var idxId = rows[0].indexOf('Id');
    var idxEmail = rows[0].indexOf('Email');
    if (idxId !== -1 && idxEmail !== -1) {
      for (var r = 1; r < rows.length; r++) {
        if (String(rows[r][idxId]) === inscripcionId) { email = String(rows[r][idxEmail] || '').trim(); break; }
      }
    }
  }
  return { user: String(f.values[0]), role: 'miembro', email: email };
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Acciones nuevas. Devuelve la respuesta, o null si la accion no es una de estas.
function handleAuthActions_(data) {
  var cache = CacheService.getScriptCache();

  if (data.action === 'login') {
    var la = loginAttempt_(data.user, data.pass);
    if (la.locked) return lockedOut_(la.waitMin);
    if (!la.ok) return jsonOut_({result: 'error', message: 'Usuario o contraseña incorrectos.'});
    var tok = createSession_(la.user, la.role);
    if (!tok) return jsonOut_({result: 'error', message: 'No se pudo iniciar la sesion. Proba de nuevo.'});
    return jsonOut_({result: 'ok', token: tok, user: la.user, role: la.role, mustChangePassword: !!la.mustChangePassword});
  }

  if (data.action === 'session') {
    var s = getSession_(data.token);
    if (!s) return jsonOut_({result: 'error', sessionExpired: true, message: 'Tu sesion vencio. Ingresa de nuevo.'});
    return jsonOut_({result: 'ok', user: s.user, role: s.role, mustChangePassword: s.mustChangePassword});
  }

  if (data.action === 'logout') {
    var t = String(data.token || '');
    if (/^[a-f0-9]{64}$/i.test(t)) cache.remove('sess_' + t);
    return jsonOut_({result: 'ok'});
  }

  if (data.action === 'changePassword') {
    var guardCP = requireFichaAuth_(data, null);
    if (guardCP.error) return guardCP.error;
    var cpUser = guardCP.auth.user;
    var cpRole = guardCP.auth.role;
    var cpNew = String(data.newPass || '');
    if (cpNew.length < 8) return jsonOut_({result: 'error', message: 'La contraseña nueva debe tener al menos 8 caracteres.'});
    var cpCheck = loginAttempt_(cpUser, data.currentPass);
    if (cpCheck.locked) return lockedOut_(cpCheck.waitMin);
    if (!cpCheck.ok || cpCheck.role !== cpRole) return jsonOut_({result: 'error', message: 'La contraseña actual no es correcta.'});
    if (!setPassword_(cpUser, cpRole, cpNew)) return jsonOut_({result: 'error', message: 'No se encontro tu cuenta.'});
    return jsonOut_({result: 'ok', token: createSession_(cpUser, cpRole)});
  }

  if (data.action === 'requestPasswordReset') {
    var rpUser = String(data.user || '').trim();
    if (!rpUser) return jsonOut_({result: 'error', message: 'Ingresa tu usuario.'});
    var generic = jsonOut_({result: 'ok', message: 'Si el usuario existe y tiene un email registrado, te enviamos un codigo. Revisa tu correo (tambien la carpeta de spam).'});
    var target = findAccountForReset_(rpUser);
    if (!target || !target.email) return generic;
    var rk = userKey_(target.user);
    var nowR = new Date().getTime();
    var lastR = Number(cache.get('resetLast_' + rk) || 0);
    if (lastR && (nowR - lastR) < 2 * 60 * 1000) return generic;
    var globalCount = Number(cache.get('resetGlobalCount') || 0);
    if (globalCount >= RESET_GLOBAL_MAX_PER_HOUR) {
      return jsonOut_({result: 'error', message: 'Se pidieron demasiados codigos en poco tiempo. Proba de nuevo mas tarde.'});
    }
    cache.put('resetGlobalCount', String(globalCount + 1), 3600);
    cache.put('resetLast_' + rk, String(nowR), 600);
    var code = generateResetCode();
    var codeSalt = Utilities.getUuid();
    cache.put('reset_' + rk, JSON.stringify({ h: hashPassword(code, codeSalt), s: codeSalt, u: target.user, r: target.role }), 900);
    cache.remove('resetAttempts_' + rk);
    try {
      MailApp.sendEmail(target.email, 'Codigo para recuperar tu contrasena - Havok Airsoft',
        'Hola ' + target.user + ',\n\nTu codigo de recuperacion es: ' + code +
        '\n\nEste codigo vence en 15 minutos y sirve una sola vez. Si vos no pediste este cambio, ignora este mensaje.');
    } catch (errMailReset) {
      cache.remove('reset_' + rk);
      return jsonOut_({result: 'error', message: 'No se pudo enviar el email. Proba de nuevo mas tarde.'});
    }
    return generic;
  }

  if (data.action === 'confirmPasswordReset') {
    var ck = userKey_(data.user);
    var cpNewPass = String(data.newPass || '');
    var rawReset = ck ? cache.get('reset_' + ck) : null;
    if (!rawReset) return jsonOut_({result: 'error', message: 'No hay ningun codigo activo para ese usuario. Pedi uno nuevo.'});
    var attempts = Number(cache.get('resetAttempts_' + ck) || 0);
    if (attempts >= 5) {
      cache.remove('reset_' + ck);
      return jsonOut_({result: 'error', message: 'Demasiados intentos fallidos. Pedi un codigo nuevo.'});
    }
    if (cpNewPass.length < 8) return jsonOut_({result: 'error', message: 'La contraseña debe tener al menos 8 caracteres.'});
    var st;
    try { st = JSON.parse(rawReset); } catch (e) { return jsonOut_({result: 'error', message: 'Pedi un codigo nuevo.'}); }
    var codeIn = String(data.code || '').trim().toUpperCase();
    if (hashPassword(codeIn, st.s) !== st.h) {
      cache.put('resetAttempts_' + ck, String(attempts + 1), 900);
      return jsonOut_({result: 'error', message: 'Codigo incorrecto.'});
    }
    if (!setPassword_(st.u, st.r, cpNewPass)) return jsonOut_({result: 'error', message: 'No se encontro la cuenta.'});
    cache.remove('reset_' + ck);
    cache.remove('resetAttempts_' + ck);
    cache.remove('lock_' + ck);
    cache.remove('fail_' + ck);
    return jsonOut_({result: 'ok'});
  }

  if (data.action === 'setModeratorEmail') {
    var guardME = requireAuth(data, true);
    if (guardME.error) return guardME.error;
    var meEmail = String(data.email || '').trim();
    if (meEmail && !isValidEmail_(meEmail)) return jsonOut_({result: 'error', message: 'Ese email no parece valido.'});
    var modsME = getModerators();
    var foundME = false;
    for (var mi = 0; mi < modsME.length; mi++) {
      if (modsME[mi].user === data.targetUser) { modsME[mi].email = meEmail; foundME = true; break; }
    }
    if (!foundME) return jsonOut_({result: 'error', message: 'No se encontro ese moderador.'});
    saveModerators(modsME);
    return jsonOut_({result: 'ok'});
  }

  return null;
}
