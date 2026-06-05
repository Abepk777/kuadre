<?php

namespace App\Domain\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use App\Domain\Tenants\Models\Tenant;

class Product extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'currency',
        'avg_cost_usd',
        'price_usd',
        'price_ves',
        'stock',
        'image_url'
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
