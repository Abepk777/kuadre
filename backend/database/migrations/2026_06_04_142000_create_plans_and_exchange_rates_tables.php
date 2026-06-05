<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('price_usd_binance', 8, 2);
            $table->decimal('price_usd_bcv', 8, 2);
            $table->timestamps();
        });

        // Modificar tenant para asociarle un plan
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete()->after('id');
        });

        Schema::dropIfExists('exchange_rates');
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->string('currency'); // USD, EUR
            $table->string('source'); // oficial, paralelo
            $table->decimal('rate', 15, 4);
            $table->timestamp('api_updated_at')->nullable();
            $table->timestamps();
            
            $table->unique(['currency', 'source']);
        });
    }

    public function down()
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn('plan_id');
        });
        Schema::dropIfExists('exchange_rates');
        Schema::dropIfExists('plans');
    }
};
