import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { 
    Users, Phone, MessageCircle, Calendar, 
    CheckCircle2, DollarSign, AlertCircle, ChevronDown, ChevronUp,
    CreditCard
} from 'lucide-react';

const Credits = () => {
    const { tenant, token, rates } = useAuth();
    const [credits, setCredits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCredit, setExpandedCredit] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    // Modal State
    const [partialModal, setPartialModal] = useState({ isOpen: false, creditId: null, remainingDebt: 0 });
    const [partialAmountUsd, setPartialAmountUsd] = useState('');
    const [partialAmountVes, setPartialAmountVes] = useState('');

    // Active Exchange Rate
    const isStoreVES = tenant?.base_currency === 'VES';
    const activeRate = parseFloat((tenant?.exchange_rate_config?.sales_rate === 'binance' ? rates?.binance : rates?.usd_bcv) || 1);

    const fetchCredits = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/${tenant.id}/credits`);
            setCredits(data);
        } catch (error) {
            console.error('Error fetching credits', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenant) fetchCredits();
    }, [tenant]);

    const handleRemind = async (creditId) => {
        setProcessingId(`remind-${creditId}`);
        try {
            const { data } = await api.post(`/${tenant.id}/credits/${creditId}/remind`);
            if (data.fallback_url) {
                // Abre el WhatsApp Web/App
                window.open(data.fallback_url, '_blank');
            } else {
                toast.success('Recordatorio enviado exitosamente por el Bot.');
            }
        } catch (error) {
            console.error('Error enviando recordatorio', error);
            if (error.response?.data?.fallback) {
                toast.error('El bot falló. Revisa tu conexión de Evolution API.');
            } else {
                toast.error('Error al intentar enviar el recordatorio.');
            }
        } finally {
            setProcessingId(null);
        }
    };

    const handlePayInstallment = async (creditId, installment) => {
        const result = await Swal.fire({
            title: '¿Registrar abono?',
            text: `¿Confirmas el abono de $${installment.amount_usd} de esta cuota?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, abonar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;
        
        setProcessingId(`inst-${installment.id}`);
        try {
            // Asumimos efectivo por defecto para simplificar. En el futuro, abrir modal para seleccionar método.
            await api.post(`/${tenant.id}/credits/${creditId}/installments/${installment.id}/pay`, {
                amount_usd: installment.amount_usd,
                method: 'cash', 
                amount_ves: installment.amount_usd * activeRate,
                exchange_rate_used: activeRate
            });
            toast.success('Abono registrado exitosamente');
            await fetchCredits();
        } catch (error) {
            console.error('Error pagando cuota', error);
            toast.error('Error al registrar el abono.');
        } finally {
            setProcessingId(null);
        }
    };

    const handlePayFull = async (creditId, remainingDebt) => {
        const result = await Swal.fire({
            title: '¿Liquidar deuda?',
            text: `¿Confirmas la liquidación total de la deuda por $${remainingDebt}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, liquidar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;
        
        setProcessingId(`full-${creditId}`);
        try {
            await api.post(`/${tenant.id}/credits/${creditId}/pay-full`, {
                amount_usd: remainingDebt,
                method: 'cash',
                amount_ves: remainingDebt * activeRate,
                exchange_rate_used: activeRate
            });
            toast.success('Deuda liquidada exitosamente');
            await fetchCredits();
        } catch (error) {
            console.error('Error liquidando deuda', error);
            toast.error('Error al liquidar la deuda.');
        } finally {
            setProcessingId(null);
        }
    };

    const openPartialModal = (creditId, remainingDebt) => {
        setPartialModal({ isOpen: true, creditId, remainingDebt });
        setPartialAmountUsd('');
        setPartialAmountVes('');
    };

    const handlePartialUsdChange = (val) => {
        setPartialAmountUsd(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) setPartialAmountVes((parsed * activeRate).toFixed(2));
        else setPartialAmountVes('');
    };

    const handlePartialVesChange = (val) => {
        setPartialAmountVes(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) setPartialAmountUsd((parsed / activeRate).toFixed(2));
        else setPartialAmountUsd('');
    };

    const submitPartialPayment = async (e) => {
        e.preventDefault();
        const amount = parseFloat(partialAmountUsd);
        if (isNaN(amount) || amount <= 0 || amount > partialModal.remainingDebt) {
            toast.error('Monto inválido. Debe ser mayor a 0 y no exceder la deuda total.');
            return;
        }
        
        setProcessingId(`partial-${partialModal.creditId}`);
        setPartialModal({ isOpen: false, creditId: null, remainingDebt: 0 });
        try {
            await api.post(`/${tenant.id}/credits/${partialModal.creditId}/pay-partial`, {
                amount_usd: amount,
                method: 'cash',
                amount_ves: amount * activeRate,
                exchange_rate_used: activeRate
            });
            toast.success('Abono registrado exitosamente');
            await fetchCredits();
        } catch (error) {
            console.error('Error procesando abono parcial', error);
            toast.error('Error al registrar el abono parcial.');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Pendientes primero, completados después
    const sortedCredits = [...credits].sort((a, b) => {
        if (a.remaining_debt_usd > 0 && b.remaining_debt_usd <= 0) return -1;
        if (a.remaining_debt_usd <= 0 && b.remaining_debt_usd > 0) return 1;
        return 0;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Cuentas por Cobrar</h1>
                    <p className="text-muted-foreground text-sm">Gestiona créditos, abonos y recordatorios de clientes</p>
                </div>
            </div>

            {sortedCredits.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Users size={32} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No hay créditos registrados</h3>
                    <p className="text-muted-foreground">Las ventas marcadas como "Fiado/Crédito" aparecerán aquí.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sortedCredits.map(credit => {
                        const customer = credit.sale?.customer;
                        const isPaid = credit.remaining_debt_usd <= 0;
                        const isExpanded = expandedCredit === credit.id;
                        
                        // Conversiones estéticas a la moneda de la tienda
                        const primaryDebt = isStoreVES ? (credit.remaining_debt_usd * activeRate) : credit.remaining_debt_usd;
                        const primarySymbol = isStoreVES ? 'Bs' : '$';
                        const secondaryDebt = isStoreVES ? credit.remaining_debt_usd : (credit.remaining_debt_usd * activeRate);
                        const secondarySymbol = isStoreVES ? '$' : 'Bs';

                        return (
                            <div key={credit.id} className={`bg-card border ${isPaid ? 'border-border opacity-60' : 'border-primary/30'} rounded-3xl overflow-hidden transition-all duration-300`}>
                                {/* Header del Crédito */}
                                <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between cursor-pointer" onClick={() => setExpandedCredit(isExpanded ? null : credit.id)}>
                                    
                                    {/* Info Cliente */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${isPaid ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                                            {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">{customer?.name || 'Cliente Genérico'}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                {credit.customer_phone && (
                                                    <span className="flex items-center gap-1 font-mono">
                                                        <Phone size={14} /> {credit.customer_phone}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} /> Vence: {credit.due_date || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Deuda */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Restante</div>
                                            {isPaid ? (
                                                <div className="text-emerald-500 font-bold flex items-center gap-2">
                                                    <CheckCircle2 size={18} /> Pagado
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-2xl font-black text-red-500 leading-none mb-1">
                                                        {primarySymbol}{parseFloat(primaryDebt).toFixed(2)}
                                                    </span>
                                                    <span className="text-xs font-bold text-muted-foreground">
                                                        {secondarySymbol}{parseFloat(secondaryDebt).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="text-muted-foreground">
                                            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Body Desplegable */}
                                {isExpanded && (
                                    <div className="border-t border-border bg-muted/10 p-6 animate-in slide-in-from-top-2">
                                        <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                                            
                                            {/* Plan de Cuotas */}
                                            <div className="flex-1 w-full">
                                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                                    <CreditCard size={18} className="text-primary" />
                                                    Plan de Cuotas
                                                </h4>
                                                
                                                {credit.installments && credit.installments.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {credit.installments.map((inst, idx) => (
                                                            <div key={inst.id} className="flex items-center justify-between bg-card border border-border p-3.5 rounded-2xl">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${inst.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-secondary text-secondary-foreground'}`}>
                                                                        #{idx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-sm">
                                                                            ${parseFloat(inst.amount_usd).toFixed(2)}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">Vence: {inst.due_date}</div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {inst.status === 'paid' ? (
                                                                    <span className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                                                                        <CheckCircle2 size={16} /> Pagado
                                                                    </span>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handlePayInstallment(credit.id, inst)}
                                                                        disabled={processingId === `inst-${inst.id}`}
                                                                        className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                                                                    >
                                                                        {processingId === `inst-${inst.id}` ? '...' : 'Abonar'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic">No hay cuotas registradas. La deuda es general.</div>
                                                )}
                                            </div>

                                            {/* Acciones Generales */}
                                            {!isPaid && (
                                                <div className="w-full md:w-64 space-y-3">
                                                    <h4 className="font-bold mb-4">Acciones</h4>
                                                    
                                                    <button 
                                                        onClick={() => handleRemind(credit.id)}
                                                        disabled={processingId === `remind-${credit.id}` || !credit.customer_phone}
                                                        className="w-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/20 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 justify-center disabled:opacity-50 disabled:grayscale"
                                                    >
                                                        <MessageCircle size={18} />
                                                        {processingId === `remind-${credit.id}` ? 'Enviando...' : 'Recordar WhatsApp'}
                                                    </button>

                                                    <button 
                                                        onClick={() => handlePayFull(credit.id, credit.remaining_debt_usd)}
                                                        disabled={processingId === `full-${credit.id}`}
                                                        className="w-full bg-primary text-primary-foreground hover:brightness-110 px-4 py-3 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center gap-2 justify-center disabled:opacity-50"
                                                    >
                                                        <DollarSign size={18} />
                                                        {processingId === `full-${credit.id}` ? 'Procesando...' : 'Liquidar Total'}
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => openPartialModal(credit.id, credit.remaining_debt_usd)}
                                                        disabled={processingId === `partial-${credit.id}`}
                                                        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-3 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center gap-2 justify-center disabled:opacity-50"
                                                    >
                                                        <DollarSign size={18} />
                                                        {processingId === `partial-${credit.id}` ? 'Procesando...' : 'Abono Parcial'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Abono Parcial */}
            {partialModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <form onSubmit={submitPartialPayment} className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border animate-in fade-in zoom-in duration-300">
                        <div className="px-6 py-4 border-b border-border bg-muted/20">
                            <h3 className="font-bold text-lg">Abono Parcial</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Deuda restante: <span className="font-bold text-foreground">${parseFloat(partialModal.remainingDebt).toFixed(2)}</span>
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground ml-1">Monto a abonar en Dólares ($)</label>
                                <div className="relative">
                                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        max={partialModal.remainingDebt}
                                        value={partialAmountUsd} 
                                        onChange={(e) => handlePartialUsdChange(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/50 font-bold" 
                                        placeholder="0.00" 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-background border border-border p-1 rounded-full text-muted-foreground">⇌</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground ml-1">Equivalente en Bolívares (Bs)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Bs</span>
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        value={partialAmountVes} 
                                        onChange={(e) => handlePartialVesChange(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/20 border border-border focus:ring-2 focus:ring-primary/50 text-sm" 
                                        placeholder="0.00" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex gap-3">
                            <button type="button" onClick={() => setPartialModal({ isOpen: false, creditId: null, remainingDebt: 0 })} className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:brightness-95 transition-all">Cancelar</button>
                            <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-[0.98] transition-all">Procesar Abono</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Credits;
