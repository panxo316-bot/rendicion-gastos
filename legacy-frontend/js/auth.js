// ====================
// AUTENTICACIÓN, PERMISOS Y GESTIÓN DE USUARIOS
// ====================

// Catálogo de permisos del sistema
const PERMISOS_CATALOGO = [
    { key: 'ingresos_ver_detalle', label: 'Ver Cuotas (Detalle completo)', group: 'Ingresos' },
    { key: 'ingresos_ver_resumen', label: 'Ver Resumen de Ingresos', group: 'Ingresos' },
    { key: 'gastos_ver', label: 'Ver Egresos', group: 'Egresos' },
    { key: 'gastos_crear', label: 'Registrar Egresos', group: 'Egresos' },
    { key: 'gastos_eliminar', label: 'Eliminar Egresos', group: 'Egresos' },
    { key: 'pagos_registrar', label: 'Registrar Pagos de Cuotas', group: 'Pagos' },
    { key: 'pagos_anular', label: 'Anular Pagos', group: 'Pagos' },
    { key: 'config_ver', label: 'Ver Configuración', group: 'Sistema' },
    { key: 'config_editar', label: 'Editar Configuración', group: 'Sistema' },
    { key: 'usuarios_gestionar', label: 'Gestionar Usuarios y Perfiles', group: 'Sistema' }
];

// Estado global de autenticación
let currentUser = null;
let allUsuarios = [];
let allPerfiles = [];

// DOM Login
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// ====================
// SESIÓN
// ====================
function isAuthenticated() {
    const data = sessionStorage.getItem('auth_user');
    if (data) {
        currentUser = JSON.parse(data);
        return true;
    }
    return false;
}

function hasPermiso(key) {
    return currentUser && currentUser.permisos && currentUser.permisos.includes(key);
}

// Verificar sesión al cargar
(function () {
    if (isAuthenticated()) {
        loginScreen.style.display = 'none';
        // Pre-aplicar permisos mientras el loader cubre la pantalla
        // (applyPermissions es hoisted, loadAllData aún no corrió)
        applyPermissions();
    }
})();

// Función auxiliar para obtener URL del script
function getScriptURL() {
    if (typeof GOOGLE_SCRIPT_URL !== 'undefined') return GOOGLE_SCRIPT_URL;
    console.error('GOOGLE_SCRIPT_URL no está definida. Revise que app.js cargue correctamente.');
    return '';
}

// Función auxiliar para POST a Google Apps Script
async function postToGAS(payload) {
    const url = getScriptURL();
    if (!url) throw new Error('URL del script no configurada');
    const res = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(payload)
    });
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Respuesta no-JSON del servidor:', text.substring(0, 500));
        throw new Error('El servidor no respondió con JSON. ¿Desplegó la nueva versión del script?');
    }
}

// ====================
// LOGIN VÍA GOOGLE SHEETS
// ====================
loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const usuario = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.textContent = '⏳ Verificando...';
    loginError.style.display = 'none';

    try {
        const json = await postToGAS({ action: 'login', usuario, password });

        if (json.ok) {
            currentUser = json.user;
            sessionStorage.setItem('auth_user', JSON.stringify(json.user));
            loginError.style.display = 'none';
            btn.textContent = '⏳ Cargando datos...';

            // Mostrar loader y cargar datos ANTES de ocultar login
            const loader = document.getElementById('loader-overlay');
            if (loader) { loader.style.display = 'flex'; loader.style.opacity = '1'; }

            if (typeof loadAllData === 'function') {
                await loadAllData();
            }

            // Permisos ya aplicados en loadAllData finally;
            // ocultar login INSTANTÁNEAMENTE (sin animación fade)
            // El loader aún se ve brevemente mientras hace su transición
            loginScreen.style.display = 'none';
            loginScreen.classList.remove('hiding');
        } else {
            loginError.textContent = json.error || 'Credenciales inválidas';
            loginError.style.display = 'block';
            document.getElementById('login-pass').value = '';
            document.getElementById('login-pass').focus();
        }
    } catch (err) {
        console.error('Error en login:', err);
        loginError.textContent = err.message || 'Error de conexión con el servidor';
        loginError.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Iniciar Sesión';
    }
});

