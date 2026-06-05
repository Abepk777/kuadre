<?php

namespace App\Domain\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use App\Domain\Tenants\Models\Tenant;

class Sale extends Model
{
    protected $fillable = [
        'tenant_id',
        'total_usd',
        'status',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function credit()
    {
        return $this->hasOne(Credit::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
