import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Store, User, Lock, Mail, Loader2, Rocket, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from '../../lib/axios';
import anime from 'animejs';
import logoVerticalClaro from '../../assets/Recurso 14logo-vertical-modoclaro.svg';
import logoVerticalOscuro from '../../assets/Recurso 13logo-vertical-modooscuro.svg';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        company_name: '',
        name: '',
        username: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    const [availability, setAvailability] = useState({
        username: { status: 'idle', message: '' },
        email: { status: 'idle', message: '' }
    });

    const formRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        anime({
            targets: formRef.current,
            translateY: [50, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutElastic(1, .8)',
            delay: 100
        });
    }, []);

    const checkFieldAvailability = async (field, value) => {
        if (!value || value.length < 3) {
            setAvailability(prev => ({ ...prev, [field]: { status: 'idle', message: '' } }));
            return;
        }

        setAvailability(prev => ({ ...prev, [field]: { status: 'loading', message: '' } }));
        try {
            const response = await axios.post('/auth/check-availability?field=' + field + '&value=' + value);
            if (response.data.available) {
                setAvailability(prev => ({ ...prev, [field]: { status: 'success', message: '' } }));
            } else {
                setAvailability(prev => ({ ...prev, [field]: { status: 'error', message: `Este ${field === 'email' ? 'correo' : 'usuario'} ya está registrado.` } }));
            }
        } catch (err) {
            setAvailability(prev => ({ ...prev, [field]: { status: 'idle', message: '' } }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({...formData, [name]: value});
        
        if (name === 'username' || name === 'email') {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                checkFieldAvailability(name, value);
            }, 500);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const registerData = {
            ...formData,
            email: formData.email.toLowerCase(),
            username: formData.username.toLowerCase()
        };

        const result = await register(registerData);
        if (result.success) {
            setSuccessMsg(result.message);
            anime({
                targets: formRef.current,
                scale: [1, 1.02, 1],
                duration: 600,
                easing: 'easeOutQuad'
            });
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } else {
            setError(result.message);
            anime({
                targets: formRef.current,
                translateX: [
                    {value: -10, duration: 100},
                    {value: 10, duration: 100},
                    {value: -10, duration: 100},
                    {value: 10, duration: 100},
                    {value: 0, duration: 100}
                ]
            });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div ref={formRef} className="solid-panel w-full max-w-md p-8 rounded-xl relative z-10">
                <div className="text-center mb-6 flex flex-col items-center">
                    <img src={logoVerticalClaro} alt="Kuadre Logo" className="h-16 mb-4 dark:hidden" />
                    <img src={logoVerticalOscuro} alt="Kuadre Logo" className="h-16 mb-4 hidden dark:block" />
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Crea tu Negocio</h1>
                    <p className="text-muted-foreground mt-2">Prueba Kuadre gratis por 7 días</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-600 dark:text-green-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">
                        {successMsg} Redirigiendo...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre de tu Tienda</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Store className="h-5 w-5 text-gray-400" />
                            </div>
                            <input type="text" name="company_name" required value={formData.company_name} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Mi Bodega C.A." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tu Nombre</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="Juan Perez" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Usuario</label>
                            <div className="relative">
                                <input type="text" name="username" required value={formData.username} onChange={handleChange} className={`w-full px-4 py-2.5 rounded-xl border bg-background/50 focus:ring-2 outline-none transition-all pr-10 ${availability.username.status === 'error' ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'}`} placeholder="juanp" />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    {availability.username.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                                    {availability.username.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    {availability.username.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                </div>
                            </div>
                            {availability.username.status === 'error' && <p className="text-red-500 text-xs mt-1 font-medium">{availability.username.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-background/50 focus:ring-2 outline-none transition-all ${availability.email.status === 'error' ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'}`} placeholder="juan@ejemplo.com" />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                {availability.email.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                                {availability.email.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {availability.email.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            </div>
                        </div>
                        {availability.email.status === 'error' && <p className="text-red-500 text-xs mt-1 font-medium">{availability.email.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input type="password" name="password" required minLength="6" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="••••••••" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading || availability.username.status === 'error' || availability.email.status === 'error'} className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 active:scale-95 mt-2">
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Rocket className="h-5 w-5" />}
                        {loading ? 'Creando...' : 'Comenzar 7 días gratis'}
                    </button>
                    <div className="mt-4 text-center text-xs text-muted-foreground">
                        Al registrarte aceptas nuestros{' '}
                        <a href="https://kuadre.krecit.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">términos y condiciones</a>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">¿Ya tienes una cuenta? </span>
                    <Link to="/login" className="text-primary font-medium hover:underline">Inicia Sesión</Link>
                </div>
            </div>
        </div>
    );
}