// ====================
// LOGOUT
// ====================
document.getElementById('btn-logout').addEventListener('click', function () {
    sessionStorage.removeItem('auth_user');
    currentUser = null;
    resetUI();
    loginScreen.style.display = 'flex';
    loginScreen.classList.remove('hiding');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    loginError.style.display = 'none';
    document.getElementById('login-user').focus();
});

// ====================
// APLICAR PERMISOS AL UI
// ====================
function resetUI() {
    // Restaurar todos los tabs a visibles
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.style.display = '';
        tab.classList.remove('active');
    });

    // Ocultar todas las vistas
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));

    // Restaurar formulario de gastos
    const formSection = document.getElementById('form-section');
    if (formSection) formSection.style.display = '';

    // Restaurar botones de config
    const btnSave = document.getElementById('btn-save-config');
    const btnAdd = document.getElementById('btn-add-familia');
    if (btnSave) btnSave.style.display = '';
    if (btnAdd) btnAdd.style.display = '';

    // Restaurar inputs de config a editables
    document.querySelectorAll('#config-form input, .edit-table input').forEach(inp => {
        inp.readOnly = false;
        inp.style.opacity = '';
    });

    // Restaurar botones de eliminar en tabla familias
    document.querySelectorAll('.edit-table .btn-danger-sm').forEach(btn => btn.style.display = '');

    // Limpiar info de usuario en header
    const headerName = document.getElementById('header-user-name');
    if (headerName) headerName.textContent = '👤 Usuario';
    const headerPerfil = document.getElementById('header-user-perfil');
    if (headerPerfil) headerPerfil.textContent = 'Perfil';
}

function applyPermissions() {
    // Primero limpiar todo el estado visual previo
    resetUI();

    if (!currentUser) return;

    // Nombre de usuario en header
    const headerName = document.getElementById('header-user-name');
    if (headerName) headerName.textContent = '👤 ' + (currentUser.nombre || currentUser.usuario);

    const headerPerfil = document.getElementById('header-user-perfil');
    if (headerPerfil) headerPerfil.textContent = currentUser.perfil_nombre || '';

    // Visibilidad de tabs según permisos
    const tabRules = {
        'view-ingresos': 'ingresos_ver_detalle',
        'view-resumen': 'ingresos_ver_resumen',
        'view-gastos': 'gastos_ver',
        'view-config': 'config_ver',
        'view-usuarios': 'usuarios_gestionar'
    };

    let firstVisible = null;
    document.querySelectorAll('.tab-btn').forEach(tab => {
        const target = tab.getAttribute('data-target');
        const perm = tabRules[target];
        if (perm && !hasPermiso(perm)) {
            tab.style.display = 'none';
        } else {
            tab.style.display = '';
            if (!firstVisible) firstVisible = tab;
        }
    });

    // Activar primer tab visible si el activo está oculto
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.style.display === 'none' && firstVisible) {
        firstVisible.click();
    } else if (!activeTab && firstVisible) {
        firstVisible.click();
    }

    // Gastos: ocultar formulario si no puede crear
    const formSection = document.getElementById('form-section');
    if (formSection) formSection.style.display = hasPermiso('gastos_crear') ? '' : 'none';

    // Config: ocultar edición si no tiene permiso
    if (!hasPermiso('config_editar')) {
        const btnSave = document.getElementById('btn-save-config');
        const btnAdd = document.getElementById('btn-add-familia');
        if (btnSave) btnSave.style.display = 'none';
        if (btnAdd) btnAdd.style.display = 'none';
        document.querySelectorAll('#config-form input, .edit-table input').forEach(inp => {
            inp.readOnly = true;
            inp.style.opacity = '0.6';
        });
        document.querySelectorAll('.edit-table .btn-danger-sm').forEach(btn => btn.style.display = 'none');
    }
}

