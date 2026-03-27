// Endpoints del backend Laravel (modularizados por dominio)
const API_BASE = 'api';

// ====================
// ESTADO GLOBAL
// ====================
let configuracion = { anio: 2026, monto: 5000, inicio: 3, fin: 12 };
let familias = [];
let gastos = [];
let pagos = [];

function normalizeConfig(raw) {
    const base = raw || {};

    const anio = Number.isFinite(Number(base.anio)) ? Number(base.anio) : 2026;
    const monto = Number.isFinite(Number(base.monto)) ? Number(base.monto) : 5000;

    let inicio = Number(base.inicio);
    let fin = Number(base.fin);

    if (!Number.isFinite(inicio) || inicio < 1 || inicio > 12) inicio = 3;
    if (!Number.isFinite(fin) || fin < 1 || fin > 12) fin = 12;
    if (inicio > fin) {
        inicio = 3;
        fin = 12;
    }

    return { anio, monto, inicio, fin };
}

// DOM Elementos Generales
const loaderOverlay = document.getElementById('loader-overlay');
const tabs = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view-section');

// DOM Gastos
const gastoForm = document.getElementById('gasto-form');
const gastosTbody = document.getElementById('gastos-tbody');
const totalGastosEl = document.getElementById('total-amount');

// DOM Cuotas
const cuotasHead = document.getElementById('cuotas-head');
const cuotasTbody = document.getElementById('cuotas-tbody');
const totalIngresosEl = document.getElementById('total-ingresos');
const lblMontoCuota = document.getElementById('lbl-monto-cuota');
const ingresosYear = document.getElementById('ingresos-year');
const pagoModal = document.getElementById('pago-modal');
const pagoForm = document.getElementById('pago-form');

// DOM Config
const familiasTbody = document.getElementById('familias-tbody');

// MESES
const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// ====================
// NAVEGACIÓN
// ====================
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        views.forEach(v => v.classList.remove('active-view'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active-view');

        if (targetId === 'view-ingresos') renderCuotas();
        if (targetId === 'view-gastos') renderGastos();
        if (targetId === 'view-config') renderConfig();
        if (targetId === 'view-resumen') renderResumen();
        if (targetId === 'view-usuarios' && typeof loadAuthData === 'function') loadAuthData();
    });
});

// ====================
// CONEXIÓN PRINCIPAL
// ====================
async function loadAllData() {
    try {
        const res = await fetch(`${API_BASE}/data`, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });
        const json = await res.json();

        if (json.ok) {
            gastos = json.data.gastos || [];
            pagos = json.data.pagos || [];
            familias = (json.data.familias && json.data.familias.length > 0) ? json.data.familias : generarFamiliasVacias();
            configuracion = normalizeConfig(json.data.configuracion || configuracion);

            renderConfig();
            renderGastos();
            renderCuotas();
            renderResumen();
        } else {
            if (res.status === 401) {
                // La base no se borro: la sesion caduco y hay que volver a autenticar.
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem('auth_user');
                }
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('auth_user');
                }
                if (typeof resetUI === 'function') {
                    resetUI();
                }
                const login = document.getElementById('login-screen');
                if (login) {
                    login.style.display = 'flex';
                    login.classList.remove('hiding');
                }
                toast('Sesion expirada. Inicia sesion nuevamente.', 'error');
                return;
            }
            console.error(json.error);
            toast('Error al sincronizar con Google', 'error');
        }
    } catch (e) {
        console.error("Error Gral:", e);
        toast('Error de conexión a internet', 'error');
    } finally {
        // Aplicar permisos PRIMERO (antes de que el loader empiece a desvanecerse)
        if (typeof applyPermissions === 'function') applyPermissions();
        loaderOverlay.style.opacity = '0';
        setTimeout(() => loaderOverlay.style.display = 'none', 500);
    }
}

function generarFamiliasVacias() {
    let arr = [];
    for (let i = 1; i <= 19; i++) {
        arr.push({ id: i.toString(), n_alumno: `Alumno ${i}`, n_apoderado: `Apoderado ${i}` });
    }
    return arr;
}

