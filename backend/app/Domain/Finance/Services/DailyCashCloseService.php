<?php

namespace App\Domain\Finance\Services;

use App\Domain\Tenants\Models\Tenant;
use App\Domain\Finance\Models\CashRegister;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DailyCashCloseService
{
    public function calculateForTenant(Tenant $tenant, $date = null)
    {
        $targetDate = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        // Obtener ventas del día
        $sales = $tenant->sales()->whereDate('created_at', $targetDate)->get();

        $totalSalesUsd = $sales->sum('total_usd');

        // Obtener pagos
        $payments = DB::table('payments')
            ->join('sales', 'payments.sale_id', '=', 'sales.id')
            ->where('sales.tenant_id', $tenant->id)
            ->whereDate('payments.created_at', $targetDate)
            ->select('payments.method', 'payments.amount_usd')
            ->get();

        $totalPos = $payments->where('method', 'pos')->sum('amount_usd');
        $totalUsdCash = $payments->where('method', 'usd_cash')->sum('amount_usd');
        $totalVesCash = $payments->where('method', 'ves_cash')->sum('amount_usd');
        $totalPagoMovil = $payments->where('method', 'pago_movil')->sum('amount_usd');

        // Obtener creditos
        $creditsInStreet = DB::table('credits')
            ->join('sales', 'credits.sale_id', '=', 'sales.id')
            ->where('sales.tenant_id', $tenant->id)
            ->whereDate('credits.created_at', $targetDate)
            ->sum('credits.total_debt_usd');

        // Actualizar o crear registro
        return CashRegister::updateOrCreate(
            ['tenant_id' => $tenant->id, 'date' => $targetDate],
            [
                'total_sales_usd' => $totalSalesUsd,
                'total_pos' => $totalPos,
                'total_usd_cash' => $totalUsdCash,
                'total_ves_cash' => $totalVesCash,
                'total_pago_movil' => $totalPagoMovil,
                'credit_in_street' => $creditsInStreet,
                // credit_payments_received se podría calcular viendo pagos a créditos anteriores
                'credit_payments_received' => 0 
            ]
        );
    }
}