// ====================
// GESTIÓN DE USUARIOS (Admin)
// ====================
async function loadAuthData() {
    try {
        const json = await postToGAS({ action: 'get_auth_data' });
        if (json.ok) {
            allUsuarios = json.usuarios || [];
            allPerfiles = json.perfiles || [];
            renderUsuarios();
            renderPerfilesAdmin();
        }
    } catch (e) {
        console.error(e);
        if (typeof toast === 'function') toast('Error al cargar usuarios', 'error');
    }
}

function renderUsuarios() {
    const tbody = document.getElementById('usuarios-tbody');
    if (!tbody) return;

    if (allUsuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Sin usuarios registrados</div></td></tr>';
        return;
    }

    tbody.innerHTML = allUsuarios.map(u => {
        const perfil = allPerfiles.find(p => p.id === u.perfil_id);
        const perfilNombre = perfil ? escapeHtml(perfil.nombre) : '—';
        return `<tr>
            <td>${escapeHtml(u.usuario)}</td>
            <td>${escapeHtml(u.nombre_completo)}</td>
            <td><span class="badge">${perfilNombre}</span></td>
            <td>${u.activo === 'SI'
                ? '<span style="color:var(--success)">● Activo</span>'
                : '<span style="color:var(--text-muted)">○ Inactivo</span>'}</td>
            <td>
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.78rem;" onclick="editUsuario('${u.id}')">✏️</button>
                <button class="btn btn-danger-sm" onclick="deleteUsuarioBtn('${u.id}')">✕</button>
            </td>
        </tr>`;
    }).join('');
}

function renderPerfilesAdmin() {
    const tbody = document.getElementById('perfiles-tbody');
    if (!tbody) return;

    tbody.innerHTML = allPerfiles.map(p => {
        let perms = [];
        try { perms = JSON.parse(p.permisos || '[]'); } catch(e) {}
        const labels = perms.map(k => {
            const c = PERMISOS_CATALOGO.find(x => x.key === k);
            return c ? c.label : k;
        });
        const labelsHtml = labels.length > 0
            ? labels.map(l => `<span class="perm-tag">${l}</span>`).join(' ')
            : '<span style="color:var(--text-muted)">Sin permisos</span>';
        return `<tr>
            <td><strong>${escapeHtml(p.nombre)}</strong></td>
            <td style="font-size:0.78rem;">${labelsHtml}</td>
            <td>
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.78rem;" onclick="editPerfil('${p.id}')">✏️</button>
                <button class="btn btn-danger-sm" onclick="deletePerfilBtn('${p.id}')">✕</button>
            </td>
        </tr>`;
    }).join('');
}

// ====================
// MODAL USUARIO
// ====================
window.openUsuarioModal = function (u) {
    document.getElementById('usuario-edit-id').value = u ? u.id : '';
    document.getElementById('usuario-nombre-usuario').value = u ? u.usuario : '';
    document.getElementById('usuario-nombre-completo').value = u ? u.nombre_completo : '';
    document.getElementById('usuario-password').value = '';
    document.getElementById('usuario-activo').value = u ? u.activo : 'SI';

    const sel = document.getElementById('usuario-perfil');
    sel.innerHTML = allPerfiles.map(p =>
        `<option value="${p.id}" ${u && u.perfil_id === p.id ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`
    ).join('');

    document.getElementById('usuario-modal-title').textContent = u ? '✏️ Editar Usuario' : '➕ Nuevo Usuario';
    document.getElementById('usuario-modal').style.display = 'flex';
};

window.editUsuario = function (id) {
    const u = allUsuarios.find(x => x.id === id);
    if (u) openUsuarioModal(u);
};

window.deleteUsuarioBtn = async function (id) {
    if (!confirm('¿Eliminar este usuario permanentemente?')) return;
    try {
        const json = await postToGAS({ action: 'delete_usuario', id });
        if (json.ok) { toast('Usuario eliminado'); loadAuthData(); }
        else { toast(json.error || 'Error', 'error'); }
    } catch (e) { console.error(e); toast('Error de conexión', 'error'); }
};

