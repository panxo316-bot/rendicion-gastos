<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\LoginRequest;
use App\Http\Requests\Api\Auth\SavePerfilRequest;
use App\Http\Requests\Api\Auth\SaveUsuarioRequest;
use App\Models\Perfil;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $usuario = Usuario::where('usuario', $validated['usuario'])
                ->where('activo', 'SI')
                ->with('perfil')
                ->first();

            if (! $usuario || ! Hash::check($validated['password'], $usuario->password_hash)) {
                return response()->json(['ok' => false, 'error' => 'Usuario o contraseña incorrectos'], 401);
            }

            $permisos = $usuario->perfil ? ($usuario->perfil->permisos ?? []) : [];

            $user = [
                'id'           => $usuario->id,
                'usuario'      => $usuario->usuario,
                'nombre'       => $usuario->nombre_completo,
                'perfil_nombre'=> $usuario->perfil ? $usuario->perfil->nombre : 'Sin perfil',
                'perfil_id'    => $usuario->perfil_id,
                'permisos'     => $permisos,
            ];

            $request->session()->regenerate();
            $request->session()->put('auth_user', $user);

            return response()->json(['ok' => true, 'user' => $user]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->forget('auth_user');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true, 'message' => 'Sesion cerrada']);
    }

    public function authData(): JsonResponse
    {
        try {
            $usuarios = Usuario::all()->map(fn ($u) => [
                'id'             => $u->id,
                'usuario'        => $u->usuario,
                'nombre_completo'=> $u->nombre_completo,
                'perfil_id'      => $u->perfil_id,
                'activo'         => $u->activo,
            ]);

            $perfiles = Perfil::all()->map(fn ($p) => [
                'id'      => $p->id,
                'nombre'  => $p->nombre,
                'permisos'=> $p->permisos ?? [],
            ]);

            return response()->json(['ok' => true, 'usuarios' => $usuarios, 'perfiles' => $perfiles]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function saveUsuario(SaveUsuarioRequest $request): JsonResponse
    {
        try {
            $v = $request->validated();

            if (! empty($v['id'])) {
                $usuario = Usuario::findOrFail($v['id']);
                $usuario->usuario        = $v['usuario'];
                $usuario->nombre_completo = $v['nombre_completo'];
                $usuario->perfil_id      = $v['perfil_id'];
                $usuario->activo         = $v['activo'] ?? 'SI';
                if (! empty($v['password'])) {
                    $usuario->password_hash = Hash::make($v['password']);
                }
                $usuario->save();
            } else {
                $newId = (string) Str::uuid();
                Usuario::create([
                    'id'             => $newId,
                    'usuario'        => $v['usuario'],
                    'password_hash'  => Hash::make($v['password'] ?? 'changeme'),
                    'nombre_completo'=> $v['nombre_completo'],
                    'perfil_id'      => $v['perfil_id'],
                    'activo'         => $v['activo'] ?? 'SI',
                ]);
                $v['id'] = $newId;
            }

            return response()->json(['ok' => true, 'id' => $v['id']]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function deleteUsuario(string $id): JsonResponse
    {
        try {
            $deleted = Usuario::destroy($id);
            if (! $deleted) {
                return response()->json(['ok' => false, 'error' => 'Usuario no encontrado'], 404);
            }

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function savePerfil(SavePerfilRequest $request): JsonResponse
    {
        try {
            $v = $request->validated();

            if (! empty($v['id'])) {
                $perfil = Perfil::findOrFail($v['id']);
                $perfil->nombre   = $v['nombre'];
                $perfil->permisos = $v['permisos'] ?? [];
                $perfil->save();
            } else {
                $newId = (string) Str::uuid();
                Perfil::create([
                    'id'      => $newId,
                    'nombre'  => $v['nombre'],
                    'permisos'=> $v['permisos'] ?? [],
                ]);
                $v['id'] = $newId;
            }

            return response()->json(['ok' => true, 'id' => $v['id']]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function deletePerfil(string $id): JsonResponse
    {
        try {
            $deleted = Perfil::destroy($id);
            if (! $deleted) {
                return response()->json(['ok' => false, 'error' => 'Perfil no encontrado'], 404);
            }

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
