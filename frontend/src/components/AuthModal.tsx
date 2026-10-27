import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ name, email, phone, password });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sand-100 bg-sand-50/50">
          <div>
            <h2 className="text-xl font-bold text-sage-900">
              {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {mode === 'login'
                ? 'Ingresa tus credenciales para acceder a tu agenda'
                : 'Regístrate para reservar tus clases de pilates'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-sand-200">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
              mode === 'login'
                ? 'border-sage-600 text-sage-900 bg-white'
                : 'border-transparent text-charcoal-muted hover:text-charcoal bg-sand-50/50'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
              mode === 'register'
                ? 'border-sage-600 text-sage-900 bg-white'
                : 'border-transparent text-charcoal-muted hover:text-charcoal bg-sand-50/50'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Camila Soto"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-sand-50/60 border border-sand-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+56912345678"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-sand-50/60 border border-sand-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-sand-50/60 border border-sand-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-sand-50/60 border border-sand-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : mode === 'login' ? (
                'Iniciar Sesión'
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-sand-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-800 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-sage-600" />
              <span>Cuentas de prueba rápida (Dev Seed):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@pilates.cl', 'Pilates123!')}
                className="p-2 text-left rounded-lg border border-sand-200 bg-sand-50/60 hover:bg-sage-50 hover:border-sage-300 transition"
              >
                <div className="font-bold text-sage-900">Admin</div>
                <div className="text-[10px] text-charcoal-muted truncate">admin@...</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('alumno.demo@pilates.cl', 'Pilates123!')}
                className="p-2 text-left rounded-lg border border-sand-200 bg-sand-50/60 hover:bg-sage-50 hover:border-sage-300 transition"
              >
                <div className="font-bold text-sage-900">Alumno</div>
                <div className="text-[10px] text-charcoal-muted truncate">alumno@...</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
