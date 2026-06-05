import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/db';
import { useSync } from '../../hooks/useSync';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Zap, ArrowRight, X, ShoppingBag, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePrinter } from '../../hooks/usePrinter';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import TicketTemplate from '../../components/TicketTemplate';
import { Check, AlertCircle } from 'lucide-react';
import { startSalesTour } from '../../utils/tours';

const Sales = () => {
    const { rates, tenant } = useAuth();
    const { triggerSync } = useSync();
    
    // UI States
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('payment'); // 'payment' | 'success'
    const [completedSaleMock, setCompletedSaleMock] = useState(null);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('salesViewMode') || 'grid');
    const [sendReceipt, setSendReceipt] = useState(true);
    const [printerEnabled, setPrinterEnabled] = useState(() => localStorage.getItem('printerEnabled') === 'true');
    const [printerType, setPrinterType] = useState(() => localStorage.getItem('printerType') || 'usb');

    const { printReceipt, connectUSB, isConnected: isPrinterConnected } = usePrinter();

    // Referencias
    const ticketRef = React.useRef(null);
    
    // Funciones Adicionales
    const [discount, setDiscount] = useState(0);
    const [applyTax, setApplyTax] = useState(false);
    
    // Checkout States
    const [paymentMethod, setPaymentMethod] = useState('efectivo_usd');
    const [amountReceivedUsd, setAmountReceivedUsd] = useState('');
    const [amountReceivedVes, setAmountReceivedVes] = useState('');
    
    // Customer States
    const [isGenericCustomer, setIsGenericCustomer] = useState(true);
    const [customerIdNumber, setCustomerIdNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhonePrefix, setCustomerPhonePrefix] = useState('0412');
    const [customerPhoneNumber, setCustomerPhoneNumber] = useState('');
    
    // Receipt States
    // sendReceipt was moved to the top
    
    // Credit States
    const [creditMode, setCreditMode] = useState('1'); // '1', '2', 'custom'
    const [installments, setInstallments] = useState([]);

    const rateConfig = tenant?.exchange_rate_config || { sales_rate: 'bcv' };
    
    const activeRate = useMemo(() => {
        if (rateConfig.sales_rate === 'binance' && rates?.usd_binance) return parseFloat(rates.usd_binance);
        if (rateConfig.sales_rate === 'custom' && rateConfig.custom_rate) return parseFloat(rateConfig.custom_rate);
        return rates?.usd_bcv ? parseFloat(rates.usd_bcv) : 1;
    }, [rates, rateConfig]);
    
    const rateSourceLabel = rateConfig.sales_rate === 'binance' ? 'Binance' : (rateConfig.sales_rate === 'custom' ? 'Propia' : 'BCV');
    const isStoreVES = tenant?.base_currency === 'VES';

    const cartSubtotalUsd = useMemo(() => {
        return cart.reduce((total, item) => total + (item.unit_price_usd * item.quantity), 0);
    }, [cart]);

    const cartDiscountUsd = discount || 0;
    const cartTaxUsd = applyTax ? (cartSubtotalUsd - cartDiscountUsd) * 0.16 : 0;
    
    const cartTotalUsd = Math.max(0, cartSubtotalUsd - cartDiscountUsd + cartTaxUsd);
    const cartTotalVes = cartTotalUsd * activeRate;

    // Cargar inventario desde IndexedDB
    useEffect(() => {
        const loadProducts = async () => {
            const allProducts = await db.products.toArray();
            setProducts(allProducts);
        };
        loadProducts();
    }, []);

    useEffect(() => {
        startSalesTour();
    }, []);

    // Buscar cliente por cédula offline
    useEffect(() => {
        localStorage.setItem('salesViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('printerEnabled', printerEnabled);
    }, [printerEnabled]);

    useEffect(() => {
        localStorage.setItem('printerType', printerType);
    }, [printerType]);

    useEffect(() => {
        if (!isGenericCustomer && (customerIdNumber.length === 7 || customerIdNumber.length === 8)) {
            db.customers.get(customerIdNumber).then(customer => {
                if (customer) {
                    setCustomerName(customer.name);
                    if (customer.phone) {
                        const phone = customer.phone;
                        if (phone.startsWith('+58')) {
                            const prefix = '0' + phone.substring(3, 6);
                            const number = phone.substring(6);
                            setCustomerPhonePrefix(prefix);
                            setCustomerPhoneNumber(number);
                        }
                    }
                }
            });
        }
    }, [customerIdNumber, isGenericCustomer]);

    // Calcular cuotas de crédito automáticamente
    useEffect(() => {
        if (paymentMethod !== 'credito') return;
        const now = new Date();
        if (creditMode === '1') {
            const date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            setInstallments([{ amount_usd: cartTotalUsd, due_date: date.toISOString().split('T')[0] }]);
        } else if (creditMode === '2') {
            const d1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const d2 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
            const half = (cartTotalUsd / 2).toFixed(2);
            setInstallments([
                { amount_usd: parseFloat(half), due_date: d1.toISOString().split('T')[0] },
                { amount_usd: cartTotalUsd - parseFloat(half), due_date: d2.toISOString().split('T')[0] }
            ]);
        }
    }, [creditMode, cartTotalUsd, paymentMethod]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [products, search]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev; // No exceder stock
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            let unitUsd = parseFloat(product.price_usd || 0);
            
            // Si el producto se vende por peso, empezar con cantidad vacía para que la tipeen.
            const initialQty = product.unit_type === 'unit' ? 1 : ''; 

            return [...prev, { product, quantity: initialQty, unit_price_usd: unitUsd }];
        });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchValue = e.target.value.toLowerCase();
            
            // Buscar coincidencia exacta por nombre (o código de barras si lo hubiera)
            const exactMatch = products.find(p => p.name.toLowerCase() === searchValue);
            const matches = products.filter(p => p.name.toLowerCase().includes(searchValue));

            const productToAdd = exactMatch || (matches.length === 1 ? matches[0] : null);

            if (productToAdd && productToAdd.stock > 0) {
                addToCart(productToAdd);
                setSearch(''); // Limpiar para el siguiente código de barras
            }
        }
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQuantity = item.quantity + delta;
                if (newQuantity < 0) return item;
                if (newQuantity > item.product.stock) return item;
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const setQuantityDirect = (productId, val) => {
        const num = parseFloat(val);
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                // If it's empty string we keep it empty temporarily so the user can type "0.5"
                if (val === '') return { ...item, quantity: '' };
                if (isNaN(num)) return item;
                if (num > item.product.stock) return { ...item, quantity: item.product.stock };
                return { ...item, quantity: num };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const customerPhoneFormatted = customerPhoneNumber ? '+58' + customerPhonePrefix.substring(1) + customerPhoneNumber : null;
        
        let receiptBase64 = null;
        if (sendReceipt && !isGenericCustomer) {
            toast.loading('Capturando comprobante...', { id: 'receipt' });
            await new Promise(resolve => setTimeout(resolve, 150));
            if (ticketRef.current) {
                try {
                    receiptBase64 = await toPng(ticketRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
                    toast.success('Comprobante capturado.', { id: 'receipt' });
                } catch (e) {
                    console.error("Error toPng:", e);
                    toast.error('Fallo captura.', { id: 'receipt' });
                }
            }
        }

        const saleId = 'LOCAL-' + Date.now();
        const saleData = {
            id: saleId,
            total_usd: cartTotalUsd,
            status: paymentMethod === 'credito' ? 'pending_credit' : 'completed',
            send_receipt: sendReceipt,
            customer: isGenericCustomer ? null : {
                id_number: customerIdNumber,
                name: customerName,
                phone: customerPhoneFormatted
            },
            items: cart.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_cost_usd: parseFloat(item.product.cost_usd || 0),
                unit_price_usd: item.unit_price_usd
            })),
            payments: paymentMethod !== 'credito' ? [{
                method: paymentMethod,
                amount_usd: cartTotalUsd,
                amount_ves: ['pago_movil', 'efectivo_ves', 'punto_venta'].includes(paymentMethod) ? cartTotalVes : null,
                exchange_rate_used: activeRate
            }] : [],
            credit: paymentMethod === 'credito' ? {
                total_debt_usd: cartTotalUsd,
                remaining_debt_usd: cartTotalUsd,
                due_date: installments.length > 0 ? installments[installments.length-1].due_date : null,
                customer_phone: customerPhoneFormatted || null,
                installments: installments
            } : null,
            discount_usd: cartDiscountUsd,
            tax_usd: cartTaxUsd,
            created_at: new Date().toISOString(),
            receipt_base64: receiptBase64
        };

        const currentMockSale = {
            id: saleId,
            created_at: saleData.created_at,
            total_usd: cartTotalUsd,
            customer: saleData.customer,
            items: cart.map(item => ({
                product: item.product,
                quantity: item.quantity,
                unit_price_usd: item.unit_price_usd
            }))
        };

        // Guardar en la cola local
        await db.sales_queue.add({
            ...saleData,
            status: 'pending' // Estado de sincronización local
        });

        // Actualizar stock local temporalmente
        const updates = cart.map(item => {
            return db.products.update(item.product.id, {
                stock: item.product.stock - item.quantity
            });
        });
        await Promise.all(updates);
        
        // Recargar stock local en la vista
        const updatedProducts = await db.products.toArray();
        setProducts(updatedProducts);

        // Limpiar carrito pero no cerrar modal, ir a success
        setCompletedSaleMock(currentMockSale);
        setCheckoutStep('success');
        setCart([]);
        setAmountReceivedUsd('');
        setAmountReceivedVes('');
        setIsGenericCustomer(true);
        setCustomerIdNumber('');
        setCustomerName('');
        setCustomerPhonePrefix('0412');
        setCustomerPhoneNumber('');
        setInstallments([]);
        
        toast.success('¡Venta registrada exitosamente!');

        if (printerEnabled && printerType === 'usb') {
            await printReceipt(saleData, tenant, isStoreVES, activeRate);
        }

        // Intentar sincronizar en segundo plano
        triggerSync();
    };

    const handleDownloadFromSuccess = async (format = 'pdf') => {
        try {
            toast.loading(`Generando ${format === 'pdf' ? 'PDF' : 'Imagen'}...`, { id: 'download' });
            if (!ticketRef.current) throw new Error("El recibo no está listo");

            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(ticketRef.current, { 
                cacheBust: true, 
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            if (format === 'image') {
                const link = document.createElement('a');
                link.download = `Comprobante_Kuadre_${completedSaleMock.id}.png`;
                link.href = dataUrl;
                link.click();
            } else {
                const mmWidth = 80;
                const mmHeight = (ticketRef.current.offsetHeight * mmWidth) / 400;
                
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [mmWidth, mmHeight]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, mmWidth, mmHeight);
                pdf.save(`Comprobante_Kuadre_${completedSaleMock.id}.pdf`);
            }
            
            toast.success('Descargado exitosamente', { id: 'download' });
        } catch (error) {
            console.error(error);
            toast.error('Error al generar', { id: 'download' });
        }
    };

    // Objeto temporal de la venta para que el TicketTemplate lo renderice en vivo
    const mockSale = {
        id: '000000',
        created_at: new Date().toISOString(),
        total_usd: cartTotalUsd,
        customer: isGenericCustomer ? null : {
            name: customerName,
            id_number: customerIdNumber,
            phone: customerPhoneNumber ? '+58' + customerPhonePrefix.substring(1) + customerPhoneNumber : null
        },
        items: cart.map(item => ({
            product: item.product,
            quantity: item.quantity,
            unit_price_usd: item.unit_price_usd
        }))
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 animate-in fade-in duration-500">
            {/* Oculto: Plantilla de Ticket para Capturar */}
            <div className="overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none">
                <div className="w-[400px]">
                    <TicketTemplate ref={ticketRef} sale={checkoutStep === 'success' ? completedSaleMock : mockSale} tenant={tenant} activeRate={activeRate} />
                </div>
            </div>
            
            {/* LADO IZQUIERDO: PRODUCTOS */}
            <div className={`flex-grow flex flex-col min-w-0 bg-card border border-border overflow-hidden ${isMobileMenuOpen ? 'fixed inset-0 z-[60] rounded-none' : 'hidden lg:flex rounded-3xl'} sales-product-panel`}>
                {isMobileMenuOpen && (
                    <div className="p-4 bg-background border-b border-border flex items-center justify-between lg:hidden shrink-0">
                        <h2 className="font-black text-xl">Agregar Productos</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-secondary rounded-xl text-muted-foreground hover:text-foreground">
                            <X size={24} />
                        </button>
                    </div>
                )}
                <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm z-10 flex flex-wrap items-center gap-4 shrink-0">
                    <div className="relative flex-grow min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar producto o escanear código..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full bg-secondary border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm md:text-base"
                            autoFocus
                        />
                    </div>
                    <div className="flex bg-secondary border border-border rounded-2xl p-1 shrink-0">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                            title="Vista Cuadrícula"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                            title="Vista Lista"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                    if (tenant?.exchange_rate_config?.show_usd_pos === false) {
                                        mainPrice = basePrice * activeRate;
                                        mainSymbol = 'Bs';
                                        subPrice = 0;
                                        subSymbol = '$';
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
                                <div 
                                    key={product.id}
                                    onClick={() => {
                                        if (product.stock > 0) {
                                            addToCart(product);
                                            toast.success(`${product.name} agregado`);
                                        }
                                    }}
                                    className={`relative bg-secondary/30 border border-border rounded-2xl p-4 cursor-pointer transition-all hover:border-primary/50 hover:bg-secondary/50 group ${product.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <div className="aspect-square bg-muted/20 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-border/50">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <ShoppingBag size={32} className="text-muted-foreground/30" />
                                        )}
                                    </div>
                                    <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-2" title={product.name}>{product.name}</h3>
                                    <div className="flex items-end justify-between mt-auto">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-mono">Stock: {product.unit_type === 'unit' ? Math.floor(product.stock) : product.stock}</p>
                                            <p className="font-black text-primary text-base leading-none">{mainSymbol}{mainPrice.toFixed(2)}</p>
                                            {showSub && <p className="text-xs font-bold text-green-500 mt-0.5">{subSymbol}{subPrice.toFixed(2)}</p>}
                                        </div>
                                        <button className="bg-primary/10 text-primary p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {product.stock <= 0 && (
                                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">Agotado</span>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
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
                                    if (tenant?.exchange_rate_config?.show_usd_pos === false) {
                                        mainPrice = basePrice * activeRate;
                                        mainSymbol = 'Bs';
                                        subPrice = 0;
                                        subSymbol = '$';
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
                                <div 
                                    key={product.id}
                                    onClick={() => {
                                        if (product.stock > 0) {
                                            addToCart(product);
                                            toast.success(`${product.name} agregado`);
                                        }
                                    }}
                                    className={`bg-secondary/30 border border-border rounded-2xl p-3 flex items-center gap-4 cursor-pointer transition-all hover:border-primary/50 hover:bg-secondary/50 group ${product.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center overflow-hidden border border-border/50 shrink-0 relative">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <ShoppingBag size={24} className="text-muted-foreground/30" />
                                        )}
                                        {product.stock <= 0 && (
                                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[1px]">
                                                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Agotado</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm md:text-base leading-tight truncate mb-1" title={product.name}>{product.name}</h3>
                                        <p className="text-xs text-muted-foreground font-mono">Stock disponible: {product.unit_type === 'unit' ? Math.floor(product.stock) : product.stock}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 gap-1">
                                        <p className="font-black text-primary text-lg leading-none">{mainSymbol}{mainPrice.toFixed(2)}</p>
                                        {showSub && <p className="text-sm font-bold text-green-500">{subSymbol}{subPrice.toFixed(2)}</p>}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                    
                    {filteredProducts.length === 0 && (
                            <div className="col-span-full py-20 text-center text-muted-foreground">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-medium">No se encontraron productos.</p>
                                <p className="text-sm opacity-70">Revisa que haya inventario descargado.</p>
                            </div>
                        )}
                </div>
            </div>

            {/* LADO DERECHO: TICKET DE VENTA (o Carrito) */}
            <div className="lg:w-[380px] xl:w-[420px] bg-card border-x border-border flex flex-col h-full z-20 shrink-0 sales-ticket-panel">
                <div className="p-6 border-b border-border bg-secondary/30 shrink-0">
                    <h2 className="font-black text-xl flex items-center gap-2">
                        <ShoppingCart className="text-primary" /> Ticket Actual
                    </h2>
                </div>

                {/* BOTÓN PARA MÓVILES */}
                <div className="p-4 lg:hidden shrink-0 border-b border-border bg-background">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="w-full py-4 bg-primary text-primary-foreground font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                        <Plus size={22} className="stroke-[3]" /> Añadir Producto
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {cart.map(item => {
                        let itemMainPrice, itemMainTotal, itemSubTotal, subSymbol, showSub;
                        
                        if (isStoreVES) {
                            itemMainPrice = item.unit_price_usd;
                            itemMainTotal = itemMainPrice * (item.quantity || 0);
                            showSub = false;
                        } else {
                            if (tenant?.exchange_rate_config?.show_usd_pos === false) {
                                itemMainPrice = item.unit_price_usd * activeRate;
                                itemMainTotal = itemMainPrice * (item.quantity || 0);
                                showSub = false;
                            } else {
                                itemMainPrice = item.unit_price_usd;
                                itemMainTotal = itemMainPrice * (item.quantity || 0);
                                itemSubTotal = itemMainTotal * activeRate;
                                subSymbol = 'Bs';
                                showSub = true;
                            }
                        }
                        
                        return (
                        <div key={item.product.id} className="bg-secondary/50 border border-border rounded-2xl p-3 flex gap-3 relative group">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate">{item.product.name}</h4>
                                <div className="text-xs font-mono text-muted-foreground mt-1">
                                    {isStoreVES || tenant?.exchange_rate_config?.show_usd_pos === false ? 'Bs' : '$'}{itemMainPrice.toFixed(2)} x {item.quantity || 0} {item.product.unit_type} = {isStoreVES || tenant?.exchange_rate_config?.show_usd_pos === false ? 'Bs' : '$'}{itemMainTotal.toFixed(2)}
                                    {showSub && ` (${subSymbol}${itemSubTotal.toFixed(2)})`}
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-between gap-2 shrink-0">
                                <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                                <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                                    {item.product.unit_type === 'unit' && (
                                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-secondary rounded-md transition-colors"><Minus size={14}/></button>
                                    )}
                                    <input 
                                        type="number"
                                        step={item.product.unit_type === 'unit' ? '1' : '0.001'}
                                        value={item.quantity}
                                        onChange={(e) => setQuantityDirect(item.product.id, e.target.value)}
                                        onClick={(e) => e.target.select()}
                                        className={`text-xs font-bold w-12 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 ${item.product.unit_type !== 'unit' ? 'py-1 border border-border/50 bg-secondary/50' : ''}`}
                                        autoFocus={item.product.unit_type !== 'unit' && item.quantity === ''}
                                    />
                                    {item.product.unit_type === 'unit' && (
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-secondary rounded-md transition-colors"><Plus size={14}/></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-10">
                            <ShoppingCart size={48} className="mb-4" />
                            <p className="font-medium text-sm text-center">Selecciona productos de la<br/>izquierda para agregarlos al ticket.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-secondary/30 border-t border-border shrink-0">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm text-muted-foreground font-medium items-center">
                            <span>Subtotal</span>
                            <span>{isStoreVES ? 'Bs' : '$'}{cartSubtotalUsd.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm text-muted-foreground font-medium items-center">
                            <span>Descuento ({isStoreVES ? 'Bs' : '$'})</span>
                            <input 
                                type="number" 
                                min="0" 
                                value={discount === 0 ? '' : discount} 
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-primary/50"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex justify-between text-sm text-muted-foreground font-medium items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={applyTax} 
                                    onChange={(e) => setApplyTax(e.target.checked)}
                                    className="rounded text-primary focus:ring-primary accent-primary"
                                />
                                <span>IVA (16%)</span>
                            </label>
                            <span>{isStoreVES ? 'Bs' : '$'}{cartTaxUsd.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-between items-end mb-6">
                        <div>
                            <span className="text-sm text-muted-foreground font-bold">TOTAL A PAGAR</span>
                            {!isStoreVES && tenant?.exchange_rate_config?.show_usd_pos !== false && <div className="text-xs text-muted-foreground mt-1">Tasa {rateSourceLabel}: {activeRate.toFixed(2)} Bs</div>}
                        </div>
                        <div className="text-right">
                            {isStoreVES ? (
                                <div className="text-3xl font-black text-primary leading-none">
                                    Bs {cartTotalUsd.toFixed(2)}
                                </div>
                            ) : tenant?.exchange_rate_config?.show_usd_pos === false ? (
                                <div className="text-3xl font-black text-primary leading-none">
                                    Bs {cartTotalVes.toFixed(2)}
                                </div>
                            ) : (
                                <>
                                    <div className="text-3xl font-black text-primary leading-none">
                                        $ {cartTotalUsd.toFixed(2)}
                                    </div>
                                    <div className="text-muted-foreground font-bold text-sm mt-1">
                                        Bs {cartTotalVes.toFixed(2)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <button 
                        disabled={cart.length === 0}
                        onClick={() => setIsCheckoutModalOpen(true)}
                        className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20"
                    >
                        <Zap size={20} className="fill-current" /> Cobrar Ticket
                    </button>
                </div>
            </div>

            {/* MODAL CHECKOUT */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border bg-secondary/30 flex justify-between items-center">
                            <h2 className="text-xl font-black flex items-center gap-2">
                                {checkoutStep === 'payment' ? <><CreditCard className="text-primary"/> Completar Pago</> : <><Check className="text-green-500"/> Venta Exitosa</>}
                            </h2>
                            <button onClick={() => { setIsCheckoutModalOpen(false); setCheckoutStep('payment'); }} className="text-muted-foreground hover:text-foreground bg-background border border-border p-2 rounded-xl"><X size={20}/></button>
                        </div>
                        
                        {checkoutStep === 'payment' ? (
                            <>
                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex justify-between items-center text-primary">
                                <span className="font-bold">Total a Cobrar:</span>
                                <div className="text-right">
                                    <span className="text-2xl font-black">${cartTotalUsd.toFixed(2)}</span>
                                    <span className="text-sm font-bold ml-2 opacity-80">/ Bs {cartTotalVes.toFixed(2)}</span>
                                </div>
                                <div className="text-xs bg-primary/20 px-2 py-1 rounded font-bold ml-2">Tasa: {rateSourceLabel}</div>
                            </div>

                            {/* SECCIÓN CLIENTE */}
                            <div className="space-y-3 bg-secondary/30 p-4 rounded-2xl border border-border sales-customer-selector">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Datos del Cliente</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isGenericCustomer}
                                            onChange={(e) => setIsGenericCustomer(e.target.checked)}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                        Cliente Genérico
                                    </label>
                                </div>
                                {!isGenericCustomer && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                        <input 
                                            type="text" 
                                            placeholder="Cédula" 
                                            value={customerIdNumber}
                                            onChange={(e) => setCustomerIdNumber(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Nombre Completo" 
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        />
                                        <div className="flex gap-2 sm:col-span-2">
                                            <select 
                                                value={customerPhonePrefix}
                                                onChange={(e) => setCustomerPhonePrefix(e.target.value)}
                                                className="bg-background border border-border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            >
                                                <option value="0412">0412</option>
                                                <option value="0414">0414</option>
                                                <option value="0424">0424</option>
                                                <option value="0416">0416</option>
                                                <option value="0426">0426</option>
                                            </select>
                                            <input 
                                                type="text" 
                                                placeholder="Número de Teléfono (Ej. 1234567)" 
                                                value={customerPhoneNumber}
                                                onChange={(e) => setCustomerPhoneNumber(e.target.value.replace(/\D/g, '').slice(0,7))}
                                                className="flex-1 bg-background border border-border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* ENVIAR RECIBO (WhatsApp) */}
                            {!isGenericCustomer && (
                                <div className="flex items-center gap-2 px-1">
                                    <input 
                                        type="checkbox"
                                        id="sendReceiptToggle"
                                        checked={sendReceipt}
                                        onChange={(e) => setSendReceipt(e.target.checked)}
                                        className="rounded border-border w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="sendReceiptToggle" className="text-xs font-bold text-muted-foreground cursor-pointer leading-tight">Enviar recibo por WhatsApp automáticamente</label>
                                </div>
                            )}

                            {/* IMPRESORA TÉRMICA */}
                            <div className="flex items-center gap-2 px-1 mt-2">
                                <input 
                                    type="checkbox"
                                    id="printReceiptToggle"
                                    checked={printerEnabled}
                                    onChange={(e) => setPrinterEnabled(e.target.checked)}
                                    className="rounded border-border w-4 h-4 text-primary focus:ring-primary"
                                />
                                <label htmlFor="printReceiptToggle" className="text-xs font-bold text-muted-foreground cursor-pointer leading-tight">Imprimir ticket físico (ESC/POS)</label>
                            </div>
                            
                            {printerEnabled && (
                                <div className="pl-6 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2 mt-1">
                                    <select 
                                        value={printerType}
                                        onChange={(e) => setPrinterType(e.target.value)}
                                        className="bg-background border border-border rounded-lg py-1 px-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs w-full max-w-xs"
                                    >
                                        <option value="usb">USB (Web Serial API)</option>
                                        <option value="bluetooth">Bluetooth (Experimental)</option>
                                    </select>
                                    <button 
                                        onClick={connectUSB}
                                        className="bg-secondary text-secondary-foreground font-bold text-xs py-1.5 px-3 rounded-lg hover:brightness-95 text-left w-fit border border-border"
                                    >
                                        Vincular Impresora (1ra Vez)
                                    </button>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Método de Pago</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setPaymentMethod('efectivo_usd')} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm ${paymentMethod === 'efectivo_usd' ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20' : 'bg-secondary/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
                                        <Banknote size={20} /> Efectivo USD
                                    </button>
                                    <button onClick={() => setPaymentMethod('efectivo_ves')} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm ${paymentMethod === 'efectivo_ves' ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20' : 'bg-secondary/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
                                        <Banknote size={20} /> Efectivo Bs
                                    </button>
                                    <button onClick={() => setPaymentMethod('pago_movil')} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm ${paymentMethod === 'pago_movil' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 ring-2 ring-emerald-500/20' : 'bg-secondary/50 border-border text-muted-foreground hover:border-emerald-500/50 hover:text-foreground'}`}>
                                        <Zap size={20} /> Pago Móvil
                                    </button>
                                    <button onClick={() => setPaymentMethod('punto_venta')} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm ${paymentMethod === 'punto_venta' ? 'bg-blue-500/10 border-blue-500 text-blue-600 ring-2 ring-blue-500/20' : 'bg-secondary/50 border-border text-muted-foreground hover:border-blue-500/50 hover:text-foreground'}`}>
                                        <CreditCard size={20} /> Punto de Venta
                                    </button>
                                    <button onClick={() => { setPaymentMethod('credito'); setIsGenericCustomer(false); }} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm ${paymentMethod === 'credito' ? 'bg-red-500/10 border-red-500 text-red-500 ring-2 ring-red-500/20' : 'bg-secondary/50 border-border text-muted-foreground hover:border-red-500/50 hover:text-foreground'}`}>
                                        <ArrowRight size={20} /> Fiado (Crédito)
                                    </button>
                                </div>
                            </div>

                            {/* SECCIÓN MODOS DE CRÉDITO */}
                            {paymentMethod === 'credito' && (
                                <div className="space-y-3 bg-red-500/5 border border-red-500/20 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-red-500 uppercase tracking-wider">Modo de Crédito</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={creditMode}
                                            onChange={(e) => setCreditMode(e.target.value)}
                                            className="w-full bg-background border border-red-500/30 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-medium"
                                        >
                                            <option value="1">1 Cuota (7 días)</option>
                                            <option value="2">2 Cuotas (15 días)</option>
                                            <option value="custom">Personalizado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {installments.map((inst, idx) => (
                                            <div key={idx} className="flex gap-2 items-center text-sm">
                                                <span className="font-bold text-muted-foreground whitespace-nowrap">Cuota {idx+1}:</span>
                                                <input 
                                                    type="date"
                                                    value={inst.due_date}
                                                    onChange={(e) => {
                                                        const newInsts = [...installments];
                                                        newInsts[idx].due_date = e.target.value;
                                                        setInstallments(newInsts);
                                                    }}
                                                    className="bg-background border border-border rounded-lg px-2 py-1 flex-1 min-w-[120px]"
                                                />
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                                    <input 
                                                        type="number"
                                                        value={inst.amount_usd}
                                                        onChange={(e) => {
                                                            const newInsts = [...installments];
                                                            newInsts[idx].amount_usd = parseFloat(e.target.value) || 0;
                                                            setInstallments(newInsts);
                                                        }}
                                                        className="bg-background border border-border rounded-lg pl-6 pr-2 py-1 w-24 text-right"
                                                        title="Monto a pagar en cuota ($)"
                                                    />
                                                </div>
                                                {creditMode === 'custom' && (
                                                    <button onClick={() => {
                                                        if (installments.length > 1) {
                                                            setInstallments(installments.filter((_, i) => i !== idx));
                                                        }
                                                    }} className="text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-colors"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {creditMode === 'custom' && (
                                        <button 
                                            onClick={() => setInstallments([...installments, { amount_usd: 0, due_date: '' }])}
                                            className="w-full mt-2 py-2 border border-dashed border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 font-bold text-sm transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Plus size={16} /> Agregar Cuota
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border bg-secondary/30 flex gap-4">
                            <button onClick={() => setIsCheckoutModalOpen(false)} className="px-6 py-4 rounded-2xl font-bold bg-card border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancelar</button>
                            <button 
                                onClick={handleCheckout}
                                className="flex-1 bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-xl shadow-primary/20"
                            >
                                <Zap size={20} className="fill-current" /> Confirmar Venta
                            </button>
                        </div>
                        </>
                        ) : (
                            <div className="p-8 text-center space-y-6">
                                <div className="mx-auto w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2 animate-in zoom-in">
                                    <Check size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black mb-2">¡Transacción Completada!</h2>
                                    <p className="text-sm text-muted-foreground">¿Qué deseas hacer con el comprobante de esta venta?</p>
                                </div>
                                
                                <div className="flex flex-col gap-3 max-w-xs mx-auto mt-6">
                                    <button 
                                        onClick={() => handleDownloadFromSuccess('pdf')} 
                                        className="bg-red-500/10 text-red-600 hover:bg-red-500/20 px-4 py-3 rounded-xl font-bold transition-colors w-full flex items-center justify-center gap-2"
                                    >
                                        Descargar PDF
                                    </button>
                                    <button 
                                        onClick={() => handleDownloadFromSuccess('image')} 
                                        className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 px-4 py-3 rounded-xl font-bold transition-colors w-full flex items-center justify-center gap-2"
                                    >
                                        Descargar Imagen
                                    </button>
                                    {printerEnabled && (
                                        <button 
                                            onClick={() => printReceipt(completedSaleMock, tenant, isStoreVES, activeRate)} 
                                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-3 rounded-xl font-bold transition-colors w-full flex items-center justify-center gap-2"
                                        >
                                            <Printer size={20} />
                                            {isPrinterConnected ? 'Imprimir Ticket (Térmica)' : 'Conectar Impresora e Imprimir'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => { setIsCheckoutModalOpen(false); setCheckoutStep('payment'); }} 
                                        className="bg-primary text-primary-foreground hover:brightness-110 px-4 py-3 rounded-xl font-black transition-colors w-full flex items-center justify-center gap-2 mt-4"
                                    >
                                        Nueva Venta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
