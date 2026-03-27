<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Familia extends Model
{
    protected $table = 'familias';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'n_alumno', 'n_apoderado'];

    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class, 'id_familia');
    }
}
