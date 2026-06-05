import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Image as ImageIcon, Store, TrendingDown } from 'lucide-react';
import api from '../../lib/axios';
import logoHorizontalClaro from '../../assets/Recurso 11logo-horizontal-modoclaro.svg';
import logoHorizontalOscuro from '../../assets/Recurso 12logo-horizontal-modooscuro.svg';

const Catalog = () => {
    const { tenantId } = useParams();
    const [dataPayload, setDataPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const { data } = await api.get(`/catalog/${tenantId}`);
                setDataPayload(data);
            } catch (err) {
                console.error("Error fetching catalog", err);
                setError("No se pudo cargar el catálogo. Verifica que el enlace sea correcto.");
            } finally {
                setLoading(false);
            }
        };

        if (tenantId) {
            fetchCatalog();
        }
    }, [tenantId]);

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
                <div className="bg-card p-8 rounded-3xl border border-border">
                    <Store size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">Catálogo no disponible</h2>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    const products = dataPayload?.products || [];
    const rates = dataPayload?.rates || { usd_bcv: 1, usd_paralelo: 1 };
    const tenantInfo = dataPayload?.tenant || { company_name: 'Tienda' };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    // Lógica para cálculo de precios
    // Asumimos que los precios de los productos en base de datos (price_usd) se calculan en base a la tasa oficial para el público (BCV)
    // y el efectivo callejero es el Paralelo (Binance).
    const bcvRate = parseFloat(rates.usd_bcv || 1);
    const paraleloRate = parseFloat(rates.usd_paralelo || 1);

    const activeRate = tenantInfo.exchange_rate_config?.sales_rate === 'binance' ? paraleloRate : bcvRate;
    const isStoreVES = tenantInfo.base_currency === 'VES';

    // El Ahorro: la diferencia porcentual entre BCV y Paralelo. 
    // Solo aplica si el negocio está en USD y cobra al paralelo. Si está en VES todo es lineal.
    const savingsPercent = (!isStoreVES && bcvRate > 0 && paraleloRate > bcvRate)
        ? ((paraleloRate - bcvRate) / paraleloRate * 100).toFixed(0)
        : 0;

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header del Catálogo */}
            <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-black text-xl shadow-lg uppercase">
                            {tenantInfo.company_name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-black leading-none tracking-tight">{tenantInfo.company_name}</h1>
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                Tasa del día: Bs {bcvRate.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Buscador */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input
                            type="text"
                            placeholder="¿Qué estás buscando hoy?"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm md:text-base"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-6">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-card rounded-3xl p-4 border border-border h-56 animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>No se encontraron productos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        {filteredProducts.map(product => {
                            let mainPrice, mainSymbol, subPrice, subSymbol, showSub;

                            const basePrice = parseFloat(product.price_usd || 0);

                            if (isStoreVES) {
                                mainPrice = basePrice;
                                mainSymbol = 'Bs';
                                subPrice = basePrice / activeRate;
                                subSymbol = '$';
                                showSub = true;
                            } else {
                                if (tenantInfo.exchange_rate_config?.show_usd_catalog === false) {
                                    mainPrice = basePrice * activeRate;
                                    mainSymbol = 'Bs';
                                    subPrice = 0;
                                    showSub = false;
                                } else {
                                    mainPrice = basePrice;
                                    mainSymbol = '$';
                                    subPrice = basePrice * activeRate;
                                    subSymbol = 'Bs';
                                    showSub = true;
                                }
                            }

                            return (
                                <div key={product.id} className="bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col h-full">
                                    <div className="h-32 md:h-48 bg-muted/30 relative flex items-center justify-center border-b border-border shrink-0">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={32} className="text-muted-foreground/30 md:w-12 md:h-12" />
                                        )}
                                        {product.stock <= 0 && (
                                            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">Agotado</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-sm md:text-base leading-tight truncate mb-2" title={product.name}>{product.name}</h3>

                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <div className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Precio</div>
                                                    <div className="text-xl md:text-2xl font-black text-primary leading-none">
                                                        {mainSymbol}{mainPrice.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>

                                            {showSub && (
                                                <div className="bg-secondary/30 p-2.5 rounded-xl border border-border mt-2">
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Equivalente</div>
                                                    <div className="font-bold">{subSymbol} {subPrice.toFixed(2)}</div>
                                                </div>
                                            )}
                                        </div>

                                        {savingsPercent > 0 && (
                                            <div className="mt-3 bg-emerald-500/10 text-emerald-500 text-[10px] md:text-xs font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 border border-emerald-500/20">
                                                <TrendingDown size={14} />
                                                Ahorras {savingsPercent}% en Efectivo $
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <a href="https://kuadre.krecit.com" target="_blank" rel="noopener noreferrer" className="flex justify-center items-center py-15 text-muted-foreground text-xs font-medium transition-opacity">
                <span>Impulsado por</span>
                <img src={logoHorizontalClaro} alt="Kuadre" className="h-6 ml-4 dark:hidden" />
                <img src={logoHorizontalOscuro} alt="Kuadre" className="h-6 ml-4 hidden dark:block" />
            </a>
        </div>
    );
};

export default Catalog;