document.getElementById('usuario-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Guardando...';

    const payload = {
        action: 'save_usuario',
        id: document.getElementById('usuario-edit-id').value || undefined,
        usuario: document.getElementById('usuario-nombre-usuario').value.trim(),
        nombre_completo: document.getElementById('usuario-nombre-completo').value.trim(),
        password: document.getElementById('usuario-password').value,
        perfil_id: document.getElementById('usuario-perfil').value,
        activo: document.getElementById('usuario-activo').value
    };

    try {
        const json = await postToGAS(payload);
        if (json.ok) {
            toast('Usuario guardado ✅');
            document.getElementById('usuario-modal').style.display = 'none';
            loadAuthData();
        } else { toast(json.error || 'Error', 'error'); }
    } catch (e) { console.error(e); toast('Error de conexión', 'error'); }
    finally { btn.disabled = false; btn.textContent = '💾 Guardar'; }
});

document.getElementById('btn-close-usuario-modal').addEventListener('click', () => {
    document.getElementById('usuario-modal').style.display = 'none';
});

document.getElementById('btn-add-usuario').addEventListener('click', () => openUsuarioModal());

// ====================
// MODAL PERFIL
// ====================
window.openPerfilModal = function (perfil) {
    document.getElementById('perfil-edit-id').value = perfil ? perfil.id : '';
    document.getElementById('perfil-nombre').value = perfil ? perfil.nombre : '';

    let perms = [];
    try { perms = perfil ? JSON.parse(perfil.permisos || '[]') : []; } catch(e) {}

    const grid = document.getElementById('permisos-grid');
    const groups = {};
    PERMISOS_CATALOGO.forEach(p => {
        if (!groups[p.group]) groups[p.group] = [];
        groups[p.group].push(p);
    });

    grid.innerHTML = Object.entries(groups).map(([group, items]) => `
        <div class="permisos-group">
            <div class="permisos-group-title">${group}</div>
            ${items.map(p => `
                <label class="permiso-check">
                    <input type="checkbox" name="permisos" value="${p.key}" ${perms.includes(p.key) ? 'checked' : ''}>
                    <span>${p.label}</span>
                </label>
            `).join('')}
        </div>
    `).join('');

    document.getElementById('perfil-modal-title').textContent = perfil ? '✏️ Editar Perfil' : '➕ Nuevo Perfil';
    document.getElementById('perfil-modal').style.display = 'flex';
};

window.editPerfil = function (id) {
    const p = allPerfiles.find(x => x.id === id);
    if (p) openPerfilModal(p);
};

window.deletePerfilBtn = async function (id) {
    if (!confirm('¿Eliminar este perfil permanentemente?')) return;
    try {
        const json = await postToGAS({ action: 'delete_perfil', id });
        if (json.ok) { toast('Perfil eliminado'); loadAuthData(); }
        else { toast(json.error || 'Error', 'error'); }
    } catch (e) { console.error(e); toast('Error de conexión', 'error'); }
};

document.getElementById('perfil-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Guardando...';

    const checks = document.querySelectorAll('#permisos-grid input[name="permisos"]:checked');
    const payload = {
        action: 'save_perfil',
        id: document.getElementById('perfil-edit-id').value || undefined,
        nombre: document.getElementById('perfil-nombre').value.trim(),
        permisos: Array.from(checks).map(c => c.value)
    };

    try {
        const json = await postToGAS(payload);
        if (json.ok) {
            toast('Perfil guardado ✅');
            document.getElementById('perfil-modal').style.display = 'none';
            loadAuthData();
        } else { toast(json.error || 'Error', 'error'); }
    } catch (e) { console.error(e); toast('Error de conexión', 'error'); }
    finally { btn.disabled = false; btn.textContent = '💾 Guardar'; }
});

document.getElementById('btn-close-perfil-modal').addEventListener('click', () => {
    document.getElementById('perfil-modal').style.display = 'none';
});

document.getElementById('btn-add-perfil').addEventListener('click', () => openPerfilModal());

// ====================
// SUB-TABS (panel Usuarios)
// ====================
document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active-panel'));
        this.classList.add('active');
        document.getElementById(this.dataset.subtarget).classList.add('active-panel');
    });
});
