<?php

namespace App\Http\Requests\Api\Auth;

use App\Http\Requests\Api\ApiFormRequest;

class LoginRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'usuario' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string', 'max:255'],
        ];
    }
}
