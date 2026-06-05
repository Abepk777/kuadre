<?php

namespace App\Domain\Sales\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Sales\Models\Sale;
use App\Domain\Sales\Models\Payment;
use App\Domain\Sales\Models\Credit;
use App\Domain\Sales\Models\SaleItem;
use App\Domain\Sales\Models\Customer;
use App\Domain\Sales\Models\CreditInstallment;
use App\Domain\Inventory\Models\Product;
use App\Domain\Sales\Services\ReceiptPdfService;
use App\Domain\Notifications\Jobs\SendPaymentReminderJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SaleController extends Controller
{
    public function index(Request $request, $tenantId)
    {
        $sales = Sale::where('tenant_id', $tenantId)
            ->with(['items.product', 'payments', 'credit', 'customer'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);
            
        return response()->json($sales);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'total_usd' => 'required|numeric',
            'status' => 'required|in:completed,pending_credit',
            'payments' => 'nullable|array',
            'credit' => 'nullable|array'
        ]);

        $sale = Sale::create([
            'tenant_id' => $validated['tenant_id'],
            'total_usd' => $validated['total_usd'],
            'status' => $validated['status'],
        ]);

        if (!empty($validated['payments'])) {
            foreach ($validated['payments'] as $payment) {
                Payment::create([
                    'sale_id' => $sale->id,
                    'method' => $payment['method'],
                    'amount_usd' => $payment['amount_usd'],
                    'amount_ves' => $payment['amount_ves'] ?? null,
                    'exchange_rate_used' => $payment['exchange_rate_used'] ?? null,
                ]);
            }
        }

        if ($validated['status'] === 'pending_credit' && !empty($validated['credit'])) {
            $credit = Credit::create([
                'sale_id' => $sale->id,
                'total_debt_usd' => $validated['credit']['total_debt_usd'],
                'remaining_debt_usd' => $validated['credit']['remaining_debt_usd'],
                'due_date' => $validated['credit']['due_date'] ?? null,
                'customer_phone' => $validated['credit']['customer_phone'] ?? null,
            ]);

            // Despachar el Job del recordatorio que actuará con un delay automático aleatorio
            dispatch(new SendPaymentReminderJob($credit));
        }

        return response()->json($sale->load('payments', 'credit', 'items'), 201);
    }

    public function bulkStore(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $salesData = $request->input('sales', []);
        $processedSales = [];

        DB::beginTransaction();
        try {
            foreach ($salesData as $saleData) {
                // 0. Process Customer
                $customerId = null;
                if (!empty($saleData['customer'])) {
                    $customerData = $saleData['customer'];
                    if (!empty($customerData['id_number'])) {
                        $customer = Customer::firstOrCreate(
                            ['tenant_id' => $tenantId, 'id_number' => $customerData['id_number']],
                            ['name' => $customerData['name'] ?? 'Cliente Genérico', 'phone' => $customerData['phone'] ?? null]
                        );
                        $customerId = $customer->id;
                    }
                }

                // 1. Create Sale
                $sale = Sale::create([
                    'tenant_id' => $tenantId,
                    'customer_id' => $customerId,
                    'total_usd' => $saleData['total_usd'],
                    'status' => $saleData['status'],
                ]);

                // 2. Create Items & Decrement Stock
                if (!empty($saleData['items'])) {
                    foreach ($saleData['items'] as $item) {
                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $item['product_id'],
                            'quantity' => $item['quantity'],
                            'unit_cost_usd' => $item['unit_cost_usd'] ?? 0,
                            'unit_price_usd' => $item['unit_price_usd'] ?? 0,
                        ]);

                        // Decrement Stock
                        $product = Product::where('tenant_id', $tenantId)->find($item['product_id']);
                        if ($product) {
                            $product->decrement('stock', $item['quantity']);
                        }
                    }
                }

                // 3. Create Payments
                if (!empty($saleData['payments'])) {
                    foreach ($saleData['payments'] as $payment) {
                        Payment::create([
                            'sale_id' => $sale->id,
                            'method' => $payment['method'],
                            'amount_usd' => $payment['amount_usd'],
                            'amount_ves' => $payment['amount_ves'] ?? null,
                            'exchange_rate_used' => $payment['exchange_rate_used'] ?? null,
                        ]);
                    }
                }

                // 4. Create Credit (if applicable)
                if ($saleData['status'] === 'pending_credit' && !empty($saleData['credit'])) {
                    $creditData = $saleData['credit'];
                    $credit = Credit::create([
                        'sale_id' => $sale->id,
                        'total_debt_usd' => $creditData['total_debt_usd'],
                        'remaining_debt_usd' => $creditData['remaining_debt_usd'],
                        'due_date' => $creditData['due_date'] ?? null,
                        'customer_phone' => $creditData['customer_phone'] ?? null,
                    ]);

                    // 4.1 Create Installments
                    if (!empty($creditData['installments'])) {
                        foreach ($creditData['installments'] as $inst) {
                            CreditInstallment::create([
                                'credit_id' => $credit->id,
                                'amount_usd' => $inst['amount_usd'],
                                'due_date' => $inst['due_date'],
                            ]);
                        }
                    }

                    dispatch(new SendPaymentReminderJob($credit));
                }

                // 5. Send Receipt automatically via Evolution
                if (!empty($saleData['send_receipt']) && !empty($saleData['customer']['phone']) && !empty($saleData['receipt_base64'])) {
                    $tenantModel = \App\Domain\Tenants\Models\Tenant::find($tenantId);
                    if ($tenantModel && $tenantModel->evolution_instance_id) {
                        try {
                            $phone = preg_replace('/[^0-9]/', '', $saleData['customer']['phone']);
                            $remoteJid = "{$phone}@s.whatsapp.net";
                            
                            // We get the base64 from the frontend directly (data:image/png;base64,...)
                            $base64Image = preg_replace('#^data:image/\w+;base64,#i', '', $saleData['receipt_base64']);
                            
                            $evolution = new \App\Services\EvolutionApiService();
                            $evolution->sendMedia(
                                $tenantModel->evolution_instance_id,
                                $remoteJid,
                                'image/png',
                                $base64Image,
                                "Comprobante_{$sale->id}.png"
                            );
                        } catch (\Exception $e) {
                            Log::error("Bulk Sync WhatsApp Error: " . $e->getMessage());
                        }
                    }
                }

                $processedSales[] = $sale->id;
            }

            DB::commit();
            return response()->json([
                'status' => 'success',
                'message' => count($processedSales) . ' sales synchronized successfully.',
                'synced_ids' => $processedSales
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk Sync Error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to synchronize sales.'
            ], 500);
        }
    }

    public function receiptPdf($saleId, ReceiptPdfService $pdfService)
    {
        $sale = Sale::with('tenant', 'payments')->findOrFail($saleId);
        $base64 = $pdfService->generateReceipt($sale);
        
        return response()->json([
            'file' => $base64,
            'mime' => 'application/pdf',
            'filename' => "ticket_{$sale->id}.pdf"
        ]);
    }
}
