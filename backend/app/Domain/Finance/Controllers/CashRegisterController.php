<?php

namespace App\Domain\Finance\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Tenants\Models\Tenant;
use App\Domain\Finance\Services\DailyCashCloseService;
use App\Domain\Finance\Models\CashRegister;

class CashRegisterController extends Controller
{
    public function closeDay(Request $request, Tenant $tenant, DailyCashCloseService $service)
    {
        // Forzamos el cierre o generamos un cierre del día actual
        $date = $request->input('date'); // opcional
        $cashRegister = $service->calculateForTenant($tenant, $date);

        return response()->json($cashRegister);
    }

    public function history(Tenant $tenant)
    {
        $history = CashRegister::where('tenant_id', $tenant->id)
            ->orderBy('date', 'desc')
            ->get();
            
        return response()->json($history);
    }
}
