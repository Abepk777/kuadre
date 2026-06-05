import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import logoClaro from '../../assets/Recurso 11logo-horizontal-modoclaro.svg';
import { Lock } from 'lucide-react';

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
}

const ResetPassword = () => {
    const query = useQuery();
    const token = query.get('token');
    const emailFromUrl = query.get('email');
    
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            toast.error('Token inválido o expirado.');
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== passwordConfirmation) {
            return toast.error('Las contraseñas no coinciden');
        }
        if (password.length < 6) {
            return toast.error('La contraseña debe tener al menos 6 caracteres');
        }
        
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { 
                token,
                email: emailFromUrl.toLowerCase(),
                password,
                password_confirmation: passwordConfirmation
            });
            toast.success('Contraseña restablecida exitosamente');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al restablecer la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card p-8 rounded-3xl border border-border shadow-xl">
                <div className="flex justify-center mb-8">
                    <img src={logoClaro} alt="Kuadre Logo" className="h-12" />
                </div>
                
                <h2 className="text-2xl font-black text-center mb-2">Crear Nueva Contraseña</h2>
                <p className="text-muted-foreground text-center mb-6 text-sm">
                    Ingresa tu nueva contraseña para acceder a tu cuenta.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Nueva Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Lock size={18} />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-secondary text-foreground p-3 pl-10 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                placeholder="Min. 6 caracteres"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Confirmar Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Lock size={18} />
                            </div>
                            <input 
                                type="password" 
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                className="w-full bg-secondary text-foreground p-3 pl-10 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                placeholder="Confirma tu contraseña"
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
