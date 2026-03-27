<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Perfil extends Model
{
    protected $table = 'perfiles';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'nombre', 'permisos'];

    protected $casts = [
        'permisos' => 'array',
    ];

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class, 'perfil_id');
    }
}
