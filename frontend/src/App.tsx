import { useState } from 'react';
import { CheckCircle2, Clock, Sparkles, ShieldCheck, MapPin, Star, BookOpen, FileCheck, Building2, Users, CalendarPlus } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ScheduleCatalog } from './components/ScheduleCatalog';
import { BookingModal } from './components/BookingModal';
import { MyBookingsModal } from './components/MyBookingsModal';
import { AdminVouchersModal } from './components/AdminVouchersModal';
import { AttendanceModal } from './components/AttendanceModal';
import { AdminBranchesModal } from './components/AdminBranchesModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { AdminClassesModal } from './components/AdminClassesModal';
import type { ClassSchedule } from './types/schedule';

function MainContent() {
  const { user, isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [adminVouchersOpen, setAdminVouchersOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [adminBranchesOpen, setAdminBranchesOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);
  const [adminClassesOpen, setAdminClassesOpen] = useState(false);
  const [catalogKey, setCatalogKey] = useState(0);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectSchedule = (schedule: ClassSchedule) => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setSelectedSchedule(schedule);
  };

  const handleRefreshSchedule = () => {
    setCatalogKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-sand-50 text-charcoal flex flex-col">
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenMyBookings={() => setMyBookingsOpen(true)}
        onOpenAdminVouchers={() => setAdminVouchersOpen(true)}
        onOpenAttendance={() => setAttendanceOpen(true)}
        onOpenAdminBranches={() => setAdminBranchesOpen(true)}
        onOpenAdminUsers={() => setAdminUsersOpen(true)}
        onOpenAdminClasses={() => setAdminClassesOpen(true)}
      />

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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMyBookingsOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-sage-50 text-sage-800 hover:bg-sage-100 border border-sage-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Mis Reservas</span>
                </button>

                {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN' || user.isInstructor) && (
                  <button
                    onClick={() => setAttendanceOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>📋</span>
                    <span>Asistencia & Clases</span>
                  </button>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <button
                      onClick={() => setAdminBranchesOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-300 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Building2 className="w-3.5 h-3.5 text-sage-600" />
                      <span>Sedes</span>
                    </button>

                    <button
                      onClick={() => setAdminUsersOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-300 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Users className="w-3.5 h-3.5 text-sage-600" />
                      <span>Usuarios</span>
                    </button>

                    <button
                      onClick={() => setAdminClassesOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-300 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-sage-600" />
                      <span>Clases</span>
                    </button>

                    <button
                      onClick={() => setAdminVouchersOpen(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-terra-light text-terra hover:bg-terra hover:text-white border border-terra/30 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Bandeja Admin</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-sand-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-charcoal-muted">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sage-600" />
                <span>
                  Sede Predilecta:{' '}
                  {user.favoriteBranch ? (
                    <strong className="text-sage-900 font-semibold inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {user.favoriteBranch.name}
                    </strong>
                  ) : (
                    <span className="italic">Sin sede favorita (márcala en la agenda)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Control de aforo activo con PostgreSQL transaccional</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Plataforma Multisede · Agenda en Vivo
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-sage-900 mb-6 leading-tight">
            Encuentra tu ritmo, conecta con tu cuerpo y reserva en tu sede favorita.
          </h1>

          <p className="text-base md:text-lg text-charcoal-muted max-w-2xl mx-auto mb-8">
            Selecciona entre Providencia, Las Condes o Vitacura, filtra por horario y asegura tu reformer al instante.
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
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Múltiples Sedes</h3>
            <p className="text-sm text-charcoal-muted">Providencia, Las Condes y Vitacura con horarios y disciplinas dedicadas.</p>
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
            <h3 className="font-semibold text-charcoal mb-1">Control de Aforo Estricto</h3>
            <p className="text-sm text-charcoal-muted">Garantía sin sobrecupos con transacciones pesimistas de alta concurrencia.</p>
          </div>
        </div>

        {/* Live Schedules / Class Catalog */}
        <ScheduleCatalog
          key={catalogKey}
          onRequestLogin={() => handleOpenAuth('login')}
          onSelectSchedule={handleSelectSchedule}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-sand-200 py-6 text-center text-xs text-charcoal-muted bg-white/50">
        Pilates Studio · Plataforma de Agendamiento Multisede · Entorno de Desarrollo Local
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <BookingModal
        schedule={selectedSchedule}
        isOpen={!!selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        onSuccess={() => {
          handleRefreshSchedule();
        }}
      />

      <MyBookingsModal
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onRefreshSchedule={handleRefreshSchedule}
      />

      <AdminVouchersModal
        isOpen={adminVouchersOpen}
        onClose={() => setAdminVouchersOpen(false)}
        onUpdated={handleRefreshSchedule}
      />

      <AttendanceModal
        isOpen={attendanceOpen}
        onClose={() => {
          setAttendanceOpen(false);
          handleRefreshSchedule();
        }}
      />

      <AdminBranchesModal
        isOpen={adminBranchesOpen}
        onClose={() => setAdminBranchesOpen(false)}
        onBranchesUpdated={handleRefreshSchedule}
      />

      <AdminUsersModal
        isOpen={adminUsersOpen}
        onClose={() => setAdminUsersOpen(false)}
        onUsersUpdated={handleRefreshSchedule}
      />

      <AdminClassesModal
        isOpen={adminClassesOpen}
        onClose={() => {
          setAdminClassesOpen(false);
          handleRefreshSchedule();
        }}
        onUpdated={handleRefreshSchedule}
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
