import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import {
    Settings as SettingsIcon, MessageCircle, QrCode, Smartphone,
    RefreshCw, CheckCircle2, Store, Upload, Currency, Printer, AlertCircle
} from 'lucide-react';
import { startSettingsTour } from '../../utils/tours';

const Settings = () => {
    const { tenant, refreshData } = useAuth();

    // Config Whatsapp
    const [alertMode, setAlertMode] = useState('manual');
    const [qrCode, setQrCode] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [savingWhatsapp, setSavingWhatsapp] = useState(false);

    // Config General
    const [companyName, setCompanyName] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [baseCurrency, setBaseCurrency] = useState('USD');
    const [salesRateSource, setSalesRateSource] = useState('binance');
    const [customRate, setCustomRate] = useState('');
    const [ticketCurrencyDisplay, setTicketCurrencyDisplay] = useState('both');
    const [showUsdCatalog, setShowUsdCatalog] = useState(true);

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const fileInputRef = useRef(null);
    const [savingGeneral, setSavingGeneral] = useState(false);
    const [savingExchangeRate, setSavingExchangeRate] = useState(false);

    useEffect(() => {
        if (tenant) {
            if (tenant.exchange_rate_config?.whatsapp_alert_mode) {
                setAlertMode(tenant.exchange_rate_config.whatsapp_alert_mode);
            }
            setCompanyName(tenant.company_name || '');
            setDocumentId(tenant.document_id || '');
            setBaseCurrency(tenant.base_currency || 'USD');
            setSalesRateSource(tenant.exchange_rate_config?.sales_rate || 'binance');
            setShowUsdCatalog(tenant.exchange_rate_config?.show_usd_catalog ?? true);
            setCustomRate(tenant.exchange_rate_config?.custom_rate || '');
            setTicketCurrencyDisplay(tenant.exchange_rate_config?.ticket_currency_display || 'both');

            if (tenant.logo_url) {
                setLogoPreview(tenant.logo_url);
            }
        }
    }, [tenant]);

    useEffect(() => {
        startSettingsTour();
    }, []);

    // -- Whatsapp Methods --
    const handleSaveWhatsappConfig = async (mode) => {
        setAlertMode(mode);
        setSavingWhatsapp(true);
        try {
            const { data } = await api.put(`/tenants/${tenant.id}/whatsapp/config`, {
                whatsapp_alert_mode: mode
            });
            await refreshData();
            toast.success('Configuración de WhatsApp guardada');
        } catch (error) {
            console.error('Error saving whatsapp config', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSavingWhatsapp(false);
        }
    };

    const fetchQr = async () => {
        setQrLoading(true);
        setQrCode(null);
        try {
            const { data } = await api.get(`/tenants/${tenant.id}/whatsapp/qr`);
            if (data?.base64) {
                setQrCode(data.base64);
            } else {
                toast.error('No se pudo generar el QR, intenta de nuevo.');
            }
        } catch (error) {
            console.error('Error fetching QR', error);
            toast.error('Error al obtener el código QR de WhatsApp.');
        } finally {
            setQrLoading(false);
        }
    };

    // -- General Methods --
    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = document.createElement('img');
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_SIZE = 400; // Logo doesn't need to be too large
            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                const webpFile = new File([blob], "logo.webp", { type: "image/webp" });
                setLogoFile(webpFile);
                setLogoPreview(URL.createObjectURL(webpFile));
                URL.revokeObjectURL(objectUrl);
            }, 'image/webp', 0.8);
        };
        img.src = objectUrl;
    };

    const handleSaveGeneral = async (e) => {
        e.preventDefault();
        setSavingGeneral(true);
        try {
            const formData = new FormData();
            formData.append('company_name', companyName);
            formData.append('document_id', documentId);
            formData.append('base_currency', baseCurrency);
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            // Send general info
            const { data: updatedTenant } = await api.post(`/tenants/${tenant.id}/general`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Send exchange rate and printer info
            const exData = await api.put(`/tenants/${tenant.id}/exchange-rate`, {
                ...updatedTenant.exchange_rate_config,
                sales_rate: salesRateSource,
                show_usd_catalog: showUsdCatalog,
                ticket_currency_display: ticketCurrencyDisplay,
                custom_rate: salesRateSource === 'custom' ? parseFloat(customRate) : null
            });

            await refreshData();
            toast.success('Configuración general guardada exitosamente');
        } catch (error) {
            console.error('Error saving general config', error);
            toast.error('Error al guardar configuración general');
        } finally {
            setSavingGeneral(false);
        }
    };

    const isConnected = !!tenant?.evolution_instance_id;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <SettingsIcon size={24} className="text-primary" /> Ajustes
                    </h1>
                    <p className="text-muted-foreground text-sm">Configuración general de tu tienda Kuadre</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Exchange Rate Form */}
                <form onSubmit={handleSaveGeneral} className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col settings-rates-form settings-general-form">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Store size={20} className="text-primary" />
                            Perfil de la Tienda
                        </h3>
                    </div>

                    <div className="p-6 space-y-6 flex-1">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div
                                className="w-24 h-24 shrink-0 rounded-2xl bg-secondary border border-border flex items-center justify-center overflow-hidden cursor-pointer relative group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Store size={32} className="text-muted-foreground" />
                                )}
                                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                                    <Upload size={24} className="text-white" />
                                </div>
                                <input type="file" className="hidden" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" />
                            </div>
                            <div className="flex-1 w-full min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="min-w-0">
                                    <label className="block text-sm font-bold mb-2">Nombre del Negocio</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Cédula o RIF (Opcional)</label>
                                    <input
                                        type="text"
                                        value={documentId}
                                        onChange={(e) => setDocumentId(e.target.value)}
                                        placeholder="Ej: J-12345678-9"
                                        className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">Precios en el Catálogo Público</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setShowUsdCatalog(true)}
                                    className={`border-2 rounded-2xl p-3 cursor-pointer transition-all flex items-center justify-between ${showUsdCatalog ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                >
                                    <div className="font-bold text-sm">Ambos (Principal y Ref $)</div>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${showUsdCatalog ? 'border-primary' : 'border-muted-foreground'}`}>
                                        {showUsdCatalog && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                    </div>
                                </div>
                                <div
                                    onClick={() => setShowUsdCatalog(false)}
                                    className={`border-2 rounded-2xl p-3 cursor-pointer transition-all flex items-center justify-between ${!showUsdCatalog ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                >
                                    <div className="font-bold text-sm">Solo Moneda Principal (Bs)</div>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!showUsdCatalog ? 'border-primary' : 'border-muted-foreground'}`}>
                                        {!showUsdCatalog && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">Moneda Principal del Negocio</label>
                            <select
                                value={baseCurrency}
                                onChange={(e) => setBaseCurrency(e.target.value)}
                                className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary transition-all outline-none"
                            >
                                <option value="USD">Dólares (USD)</option>
                                <option value="VES">Bolívares (VES)</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-2">Esta es la moneda en la que piensas tu negocio. Los inventarios, cálculos y gráficos se basarán en ella.</p>
                        </div>

                        {baseCurrency === 'USD' && (
                            <div className="bg-muted/10 p-5 rounded-2xl border border-border animate-in fade-in slide-in-from-top-4">
                                <label className="block text-sm font-bold mb-2">Tasa de Cambio a utilizar</label>
                                <select
                                    value={salesRateSource}
                                    onChange={(e) => setSalesRateSource(e.target.value)}
                                    className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary transition-all outline-none mb-3"
                                >
                                    <option value="binance">Binance (Promedio P2P)</option>
                                    <option value="usd_bcv">Banco Central (BCV)</option>
                                    <option value="eur_bcv">Euro BCV (EUR)</option>
                                    <option value="custom">Tasa Manual (Personalizada)</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground mt-2 opacity-70">
                                    Nota: El uso de tasas distintas a la oficial del Banco Central (BCV) es bajo la responsabilidad del usuario. Kuadre y KrecIT no se hacen responsables por el uso de tasas no oficiales.
                                </p>

                                {salesRateSource === 'custom' && (
                                    <div className="animate-in fade-in zoom-in-95">
                                        <label className="block text-xs font-bold mb-1">Tasa Manual (Bs por $)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={customRate}
                                            onChange={(e) => setCustomRate(e.target.value)}
                                            className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary transition-all outline-none"
                                            placeholder="Ej: 40.5"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-muted/10 p-5 rounded-2xl border border-border animate-in fade-in slide-in-from-top-4 mt-6">
                            <label className="block text-sm font-bold mb-2">Precios en Comprobante (Impreso y WhatsApp)</label>
                            <select
                                value={ticketCurrencyDisplay}
                                onChange={(e) => setTicketCurrencyDisplay(e.target.value)}
                                className="w-full bg-secondary text-foreground p-3 rounded-xl border border-border focus:border-primary transition-all outline-none"
                            >
                                <option value="both">Mostrar en Dólares y Bolívares (Ambos)</option>
                                <option value="usd">Solo Mostrar Dólares (USD)</option>
                                <option value="ves">Solo Mostrar Bolívares (VES)</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-2">Configura cómo quieres que el cliente vea los totales en el comprobante que se envía o imprime.</p>
                        </div>
                    </div>

                    <div className="p-6 border-t border-border mt-auto">
                        <button
                            type="submit"
                            disabled={savingGeneral}
                            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {savingGeneral ? 'Guardando...' : 'Guardar Perfil'}
                        </button>
                    </div>
                </form>

                {/* WhatsApp Config Form */}
                <div className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col settings-whatsapp-form">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" className='text-[#25D366]'>
                                <path d="M12.031 0C5.388 0 0 5.385 0 12.031c0 2.122.553 4.186 1.603 5.998L.145 24l6.15-1.613a12.012 12.012 0 005.736 1.455h.005c6.64 0 12.028-5.385 12.028-12.029C24.064 5.385 18.674 0 12.031 0zm0 22.015h-.004a9.98 9.98 0 01-5.086-1.385l-.364-.216-3.784.992.998-3.69-.237-.377A9.957 9.957 0 012.029 12.03c0-5.525 4.496-10.021 10.022-10.021 5.524 0 10.017 4.496 10.017 10.021 0 5.527-4.493 10.021-10.017 10.021zm5.502-7.514c-.302-.151-1.785-.882-2.062-.983-.277-.101-.48-.151-.682.151-.202.302-.782.983-.958 1.184-.176.202-.353.227-.655.076-.302-.151-1.274-.47-2.428-1.503-.898-.804-1.503-1.796-1.68-2.098-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.076-.151-.682-1.644-.935-2.25-.246-.593-.496-.513-.682-.522-.176-.008-.378-.01-.58-.01-.202 0-.53.076-.807.378-.277.302-1.06 1.033-1.06 2.52 0 1.487 1.085 2.924 1.236 3.125.151.202 2.128 3.253 5.157 4.557.72.311 1.282.496 1.721.635.723.231 1.382.198 1.9.12.584-.087 1.785-.731 2.036-1.436.251-.705.251-1.309.176-1.436-.075-.127-.277-.202-.579-.353z" />
                            </svg>
                            Bot de Cobranza (WhatsApp)
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Configura cómo se envían los recordatorios a tus clientes.</p>
                    </div>

                    <div className="p-6 space-y-6 flex-1">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-sm text-blue-600 mb-2">
                            <AlertCircle size={20} className="shrink-0" />
                            <p><strong>Aviso de Privacidad:</strong> Al configurar el envío automático, autorizas a Kuadre a utilizar la conexión de WhatsApp <strong>exclusivamente</strong> para enviar notificaciones (recibos y avisos). Kuadre <strong>nunca lee</strong> ni almacena tus conversaciones o mensajes entrantes.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div
                                onClick={() => handleSaveWhatsappConfig('manual')}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${alertMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold flex items-center gap-2">
                                        <Smartphone size={18} /> Manual
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${alertMode === 'manual' ? 'border-primary' : 'border-muted-foreground'}`}>
                                        {alertMode === 'manual' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Presionas un botón, se abre tu WhatsApp Web/App y tú le das a enviar.</p>
                            </div>

                            <div
                                onClick={() => handleSaveWhatsappConfig('automatic')}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${alertMode === 'automatic' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold flex items-center gap-2">
                                        <QrCode size={18} /> Automático (Bot)
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${alertMode === 'automatic' ? 'border-primary' : 'border-muted-foreground'}`}>
                                        {alertMode === 'automatic' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">El sistema envía los mensajes desde tu número de forma 100% automática e invisible.</p>
                            </div>
                        </div>

                        {alertMode === 'automatic' && (
                            <div className="bg-secondary/50 rounded-2xl p-6 border border-border animate-in slide-in-from-top-4">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div>
                                        <h4 className="font-bold mb-2">Conexión con tu WhatsApp</h4>
                                        {isConnected ? (
                                            <p className="text-sm text-emerald-500 font-bold flex items-center justify-center gap-1 mb-4">
                                                <CheckCircle2 size={16} /> Instancia generada.
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Escanea el código para vincular tu número.
                                            </p>
                                        )}
                                    </div>

                                    {qrCode ? (
                                        <div className="bg-white p-3 rounded-2xl border-4 border-[#25D366] shadow-xl">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={fetchQr}
                                            disabled={qrLoading}
                                            className="bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-[#25D366]/20 disabled:opacity-50"
                                        >
                                            {qrLoading ? <RefreshCw size={18} className="animate-spin" /> : <QrCode size={18} />}
                                            Obtener QR de Conexión
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
