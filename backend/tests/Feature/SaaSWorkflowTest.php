<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SaaSWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_get_7_days_trial()
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'company_name' => 'Mi Bodega C.A.',
            'name' => 'Juan Perez',
            'username' => 'juanperez',
            'email' => 'juan@example.com',
            'password' => 'password123'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'user' => ['id', 'username', 'role', 'tenant_id'],
            'tenant' => ['id', 'trial_ends_at', 'subscription_status']
        ]);

        $this->assertEquals('trialing', $response->json('tenant.subscription_status'));
    }

    public function test_user_can_login_and_access_protected_routes()
    {
        Mail::fake();
        
        // 1. Register first
        $register = $this->postJson('/api/v1/auth/register', [
            'company_name' => 'Mi Bodega 2',
            'name' => 'Ana Gomez',
            'username' => 'anagomez',
            'email' => 'ana@example.com',
            'password' => 'secret123'
        ]);
        
        $tenantId = $register->json('tenant.id');

        // 2. Login
        $login = $this->postJson('/api/v1/auth/login', [
            'login' => 'anagomez',
            'password' => 'secret123'
        ]);

        $login->assertStatus(200);
        $token = $login->json('token');
        $this->assertNotNull($token);

        // 3. Create a product (Protected Route)
        $productResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson("/api/v1/{$tenantId}/inventory/products", [
            'name' => 'Harina PAN',
            'price_usd' => 1.20,
            'stock' => 50
        ]);

        $productResponse->assertStatus(201);
        $this->assertEquals('Harina PAN', $productResponse->json('name'));
    }
}
