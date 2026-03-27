/* =======================================
   SISTEMA MULTI-MODULAR -> GOOGLE SHEETS
   (Con Autenticación y Gestión de Usuarios)
   =======================================
   
   INSTRUCCIONES:
   1. Reemplace TODO el contenido de su Código.gs con este archivo
   2. Implementar → Administrar implementaciones → ✏️ → Nueva versión → Implementar
   3. Primer login: usuario "admin" / contraseña "admin123"
   4. Se crearán automáticamente las hojas "Usuarios" y "Perfiles"
   
   ======================================= */

const FOLDER_NAME = "Rendiciones_Comprobantes";

// ══════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

function sheetToJSON(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const keys = data.shift();
  return data.map(row => {
    let obj = {};
    keys.forEach((key, i) => obj[key] = row[i]);
    return obj;
  });
}

function sha256(text) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8
  );
  return raw.map(function(b) {
    return ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2);
  }).join('');
}

function colIndex(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === name) return i;
  }
  return -1;
}

function generateAuthId() {
  return Utilities.getUuid();
}

// ══════════════════════════════════════
// SETUP AUTOMÁTICO DE AUTH
// (Crea hojas Usuarios y Perfiles si no existen)
// ══════════════════════════════════════
function setupAuth() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var perfilesSheet = ss.getSheetByName('Perfiles');
  if (!perfilesSheet) {
    perfilesSheet = ss.insertSheet('Perfiles');
    perfilesSheet.appendRow(['id', 'nombre', 'permisos']);
    perfilesSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f3f3");

    perfilesSheet.appendRow([
      generateAuthId(),
      'Administrador',
      JSON.stringify([
        'ingresos_ver_detalle', 'ingresos_ver_resumen',
        'gastos_ver', 'gastos_crear', 'gastos_eliminar',
        'pagos_registrar', 'pagos_anular',
        'config_ver', 'config_editar',
        'usuarios_gestionar'
      ])
    ]);

    perfilesSheet.appendRow([
      generateAuthId(),
      'Consulta',
      JSON.stringify(['ingresos_ver_resumen', 'gastos_ver'])
    ]);
  }

  var usuariosSheet = ss.getSheetByName('Usuarios');
  if (!usuariosSheet) {
    usuariosSheet = ss.insertSheet('Usuarios');
    usuariosSheet.appendRow(['id', 'usuario', 'password_hash', 'nombre_completo', 'perfil_id', 'activo']);
    usuariosSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");

    var perfilesData = perfilesSheet.getDataRange().getValues();
    var adminPerfilId = '';
    for (var i = 1; i < perfilesData.length; i++) {
      if (perfilesData[i][1] === 'Administrador') {
        adminPerfilId = perfilesData[i][0];
        break;
      }
    }

    usuariosSheet.appendRow([
      generateAuthId(),
      'admin',
      sha256('admin123'),
      'Administrador del Sistema',
      adminPerfilId,
      'SI'
    ]);
  }
}

// ══════════════════════════════════════
// LOGIN
// ══════════════════════════════════════
function handleLogin(data) {
  setupAuth();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usuarios = sheetToJSON(ss.getSheetByName('Usuarios'));
  var perfiles = sheetToJSON(ss.getSheetByName('Perfiles'));

  var passHash = sha256(data.password || '');

  var user = null;
  for (var i = 0; i < usuarios.length; i++) {
    if (usuarios[i].usuario.toString().toLowerCase() === (data.usuario || '').toLowerCase() &&
        usuarios[i].password_hash === passHash &&
        usuarios[i].activo === 'SI') {
      user = usuarios[i];
      break;
    }
  }

  if (!user) {
    return { ok: false, error: 'Usuario o contraseña incorrectos' };
  }

  var perfil = null;
  for (var j = 0; j < perfiles.length; j++) {
    if (perfiles[j].id === user.perfil_id) {
      perfil = perfiles[j];
      break;
    }
  }

  var permisos = [];
  try { permisos = perfil ? JSON.parse(perfil.permisos) : []; } catch(e) { permisos = []; }

  return {
    ok: true,
    user: {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre_completo,
      perfil_nombre: perfil ? perfil.nombre : 'Sin perfil',
      perfil_id: user.perfil_id,
      permisos: permisos
    }
  };
}

// ══════════════════════════════════════
// OBTENER DATOS DE AUTH (panel admin)
// ══════════════════════════════════════
function handleGetAuthData() {
  setupAuth();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usuarios = sheetToJSON(ss.getSheetByName('Usuarios'));
  var perfiles = sheetToJSON(ss.getSheetByName('Perfiles'));

  var usuariosSafe = usuarios.map(function(u) {
    return {
      id: u.id,
      usuario: u.usuario,
      nombre_completo: u.nombre_completo,
      perfil_id: u.perfil_id,
      activo: u.activo
    };
  });

  return { ok: true, usuarios: usuariosSafe, perfiles: perfiles };
}

