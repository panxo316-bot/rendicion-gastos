<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->session()->get('auth_user');
        $permissions = is_array($user) ? ($user['permisos'] ?? []) : [];

        if (!is_array($permissions) || !in_array($permission, $permissions, true)) {
            return $this->deny('No tiene permisos para esta accion', 403);
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