// ====================
// RENDERIZADOS
// ====================
function renderConfig() {
    document.getElementById('cfg-anio').value = configuracion.anio;
    document.getElementById('cfg-monto').value = configuracion.monto;
    
    familiasTbody.innerHTML = familias.map((f, i) => `
        <tr>
            <td style="text-align:center">${i + 1}</td>
            <td><input type="text" class="inp-alumno" data-id="${f.id}" value="${escapeHtml(f.n_alumno || '')}"></td>
            <td><input type="text" class="inp-apoderado" data-id="${f.id}" value="${escapeHtml(f.n_apoderado || '')}"></td>
            <td><button class="btn btn-danger-sm" onclick="removeFamiliaRow('${f.id}')" title="Quitar niño">✕</button></td>
        </tr>
    `).join('');
}

// Para guardar cambios intermedios de los inputs antes de redibujar
function syncFamiliasInputs() {
    document.querySelectorAll('#familias-tbody tr').forEach(tr => {
        const id = tr.querySelector('.inp-alumno').dataset.id;
        const nalum = tr.querySelector('.inp-alumno').value;
        const napo = tr.querySelector('.inp-apoderado').value;
        const index = familias.findIndex(f => f.id == id);
        if(index !== -1) {
            familias[index].n_alumno = nalum;
            familias[index].n_apoderado = napo;
        }
    });
}

document.getElementById('btn-add-familia').addEventListener('click', () => {
    syncFamiliasInputs();
    const newId = new Date().getTime().toString();
    familias.push({ id: newId, n_alumno: '', n_apoderado: '' });
    renderConfig();
});

window.removeFamiliaRow = function(id) {
    if(!confirm('¿Quitar a este niño de la lista?')) return;
    syncFamiliasInputs();
    familias = familias.filter(f => f.id != id);
    renderConfig();
}

