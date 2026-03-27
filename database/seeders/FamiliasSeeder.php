<?php

namespace Database\Seeders;

use App\Models\Familia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FamiliasSeeder extends Seeder
{
    public function run(): void
    {
        $familias = [
            ['n_alumno' => 'Leonor Arriagada Flores', 'n_apoderado' => 'Carolina Flores'],
            ['n_alumno' => 'Pascuala Burgos Parra', 'n_apoderado' => 'Jessica Parra'],
            ['n_alumno' => 'Benjamin Castillo Letelier', 'n_apoderado' => 'Nicole Letelier'],
            ['n_alumno' => 'Gabriel Concha Rodríguez', 'n_apoderado' => 'Evelyn Rodriguez'],
            ['n_alumno' => 'Matías Cordero Gfell', 'n_apoderado' => 'Carolt Gfell'],
            ['n_alumno' => 'Agustina Duma Raasch', 'n_apoderado' => 'Karla Raasch'],
            ['n_alumno' => 'Rafael Fernández Muñoz', 'n_apoderado' => 'Lissette Muñoz'],
            ['n_alumno' => 'Simón Ferreira Andrade', 'n_apoderado' => 'Pamela Andrade'],
            ['n_alumno' => 'Ema Jaque Hidalgo', 'n_apoderado' => 'Liset Hidalgo'],
            ['n_alumno' => 'Julián Moraga Toro', 'n_apoderado' => 'Bruno Moraga'],
            ['n_alumno' => 'Agustina Quezada Soto', 'n_apoderado' => 'Jacqueline Soto'],
            ['n_alumno' => 'Gaspar Sáez Barriga', 'n_apoderado' => 'Lorena Barriga'],
            ['n_alumno' => 'Facundo Salamanca Escare', 'n_apoderado' => 'Litzi Escare'],
            ['n_alumno' => 'Greta Salinas González', 'n_apoderado' => 'Claudia González'],
            ['n_alumno' => 'Santiago Tapia Contreras', 'n_apoderado' => 'Juan Ignacio Tapia'],
            ['n_alumno' => 'Matías Troncoso Cumsille', 'n_apoderado' => 'Tamara Cumsille'],
            ['n_alumno' => 'Rafael Umanzor Nova', 'n_apoderado' => 'Miguel Umanzor'],
            ['n_alumno' => 'Vicente Valdés Pino', 'n_apoderado' => 'Héctor Valdés'],
            ['n_alumno' => 'Sergio Vargas Rossi', 'n_apoderado' => 'Sebastián Vargas'],
            ['n_alumno' => 'Lucas Viveros Zavala', 'n_apoderado' => 'Alejandro Viveros'],
        ];

        foreach ($familias as $familia) {
            $model = Familia::firstOrNew(['n_alumno' => $familia['n_alumno']]);

            if (! $model->exists) {
                $model->id = (string) Str::uuid();
            }

            $model->n_apoderado = $familia['n_apoderado'];
            $model->save();
        }
    }
}
