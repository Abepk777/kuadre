import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Función global para omitir el tutorial en nuevos dispositivos
window.skipKuadreTour = (storageKey) => {
    localStorage.setItem(storageKey, 'true');
    const nativeCloseBtn = document.querySelector('.driver-popover-close-btn');
    if (nativeCloseBtn) {
        nativeCloseBtn.click();
    } else {
        window.location.reload();
    }
};

const baseConfig = {
    showProgress: true,
    animate: true,
    popoverClass: 'kuadre-premium-tour',
    nextBtnText: 'Siguiente ➔',
    prevBtnText: 'Atrás',
    doneBtnText: 'Finalizar',
    onRender: (popover) => {
        const translateProgress = () => {
            const progressEl = document.querySelector('.driver-popover-progress-text');
            if (progressEl && progressEl.textContent.includes('of')) {
                progressEl.textContent = progressEl.textContent.replace('of', 'de');
            }
        };
        translateProgress(); 
        setTimeout(translateProgress, 10);
        setTimeout(translateProgress, 50);
        setTimeout(translateProgress, 100);
    }
};

const Icons = {
    Home: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    BarChart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M3 3v18h18"/><rect width="4" height="7" x="7" y="10" rx="1"/><rect width="4" height="12" x="15" y="5" rx="1"/></svg>',
    TrendingUp: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    Calculator: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>',
    Package: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
    Search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    RefreshCcw: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    Link: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    ShoppingBag: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    Receipt: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>',
    Users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    Banknote: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
    Settings: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    Currency: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><path d="M11.5 15H9.8c-1 0-1.8-.8-1.8-1.8v-1.4c0-1 .8-1.8 1.8-1.8h1.4c1 0 1.8-.8 1.8-1.8V6.8c0-1-.8-1.8-1.8-1.8H9.5"/><path d="M11.5 5v10"/><path d="M22 17h-7l2-2"/><path d="M15 17l2 2"/><path d="M2 7h7L7 5"/><path d="M9 7L7 9"/></svg>',
    Smartphone: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>'
};

