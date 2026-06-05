<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('unit_type')->default('unit'); // unit, kg, gr, lt
        });

        // Change stock to decimal in products and quantity in inventory_transactions
        // Since we are using PostgreSQL in docker or SQLite locally, we might need doctrine/dbal for changing columns in older Laravel, but Laravel 11 handles it natively.
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('stock', 10, 3)->change();
        });

        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->decimal('quantity', 10, 3)->change();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->string('logo_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('unit_type');
            // Reverting decimal to integer might lose precision, but for down() it's standard
            $table->integer('stock')->change();
        });

        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->integer('quantity')->change();
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('logo_url');
        });
    }
};
