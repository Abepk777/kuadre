import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import anime from 'animejs';
import { useTheme } from '../../contexts/ThemeContext';
import logoVerticalClaro from '../../assets/Recurso 14logo-vertical-modoclaro.svg';
import logoVerticalOscuro from '../../assets/Recurso 13logo-vertical-modooscuro.svg';

export default function Login() {
    const { login } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [credentials, setCredentials] = useState({ login: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const formRef = useRef(null);

    useEffect(() => {
        anime({
            targets: formRef.current,
            translateY: [50, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutElastic(1, .8)'
        });
    }, []);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const loginData = {
            ...credentials,
            login: credentials.login.toLowerCase()
        };
        const result = await login(loginData);
        if (result.success) {
            const role = result.user?.role;
            if (role === 'admin' || role === 'superadmin') navigate('/admin');
            else if (role === 'cashier' || role === 'employee') navigate('/sales');
            else navigate('/dashboard');
        } else {
            setError(result.message);
            // Animación de shake en caso de error
            anime({
                targets: formRef.current,
                translateX: [
                    { value: -10, duration: 100, easing: 'easeInOutQuad' },
                    { value: 10, duration: 100, easing: 'easeInOutQuad' },
                    { value: -10, duration: 100, easing: 'easeInOutQuad' },
                    { value: 10, duration: 100, easing: 'easeInOutQuad' },
                    { value: 0, duration: 100, easing: 'easeInOutQuad' }
                ]
            });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div ref={formRef} className="solid-panel w-full max-w-md p-8 rounded-xl relative z-10">
                <div className="text-center mb-8 flex flex-col items-center">
                    <img src={theme === 'dark' ? logoVerticalOscuro : logoVerticalClaro} alt="Kuadre Logo" className="h-24 mb-4" />
                    <p className="text-muted-foreground">Bienvenido de vuelta</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-1">Usuario o Correo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="login"
                                required
                                value={credentials.login}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="usuario o correo"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Contraseña</label>
                            <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                value={credentials.password}
                                onChange={handleChange}
                                className="w-full pl-10 pr-12 py-2.5 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl font-medium transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">¿No tienes cuenta? </span>
                    <Link to="/register" className="text-primary font-medium hover:underline">Regístrate gratis</Link>
                </div>
                
                <div className="mt-8 text-center text-[11px] text-muted-foreground">
                    <a href="https://krecit.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        Impulsado por <span className="font-black tracking-wider">KRECIT</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
