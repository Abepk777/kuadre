<?php

namespace App\Domain\Sales\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Sales\Models\Customer;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $customers = Customer::where('tenant_id', $tenantId)->get();
        return response()->json($customers);
    }
}
