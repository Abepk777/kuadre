<?php

namespace App\Domain\Sales\Models;

use Illuminate\Database\Eloquent\Model;

class CreditInstallment extends Model
{
    protected $fillable = [
        'credit_id',
        'amount_usd',
        'due_date',
        'status',
        'paid_at'
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    public function credit()
    {
        return $this->belongsTo(Credit::class);
    }
}
