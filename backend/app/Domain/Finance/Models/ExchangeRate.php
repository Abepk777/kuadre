<?php

namespace App\Domain\Finance\Models;

use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    protected $fillable = [
        'source',
        'rate',
        'date'
    ];

    protected $casts = [
        'date' => 'date',
    ];
}
