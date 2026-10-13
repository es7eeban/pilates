import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  MapPin,
  Star,
  BookOpen,
  Zap,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { ScheduleCatalog } from './components/ScheduleCatalog';
import { BookingModal } from './components/BookingModal';
import { MyBookingsModal } from './components/MyBookingsModal';
import { AdminVouchersModal } from './components/AdminVouchersModal';
import { AttendanceModal } from './components/AttendanceModal';
import { AdminBranchesModal } from './components/AdminBranchesModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { AdminClassesModal } from './components/AdminClassesModal';
import { NotificationsModal } from './components/NotificationsModal';
import { WaitlistAcceptModal } from './components/WaitlistAcceptModal';
import { notificationsApi, waitlistApi } from './services/api';
import type { ClassSchedule } from './types/schedule';
import type { WaitlistEntry } from './types/waitlist';

function MainContent() {
  const { user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [myBookingsInitialTab, setMyBookingsInitialTab] = useState<'bookings' | 'waitlist'>('bookings');
  const [adminVouchersOpen, setAdminVouchersOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [adminBranchesOpen, setAdminBranchesOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);
  const [adminClassesOpen, setAdminClassesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [catalogKey, setCatalogKey] = useState(0);
  const [offeredWaitlistEntries, setOfferedWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [acceptingOfferEntry, setAcceptingOfferEntry] = useState<WaitlistEntry | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifRes, waitlistRes] = await Promise.all([
        notificationsApi.getMy(),
        waitlistApi.getMyEntries(),
      ]);
      setUnreadCount(notifRes.unreadCount);
      const offered = waitlistRes.filter((e) => e.status === 'OFFERED');
      setOfferedWaitlistEntries(offered);
    } catch {
      // Ignorar errores en sondeo silencioso
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
      const interval = setInterval(fetchUserData, 20000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      setOfferedWaitlistEntries([]);
    }
  }, [isAuthenticated, fetchUserData]);

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
    fetchUserData();
  };

  return (
    <div
      className={`min-h-screen bg-sand-50 text-charcoal flex flex-col transition-[padding] duration-300 ${
        sidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
      }`}
    >
      {/* Sidebar Drawer & Desktop Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAuth={handleOpenAuth}
        onOpenMyBookings={() => {
          setMyBookingsInitialTab('bookings');
          setMyBookingsOpen(true);
        }}
        onOpenAttendance={() => setAttendanceOpen(true)}
        onOpenAdminClasses={() => setAdminClassesOpen(true)}
        onOpenAdminBranches={() => setAdminBranchesOpen(true)}
        onOpenAdminUsers={() => setAdminUsersOpen(true)}
        onOpenAdminVouchers={() => setAdminVouchersOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadCount={unreadCount}
        offeredWaitlistCount={offeredWaitlistEntries.length}
      />

      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenAuth={handleOpenAuth}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenMyBookings={() => {
          setMyBookingsInitialTab('bookings');
          setMyBookingsOpen(true);
        }}
        unreadNotificationsCount={unreadCount}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 md:py-12 w-full">
        {/* Urgent Waitlist Offer Alert Banner */}
        {offeredWaitlistEntries.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white shrink-0">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    Sobrecupo Liberado · 1 Hora para confirmar
                  </span>
                </div>
                <h3 className="font-bold text-base mt-1 leading-tight">
                  ¡Se liberó tu cupo para{' '}
                  <span className="underline decoration-white/60">
                    {offeredWaitlistEntries[0].schedule?.classType?.title || 'tu clase solicitada'}
                  </span>
                  !
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Un alumno canceló su asistencia. Confirma tu reserva ahora antes de que el cupo pase al siguiente en la lista.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setMyBookingsInitialTab('waitlist');
                  setMyBookingsOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white rounded-xl transition"
              >
                Ver Lista
              </button>
              <button
                type="button"
                onClick={() => setAcceptingOfferEntry(offeredWaitlistEntries[0])}
                className="px-4 py-2 bg-white text-amber-950 font-bold text-xs rounded-xl shadow transition hover:bg-amber-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Aceptar Cupo</span>
              </button>
            </div>
          </div>
        )}

        {/* Authenticated User Status Card */}
        {isAuthenticated && user && (
          <div className="mb-8 p-6 rounded-2xl bg-white border border-sand-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-sage-900">¡Hola, {user.name}!</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sand-100 text-charcoal font-semibold border border-sand-200">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Sesión activa con <span className="font-medium text-charcoal">{user.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMyBookingsInitialTab('bookings');
                    setMyBookingsOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-sage-50 text-sage-800 hover:bg-sage-100 border border-sage-200 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Mis Reservas & Sobrecupos</span>
                </button>
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
                    <span className="italic">Sin sede favorita (puedes seleccionarla en la agenda)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Control de aforo activo con PostgreSQL transaccional</span>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Plataforma Multisede · Agenda en Vivo
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-sage-900 mb-6 leading-tight">
            Encuentra tu ritmo, conecta con tu cuerpo y reserva en tu sede favorita.
          </h1>

          <p className="text-base md:text-lg text-charcoal-muted max-w-2xl mx-auto mb-8">
            Selecciona entre Providencia, Las Condes o Vitacura, filtra por horario y asegura tu reformer al instante con sistema inteligente de sobrecupos.
          </p>

          {!isAuthenticated && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="px-6 py-3 bg-[#3a1b38] hover:bg-[#4f244c] text-white font-semibold text-sm rounded-xl shadow transition"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => handleOpenAuth('register')}
                className="px-6 py-3 bg-white hover:bg-sand-100 text-charcoal font-semibold text-sm rounded-xl border border-sand-300 shadow-sm transition"
              >
                Registrar Nuevo Alumno
              </button>
            </div>
          )}
        </div>

        {/* Feature Highlights Bento Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Múltiples Sedes</h3>
            <p className="text-sm text-charcoal-muted">Providencia, Las Condes y Vitacura con salones de pilates y disciplinas guiadas.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Doble Método de Pago</h3>
            <p className="text-sm text-charcoal-muted">Pasarela online automatizada o transferencia con comprobante bancario verificable.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Sobrecupos Automáticos</h3>
            <p className="text-sm text-charcoal-muted">Hasta 3 alumnos en espera por clase con notificación y 1 hora de ventana para confirmar.</p>
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
        Atelier Somatique · Plataforma de Agendamiento Multisede & Sobrecupos · Versión 1.0
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
        initialTab={myBookingsInitialTab}
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

      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          fetchUserData();
        }}
        onNotificationsChanged={fetchUserData}
      />

      {/* Modal para Aceptar Cupo Ofrecido desde el Banner */}
      {acceptingOfferEntry && (
        <WaitlistAcceptModal
          entry={acceptingOfferEntry}
          isOpen={true}
          onClose={() => setAcceptingOfferEntry(null)}
          onSuccess={() => {
            setAcceptingOfferEntry(null);
            handleRefreshSchedule();
          }}
        />
      )}
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