// ══════════════════════════════════════
// GUARDAR USUARIO (crear o editar)
// ══════════════════════════════════════
function handleSaveUsuario(data) {
  setupAuth();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Usuarios');
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];

  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, colIndex(headers, 'usuario') + 1).setValue(data.usuario);
        sheet.getRange(i + 1, colIndex(headers, 'nombre_completo') + 1).setValue(data.nombre_completo);
        sheet.getRange(i + 1, colIndex(headers, 'perfil_id') + 1).setValue(data.perfil_id);
        sheet.getRange(i + 1, colIndex(headers, 'activo') + 1).setValue(data.activo);
        if (data.password && data.password.length > 0) {
          sheet.getRange(i + 1, colIndex(headers, 'password_hash') + 1).setValue(sha256(data.password));
        }
        return { ok: true, id: data.id };
      }
    }
    return { ok: false, error: 'Usuario no encontrado' };
  } else {
    var newId = generateAuthId();
    sheet.appendRow([newId, data.usuario, sha256(data.password || 'changeme'), data.nombre_completo, data.perfil_id, data.activo || 'SI']);
    return { ok: true, id: newId };
  }
}

// ══════════════════════════════════════
// ELIMINAR USUARIO
// ══════════════════════════════════════
function handleDeleteUsuario(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Usuarios');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ══════════════════════════════════════
// GUARDAR PERFIL (crear o editar)
// ══════════════════════════════════════
function handleSavePerfil(data) {
  setupAuth();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Perfiles');
  var rows = sheet.getDataRange().getValues();

  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 2).setValue(data.nombre);
        sheet.getRange(i + 1, 3).setValue(JSON.stringify(data.permisos));
        return { ok: true, id: data.id };
      }
    }
    return { ok: false, error: 'Perfil no encontrado' };
  } else {
    var newId = generateAuthId();
    sheet.appendRow([newId, data.nombre, JSON.stringify(data.permisos)]);
    return { ok: true, id: newId };
  }
}

// ══════════════════════════════════════
// ELIMINAR PERFIL
// ══════════════════════════════════════
function handleDeletePerfil(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Perfiles');
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'Perfil no encontrado' };
}

// ══════════════════════════════════════
// doPost — PRINCIPAL
// ══════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result;

    // ── Acciones de Autenticación ──
    switch (action) {
      case 'login':          result = handleLogin(payload);       break;
      case 'get_auth_data':  result = handleGetAuthData();        break;
      case 'save_usuario':   result = handleSaveUsuario(payload); break;
      case 'delete_usuario': result = handleDeleteUsuario(payload); break;
      case 'save_perfil':    result = handleSavePerfil(payload);  break;
      case 'delete_perfil':  result = handleDeletePerfil(payload); break;
      default:
        // ── Acciones de Datos (existentes) ──
        result = handleDataAction(payload, action);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════
// ACCIONES DE DATOS (Gastos, Pagos, Config)
// ══════════════════════════════════════
function handleDataAction(payload, action) {
  const shGastos = getOrCreateSheet("Gastos", ["id", "fecha", "descripcion", "valor", "link_drive"]);
  const shPagos = getOrCreateSheet("Pagos", ["id", "id_familia", "mes", "monto", "fecha_pago", "link_drive"]);
  const shFamilias = getOrCreateSheet("Familias", ["id", "n_alumno", "n_apoderado"]);
  const shConfig = getOrCreateSheet("Configuracion", ["anio", "monto", "inicio", "fin"]);

  // Subir archivo (opcional)
  let link_drive = "";
  if (payload.file && payload.filename && payload.mimeType) {
    const decoded = Utilities.base64Decode(payload.file);
    const blob = Utilities.newBlob(decoded, payload.mimeType, payload.filename);
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    link_drive = file.getUrl();
  }

  const newId = new Date().getTime().toString();
  const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  if (action === "add_gasto") {
    shGastos.appendRow([newId, fecha, payload.descripcion, payload.valor, link_drive]);
    return { ok: true, id: newId, link_drive: link_drive };
  }

  if (action === "add_pago") {
    shPagos.appendRow([newId, payload.id_familia, payload.mes, payload.monto, fecha, link_drive]);
    return { ok: true, id: newId, link_drive: link_drive };
  }

  if (action === "delete_gasto" || action === "delete_pago") {
    const sheet = action === "delete_gasto" ? shGastos : shPagos;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == payload.id) { sheet.deleteRow(i + 1); break; }
    }
    return { ok: true };
  }

  if (action === "save_config") {
    shConfig.clearContents();
    shConfig.appendRow(["anio", "monto", "inicio", "fin"]);
    shConfig.appendRow([payload.config.anio, payload.config.monto, payload.config.inicio, payload.config.fin]);

    shFamilias.clearContents();
    shFamilias.appendRow(["id", "n_alumno", "n_apoderado"]);
    payload.familias.forEach(f => {
      shFamilias.appendRow([f.id, f.n_alumno, f.n_apoderado]);
    });
    return { ok: true };
  }

  return { ok: false, error: "Acción no reconocida: " + action };
}

// ══════════════════════════════════════
// doGet — SINCRONIZACIÓN INICIAL
// ══════════════════════════════════════
function doGet(e) {
  try {
    const shGastos = getOrCreateSheet("Gastos", ["id", "fecha", "descripcion", "valor", "link_drive"]);
    const shPagos = getOrCreateSheet("Pagos", ["id", "id_familia", "mes", "monto", "fecha_pago", "link_drive"]);
    const shFamilias = getOrCreateSheet("Familias", ["id", "n_alumno", "n_apoderado"]);
    const shConfig = getOrCreateSheet("Configuracion", ["anio", "monto", "inicio", "fin"]);

    const configData = sheetToJSON(shConfig);
    const configObj = configData.length > 0 ? configData[0] : null;

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      data: {
        gastos: sheetToJSON(shGastos),
        pagos: sheetToJSON(shPagos),
        familias: sheetToJSON(shFamilias),
        configuracion: configObj
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
