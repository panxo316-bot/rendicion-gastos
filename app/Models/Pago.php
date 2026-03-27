<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pago extends Model
{
    protected $table = 'pagos';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'id_familia', 'mes', 'monto', 'fecha_pago', 'link_drive'];

    protected $casts = [
        'monto' => 'float',
    ];

    public function familia(): BelongsTo
    {
        return $this->belongsTo(Familia::class, 'id_familia');
    }
}