function renderGastos() {
    const canDelete = typeof hasPermiso === 'function' && hasPermiso('gastos_eliminar');
    if (gastos.length === 0) {
        gastosTbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">📋 Sin egresos registrados</div></td></tr>`;
    } else {
        gastosTbody.innerHTML = gastos.map((g, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(g.descripcion)}</td>
                <td class="valor">$${formatNumber(g.valor)}</td>
                <td>${g.link_drive ? `<a href="${escapeHtml(g.link_drive)}" target="_blank">📎 Ver</a>` : '—'}</td>
                <td>${canDelete ? `<button class="btn btn-danger-sm" onclick="eliminarRegistro('gasto', '${g.id}')">✕</button>` : ''}</td>
            </tr>`).join('');
    }
    const total = gastos.reduce((s, g) => s + parseFloat(g.valor), 0);
    totalGastosEl.textContent = `$${formatNumber(total)}`;
    document.getElementById('record-count').textContent = `${gastos.length} regs`;
}

function renderCuotas() {
    configuracion = normalizeConfig(configuracion);
    lblMontoCuota.textContent = `$${formatNumber(configuracion.monto)}`;
    ingresosYear.textContent = configuracion.anio;

    let ths = `<th class="sticky-col" style="width:40px">N°</th><th class="sticky-col">Alumno / Apoderado</th>`;
    let monthsToRender = [];
    for (let m = configuracion.inicio; m <= configuracion.fin; m++) {
        ths += `<th class="cell-month">${MONTH_NAMES[m - 1]}</th>`;
        monthsToRender.push(m);
    }
    cuotasHead.innerHTML = ths;

    let tbodyHTML = "";
    let recaudadoTotal = 0;

    familias.forEach((f, i) => {
        let tr = `<tr><td class="sticky-col">${i + 1}</td><td class="sticky-col" style="text-align:left; font-size:0.75rem;"><strong>${escapeHtml(f.n_alumno)}</strong><br><span style="color:var(--text-muted)">${escapeHtml(f.n_apoderado)}</span></td>`;

        const canRegister = typeof hasPermiso === 'function' && hasPermiso('pagos_registrar');
        const canVoid = typeof hasPermiso === 'function' && hasPermiso('pagos_anular');

        monthsToRender.forEach(m => {
            const mesStr = `${configuracion.anio}-${m.toString().padStart(2, '0')}`;
            const pago = pagos.find(p => p.id_familia == f.id && p.mes === mesStr);

            if (pago) {
                recaudadoTotal += parseFloat(pago.monto);
                if (canVoid) {
                    tr += `<td class="paid" onclick="openPagoModal('${f.id}', '${mesStr}', '${escapeHtml(f.n_alumno)}', true, '${pago.id}', ${pago.monto})">✓ Pagado</td>`;
                } else {
                    tr += `<td class="paid" style="cursor:default">✓ Pagado</td>`;
                }
            } else {
                if (canRegister) {
                    tr += `<td class="unpaid" onclick="openPagoModal('${f.id}', '${mesStr}', '${escapeHtml(f.n_alumno)}', false)">Pendiente</td>`;
                } else {
                    tr += `<td class="unpaid" style="cursor:default">Pendiente</td>`;
                }
            }
        });
        tr += `</tr>`;
        tbodyHTML += tr;
    });

    cuotasTbody.innerHTML = tbodyHTML;
    totalIngresosEl.textContent = `$${formatNumber(recaudadoTotal)}`;
}

// ====================
// MÓDULO PAGOS (CUOTAS)
// ====================
let currentPagoId = null;

window.openPagoModal = function (familiaId, mesStr, alumnoName, isPaid, pagoId = null, montoPagado = 0) {
    const [y, m] = mesStr.split('-');
    const labelMes = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;

    document.getElementById('pago-info-text').innerHTML = `Mes: <strong>${labelMes}</strong> | Alumno: <strong>${alumnoName}</strong>`;
    document.getElementById('pago-familia-id').value = familiaId;
    document.getElementById('pago-mes').value = mesStr;
    currentPagoId = pagoId;

    const btnSub = document.getElementById('btn-confirm-pago');
    const btnDel = document.getElementById('btn-delete-pago');

    if (isPaid) {
        document.getElementById('pago-monto').value = montoPagado;
        document.getElementById('pago-comprobante').disabled = true;
        btnSub.style.display = 'none';
        btnDel.style.display = 'block';
        btnDel.innerHTML = 'Anular Pago';
    } else {
        document.getElementById('pago-monto').value = configuracion.monto;
        document.getElementById('pago-comprobante').value = '';
        document.getElementById('pago-comprobante').disabled = false;
        btnSub.style.display = 'block';
        btnDel.style.display = 'none';
        btnSub.innerHTML = 'Confirmar Pago';
    }

    pagoModal.style.display = 'flex';
}

document.getElementById('btn-close-modal').addEventListener('click', () => { pagoModal.style.display = 'none'; });

pagoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fId = document.getElementById('pago-familia-id').value;
    const mes = document.getElementById('pago-mes').value;
    const monto = document.getElementById('pago-monto').value;
    const file = document.getElementById('pago-comprobante').files[0];
    const btn = document.getElementById('btn-confirm-pago');

    btn.disabled = true;
    btn.innerHTML = '⏳ Guardando...';

    let payload = { id_familia: fId, mes: mes, monto: monto };
    if (file) {
        toast('Subiendo comprobante...', 'success');
        payload.file = await readFileAsBase64(file);
        payload.filename = file.name;
        payload.mimeType = file.type;
    }

    try {
        const res = await fetch(`${API_BASE}/pagos`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.ok) {
            toast('Pago registrado ✅');
            pagoModal.style.display = 'none';
            // Store local mock and re-render without full refresh to feel instant
            pagos.push({ id: json.id, id_familia: fId, mes: mes, monto: monto, link_drive: json.link_drive });
            renderCuotas();
        } else throw new Error(json.error);
    } catch (err) {
        toast('Error al guardar el pago', 'error');
    } finally {
        btn.disabled = false;
    }
});

document.getElementById('btn-delete-pago').addEventListener('click', async () => {
    if (!confirm("¿Eliminar este pago (Anular)?")) return;
    const btn = document.getElementById('btn-delete-pago');
    btn.disabled = true;
    btn.innerHTML = 'Borrando...';
    try {
        const res = await fetch(`${API_BASE}/pagos/${currentPagoId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });
        const json = await res.json();
        if (json.ok) {
            toast('Pago anulado');
            pagos = pagos.filter(p => p.id != currentPagoId);
            pagoModal.style.display = 'none';
            renderCuotas();
        } else throw new Error();
    } catch (e) {
        toast('Error de red', 'error');
    } finally { 
        btn.disabled = false; 
        btn.innerHTML = 'Anular Pago';
    }
});