export const startDashboardTour = (force = false) => {
    if (!force && localStorage.getItem('kuadre_seen_dashboard_tour') === 'true') return;

    const tour = driver({
        ...baseConfig,
        steps: [
            {
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Home} Bienvenido al Dashboard</span>`,
                    description: `
                        <p class="text-muted-foreground mt-2 text-sm">Este es el corazón de tu negocio. Aquí verás cómo fluye tu dinero en tiempo real. ¡Vamos a dar un vistazo rápido!</p>
                        <div class="mt-3.5 text-left">
                            <span onclick="window.skipKuadreTour('kuadre_seen_dashboard_tour')" class="text-[9px] text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer underline underline-offset-2">
                                Ya me sé esto, omitir
                            </span>
                        </div>
                    `,
                    side: "center",
                    align: 'center'
                }
            },
            {
                element: '.stats-container',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.BarChart} Métricas al Instante</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Aquí rastreas el dinero que entra (Ventas Hoy), lo que estás fiando (Crédito) y la deuda viva en la calle (Por Cobrar).</p>',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '.profits-chart',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.TrendingUp} Gráfico de Ganancias</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Este gráfico no muestra ventas brutas, sino tu <b>Beneficio Neto</b> (Venta - Costo). Ideal para saber qué días son más rentables.</p>',
                    side: "top",
                    align: 'start'
                }
            },
            {
                element: '#calculator-widget',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Calculator} Calculadora Rápida</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Convierte rápidamente Dólares a Bolívares (o viceversa) usando tu tasa activa sin necesidad de salir de la aplicación.</p>',
                    side: "left",
                    align: 'start'
                }
            }
        ],
        onDestroyStarted: () => {
            localStorage.setItem('kuadre_seen_dashboard_tour', 'true');
            tour.destroy();
        }
    });

    setTimeout(() => tour.drive(), 500);
};

export const startInventoryTour = (force = false) => {
    if (!force && localStorage.getItem('kuadre_seen_inventory_tour') === 'true') return;

    const tour = driver({
        ...baseConfig,
        steps: [
            {
                element: '#btn-add-product',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Package} Crea un Producto</span>`,
                    description: `
                        <p class="text-muted-foreground mt-2 text-sm">Usa este botón para registrar mercancía nueva. Define precio de costo y venta para que calculemos tu ganancia en automático.</p>
                        <div class="mt-3.5 text-left">
                            <span onclick="window.skipKuadreTour('kuadre_seen_inventory_tour')" class="text-[9px] text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer underline underline-offset-2">
                                Omitir tutorial
                            </span>
                        </div>
                    `,
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '.inventory-search-bar',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Search} Búsqueda y Filtros</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Encuentra productos por nombre en milisegundos. Puedes alternar la vista entre cuadrícula (fotos) o lista compacta.</p>',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '.inventory-list-container',
                popover: {
                    title: `<span class="font-black text-emerald-500 text-xl flex items-center gap-1">${Icons.RefreshCcw} Reabastecimiento</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm"><b>¿Llegó mercancía nueva?</b> Haz clic en cualquier producto de tu lista para abrir sus detalles y ve a la pestaña <b>"Comprar / Reabastecer"</b> para sumar stock de manera correcta.</p>',
                    side: "top",
                    align: 'start'
                }
            },
            {
                element: '#btn-share-catalog',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Link} Catálogo Público</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Este botón copia un enlace a tu Catálogo en línea. Envíalo a tus clientes para que vean tus productos con fotos y precios actualizados.</p>',
                    side: "bottom",
                    align: 'start'
                }
            }
        ],
        onDestroyStarted: () => {
            localStorage.setItem('kuadre_seen_inventory_tour', 'true');
            tour.destroy();
        }
    });

    setTimeout(() => tour.drive(), 500);
};

export const startSalesTour = (force = false) => {
    if (!force && localStorage.getItem('kuadre_seen_sales_tour') === 'true') return;

    const tour = driver({
        ...baseConfig,
        steps: [
            {
                element: '.sales-product-panel',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.ShoppingBag} Catálogo de Ventas</span>`,
                    description: `
                        <p class="text-muted-foreground mt-2 text-sm">Busca un producto por su nombre o usa tu <b>Lector de Código de Barras</b> (simplemente escanea y se agregará solo). Toca un artículo para añadirlo al carrito.</p>
                        <div class="mt-3.5 text-left">
                            <span onclick="window.skipKuadreTour('kuadre_seen_sales_tour')" class="text-[9px] text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer underline underline-offset-2">
                                Omitir tutorial
                            </span>
                        </div>
                    `,
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.sales-ticket-panel',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Receipt} Ticket Actual</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Aquí verás tu factura construyéndose en tiempo real, reflejando el monto en Bolívares y Dólares simultáneamente.</p>',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '.sales-customer-selector',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Users} Cliente y Crédito</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Registra a quién le vendes. <b>Importante:</b> Para poder "fiar" (vender a crédito), debes seleccionar un cliente registrado aquí primero.</p>',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '.sales-pay-button',
                popover: {
                    title: `<span class="font-black text-emerald-500 text-xl flex items-center gap-1">${Icons.Banknote} Cobrar Factura</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Finaliza la venta indicando si pagaron en Dólares, Pago Móvil, Punto de Venta o a Crédito. ¡Al terminar podrás enviarle su factura por WhatsApp!</p>',
                    side: "left",
                    align: 'end'
                }
            }
        ],
        onDestroyStarted: () => {
            localStorage.setItem('kuadre_seen_sales_tour', 'true');
            tour.destroy();
        }
    });

    setTimeout(() => tour.drive(), 500);
};

export const startSettingsTour = (force = false) => {
    if (!force && localStorage.getItem('kuadre_seen_settings_tour') === 'true') return;

    const tour = driver({
        ...baseConfig,
        steps: [
            {
                element: '.settings-general-form',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Settings} Ajustes Generales</span>`,
                    description: `
                        <p class="text-muted-foreground mt-2 text-sm">Actualiza el nombre, logo e información de tu negocio. El logo que subas aquí aparecerá en las facturas de tus clientes.</p>
                        <div class="mt-3.5 text-left">
                            <span onclick="window.skipKuadreTour('kuadre_seen_settings_tour')" class="text-[9px] text-muted-foreground hover:text-red-500 font-medium transition-colors cursor-pointer underline underline-offset-2">
                                Omitir tutorial
                            </span>
                        </div>
                    `,
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.settings-rates-form',
                popover: {
                    title: `<span class="font-black text-primary text-xl flex items-center gap-1">${Icons.Currency} Tasas y Moneda</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Controla cómo Kuadre calcula tus precios. Puedes elegir usar la tasa oficial del <b>BCV</b>, el <b>Dólar Paralelo</b> o una <b>Tasa Personalizada</b> fija.</p>',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '.settings-whatsapp-form',
                popover: {
                    title: `<span class="font-black text-[#25D366] text-xl flex items-center gap-1">${Icons.Smartphone} Bot de WhatsApp</span>`,
                    description: '<p class="text-muted-foreground mt-2 text-sm">Escanea este código QR con tu WhatsApp. Al conectarlo, Kuadre enviará facturas digitales y recordatorios de cobro a tus clientes en piloto automático.</p>',
                    side: "top",
                    align: 'center'
                }
            }
        ],
        onDestroyStarted: () => {
            localStorage.setItem('kuadre_seen_settings_tour', 'true');
            tour.destroy();
        }
    });

    setTimeout(() => tour.drive(), 500);
};
