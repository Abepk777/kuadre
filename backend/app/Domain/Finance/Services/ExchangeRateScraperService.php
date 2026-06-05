<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\ExchangeRate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ExchangeRateScraperService
{
    public function scrapeBcv()
    {
        try {
            // Un scraper simple usando BCV API (mock) o página
            // Como esto es un backend PHP/Laravel, a menudo usamos Goutte o APIs públicas.
            // Para el propósito de Kuadre, usaremos una API pública temporal o asumiendo el fetch directo.
            
            $response = Http::timeout(10)->get('https://ve.dolarapi.com/v1/dolares/oficial');
            
            if ($response->successful()) {
                $rate = $response->json('promedio');
                
                if ($rate) {
                    ExchangeRate::create([
                        'source' => 'bcv',
                        'rate' => $rate,
                        'date' => Carbon::today()
                    ]);
                    return $rate;
                }
            }
            return null;
        } catch (\Exception $e) {
            Log::error('Fallo al obtener tasa BCV: ' . $e->getMessage());
            return null;
        }
    }
}
