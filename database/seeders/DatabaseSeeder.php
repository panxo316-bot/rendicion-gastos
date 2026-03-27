<?php

namespace Database\Seeders;

use App\Models\Perfil;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $adminPerfilId   = (string) Str::uuid();
        $consultaPerfilId = (string) Str::uuid();

        Perfil::create([
            'id'      => $adminPerfilId,
            'nombre'  => 'Administrador',
            'permisos'=> [
                'ingresos_ver_detalle', 'ingresos_ver_resumen',
                'gastos_ver', 'gastos_crear', 'gastos_eliminar',
                'pagos_registrar', 'pagos_anular',
                'config_ver', 'config_editar',
                'usuarios_gestionar',
            ],
        ]);

        Perfil::create([
            'id'      => $consultaPerfilId,
            'nombre'  => 'Consulta',
            'permisos'=> ['ingresos_ver_resumen', 'gastos_ver'],
        ]);

        Usuario::create([
            'id'             => (string) Str::uuid(),
            'usuario'        => 'admin',
            'password_hash'  => Hash::make('admin123'),
            'nombre_completo'=> 'Administrador del Sistema',
            'perfil_id'      => $adminPerfilId,
            'activo'         => 'SI',
        ]);
    }
}
