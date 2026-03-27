<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Finance\SaveConfigRequest;
use App\Http\Requests\Api\Finance\SaveGastoRequest;
use App\Http\Requests\Api\Finance\SavePagoRequest;
use App\Models\Configuracion;
use App\Models\Familia;
use App\Models\Gasto;
use App\Models\Pago;
use App\Services\GoogleSheetsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class FinanceController extends Controller
{
    public function data(): JsonResponse
    {
        try {
            $gastos  = Gasto::orderBy('created_at', 'desc')->get();
            $pagos   = Pago::orderBy('created_at', 'desc')->get();
            $familias = Familia::all();
            $config  = Configuracion::first();

            return response()->json([
                'ok'   => true,
                'data' => [
                    'gastos'       => $gastos,
                    'pagos'        => $pagos,
                    'familias'     => $familias,
                    'configuracion'=> $config,
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function savePago(SavePagoRequest $request): JsonResponse
    {
        try {
            $v = $request->validated();
            $linkDrive = $this->storeFile($v);
            $fecha = now()->format('d/m/Y H:i:s');
            $newId = (string) Str::uuid();

            Pago::create([
                'id'         => $newId,
                'id_familia' => $v['id_familia'],
                'mes'        => $v['mes'],
                'monto'      => $v['monto'],
                'fecha_pago' => $fecha,
                'link_drive' => $linkDrive,
            ]);

            return response()->json(['ok' => true, 'id' => $newId, 'link_drive' => $linkDrive]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function deletePago(string $id): JsonResponse
    {
        try {
            $deleted = Pago::destroy($id);
            if (! $deleted) {
                return response()->json(['ok' => false, 'error' => 'Pago no encontrado'], 404);
            }

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function saveGasto(SaveGastoRequest $request): JsonResponse
    {
        try {
            $v = $request->validated();
            $linkDrive = $this->storeFile($v);
            $fecha = now()->format('d/m/Y H:i:s');
            $newId = (string) Str::uuid();

            Gasto::create([
                'id'          => $newId,
                'fecha'       => $fecha,
                'descripcion' => $v['descripcion'],
                'valor'       => $v['valor'],
                'link_drive'  => $linkDrive,
            ]);

            return response()->json(['ok' => true, 'id' => $newId, 'link_drive' => $linkDrive]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteGasto(string $id): JsonResponse
    {
        try {
            $deleted = Gasto::destroy($id);
            if (! $deleted) {
                return response()->json(['ok' => false, 'error' => 'Gasto no encontrado'], 404);
            }

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function saveConfig(SaveConfigRequest $request): JsonResponse
    {
        try {
            $v = $request->validated();

            DB::transaction(function () use ($v) {
                Configuracion::truncate();
                Configuracion::create([
                    'anio'  => $v['config']['anio']  ?? '',
                    'monto' => $v['config']['monto'] ?? 0,
                    'inicio'=> $v['config']['inicio'] ?? null,
                    'fin'   => $v['config']['fin']   ?? null,
                ]);

                Familia::truncate();
                foreach ($v['familias'] ?? [] as $f) {
                    Familia::create([
                        'id'          => $f['id'],
                        'n_alumno'    => $f['n_alumno'],
                        'n_apoderado' => $f['n_apoderado'],
                    ]);
                }
            });

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function backup(Request $request): JsonResponse
    {
        try {
            $exitCode = Artisan::call('app:backup-to-sheets');

            if ($exitCode === 0) {
                return response()->json(['ok' => true, 'message' => 'Respaldo enviado a Google Sheets exitosamente']);
            }

            $output = Artisan::output();
            return response()->json(['ok' => false, 'error' => $output ?: 'El respaldo falló'], 500);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Sube el archivo a Google Drive vía GAS y retorna la URL pública.
     * No guarda archivos en el servidor local.
     */
    private function storeFile(array $v): string
    {
        if (empty($v['file']) || empty($v['filename'])) {
            return '';
        }

        $gateway = app(GoogleSheetsGateway::class);
        $result  = $gateway->postJson([
            'action'   => 'upload_file',
            'file'     => $v['file'],
            'filename' => $v['filename'],
            'mimeType' => $v['mimeType'] ?? 'application/octet-stream',
        ]);

        if (($result['payload']['ok'] ?? false) === true && ! empty($result['payload']['link_drive'])) {
            return (string) $result['payload']['link_drive'];
        }

        $gasError = (string) ($result['payload']['error'] ?? 'Error desconocido en Google Apps Script.');

        if (str_contains($gasError, 'Acción no reconocida: upload_file')) {
            throw new RuntimeException('Tu despliegue de Google Apps Script no soporta upload_file. Vuelve a desplegar el script COMPLETO (incluyendo handleUploadFile y case upload_file).');
        }

        throw new RuntimeException('No fue posible subir el comprobante a Google Drive. Detalle GAS: ' . $gasError);
    }
}
