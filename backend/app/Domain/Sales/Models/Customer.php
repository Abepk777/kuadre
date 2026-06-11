<?php

namespace App\Domain\Sales\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'tenant_id',
        'id_number',
        'name',
        'phone',
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
