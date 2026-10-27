import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  MapPin,
  Star,
  BookOpen,
  Zap,
  FileCheck,
  CalendarPlus,
  ClipboardList,
  Users,
  History,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Building2,
  ArrowRight,
  Bell,
  UserCog,
  Phone,
  Mail,
  Menu,
  BarChart3,
  PieChart,
  Award,
  CalendarClock,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { AccountProfileModal } from './components/AccountProfileModal';
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
import { ClassHistoryModal } from './components/ClassHistoryModal';
import { LandingPage } from './components/LandingPage';
import { notificationsApi, waitlistApi, bookingsApi, attendanceApi } from './services/api';
import type { ClassSchedule, Booking } from './types/schedule';
import type { WaitlistEntry } from './types/waitlist';
import type { InstructorClassSchedule } from './types/attendance';
import type { AppNotification } from './types/notification';

function MainContent() {
  const { user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'LANDING' | 'CATALOG'>('CATALOG');

  useEffect(() => {
    if (isAuthenticated) {
      setActiveView('CATALOG');
    }
  }, [isAuthenticated]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<Booking | null>(null);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [myBookingsInitialTab, setMyBookingsInitialTab] = useState<'bookings' | 'waitlist'>('bookings');
  const [classHistoryOpen, setClassHistoryOpen] = useState(false);
  const [adminVouchersOpen, setAdminVouchersOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceScheduleId, setAttendanceScheduleId] = useState<string | null>(null);
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);
  const [adminBranchesOpen, setAdminBranchesOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);
  const [adminClassesOpen, setAdminClassesOpen] = useState(false);
  const [adminClassesMode, setAdminClassesMode] = useState<'BLOCKS' | 'UPCOMING'>('BLOCKS');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [initialNotificationId, setInitialNotificationId] = useState<string | null>(null);

  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [catalogKey, setCatalogKey] = useState(0);
  const [offeredWaitlistEntries, setOfferedWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [acceptingOfferEntry, setAcceptingOfferEntry] = useState<WaitlistEntry | null>(null);

  // Datos de inicio por perfil
  const [myBookingsList, setMyBookingsList] = useState<Booking[]>([]);
  const [adminAllBookings, setAdminAllBookings] = useState<Booking[]>([]);
  const [adminPendingVouchers, setAdminPendingVouchers] = useState<Booking[]>([]);
  const [instructorClasses, setInstructorClasses] = useState<InstructorClassSchedule[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const [notifRes, waitlistRes, myBookingsRes] = await Promise.all([
        notificationsApi.getMy().catch(() => ({ notifications: [] as AppNotification[], unreadCount: 0 })),
        waitlistApi.getMyEntries().catch(() => [] as WaitlistEntry[]),
        bookingsApi.getMyBookings().catch(() => [] as Booking[]),
      ]);
      setMyNotifications(notifRes.notifications || []);
      setUnreadCount(notifRes.unreadCount);
      const offered = waitlistRes.filter((e) => e.status === 'OFFERED');
      setOfferedWaitlistEntries(offered);
      setMyBookingsList(myBookingsRes);

      if (user.role === 'ADMIN') {
        const [pendingRes, allBookingsRes, classesRes] = await Promise.all([
          bookingsApi.getPendingVouchers().catch(() => [] as Booking[]),
          bookingsApi.getAllBookings().catch(() => [] as Booking[]),
          attendanceApi.getMyClasses({ all: true }).catch(() => [] as InstructorClassSchedule[]),
        ]);
        setAdminPendingVouchers(pendingRes);
        setAdminAllBookings(allBookingsRes);
        setInstructorClasses(classesRes);
      }
    } catch {
      // Ignorar errores en sondeo silencioso
    }
  }, [isAuthenticated, user?.id, user?.role]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
      const interval = setInterval(fetchUserData, 20000);
      return () => clearInterval(interval);
    } else {
      setMyNotifications([]);
      setUnreadCount(0);
      setOfferedWaitlistEntries([]);
      setMyBookingsList([]);
      setAdminAllBookings([]);
      setAdminPendingVouchers([]);
      setInstructorClasses([]);
    }
  }, [isAuthenticated, fetchUserData]);

  // Métricas derivadas para el perfil Alumno (CLIENT)
  const clientDashboardStats = useMemo(() => {
    const now = new Date();
    const active = myBookingsList
      .filter((b) => {
        const end = b.schedule?.endTime ? new Date(b.schedule.endTime) : null;
        const isPast = end ? end < now : false;
        const isTerminal =
          b.status === 'CANCELADA_CLIENTE' ||
          b.status === 'RECHAZADA_ADMIN' ||
          b.status === 'FINALIZADA' ||
          b.attendanceStatus === 'ATTENDED' ||
          b.attendanceStatus === 'NO_SHOW' ||
          b.attendanceStatus === 'EXCUSED';
        return !isPast && !isTerminal;
      })
      .sort(
        (a, b) =>
          new Date(a.schedule?.startTime || 0).getTime() -
          new Date(b.schedule?.startTime || 0).getTime(),
      );

    const recentClasses = [...myBookingsList]
      .sort(
        (a, b) =>
          new Date(b.schedule?.startTime || b.createdAt || 0).getTime() -
          new Date(a.schedule?.startTime || a.createdAt || 0).getTime(),
      )
      .slice(0, 3);

    const attendedCount = myBookingsList.filter(
      (b) => b.attendanceStatus === 'ATTENDED' || b.status === 'FINALIZADA',
    ).length;

    const historyCount = myBookingsList.length - active.length;

    return {
      activeBookings: active,
      nextBooking: active[0] || null,
      recentClasses,
      attendedCount,
      historyCount: Math.max(0, historyCount),
    };
  }, [myBookingsList]);

  // Métricas y Gráficos para el Dashboard Ejecutivo del Administrador
  const adminDashboardStats = useMemo(() => {
    const now = new Date();
    const activeStudioBookings = adminAllBookings.filter((b) => {
      const end = b.schedule?.endTime ? new Date(b.schedule.endTime) : null;
      const isPast = end ? end < now : false;
      const isTerminal =
        b.status === 'CANCELADA_CLIENTE' ||
        b.status === 'RECHAZADA_ADMIN' ||
        b.status === 'FINALIZADA';
      return !isPast && !isTerminal;
    });

    const confirmedBookings = adminAllBookings.filter(
      (b) => b.status === 'CONFIRMADA' || b.status === 'FINALIZADA',
    );

    const totalRevenue = confirmedBookings.reduce((sum, b) => {
      const amount = Number(b.payment?.amount ?? b.schedule?.price ?? 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const activeSchedules = instructorClasses.filter(
      (c) => c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS',
    );

    // 1. Datos para Gráfico 1: Asistencia de Clases
    const attendedBookingsCount = adminAllBookings.filter(
      (b) => b.attendanceStatus === 'ATTENDED',
    ).length;
    const noShowBookingsCount = adminAllBookings.filter(
      (b) => b.attendanceStatus === 'NO_SHOW',
    ).length;
    const pendingAttendanceCount = adminAllBookings.filter(
      (b) =>
        (b.status === 'CONFIRMADA' || b.status === 'PENDIENTE_VALIDACION') &&
        (!b.attendanceStatus || b.attendanceStatus === 'PENDING'),
    ).length;
    const cancelledBookingsCount = adminAllBookings.filter(
      (b) => b.status === 'CANCELADA_CLIENTE' || b.status === 'RECHAZADA_ADMIN',
    ).length;

    const completedClassesCount = instructorClasses.filter(
      (c) => c.status === 'COMPLETED' || (c.stats?.attended || 0) > 0,
    ).length;
    const cancelledClassesCount = instructorClasses.filter(
      (c) => c.status === 'CANCELLED',
    ).length;

    const evaluatedAttendanceTotal = attendedBookingsCount + noShowBookingsCount;
    const attendanceRatePct =
      evaluatedAttendanceTotal > 0
        ? Math.round((attendedBookingsCount / evaluatedAttendanceTotal) * 100)
        : 100;

    // 2. Datos para Gráfico 2: Sedes con Mayor Solicitud y Agendamientos
    const branchMap = new Map<
      string,
      {
        name: string;
        bookingsCount: number;
        totalCapacity: number;
        occupiedSlots: number;
        classesCount: number;
      }
    >();

    for (const cls of instructorClasses) {
      if (cls.status === 'CANCELLED') continue;
      const bName = cls.branch?.name || 'Sede Principal';
      const current = branchMap.get(bName) || {
        name: bName,
        bookingsCount: 0,
        totalCapacity: 0,
        occupiedSlots: 0,
        classesCount: 0,
      };
      const enrolled = cls.stats?.enrolled ?? Math.max(0, cls.capacity - cls.availableSlots);
      current.classesCount += 1;
      current.totalCapacity += cls.capacity;
      current.occupiedSlots += enrolled;
      current.bookingsCount += enrolled;
      branchMap.set(bName, current);
    }

    // Asegurar conteo también desde reservas globales si alguna sede no tenía clase en la lista
    for (const bk of adminAllBookings) {
      if (bk.status === 'CANCELADA_CLIENTE' || bk.status === 'RECHAZADA_ADMIN') continue;
      const bName = bk.schedule?.branch?.name || 'Sede Principal';
      if (!branchMap.has(bName)) {
        branchMap.set(bName, {
          name: bName,
          bookingsCount: 1,
          totalCapacity: bk.schedule?.capacity || 8,
          occupiedSlots: 1,
          classesCount: 1,
        });
      }
    }

    const branchStats = Array.from(branchMap.values()).sort(
      (a, b) => b.bookingsCount - a.bookingsCount || b.classesCount - a.classesCount,
    );
    const maxBranchBookings = Math.max(1, ...branchStats.map((b) => b.bookingsCount));
    const topBranch = branchStats[0] || null;

    return {
      pendingVouchersCount: adminPendingVouchers.length,
      activeStudioBookingsCount: activeStudioBookings.length,
      activeSchedulesCount: activeSchedules.length,
      totalRevenue,
      nextStudioClass: activeSchedules[0] || null,
      attendanceChart: {
        attended: attendedBookingsCount,
        noShow: noShowBookingsCount,
        pending: pendingAttendanceCount,
        cancelled: cancelledBookingsCount,
        attendanceRatePct,
        completedClassesCount,
        cancelledClassesCount,
      },
      branchChart: {
        branches: branchStats,
        maxBranchBookings,
        topBranch,
      },
    };
  }, [adminAllBookings, adminPendingVouchers, instructorClasses]);

  const formatShortDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  };

  const formatShortTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectSchedule = (schedule: ClassSchedule, existingBooking?: Booking | null) => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    const resolvedBooking =
      existingBooking ||
      myBookingsList.find(
        (b) =>
          b.scheduleId === schedule.id &&
          ['CONFIRMADA', 'PENDIENTE_VALIDACION', 'PENDIENTE_PAGO'].includes(b.status),
      ) ||
      null;

    setSelectedBookingForModal(resolvedBooking);
    setSelectedSchedule(schedule);
  };

  const handleRefreshSchedule = () => {
    setCatalogKey((prev) => prev + 1);
    setAttendanceRefreshKey((prev) => prev + 1);
    fetchUserData();
  };

  const handleOpenNotificationDetail = (notificationId: string) => {
    setInitialNotificationId(notificationId);
    setNotificationsOpen(true);
  };

  // Vista Pública de Bienvenida (Sin Menú Lateral / Sin Sidebar)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf9f6] text-[#1c1917]">
        <LandingPage
          onOpenLogin={() => handleOpenAuth('login')}
          onOpenRegister={() => handleOpenAuth('register')}
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 text-charcoal flex flex-col lg:pl-72 transition-[padding] duration-300 overflow-x-clip">
      {/* Sidebar Drawer & Desktop Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAuth={handleOpenAuth}
        onOpenAccount={() => setAccountModalOpen(true)}
        onOpenMyBookings={() => {
          setMyBookingsInitialTab('bookings');
          setMyBookingsOpen(true);
        }}
        onOpenClassHistory={() => setClassHistoryOpen(true)}
        onOpenAttendance={() => {
          setAttendanceScheduleId(null);
          setAttendanceOpen(true);
        }}
        onOpenUpcomingClasses={() => {
          setAdminClassesMode('UPCOMING');
          setAdminClassesOpen(true);
        }}
        onOpenAdminClasses={() => {
          setAdminClassesMode('BLOCKS');
          setAdminClassesOpen(true);
        }}
        onOpenAdminBranches={() => setAdminBranchesOpen(true)}
        onOpenAdminUsers={() => setAdminUsersOpen(true)}
        onOpenAdminVouchers={() => setAdminVouchersOpen(true)}
        onOpenNotifications={() => {
          setInitialNotificationId(null);
          setNotificationsOpen(true);
        }}
        unreadCount={unreadCount}
        pendingVouchersCount={adminDashboardStats.pendingVouchersCount}
        offeredWaitlistCount={offeredWaitlistEntries.length}
        activeView={activeView}
        onSelectView={(view) => setActiveView(view)}
      />

      {/* Botón compacto solo para dispositivos móviles (< 1024px) */}
      <div className="lg:hidden sticky top-0 z-20 bg-[#220622] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          <Menu className="w-4 h-4" />
          <span>Menú</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-rose-100">
            K
          </div>
          <span className="font-serif font-bold text-sm tracking-tight text-white">K PILATES</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setInitialNotificationId(null);
            setNotificationsOpen(true);
          }}
          className="relative p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#d92676] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Urgent Waitlist Offer Alert Banner (Solo Alumnos) */}
        {user?.role === 'CLIENT' && offeredWaitlistEntries.length > 0 && (
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
                    {offeredWaitlistEntries[0].schedule?.branch?.name || 'tu sesión solicitada'}
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

        {/* Dynamic Views: LANDING | CATALOG */}
        {activeView === 'LANDING' && (
          <div className="-mx-4 -my-8 md:-my-10">
            <LandingPage
              onOpenLogin={() => handleOpenAuth('login')}
              onOpenRegister={() => handleOpenAuth('register')}
            />
          </div>
        )}

        {activeView === 'CATALOG' && (
          <div>
            {/* ========================================================================= */}
            {/* 1. DASHBOARD PRINCIPAL DEL ADMINISTRADOR (PANEL EJECUTIVO + 2 GRÁFICOS)   */}
            {/* ========================================================================= */}
            {isAuthenticated && user && user.role === 'ADMIN' && (
              <div className="mb-8 space-y-5">
                {/* Panel Ejecutivo */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#261025] via-[#3a1b38] to-[#220622] text-white shadow-lg border border-[#3a1b38]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm text-white flex items-center justify-center font-bold text-lg shadow-sm border border-white/20">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-white">Panel Ejecutivo · {user.name}</h2>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#d92676] text-white font-bold uppercase tracking-wider">
                            Administrador
                          </span>
                        </div>
                        <p className="text-xs text-rose-100/80 mt-0.5">
                          Dashboard de operación diaria, métricas de asistencia, demanda por sede y control de pagos
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminVouchersOpen(true)}
                        className="px-4 py-2 text-xs font-bold bg-[#d92676] hover:bg-[#c21865] text-white rounded-xl transition flex items-center gap-1.5 shadow-md"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Validar Pagos ({adminDashboardStats.pendingVouchersCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceScheduleId(null);
                          setAttendanceOpen(true);
                        }}
                        className="px-3.5 py-2 text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-400/40 rounded-xl transition flex items-center gap-1.5"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Asistencia del Día</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminClassesMode('BLOCKS');
                          setAdminClassesOpen(true);
                        }}
                        className="px-3.5 py-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl transition flex items-center gap-1.5"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Bloques & Horarios</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Grid de Administración (Sin Reservas Personales) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/15">
                    <button
                      type="button"
                      onClick={() => setAdminVouchersOpen(true)}
                      className={`p-3.5 rounded-xl text-left transition border ${adminDashboardStats.pendingVouchersCount > 0
                        ? 'bg-amber-500/20 border-amber-400/50 hover:bg-amber-500/30'
                        : 'bg-white/10 border-white/15 hover:bg-white/15'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs text-rose-100/90 mb-1">
                        <span>Vouchers por Validar</span>
                        <FileCheck className="w-4 h-4 text-amber-300" />
                      </div>
                      <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                        <span>{adminDashboardStats.pendingVouchersCount}</span>
                        {adminDashboardStats.pendingVouchersCount > 0 && (
                          <span className="text-[10px] font-semibold text-amber-300 animate-pulse">
                            En revisión
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAdminClassesMode('UPCOMING');
                        setAdminClassesOpen(true);
                      }}
                      className="p-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-left transition"
                    >
                      <div className="flex items-center justify-between text-xs text-rose-100/90 mb-1">
                        <span>Alumnos Agendados</span>
                        <Users className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
                        <span>{adminDashboardStats.activeStudioBookingsCount}</span>
                        <span className="text-[11px] font-normal text-rose-100/70">en próximas clases</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceScheduleId(null);
                        setAttendanceOpen(true);
                      }}
                      className="p-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-left transition"
                    >
                      <div className="flex items-center justify-between text-xs text-rose-100/90 mb-1">
                        <span>Sesiones Programadas</span>
                        <ClipboardList className="w-4 h-4 text-sky-300" />
                      </div>
                      <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
                        <span>{adminDashboardStats.activeSchedulesCount}</span>
                        <span className="text-[11px] font-normal text-rose-100/70">clases activas</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClassHistoryOpen(true)}
                      className="p-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-left transition"
                    >
                      <div className="flex items-center justify-between text-xs text-rose-100/90 mb-1">
                        <span>Recaudación Confirmada</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xl font-bold text-emerald-300 truncate">
                        {formatCurrency(adminDashboardStats.totalRevenue)}
                      </div>
                    </button>
                  </div>

                  {/* Barra de Accesos Rápidos Admin */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceScheduleId(null);
                          setAttendanceOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center gap-1.5"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Asistencia & Check-in (Hoy)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminClassesMode('UPCOMING');
                          setAdminClassesOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center gap-1.5"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-sky-200" />
                        <span>Próximas Clases</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClassHistoryOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5 text-purple-200" />
                        <span>Historial de Clases</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminBranchesOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5 text-rose-200" />
                        <span>Sedes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminUsersOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-200" />
                        <span>Usuarios</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-rose-100/70 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Modo Administrador activo
                    </span>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* SECCIÓN DE GRÁFICOS ANALÍTICOS DEL DASHBOARD (2 GRÁFICOS)                 */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {/* GRÁFICO 1: ASISTENCIA DE CLASES Y ESTADO DE SESIONES */}
                  <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                          <PieChart className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-charcoal">
                            Gráfico de Asistencia de Clases
                          </h3>
                          <p className="text-[11px] text-charcoal-muted">
                            Comparativa de asistencia de alumnos y sesiones realizadas vs canceladas
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {adminDashboardStats.attendanceChart.attendanceRatePct}% Asistencia
                      </span>
                    </div>

                    {/* Barras Visuales de Asistencia */}
                    <div className="space-y-3 pt-1">
                      {(() => {
                        const { attended, noShow, pending } = adminDashboardStats.attendanceChart;
                        const total = Math.max(1, attended + noShow + pending);
                        const attendedPct = Math.round((attended / total) * 100);
                        const noShowPct = Math.round((noShow / total) * 100);
                        const pendingPct = Math.round((pending / total) * 100);

                        return (
                          <>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                  Alumnos Presentes (Asistieron)
                                </span>
                                <span className="font-bold text-charcoal">
                                  {attended} ({attendedPct}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-sand-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(attended > 0 ? 8 : 0, attendedPct)}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-rose-800 flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                  Inasistencias (No Presentes)
                                </span>
                                <span className="font-bold text-charcoal">
                                  {noShow} ({noShowPct}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-sand-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(noShow > 0 ? 8 : 0, noShowPct)}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                  Agendados por Realizar (Próximos)
                                </span>
                                <span className="font-bold text-charcoal">
                                  {pending} ({pendingPct}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-sand-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(pending > 0 ? 8 : 0, pendingPct)}%` }}
                                />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Footer Resumen de Clases Realizadas vs Canceladas */}
                    <div className="pt-3 border-t border-sand-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-charcoal-muted">
                          ✅ Clases Realizadas:{' '}
                          <strong className="text-emerald-700">
                            {adminDashboardStats.attendanceChart.completedClassesCount}
                          </strong>
                        </span>
                        <span className="text-charcoal-muted">
                          ❌ Suspendidas:{' '}
                          <strong className="text-rose-700">
                            {adminDashboardStats.attendanceChart.cancelledClassesCount}
                          </strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClassHistoryOpen(true)}
                        className="text-[11px] font-bold text-[#3a1b38] hover:underline flex items-center gap-1"
                      >
                        <span>Ver Historial</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* GRÁFICO 2: SEDES CON MAYOR SOLICITUD Y AGENDAMIENTOS */}
                  <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#3a1b38] border border-purple-200 flex items-center justify-center shrink-0">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-charcoal">
                            Agendamientos y Solicitud por Sede
                          </h3>
                          <p className="text-[11px] text-charcoal-muted">
                            Ranking de sedes con mayor demanda de reservas y ocupación de cupos
                          </p>
                        </div>
                      </div>

                      {adminDashboardStats.branchChart.topBranch && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1 shrink-0">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>Top: {adminDashboardStats.branchChart.topBranch.name}</span>
                        </span>
                      )}
                    </div>

                    {/* Barras por Sede */}
                    <div className="space-y-3 pt-1">
                      {adminDashboardStats.branchChart.branches.length === 0 ? (
                        <p className="text-xs text-charcoal-muted py-6 text-center">
                          No hay datos de sedes registrados aún.
                        </p>
                      ) : (
                        adminDashboardStats.branchChart.branches.map((b, idx) => {
                          const barPct = Math.round(
                            (b.bookingsCount / adminDashboardStats.branchChart.maxBranchBookings) *
                            100,
                          );
                          const occupancyPct =
                            b.totalCapacity > 0
                              ? Math.round((b.occupiedSlots / b.totalCapacity) * 100)
                              : 0;

                          return (
                            <div key={b.name} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-charcoal flex items-center gap-1.5">
                                  <MapPin
                                    className={`w-3.5 h-3.5 ${idx === 0 ? 'text-[#d92676]' : 'text-[#3a1b38]'
                                      }`}
                                  />
                                  <span>{b.name}</span>
                                  {idx === 0 && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-[#d92676] font-bold border border-rose-200">
                                      Mayor solicitud
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold text-charcoal">
                                  {b.bookingsCount}{' '}
                                  {b.bookingsCount === 1 ? 'agendamiento' : 'agendamientos'}{' '}
                                  <span className="text-[11px] font-normal text-charcoal-muted">
                                    ({occupancyPct}% ocupación)
                                  </span>
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-sand-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-[#d92676]' : 'bg-[#3a1b38]'
                                    }`}
                                  style={{
                                    width: `${Math.max(b.bookingsCount > 0 ? 12 : 4, barPct)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-3 border-t border-sand-100 flex items-center justify-between text-xs">
                      <span className="text-charcoal-muted">
                        Total sedes activas:{' '}
                        <strong className="text-charcoal">
                          {adminDashboardStats.branchChart.branches.length}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdminBranchesOpen(true)}
                        className="text-[11px] font-bold text-[#3a1b38] hover:underline flex items-center gap-1"
                      >
                        <span>Administrar Sedes</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. PANTALLA DE INICIO PERFIL ALUMNO (CLIENT)                              */}
            {/* ========================================================================= */}
            {isAuthenticated && user && user.role === 'CLIENT' && (
              <div className="mb-8 space-y-5">
                <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-sage-900">¡Hola, {user.name}!</h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            Alumno Activo
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-muted mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-[#3a1b38]" />
                            {user.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-[#3a1b38]" />
                            {user.phone}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#d92676]" />
                            Sede Favorita:{' '}
                            {user.favoriteBranch ? (
                              <strong className="text-[#3a1b38] font-bold inline-flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {user.favoriteBranch.name}
                              </strong>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAccountModalOpen(true)}
                                className="text-[#d92676] font-bold hover:underline"
                              >
                                Elegir en Mi Cuenta
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-[#3a1b38] border border-purple-200 rounded-xl transition flex items-center gap-1.5"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>Mi Cuenta & Sede</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMyBookingsInitialTab('bookings');
                          setMyBookingsOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-bold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Mis Reservas ({clientDashboardStats.activeBookings.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid de 2 Columnas en Inicio del Alumno */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-3 border-t border-sand-100">
                    <div className="p-4 rounded-2xl bg-sand-50/70 border border-sand-200 flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#3a1b38]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                            Tus Últimas y Próximas Clases
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClassHistoryOpen(true)}
                          className="text-[11px] font-bold text-[#3a1b38] hover:underline flex items-center gap-1"
                        >
                          <span>Ver historial ({clientDashboardStats.historyCount})</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {clientDashboardStats.recentClasses.length === 0 ? (
                        <div className="py-5 text-center text-xs text-charcoal-muted">
                          <p className="font-semibold text-charcoal">Aún no tienes clases registradas</p>
                          <p className="mt-0.5">Selecciona un horario en la agenda inferior para reservar tu primera sesión.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {clientDashboardStats.recentClasses.map((bk) => (
                            <div
                              key={bk.id}
                              className="p-3 rounded-xl bg-white border border-sand-200 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-charcoal truncate">
                                    Sesión en {bk.schedule?.branch?.name || 'Sede Central'}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${bk.status === 'CONFIRMADA'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : bk.status === 'PENDIENTE_VALIDACION'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : bk.status === 'PENDIENTE_PAGO'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-stone-100 text-stone-600 border-stone-200'
                                      }`}
                                  >
                                    {bk.status === 'CONFIRMADA'
                                      ? 'Confirmada'
                                      : bk.status === 'PENDIENTE_VALIDACION'
                                        ? 'En Revisión'
                                        : bk.status === 'PENDIENTE_PAGO'
                                          ? 'Pendiente Pago'
                                          : bk.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-charcoal-muted capitalize">
                                  <span>{formatShortDate(bk.schedule?.startTime)}</span>
                                  <span>·</span>
                                  <span>{formatShortTime(bk.schedule?.startTime)} hrs</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setMyBookingsInitialTab('bookings');
                                  setMyBookingsOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-sand-100 hover:bg-sand-200 text-charcoal shrink-0 transition"
                              >
                                Gestionar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/70 flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#d92676]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                            Mis Avisos y Notificaciones
                          </h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d92676] text-white">
                              {unreadCount} nueva{unreadCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        {myNotifications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setInitialNotificationId(null);
                              setNotificationsOpen(true);
                            }}
                            className="text-[11px] font-bold text-[#3a1b38] hover:underline"
                          >
                            Ver todas ({myNotifications.length})
                          </button>
                        )}
                      </div>

                      {myNotifications.length === 0 ? (
                        <div className="py-6 px-4 rounded-xl bg-white/80 border border-sand-200 text-center text-xs text-charcoal-muted">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                          <p className="font-bold text-charcoal">No tienes notificaciones</p>
                          <p className="text-[11px] mt-0.5">
                            Aquí aparecerán las confirmaciones de tus pagos, sobrecupos y avisos de tus sedes.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {myNotifications.slice(0, 2).map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${!notif.read
                                ? 'bg-white border-purple-300 shadow-xs'
                                : 'bg-white/70 border-sand-200'
                                }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-[#d92676] shrink-0" />
                                  )}
                                  <p className="font-bold text-charcoal truncate">{notif.title}</p>
                                </div>
                                <p className="text-[11px] text-charcoal-muted line-clamp-1">
                                  {notif.message}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenNotificationDetail(notif.id)}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#3a1b38] hover:bg-[#261025] text-white shrink-0 transition flex items-center gap-1 shadow-xs"
                              >
                                <span>Ver Notificación</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Schedules / Class Catalog */}
            <ScheduleCatalog
              key={catalogKey}
              onRequestLogin={() => handleOpenAuth('login')}
              onSelectSchedule={handleSelectSchedule}
              onOpenAccount={() => setAccountModalOpen(true)}
              onManageSchedule={(sch) => {
                setAttendanceScheduleId(sch.id);
                setAttendanceOpen(true);
              }}
              myBookings={myBookingsList}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-sand-200 py-6 text-center text-xs text-charcoal-muted bg-white/50 px-4">
        K PILATES · Plataforma de Reservas de Clases & Gestión de Sedes · Versión 1.0
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <AccountProfileModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onProfileUpdated={handleRefreshSchedule}
      />

      <BookingModal
        schedule={selectedSchedule}
        existingBooking={
          selectedBookingForModal ||
          (selectedSchedule
            ? myBookingsList.find(
              (b) =>
                b.scheduleId === selectedSchedule.id &&
                ['CONFIRMADA', 'PENDIENTE_VALIDACION', 'PENDIENTE_PAGO'].includes(b.status),
            ) || null
            : null)
        }
        userBookings={myBookingsList}
        isOpen={!!selectedSchedule}
        onClose={() => {
          setSelectedSchedule(null);
          setSelectedBookingForModal(null);
        }}
        onSuccess={() => {
          fetchUserData();
          handleRefreshSchedule();
        }}
      />

      <MyBookingsModal
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onRefreshSchedule={handleRefreshSchedule}
        initialTab={myBookingsInitialTab}
        onOpenClassHistory={() => setClassHistoryOpen(true)}
      />

      <ClassHistoryModal
        isOpen={classHistoryOpen}
        onClose={() => setClassHistoryOpen(false)}
        onOpenMyBookings={
          user?.role === 'CLIENT'
            ? () => {
              setMyBookingsInitialTab('bookings');
              setMyBookingsOpen(true);
            }
            : undefined
        }
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
          setAttendanceScheduleId(null);
          handleRefreshSchedule();
        }}
        initialScheduleId={attendanceScheduleId}
        refreshKey={attendanceRefreshKey}
        onOpenHistory={() => setClassHistoryOpen(true)}
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
        mode={adminClassesMode}
        onClose={() => {
          setAdminClassesOpen(false);
          handleRefreshSchedule();
        }}
        onUpdated={handleRefreshSchedule}
        onViewAttendees={(schId) => {
          setAdminClassesOpen(false);
          setAttendanceScheduleId(schId);
          setAttendanceOpen(true);
        }}
      />

      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          setInitialNotificationId(null);
          fetchUserData();
        }}
        onNotificationsChanged={handleRefreshSchedule}
        initialNotificationId={initialNotificationId}
      />

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
