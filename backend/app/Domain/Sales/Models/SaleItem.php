<?php

namespace App\Domain\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use App\Domain\Inventory\Models\Product;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id',
        'product_id',
        'quantity',
        'unit_cost_usd',
        'unit_price_usd',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
