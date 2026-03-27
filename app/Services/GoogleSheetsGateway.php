<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleSheetsGateway
{
    private string $scriptUrl;

    public function __construct()
    {
        $this->scriptUrl = (string) config('services.google_sheets.script_url', '');
    }

    public function get(array $query): Response
    {
        $this->ensureConfigured();

        return Http::timeout(30)
            ->acceptJson()
            ->get($this->scriptUrl, $query);
    }

    public function post(array $payload): Response
    {
        $this->ensureConfigured();

        return Http::timeout(30)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->withBody(json_encode($payload, JSON_UNESCAPED_UNICODE), 'application/json')
            ->post($this->scriptUrl);
    }

    /**
     * @return array{status:int,payload:array<string,mixed>}
     */
    public function getJson(array $query): array
    {
        $response = $this->get($query);

        return $this->parseResponse($response);
    }

    /**
     * @return array{status:int,payload:array<string,mixed>}
     */
    public function postJson(array $payload): array
    {
        $response = $this->post($payload);

        return $this->parseResponse($response);
    }

    /**
     * @return array{status:int,payload:array<string,mixed>}
     */
    private function parseResponse(Response $response): array
    {
        $decoded = json_decode($response->body(), true);

        if (!is_array($decoded)) {
            throw new RuntimeException('Respuesta no JSON desde Google Apps Script');
        }

        return [
            'status' => $response->status(),
            'payload' => $decoded,
        ];
    }

    private function ensureConfigured(): void
    {
        if ($this->scriptUrl === '') {
            throw new RuntimeException('GOOGLE_SCRIPT_URL no configurada en .env');
        }
    }
}
