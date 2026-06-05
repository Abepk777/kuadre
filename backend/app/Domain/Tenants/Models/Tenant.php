<?php

namespace App\Domain\Tenants\Models;

use Illuminate\Database\Eloquent\Model;
use App\Domain\Inventory\Models\Product;
use App\Domain\Sales\Models\Sale;
use App\Domain\Subscriptions\Models\SubscriptionPayment;

class Tenant extends Model
{
    protected $fillable = [
        'company_name',
        'document_id',
        'base_currency',
        'plan_id',
        'evolution_instance_id',
        'is_ai_active',
        'exchange_rate_config',
        'subscription_status',
        'trial_ends_at',
        'subscription_ends_at',
        'logo_url'
    ];

    protected $casts = [
        'is_ai_active' => 'boolean',
        'exchange_rate_config' => 'array',
        'trial_ends_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
    ];

    public function plan()
    {
        return $this->belongsTo(\App\Domain\Subscriptions\Models\Plan::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function subscriptionPayments()
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    public function users()
    {
        return $this->hasMany(\App\Models\User::class);
    }
}
