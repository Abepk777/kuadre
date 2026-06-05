import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import logoClaro from '../../assets/Recurso 11logo-horizontal-modoclaro.svg';
import logoOscuro from '../../assets/Recurso 12logo-horizontal-modooscuro.svg';
import { ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return toast.error('Ingresa tu correo electrónico');
        
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: email.toLowerCase() });
            setSent(true);
            toast.success('Enlace de recuperación enviado');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al enviar el correo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card p-8 rounded-3xl border border-border shadow-xl">
                <div className="flex justify-center mb-8">
                    <img src={logoOscuro} alt="Kuadre Logo" className="h-12 dark:hidden" />
                    <img src={logoClaro} alt="Kuadre Logo" className="h-12 hidden dark:block" />
                </div>
                
                <h2 className="text-2xl font-black text-center mb-2">Recuperar Contraseña</h2>
                
                {sent ? (
                    <div className="text-center">
                        <p className="text-muted-foreground mb-6">
                            Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada o la carpeta de spam.
                        </p>
                        <Link to="/login" className="text-primary hover:underline font-bold flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Volver al Inicio de Sesión
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-muted-foreground text-center mb-6 text-sm">
                            Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">Correo Electrónico</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                        <Mail size={18} />
                                    </div>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-secondary text-foreground p-3 pl-10 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                        placeholder="tu@correo.com"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : 'Enviar Enlace'}
                            </button>
                        </form>
                        
                        <div className="mt-6 text-center">
                            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
                                <ArrowLeft size={14} /> Volver
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
