<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sistema Integral de Tesorería Escolar">
    <title>Tesorería Escolar</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
</head>
<body>

<!-- PANTALLA DE LOGIN -->
<div id="login-screen" class="login-overlay">
    <div class="login-card">
        <div class="login-icon">🔐</div>
        <h2 class="login-title">Tesorería Escolar</h2>
        <p class="login-subtitle">Ingrese sus credenciales para acceder</p>
        <form id="login-form" autocomplete="off">
            <div class="form-group">
                <label for="login-user">Usuario</label>
                <input type="text" id="login-user" placeholder="Ingrese su usuario" required autofocus>
            </div>
            <div class="form-group">
                <label for="login-pass">Contraseña</label>
                <input type="password" id="login-pass" placeholder="Ingrese su contraseña" required>
            </div>
            <p id="login-error" class="login-error" style="display:none;">Usuario o contraseña incorrectos</p>
            <button type="submit" class="btn btn-primary login-btn" id="btn-login">Iniciar Sesión</button>
        </form>
    </div>
</div>

<div id="loader-overlay" class="loader-overlay">
    <div class="spinner"></div>
    <p>Sincronizando con Google Sheets...</p>
</div>

<div class="container container-wide">
    <header class="header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h1>📊 Tesorería Escolar</h1>
                <p>Control automatizado de Cuotas y Egresos</p>
            </div>
            <div class="header-actions">
                <div class="user-info-badge">
                    <span id="header-user-name" class="user-name">👤 Usuario</span>
                    <span id="header-user-perfil" class="user-role">Perfil</span>
                </div>
                <button class="btn btn-logout" id="btn-logout" title="Cerrar sesión">🚪 Salir</button>
            </div>
        </div>
    </header>

    <nav class="tabs">
        <button class="tab-btn" data-target="view-resumen">📊 Resumen</button>
        <button class="tab-btn" data-target="view-ingresos">📈 Cuotas (Ingresos)</button>
        <button class="tab-btn active" data-target="view-gastos">📉 Egresos (Gastos)</button>
        <button class="tab-btn" data-target="view-config">⚙️ Configuración</button>
        <button class="tab-btn" data-target="view-usuarios">👥 Usuarios</button>
    </nav>

    <!-- VISTA: INGRESOS -->
    <div id="view-ingresos" class="view-section">
        <div class="toolbar" style="margin-bottom:1rem;">
            <div class="card-title" style="margin-bottom:0">
                <span class="icon">💰</span> Estado de Pagos <span id="ingresos-year" class="badge">2026</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
                <div class="stat-badge">Cuota: <strong id="lbl-monto-cuota">$0</strong></div>
                <button class="btn btn-success" id="btn-export-ingresos">📥 Exportar</button>
            </div>
        </div>

        <div class="card p-0">
            <div class="table-wrapper scroll-x" style="max-height: 65vh; border:none; margin:0; border-radius:var(--radius-lg);">
                <table class="grid-table" id="tabla-cuotas">
                    <thead>
                        <tr id="cuotas-head">
                            <!-- JS Inject -->
                        </tr>
                    </thead>
                    <tbody id="cuotas-tbody">
                        <!-- JS Inject -->
                    </tbody>
                </table>
            </div>
            
            <div class="total-bar m-3" style="margin: 1rem;">
                <span class="label">Total Recaudado en Cuotas</span>
                <span class="amount" id="total-ingresos">$0</span>
            </div>
        </div>
    </div>

    <!-- VISTA: GASTOS (Existente) -->
    <div id="view-gastos" class="view-section active-view">
        <section class="card" id="form-section">
            <div class="card-title">
                <span class="icon">➕</span> Registrar Egreso
            </div>
            <form id="gasto-form" class="form-grid" autocomplete="off">
                <div class="form-group">
                    <label for="descripcion">Descripción del ítem</label>
                    <input type="text" id="descripcion" placeholder="Ej: Material Didáctico" required>
                </div>
                <div class="form-group">
                    <label for="valor">Valor ($)</label>
                    <input type="number" id="valor" placeholder="0" min="1" step="1" required>
                </div>
                <div class="form-group full-width">
                    <label for="comprobante">Comprobante (Imagen o PDF)</label>
                    <input type="file" id="comprobante" accept="image/*,.pdf" class="file-input">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="btn-add">
                        ➕ Agregar Gasto
                    </button>
                </div>
            </form>
        </section>

        <section class="card" id="table-section">
            <div class="toolbar">
                <div class="card-title" style="margin-bottom:0">
                    <span class="icon">📋</span> Registro de Egresos
                    <span class="record-count" id="record-count">0 registros</span>
                </div>
                <button class="btn btn-success" id="btn-export-gastos">
                    📥 Exportar 
                </button>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>N°</th>
                            <th>Descripción</th>
                            <th>Valor</th>
                            <th>Comprobante</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody id="gastos-tbody">
                    </tbody>
                </table>
            </div>

            <div class="total-bar">
                <span class="label">Total Egresos</span>
                <span class="amount" id="total-amount">$0</span>
            </div>
        </section>
    </div>

    <!-- VISTA: RESUMEN (perfil Consulta) -->
    <div id="view-resumen" class="view-section">
        <section class="card">
            <div class="card-title">
                <span class="icon">📊</span> Resumen de Ingresos por Mes
                <span id="resumen-year" class="badge">2026</span>
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Total Recaudado</th>
                            <th>Familias que Pagaron</th>
                        </tr>
                    </thead>
                    <tbody id="resumen-ingresos-tbody"></tbody>
                </table>
            </div>
            <div class="total-bar" style="margin-top:1rem;">
                <span class="label">Total General Ingresos</span>
                <span class="amount" id="total-resumen-ingresos">$0</span>
            </div>
        </section>

        <section class="card" style="margin-top:1.5rem;">
            <div class="card-title">
                <span class="icon">📋</span> Egresos Registrados
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>N°</th>
                            <th>Descripción</th>
                            <th>Valor</th>
                            <th>Comprobante</th>
                        </tr>
                    </thead>
                    <tbody id="resumen-gastos-tbody"></tbody>
                </table>
            </div>
            <div class="total-bar" style="margin-top:1rem;">
                <span class="label">Total Egresos</span>
                <span class="amount" id="total-resumen-gastos">$0</span>
            </div>
        </section>

        <section class="card" style="margin-top:1.5rem;">
            <div class="card-title"><span class="icon">💰</span> Balance General</div>
            <div class="resumen-balance">
                <div class="balance-item">
                    <span class="balance-label">Total Ingresos</span>
                    <span class="balance-amount balance-ingreso" id="balance-ingresos">$0</span>
                </div>
                <div class="balance-sep">−</div>
                <div class="balance-item">
                    <span class="balance-label">Total Egresos</span>
                    <span class="balance-amount balance-egreso" id="balance-egresos">$0</span>
                </div>
                <div class="balance-sep">=</div>
                <div class="balance-item">
                    <span class="balance-label">Saldo Disponible</span>
                    <span class="balance-amount" id="balance-saldo">$0</span>
                </div>
            </div>
        </section>
    </div>

    <!-- VISTA: CONFIGURACIÓN -->
    <div id="view-config" class="view-section">
        <section class="card">
            <div class="toolbar">
                <div class="card-title" style="margin-bottom:0">
                    <span class="icon">⚙️</span> Configuración del Curso
                </div>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-secondary" id="btn-backup-sheets" title="Respaldar en Google Sheets">☁️ Respaldar en Sheets</button>
                    <button class="btn btn-primary" id="btn-save-config">💾 Guardar Todo</button>
                </div>
            </div>
            
            <form id="config-form" class="form-grid" style="margin-top: 1.5rem;" autocomplete="off">
                <div class="form-group">
                    <label>Año Escolar</label>
                    <input type="number" id="cfg-anio" value="2026" required>
                </div>
                <div class="form-group">
                    <label>Valor de Cuota Mensual ($)</label>
                    <input type="number" id="cfg-monto" value="5000" required>
                </div>
            </form>

            <div class="card-title" style="margin-top:2.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
                <div><span class="icon">👨‍👩‍👧‍👦</span> Familias / Apoderados</div>
                <button type="button" class="btn btn-primary" id="btn-add-familia" style="font-size:0.85rem; padding:0.4rem 0.8rem;">➕ Añadir Niño</button>
            </div>
            
            <div class="table-wrapper">
                <table class="edit-table">
                    <thead>
                        <tr>
                            <th width="10%">N°</th>
                            <th width="40%">Nombre del Alumno/a</th>
                            <th width="40%">Nombre del Apoderado/a</th>
                            <th width="10%">Quitar</th>
                        </tr>
                    </thead>
                    <tbody id="familias-tbody">
                        <!-- JS Inject -->
                    </tbody>
                </table>
            </div>
        </section>
    </div>

    <!-- VISTA: GESTIÓN DE USUARIOS (Admin) -->
    <div id="view-usuarios" class="view-section">
        <div class="sub-tabs">
            <button class="sub-tab active" data-subtarget="panel-usuarios">👤 Usuarios</button>
            <button class="sub-tab" data-subtarget="panel-perfiles">🔑 Perfiles</button>
        </div>

        <!-- Panel Usuarios -->
        <div id="panel-usuarios" class="sub-panel active-panel">
            <section class="card">
                <div class="toolbar">
                    <div class="card-title" style="margin-bottom:0">
                        <span class="icon">👤</span> Gestión de Usuarios
                    </div>
                    <button class="btn btn-primary" id="btn-add-usuario">➕ Nuevo Usuario</button>
                </div>
                <div class="table-wrapper" style="margin-top:1rem;">
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Nombre Completo</th>
                                <th>Perfil</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="usuarios-tbody"></tbody>
                    </table>
                </div>
            </section>
        </div>

        <!-- Panel Perfiles -->
        <div id="panel-perfiles" class="sub-panel">
            <section class="card">
                <div class="toolbar">
                    <div class="card-title" style="margin-bottom:0">
                        <span class="icon">🔑</span> Gestión de Perfiles
                    </div>
                    <button class="btn btn-primary" id="btn-add-perfil">➕ Nuevo Perfil</button>
                </div>
                <div class="table-wrapper" style="margin-top:1rem;">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre del Perfil</th>
                                <th>Permisos Asignados</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="perfiles-tbody"></tbody>
                    </table>
                </div>
            </section>
        </div>
    </div>

