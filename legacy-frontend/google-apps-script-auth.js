/**
 * ================================================================
 * MÓDULO DE AUTENTICACIÓN - Google Apps Script
 * ================================================================
 * INSTRUCCIONES:
 * 1. Abra su proyecto de Google Apps Script asociado a la hoja de cálculo
 * 2. Copie TODO el contenido de este archivo en un nuevo archivo .gs
 *    (por ejemplo: Auth.gs)
 * 3. En su función doPost(e), agregue los siguientes cases al switch:
 *
 *    case 'login':          result = handleLogin(data);          break;
 *    case 'get_auth_data':  result = handleGetAuthData();        break;
 *    case 'save_usuario':   result = handleSaveUsuario(data);    break;
 *    case 'delete_usuario': result = handleDeleteUsuario(data);  break;
 *    case 'save_perfil':    result = handleSavePerfil(data);     break;
 *    case 'delete_perfil':  result = handleDeletePerfil(data);   break;
 *
 * 4. Vuelva a desplegar el Web App (Nueva versión)
 * 5. La primera vez que se use, se crearán automáticamente las hojas
 *    "Usuarios" y "Perfiles" con un usuario admin por defecto:
 *    - Usuario: admin
 *    - Contraseña: admin123
 *
 * IMPORTANTE: Después del primer login, cambie la contraseña del admin
 * desde el panel de gestión de usuarios.
 * ================================================================
 */

// ── Utilidad: SHA-256 ──
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

// ── Utilidad: Hoja a Array de Objetos ──
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

// ── Utilidad: Índice de columna ──
function colIndex(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === name) return i;
  }
  return -1;
}

// ── Utilidad: Generar ID único ──
function generateAuthId() {
  return Utilities.getUuid();
}

// ══════════════════════════════════════
// SETUP INICIAL (se ejecuta en cada operación de auth)
// ══════════════════════════════════════
function setupAuth() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Crear hoja "Perfiles" si no existe ──
  var perfilesSheet = ss.getSheetByName('Perfiles');
  if (!perfilesSheet) {
    perfilesSheet = ss.insertSheet('Perfiles');
    perfilesSheet.appendRow(['id', 'nombre', 'permisos']);

    // Perfil: Administrador (todos los permisos)
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

    // Perfil: Consulta (solo ver resumen y gastos)
    perfilesSheet.appendRow([
      generateAuthId(),
      'Consulta',
      JSON.stringify(['ingresos_ver_resumen', 'gastos_ver'])
    ]);
  }

  // ── Crear hoja "Usuarios" si no existe ──
  var usuariosSheet = ss.getSheetByName('Usuarios');
  if (!usuariosSheet) {
    usuariosSheet = ss.insertSheet('Usuarios');
    usuariosSheet.appendRow([
      'id', 'usuario', 'password_hash', 'nombre_completo', 'perfil_id', 'activo'
    ]);

    // Obtener ID del perfil Administrador
    var perfilesData = perfilesSheet.getDataRange().getValues();
    var adminPerfilId = '';
    for (var i = 1; i < perfilesData.length; i++) {
      if (perfilesData[i][1] === 'Administrador') {
        adminPerfilId = perfilesData[i][0];
        break;
      }
    }

    // Usuario admin por defecto (contraseña: admin123)
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
  var usuariosSheet = ss.getSheetByName('Usuarios');
  var perfilesSheet = ss.getSheetByName('Perfiles');

  var usuarios = sheetToObjects(usuariosSheet);
  var perfiles = sheetToObjects(perfilesSheet);

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
  try {
    permisos = perfil ? JSON.parse(perfil.permisos) : [];
  } catch(e) {
    permisos = [];
  }

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
// OBTENER DATOS DE AUTH (para panel admin)
// ══════════════════════════════════════
function handleGetAuthData() {
  setupAuth();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usuarios = sheetToObjects(ss.getSheetByName('Usuarios'));
  var perfiles = sheetToObjects(ss.getSheetByName('Perfiles'));

  // No enviar password_hash al frontend
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
    // ── Editar usuario existente ──
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, colIndex(headers, 'usuario') + 1).setValue(data.usuario);
        sheet.getRange(i + 1, colIndex(headers, 'nombre_completo') + 1).setValue(data.nombre_completo);
        sheet.getRange(i + 1, colIndex(headers, 'perfil_id') + 1).setValue(data.perfil_id);
        sheet.getRange(i + 1, colIndex(headers, 'activo') + 1).setValue(data.activo);

        // Solo actualizar contraseña si se proporcionó una nueva
        if (data.password && data.password.length > 0) {
          sheet.getRange(i + 1, colIndex(headers, 'password_hash') + 1).setValue(sha256(data.password));
        }
        return { ok: true, id: data.id };
      }
    }
    return { ok: false, error: 'Usuario no encontrado' };

  } else {
    // ── Crear nuevo usuario ──
    var newId = generateAuthId();
    var passHash = sha256(data.password || 'changeme');
    sheet.appendRow([
      newId,
      data.usuario,
      passHash,
      data.nombre_completo,
      data.perfil_id,
      data.activo || 'SI'
    ]);
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
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
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
    // ── Editar perfil existente ──
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 2).setValue(data.nombre);
        sheet.getRange(i + 1, 3).setValue(JSON.stringify(data.permisos));
        return { ok: true, id: data.id };
      }
    }
    return { ok: false, error: 'Perfil no encontrado' };

  } else {
    // ── Crear nuevo perfil ──
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
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Perfil no encontrado' };
}
