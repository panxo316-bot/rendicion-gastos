<?php

namespace App\Http\Controllers;

use App\Services\GoogleSheetsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class GoogleSheetsProxyController extends Controller
{
    public function __construct(private GoogleSheetsGateway $gateway)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        try {
            $response = $request->isMethod('get')
                ? $this->gateway->get($request->query())
                : $this->gateway->post($request->all());

            $payload = json_decode($response->body(), true);

            if (!is_array($payload)) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Respuesta no JSON desde Google Apps Script',
                ], 502);
            }

            return response()->json($payload, $response->status());
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