</div>

<!-- MODAL DE PAGO -->
<div class="modal-overlay" id="pago-modal" style="display:none;">
    <div class="modal-card card">
        <div class="modal-header">
            <h3 class="card-title" style="margin:0"><span class="icon">💰</span> Registrar Cuota</h3>
            <button class="btn-close" id="btn-close-modal">✕</button>
        </div>
        <div class="modal-body" style="margin-top:1rem;">
            <p id="pago-info-text" style="color:var(--text-secondary); margin-bottom:1rem;">Mes: <strong>--</strong> | Alumno: <strong>--</strong></p>
            <form id="pago-form">
                <input type="hidden" id="pago-familia-id">
                <input type="hidden" id="pago-mes">
                
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Monto Pagado ($)</label>
                    <input type="number" id="pago-monto" required>
                </div>
                <div class="form-group" style="margin-bottom:1.5rem;">
                    <label>Comprobante de Transferencia (Archivo)</label>
                    <input type="file" id="pago-comprobante" accept="image/*,.pdf" class="file-input">
                </div>
                <div class="form-actions" style="justify-content:space-between;">
                    <button type="button" class="btn btn-danger-sm" id="btn-delete-pago" style="display:none; height:fit-content; margin-top:auto;">Anular Pago</button>
                    <button type="submit" class="btn btn-primary" id="btn-confirm-pago">Confirmar Pago</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- MODAL USUARIO -->
