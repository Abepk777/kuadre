<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EvolutionApiService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.evolution.url');
        $this->apiKey = config('services.evolution.api_key');
    }

    private function client()
    {
        return Http::withHeaders(['apikey' => $this->apiKey]);
    }

    // --- INSTANCIAS (BAILEYS) ---
    public function createBaileysInstance($instanceName)
    {
        try {
            $response = $this->client()->post("{$this->baseUrl}/instance/create", [
                'instanceName' => $instanceName,
                'qrcode' => true,
                'integration' => 'WHATSAPP-BAILEYS'
            ]);

            if (!$response->successful()) {
                Log::error("❌ [EVOLUTION] Error al crear instancia {$instanceName}. Status: " . $response->status(), [
                    'respuesta' => $response->body()
                ]);
            }

            return $response;
        } catch (\Exception $e) {
            Log::error("🔥 [EVOLUTION] Excepción crítica al intentar crear instancia {$instanceName}: " . $e->getMessage());
            throw $e;
        }
    }

    public function getQrCode($instanceName)
    {
        try {
            $response = $this->client()->get("{$this->baseUrl}/instance/connect/{$instanceName}");

            if (!$response->successful()) {
                Log::error("❌ [EVOLUTION] Fallo al obtener QR para {$instanceName}. Status: " . $response->status(), [
                    'respuesta' => $response->body()
                ]);
            }

            return $response;
        } catch (\Exception $e) {
            Log::error("🔥 [EVOLUTION] Excepción al pedir QR de {$instanceName}: " . $e->getMessage());
            throw $e;
        }
    }

    // --- MENSAJERIA ---
    public function sendText(string $instanceName, string $remoteJid, string $text)
    {
        try {
            $response = $this->client()->timeout(15)->post("{$this->baseUrl}/message/sendText/{$instanceName}", [
                'number' => $remoteJid,
                'text' => $text
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error("🔥 [EVOLUTION] Error enviando texto a {$remoteJid}: " . $e->getMessage());
            return false;
        }
    }

    public function sendMedia(string $instanceName, string $remoteJid, string $mime, string $base64, string $fileName = 'archivo')
    {
        try {
            $response = $this->client()->timeout(15)->post("{$this->baseUrl}/message/sendMedia/{$instanceName}", [
                'number' => $remoteJid,
                'mediatype' => 'document',
                'mimetype' => $mime,
                'media' => $base64,
                'fileName' => $fileName
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error("🔥 [EVOLUTION] Error enviando multimedia a {$remoteJid}: " . $e->getMessage());
            return false;
        }
    }
}
