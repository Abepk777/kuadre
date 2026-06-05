<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #0f172a; }
        .container { max-w-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { padding: 32px 40px; text-align: center; border-bottom: 1px solid #e2e8f0; }
        .logo { height: 40px; }
        .content { padding: 40px; line-height: 1.6; }
        .btn { display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px; }
        .footer { padding: 24px 40px; text-align: center; font-size: 13px; color: #64748b; background-color: #f1f5f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ url('/logo-horizontal-modoclaro.png') }}" alt="Kuadre Logo" class="logo" />
        </div>
        <div class="content">
            <h2 style="margin-top:0; font-size: 24px; font-weight: 800; color: #10b981;">¡Pago de Suscripción Aprobado!</h2>
            <p>Hola, <strong>{{ $user->name }}</strong>.</p>
            <p>Hemos recibido y verificado exitosamente tu pago. Se han añadido <strong>{{ $days }} días</strong> a tu suscripción de Kuadre.</p>
            <p>Gracias por confiar en nosotros para mantener organizado tu negocio. Tu suscripción ahora es válida hasta el <strong>{{ $new_ends_at }}</strong>.</p>
            <center>
                <a href="{{ url(env('FRONTEND_URL', 'http://localhost:5173') . '/dashboard') }}" class="btn">Ir al Sistema</a>
            </center>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Kuadre. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>