<div class="modal-overlay" id="usuario-modal" style="display:none;">
    <div class="modal-card card">
        <div class="modal-header">
            <h3 class="card-title" style="margin:0" id="usuario-modal-title">👤 Usuario</h3>
            <button class="btn-close" id="btn-close-usuario-modal">✕</button>
        </div>
        <form id="usuario-form" style="margin-top:1rem;" autocomplete="off">
            <input type="hidden" id="usuario-edit-id">
            <div class="form-group" style="margin-bottom:1rem;">
                <label>Nombre de Usuario</label>
                <input type="text" id="usuario-nombre-usuario" required>
            </div>
            <div class="form-group" style="margin-bottom:1rem;">
                <label>Nombre Completo</label>
                <input type="text" id="usuario-nombre-completo" required>
            </div>
            <div class="form-group" style="margin-bottom:1rem;">
                <label>Contraseña</label>
                <input type="password" id="usuario-password">
                <small style="color:var(--text-muted);font-size:0.72rem;">Dejar vacío para no cambiar (al editar)</small>
            </div>
            <div class="form-group" style="margin-bottom:1rem;">
                <label>Perfil</label>
                <select id="usuario-perfil" required></select>
            </div>
            <div class="form-group" style="margin-bottom:1.5rem;">
                <label>Estado</label>
                <select id="usuario-activo">
                    <option value="SI">Activo</option>
                    <option value="NO">Inactivo</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">💾 Guardar</button>
            </div>
        </form>
    </div>
</div>

<!-- MODAL PERFIL -->
<div class="modal-overlay" id="perfil-modal" style="display:none;">
    <div class="modal-card card" style="max-width:550px;">
        <div class="modal-header">
            <h3 class="card-title" style="margin:0" id="perfil-modal-title">🔑 Perfil</h3>
            <button class="btn-close" id="btn-close-perfil-modal">✕</button>
        </div>
        <form id="perfil-form" style="margin-top:1rem;" autocomplete="off">
            <input type="hidden" id="perfil-edit-id">
            <div class="form-group" style="margin-bottom:1.2rem;">
                <label>Nombre del Perfil</label>
                <input type="text" id="perfil-nombre" required>
            </div>
            <div class="form-group" style="margin-bottom:1.5rem;">
                <label style="margin-bottom:0.5rem;">Permisos</label>
                <div id="permisos-grid" class="permisos-grid"></div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">💾 Guardar</button>
            </div>
        </form>
    </div>
</div>

<script src="js/auth.js"></script>
<script src="js/export.js"></script>
<script src="js/app.js"></script>
</body>
</html>
