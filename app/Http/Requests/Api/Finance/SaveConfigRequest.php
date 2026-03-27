<?php

namespace App\Http\Requests\Api\Finance;

use App\Http\Requests\Api\ApiFormRequest;

class SaveConfigRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'config' => ['required', 'array'],
            'config.anio' => ['required', 'integer', 'min:2000', 'max:2100'],
            'config.monto' => ['required', 'numeric', 'min:0'],
            'config.inicio' => ['required', 'integer', 'between:1,12'],
            'config.fin' => ['required', 'integer', 'between:1,12', 'gte:config.inicio'],
            'familias' => ['required', 'array'],
            'familias.*.id' => ['required', 'string', 'max:120'],
            'familias.*.n_alumno' => ['nullable', 'string', 'max:255'],
            'familias.*.n_apoderado' => ['nullable', 'string', 'max:255'],
        ];
    }
}
