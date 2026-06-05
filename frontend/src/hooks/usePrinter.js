import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const usePrinter = () => {
    const [port, setPort] = useState(null);

    const connectUSB = async () => {
        try {
            if (!navigator.serial) {
                toast.error('Web Serial API no soportada en este navegador');
                return null;
            }
            const selectedPort = await navigator.serial.requestPort();
            await selectedPort.open({ baudRate: 9600 });
            setPort(selectedPort);
            toast.success('Impresora conectada');
            return selectedPort;
        } catch (error) {
            console.error('Error connecting to printer:', error);
            if (error.name === 'NotFoundError') {
                // User cancelled
            } else {
                toast.error('Error al conectar con la impresora');
            }
            return null;
        }
    };

    const printReceipt = useCallback(async (sale, tenant, isStoreVES, activeRate) => {
        let activePort = port;
        if (!activePort) {
            // Intenta conectar si no está conectada
            activePort = await connectUSB();
            if (!activePort) return false;
        }

        try {
            const writer = activePort.writable.getWriter();
            
            // ESC/POS Commands
            const ESC = '\x1B';
            const INIT = ESC + '@'; // Initialize
            const ALIGN_CENTER = ESC + 'a' + '\x01';
            const ALIGN_LEFT = ESC + 'a' + '\x00';
            const BOLD_ON = ESC + 'E' + '\x01';
            const BOLD_OFF = ESC + 'E' + '\x00';
            const CUT = '\x1D' + 'V' + '\x41' + '\x03'; // Cut paper
            const LF = '\x0A';

            let data = INIT + ALIGN_CENTER + BOLD_ON;
            
            // Header
            data += `${tenant.company_name}\n`;
            data += BOLD_OFF;
            data += `Recibo #${sale.id}\n`;
            data += `Fecha: ${new Date(sale.created_at).toLocaleString('es-VE')}\n`;
            data += '--------------------------------\n';
            
            // Items
            data += ALIGN_LEFT;
            sale.items.forEach(item => {
                const subtotal = parseFloat(item.subtotal_usd);
                const subVes = subtotal * activeRate;
                data += `${item.quantity}x ${item.product?.name || 'Producto'}\n`;
                data += `   $${subtotal.toFixed(2)} | Bs${subVes.toFixed(2)}\n`;
            });
            
            data += '--------------------------------\n';
            
            // Totals
            const total = parseFloat(sale.total_amount || sale.total_usd || 0);
            const totalVes = total * activeRate;
            data += ALIGN_CENTER + BOLD_ON;
            data += `TOTAL: $${total.toFixed(2)} | Bs${totalVes.toFixed(2)}\n`;
            data += BOLD_OFF;
            
            // Crédito (si aplica)
            if (sale.status === 'pending_credit' || sale.credit) {
                data += LF + ALIGN_CENTER + BOLD_ON + 'NOTA DE CREDITO (FIADO)\n' + BOLD_OFF;
                data += ALIGN_LEFT + 'El cliente se compromete a pagar en\nlas fechas acordadas.\n';
                if (sale.credit?.installments?.length > 0) {
                    data += '--------------------------------\n';
                    sale.credit.installments.forEach((inst, idx) => {
                        const iAmt = parseFloat(inst.amount_usd || 0);
                        const iVes = iAmt * activeRate;
                        const dateStr = new Date(inst.due_date).toLocaleDateString('es-VE');
                        data += `Cuota ${idx + 1} (${dateStr}): $${iAmt.toFixed(2)} | Bs${iVes.toFixed(2)}\n`;
                    });
                    const debtTotal = parseFloat(sale.credit.total_debt_usd || total);
                    data += ALIGN_RIGHT + BOLD_ON + `\nDeuda: $${debtTotal.toFixed(2)} | Bs${(debtTotal * activeRate).toFixed(2)}\n` + BOLD_OFF;
                }
            }
            
            data += ALIGN_CENTER + LF + LF + '¡Gracias por su compra!' + LF + LF + LF + LF + CUT;

            const encoder = new TextEncoder();
            await writer.write(encoder.encode(data));
            
            writer.releaseLock();
            return true;
        } catch (error) {
            console.error('Print error:', error);
            toast.error('Error al imprimir ticket');
            return false;
        }
    }, [port]);

    return { connectUSB, printReceipt, isConnected: !!port };
};
