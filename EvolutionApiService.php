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
        // 🛡️ OCTANE FIX: Leemos desde config/services.php
        $this->baseUrl = config('services.evolution.url');
        $this->apiKey = config('services.evolution.api_key');
    }

    private function client()
    {
        return Http::withHeaders(['apikey' => $this->apiKey]);
    }

    // --- MODO QR (BAILEYS) ---
    public function createBaileysInstance($instanceName)
    {


        try {
            $response = $this->client()->post("{$this->baseUrl}/instance/create", [
                'instanceName' => $instanceName,
                'qrcode' => true,
                'integration' => 'WHATSAPP-BAILEYS'
            ]);

            if ($response->successful()) {

            } else {
                Log::error("❌ [EVOLUTION] Error al crear instancia {$instanceName}. Status: " . $response->status(), [
                    'respuesta' => $response->body()
                ]);
            }

            return $response;

        } catch (\Exception $e) {
            Log::error("🔥 [EVOLUTION] Excepción crítica al intentar crear instancia {$instanceName}: " . $e->getMessage());
            throw $e; // Opcional: relanzar el error si quieres que el controlador lo maneje
        }
    }

    public function getQrCode($instanceName)
    {


        try {
            $response = $this->client()->get("{$this->baseUrl}/instance/connect/{$instanceName}");

            if ($response->successful()) {

            } else {
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

    /**
     * Evolution v2: connectionState no incluye owner/jid. fetchInstances sí (campo owner).
     */
    public function resolveInstanceOwnerJid(string $instanceName): ?string
    {
        if ($this->baseUrl === null || $this->baseUrl === '' || $instanceName === '') {
            return null;
        }

        try {
            $response = $this->client()
                ->timeout(5)
                ->get("{$this->baseUrl}/instance/fetchInstances", [
                    'instanceName' => $instanceName,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $raw = $response->json();
            $payload = $this->normalizeFetchInstancesBody($raw);
            $owner = $this->findOwnerJidForInstance($payload, $instanceName);
            if ($owner) {
                return $owner;
            }

            $owner = $this->findAnyOwnerJid($payload);
            if ($owner) {
                return $owner;
            }

            // Segundo intento: listado completo (algunos servidores v2 ignoran query instanceName).
            $all = $this->client()->timeout(8)->get("{$this->baseUrl}/instance/fetchInstances");
            if ($all->successful()) {
                $body = $this->normalizeFetchInstancesBody($all->json());

                return $this->findOwnerJidForInstance($body, $instanceName)
                    ?? $this->findAnyOwnerJid($body);
            }

            return null;
        } catch (\Exception $e) {
            Log::warning('[EVOLUTION] resolveInstanceOwnerJid: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Desenvuelve respuestas tipo { response: [...], data: {...} } que devuelve Evolution v2 según configuración.
     */
    private function normalizeFetchInstancesBody(mixed $payload): mixed
    {
        if (! is_array($payload)) {
            return $payload;
        }

        foreach (['instances', 'data', 'response', 'records'] as $key) {
            if (isset($payload[$key])) {
                return $payload[$key];
            }
        }

        return $payload;
    }

    private function findOwnerJidForInstance(mixed $node, string $instanceName): ?string
    {
        if (! is_array($node)) {
            return null;
        }

        $name = $node['instanceName'] ?? $node['name'] ?? null;
        $owner = $node['owner'] ?? $node['jid'] ?? $node['wuid'] ?? null;
        if ($name === $instanceName && is_string($owner) && str_contains($owner, '@')) {
            return $owner;
        }

        foreach ($node as $child) {
            $found = $this->findOwnerJidForInstance($child, $instanceName);
            if ($found) {
                return $found;
            }
        }

        return null;
    }

    private function findAnyOwnerJid(mixed $node): ?string
    {
        if (! is_array($node)) {
            return null;
        }

        $owner = $node['owner'] ?? $node['jid'] ?? $node['wuid'] ?? null;
        if (is_string($owner) && str_contains($owner, '@')) {
            return $owner;
        }

        foreach ($node as $child) {
            $found = $this->findAnyOwnerJid($child);
            if ($found) {
                return $found;
            }
        }

        return null;
    }

    /**
     * Foto de perfil del otro lado del chat (Evolution puede variar cuerpo/keys según motor).
     */
    public function fetchProfilePictureUrl(string $instanceName, string $remoteJidOrDigits): ?string
    {
        if ($this->baseUrl === null || $this->baseUrl === '' || $instanceName === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $remoteJidOrDigits);
        $jid = str_contains((string) $remoteJidOrDigits, '@')
            ? $remoteJidOrDigits
            : ($digits !== '' ? $digits.'@s.whatsapp.net' : null);

        $candidates = array_values(array_unique(array_filter([$jid, $digits !== '' ? $digits.'@s.whatsapp.net' : null, $digits])));

        foreach ($candidates as $number) {
            try {
                $res = $this->client()->timeout(6)->post(
                    "{$this->baseUrl}/chat/fetchProfilePictureUrl/{$instanceName}",
                    ['number' => $number],
                );

                if (! $res->successful()) {
                    continue;
                }

                $j = $res->json();

                foreach (['profilePictureUrl', 'profile_picture_url', 'picture', 'pictureUrl'] as $k) {
                    $v = data_get($j, $k);
                    if (is_string($v) && str_starts_with($v, 'http')) {
                        return $v;
                    }
                }

                foreach (['wuid', 'data', 'result'] as $wr) {
                    $nested = data_get($j, "{$wr}.profilePictureUrl")
                        ?? data_get($j, "{$wr}.picture")
                        ?? data_get($j, "{$wr}.profile_pic");
                    if (is_string($nested) && str_starts_with($nested, 'http')) {
                        return $nested;
                    }
                }
            } catch (\Exception $e) {
                Log::debug('[EVOLUTION] fetchProfilePictureUrl: '.$e->getMessage());
            }
        }

        return null;
    }

    /** @param  array|string|null  $j */
    public static function evolutionJsonProfileName(mixed $j): ?string
    {
        if (! is_array($j)) {
            return null;
        }

        foreach (['name', 'verifiedName', 'pushName'] as $k) {
            $v = $j[$k] ?? null;
            if (is_string($v) && trim($v) !== '') {
                return trim($v);
            }
        }

        $flat = json_encode($j);
        if (is_string($flat) && preg_match('/"(?:verifiedName|name|notify)"\s*:\s*"([^"]{2,})"/', $flat, $m)) {
            return $m[1];
        }

        return null;
    }
}