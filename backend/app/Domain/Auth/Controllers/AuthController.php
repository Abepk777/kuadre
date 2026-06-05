<?php

namespace App\Domain\Auth\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use App\Models\User;
use App\Domain\Tenants\Models\Tenant;
use App\Mail\WelcomeEmail;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        if ($request->has('login')) {
            $request->merge(['login' => strtolower($request->login)]);
        }

        $request->validate([
            'login' => 'required',
            'password' => 'required',
        ]);

        $loginType = filter_var($request->login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
        $user = User::where($loginType, $request->login)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Credenciales incorrectas.'
            ], 401);
        }

        $user->load(['tenant', 'tenant.plan']);
        $tenant = $user->tenant;

        $subscriptionStatus = 'inactive';
        if ($tenant) {
            $hasTrialLeft = $tenant->trial_ends_at && now()->startOfDay()->lessThanOrEqualTo(\Carbon\Carbon::parse($tenant->trial_ends_at)->endOfDay());
            $hasSubLeft = $tenant->subscription_ends_at && now()->startOfDay()->lessThanOrEqualTo(\Carbon\Carbon::parse($tenant->subscription_ends_at)->endOfDay());
            if ($tenant->subscription_status === 'active' || $hasTrialLeft || $hasSubLeft) {
                $subscriptionStatus = 'active';
            }
        }

        $token = $user->createToken('react_frontend_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'rates' => \App\Services\ExchangeRateService::getRates(),
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'base_currency' => $tenant->base_currency,
                'subscription_status' => $subscriptionStatus,
                'trial_ends_at' => $tenant->trial_ends_at,
                'subscription_ends_at' => $tenant->subscription_ends_at,
                'plan' => $tenant->plan,
                'exchange_rate_config' => $tenant->exchange_rate_config,
                'logo_url' => $tenant->logo_url,
            ] : null
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Sesión cerrada correctamente'
        ]);
    }

    public function deleteAccount(Request $request)
    {
        $user = clone $request->user();
        
        $request->user()->currentAccessToken()->delete();
        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Cuenta eliminada correctamente'
        ]);
    }


    public function register(Request $request)
    {
        if ($request->has('email')) {
            $request->merge(['email' => strtolower($request->email)]);
        }

        $request->validate([
            'company_name' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6', // removed confirmed for now as front end doesn't send it
        ]);

        $tenant = Tenant::create([
            'company_name' => $request->company_name,
            'base_currency' => 'USD',
            'exchange_rate_config' => ['sales_rate' => 'bcv', 'purchases_rate' => 'paralelo'],
            'trial_ends_at' => now()->addDays(7),
            'subscription_status' => 'trialing'
        ]);

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'tenant_id' => $tenant->id,
            'role' => 'tenant',
        ]);

        try {
            // 🛡️ OCTANE WORKER FIX: Usamos queue() para no bloquear la petición de registro
            Mail::to($user->email)->queue(new WelcomeEmail($user));
        } catch (\Exception $e) {
            Log::error("Error enviando correo de bienvenida: " . $e->getMessage());
        }

        $token = $user->createToken('react_frontend_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'tenant' => [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'base_currency' => $tenant->base_currency,
                'subscription_status' => 'active',
                'trial_ends_at' => $tenant->trial_ends_at,
                'subscription_ends_at' => $tenant->subscription_ends_at,
                'plan' => $tenant->plan,
                'exchange_rate_config' => $tenant->exchange_rate_config,
                'logo_url' => $tenant->logo_url,
            ]
        ], 201);
    }

    public function forgotPassword(Request $request)
    {
        if ($request->has('email')) {
            $request->merge(['email' => strtolower($request->email)]);
        }

        $request->validate(['email' => 'required|email']);

        $status = Password::broker()->sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['status' => 'success', 'message' => 'Correo de recuperación enviado.']);
        }

        return response()->json(['status' => 'error', 'message' => 'No encontramos un usuario con ese correo.'], 404);
    }

    public function resetPassword(Request $request)
    {
        if ($request->has('email')) {
            $request->merge(['email' => strtolower($request->email)]);
        }

        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));
                $user->save();
                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['status' => 'success', 'message' => 'Contraseña restablecida exitosamente.']);
        }

        return response()->json(['status' => 'error', 'message' => 'El token es inválido o ha expirado.'], 400);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['tenant', 'tenant.plan']);
        $tenant = $user->tenant;

        $subscriptionStatus = 'inactive';
        if ($tenant) {
            $hasTrialLeft = $tenant->trial_ends_at && now()->startOfDay()->lessThanOrEqualTo(\Carbon\Carbon::parse($tenant->trial_ends_at)->endOfDay());
            $hasSubLeft = $tenant->subscription_ends_at && now()->startOfDay()->lessThanOrEqualTo(\Carbon\Carbon::parse($tenant->subscription_ends_at)->endOfDay());
            
            if ($tenant->subscription_status === 'active' || $hasTrialLeft || $hasSubLeft) {
                $subscriptionStatus = 'active';
            }
        }

        return response()->json([
            'status' => 'success',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'rates' => \App\Services\ExchangeRateService::getRates(),
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'company_name' => $tenant->company_name,
                'base_currency' => $tenant->base_currency,
                'subscription_status' => $subscriptionStatus,
                'trial_ends_at' => $tenant->trial_ends_at,
                'subscription_ends_at' => $tenant->subscription_ends_at,
                'plan' => $tenant->plan,
                'exchange_rate_config' => $tenant->exchange_rate_config,
                'logo_url' => $tenant->logo_url,
            ] : null
        ]);
    }
}
