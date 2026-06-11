<?php

namespace App\Domain\Dashboard\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Tenants\Models\Tenant;
use Illuminate\Support\Facades\DB;

class DashboardStatsController extends Controller
{
    public function index(Request $request)
    {
        $tenant = $request->user()->tenant;

        if (!$tenant) {
            return response()->json(['error' => 'No tenant associated with user'], 400);
        }

        // Calcular Ventas Hoy (de la tabla cash_registers o ventas de hoy)
        $salesToday = $tenant->sales()
            ->whereDate('created_at', today())
            ->sum('total_usd');

        // Calcular Ganancia Hoy
        $profitsToday = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.tenant_id', $tenant->id)
            ->whereDate('sales.created_at', today())
            ->sum(DB::raw('(sale_items.unit_price_usd - COALESCE(sale_items.unit_cost_usd, 0)) * sale_items.quantity'));

        // Calcular Créditos en la calle
        $receivables = $tenant->sales()
            ->where('status', 'pending_credit')
            ->join('credits', 'sales.id', '=', 'credits.sale_id')
            ->sum('credits.remaining_debt_usd');

        $creditSalesCount = $tenant->sales()
            ->where('status', 'pending_credit')
            ->count();

        // Calcular Ganancias Netas de los últimos 7 días (usando sale_items)
        // Ganancia = Suma de ((Precio Venta - Precio Costo) * Cantidad)
        $profits = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.tenant_id', $tenant->id)
            ->where('sales.created_at', '>=', now()->subDays(7))
            ->select(
                DB::raw('DATE(sales.created_at) as date'),
                DB::raw('SUM((sale_items.unit_price_usd - COALESCE(sale_items.unit_cost_usd, 0)) * sale_items.quantity) as net_profit')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

        return response()->json([
            'sales_today' => (float) $salesToday,
            'profits_today' => (float) $profitsToday,
            'credit_sales' => $creditSalesCount,
            'receivables' => (float) $receivables,
            'profits_chart' => $profits // Array de {date: '2026-06-01', net_profit: 25.50}
        ]);
    }
}