// ====================
// MÓDULO GASTOS
// ====================
gastoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descripcion = document.getElementById('descripcion').value.trim();
    const valor = document.getElementById('valor').value;
    const file = document.getElementById('comprobante').files[0];
    const btn = document.getElementById('btn-add');

    btn.innerHTML = '⏳ Guardando...'; btn.disabled = true;
    let payload = { descripcion, valor };

    if (file) {
        toast('Subiendo archivo...', 'success');
        payload.file = await readFileAsBase64(file);
        payload.filename = file.name; payload.mimeType = file.type;
    }

    try {
        const res = await fetch(`${API_BASE}/gastos`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.ok) {
            toast('Gasto agregado');
            gastos.push({ id: json.id, descripcion, valor, link_drive: json.link_drive });
            gastoForm.reset();
            renderGastos();
        } else throw new Error();
    } catch (e) { toast('Error', 'error'); }
    finally { btn.innerHTML = '➕ Agregar Gasto'; btn.disabled = false; }
});

window.eliminarRegistro = async function (tipo, id) {
    if (!confirm('¿Eliminar este registro permanentemente?')) return;
    toast('Eliminando...', 'success');
    try {
        const endpoint = tipo === 'gasto' ? `${API_BASE}/gastos/${id}` : `${API_BASE}/pagos/${id}`;
        const res = await fetch(endpoint, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        if (data.ok) {
            toast('Eliminado');
            if (tipo === 'gasto') {
                gastos = gastos.filter(g => g.id != id);
                renderGastos();
            }
        }
    } catch (e) { toast('Error', 'error'); }
}

// ====================
// MÓDULO CONFIGURACIÓN
// ====================
document.getElementById('btn-save-config').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-config');
    btn.innerHTML = 'Guardando...'; btn.disabled = true;

    // Recopilar familias
    let fams = [];
    document.querySelectorAll('#familias-tbody tr').forEach(tr => {
        const id = tr.querySelector('.inp-alumno').dataset.id;
        const nalum = tr.querySelector('.inp-alumno').value.trim();
        const napo = tr.querySelector('.inp-apoderado').value.trim();
        fams.push({ id, n_alumno: nalum, n_apoderado: napo });
    });

    const anio = parseInt(document.getElementById('cfg-anio').value);
    const monto = parseInt(document.getElementById('cfg-monto').value);

    const payload = {
        config: { anio, monto, inicio: 3, fin: 12 },
        familias: fams
    };

    try {
        const res = await fetch(`${API_BASE}/configuracion`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.ok) {
            toast('✅ Todo guardado en la Nube');
            familias = fams;
            configuracion.anio = anio;
            configuracion.monto = monto;
            renderCuotas();
        } else throw new Error();
    } catch (e) {
        toast('Error al guardar', 'error');
    } finally {
        btn.innerHTML = '💾 Guardar Todo'; btn.disabled = false;
    }
});

