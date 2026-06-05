<?php

namespace App\Domain\Subscriptions\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Domain\Tenants\Models\Tenant;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class SubscriptionPaymentController extends Controller
{
    public function store(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'currency' => 'required|string',
            'screenshot' => 'required|image|max:5120',
            'days_requested' => 'nullable|integer'
        ]);

        $file = $request->file('screenshot');
        $manager = new ImageManager(new Driver());
        $image = $manager->read($file);
        
        $image->scaleDown(width: 800);
        $encoded = $image->toWebp(80);
        
        $filename = 'payments/' . $tenant->id . '/' . uniqid() . '.webp';
        Storage::disk('s3')->put($filename, (string)$encoded, 'public');
        
        $screenshotUrl = Storage::disk('s3')->url($filename);

        $payment = $tenant->subscriptionPayments()->create([
            'amount' => $validated['amount'],
            'currency' => $validated['currency'],
            'screenshot_path' => $screenshotUrl,
            'status' => 'pending',
            'days_requested' => $validated['days_requested'] ?? 30
        ]);

        return response()->json([
            'message' => 'Pago reportado correctamente. Pendiente de aprobación.',
            'payment' => $payment
        ], 201);
    }
}
