<?php

namespace App\Domain\Notifications\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Domain\Sales\Models\Credit;
use App\Services\EvolutionApiService;

class SendPaymentReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $credit;

    public function __construct(Credit $credit)
    {
        $this->credit = $credit;
    }

    public function handle(EvolutionApiService $evolution)
    {
        // 1. Simular comportamiento humano (retraso aleatorio entre 10 y 25 segundos)
        sleep(rand(10, 25));

        // 2. Extraer info
        $tenant = $this->credit->sale->tenant;
        $instanceName = $tenant->evolution_instance_id;
        $phone = $this->credit->customer_phone;
        $amount = $this->credit->remaining_debt_usd;

        if (!$instanceName || !$phone) {
            return;
        }

        // 3. Formatear mensaje
        $message = "¡Hola! 👋 Te escribimos de {$tenant->company_name}. Queríamos recordarte amistosamente que tienes un saldo pendiente de *{$amount}$*. ¡Gracias por tu preferencia! 🏪";

        // 4. Enviar mediante Evolution API
        $evolution->sendText($instanceName, "{$phone}@s.whatsapp.net", $message);
    }
}
