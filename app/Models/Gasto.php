<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gasto extends Model
{
    protected $table = 'gastos';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'fecha', 'descripcion', 'valor', 'link_drive'];

    protected $casts = [
        'valor' => 'float',
    ];
}
