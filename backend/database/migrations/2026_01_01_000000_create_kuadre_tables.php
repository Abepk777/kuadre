<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Tenants (SaaS Configuration)
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('evolution_instance_id')->nullable();
            $table->boolean('is_ai_active')->default(true);
            $table->json('exchange_rate_config')->nullable(); // Ej: {"source": "bcv", "custom_rate": null}
            $table->string('subscription_status')->default('active');
            $table->timestamps();
        });

        // 2. Exchange Rates (Finance)
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->string('source'); // bcv, binance, custom
            $table->decimal('rate', 10, 4);
            $table->date('date');
            $table->timestamps();
        });

        // 3. Cash Registers (Finance / Cierre Diario)
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('total_sales_usd', 10, 2)->default(0);
            $table->decimal('total_pos', 10, 2)->default(0);
            $table->decimal('total_usd_cash', 10, 2)->default(0);
            $table->decimal('total_ves_cash', 10, 2)->default(0);
            $table->decimal('total_pago_movil', 10, 2)->default(0);
            $table->decimal('credit_in_street', 10, 2)->default(0);
            $table->decimal('credit_payments_received', 10, 2)->default(0);
            $table->timestamps();
        });

        // 4. Products (Inventory)
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('avg_cost_usd', 10, 2)->default(0);
            $table->decimal('price_usd', 10, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->timestamps();
        });

        // 5. Inventory Transactions (Control estricto de Stock)
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity'); // Positivo o negativo
            $table->string('type'); // sale, purchase, adjustment
            $table->timestamps();
        });

        // 6. Sales (Ventas y Créditos)
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_usd', 10, 2)->default(0);
            $table->string('status')->default('completed'); // completed, pending_credit
            $table->timestamps();
        });

        // 7. Payments (Pagos Mixtos de Ventas)
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->string('method'); // pos, usd_cash, ves_cash, pago_movil
            $table->decimal('amount_usd', 10, 2);
            $table->decimal('amount_ves', 10, 2)->nullable();
            $table->decimal('exchange_rate_used', 10, 4)->nullable();
            $table->timestamps();
        });

        // 8. Credits (Cuentas por cobrar en USD)
        Schema::create('credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_debt_usd', 10, 2);
            $table->decimal('remaining_debt_usd', 10, 2);
            $table->date('due_date')->nullable();
            $table->string('customer_phone')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('credits');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('products');
        Schema::dropIfExists('cash_registers');
        Schema::dropIfExists('exchange_rates');
        Schema::dropIfExists('tenants');
    }
};
