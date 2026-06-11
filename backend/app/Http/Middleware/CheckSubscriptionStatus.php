<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        // Superadmin o staff sin tenant saltan la validación
        if (!$user || $user->role === 'superadmin' || !$user->tenant) {
            return $next($request);
        }

        $tenant = $user->tenant;
        $now = now();
        
        $trialEnds = $tenant->trial_ends_at ? \Carbon\Carbon::parse($tenant->trial_ends_at) : null;
        $subEnds = $tenant->subscription_ends_at ? \Carbon\Carbon::parse($tenant->subscription_ends_at) : null;
        
        $isActive = false;
        
        if ($trialEnds && $trialEnds->isFuture()) {
            $isActive = true;
        } elseif ($subEnds && $subEnds->isFuture()) {
            $isActive = true;
        }

        if (!$isActive) {
            return response()->json([
                'message' => 'Subscription expired. Please renew to continue.',
                'requires_payment' => true
            ], 402);
        }

        return $next($request);
    }
}
