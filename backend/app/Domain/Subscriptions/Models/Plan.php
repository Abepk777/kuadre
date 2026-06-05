<?php

namespace App\Domain\Subscriptions\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'price_usd_binance',
        'price_usd_bcv'
    ];
}
