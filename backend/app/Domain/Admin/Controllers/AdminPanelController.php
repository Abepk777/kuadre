<?php

namespace App\Domain\Admin\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Subscriptions\Models\SubscriptionPayment;
use App\Domain\Tenants\Models\Tenant;
use App\Models\User;
use App\Notifications\MassivePushNotification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

class AdminPanelController extends Controller
{
    public function pendingPayments()
    {
        return response()->json(SubscriptionPayment::with('tenant')->where('status', 'pending')->get());
    }

    public function tenants()
    {
        $tenants = Tenant::with(['users' => function($query) {
            $query->where('role', 'tenant');
        }])->get();

        return response()->json($tenants);
    }

    public function approvePayment(Request $request, SubscriptionPayment $payment)
    {
        $payment->update(['status' => 'approved']);

        $tenant = $payment->tenant;
        
        $currentEndsAt = $tenant->subscription_ends_at && $tenant->subscription_ends_at->isFuture() 
            ? $tenant->subscription_ends_at 
            : now();
            
        $tenant->update([
            'subscription_ends_at' => $currentEndsAt->addDays($payment->days_requested),
            'subscription_status' => 'active'
        ]);

        return response()->json(['message' => 'Pago aprobado y días sumados.']);
    }

    public function addDays(Request $request, Tenant $tenant)
    {
        $request->validate(['days' => 'required|integer']);

        $currentEndsAt = $tenant->subscription_ends_at && $tenant->subscription_ends_at->isFuture() 
            ? $tenant->subscription_ends_at 
            : now();
            
        $tenant->update([
            'subscription_ends_at' => $currentEndsAt->addDays($request->days),
            'subscription_status' => 'active'
        ]);

        return response()->json(['message' => 'Días de suscripción añadidos manualmente.']);
    }

    public function sendMassiveNotification(Request $request)
    {
        $request->validate([
            'subject' => 'required|string',
            'message' => 'required|string',
        ]);

        // Obtenemos los dueños de negocios
        $users = User::where('role', 'tenant')->get();
        Notification::send($users, new MassivePushNotification($request->subject, $request->message));
        
        return response()->json(['message' => 'Notificación masiva enviada a todos los negocios.']);
    }
}
