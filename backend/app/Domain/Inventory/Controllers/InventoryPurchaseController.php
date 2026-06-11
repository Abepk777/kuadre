<?php

namespace App\Domain\Inventory\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Inventory\Models\Product;
use Illuminate\Support\Facades\DB;

class InventoryPurchaseController extends Controller
{
    public function store(Request $request, $tenantId, $productId)
    {
        $validated = $request->validate([
            'added_qty' => 'required|numeric|min:0.001',
            'unit_cost_usd' => 'required|numeric|min:0',
            'new_price_usd' => 'nullable|numeric|min:0',
        ]);

        $product = Product::where('tenant_id', $tenantId)->findOrFail($productId);

        DB::beginTransaction();
        try {
            $oldStock = $product->stock;
            $oldCost = $product->avg_cost_usd;
            
            $addedQty = $validated['added_qty'];
            $newCost = $validated['unit_cost_usd'];
            
            $newStock = $oldStock + $addedQty;
            
            // Si el stock actual era <= 0, el nuevo costo promedio es simplemente el nuevo costo.
            // Si había stock, calculamos el promedio ponderado.
            if ($oldStock <= 0) {
                $avgCost = $newCost;
            } else {
                $totalOldValue = $oldStock * $oldCost;
                $totalNewValue = $addedQty * $newCost;
                $avgCost = ($totalOldValue + $totalNewValue) / $newStock;
            }

            // Actualizar producto
            $updateData = [
                'stock' => $newStock,
                'avg_cost_usd' => $avgCost
            ];
            
            if (isset($validated['new_price_usd'])) {
                $updateData['price_usd'] = $validated['new_price_usd'];
            }

            $product->update($updateData);

            // Registrar transacción en historial (si existe la tabla / modelo)
            // Se asume que existe el modelo InventoryTransaction
            DB::table('inventory_transactions')->insert([
                'product_id' => $product->id,
                'quantity' => $addedQty,
                'type' => 'purchase',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Compra registrada exitosamente',
                'product' => $product
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error registrando compra', 'details' => $e->getMessage()], 500);
        }
    }
}
