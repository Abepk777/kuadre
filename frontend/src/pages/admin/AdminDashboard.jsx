import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import { Navigate } from 'react-router-dom';
import { Shield, Search, CheckCircle2, Clock, AlertCircle, Plus, Send, Activity, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (user?.role === 'superadmin' || user?.role === 'admin') {
            fetchTenants();
        }
    }, [user]);

    const fetchTenants = async () => {
        try {
            const { data } = await api.get('/admin/tenants');
            setTenants(data);
        } catch (error) {
            toast.error('Error cargando tenants');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDays = async (tenantId) => {
        const { value: days } = await Swal.fire({
            title: 'Añadir días de suscripción',
            input: 'number',
            inputLabel: 'Días a añadir',
            inputValue: 30,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || value <= 0) {
                    return 'Debes ingresar un número válido de días';
                }
            }
        });

        if (days) {
            try {
                await api.post(`/admin/tenants/${tenantId}/add-days`, { days: parseInt(days) });
                toast.success(`${days} días añadidos`);
                fetchTenants();
            } catch (error) {
                toast.error('Error añadiendo días');
            }
        }
    };

    const handleSendNotification = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Enviar Notificación Masiva',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="Asunto / Título">' +
                '<textarea id="swal-input2" class="swal2-textarea" placeholder="Mensaje"></textarea>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Enviar a todos',
            preConfirm: () => {
                return [
                    document.getElementById('swal-input1').value,
                    document.getElementById('swal-input2').value
                ]
            }
        });

        if (formValues && formValues[0] && formValues[1]) {
            try {
                await api.post('/admin/notifications/massive', {
                    subject: formValues[0],
                    message: formValues[1]
                });
                toast.success('Notificación masiva en cola');
            } catch (error) {
                toast.error('La función de notificaciones masivas aún no está implementada en el backend.');
            }
        }
    };

    if (user?.role !== 'superadmin' && user?.role !== 'admin') {
        return <Navigate to="/dashboard" />;
    }

    const filteredTenants = tenants.filter(t => 
        t.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.document_id?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Shield className="text-primary" /> SuperAdmin
                    </h1>
                    <p className="text-muted-foreground text-sm">Panel de control de la plataforma</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleSendNotification} className="w-full md:w-auto bg-secondary text-foreground font-bold px-4 py-2 rounded-xl border border-border hover:border-primary transition-colors flex items-center justify-center gap-2">
                        <Send size={18} /> Notificar
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Activity size={20} className="text-primary" /> Comercios
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar comercio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/10 border-b border-border">
                                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Negocio</th>
                                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Dueño</th>
                                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Vence</th>
                                <th className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-muted-foreground">Cargando comercios...</td>
                                </tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-muted-foreground">No se encontraron comercios.</td>
                                </tr>
                            ) : (
                                filteredTenants.map(tenant => {
                                    const owner = tenant.users?.find(u => u.role === 'tenant');
                                    
                                    let status = 'expired';
                                    let statusColor = 'text-red-500 bg-red-500/10 border-red-500/20';
                                    let Icon = AlertCircle;
                                    
                                    const now = new Date();
                                    const trialEnds = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
                                    const subEnds = tenant.subscription_ends_at ? new Date(tenant.subscription_ends_at) : null;
                                    
                                    if (trialEnds && trialEnds > now) {
                                        status = 'trial';
                                        statusColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                                        Icon = Clock;
                                    } else if (subEnds && subEnds > now) {
                                        status = 'active';
                                        statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
                                        Icon = CheckCircle2;
                                    }

                                    return (
                                        <tr key={tenant.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold">{tenant.company_name}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{tenant.document_id || 'N/A'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <UserIcon size={14} className="text-muted-foreground" />
                                                    <span className="text-sm">{owner ? owner.email : 'Sin dueño'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                                    <Icon size={12} />
                                                    {status === 'active' ? 'Activo' : status === 'trial' ? 'Prueba' : 'Vencido'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-medium">
                                                {status === 'trial' 
                                                    ? trialEnds.toLocaleDateString()
                                                    : subEnds 
                                                        ? subEnds.toLocaleDateString()
                                                        : 'N/A'
                                                }
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => handleAddDays(tenant.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-colors"
                                                >
                                                    <Plus size={14} /> Días
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
