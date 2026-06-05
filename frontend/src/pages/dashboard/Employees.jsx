import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const Employees = () => {
    const { tenant } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form states
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get(`/${tenant.id}/employees`);
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees', error);
            toast.error('Error cargando empleados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenant) fetchEmployees();
    }, [tenant]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post(`/${tenant.id}/employees`, {
                name,
                username,
                password
            });
            toast.success('Empleado creado correctamente');
            setName('');
            setUsername('');
            setPassword('');
            fetchEmployees();
        } catch (error) {
            console.error('Error creating employee', error);
            toast.error(error.response?.data?.message || 'Error al crear empleado');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar empleado?',
            text: 'Esta acción no se puede deshacer y el empleado perderá el acceso inmediatamente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3b82f6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            await api.delete(`/${tenant.id}/employees/${id}`);
            toast.success('Empleado eliminado');
            fetchEmployees();
        } catch (error) {
            console.error('Error deleting employee', error);
            toast.error('Error al eliminar empleado');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Users className="text-primary" /> Empleados
                </h1>
                <p className="text-muted-foreground text-sm">Crea accesos para cajeros. Ellos solo verán el Punto de Venta.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-card border border-border p-6 rounded-3xl h-fit">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <UserPlus size={20} /> Nuevo Empleado
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Nombre Completo</label>
                            <input 
                                required type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full bg-secondary px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Usuario de Acceso</label>
                            <input 
                                required type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                                className="w-full bg-secondary px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="Ej: juan123"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Con este usuario iniciará sesión</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Contraseña</label>
                            <input 
                                required type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                                className="w-full bg-secondary px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                        <button 
                            type="submit" disabled={saving || !name || !username || !password}
                            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Crear Empleado'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-3xl overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold">Lista de Empleados</h3>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <p className="text-muted-foreground text-sm text-center py-4">Cargando...</p>
                            ) : employees.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No tienes empleados registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {employees.map(emp => (
                                        <div key={emp.id} className="flex justify-between items-center bg-secondary/50 border border-border p-4 rounded-2xl">
                                            <div>
                                                <div className="font-bold">{emp.name}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">Usuario: <span className="font-mono text-foreground">{emp.username}</span></div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(emp.id)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                                title="Eliminar Empleado"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Employees;
