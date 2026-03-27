<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Configuracion extends Model
{
    protected $table = 'configuracion';

    protected $fillable = ['anio', 'monto', 'inicio', 'fin'];

    protected $casts = [
        'monto' => 'float',
    ];
}
