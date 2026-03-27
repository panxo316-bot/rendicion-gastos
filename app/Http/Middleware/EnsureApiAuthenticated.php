<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->session()->get('auth_user');

        if (!is_array($user) || empty($user['usuario'])) {
            return $this->deny('Sesion expirada o no iniciada', 401);
        }

        return $next($request);
    }

    private function deny(string $message, int $status): JsonResponse
    {
        return response()->json([
            'ok' => false,
            'error' => $message,
        ], $status);
    }
}
