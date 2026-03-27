<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Usuario extends Model
{
    protected $table = 'usuarios';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'usuario', 'password_hash', 'nombre_completo', 'perfil_id', 'activo'];

    protected $hidden = ['password_hash'];

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'perfil_id');
    }
}
