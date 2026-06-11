<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Domain\Sales\Controllers\SaleController;
use App\Domain\Sales\Controllers\CreditController;
use App\Domain\Inventory\Controllers\ProductController;
use App\Domain\Inventory\Controllers\InventoryPurchaseController;
use App\Domain\Finance\Controllers\CashRegisterController;
use App\Domain\Tenants\Controllers\TenantController;
use App\Domain\Auth\Controllers\AuthController;
use App\Domain\Subscriptions\Controllers\SubscriptionPaymentController;
use App\Domain\Admin\Controllers\AdminPanelController;


Route::prefix('v1')->group(function () {
    // Esta ruta proxy permite que las imágenes se sirvan desde tu API
    // Ejemplo de llamada: GET /api/v1/storage/logo.png
    Route::get('/storage/{path}', function ($path) {
        $disk = \Illuminate\Support\Facades\Storage::disk('s3');
        
        if (!$disk->exists($path)) {
            abort(404);
        }

        return $disk->response($path);
    })->where('path', '.*');
});
Route::prefix('v1')->group(function () {
    Route::get('/ping', function() { return 'pong'; });
    
    // --- Auth & Onboarding ---
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/check-availability', [AuthController::class, 'checkAvailability']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    
    // --- Public Catalog ---
    Route::get('/catalog/{tenant}', [\App\Domain\Inventory\Controllers\ProductController::class, 'index']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/push-subscribe', [\App\Domain\Notifications\Controllers\PushSubscriptionController::class, 'subscribe']);
        
        // Rutas que requieren suscripción activa
        Route::middleware('subscribed')->group(function () {
            // Aquí irán las rutas del Tenant (Ventas, Inventario, etc.)
            // Dashboard Stats
            Route::get('/dashboard/stats', [\App\Domain\Dashboard\Controllers\DashboardStatsController::class, 'index']);

            // --- Tenants (SaaS Config) ---
            Route::prefix('tenants')->group(function () {
                Route::post('/', [TenantController::class, 'store']);
                Route::post('/{tenant}/general', [TenantController::class, 'updateGeneral']);
                Route::put('/{tenant}/exchange-rate', [TenantController::class, 'updateExchangeRate']);
                Route::put('/{tenant}/evolution-instance', [TenantController::class, 'updateEvolutionInstance']);
                
                // WhatsApp Config
                Route::put('/{tenant}/whatsapp/config', [TenantController::class, 'updateWhatsappConfig']);
                Route::get('/{tenant}/whatsapp/qr', [TenantController::class, 'getWhatsappQr']);
            });

            // --- Dashboard ---
            Route::get('/{tenant}/dashboard', [\App\Domain\Dashboard\Controllers\DashboardController::class, 'index']);

            // --- Employees ---
            Route::get('/{tenant}/employees', [\App\Domain\Tenants\Controllers\EmployeeController::class, 'index']);
            Route::post('/{tenant}/employees', [\App\Domain\Tenants\Controllers\EmployeeController::class, 'store']);
            Route::delete('/{tenant}/employees/{id}', [\App\Domain\Tenants\Controllers\EmployeeController::class, 'destroy']);
            
            // --- Inventory ---
            Route::prefix('{tenant}/inventory')->group(function () {
                Route::get('/products', [ProductController::class, 'index']);
                Route::post('/products', [ProductController::class, 'store']);
                Route::put('/products/{product}', [ProductController::class, 'update']);
                Route::post('/products/bulk-delete', [ProductController::class, 'bulkDelete']);
                Route::post('/products/{product}/purchase', [InventoryPurchaseController::class, 'store']);
                // Route::post('/products/{product}/transactions', [InventoryTransactionController::class, 'store']); // Mermas/Ajustes
            });

            // --- Customers ---
            Route::prefix('{tenant}/customers')->group(function () {
                Route::get('/', [\App\Domain\Sales\Controllers\CustomerController::class, 'index']);
            });

            // --- Sales (Ventas & Créditos) ---
            Route::prefix('{tenant}/sales')->group(function () {
                Route::get('/', [SaleController::class, 'index']);
                Route::post('/bulk', [SaleController::class, 'bulkStore']);
                Route::post('/', [SaleController::class, 'store']);
                Route::get('/{sale}/receipt', [SaleController::class, 'receiptPdf']);
            });

            // --- Credits (Cuentas por Cobrar) ---
            Route::prefix('{tenant}/credits')->group(function () {
                Route::get('/', [CreditController::class, 'index']);
                Route::post('/{credit}/installments/{installment}/pay', [CreditController::class, 'payInstallment']);
                Route::post('/{credit}/pay-partial', [CreditController::class, 'payPartial']);
                Route::post('/{credit}/pay-full', [CreditController::class, 'payFull']);
                Route::post('/{credit}/remind', [CreditController::class, 'remind']);
            });

            // --- Finance (Cierre Diario) ---
            Route::prefix('{tenant}/finance')->group(function () {
                Route::post('/cash-register/close', [CashRegisterController::class, 'closeDay']);
                Route::get('/cash-register/history', [CashRegisterController::class, 'history']);
            });
        });

        // --- Admin Panel (SuperAdmin Only) ---
        Route::prefix('admin')->middleware('superadmin')->group(function () {
            Route::get('/tenants', [AdminPanelController::class, 'tenants']);
            Route::get('/payments/pending', [AdminPanelController::class, 'pendingPayments']);
            Route::post('/payments/{payment}/approve', [AdminPanelController::class, 'approvePayment']);
            Route::post('/tenants/{tenant}/add-days', [AdminPanelController::class, 'addDays']);
            Route::post('/notifications/massive', [AdminPanelController::class, 'sendMassiveNotification']);
        });

        // --- Subscriptions (Tenant Only) ---
        Route::prefix('{tenant}/subscriptions')->group(function () {
            Route::post('/payments', [SubscriptionPaymentController::class, 'store']); // Subir comprobante
        });

        // --- Tareas / Jobs ---
        // Route::post('/system/sync-bcv-rate', [\App\Domain\System\Controllers\SystemController::class, 'syncBcvRate']);

    });

});
