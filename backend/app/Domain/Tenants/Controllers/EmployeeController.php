<?php

namespace App\Domain\Tenants\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request, $tenantId)
    {
        $tenantId = $request->user()->tenant_id;
        $employees = User::where('tenant_id', $tenantId)->where('role', 'employee')->get();
        return response()->json($employees);
    }

    public function store(Request $request, $tenantId)
    {
        $tenantId = $request->user()->tenant_id;

        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $employee = User::create([
            'name' => $request->name,
            'username' => strtolower($request->username),
            'email' => strtolower($request->username) . '@' . $tenantId . '.kuadre.local', // Dummy email para empleados
            'password' => Hash::make($request->password),
            'tenant_id' => $tenantId,
            'role' => 'employee',
        ]);

        return response()->json([
            'status' => 'success',
            'employee' => $employee,
            'message' => 'Empleado creado exitosamente'
        ], 201);
    }

    public function destroy(Request $request, $tenantId, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $employee = User::where('tenant_id', $tenantId)->where('role', 'employee')->findOrFail($id);
        
        $employee->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Empleado eliminado'
        ]);
    }
}
