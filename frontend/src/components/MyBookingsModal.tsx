import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  Ban,
  Eye,
  Users,
  Zap,
  CheckCircle2,
  User as UserIcon,
  FileCheck,
  History,
  Search,
  Shield,
} from 'lucide-react';
import type { Booking } from '../types/schedule';
import type { WaitlistEntry } from '../types/waitlist';
import type { StudioBankInfo } from '../types/auth';
import { bookingsApi, waitlistApi, authApi } from '../services/api';
import { VoucherDropzone } from './VoucherDropzone';
import { VoucherPreviewModal } from './VoucherPreviewModal';
import { WaitlistAcceptModal } from './WaitlistAcceptModal';
import { useAuth } from '../context/AuthContext';

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshSchedule: () => void;
  initialTab?: 'bookings' | 'waitlist';
  onOpenClassHistory?: () => void;
}

type ActiveStatusFilter = 'ALL' | 'CONFIRMADA' | 'PENDIENTE_VALIDACION' | 'PENDIENTE_PAGO';

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshSchedule,
  initialTab = 'bookings',
  onOpenClassHistory,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist'>(initialTab);
  const [adminScope, setAdminScope] = useState<'STUDIO' | 'PERSONAL'>('STUDIO');
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVoucherBookingId, setSelectedVoucherBookingId] = useState<string | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrlInput, setVoucherUrlInput] = useState('');
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<{
    url: string;
    bookingCode?: string;
    classTitle?: string;
  } | null>(null);

  const [acceptingWaitlistEntry, setAcceptingWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [bankInfo, setBankInfo] = useState<StudioBankInfo | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        isAdmin && adminScope === 'STUDIO'
          ? await bookingsApi.getAllBookings()
          : await bookingsApi.getMyBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener las reservas');
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitlist = async () => {
    setLoadingWaitlist(true);
    try {
      const data = await waitlistApi.getMyEntries();
      setWaitlistEntries(data);
    } catch {
      // Ignorar
    } finally {
      setLoadingWaitlist(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchBookings();
      fetchWaitlist();
      authApi.getStudioBankInfo().then(setBankInfo).catch(() => {});
    }
  }, [isOpen, initialTab, isAdmin, adminScope]);

  // Separar reservas activas de las históricas (que pertenecen a ClassHistoryModal)
  const { activeBookings, historicalCount } = useMemo(() => {
    const now = new Date();
    const active: Booking[] = [];
    let histCount = 0;

    for (const b of bookings) {
      const scheduleEnd = b.schedule?.endTime ? new Date(b.schedule.endTime) : null;
      const scheduleStart = b.schedule?.startTime ? new Date(b.schedule.startTime) : null;
      const isPast = (scheduleEnd && scheduleEnd < now) || (scheduleStart && !scheduleEnd && scheduleStart < now);
      const isInactiveStatus =
        b.status === 'CANCELADA_CLIENTE' ||
        b.status === 'RECHAZADA_ADMIN' ||
        b.status === 'FINALIZADA' ||
        b.attendanceStatus === 'ATTENDED' ||
        b.attendanceStatus === 'NO_SHOW' ||
        b.attendanceStatus === 'EXCUSED';

      if (isPast || isInactiveStatus) {
        histCount++;
      } else {
        active.push(b);
      }
    }

    // Ordenar las activas por fecha más próxima primero
    active.sort(
      (a, b) =>
        new Date(a.schedule?.startTime || 0).getTime() -
        new Date(b.schedule?.startTime || 0).getTime(),
    );

    return { activeBookings: active, historicalCount: histCount };
  }, [bookings]);

  const statusCounts = useMemo(() => {
    return {
      ALL: activeBookings.length,
      CONFIRMADA: activeBookings.filter((b) => b.status === 'CONFIRMADA').length,
      PENDIENTE_VALIDACION: activeBookings.filter((b) => b.status === 'PENDIENTE_VALIDACION').length,
      PENDIENTE_PAGO: activeBookings.filter((b) => b.status === 'PENDIENTE_PAGO').length,
    };
  }, [activeBookings]);

  const filteredActiveBookings = useMemo(() => {
    return activeBookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = b.schedule?.classType?.title?.toLowerCase() || '';
        const branch = b.schedule?.branch?.name?.toLowerCase() || '';
        const instructor = b.schedule?.instructor?.name?.toLowerCase() || '';
        const code = b.bookingCode?.toLowerCase() || '';
        const studentName = b.user?.name?.toLowerCase() || '';
        const studentEmail = b.user?.email?.toLowerCase() || '';
        return (
          title.includes(q) ||
          branch.includes(q) ||
          instructor.includes(q) ||
          code.includes(q) ||
          studentName.includes(q) ||
          studentEmail.includes(q)
        );
      }
      return true;
    });
  }, [activeBookings, statusFilter, searchTerm]);

  if (!isOpen) return null;

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta reserva? Tu cupo será liberado.')) return;
    try {
      await bookingsApi.cancel(bookingId);
      await fetchBookings();
      await fetchWaitlist();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar reserva');
    }
  };

  const handleQuickApproveVoucher = async (bookingId: string) => {
    setApprovingId(bookingId);
    try {
      await bookingsApi.approveVoucher(bookingId);
      await fetchBookings();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar el comprobante');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeclineWaitlist = async (scheduleId: string) => {
    if (!window.confirm('¿Deseas renunciar a este sobrecupo? Se ofrecerá de inmediato al siguiente alumno en espera.')) return;
    try {
      await waitlistApi.decline(scheduleId);
      await fetchWaitlist();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al declinar sobrecupo');
    }
  };

  const handleUploadVoucher = async (bookingId: string) => {
    if (!voucherFile && !voucherUrlInput.trim()) return;
    setSubmittingVoucher(true);
    try {
      if (voucherFile) {
        await bookingsApi.uploadVoucherFile(bookingId, voucherFile);
      } else {
        await bookingsApi.uploadVoucher(bookingId, voucherUrlInput.trim());
      }
      setSelectedVoucherBookingId(null);
      setVoucherFile(null);
      setVoucherUrlInput('');
      await fetchBookings();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al adjuntar comprobante');
    } finally {
      setSubmittingVoucher(false);
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Confirmada</span>
          </span>
        );
      case 'PENDIENTE_VALIDACION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>En Espera de Confirmación</span>
          </span>
        );
      case 'PENDIENTE_PAGO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Pendiente de Pago</span>
          </span>
        );
      case 'RECHAZADA_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <Ban className="w-3.5 h-3.5 text-red-500" />
            <span>Pago Rechazado</span>
          </span>
        );
      case 'CANCELADA_CLIENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
            <Ban className="w-3.5 h-3.5" />
            <span>Cancelada</span>
          </span>
        );
      case 'FINALIZADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Finalizada</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sand-100 text-charcoal">
            {status}
          </span>
        );
    }
  };

  const offeredCount = waitlistEntries.filter((e) => e.status === 'OFFERED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-[#faf9f6]">
          <div>
            <h2 className="text-lg font-bold text-[#220622]">
              {isAdmin && adminScope === 'STUDIO'
                ? 'Reservas Activas del Estudio'
                : 'Mis Próximas Clases & Reservas'}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {isAdmin && adminScope === 'STUDIO'
                ? 'Monitoreo de reservas próximas confirmadas, en validación y pendientes de comprobante'
                : 'Administra tus reservas activas agendadas, comprobantes de pago y listas de espera'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="hidden sm:flex items-center bg-sand-100 p-1 rounded-xl border border-sand-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAdminScope('STUDIO')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    adminScope === 'STUDIO'
                      ? 'bg-[#3a1b38] text-white shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Estudio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminScope('PERSONAL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    adminScope === 'PERSONAL'
                      ? 'bg-[#3a1b38] text-white shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  Mis Personales
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center justify-between border-b border-sand-200 bg-sand-50/30 px-5 pt-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'bookings'
                  ? 'border-[#3a1b38] text-[#220622]'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Reservas Activas ({activeBookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('waitlist')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'waitlist'
                  ? 'border-[#3a1b38] text-[#220622]'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Lista de Espera ({waitlistEntries.length})</span>
              {offeredCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5 animate-pulse">
                  <Zap className="w-2.5 h-2.5" /> {offeredCount}
                </span>
              )}
            </button>
          </div>

          {onOpenClassHistory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenClassHistory();
              }}
              className="pb-2.5 px-2.5 text-xs font-semibold text-[#3a1b38] hover:text-[#5e2259] flex items-center gap-1.5 transition hover:underline"
            >
              <History className="w-3.5 h-3.5" />
              <span>
                Historial{historicalCount > 0 ? ` (${historicalCount})` : ''}
              </span>
            </button>
          )}
        </div>

        {/* Filtros de búsqueda y estado en pestaña de Reservas Activas */}
        {activeTab === 'bookings' && activeBookings.length > 0 && (
          <div className="px-5 py-3 border-b border-sand-200 bg-sand-50/40 space-y-2.5">
            {isAdmin && adminScope === 'STUDIO' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por alumno, email, código, disciplina o sede..."
                  className="w-full pl-8 pr-4 py-1.5 text-xs rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3a1b38]/20 focus:border-[#3a1b38] transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                  statusFilter === 'ALL'
                    ? 'bg-[#3a1b38] text-white'
                    : 'bg-white text-charcoal border border-sand-200 hover:bg-sand-100'
                }`}
              >
                Todas ({statusCounts.ALL})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CONFIRMADA')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                  statusFilter === 'CONFIRMADA'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Confirmadas ({statusCounts.CONFIRMADA})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDIENTE_VALIDACION')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                  statusFilter === 'PENDIENTE_VALIDACION'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Por Validar ({statusCounts.PENDIENTE_VALIDACION})
              </button>
              {statusCounts.PENDIENTE_PAGO > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDIENTE_PAGO')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                    statusFilter === 'PENDIENTE_PAGO'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  Sin Comprobante ({statusCounts.PENDIENTE_PAGO})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'bookings' ? (
            loading ? (
              <div className="flex items-center justify-center py-12 text-sage-600">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            ) : filteredActiveBookings.length === 0 ? (
              <div className="text-center py-12 text-charcoal-muted">
                <Calendar className="w-12 h-12 text-sand-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-charcoal">
                  {activeBookings.length === 0
                    ? 'No hay reservas próximas activas en este momento'
                    : 'No se encontraron reservas activas con este filtro'}
                </p>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  {historicalCount > 0
                    ? `Las sesiones pasadas, asistidas, canceladas o rechazadas (${historicalCount}) se encuentran organizadas en el Historial de Clases.`
                    : 'Explora la agenda en vivo y reserva tu próxima clase de pilates.'}
                </p>
                {historicalCount > 0 && onOpenClassHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenClassHistory();
                    }}
                    className="mt-4 px-4 py-2 text-xs font-bold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ir al Historial de Clases ({historicalCount})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActiveBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border border-sand-200 bg-white hover:border-[#3a1b38]/30 hover:shadow-md transition space-y-3.5"
                  >
                    {/* Cabecera: Disciplina / Clase + Código secundario + Badge Estado */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-[#220622]">
                            Clase de Pilates
                          </h3>
                          <span className="font-mono text-[10px] font-semibold text-charcoal-muted bg-sand-100 px-2 py-0.5 rounded-md border border-sand-200">
                            Ref: {b.bookingCode}
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-muted mt-0.5">
                          Sesión de Pilates · 60 min
                          {''}
                        </div>
                      </div>

                      <div className="shrink-0">{getStatusBadge(b.status)}</div>
                    </div>

                    {/* Datos del Alumno (En vista Estudio para Administrador) */}
                    {isAdmin && adminScope === 'STUDIO' && b.user && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/70 text-xs text-[#261025]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#3a1b38] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {b.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold block truncate">{b.user.name}</span>
                            <span className="text-[11px] text-[#78716c] truncate block">
                              {b.user.email} {b.user.phone ? `· ${b.user.phone}` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#3a1b38] border border-purple-200 shrink-0">
                          Alumno Inscrito
                        </span>
                      </div>
                    )}

                    {/* Sede, Fecha y Hora */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-charcoal bg-sand-50/70 p-3 rounded-xl border border-sand-200/80">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sage-600 shrink-0" />
                        <div className="min-w-0">
                          <strong className="block text-charcoal">
                            {b.schedule?.branch?.name || 'Sede Central'}
                          </strong>
                          <span className="text-[11px] text-charcoal-muted truncate block">
                            {b.schedule?.branch?.address}
                            {b.schedule?.branch?.commune ? `, ${b.schedule.branch.commune}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-sage-600 shrink-0" />
                        <div>
                          <strong className="block text-charcoal capitalize">
                            {new Date(b.schedule?.startTime).toLocaleDateString('es-CL', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </strong>
                          <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sage-600" />
                            {new Date(b.schedule?.startTime).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(b.schedule?.endTime).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            hrs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Instructor & Check-in en sala */}
                    <div className="flex items-center justify-between text-xs text-charcoal-muted px-1">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-sage-600" />
                        <span>
                          Instructor:{' '}
                          <strong className="text-charcoal font-semibold">
                            {b.schedule?.instructor?.name || 'Por asignar'}
                          </strong>
                        </span>
                      </div>

                      {(b.status === 'CONFIRMADA' || b.status === 'FINALIZADA') &&
                        b.attendanceStatus &&
                        b.attendanceStatus !== 'PENDING' && (
                          <div>
                            {b.attendanceStatus === 'ATTENDED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✅ Presente en Sala
                              </span>
                            )}
                            {b.attendanceStatus === 'NO_SHOW' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                ❌ Ausente
                              </span>
                            )}
                            {b.attendanceStatus === 'EXCUSED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                🟡 Justificada
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Comprobante de transferencia: Visualización y Carga */}
                    {b.voucherUrl ? (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-emerald-900 block">
                              Comprobante de pago adjuntado
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              {b.status === 'CONFIRMADA'
                                ? 'Pago validado exitosamente'
                                : 'Enviado para revisión y validación administrativa'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingVoucher({
                                url: b.voucherUrl!,
                                bookingCode: b.bookingCode,
                                classTitle: b.schedule?.classType?.title,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 rounded-lg border border-emerald-300 shadow-sm transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Ver comprobante</span>
                          </button>

                          {isAdmin && b.status === 'PENDIENTE_VALIDACION' && (
                            <button
                              type="button"
                              disabled={approvingId === b.id}
                              onClick={() => handleQuickApproveVoucher(b.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{approvingId === b.id ? 'Aprobando...' : 'Aprobar Pago'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : b.status === 'PENDIENTE_PAGO' && b.paymentMethod === 'TRANSFER' ? (
                      <div className="pt-2 border-t border-sand-200">
                        {selectedVoucherBookingId === b.id ? (
                          <div className="p-3.5 rounded-xl bg-sand-50 border border-sand-300 space-y-3">
                            {bankInfo && (
                              <div className="p-2.5 rounded-xl bg-white border border-sand-200 text-xs space-y-1">
                                <div className="font-bold text-[#220622]">
                                  Datos Bancarios para Transferencia:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-charcoal-muted">
                                  <div>
                                    Banco: <strong className="text-charcoal">{bankInfo.bankName}</strong>
                                  </div>
                                  <div>
                                    Tipo: <strong className="text-charcoal">{bankInfo.bankAccountType}</strong>
                                  </div>
                                  <div>
                                    N° Cuenta:{' '}
                                    <strong className="font-mono text-charcoal">
                                      {bankInfo.bankAccountNumber}
                                    </strong>
                                  </div>
                                  <div>
                                    RUT:{' '}
                                    <strong className="font-mono text-charcoal">
                                      {bankInfo.bankAccountRut}
                                    </strong>
                                  </div>
                                  <div>
                                    Titular:{' '}
                                    <strong className="text-charcoal">{bankInfo.bankAccountHolder}</strong>
                                  </div>
                                  <div>
                                    Email:{' '}
                                    <strong className="text-charcoal">{bankInfo.bankPaymentEmail}</strong>
                                  </div>
                                </div>
                              </div>
                            )}
                            <VoucherDropzone
                              file={voucherFile}
                              onFileChange={setVoucherFile}
                              urlFallback={voucherUrlInput}
                              onUrlFallbackChange={setVoucherUrlInput}
                              disabled={submittingVoucher}
                            />
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-sand-200">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVoucherBookingId(null);
                                  setVoucherFile(null);
                                  setVoucherUrlInput('');
                                }}
                                className="px-3 py-1.5 text-xs text-charcoal-muted hover:text-charcoal"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUploadVoucher(b.id)}
                                disabled={submittingVoucher || (!voucherFile && !voucherUrlInput.trim())}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-[#3a1b38] hover:bg-[#4f244c] disabled:opacity-50 text-white rounded-xl shadow-sm transition"
                              >
                                {submittingVoucher ? 'Subiendo...' : 'Enviar Comprobante'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                            <span className="text-xs text-amber-900 font-medium">
                              Requiere adjuntar comprobante de transferencia bancaria
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedVoucherBookingId(b.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl transition shadow-sm"
                            >
                              Adjuntar Comprobante
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Posibilidad de Cancelar Reserva (Si es el dueño de la reserva) */}
                    {(!isAdmin || adminScope === 'PERSONAL' || b.userId === user?.id) &&
                      b.status !== 'CANCELADA_CLIENTE' &&
                      b.status !== 'RECHAZADA_ADMIN' &&
                      b.status !== 'FINALIZADA' && (
                        <div className="flex items-center justify-between pt-2 border-t border-sand-200">
                          <span className="text-[11px] text-charcoal-muted">
                            {b.status === 'CONFIRMADA'
                              ? '¿No podrás asistir? Cancela para liberar tu cupo a la lista de espera.'
                              : 'Puedes cancelar tu reserva si ya no deseas tomar la clase.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition shadow-xs"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancelar reserva</span>
                          </button>
                        </div>
                      )}
                  </div>
                ))}

                {/* Banner inferior de enlace al Historial */}
                {historicalCount > 0 && onOpenClassHistory && (
                  <div className="p-3.5 rounded-2xl bg-sand-50 border border-sand-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-charcoal-muted">
                      <History className="w-4 h-4 text-[#3a1b38] shrink-0" />
                      <span>
                        Tienes <strong className="text-charcoal">{historicalCount}</strong>{' '}
                        {historicalCount === 1 ? 'registro pasado o finalizado' : 'registros pasados o finalizados'} en el historial.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenClassHistory();
                      }}
                      className="font-bold text-[#3a1b38] hover:underline whitespace-nowrap"
                    >
                      Ver Historial →
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            /* WAITLIST TAB */
            loadingWaitlist ? (
              <div className="flex items-center justify-center py-12 text-sage-600">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            ) : waitlistEntries.length === 0 ? (
              <div className="text-center py-12 text-charcoal-muted">
                <Users className="w-12 h-12 text-sand-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-charcoal">No estás en ninguna lista de espera</p>
                <p className="text-xs mt-1">
                  Cuando una clase esté agotada, podrás anotarte en el sobrecupo y se te asignará
                  el cupo si alguien cancela.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {waitlistEntries.map((entry) => {
                  const isOffered = entry.status === 'OFFERED';
                  const isWaiting = entry.status === 'WAITING';

                  return (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isOffered
                          ? 'border-amber-400 bg-amber-50/60 shadow-md ring-1 ring-amber-300'
                          : 'border-sand-200 bg-sand-50/40 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOffered ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3" /> ¡Cupo Ofrecido! (1 hora para aceptar)
                            </span>
                          ) : isWaiting ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> En Espera · Posición #{entry.position} de 3
                            </span>
                          ) : entry.status === 'ACCEPTED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aceptado · Convertido en Reserva
                            </span>
                          ) : entry.status === 'EXPIRED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                              Expirado (plazo vencido)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                              Declinado
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-charcoal-muted">
                          Inscrito el {new Date(entry.createdAt).toLocaleDateString('es-CL')}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-sage-900">
                          Clase de Pilates
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-muted mt-1.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-sage-600" />
                            <span>{entry.schedule?.branch?.name || 'Sede Central'}</span>
                          </div>
                          {entry.schedule?.startTime && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-sage-600" />
                              <span>
                                {new Date(entry.schedule.startTime).toLocaleDateString('es-CL', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                              <Clock className="w-3.5 h-3.5 text-sage-600 ml-1" />
                              <span>
                                {new Date(entry.schedule.startTime).toLocaleTimeString('es-CL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action for OFFERED entries */}
                      {isOffered && (
                        <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          <span className="text-xs text-amber-900 font-semibold">
                            Se liberó un cupo. Tienes 1 hora desde la oferta para aceptarlo.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeclineWaitlist(entry.scheduleId)}
                              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition font-medium"
                            >
                              Ceder cupo
                            </button>
                            <button
                              type="button"
                              onClick={() => setAcceptingWaitlistEntry(entry)}
                              className="px-4 py-1.5 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Aceptar Cupo</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Lightbox / Modal de Previsualización */}
      {viewingVoucher && (
        <VoucherPreviewModal
          isOpen={true}
          onClose={() => setViewingVoucher(null)}
          voucherUrl={viewingVoucher.url}
          bookingCode={viewingVoucher.bookingCode}
          classTitle={viewingVoucher.classTitle}
        />
      )}

      {/* Modal para Aceptar Cupo Ofrecido */}
      {acceptingWaitlistEntry && (
        <WaitlistAcceptModal
          entry={acceptingWaitlistEntry}
          isOpen={true}
          onClose={() => setAcceptingWaitlistEntry(null)}
          onSuccess={() => {
            setAcceptingWaitlistEntry(null);
            fetchBookings();
            fetchWaitlist();
      authApi.getStudioBankInfo().then(setBankInfo).catch(() => {});
            onRefreshSchedule();
          }}
        />
      )}
    </div>
  );
};
