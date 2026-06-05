import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSync } from '../hooks/useSync';
import { useLocation } from 'react-router-dom';
import { startDashboardTour, startInventoryTour, startSalesTour, startSettingsTour } from '../utils/tours';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeToPushNotifications } from '../lib/push';

const MainLayout = ({ children }) => {
    const { user, tenant, refreshData } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { triggerSync } = useSync();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Request Push Notification permissions and subscribe
        subscribeToPushNotifications();
    }, []);

    // Lógica de bloqueo
    // Verificamos de forma local la fecha para efectos visuales (el backend valida la seguridad real)
    const isLocked = (() => {
        if (!tenant) return false;
        const endsAt = tenant.trial_ends_at || tenant.subscription_ends_at;
        if (!endsAt) return true; // Si no hay fecha, está bloqueado por defecto
        const endDate = new Date(endsAt);
        const now = new Date();
        return now > endDate;
    })();

    // Lógica de banner preventivo
    const showWarningBanner = (() => {
        if (!tenant || isLocked) return false;
        const endsAt = tenant.trial_ends_at || tenant.subscription_ends_at;
        if (!endsAt) return false;
        const endDate = new Date(endsAt);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        return daysLeft > 0 && daysLeft <= 5 ? daysLeft : false;
    })();

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Disparar ambas actualizaciones concurrentemente
        await Promise.all([
            refreshData(),
            triggerSync()
        ]);
        setTimeout(() => setIsRefreshing(false), 800); // Visual delay
    };

    const handleHelpClick = () => {
        if (location.pathname === '/dashboard') startDashboardTour(true);
        else if (location.pathname === '/inventory') startInventoryTour(true);
        else if (location.pathname === '/sales') startSalesTour(true);
        else if (location.pathname === '/settings') startSettingsTour(true);
        else toast('El tutorial interactivo no está disponible en esta pantalla.', { icon: 'ℹ️' });
    };

    return (
        <div className="h-[100dvh] bg-background overflow-hidden flex flex-col font-sans">
            
            {/* BANNER DE ADVERTENCIA PREVENTIVA */}
            {showWarningBanner && (
                <div className="bg-yellow-500 text-yellow-950 text-xs font-bold tracking-wider py-2 px-4 text-center z-[9999] shrink-0 flex items-center justify-center gap-2">
                    <span>⚠️ TU SUSCRIPCIÓN VENCE EN {showWarningBanner} DÍAS.</span>
                    <a href="/billing" className="underline hover:opacity-80 transition-opacity">RENOVAR AHORA</a>
                </div>
            )}

            {/* BANNER DE BLOQUEO TOTAL EN VISTA BILLING */}
            {isLocked && (
                <div className="bg-red-500 text-white text-xs font-bold tracking-wider py-2 px-4 text-center z-[9999] shrink-0 uppercase">
                    🚫 TU SUSCRIPCIÓN HA EXPIRADO. DEBES PAGAR PARA DESBLOQUEAR EL SISTEMA.
                </div>
            )}

            <div className="flex flex-1 overflow-hidden relative">
                
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    isLocked={isLocked} 
                />
                
                <div className="flex-1 flex flex-col min-w-0 lg:ml-72 bg-secondary/30">
                    <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30 shrink-0">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-muted-foreground p-2 -ml-2">
                            <Menu size={24} />
                        </button>
                        
                        <div className="flex-1"></div>
                        
                        <div className="flex items-center gap-3 sm:gap-6">
                            {/* BOTÓN REFRESH */}
                            <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10 disabled:opacity-50"
                                title="Sincronizar Datos"
                            >
                                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>

                            {/* BOTÓN AYUDA GLOBAL */}
                            <button 
                                onClick={handleHelpClick}
                                className="flex items-center gap-2 p-1.5 px-3 bg-secondary text-secondary-foreground border border-border rounded-full cursor-pointer hover:bg-secondary/80 transition-colors font-bold text-xs shadow-sm"
                                title="Activar Tutorial de la Pantalla"
                            >
                                <AlertCircle size={16} /> <span className="hidden sm:inline">Ayuda</span>
                            </button>

                            {/* TOGGLE PILL TEMA */}
                            <div 
                                onClick={toggleTheme}
                                className="flex items-center gap-1 p-1 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full cursor-pointer hover:bg-black/15 dark:hover:bg-white/10 transition-colors"
                                title="Cambiar Tema"
                            >
                                <div className={`p-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${theme === 'light' ? 'bg-white shadow-md text-yellow-500 scale-110' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    <Sun size={16} />
                                </div>
                                <div className={`p-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${theme === 'dark' ? 'bg-[#0b141a] shadow-md text-emerald-400 scale-110 border border-white/5' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Moon size={16} />
                                </div>
                            </div>

                            {/* PERFIL */}
                            <div className="flex items-center gap-3 pl-4 border-l border-border">
                                <div className="text-right hidden sm:block">
                                    <p className="text-foreground text-sm font-bold leading-none mb-1">{tenant?.company_name || 'Sin Negocio'}</p>
                                    <p className="text-[10px] text-primary font-medium tracking-wider uppercase opacity-80">
                                        {{
                                            'superadmin': 'Súper Admin',
                                            'admin': 'Administrador',
                                            'tenant': 'Tienda',
                                            'cashier': 'Cajero',
                                            'employee': 'Empleado'
                                        }[user?.role] || user?.role || 'Staff'}
                                    </p>
                                </div>
                                {tenant?.logo_url ? (
                                    <div className="h-10 w-10 rounded-xl overflow-hidden border border-border shrink-0">
                                        <img src={tenant.logo_url} alt="Logo de Tienda" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                    
                    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
