<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->nullable()->after('name');
            $table->string('role')->default('tenant')->after('password'); // admin, tenant
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete()->after('role');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('trial_ends_at')->nullable()->after('subscription_status');
            $table->timestamp('subscription_ends_at')->nullable()->after('trial_ends_at');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['username', 'role', 'tenant_id']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['trial_ends_at', 'subscription_ends_at']);
        });
    }
};