// ====================
// RESPALDO GOOGLE SHEETS
// ====================
document.getElementById('btn-backup-sheets').addEventListener('click', async () => {
    const btn = document.getElementById('btn-backup-sheets');
    btn.innerHTML = '⏳ Respaldando...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/backup`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json.ok) {
            toast('☁️ Respaldo completado en Google Sheets');
        } else {
            toast('Error al respaldar: ' + (json.error || 'desconocido'), 'error');
        }
    } catch (e) {
        toast('Error de conexión al respaldar', 'error');
    } finally {
        btn.innerHTML = '☁️ Respaldar en Sheets'; btn.disabled = false;
    }
});

// ====================
// HELPERS GLOBALES
// ====================
function readFileAsBase64(file) {
    return new Promise((r, j) => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result.split(',')[1]);
        reader.onerror = e => j(e);
        reader.readAsDataURL(file);
    });
}
function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatNumber(n) { return parseFloat(n || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function toast(msg, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ====================
// RENDER RESUMEN (Perfil Consulta)
// ====================
function renderResumen() {
    const tbody = document.getElementById('resumen-ingresos-tbody');
    if (!tbody) return;

    const resumenYear = document.getElementById('resumen-year');
    if (resumenYear) resumenYear.textContent = configuracion.anio;

    let monthsToRender = [];
    for (let m = configuracion.inicio; m <= configuracion.fin; m++) {
        monthsToRender.push(m);
    }

    let totalGeneral = 0;
    let rowsHTML = '';

    monthsToRender.forEach(m => {
        const mesStr = `${configuracion.anio}-${m.toString().padStart(2, '0')}`;
        let totalMes = 0;
        let cantPagos = 0;

        pagos.forEach(p => {
            if (p.mes === mesStr) {
                totalMes += parseFloat(p.monto);
                cantPagos++;
            }
        });
        totalGeneral += totalMes;
        rowsHTML += `<tr>
            <td>${MONTH_NAMES[m - 1]} ${configuracion.anio}</td>
            <td class="valor">$${formatNumber(totalMes)}</td>
            <td>${cantPagos} de ${familias.length}</td>
        </tr>`;
    });

    tbody.innerHTML = rowsHTML;

    const totalResumenEl = document.getElementById('total-resumen-ingresos');
    if (totalResumenEl) totalResumenEl.textContent = `$${formatNumber(totalGeneral)}`;

    // Gastos en modo consulta (solo lectura)
    const gastosResumen = document.getElementById('resumen-gastos-tbody');
    if (gastosResumen) {
        if (gastos.length === 0) {
            gastosResumen.innerHTML = '<tr><td colspan="4"><div class="empty-state">Sin egresos</div></td></tr>';
        } else {
            gastosResumen.innerHTML = gastos.map((g, i) => `<tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(g.descripcion)}</td>
                <td class="valor">$${formatNumber(g.valor)}</td>
                <td>${g.link_drive ? `<a href="${escapeHtml(g.link_drive)}" target="_blank">📎 Ver</a>` : '—'}</td>
            </tr>`).join('');
        }
    }

    const totalGastosVal = gastos.reduce((s, g) => s + parseFloat(g.valor), 0);
    const totalResumenGastos = document.getElementById('total-resumen-gastos');
    if (totalResumenGastos) totalResumenGastos.textContent = `$${formatNumber(totalGastosVal)}`;

    // Balance
    const balIngresos = document.getElementById('balance-ingresos');
    const balEgresos = document.getElementById('balance-egresos');
    const balSaldo = document.getElementById('balance-saldo');
    if (balIngresos) balIngresos.textContent = `$${formatNumber(totalGeneral)}`;
    if (balEgresos) balEgresos.textContent = `$${formatNumber(totalGastosVal)}`;
    if (balSaldo) {
        const saldo = totalGeneral - totalGastosVal;
        balSaldo.textContent = `$${formatNumber(saldo)}`;
        balSaldo.className = 'balance-amount ' + (saldo >= 0 ? 'balance-positivo' : 'balance-negativo');
    }
}

// Iniciar app si ya está autenticado (sesión previa)
if (typeof isAuthenticated === 'function' && isAuthenticated()) {
    loadAllData();
}
