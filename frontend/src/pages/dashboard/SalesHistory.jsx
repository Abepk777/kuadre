import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import { Receipt, Search, Printer, MessageCircle, ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePrinter } from '../../hooks/usePrinter';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import TicketTemplate from '../../components/TicketTemplate';

const SalesHistory = () => {
    const { tenant, rates } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSale, setExpandedSale] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const ticketRef = useRef(null);
    const isStoreVES = tenant?.base_currency === 'VES';
    const activeRate = parseFloat((tenant?.exchange_rate_config?.sales_rate === 'binance' ? rates?.usd_binance : rates?.usd_bcv) || 1);
    
    const formatPaymentMethod = (method) => {
        const methods = {
            'efectivo_usd': 'Efectivo USD',
            'efectivo_ves': 'Efectivo Bs',
            'pago_movil': 'Pago Móvil',
            'punto_venta': 'Punto de Venta',
            'transferencia': 'Transferencia'
        };
        return methods[method] || method.replace(/_/g, ' ');
    };
    
    const { printReceipt } = usePrinter();

    const fetchSales = async () => {
        try {
            const { data } = await api.get(`/${tenant.id}/sales`);
            setSales(data.data || data); // handle pagination later if needed
        } catch (error) {
            console.error('Error fetching sales history', error);
            toast.error('Error cargando historial de ventas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenant) fetchSales();
    }, [tenant]);

    const handleDownload = async (sale, format = 'pdf') => {
        try {
            toast.loading(`Generando ${format === 'pdf' ? 'PDF' : 'Imagen'}...`, { id: 'download' });
            if (!ticketRef.current) throw new Error("El recibo no está listo en pantalla");

            // Forzamos un reflow para asegurar renderizado correcto
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(ticketRef.current, { 
                cacheBust: true, 
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            if (format === 'image') {
                const link = document.createElement('a');
                link.download = `Comprobante_Kuadre_${sale.id}.png`;
                link.href = dataUrl;
                link.click();
            } else {
                const mmWidth = 80;
                const mmHeight = (ticketRef.current.offsetHeight * mmWidth) / 400; // ratio based on 400px width
                
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [mmWidth, mmHeight]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, mmWidth, mmHeight);
                pdf.save(`Comprobante_Kuadre_${sale.id}.pdf`);
            }
            
            toast.success('Recibo descargado exitosamente', { id: 'download' });
        } catch (error) {
            console.error(error);
            toast.error('Error al generar el recibo', { id: 'download' });
        }
    };

    const handlePrintUsb = async (sale) => {
        const printerConfig = tenant.exchange_rate_config?.printer_config;
        if (printerConfig?.enabled && printerConfig?.type === 'usb') {
            await printReceipt(sale, tenant, isStoreVES, activeRate);
        } else {
            toast.error('La impresora USB no está configurada o habilitada en Ajustes.');
        }
    };

    const handleWhatsApp = async (sale) => {
        try {
            toast.loading('Preparando imagen para WhatsApp...', { id: 'wa' });
            if (!ticketRef.current) throw new Error("Ref not found");
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Generar imagen (mucho más compatible para mandar manual en whatsapp)
            const dataUrl = await toPng(ticketRef.current, { 
                cacheBust: true, 
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });
            
            const link = document.createElement('a');
            link.download = `Comprobante_Kuadre_${sale.id}.png`;
            link.href = dataUrl;
            link.click();
            
            toast.success('Imagen descargada. Ahora puedes arrastrarla al chat.', { id: 'wa' });
            
            setTimeout(() => {
                const text = `¡Hola! Aquí tienes tu comprobante de compra.`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }, 1500);
        } catch (error) {
            console.error(error);
            toast.error('Error preparando recibo', { id: 'wa' });
        }
    };

    const toggleExpand = (id) => {
        setExpandedSale(expandedSale === id ? null : id);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Receipt className="text-primary" /> Historial de Ventas
                    </h1>
                    <p className="text-muted-foreground text-sm">Consulta y reimprime tus tickets de venta</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <h3 className="font-bold">Últimas Ventas</h3>
                </div>
                
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                ) : sales.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No tienes ventas registradas aún.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {sales.map(sale => {
                            const isExpanded = expandedSale === sale.id;
                            const date = new Date(sale.created_at).toLocaleString('es-VE', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', 
                                hour: '2-digit', minute:'2-digit' 
                            });
                            
                            return (
                                <div key={sale.id} className={`transition-colors ${isExpanded ? 'bg-secondary/20' : 'hover:bg-secondary/10'}`}>
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(sale.id)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                #{sale.id}
                                            </div>
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {isStoreVES ? 'Bs' : '$'}{parseFloat(sale.total_usd).toFixed(2)}
                                                    {sale.payment_status === 'pending' && <span className="bg-yellow-500/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full uppercase">Crédito</span>}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {date}
                                                    {sale.customer && ` • ${sale.customer.name}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="hidden sm:flex text-sm text-muted-foreground font-mono">
                                                {(sale.items || []).reduce((acc, item) => acc + (item.quantity || 1), 0)} items
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="p-4 pt-0 border-t border-border/50 bg-secondary/10 animate-in slide-in-from-top-2">
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Detalle de Productos</h4>
                                                    <div className="space-y-2">
                                                        {(sale.items || []).map(item => (
                                                            <div key={item.id} className="flex justify-between text-sm">
                                                                <div className="flex gap-2">
                                                                    <span className="font-mono text-muted-foreground">{item.quantity}x</span>
                                                                    <span>{item.product?.name || 'Producto eliminado'}</span>
                                                                </div>
                                                                <span className="font-mono">{isStoreVES ? 'Bs' : '$'}{(parseFloat(item.unit_price_usd || 0) * parseFloat(item.quantity || 1)).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Acciones</h4>
                                                        
                                                        {/* Ticket Oculto para capturar */}
                                                        <div className="overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none">
                                                            <div className="w-[400px]">
                                                                <TicketTemplate ref={ticketRef} sale={sale} tenant={tenant} activeRate={activeRate} />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <button 
                                                                onClick={() => handlePrintUsb(sale)}
                                                                className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                <Printer size={14} /> Imprimir (Térmica)
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDownload(sale, 'pdf')}
                                                                className="flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                <FileText size={14} /> Descargar PDF
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDownload(sale, 'image')}
                                                                className="flex items-center gap-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                <ImageIcon size={14} /> Descargar Imagen
                                                            </button>
                                                            <button 
                                                                onClick={() => handleWhatsApp(sale)}
                                                                className="flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                <MessageCircle size={14} /> Enviar WhatsApp
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {(sale.payments || []).length > 0 && (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pagos</h4>
                                                            <div className="space-y-1">
                                                                {(sale.payments || []).map(payment => (
                                                                    <div key={payment.id} className="flex justify-between text-xs text-muted-foreground">
                                                                        <span className="font-bold uppercase text-foreground/80">{formatPaymentMethod(payment.method)}</span>
                                                                        <span>
                                                                            ${parseFloat(payment.amount_usd).toFixed(2)} 
                                                                            {parseFloat(payment.amount_ves) > 0 && ` / Bs${parseFloat(payment.amount_ves).toFixed(2)}`}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesHistory;
