<?php

namespace App\Console\Commands;

use App\Models\Configuracion;
use App\Models\Familia;
use App\Models\Gasto;
use App\Models\Pago;
use App\Models\Perfil;
use App\Models\Usuario;
use App\Services\GoogleSheetsGateway;
use Illuminate\Console\Command;
use Throwable;

class BackupToGoogleSheets extends Command
{
    protected $signature   = 'app:backup-to-sheets';
    protected $description = 'Envía un respaldo completo de la base de datos a Google Sheets';

    public function __construct(private GoogleSheetsGateway $gateway)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Iniciando respaldo hacia Google Sheets...');

        try {
            $payload = [
                'action'        => 'full_backup',
                'timestamp'     => now()->format('d/m/Y H:i:s'),
                'familias'      => Familia::all()->toArray(),
                'pagos'         => Pago::all()->toArray(),
                'gastos'        => Gasto::all()->toArray(),
                'configuracion' => Configuracion::first()?->toArray(),
                'perfiles'      => Perfil::all()->map(fn ($p) => [
                    'id'      => $p->id,
                    'nombre'  => $p->nombre,
                    'permisos'=> $p->permisos ?? [],
                ])->toArray(),
                'usuarios'      => Usuario::all()->map(fn ($u) => [
                    'id'             => $u->id,
                    'usuario'        => $u->usuario,
                    'nombre_completo'=> $u->nombre_completo,
                    'perfil_id'      => $u->perfil_id,
                    'activo'         => $u->activo,
                ])->toArray(),
            ];

            $result = $this->gateway->postJson($payload);

            if (($result['payload']['ok'] ?? false) === true) {
                $this->info('Respaldo completado exitosamente.');
                return Command::SUCCESS;
            }

            $this->error('El script GAS reportó un error: ' . ($result['payload']['error'] ?? 'desconocido'));
            return Command::FAILURE;

        } catch (Throwable $e) {
            $this->error('Error al respaldar: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
