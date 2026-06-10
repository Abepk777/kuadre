import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart,
    Users, CreditCard, Settings, LogOut, AlertCircle, Download, Receipt, Store, MessageCircle, Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import logoHorizontalClaro from '../assets/Recurso 11logo-horizontal-modoclaro.svg';
import logoHorizontalOscuro from '../assets/Recurso 12logo-horizontal-modooscuro.svg';
import toast from 'react-hot-toast';

const Sidebar = ({ isOpen, toggleSidebar, isLocked }) => {
    const { user, logout } = useAuth();
    const { theme } = useTheme();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const checkInstallable = () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstallable(false);
            } else if (window.deferredPrompt) {
                setIsInstallable(true);
            }
        };
        
        checkInstallable();
        
        const handleBeforeInstallPrompt = (e) => {
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstallable(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!window.deferredPrompt) {
            toast.error('La instalación no está disponible en este momento. Intente abrir la app en Chrome o Safari.');
            return;
        }
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
        }
        window.deferredPrompt = null;
    };

    let menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/dashboard', roles: ['tenant'] },
        { name: 'Ventas', icon: <ShoppingCart size={22} />, path: '/sales', roles: ['tenant', 'employee'] },
        { name: 'Historial', icon: <Receipt size={22} />, path: '/history', roles: ['tenant'] },
        { name: 'Inventario', icon: <Package size={22} />, path: '/inventory', roles: ['tenant'] },
        { name: 'Créditos', icon: <CreditCard size={22} />, path: '/credits', roles: ['tenant'] },
        { name: 'Empleados', icon: <Users size={22} />, path: '/employees', roles: ['tenant'] },
        { name: 'Suscripción', icon: <Store size={22} />, path: '/billing', roles: ['tenant'] },
        { name: 'Ajustes', icon: <Settings size={22} />, path: '/settings', roles: ['tenant'] },
        { name: 'SuperAdmin', icon: <Shield size={22} />, path: '/admin', roles: ['superadmin', 'admin'] },
    ];

    if (user?.role) {
        menuItems = menuItems.filter(item => item.roles.includes(user.role));
    }

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            <aside className={`
                fixed top-0 left-0 z-50 h-[100dvh] transition-transform duration-300
                w-72 bg-card border-r border-border flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-8 flex items-center justify-center">
                    <img src={theme === 'dark' ? logoHorizontalOscuro : logoHorizontalClaro} alt="Kuadre Logo" className="h-14 w-auto" />
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isDisabled = isLocked && item.path !== '/billing';

                        return (
                            <NavLink
                                key={item.path}
                                to={isDisabled ? '#' : item.path}
                                end={item.path === '/sales' || item.path === '/dashboard'}
                                onClick={(e) => {
                                    if (isDisabled) {
                                        e.preventDefault();
                                        return;
                                    }
                                    if (window.innerWidth < 1024) toggleSidebar();
                                }}
                                className={({ isActive }) => `
                                    flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 group
                                    ${isDisabled
                                        ? 'opacity-30 cursor-not-allowed grayscale'
                                        : isActive
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}
                                `}
                            >
                                <span className={`transition-colors ${isDisabled ? '' : 'group-hover:text-primary'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm tracking-tight flex-1">
                                    {item.name}
                                </span>
                                {isDisabled && (
                                    <span className="text-[10px] text-red-500 font-black tracking-widest uppercase">
                                        <AlertCircle size={14} />
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="flex flex-col gap-2 p-6 border-t border-border mt-auto">
                    {/* Install App Button */}
                    <button
                        onClick={handleInstallClick}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors mt-2 font-bold"
                    >
                        <Download size={22} />
                        <span className="text-sm font-medium">Instalar App</span>
                    </button>
                    {/* Support Button */}
                    <a
                        href="https://wa.me/584123391516"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-emerald-500 font-bold hover:bg-emerald-500/10 transition-colors mt-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <path d="M12.031 0C5.388 0 0 5.385 0 12.031c0 2.122.553 4.186 1.603 5.998L.145 24l6.15-1.613a12.012 12.012 0 005.736 1.455h.005c6.64 0 12.028-5.385 12.028-12.029C24.064 5.385 18.674 0 12.031 0zm0 22.015h-.004a9.98 9.98 0 01-5.086-1.385l-.364-.216-3.784.992.998-3.69-.237-.377A9.957 9.957 0 012.029 12.03c0-5.525 4.496-10.021 10.022-10.021 5.524 0 10.017 4.496 10.017 10.021 0 5.527-4.493 10.021-10.017 10.021zm5.502-7.514c-.302-.151-1.785-.882-2.062-.983-.277-.101-.48-.151-.682.151-.202.302-.782.983-.958 1.184-.176.202-.353.227-.655.076-.302-.151-1.274-.47-2.428-1.503-.898-.804-1.503-1.796-1.68-2.098-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.076-.151-.682-1.644-.935-2.25-.246-.593-.496-.513-.682-.522-.176-.008-.378-.01-.58-.01-.202 0-.53.076-.807.378-.277.302-1.06 1.033-1.06 2.52 0 1.487 1.085 2.924 1.236 3.125.151.202 2.128 3.253 5.157 4.557.72.311 1.282.496 1.721.635.723.231 1.382.198 1.9.12.584-.087 1.785-.731 2.036-1.436.251-.705.251-1.309.176-1.436-.075-.127-.277-.202-.579-.353z" />
                        </svg>
                        <span className="text-sm font-medium">Soporte Técnico</span>
                    </a>

                    {/* Logout Button */}
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 font-bold hover:bg-red-500/10 transition-colors mt-2"
                    >
                        <LogOut size={22} />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                    <a href="https://krecit.com" target="_blank" rel="noopener noreferrer" className="text-center text-[11px] text-muted-foreground hover:text-primary transition-colors mt-2 pb-2 block w-full">
                        Impulsado por <span className="font-black tracking-wider">KRECIT</span>
                    </a>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
