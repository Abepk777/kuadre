<?php

namespace App\Domain\Sales\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Sales\Models\Credit;
use App\Domain\Sales\Models\CreditInstallment;
use App\Domain\Sales\Models\Payment;
use App\Domain\Sales\Models\Sale;
use App\Domain\Notifications\Jobs\SendPaymentReminderJob;
use App\Services\EvolutionApiService;
use Illuminate\Support\Facades\DB;

class CreditController extends Controller
{
    public function index(Request $request, $tenantId)
    {
        $tenantId = $request->user()->tenant_id;

        $credits = Credit::whereHas('sale', function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })
        ->with(['installments', 'sale'])
        ->orderBy('due_date', 'asc')
        ->get();

        return response()->json($credits);
    }

    public function payInstallment(Request $request, $tenantId, $creditId, $installmentId)
    {
        $validated = $request->validate([
            'amount_usd' => 'required|numeric',
            'amount_ves' => 'nullable|numeric',
            'method' => 'required|string',
            'exchange_rate_used' => 'nullable|numeric'
        ]);

        $tenantId = $request->user()->tenant_id;
        $credit = Credit::whereHas('sale', function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })->findOrFail($creditId);

        $installment = CreditInstallment::where('credit_id', $credit->id)->findOrFail($installmentId);

        if ($installment->status === 'paid') {
            return response()->json(['message' => 'Installment already paid'], 400);
        }

        DB::beginTransaction();
        try {
            // Update installment
            $installment->update([
                'status' => 'paid',
                'paid_at' => now()
            ]);

            // Register payment
            Payment::create([
                'sale_id' => $credit->sale_id,
                'method' => $validated['method'],
                'amount_usd' => $validated['amount_usd'],
                'amount_ves' => $validated['amount_ves'],
                'exchange_rate_used' => $validated['exchange_rate_used'],
            ]);

            // Update credit
            $credit->remaining_debt_usd = max(0, $credit->remaining_debt_usd - $validated['amount_usd']);
            $credit->save();

            // If credit is fully paid, update sale status
            if ($credit->remaining_debt_usd <= 0) {
                $credit->sale->update(['status' => 'completed']);
            }

            DB::commit();
            return response()->json(['message' => 'Payment registered successfully', 'credit' => $credit->load('installments', 'sale')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error processing payment', 'error' => $e->getMessage()], 500);
        }
    }

    public function payFull(Request $request, $tenantId, $creditId)
    {
        $validated = $request->validate([
            'amount_usd' => 'required|numeric',
            'amount_ves' => 'nullable|numeric',
            'method' => 'required|string',
            'exchange_rate_used' => 'nullable|numeric'
        ]);

        $tenantId = $request->user()->tenant_id;
        $credit = Credit::whereHas('sale', function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })->with('installments')->findOrFail($creditId);

        if ($credit->remaining_debt_usd <= 0) {
            return response()->json(['message' => 'Credit already paid in full'], 400);
        }

        DB::beginTransaction();
        try {
            // Mark all pending installments as paid
            foreach ($credit->installments as $installment) {
                if ($installment->status !== 'paid') {
                    $installment->update([
                        'status' => 'paid',
                        'paid_at' => now()
                    ]);
                }
            }

            // Register payment
            Payment::create([
                'sale_id' => $credit->sale_id,
                'method' => $validated['method'],
                'amount_usd' => $validated['amount_usd'],
                'amount_ves' => $validated['amount_ves'],
                'exchange_rate_used' => $validated['exchange_rate_used'],
            ]);

            // Update credit and sale
            $credit->remaining_debt_usd = 0;
            $credit->save();
            $credit->sale->update(['status' => 'completed']);

            DB::commit();
            return response()->json(['message' => 'Full payment registered successfully', 'credit' => $credit->load('installments', 'sale')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error processing payment', 'error' => $e->getMessage()], 500);
        }
    }

    public function payPartial(Request $request, $tenantId, $creditId)
    {
        $validated = $request->validate([
            'amount_usd' => 'required|numeric|min:0.01',
            'amount_ves' => 'nullable|numeric',
            'method' => 'required|string',
            'exchange_rate_used' => 'nullable|numeric'
        ]);

        $tenantId = $request->user()->tenant_id;
        $credit = Credit::whereHas('sale', function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })->findOrFail($creditId);

        if ($credit->remaining_debt_usd <= 0) {
            return response()->json(['message' => 'Credit already paid in full'], 400);
        }

        if ($validated['amount_usd'] > $credit->remaining_debt_usd) {
            return response()->json(['message' => 'Amount exceeds remaining debt'], 400);
        }

        DB::beginTransaction();
        try {
            Payment::create([
                'sale_id' => $credit->sale_id,
                'method' => $validated['method'],
                'amount_usd' => $validated['amount_usd'],
                'amount_ves' => $validated['amount_ves'],
                'exchange_rate_used' => $validated['exchange_rate_used'],
            ]);

            $credit->remaining_debt_usd = max(0, $credit->remaining_debt_usd - $validated['amount_usd']);
            $credit->save();

            if ($credit->remaining_debt_usd <= 0) {
                $credit->sale->update(['status' => 'completed']);
                $credit->load('installments');
                foreach ($credit->installments as $installment) {
                    if ($installment->status !== 'paid') {
                        $installment->update([
                            'status' => 'paid',
                            'paid_at' => now()
                        ]);
                    }
                }
            }

            DB::commit();
            return response()->json(['message' => 'Partial payment registered', 'credit' => $credit->load('installments', 'sale')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error processing payment', 'error' => $e->getMessage()], 500);
        }
    }

    public function remind(Request $request, $tenantId, $creditId)
    {
        $tenantId = $request->user()->tenant_id;
        $credit = Credit::whereHas('sale', function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })->findOrFail($creditId);

        $tenant = $credit->sale->tenant;
        $config = $tenant->exchange_rate_config ?? [];
        
        // If automated alerts are enabled and instance exists, send via Evolution API
        if (isset($config['whatsapp_alert_mode']) && $config['whatsapp_alert_mode'] === 'automatic' && $tenant->evolution_instance_id) {
            $evolution = new EvolutionApiService();
            $phone = $credit->customer_phone;
            $amount = $credit->remaining_debt_usd;
            
            if ($phone) {
                $message = "¡Hola! 👋 Te escribimos de {$tenant->company_name}. Queríamos recordarte amistosamente que tienes un saldo pendiente de *{$amount}$*. ¡Gracias por tu preferencia! 🏪";
                $success = $evolution->sendText($tenant->evolution_instance_id, "{$phone}@s.whatsapp.net", $message);
                
                if ($success) {
                    return response()->json(['message' => 'Reminder sent automatically via WhatsApp']);
                } else {
                    return response()->json(['message' => 'Failed to send automated reminder', 'fallback' => true], 500);
                }
            }
        }
        
        // Return fallback message for wa.me if manual or if failed
        $amount = $credit->remaining_debt_usd;
        $company = $tenant->company_name;
        $message = "¡Hola! 👋 Te escribimos de {$company}. Queríamos recordarte amistosamente que tienes un saldo pendiente de *{$amount}$*. ¡Gracias por tu preferencia! 🏪";
        
        return response()->json([
            'message' => 'Manual reminder required',
            'fallback_url' => "https://wa.me/" . preg_replace('/[^0-9]/', '', $credit->customer_phone) . "?text=" . urlencode($message)
        ]);
    }
}
