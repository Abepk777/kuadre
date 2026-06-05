<?php

namespace App\Domain\Inventory\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    protected $fillable = [
        'product_id',
        'quantity',
        'type'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
