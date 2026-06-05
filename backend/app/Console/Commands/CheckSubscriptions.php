<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Domain\Tenants\Models\Tenant;
use Illuminate\Support\Facades\Log;

class CheckSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-subscriptions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check expiring subscriptions and send notifications';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking subscriptions...');
        
        $now = now();
        $tenants = Tenant::whereNotNull('subscription_ends_at')->get();
        
        foreach ($tenants as $tenant) {
            $daysLeft = $now->diffInDays($tenant->subscription_ends_at, false);
            
            // Si faltan exactamente 3 días
            if ($daysLeft == 3) {
                // Aquí iría la lógica para enviar el Web Push
                // $users = $tenant->users; 
                // foreach ($users as $user) { WebPush::send(...) }
                
                Log::info("Tenant {$tenant->id} ({$tenant->company_name}) expires in 3 days. Sending warning.");
            }
            
            // Si acaba de expirar (0 días o menos) y su status aún es active
            if ($daysLeft <= 0 && $tenant->subscription_status !== 'expired') {
                $tenant->update(['subscription_status' => 'expired']);
                
                Log::info("Tenant {$tenant->id} ({$tenant->company_name}) has expired. Updating status and sending notification.");
                // Lógica de email o push de expiración.
            }
        }
        
        $this->info('Check completed.');
    }
}
