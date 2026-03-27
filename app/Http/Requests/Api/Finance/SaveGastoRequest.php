<?php

namespace App\Http\Requests\Api\Finance;

use App\Http\Requests\Api\ApiFormRequest;

class SaveGastoRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'descripcion' => ['required', 'string', 'max:255'],
            'valor' => ['required', 'numeric', 'min:0'],
            'file' => ['nullable', 'string'],
            'filename' => ['required_with:file', 'string', 'max:255'],
            'mimeType' => ['required_with:file', 'string', 'max:120'],
        ];
    }
}
