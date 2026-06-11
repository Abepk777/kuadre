<?php

namespace App\Domain\Tenants\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Tenants\Models\Tenant;
use App\Services\EvolutionApiService;
use Illuminate\Support\Facades\Storage;

class TenantController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string',
            'evolution_instance_id' => 'nullable|string'
        ]);

        $tenant = Tenant::create($validated);
        return response()->json($tenant, 201);
    }

    public function updateEvolutionInstance(Request $request, Tenant $tenant)
    {
        $tenant->update(['evolution_instance_id' => $request->evolution_instance_id]);
        return response()->json($tenant);
    }

    public function updateExchangeRate(Request $request, Tenant $tenant)
    {
        $tenant->update(['exchange_rate_config' => $request->all()]);
        return response()->json($tenant);
    }

    public function updateGeneral(Request $request, Tenant $tenant)
    {
        \Log::info('updateGeneral payload:', $request->all());
        \Log::info('Has logo file?: ' . ($request->hasFile('logo') ? 'YES' : 'NO'));
        
        $validated = $request->validate([
            'company_name' => 'sometimes|string',
            'document_id' => 'nullable|string',
            'base_currency' => 'sometimes|string|in:USD,VES',
            'logo' => 'nullable|image|max:2048'
        ]);

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $filename = 'tenants/' . $tenant->id . '/' . uniqid() . '.webp';
            Storage::disk('s3')->put($filename, file_get_contents($file), 'public');
            $validated['logo_url'] = Storage::disk('s3')->url($filename);
        }

        $tenant->update($validated);
        return response()->json($tenant);
    }

    public function updateWhatsappConfig(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'whatsapp_alert_mode' => 'required|string|in:manual,automatic'
        ]);

        $config = $tenant->exchange_rate_config ?? [];
        $config['whatsapp_alert_mode'] = $validated['whatsapp_alert_mode'];
        $tenant->update(['exchange_rate_config' => $config]);

        return response()->json($tenant);
    }

    public function getWhatsappQr(Request $request, Tenant $tenant)
    {
        $evolution = new EvolutionApiService();
        $instanceName = 'kuadre_tenant_' . $tenant->id;

        // Ensure instance exists
        try {
            $evolution->createBaileysInstance($instanceName);
        } catch (\Exception $e) {
            // It might already exist, which is fine
        }

        // Save instance ID to tenant if not present
        if ($tenant->evolution_instance_id !== $instanceName) {
            $tenant->update(['evolution_instance_id' => $instanceName]);
        }

        try {
            $response = $evolution->getQrCode($instanceName);
            if ($response->successful()) {
                return response()->json($response->json());
            } else {
                return response()->json(['error' => 'Failed to get QR code from Evolution API', 'details' => $response->body()], 500);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Exception while fetching QR', 'message' => $e->getMessage()], 500);
        }
    }
}
