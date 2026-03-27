<?php

namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\ApiFormRequest;

class SaveUsuarioRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'id' => ['nullable', 'string', 'max:120'],
            'usuario' => ['required', 'string', 'max:120'],
            'nombre_completo' => ['required', 'string', 'max:180'],
            'password' => ['nullable', 'string', 'max:255'],
            'perfil_id' => ['required', 'string', 'max:120'],
            'activo' => ['required', 'in:SI,NO'],
        ];
    }
}
