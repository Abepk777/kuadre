<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExchangeRateService
{
    public function syncRates()
    {
        try {
            // Fetch USD rates
            $usdResponse = Http::get('https://ve.dolarapi.com/v1/dolares');
            if ($usdResponse->successful()) {
                $usdData = $usdResponse->json();
                foreach ($usdData as $rate) {
                    if (in_array($rate['fuente'], ['oficial', 'paralelo'])) {
                        DB::table('exchange_rates')->updateOrInsert(
                            ['currency' => 'USD', 'source' => $rate['fuente']],
                            [
                                'rate' => $rate['promedio'],
                                'api_updated_at' => Carbon::parse($rate['fechaActualizacion'])->setTimezone('UTC'),
                                'updated_at' => now(),
                            ]
                        );
                    }
                }
            }

            // Fetch EUR rates
            $eurResponse = Http::get('https://ve.dolarapi.com/v1/euros');
            if ($eurResponse->successful()) {
                $eurData = $eurResponse->json();
                foreach ($eurData as $rate) {
                    if ($rate['fuente'] === 'oficial') {
                        DB::table('exchange_rates')->updateOrInsert(
                            ['currency' => 'EUR', 'source' => 'oficial'],
                            [
                                'rate' => $rate['promedio'],
                                'api_updated_at' => Carbon::parse($rate['fechaActualizacion'])->setTimezone('UTC'),
                                'updated_at' => now(),
                            ]
                        );
                    }
                }
            }

            return true;
        } catch (\Exception $e) {
            \Log::error('Error syncing exchange rates: ' . $e->getMessage());
            return false;
        }
    }

    public static function getRates()
    {
        $rates = DB::table('exchange_rates')->get();
        return [
            'usd_bcv' => $rates->where('currency', 'USD')->where('source', 'oficial')->first()->rate ?? 1,
            'usd_paralelo' => $rates->where('currency', 'USD')->where('source', 'paralelo')->first()->rate ?? 1,
            'eur_bcv' => $rates->where('currency', 'EUR')->where('source', 'oficial')->first()->rate ?? 1,
        ];
    }
}
