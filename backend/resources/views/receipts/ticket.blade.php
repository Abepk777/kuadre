<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Recibo de Venta</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 12px; margin: 0; padding: 10px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .mt-10 { margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 4px 0; text-align: left; }
        .right { text-align: right; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="center bold">{{ $company_name }}</div>
    <div class="center mt-10">Recibo #: {{ $sale_id }}</div>
    <div class="center">Fecha: {{ $date }}</div>
    
    <div class="line"></div>
    
    <table>
        <tr>
            <th colspan="2">PAGOS REALIZADOS</th>
        </tr>
        @foreach($payments as $payment)
        <tr>
            <td>{{ strtoupper(str_replace('_', ' ', $payment->method)) }}</td>
            <td class="right">${{ number_format($payment->amount_usd, 2) }}</td>
        </tr>
        @endforeach
    </table>
    
    <div class="line"></div>
    
    <table>
        <tr>
            <td class="bold">TOTAL VENTA</td>
            <td class="bold right">${{ number_format($total_usd, 2) }}</td>
        </tr>
        <tr>
            <td>ESTADO</td>
            <td class="right">{{ strtoupper($status) }}</td>
        </tr>
    </table>
    
    <div class="line"></div>
    
    <div class="center mt-10">¡Gracias por su compra!</div>
</body>
</html>
