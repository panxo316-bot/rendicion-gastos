<?php

namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\ApiFormRequest;

class SavePerfilRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'id' => ['nullable', 'string', 'max:120'],
            'nombre' => ['required', 'string', 'max:120'],
            'permisos' => ['nullable', 'array'],
            'permisos.*' => ['string', 'max:120'],
        ];
    }
}
