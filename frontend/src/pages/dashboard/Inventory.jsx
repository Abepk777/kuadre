import React, { useState, useEffect } from 'react';
import { PackagePlus, Search, Edit2, Image as ImageIcon, Share2, CheckCircle2, LayoutGrid, List, Trash2, AlertCircle, Package, Plus } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { startInventoryTour } from '../../utils/tours';
import ProductForm from '../../components/ProductForm';
import { db } from '../../lib/db';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const Inventory = () => {
    const { tenant, token, rates } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('inventoryViewMode') || 'grid');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/${tenant.id}/inventory/products`);
            const items = data.products || data;
            setProducts(items);

            if (items.length > 0) {
                await db.products.clear();
                await db.products.bulkPut(items.map(p => ({
                    id: p.id,
                    name: p.name,
                    stock: p.stock,
                    price_usd: p.price_usd,
                    avg_cost_usd: p.avg_cost_usd,
                    image_url: p.image_url,
                    unit_type: p.unit_type
                })));
            }
        } catch (error) {
            console.error('Error fetching products', error);
            if (!navigator.onLine) {
                const localProducts = await db.products.toArray();
                if (localProducts.length > 0) {
                    setProducts(localProducts);
                } else {
                    toast.error('Estás sin conexión y no hay productos en caché');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenant) fetchProducts();
    }, [tenant]);

    useEffect(() => {
        startInventoryTour();
    }, []);

    useEffect(() => {
        localStorage.setItem('inventoryViewMode', viewMode);
    }, [viewMode]);

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    };

    const handleShareCatalog = () => {
        const url = `${window.location.origin}/catalog/${tenant.id}`;
        navigator.clipboard.writeText(`¡Mira nuestros precios actualizados aquí!\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        if (isSelectionMode) setSelectedIds([]);
    };

    const toggleSelection = (id, e) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleProductClick = (product) => {
        if (isSelectionMode) {
            toggleSelection(product.id);
        } else {
            handleEdit(product);
        }
    };

    const selectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a eliminar ${selectedIds.length} productos. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;
        
        setIsDeleting(true);
        try {
            await api.delete(`/${tenant.id}/inventory/products/bulk`, { data: { ids: selectedIds } });
            setSelectedIds([]);
            toast.success('Productos eliminados correctamente');
            fetchProducts();
        } catch (error) {
            console.error('Error deleting products', error);
            toast.error('Hubo un error al eliminar los productos');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Package className="text-primary" /> Inventario
                    </h1>
                    <p className="text-muted-foreground text-sm">Gestiona tus productos y existencias.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        id="btn-add-product"
                        onClick={handleAddNew}
                        className="w-full md:w-auto bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> Añadir Producto
                    </button>
                    <button 
                        id="btn-share-catalog"
                        onClick={handleShareCatalog}
                        className="hidden md:flex bg-secondary text-secondary-foreground px-5 py-2.5 rounded-xl font-bold hover:brightness-95 active:scale-[0.98] transition-all items-center justify-center gap-2 border border-border"
                    >
                        {copied ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Share2 size={20} />}
                        <span>{copied ? 'Copiado' : 'Compartir'}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 inventory-search-bar">
                <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar producto por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        id="btn-toggle-selection"
                        onClick={toggleSelectionMode}
                        className={`px-4 py-2 rounded-2xl font-bold transition-all border ${isSelectionMode ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-card text-muted-foreground border-border hover:bg-secondary/50'}`}
                    >
                        {isSelectionMode ? 'Cancelar Selección' : 'Selección Múltiple'}
                    </button>
                    <div className="flex bg-card border border-border rounded-2xl p-1 inventory-view-toggle">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-red-500">{selectedIds.length} seleccionados</span>
                        <button onClick={selectAll} className="text-sm font-bold text-muted-foreground hover:underline">
                            {selectedIds.length === filteredProducts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                    </div>
                    <button 
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Trash2 size={18} />
                        <span className="hidden sm:inline">{isDeleting ? 'Eliminando...' : 'Eliminar seleccionados'}</span>
                    </button>
                </div>
            )}

            {loading ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="bg-card rounded-3xl p-4 border border-border h-64 animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-card rounded-2xl p-4 border border-border h-24 animate-pulse"></div>
                        ))}
                    </div>
                )
            ) : filteredProducts.length === 0 ? (
                <div className="bg-card rounded-3xl border border-border border-dashed p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <PackagePlus size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">No hay productos</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">No se encontraron productos en tu inventario. Haz clic en el botón superior para agregar tu primer producto.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredProducts.map(product => {
                        const isStoreVES = tenant?.base_currency === 'VES';
                        const activeRate = (tenant?.exchange_rate_config?.sales_rate === 'binance' ? rates?.binance : rates?.usd_bcv) || 1;
                        
                        let primaryPrice, primarySymbol, secondaryPrice, secondarySymbol;
                        
                        const basePrice = parseFloat(product.price_usd || 0);
                        const baseCost = parseFloat(product.avg_cost_usd || 0);
                        const profit = basePrice - baseCost;
                        const margin = basePrice > 0 ? (profit / basePrice) * 100 : 0;
                        
                        if (isStoreVES) {
                            primaryPrice = basePrice * activeRate;
                            primarySymbol = 'Bs';
                            secondaryPrice = basePrice;
                            secondarySymbol = '$';
                        } else {
                            primaryPrice = basePrice;
                            primarySymbol = '$';
                            secondaryPrice = basePrice * activeRate;
                            secondarySymbol = 'Bs';
                        }

                        const isSelected = selectedIds.includes(product.id);
                        
                        return (
                            <div 
                                key={product.id} 
                                onClick={() => handleProductClick(product)}
                                className={`bg-card border ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'} rounded-3xl overflow-hidden hover:border-primary/50 transition-all group relative cursor-pointer`}
                            >
                                {isSelectionMode && (
                                    <div className="absolute top-3 left-3 z-10">
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => toggleSelection(product.id, e)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                                        />
                                    </div>
                                )}
                                <div className="h-48 bg-muted/30 relative flex items-center justify-center border-b border-border">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={48} className="text-muted-foreground/30" />
                                    )}
                                    <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border/50 font-bold text-xs">
                                        Stock: {product.unit_type === 'unit' ? Math.floor(product.stock) : product.stock} {product.unit_type}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg leading-tight mb-3 truncate">{product.name}</h3>
                                    
                                    <div className="flex justify-end items-start mb-4">
                                        {!isSelectionMode && (
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                                                    className="p-2 bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                    title="Ver Detalles"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="bg-secondary/50 p-2.5 rounded-xl border border-border/50 flex flex-col justify-center">
                                            <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-0.5">Costo</div>
                                            <div className="font-semibold">{isStoreVES ? 'Bs' : '$'}{isStoreVES ? (baseCost * activeRate).toFixed(2) : baseCost.toFixed(2)}</div>
                                        </div>
                                        <div className="bg-primary/10 text-primary p-2.5 rounded-xl border border-primary/20 flex flex-col justify-center relative">
                                            <div className="text-primary/70 text-[10px] uppercase font-bold tracking-wider mb-0.5">Venta</div>
                                            <div className="font-black text-base leading-none mb-0.5">{primarySymbol}{primaryPrice.toFixed(2)}</div>
                                            <div className="text-xs font-bold text-green-500 mt-1">{secondarySymbol}{secondaryPrice.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredProducts.map(product => {
                        const isStoreVES = tenant?.base_currency === 'VES';
                        const activeRate = (tenant?.exchange_rate_config?.sales_rate === 'binance' ? rates?.binance : rates?.usd_bcv) || 1;
                        let primaryPrice, primarySymbol, secondaryPrice, secondarySymbol;
                        const basePrice = parseFloat(product.price_usd || 0);
                        const baseCost = parseFloat(product.avg_cost_usd || 0);
                        const profit = basePrice - baseCost;
                        
                        if (isStoreVES) {
                            primaryPrice = basePrice * activeRate;
                            primarySymbol = 'Bs';
                            secondaryPrice = basePrice;
                            secondarySymbol = '$';
                        } else {
                            primaryPrice = basePrice;
                            primarySymbol = '$';
                            secondaryPrice = basePrice * activeRate;
                            secondarySymbol = 'Bs';
                        }
                        const isSelected = selectedIds.includes(product.id);
                        
                        return (
                            <div key={product.id} onClick={() => handleProductClick(product)} className={`bg-card border ${isSelected ? 'border-primary bg-primary/5' : 'border-border'} rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 transition-colors cursor-pointer`}>
                                {isSelectionMode && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelection(product.id, e)} className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary accent-primary cursor-pointer" />
                                    </div>
                                )}
                                <div className="h-16 w-16 bg-muted/30 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-border">
                                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-muted-foreground/30" />}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <h3 className="font-bold text-base sm:text-lg line-clamp-2">{product.name}</h3>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm mt-1">
                                        <span className="font-mono text-muted-foreground">Stock: {product.unit_type === 'unit' ? Math.floor(product.stock) : product.stock} {product.unit_type}</span>
                                        <span className="text-emerald-500 font-medium hidden sm:inline">Ganancia: {primarySymbol}{isStoreVES ? (profit * activeRate).toFixed(2) : profit.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                    <span className="hidden sm:inline text-xs text-muted-foreground font-bold uppercase tracking-wider">Precio Venta</span>
                                    <span className="text-lg sm:text-xl font-black text-primary leading-none">{primarySymbol}{primaryPrice.toFixed(2)}</span>
                                    <span className="text-xs sm:text-sm font-bold text-green-500 mt-1">{secondarySymbol}{secondaryPrice.toFixed(2)}</span>
                                </div>
                                {!isSelectionMode && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ProductForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                product={editingProduct} 
                onSaved={fetchProducts} 
            />
        </div>
    );
};

export default Inventory;
