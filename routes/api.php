<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\GoogleSheetsProxyController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;

$sessionMiddleware = [
	EncryptCookies::class,
	AddQueuedCookiesToResponse::class,
	StartSession::class,
];

Route::middleware($sessionMiddleware)->prefix('auth')->group(function () use ($sessionMiddleware): void {
	Route::post('/login', [AuthController::class, 'login']);

	Route::middleware(array_merge($sessionMiddleware, ['api.auth']))->group(function (): void {
		Route::post('/logout', [AuthController::class, 'logout']);
		Route::get('/data', [AuthController::class, 'authData'])->middleware('api.permission:usuarios_gestionar');

		Route::post('/usuarios', [AuthController::class, 'saveUsuario'])->middleware('api.permission:usuarios_gestionar');
		Route::delete('/usuarios/{id}', [AuthController::class, 'deleteUsuario'])->middleware('api.permission:usuarios_gestionar');

		Route::post('/perfiles', [AuthController::class, 'savePerfil'])->middleware('api.permission:usuarios_gestionar');
		Route::delete('/perfiles/{id}', [AuthController::class, 'deletePerfil'])->middleware('api.permission:usuarios_gestionar');
	});
});

Route::middleware(array_merge($sessionMiddleware, ['api.auth']))->group(function (): void {
	Route::get('/data', [FinanceController::class, 'data']);
	Route::post('/pagos', [FinanceController::class, 'savePago'])->middleware('api.permission:pagos_registrar');
	Route::delete('/pagos/{id}', [FinanceController::class, 'deletePago'])->middleware('api.permission:pagos_anular');
	Route::post('/gastos', [FinanceController::class, 'saveGasto'])->middleware('api.permission:gastos_crear');
	Route::delete('/gastos/{id}', [FinanceController::class, 'deleteGasto'])->middleware('api.permission:gastos_eliminar');
	Route::post('/configuracion', [FinanceController::class, 'saveConfig'])->middleware('api.permission:config_editar');
	Route::post('/backup', [FinanceController::class, 'backup'])->middleware('api.permission:config_editar');
});

// Compatibilidad con flujo anterior basado en action.
Route::match(['GET', 'POST'], '/google-sheets', GoogleSheetsProxyController::class)->middleware($sessionMiddleware);
