import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  History,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Ban,
  AlertCircle,
  Eye,
  Loader2,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Booking } from '../types/schedule';
import type { InstructorClassSchedule } from '../types/attendance';
import { bookingsApi, attendanceApi } from '../services/api';
import { VoucherPreviewModal } from './VoucherPreviewModal';
import { useAuth } from '../context/AuthContext';

interface ClassHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMyBookings?: () => void;
}

type ClientHistoryFilter = 'ALL' | 'ATTENDED' | 'CANCELLED' | 'REJECTED' | 'NO_SHOW';
type AdminClassHistoryFilter = 'ALL' | 'REALIZED' | 'NOT_REALIZED';

export const ClassHistoryModal: React.FC<ClassHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenMyBookings,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Estado para Alumno (reservas individuales)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeClientFilter, setActiveClientFilter] = useState<ClientHistoryFilter>('ALL');

  // Estado para Administrador (clases realizadas / no realizadas con sus asistentes)
  const [adminClasses, setAdminClasses] = useState<InstructorClassSchedule[]>([]);
  const [activeAdminFilter, setActiveAdminFilter] = useState<AdminClassHistoryFilter>('ALL');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [viewingVoucher, setViewingVoucher] = useState<{
    url: string;
    bookingCode?: string;
    classTitle?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, isAdmin]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const classesData = await attendanceApi.getMyClasses({ all: true });
        setAdminClasses(classesData);
      } else {
        const bookingsData = await bookingsApi.getMyBookings();
        setBookings(bookingsData);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial de clases');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // LÓGICA MODO ADMINISTRADOR: HISTORIAL DE CLASES (DESDE EL DÍA ANTERIOR O FINALIZADAS)
  // =========================================================================
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const isClassRealized = (cls: InstructorClassSchedule): boolean => {
    if (cls.status === 'CANCELLED') return false;
    if (cls.status === 'COMPLETED') return true;
    const attended = cls.stats?.attended || 0;
    return attended > 0;
  };

  const historicalAdminClasses = useMemo(() => {
    return adminClasses
      .filter((cls) => {
        const clsDate = new Date(cls.startTime).toISOString().slice(0, 10);
        // Mostrar clases desde el día anterior hacia atrás, O clases que ya fueron marcadas como Realizadas (COMPLETED) o Canceladas (CANCELLED)
        const isFromYesterdayOrBefore = clsDate < todayIso;
        const isClosedStatus = cls.status === 'COMPLETED' || cls.status === 'CANCELLED';
        return isFromYesterdayOrBefore || isClosedStatus;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [adminClasses, todayIso]);

  const adminCounts = useMemo(() => {
    const realized = historicalAdminClasses.filter((c) => isClassRealized(c)).length;
    const notRealized = historicalAdminClasses.length - realized;
    return {
      ALL: historicalAdminClasses.length,
      REALIZED: realized,
      NOT_REALIZED: notRealized,
    };
  }, [historicalAdminClasses]);

  const filteredAdminClasses = useMemo(() => {
    return historicalAdminClasses.filter((cls) => {
      const realized = isClassRealized(cls);
      if (activeAdminFilter === 'REALIZED' && !realized) return false;
      if (activeAdminFilter === 'NOT_REALIZED' && realized) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const title = cls.classType?.title?.toLowerCase() || '';
        const branch = cls.branch?.name?.toLowerCase() || '';
        const instructor = cls.instructor?.name?.toLowerCase() || '';
        const hasStudentMatch = (cls.bookings || []).some(
          (b) =>
            b.user?.name?.toLowerCase().includes(term) ||
            b.user?.email?.toLowerCase().includes(term) ||
            b.bookingCode?.toLowerCase().includes(term),
        );
        return (
          title.includes(term) ||
          branch.includes(term) ||
          instructor.includes(term) ||
          hasStudentMatch
        );
      }

      return true;
    });
  }, [historicalAdminClasses, activeAdminFilter, searchTerm]);

  // =========================================================================
  // LÓGICA MODO ALUMNO: HISTORIAL PERSONAL DE RESERVAS
  // =========================================================================
  const historyBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b) => {
      const scheduleEnd = b.schedule?.endTime ? new Date(b.schedule.endTime) : null;
      const scheduleStart = b.schedule?.startTime ? new Date(b.schedule.startTime) : null;
      const isPast = (scheduleEnd && scheduleEnd < now) || (scheduleStart && scheduleStart < now);
      const isInactiveStatus =
        b.status === 'CANCELADA_CLIENTE' ||
        b.status === 'RECHAZADA_ADMIN' ||
        b.status === 'FINALIZADA' ||
        b.attendanceStatus === 'ATTENDED' ||
        b.attendanceStatus === 'NO_SHOW' ||
        b.attendanceStatus === 'EXCUSED';

      return isPast || isInactiveStatus;
    });
  }, [bookings]);

  const clientCounts = useMemo(() => {
    return {
      ALL: historyBookings.length,
      ATTENDED: historyBookings.filter(
        (b) => b.attendanceStatus === 'ATTENDED' || b.status === 'FINALIZADA',
      ).length,
      CANCELLED: historyBookings.filter((b) => b.status === 'CANCELADA_CLIENTE').length,
      REJECTED: historyBookings.filter((b) => b.status === 'RECHAZADA_ADMIN').length,
      NO_SHOW: historyBookings.filter((b) => b.attendanceStatus === 'NO_SHOW').length,
    };
  }, [historyBookings]);

  const filteredClientBookings = useMemo(() => {
    return historyBookings.filter((b) => {
      if (activeClientFilter === 'ATTENDED') {
        const isAttended = b.attendanceStatus === 'ATTENDED' || b.status === 'FINALIZADA';
        if (!isAttended) return false;
      } else if (activeClientFilter === 'CANCELLED') {
        if (b.status !== 'CANCELADA_CLIENTE') return false;
      } else if (activeClientFilter === 'REJECTED') {
        if (b.status !== 'RECHAZADA_ADMIN') return false;
      } else if (activeClientFilter === 'NO_SHOW') {
        if (b.attendanceStatus !== 'NO_SHOW') return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const title = b.schedule?.classType?.title?.toLowerCase() || '';
        const branch = b.schedule?.branch?.name?.toLowerCase() || '';
        const instructor = b.schedule?.instructor?.name?.toLowerCase() || '';
        const code = b.bookingCode?.toLowerCase() || '';
        return (
          title.includes(term) ||
          branch.includes(term) ||
          instructor.includes(term) ||
          code.includes(term)
        );
      }

      return true;
    });
  }, [historyBookings, activeClientFilter, searchTerm]);

  if (!isOpen) return null;

  const formatDateUTC = (isoString: string) =>
    new Date(isoString).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const formatTimeUTC = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });

  const getClientStatusDisplay = (b: Booking) => {
    if (b.status === 'CANCELADA_CLIENTE') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <Ban className="w-3.5 h-3.5 text-stone-500" /> Cancelada
          </span>
        ),
        bgClass: 'bg-stone-50/70 border-stone-200',
      };
    }

    if (b.status === 'RECHAZADA_ADMIN') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-500" /> Pago Rechazado
          </span>
        ),
        bgClass: 'bg-red-50/40 border-red-200',
      };
    }

    if (b.attendanceStatus === 'ATTENDED') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Asistencia Confirmada
          </span>
        ),
        bgClass: 'bg-emerald-50/30 border-emerald-200',
      };
    }

    if (b.attendanceStatus === 'NO_SHOW') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> No asistió
          </span>
        ),
        bgClass: 'bg-rose-50/40 border-rose-200',
      };
    }

    return {
      badge: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Clase Completada
        </span>
      ),
      bgClass: 'bg-blue-50/30 border-blue-200',
    };
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col my-auto">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-sand-100 bg-[#faf9f6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center shadow-sm shrink-0">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#220622]">
                  {isAdmin ? 'Historial de Clases & Alumnos' : 'Historial de Clases'}
                </h2>
                <p className="text-xs text-charcoal-muted mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {isAdmin
                    ? 'Registro de clases realizadas y no realizadas (desde el día anterior o cerradas hoy), con detalle de asistentes e información de cancelación'
                    : 'Registro histórico de sesiones realizadas, cancelaciones y comprobantes'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition shrink-0"
              title="Cerrar historial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar: Búsqueda + Filtros */}
          <div className="shrink-0 p-3 sm:p-4 border-b border-sand-200 bg-sand-50/40 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isAdmin
                    ? 'Buscar por sede, clase, instructor o nombre de alumno asistente...'
                    : 'Buscar por clase, sede, instructor o código...'
                }
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3a1b38]/20 focus:border-[#3a1b38] transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Píldoras de Filtro: Admin vs Alumno */}
            {isAdmin ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveAdminFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeAdminFilter === 'ALL'
                      ? 'bg-[#3a1b38] text-white shadow-sm'
                      : 'bg-white text-charcoal border border-sand-300 hover:bg-sand-100'
                  }`}
                >
                  <span>Todas las Clases ({adminCounts.ALL})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminFilter('REALIZED')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeAdminFilter === 'REALIZED'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Clases Realizadas ({adminCounts.REALIZED})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminFilter('NOT_REALIZED')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeAdminFilter === 'NOT_REALIZED'
                      ? 'bg-red-700 text-white shadow-sm'
                      : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Clases No Realizadas / Canceladas ({adminCounts.NOT_REALIZED})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveClientFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    activeClientFilter === 'ALL'
                      ? 'bg-[#3a1b38] text-white shadow-sm'
                      : 'bg-white text-charcoal border border-sand-300 hover:bg-sand-100'
                  }`}
                >
                  Todas ({clientCounts.ALL})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveClientFilter('ATTENDED')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeClientFilter === 'ATTENDED'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Asistidas ({clientCounts.ATTENDED})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveClientFilter('CANCELLED')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeClientFilter === 'CANCELLED'
                      ? 'bg-stone-700 text-white shadow-sm'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Canceladas ({clientCounts.CANCELLED})</span>
                </button>
              </div>
            )}
          </div>

          {/* Contenido Principal */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-sage-600 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs text-charcoal-muted">Cargando historial de clases...</span>
              </div>
            ) : isAdmin ? (
              /* ========================================================================= */
              /* VISTA ADMIN: CLASES REALIZADAS Y NO REALIZADAS + LISTA DE ASISTENTES      */
              /* ========================================================================= */
              filteredAdminClasses.length === 0 ? (
                <div className="text-center py-16 text-charcoal-muted">
                  <History className="w-12 h-12 text-sand-300 mx-auto mb-2.5" />
                  <h4 className="text-sm font-bold text-charcoal">
                    No se encontraron clases en el historial con este filtro
                  </h4>
                  <p className="text-xs text-charcoal-muted mt-1 max-w-sm mx-auto">
                    Aquí aparecen todas las clases desde el día anterior y las sesiones que marques como "Clase Realizada" en Asistencia & Check-in.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAdminClasses.map((cls) => {
                    const realized = isClassRealized(cls);
                    const isCancelled = cls.status === 'CANCELLED';
                    const isExpanded = expandedClassId === cls.id;
                    const classBookings = cls.bookings || [];
                    const attendedStudents = classBookings.filter(
                      (b) => b.attendanceStatus === 'ATTENDED',
                    );
                    const noShowStudents = classBookings.filter(
                      (b) => b.attendanceStatus === 'NO_SHOW',
                    );
                    const cancellationReason =
                      classBookings.find((b) => b.rejectionReason)?.rejectionReason ||
                      'Clase suspendida por administración';
                    const hour = new Date(cls.startTime).getUTCHours();

                    return (
                      <div
                        key={cls.id}
                        className={`rounded-2xl border transition shadow-xs overflow-hidden ${
                          realized
                            ? 'bg-emerald-50/25 border-emerald-200'
                            : isCancelled
                            ? 'bg-red-50/30 border-red-200'
                            : 'bg-amber-50/25 border-amber-200'
                        }`}
                      >
                        <div className="p-4 sm:p-5 space-y-3">
                          {/* Cabecera de la Clase */}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#3a1b38] border border-purple-200">
                                  📍 {cls.branch?.name || 'Sede Principal'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sand-100 text-charcoal">
                                  {hour < 12 ? 'Jornada AM' : 'Jornada PM'}
                                </span>
                                <span className="font-mono text-xs font-bold text-charcoal">
                                  {formatTimeUTC(cls.startTime)} - {formatTimeUTC(cls.endTime)} hrs
                                </span>
                              </div>
                              <h3 className="font-bold text-base text-charcoal mt-1.5">
                                Clase de Pilates ·{' '}
                                <span className="capitalize">{formatDateUTC(cls.startTime)}</span>
                              </h3>
                              <p className="text-xs text-charcoal-muted mt-0.5">
                                Instructor: <strong>{cls.instructor?.name || 'Administración'}</strong>{' '}
                                · Cupo máximo: {cls.capacity} alumnos
                              </p>
                            </div>

                            {/* Badge Clase Realizada vs No Realizada */}
                            <div className="shrink-0">
                              {realized ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Clase Realizada
                                </span>
                              ) : isCancelled ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                                  <Ban className="w-4 h-4 text-red-600" />
                                  Clase No Realizada (Cancelada)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <XCircle className="w-4 h-4 text-amber-600" />
                                  Clase No Realizada
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Información de Cancelación en caso de haber sido suspendida */}
                          {isCancelled && (
                            <div className="p-3 rounded-xl bg-red-100/70 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Motivo de cancelación de la clase: </span>
                                <span>{cancellationReason}</span>
                              </div>
                            </div>
                          )}

                          {/* Resumen de Asistentes y Botón Desplegable */}
                          <div className="pt-2 border-t border-sand-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-1 font-semibold text-charcoal">
                                <Users className="w-3.5 h-3.5 text-[#3a1b38]" />
                                Inscritos: <strong>{classBookings.length}</strong> / {cls.capacity}
                              </span>
                              <span className="text-emerald-700 font-semibold">
                                ✅ Presentes: <strong>{attendedStudents.length}</strong>
                              </span>
                              <span className="text-rose-700 font-semibold">
                                ❌ Ausentes: <strong>{noShowStudents.length}</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedClassId(isExpanded ? null : cls.id)
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-sand-100 text-[#3a1b38] font-bold border border-sand-300 transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>
                                {isExpanded
                                  ? 'Ocultar Asistentes'
                                  : `Ver Asistentes e Info (${classBookings.length})`}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Lista Desplegable de Asistentes de la Clase */}
                        {isExpanded && (
                          <div className="bg-white/95 border-t border-sand-200 p-4 space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
                              Detalle de Alumnos en esta Clase ({classBookings.length})
                            </h4>

                            {classBookings.length === 0 ? (
                              <p className="text-xs text-charcoal-muted py-2">
                                Esta sesión no registró alumnos inscritos.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {classBookings.map((bk) => {
                                  const isPresent = bk.attendanceStatus === 'ATTENDED';
                                  const isAbsent = bk.attendanceStatus === 'NO_SHOW';
                                  const isPaid =
                                    bk.status === 'CONFIRMADA' ||
                                    bk.status === 'FINALIZADA' ||
                                    bk.payment?.status === 'APPROVED';
                                  const isPendingReview = bk.status === 'PENDIENTE_VALIDACION';

                                  return (
                                    <div
                                      key={bk.id}
                                      className="p-3 rounded-xl bg-sand-50/70 border border-sand-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-[#3a1b38] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                          {bk.user?.name?.charAt(0).toUpperCase() || 'A'}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-charcoal">
                                              {bk.user?.name || 'Alumno'}
                                            </span>
                                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-sand-200 text-charcoal-muted">
                                              {bk.bookingCode}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-charcoal-muted">
                                            {bk.user?.email}{' '}
                                            {bk.user?.phone ? `· ${bk.user.phone}` : ''}
                                          </div>
                                          {bk.attendanceNotes && (
                                            <div className="text-[11px] text-amber-800 mt-0.5 font-medium">
                                              📝 Nota: {bk.attendanceNotes}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        {/* Estado de Pago */}
                                        {isPaid ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Pago Aceptado
                                          </span>
                                        ) : isPendingReview ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                            Pago en Revisión
                                          </span>
                                        ) : bk.status === 'CANCELADA_CLIENTE' ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                            Reserva Cancelada
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                            No Pagado
                                          </span>
                                        )}

                                        {/* Estado de Asistencia */}
                                        {isPresent ? (
                                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Presente
                                          </span>
                                        ) : isAbsent ? (
                                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                            <XCircle className="w-3 h-3" /> Ausente
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                                            Sin asistencia
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ========================================================================= */
              /* VISTA ALUMNO (CLIENT): HISTORIAL DE RESERVAS PERSONALES                   */
              /* ========================================================================= */
              filteredClientBookings.length === 0 ? (
                <div className="text-center py-16 text-charcoal-muted">
                  <History className="w-12 h-12 text-sand-300 mx-auto mb-2.5" />
                  <h4 className="text-sm font-bold text-charcoal">
                    No hay clases en esta categoría histórica
                  </h4>
                  {onOpenMyBookings && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenMyBookings();
                      }}
                      className="mt-4 px-4 py-2 text-xs font-semibold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl shadow-sm transition"
                    >
                      Ver mis reservas activas
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredClientBookings.map((b) => {
                    const statusInfo = getClientStatusDisplay(b);
                    const startTime = b.schedule?.startTime ? new Date(b.schedule.startTime) : null;
                    const endTime = b.schedule?.endTime ? new Date(b.schedule.endTime) : null;

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-2xl border transition shadow-sm space-y-3 ${statusInfo.bgClass}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-charcoal">
                                Clase de Pilates
                              </h3>
                              <span className="font-mono text-[10px] font-semibold text-charcoal-muted bg-white/80 px-2 py-0.5 rounded-md border border-sand-200">
                                Ref: {b.bookingCode}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">{statusInfo.badge}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-charcoal">
                          <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-sand-200/60">
                            <MapPin className="w-4 h-4 text-sage-600 shrink-0" />
                            <div className="min-w-0 truncate">
                              <span className="font-bold block text-charcoal">
                                {b.schedule?.branch?.name || 'Sede Central'}
                              </span>
                              <span className="text-[11px] text-charcoal-muted truncate block">
                                {b.schedule?.branch?.address}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-sand-200/60">
                            <Calendar className="w-4 h-4 text-sage-600 shrink-0" />
                            <div>
                              <span className="font-bold block text-charcoal capitalize">
                                {startTime ? formatDateUTC(startTime.toISOString()) : 'Fecha'}
                              </span>
                              <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                                <Clock className="w-3 h-3 text-sage-600" />
                                {startTime && endTime
                                  ? `${formatTimeUTC(startTime.toISOString())} - ${formatTimeUTC(
                                      endTime.toISOString(),
                                    )} hrs`
                                  : '--:--'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-sand-200/60 text-xs">
                          <div className="flex items-center gap-1.5 text-charcoal-muted">
                            <UserIcon className="w-3.5 h-3.5 text-sage-600" />
                            <span>
                              Instructor:{' '}
                              <strong className="text-charcoal font-semibold">
                                {b.schedule?.instructor?.name || 'Por asignar'}
                              </strong>
                            </span>
                          </div>

                          {b.voucherUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingVoucher({
                                  url: b.voucherUrl!,
                                  bookingCode: b.bookingCode,
                                  classTitle: b.schedule?.classType?.title,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#3a1b38] bg-white hover:bg-sand-100 rounded-lg border border-sand-200 shadow-sm transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#3a1b38]" />
                              <span>Ver Comprobante</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-sand-200 bg-sand-50/50 flex items-center justify-between">
            <span className="text-xs text-charcoal-muted">
              {isAdmin
                ? `Mostrando ${filteredAdminClasses.length} de ${historicalAdminClasses.length} clases en el historial`
                : `Mostrando ${filteredClientBookings.length} de ${historyBookings.length} registros históricos`}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-300 rounded-xl transition shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {viewingVoucher && (
        <VoucherPreviewModal
          isOpen={true}
          onClose={() => setViewingVoucher(null)}
          voucherUrl={viewingVoucher.url}
          bookingCode={viewingVoucher.bookingCode}
          classTitle={viewingVoucher.classTitle}
        />
      )}
    </>
  );
};
