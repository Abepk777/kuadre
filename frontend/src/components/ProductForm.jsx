import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, PackagePlus, Edit2 } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProductForm = ({ isOpen, onClose, product, onSaved }) => {
    const { tenant, rates } = useAuth();
    const isStoreVES = tenant?.base_currency === 'VES';
    const activeRate = parseFloat((tenant?.exchange_rate_config?.sales_rate === 'binance' ? rates?.binance : rates?.usd_bcv) || 1);

    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'purchase'
    const [loading, setLoading] = useState(false);

    // Tab 1: Detalles Form
    const [formInputs, setFormInputs] = useState({
        name: '', stock: '', costBase: '', costSec: '', priceBase: '', priceSec: '', unit_type: 'unit'
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Tab 2: Purchase Form
    const [purchaseInputs, setPurchaseInputs] = useState({
        qty: '', costBase: '', costSec: '', priceBase: '', priceSec: '', keepCost: false
    });

    useEffect(() => {
        if (product) {
            const baseCost = parseFloat(product.avg_cost_usd || 0);
            const basePrice = parseFloat(product.price_usd || 0);
            
            setFormInputs({
                name: product.name || '',
                stock: product.stock || '',
                costBase: product.avg_cost_usd ? String(product.avg_cost_usd) : '',
                costSec: product.avg_cost_usd ? (isStoreVES ? baseCost / activeRate : baseCost * activeRate).toFixed(2) : '',
                priceBase: product.price_usd ? String(product.price_usd) : '',
                priceSec: product.price_usd ? (isStoreVES ? basePrice / activeRate : basePrice * activeRate).toFixed(2) : '',
                unit_type: product.unit_type || 'unit'
            });
            setImagePreview(product.image_url || null);
            setImageFile(null);
            
            setPurchaseInputs({
                qty: '', 
                costBase: '', 
                costSec: '', 
                priceBase: product.price_usd ? String(product.price_usd) : '',
                priceSec: product.price_usd ? (isStoreVES ? basePrice / activeRate : basePrice * activeRate).toFixed(2) : '',
                keepCost: false
            });
            setActiveTab('details');
        } else {
            setFormInputs({ name: '', stock: '', costBase: '', costSec: '', priceBase: '', priceSec: '', unit_type: 'unit' });
            setImagePreview(null);
            setImageFile(null);
            setActiveTab('details');
        }
    }, [product, isOpen, isStoreVES, activeRate]);

    if (!isOpen) return null;

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Comprimir a WebP en el navegador
        const img = document.createElement('img');
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Redimensionar si es muy grande
            const MAX_SIZE = 800;
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
                const webpFile = new File([blob], "image.webp", { type: "image/webp" });
                setImageFile(webpFile);
                setImagePreview(URL.createObjectURL(webpFile));
                URL.revokeObjectURL(objectUrl);
            }, 'image/webp', 0.8);
        };
        img.src = objectUrl;
    };

    const handleBaseChange = (field, val, isPurchase = false) => {
        const num = parseFloat(val);
        let secVal = '';
        if (!isNaN(num)) {
            secVal = isStoreVES ? (num / activeRate).toFixed(2) : (num * activeRate).toFixed(2);
        }
        if (isPurchase) {
            setPurchaseInputs(prev => ({ ...prev, [`${field}Base`]: val, [`${field}Sec`]: secVal }));
        } else {
            setFormInputs(prev => ({ ...prev, [`${field}Base`]: val, [`${field}Sec`]: secVal }));
        }
    };

    const handleSecChange = (field, val, isPurchase = false) => {
        const num = parseFloat(val);
        let baseVal = '';
        if (!isNaN(num)) {
            baseVal = isStoreVES ? (num * activeRate).toFixed(4) : (num / activeRate).toFixed(4);
        }
        if (isPurchase) {
            setPurchaseInputs(prev => ({ ...prev, [`${field}Sec`]: val, [`${field}Base`]: baseVal }));
        } else {
            setFormInputs(prev => ({ ...prev, [`${field}Sec`]: val, [`${field}Base`]: baseVal }));
        }
    };

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const submitData = new FormData();
            submitData.append('name', formInputs.name);
            submitData.append('avg_cost_usd', formInputs.costBase);
            submitData.append('price_usd', formInputs.priceBase);
            submitData.append('stock', formInputs.stock);
            submitData.append('unit_type', formInputs.unit_type);
            
            if (imageFile) submitData.append('image', imageFile);
            
            if (product) {
                submitData.append('_method', 'PUT');
                await api.post(`/${tenant.id}/inventory/products/${product.id}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Producto actualizado');
            } else {
                await api.post(`/${tenant.id}/inventory/products`, submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Producto creado');
            }
            onSaved();
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/${tenant.id}/inventory/products/${product.id}/purchase`, {
                added_qty: parseFloat(purchaseInputs.qty),
                unit_cost_usd: parseFloat(purchaseInputs.costBase),
                new_price_usd: parseFloat(purchaseInputs.priceBase)
            });
            toast.success('Compra registrada exitosamente');
            onSaved();
            onClose();
        } catch (error) {
            console.error('Error saving purchase:', error);
            toast.error('Error al registrar la compra');
        } finally {
            setLoading(false);
        }
    };

    const handleKeepCostToggle = (e) => {
        const checked = e.target.checked;
        if (checked && product) {
            const baseCost = parseFloat(product.avg_cost_usd || 0);
            setPurchaseInputs(prev => ({
                ...prev, 
                keepCost: true,
                costBase: String(baseCost),
                costSec: (isStoreVES ? baseCost / activeRate : baseCost * activeRate).toFixed(2)
            }));
        } else {
            setPurchaseInputs(prev => ({ ...prev, keepCost: false, costBase: '', costSec: '' }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
            <div className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border animate-in fade-in zoom-in duration-300 max-h-[95dvh] flex flex-col">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
                    <h3 className="font-bold text-lg">{product ? 'Gestión de Producto' : 'Nuevo Producto'}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {product && (
                    <div className="flex border-b border-border">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-all ${activeTab === 'details' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:bg-secondary'}`}
                        >
                            <Edit2 size={16} /> Detalles
                        </button>
                        <button 
                            onClick={() => setActiveTab('purchase')}
                            className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-all ${activeTab === 'purchase' ? 'border-[#25D366] text-[#25D366] bg-[#25D366]/5' : 'border-transparent text-muted-foreground hover:bg-secondary'}`}
                        >
                            <PackagePlus size={16} /> Comprar / Reabastecer
                        </button>
                    </div>
                )}
                
                {activeTab === 'details' ? (
                    <form onSubmit={handleDetailsSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex flex-col items-center justify-center">
                            <label className="relative group cursor-pointer w-32 h-32 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-muted/50 flex flex-col items-center justify-center transition-all hover:border-primary">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-muted-foreground flex flex-col items-center">
                                        <ImageIcon size={32} className="mb-2 opacity-50" />
                                        <span className="text-xs font-medium">Subir Foto</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="text-white" size={24} />
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Nombre del Producto</label>
                            <input required type="text" value={formInputs.name} onChange={(e) => setFormInputs({...formInputs, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Ej. Harina Pan 1Kg" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-4 items-center">
                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">Precio Costo ({isStoreVES ? 'Bs' : '$'})</label>
                                    <input required type="number" step="0.0001" value={formInputs.costBase} onChange={(e) => handleBaseChange('cost', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold" placeholder="0.00" />
                                </div>
                                <div className="pt-5 text-muted-foreground/50">⇌</div>
                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">Equivalente ({isStoreVES ? '$' : 'Bs'})</label>
                                    <input type="number" step="0.01" value={formInputs.costSec} onChange={(e) => handleSecChange('cost', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/20 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="flex gap-4 items-center">
                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-medium text-primary ml-1">Precio Venta ({isStoreVES ? 'Bs' : '$'})</label>
                                    <input required type="number" step="0.0001" value={formInputs.priceBase} onChange={(e) => handleBaseChange('price', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-black text-primary" placeholder="0.00" />
                                </div>
                                <div className="pt-5 text-muted-foreground/50">⇌</div>
                                <div className="space-y-1 flex-1">
                                    <label className="text-xs font-medium text-green-600 ml-1">Equivalente ({isStoreVES ? '$' : 'Bs'})</label>
                                    <input type="number" step="0.01" value={formInputs.priceSec} onChange={(e) => handleSecChange('price', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/20 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-green-600" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Stock {product ? 'Actual' : 'Inicial'}</label>
                                <input required type="number" step="0.001" value={formInputs.stock} onChange={(e) => setFormInputs({...formInputs, stock: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono" placeholder="0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Tipo de Venta</label>
                                <select value={formInputs.unit_type} onChange={(e) => setFormInputs({...formInputs, unit_type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
                                    <option value="unit">Unidades (uds)</option>
                                    <option value="kg">Kilos (kg)</option>
                                    <option value="gr">Gramos (gr)</option>
                                    <option value="lt">Litros (L)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center">
                                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Guardar Detalles'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handlePurchaseSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-muted/20 p-4 rounded-xl border border-border flex items-center justify-between mb-2">
                            <div>
                                <div className="font-bold leading-tight truncate max-w-[200px]">{product.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">Stock Actual: <span className="font-mono text-foreground font-bold">{product.unit_type === 'unit' ? Math.round(product.stock) : product.stock} {product.unit_type}</span></div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Cantidad Comprada ({product.unit_type})</label>
                            <input required type="number" step="0.001" value={purchaseInputs.qty} onChange={(e) => setPurchaseInputs({...purchaseInputs, qty: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 transition-all font-mono" placeholder="0" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <label className="text-xs font-medium text-muted-foreground ml-1">Nuevo Costo Unitario</label>
                                <label className="text-xs flex items-center gap-2 cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                                    <input type="checkbox" checked={purchaseInputs.keepCost} onChange={handleKeepCostToggle} className="rounded border-border text-[#25D366] focus:ring-[#25D366]" />
                                    Mismo costo anterior
                                </label>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="space-y-1 flex-1">
                                    <input required type="number" step="0.0001" disabled={purchaseInputs.keepCost} value={purchaseInputs.costBase} onChange={(e) => handleBaseChange('cost', e.target.value, true)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 transition-all font-bold disabled:opacity-50" placeholder={`Costo en ${isStoreVES ? 'Bs' : '$'}`} />
                                </div>
                                <div className="pt-2 text-muted-foreground/50">⇌</div>
                                <div className="space-y-1 flex-1">
                                    <input type="number" step="0.01" disabled={purchaseInputs.keepCost} value={purchaseInputs.costSec} onChange={(e) => handleSecChange('cost', e.target.value, true)} className="w-full px-4 py-3 rounded-xl bg-secondary/20 border border-border focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 transition-all text-sm disabled:opacity-50" placeholder={`Costo en ${isStoreVES ? '$' : 'Bs'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-border mt-4">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Actualizar Precio de Venta (Opcional)</label>
                            <div className="flex gap-4 items-center">
                                <div className="space-y-1 flex-1">
                                    <input required type="number" step="0.0001" value={purchaseInputs.priceBase} onChange={(e) => handleBaseChange('price', e.target.value, true)} className="w-full px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-black text-primary" placeholder={`Venta en ${isStoreVES ? 'Bs' : '$'}`} />
                                </div>
                                <div className="pt-2 text-muted-foreground/50">⇌</div>
                                <div className="space-y-1 flex-1">
                                    <input type="number" step="0.01" value={purchaseInputs.priceSec} onChange={(e) => handleSecChange('price', e.target.value, true)} className="w-full px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/20 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-green-600" placeholder={`Venta en ${isStoreVES ? '$' : 'Bs'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" disabled={loading || !purchaseInputs.qty || !purchaseInputs.costBase} className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center shadow-lg shadow-[#25D366]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Sumar al Inventario'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ProductForm;
