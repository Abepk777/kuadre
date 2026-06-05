<?php

namespace App\Domain\Subscriptions\Models;

use Illuminate\Database\Eloquent\Model;
use App\Domain\Tenants\Models\Tenant;

class SubscriptionPayment extends Model
{
    protected $fillable = [
        'tenant_id',
        'amount',
        'currency',
        'screenshot_path',
        'status',
        'days_requested'
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
