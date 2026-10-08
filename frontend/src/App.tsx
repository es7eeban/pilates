import { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Sparkles, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ScheduleCatalog } from './components/ScheduleCatalog';

function MainContent() {
  const { user, isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-sand-50 text-charcoal flex flex-col">
      <Navbar onOpenAuth={handleOpenAuth} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
        {/* Authenticated Banner */}
        {isAuthenticated && user ? (
          <div className="mb-8 p-6 rounded-2xl bg-white border border-sage-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-800 flex items-center justify-center font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-sage-900">¡Hola, {user.name}!</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-800 font-semibold border border-sage-200">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Sesión iniciada con <span className="font-medium text-charcoal">{user.email}</span> · {user.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-3.5 h-3.5" /> Token JWT Activo
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-sand-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-charcoal-muted">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sage-600" />
                <span>
                  {user.role === 'ADMIN'
                    ? 'Acceso total: Administración de agenda, comprobantes y catálogo.'
                    : user.role === 'INSTRUCTOR'
                    ? 'Acceso instructor: Visualización de clases asignadas y lista de alumnos.'
                    : 'Acceso alumno: Reserva de reformer y consulta de historial de clases.'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sage-700 font-medium">
                <ArrowRight className="w-4 h-4" />
                <span>Próximo paso en roadmap: Sprint 2 (Catálogo de horarios y aforo en tiempo real)</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Sprint 1 Completado · Auth & Docker Activo
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-sage-900 mb-6 leading-tight">
            Encuentra tu ritmo, conecta con tu cuerpo y reserva tu reformer.
          </h1>

          <p className="text-base md:text-lg text-charcoal-muted max-w-2xl mx-auto mb-8">
            Plataforma moderna para la reserva de horas de pilates, integración con pasarelas de pago y validación de transferencias bancarias.
          </p>

          {!isAuthenticated && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleOpenAuth('login')}
                className="px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white font-semibold text-sm rounded-xl shadow transition"
              >
                Probar Inicio de Sesión
              </button>
              <button
                onClick={() => handleOpenAuth('register')}
                className="px-6 py-3 bg-white hover:bg-sand-100 text-charcoal font-semibold text-sm rounded-xl border border-sand-300 shadow-sm transition"
              >
                Registrar Nuevo Alumno
              </button>
            </div>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Agenda en Tiempo Real</h3>
            <p className="text-sm text-charcoal-muted">Control estricto de aforo y cupos garantizados con bloqueo transaccional.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Doble Método de Pago</h3>
            <p className="text-sm text-charcoal-muted">Pasarela online automatizada o transferencia con comprobante bancario.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Auditoría de Pagos</h3>
            <p className="text-sm text-charcoal-muted">Panel administrativo para validación inmediata de reservas con comprobantes.</p>
          </div>
        </div>

        {/* Live Schedules / Class Catalog */}
        <ScheduleCatalog
          onRequestLogin={() => handleOpenAuth('login')}
          onSelectSchedule={(sched) => {
            alert(`Has seleccionado la clase: ${sched.classType.title}. El módulo de reservas y pagos se completará en el siguiente Sprint.`);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-sand-200 py-6 text-center text-xs text-charcoal-muted bg-white/50">
        Pilates Studio · Plataforma de Agendamiento & Gestión · Entorno de Desarrollo Local
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
