<?php

namespace App\Http\Requests\Api\Finance;

use App\Http\Requests\Api\ApiFormRequest;

class SavePagoRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'id_familia' => ['required', 'string', 'max:120'],
            'mes' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'monto' => ['required', 'numeric', 'min:0'],
            'file' => ['nullable', 'string'],
            'filename' => ['required_with:file', 'string', 'max:255'],
            'mimeType' => ['required_with:file', 'string', 'max:120'],
        ];
    }
}
