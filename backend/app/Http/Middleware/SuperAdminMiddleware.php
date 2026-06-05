<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado. Se requieren permisos de Super Administrador.'
            ], 403);
        }

        return $next($request);
    }
}
