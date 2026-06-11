<?php

namespace App\Domain\Inventory\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Inventory\Models\Product;
use App\Domain\Tenants\Models\Tenant;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;

class ProductController extends Controller
{
    public function index(Tenant $tenant)
    {
        $products = $tenant->products()->orderBy('name')->get();
        $rates = \App\Services\ExchangeRateService::getRates();

        return response()->json([
            'products' => $products,
            'rates' => $rates,
            'tenant' => [
                'company_name' => $tenant->company_name,
                'base_currency' => $tenant->base_currency,
                'exchange_rate_config' => $tenant->exchange_rate_config
            ]
        ]);
    }

    public function store(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'avg_cost_usd' => 'numeric',
            'price_usd' => 'nullable|numeric',
            'stock' => 'numeric',
            'unit_type' => 'nullable|string|in:unit,kg,gr,lt',
            'image' => 'nullable|image|max:5120',
        ]);

        $data = $request->only(['name', 'avg_cost_usd', 'price_usd', 'stock', 'unit_type']);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = 'products/' . $tenant->id . '/' . uniqid() . '.webp';
            Storage::disk('s3')->put($filename, file_get_contents($file), 'public');
            
            $data['image_url'] = Storage::disk('s3')->url($filename);
        }

        $product = $tenant->products()->create($data);

        return response()->json($product, 201);
    }

    public function update(Request $request, Tenant $tenant, Product $product)
    {
        if ($product->tenant_id !== $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'avg_cost_usd' => 'sometimes|numeric',
            'price_usd' => 'nullable|numeric',
            'stock' => 'sometimes|numeric',
            'unit_type' => 'nullable|string|in:unit,kg,gr,lt',
            'image' => 'nullable|image|max:5120',
        ]);

        $data = $request->only(['name', 'avg_cost_usd', 'price_usd', 'stock', 'unit_type']);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = 'products/' . $tenant->id . '/' . uniqid() . '.webp';
            Storage::disk('s3')->put($filename, file_get_contents($file), 'public');
            
            $data['image_url'] = Storage::disk('s3')->url($filename);

            if ($product->image_url) {
                // Remove old image from S3 by extracting path
                $oldPath = parse_url($product->image_url, PHP_URL_PATH);
                $oldPath = ltrim($oldPath, '/');
                Storage::disk('s3')->delete($oldPath);
            }
        }

        $product->update($data);

        return response()->json($product);
    }

    public function bulkDelete(Request $request, Tenant $tenant)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:products,id'
        ]);

        // Verificar que todos los productos pertenezcan al tenant antes de borrar
        $products = $tenant->products()->whereIn('id', $request->ids)->get();

        foreach ($products as $product) {
            if ($product->image_url) {
                $oldPath = parse_url($product->image_url, PHP_URL_PATH);
                $oldPath = ltrim($oldPath, '/');
                Storage::disk('s3')->delete($oldPath);
            }
            $product->delete();
        }

        return response()->json(['status' => 'success']);
    }
}
