<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomPasswordReset extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $url;

    public function __construct(string $token, string $email)
    {
        // Construye la URL para tu frontend
        $this->url = 'https://app.kuadre.krecit.com/reset-password?token=' . $token . '&email=' . urlencode($email);
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Recuperación de Contraseña - Kuadre');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reset_password',
            with: ['url' => $this->url],
        );
    }
}