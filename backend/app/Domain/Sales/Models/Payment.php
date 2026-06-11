<?php

namespace App\Domain\Sales\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'sale_id',
        'method',
        'amount_usd',
        'amount_ves',
        'exchange_rate_used'
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
