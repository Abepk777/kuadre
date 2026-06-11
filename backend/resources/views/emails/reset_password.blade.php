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
        .btn { display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px; }
        .footer { padding: 24px 40px; text-align: center; font-size: 13px; color: #64748b; background-color: #f1f5f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ url('/logo-horizontal-modoclaro.png') }}" alt="Kuadre Logo" class="logo" />
        </div>
        <div class="content">
            <h2 style="margin-top:0; font-size: 24px; font-weight: 800;">Recuperación de Contraseña</h2>
            <p>Hola, hemos recibido una solicitud para restablecer tu contraseña en Kuadre.</p>
            <p>Haz clic en el botón de abajo para asignar una nueva contraseña a tu cuenta de forma segura:</p>
            <center>
    <a href="{{ $url }}" class="btn">Restablecer Contraseña</a>
</center>
            <p style="margin-top: 30px; font-size: 13px; color: #64748b;">Si no solicitaste este cambio, puedes ignorar este correo sin problemas.</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Kuadre. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>
