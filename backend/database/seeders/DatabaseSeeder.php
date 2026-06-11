<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Domain\Tenants\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use App\Services\ExchangeRateService;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // 1. Sync actual exchange rates via API first
        (new ExchangeRateService())->syncRates();

        // 2. Create Plan
        $planId = DB::table('plans')->insertGetId([
            'name' => 'Plan Negocios',
            'price_usd_binance' => 2.00,
            'price_usd_bcv' => 3.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Create Tenant
        $tenant = Tenant::create([
            'company_name' => 'Bodega Kuadre (Prueba)',
            'plan_id' => $planId,
            'subscription_status' => 'active',
            'subscription_ends_at' => now()->addDays(30),
            'base_currency' => 'USD',
            'exchange_rate_config' => [
                'sales_rate' => 'bcv',
                'purchases_rate' => 'paralelo',
                'show_usd_catalog' => true,
                'show_usd_pos' => true
            ]
        ]);

        // 4. Create Users (Super Admin, Dueño, Cajero)
        User::create([
            'name' => 'Super Admin (KrecIT)',
            'username' => 'abepk777',
            'email' => 'admin@krecit.com',
            'password' => Hash::make('Abep2117.'),
            'role' => 'admin',
            'tenant_id' => null,
        ]);

        User::create([
            'name' => 'Dueño de Bodega',
            'username' => 'bodega',
            'email' => 'dueno@bodega.com',
            'password' => Hash::make('password'),
            'role' => 'tenant',
            'tenant_id' => $tenant->id,
        ]);

        User::create([
            'name' => 'Cajero Principal',
            'username' => 'cajero',
            'email' => 'cajero@bodega.com',
            'password' => Hash::make('password'),
            'role' => 'cashier',
            'tenant_id' => $tenant->id,
        ]);

        // 5. Create Products
        $products = [
            ['name' => 'Harina Pan', 'cost' => 0.85, 'price' => 1.10],
            ['name' => 'Arroz Mary 1kg', 'cost' => 0.90, 'price' => 1.20],
            ['name' => 'Pasta Sindoni 500g', 'cost' => 0.70, 'price' => 1.00],
            ['name' => 'Refresco Coca-Cola 2L', 'cost' => 1.80, 'price' => 2.50],
            ['name' => 'Mantequilla Mavesa 500g', 'cost' => 2.10, 'price' => 2.80],
            ['name' => 'Queso Blanco 1Kg', 'cost' => 4.00, 'price' => 5.50],
            ['name' => 'Huevos (Cartón)', 'cost' => 3.50, 'price' => 4.50],
            ['name' => 'Café Amanecer 250g', 'cost' => 2.00, 'price' => 2.60],
            ['name' => 'Azúcar Montalban 1Kg', 'cost' => 1.20, 'price' => 1.60],
            ['name' => 'Aceite Vatel 1L', 'cost' => 2.20, 'price' => 3.00],
        ];

        $productModels = [];
        foreach ($products as $p) {
            $productModels[] = $tenant->products()->create([
                'name' => $p['name'],
                'avg_cost_usd' => $p['cost'],
                'price_usd' => $p['price'],
                'stock' => rand(20, 100)
            ]);
        }

        // 6. Simulate Sales for the last 7 days to populate Dashboard
        for ($i = 6; $i >= 0; $i--) {
            $numSales = rand(3, 8); // 3 to 8 sales per day
            $date = now()->subDays($i)->setHour(rand(9, 18));
            
            for ($j = 0; $j < $numSales; $j++) {
                // Pick 1 to 3 random products
                $items = collect($productModels)->random(rand(1, 3));
                $totalUsd = 0;
                $saleItemsData = [];
                
                foreach ($items as $item) {
                    $qty = rand(1, 3);
                    $totalUsd += $item->price_usd * $qty;
                    
                    $saleItemsData[] = [
                        'product_id' => $item->id,
                        'quantity' => $qty,
                        'unit_cost_usd' => $item->avg_cost_usd,
                        'unit_price_usd' => $item->price_usd,
                        'created_at' => clone $date,
                        'updated_at' => clone $date,
                    ];
                }

                $status = (rand(1, 10) > 8) ? 'pending_credit' : 'completed';

                $sale = $tenant->sales()->create([
                    'total_usd' => $totalUsd,
                    'status' => $status,
                    'created_at' => clone $date,
                    'updated_at' => clone $date,
                ]);

                // Insert items
                foreach ($saleItemsData as &$si) {
                    $si['sale_id'] = $sale->id;
                }
                DB::table('sale_items')->insert($saleItemsData);

                // Create credit record if needed
                if ($status === 'pending_credit') {
                    DB::table('credits')->insert([
                        'sale_id' => $sale->id,
                        'customer_phone' => '04141234567',
                        'total_debt_usd' => $totalUsd,
                        'remaining_debt_usd' => $totalUsd,
                        'due_date' => now()->addDays(15),
                        'created_at' => clone $date,
                        'updated_at' => clone $date,
                    ]);
                }
            }
        }
    }
}
