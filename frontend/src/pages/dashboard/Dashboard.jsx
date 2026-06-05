import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { startDashboardTour } from '../../utils/tours';
import api from '../../lib/axios';
import { db } from '../../lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users, Zap, Calculator, LayoutDashboard, ShoppingCart, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { tenant, rates } = useAuth();
    const [stats, setStats] = useState({
        sales_today: 0,
        credit_sales: 0,
        receivables: 0,
        profits_chart: []
    });
    const [loading, setLoading] = useState(true);
    const [calcUsd, setCalcUsd] = useState('');
    const [calcVes, setCalcVes] = useState('');
    const [activeRateSource, setActiveRateSource] = useState('bcv');
    const navigate = useNavigate();

    const activeRate = useMemo(() => {
        if (activeRateSource === 'bcv') return rates?.usd_bcv ? parseFloat(rates.usd_bcv) : 1;
        return rates?.usd_paralelo ? parseFloat(rates.usd_paralelo) : 1;
    }, [rates, activeRateSource]);

    const handleCalcUsd = (val) => {
        setCalcUsd(val);
        if (val === '') { setCalcVes(''); return; }
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) setCalcVes((parsed * activeRate).toFixed(2));
    };

    const handleCalcVes = (val) => {
        setCalcVes(val);
        if (val === '') { setCalcUsd(''); return; }
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) setCalcUsd((parsed / activeRate).toFixed(2));
    };

    const scrollToCalculator = () => {
        document.getElementById('calculator-widget').scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchStats = async () => {
            if (tenant) {
                try {
                    // Cargar de IndexedDB primero para respuesta inmediata
                    const cachedStats = await db.app_state.get('dashboard_stats');
                    if (cachedStats) {
                        setStats(cachedStats.data);
                        setLoading(false);
                    }

                    const { data } = await api.get('/dashboard/stats');
                    
                    // Sumar ventas offline pendientes del día de hoy
                    const pendingSales = await db.sales_queue.toArray();
                    const todayStr = new Date().toISOString().split('T')[0];
                    let offlineSalesUsd = 0;
                    let offlineProfitsUsd = 0;

                    pendingSales.forEach(sale => {
                        if (sale.created_at && sale.created_at.startsWith(todayStr)) {
                            offlineSalesUsd += parseFloat(sale.total_usd || sale.amount_usd || 0) || 0;
                            
                            // Calcular ganancia aproximada de items offline si existen
                            if (sale.items && Array.isArray(sale.items)) {
                                sale.items.forEach(item => {
                                    const cost = item.product?.avg_cost_usd || item.unit_cost_usd || 0;
                                    const price = item.unit_price_usd || item.price || 0;
                                    const qty = item.quantity || 1;
                                    offlineProfitsUsd += (parseFloat(price) - parseFloat(cost)) * parseFloat(qty);
                                });
                            } else {
                                // Si no hay items, sumamos un estimado
                                offlineProfitsUsd += (parseFloat(sale.total_usd || sale.amount_usd || 0) || 0) * 0.3; // 30% profit estimado
                            }
                        }
                    });

                    data.sales_today = (parseFloat(data.sales_today) || 0) + (offlineSalesUsd || 0);
                    data.profits_today = (parseFloat(data.profits_today) || 0) + (offlineProfitsUsd || 0);

                    const formattedChart = data.profits_chart.map(item => ({
                        ...item,
                        displayDate: new Date(item.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
                    }));
                    
                    const finalStats = { ...data, profits_chart: formattedChart };
                    
                    // Guardar en caché local
                    await db.app_state.put({ id: 'dashboard_stats', data: finalStats });
                    
                    setStats(finalStats);
                } catch (error) {
                    console.error("Error fetching stats", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchStats();
    }, [tenant, rates]);

    useEffect(() => {
        startDashboardTour();
    }, []);

    return (
        <div className="w-full mx-auto p-6 sm:p-8 flex flex-col h-full space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="text-primary" /> Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm">Resumen de tu negocio hoy.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="bg-card text-foreground font-bold px-4 py-2 rounded-xl border border-border shadow-sm flex items-center justify-center gap-2 text-sm flex-1 md:flex-none">
                        <TrendingUp size={16} className="text-emerald-500" />
                        <span className="hidden sm:inline">Tasa BCV:</span> Bs {rates?.usd_bcv ? parseFloat(rates.usd_bcv).toFixed(2) : '1.00'}
                    </div>
                    <button
                        onClick={() => navigate('/sales')}
                        className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl border border-transparent hover:brightness-110 shadow-sm flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <ShoppingCart size={16} /> <span className="hidden sm:inline">Venta Rápida</span>
                    </button>
                    <button
                        onClick={scrollToCalculator}
                        className="md:hidden bg-secondary text-foreground font-bold px-4 py-2 rounded-xl border border-border shadow-sm flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
                    >
                        <Calculator size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stats-container">
                <div className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-colors group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg text-muted-foreground mb-1">Ventas Hoy</h3>
                    {loading ? <div className="h-10 w-24 bg-muted animate-pulse rounded-md mt-auto"></div> : (
                        <div className="mt-auto">
                            <p className="text-4xl font-black text-foreground">${parseFloat(stats.sales_today).toFixed(2)}</p>
                            <p className="text-sm text-emerald-500 font-bold mt-1">
                                Ganancia: ${parseFloat(stats.profits_today || 0).toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border p-6 rounded-3xl hover:border-orange-500/50 transition-colors group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-orange-500" />
                    </div>
                    <h3 className="font-semibold text-lg text-muted-foreground mb-1">Ventas a Crédito</h3>
                    {loading ? <div className="h-10 w-16 bg-muted animate-pulse rounded-md mt-auto"></div> : (
                        <div className="mt-auto">
                            <p className="text-4xl font-black text-foreground">{stats.credit_sales}</p>
                            <p className="text-sm text-orange-500 font-bold mt-1">Transacciones pendientes</p>
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border p-6 rounded-3xl hover:border-red-500/50 transition-colors group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} className="text-red-500" />
                    </div>
                    <h3 className="font-semibold text-lg text-muted-foreground mb-1">Por Cobrar</h3>
                    {loading ? <div className="h-10 w-24 bg-muted animate-pulse rounded-md mt-auto"></div> : (
                        <div className="mt-auto">
                            <p className="text-4xl font-black text-foreground">${parseFloat(stats.receivables).toFixed(2)}</p>
                            <p className="text-sm text-red-500 font-bold mt-1">Deuda en la calle</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Fila del Gráfico y la Calculadora */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Gráfico de Ganancias */}
                <div className="lg:col-span-2 flex-grow bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col min-h-[400px] profits-chart">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold">Ganancias Netas (Últimos 7 días)</h3>
                        <p className="text-sm text-muted-foreground">Evolución del beneficio (Venta - Costo)</p>
                    </div>

                    <div className="flex-grow w-full min-h-[300px]">
                        {loading ? (
                            <div className="w-full h-full bg-muted/30 animate-pulse rounded-xl border border-dashed border-border/50"></div>
                        ) : stats.profits_chart.length > 0 ? (
                            <div className="h-[300px] w-full min-w-[200px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                    <AreaChart data={stats.profits_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis
                                            dataKey="displayDate"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                            formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, 'Ganancia']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="net_profit"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorProfit)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                                <TrendingUp size={48} className="mb-4 opacity-20" />
                                <p>No hay datos de ventas suficientes para graficar.</p>
                                <p className="text-sm">Registra ventas para ver tus ganancias aquí.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Widget Calculadora */}
                <div id="calculator-widget" className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold">Calculadora Rápida</h3>
                        <p className="text-sm text-muted-foreground">Convierte montos al instante</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => { setActiveRateSource('bcv'); setCalcUsd(''); setCalcVes(''); }}
                            className={`border rounded-2xl p-4 text-center transition-all ${activeRateSource === 'bcv' ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20' : 'bg-card border-border hover:bg-secondary'}`}
                        >
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${activeRateSource === 'bcv' ? 'text-primary/70' : 'text-muted-foreground'}`}>BCV</p>
                            <p className={`text-lg font-black ${activeRateSource === 'bcv' ? 'text-primary' : 'text-foreground'}`}>Bs. {rates?.usd_bcv ? parseFloat(rates.usd_bcv).toFixed(2) : '0.00'}</p>
                        </button>
                        <button
                            onClick={() => { setActiveRateSource('binance'); setCalcUsd(''); setCalcVes(''); }}
                            className={`border rounded-2xl p-4 text-center transition-all ${activeRateSource === 'binance' ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20' : 'bg-card border-border hover:bg-secondary'}`}
                        >
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${activeRateSource === 'binance' ? 'text-primary/70' : 'text-muted-foreground'}`}>USDT Binance</p>
                            <p className={`text-lg font-black ${activeRateSource === 'binance' ? 'text-primary' : 'text-foreground'}`}>Bs. {rates?.usd_paralelo ? parseFloat(rates.usd_paralelo).toFixed(2) : '0.00'}</p>
                        </button>
                    </div>

                    <div className="space-y-4 flex-grow">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground ml-1">Monto en Dólares ($)</label>
                            <div className="relative mt-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="number"
                                    value={calcUsd}
                                    onChange={(e) => handleCalcUsd(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 font-bold focus:outline-none focus:border-primary transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="bg-background border border-border p-1 rounded-full text-muted-foreground">
                                ⇌
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground ml-1">Monto en Bolívares (Bs)</label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Bs</span>
                                <input
                                    type="number"
                                    value={calcVes}
                                    onChange={(e) => handleCalcVes(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 font-bold focus:outline-none focus:border-primary transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center mt-4 uppercase tracking-widest font-bold">
                        Las tasas USDT Binance son referenciales y no representan la tasa oficial del país.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
