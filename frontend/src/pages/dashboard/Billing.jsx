import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import { CreditCard, AlertCircle, Upload, CheckCircle2, Clock, Image as ImageIcon, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const Billing = () => {
    const { tenant, rates } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ amount: '3.00', currency: 'VES' });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [copiedPm, setCopiedPm] = useState(false);
    const [copiedBinance, setCopiedBinance] = useState(false);

    const plan = tenant?.plan || {
        name: 'Plan Negocios',
        price_usd_binance: 2.00,
        price_usd_bcv: 3.00
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        if (!imageFile) {
            toast.error('Debes subir un comprobante de pago');
            setLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append('amount', formData.amount);
            submitData.append('currency', formData.currency);
            submitData.append('screenshot', imageFile);

            await api.post(`/${tenant.id}/subscriptions/payments`, submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccessMessage('¡Pago reportado! Espera a que un administrador lo verifique y active tus días.');
            setImageFile(null);
            setImagePreview(null);
        } catch (error) {
            console.error(error);
            toast.error('Hubo un error enviando el pago.');
        } finally {
            setLoading(false);
        }
    };

    // Calcular días restantes
    const getStatus = () => {
        if (!tenant) return { status: 'loading', daysLeft: 0 };
        
        const endsAt = tenant.trial_ends_at || tenant.subscription_ends_at;
        if (!endsAt) return { status: 'expired', daysLeft: 0 };

        const endDate = new Date(endsAt);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (daysLeft < 0) return { status: 'expired', daysLeft: 0 };
        if (tenant.trial_ends_at) return { status: 'trial', daysLeft };
        return { status: 'active', daysLeft };
    };

    const { status, daysLeft } = getStatus();

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Suscripción y Pagos</h1>
                <p className="text-muted-foreground mt-1">Mantén tu servicio activo para evitar interrupciones</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* STATUS PANEL */}
                <div className="space-y-6">
                    <div className={`p-6 rounded-3xl border-2 ${
                        status === 'expired' ? 'bg-red-500/10 border-red-500/30' : 
                        status === 'trial' ? 'bg-yellow-500/10 border-yellow-500/30' : 
                        'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                        <div className="flex items-center gap-3 mb-2">
                            {status === 'expired' ? <AlertCircle className="text-red-500" size={28} /> : 
                             status === 'trial' ? <Clock className="text-yellow-500" size={28} /> : 
                             <CheckCircle2 className="text-emerald-500" size={28} />}
                            <h2 className="text-xl font-bold">
                                {status === 'expired' ? 'Suscripción Expirada' : 
                                 status === 'trial' ? 'Prueba Gratuita' : 
                                 'Suscripción Activa'}
                            </h2>
                        </div>
                        <p className="text-3xl font-black mt-4">
                            {status === 'expired' ? '0' : daysLeft} <span className="text-lg text-muted-foreground font-semibold">días restantes</span>
                        </p>
                    </div>

                    <div className="bg-card border border-border p-6 rounded-3xl">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-primary" />
                            Tu Plan Actual
                        </h3>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="font-black text-2xl">{plan.name}</p>
                                <p className="text-muted-foreground text-sm">Facturación mensual</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-secondary/30 p-3 rounded-xl border border-border">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">Pago Móvil / Efec</p>
                                <p className="text-xl font-black">${parseFloat(plan.price_usd_bcv).toFixed(2)}</p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-primary">
                                <p className="text-[10px] uppercase text-primary/70 font-bold tracking-widest mb-1">Binance (Recomendado)</p>
                                <p className="text-xl font-black">${parseFloat(plan.price_usd_binance).toFixed(2)}</p>
                            </div>
                        </div>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Inventario Ilimitado</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Notificaciones WhatsApp</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Catálogo Público</li>
                        </ul>
                    </div>

                    <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
                        <h3 className="font-bold text-lg">Métodos de Pago Aceptados</h3>
                        <div className="bg-secondary/50 p-4 rounded-xl border border-border/50 flex justify-between items-center group">
                            <div>
                                <p className="font-bold text-sm">Binance Pay (Recomendado)</p>
                                <p className="text-muted-foreground text-xs font-mono mt-1">Pay ID: 428256965 (USDT)</p>
                                <p className="text-primary font-black mt-1">Monto: ${parseFloat(plan.price_usd_binance).toFixed(2)} USDT</p>
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`Binance Pay ID: 428256965\nMonto a pagar: ${parseFloat(plan.price_usd_binance).toFixed(2)} USDT`);
                                    setCopiedBinance(true);
                                    setTimeout(() => setCopiedBinance(false), 2000);
                                }}
                                className="bg-background border border-border p-2 rounded-xl text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                            >
                                {copiedBinance ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-xl border border-border/50 flex justify-between items-center group">
                            <div>
                                <p className="font-bold text-sm">Pago Móvil (Tasa BCV)</p>
                                <p className="text-muted-foreground text-xs font-mono mt-1">BNC (0191) - 04123391516 - V-27425949</p>
                                <p className="text-emerald-500 font-black mt-1">Monto: Bs {(plan.price_usd_bcv * (rates?.usd_bcv || 1)).toFixed(2)}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    const ves = (plan.price_usd_bcv * (rates?.usd_bcv || 1)).toFixed(2);
                                    navigator.clipboard.writeText(`Pago Móvil\nBanco: BNC (0191)\nTeléfono: 04123391516\nCédula: V27425949\nMonto a pagar: Bs ${ves}`);
                                    setCopiedPm(true);
                                    setTimeout(() => setCopiedPm(false), 2000);
                                }}
                                className="bg-background border border-border p-2 rounded-xl text-muted-foreground hover:text-foreground hover:border-emerald-500 transition-colors"
                            >
                                {copiedPm ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* PAYMENT FORM */}
                <div className="bg-card border border-border p-6 rounded-3xl h-fit">
                    <h3 className="font-bold text-xl mb-2">Reportar un Pago</h3>
                    <p className="text-muted-foreground text-sm mb-6">Si ya realizaste la transferencia, adjunta el comprobante para habilitar tus días.</p>

                    {successMessage ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center">
                            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                            <h4 className="font-bold text-emerald-500 mb-2">Pago en Revisión</h4>
                            <p className="text-sm text-muted-foreground">{successMessage}</p>
                            <button 
                                onClick={() => setSuccessMessage('')}
                                className="mt-6 text-sm text-primary font-bold hover:underline"
                            >
                                Reportar otro pago
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Método utilizado</label>
                                <select 
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                >
                                    <option value="USD_BINANCE">Binance (USDT)</option>
                                    <option value="VES_PAGOMOVIL">Pago Móvil (Bs)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Monto Pagado</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-muted-foreground font-bold">
                                            {formData.currency.includes('VES') ? 'Bs' : '$'}
                                        </span>
                                    </div>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        className="w-full px-4 py-3 pl-10 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                        placeholder={formData.currency.includes('VES') ? 'Monto en Bolívares' : 'Monto en USD'}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Foto del Comprobante</label>
                                <div className="mt-1">
                                    <label className="relative group cursor-pointer w-full h-40 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-muted/30 flex flex-col items-center justify-center transition-all hover:border-primary/50 hover:bg-muted/50">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-muted-foreground flex flex-col items-center">
                                                <ImageIcon size={32} className="mb-3 opacity-50" />
                                                <span className="text-sm font-medium">Haz clic para subir imagen</span>
                                                <span className="text-xs opacity-70 mt-1">JPG, PNG o WebP</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="text-white" size={28} />
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    disabled={loading || !imageFile}
                                    className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        'Enviar Comprobante'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Billing;
