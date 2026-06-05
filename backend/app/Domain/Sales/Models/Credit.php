<?php

namespace App\Domain\Sales\Models;

use Illuminate\Database\Eloquent\Model;

class Credit extends Model
{
    protected $fillable = [
        'sale_id',
        'total_debt_usd',
        'remaining_debt_usd',
        'due_date',
        'customer_phone'
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function installments()
    {
        return $this->hasMany(CreditInstallment::class);
    }

    public function customer()
    {
        // El Customer pertenece a la venta.
        return $this->hasOneThrough(Customer::class, Sale::class, 'id', 'id', 'sale_id', 'customer_id');
    }
}
