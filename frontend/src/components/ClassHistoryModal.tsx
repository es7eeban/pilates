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
} from 'lucide-react';
import type { Booking } from '../types/schedule';
import { bookingsApi } from '../services/api';
import { VoucherPreviewModal } from './VoucherPreviewModal';
import { useAuth } from '../context/AuthContext';

interface ClassHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMyBookings?: () => void;
}

type HistoryFilter = 'ALL' | 'ATTENDED' | 'CANCELLED' | 'REJECTED' | 'NO_SHOW' | 'PAST_UNCONFIRMED';

export const ClassHistoryModal: React.FC<ClassHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenMyBookings,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('ALL');
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
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await bookingsApi.getAllBookings()
        : await bookingsApi.getMyBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial de clases');
    } finally {
      setLoading(false);
    }
  };

  // Identificar clases pasadas o inactivas (históricas)
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

  // Contadores por filtro
  const counts = useMemo(() => {
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

  // Filtrar según pestaña y búsqueda
  const filteredBookings = useMemo(() => {
    return historyBookings.filter((b) => {
      // Filtro de estado
      if (activeFilter === 'ATTENDED') {
        const isAttended = b.attendanceStatus === 'ATTENDED' || b.status === 'FINALIZADA';
        if (!isAttended) return false;
      } else if (activeFilter === 'CANCELLED') {
        if (b.status !== 'CANCELADA_CLIENTE') return false;
      } else if (activeFilter === 'REJECTED') {
        if (b.status !== 'RECHAZADA_ADMIN') return false;
      } else if (activeFilter === 'NO_SHOW') {
        if (b.attendanceStatus !== 'NO_SHOW') return false;
      }

      // Filtro de búsqueda textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const title = b.schedule?.classType?.title?.toLowerCase() || '';
        const branch = b.schedule?.branch?.name?.toLowerCase() || '';
        const instructor = b.schedule?.instructor?.name?.toLowerCase() || '';
        const code = b.bookingCode?.toLowerCase() || '';
        const studentName = b.user?.name?.toLowerCase() || '';
        const studentEmail = b.user?.email?.toLowerCase() || '';

        return (
          title.includes(term) ||
          branch.includes(term) ||
          instructor.includes(term) ||
          code.includes(term) ||
          studentName.includes(term) ||
          studentEmail.includes(term)
        );
      }

      return true;
    });
  }, [historyBookings, activeFilter, searchTerm]);

  if (!isOpen) return null;

  const getStatusDisplay = (b: Booking) => {
    if (b.status === 'CANCELADA_CLIENTE') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <Ban className="w-3.5 h-3.5 text-stone-500" /> Cancelada por ti
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

    if (b.attendanceStatus === 'EXCUSED') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Ausencia Justificada
          </span>
        ),
        bgClass: 'bg-amber-50/40 border-amber-200',
      };
    }

    if (b.status === 'FINALIZADA') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Clase Completada
          </span>
        ),
        bgClass: 'bg-blue-50/30 border-blue-200',
      };
    }

    return {
      badge: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sand-100 text-charcoal border border-sand-200">
          <Clock className="w-3.5 h-3.5" /> Sesión Pasada
        </span>
      ),
      bgClass: 'bg-sand-50/50 border-sand-200',
    };
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-[#faf9f6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center shadow-sm">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#220622]">
                  {isAdmin ? 'Historial de Clases & Alumnos' : 'Historial de Clases'}
                </h2>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  {isAdmin
                    ? 'Auditoría de asistencia, estados de reserva y avance de los alumnos en el estudio'
                    : 'Registro histórico de sesiones realizadas, cancelaciones y comprobantes'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
              title="Cerrar historial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar: Filtros por estado + Búsqueda */}
          <div className="p-4 border-b border-sand-200 bg-sand-50/40 space-y-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isAdmin
                    ? 'Buscar por alumno, clase, sede, instructor o código...'
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

            {/* Píldoras de Filtro */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeFilter === 'ALL'
                    ? 'bg-[#3a1b38] text-white shadow-sm'
                    : 'bg-white text-charcoal border border-sand-300 hover:bg-sand-100'
                }`}
              >
                <span>Todas ({counts.ALL})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('ATTENDED')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeFilter === 'ATTENDED'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Asistidas ({counts.ATTENDED})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('CANCELLED')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeFilter === 'CANCELLED'
                    ? 'bg-stone-700 text-white shadow-sm'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Canceladas ({counts.CANCELLED})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeFilter === 'REJECTED'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rechazadas ({counts.REJECTED})</span>
              </button>

              {counts.NO_SHOW > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('NO_SHOW')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeFilter === 'NO_SHOW'
                      ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>No asistió ({counts.NO_SHOW})</span>
                </button>
              )}
            </div>
          </div>

          {/* Lista de Clases Históricas */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-sage-600 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs text-charcoal-muted">Cargando tu historial...</span>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-charcoal-muted">
                <History className="w-12 h-12 text-sand-300 mx-auto mb-2.5" />
                <h4 className="text-sm font-bold text-charcoal">
                  {searchTerm
                    ? 'No se encontraron resultados para la búsqueda'
                    : 'No hay clases en esta categoría histórica'}
                </h4>
                <p className="text-xs text-charcoal-muted mt-1 max-w-sm mx-auto">
                  {activeFilter === 'ALL'
                    ? 'Tus clases pasadas, completadas o canceladas aparecerán listadas aquí con su detalle completo.'
                    : 'Prueba seleccionando otro filtro para revisar tu historial.'}
                </p>
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
                {filteredBookings.map((b) => {
                  const statusInfo = getStatusDisplay(b);
                  const startTime = b.schedule?.startTime ? new Date(b.schedule.startTime) : null;
                  const endTime = b.schedule?.endTime ? new Date(b.schedule.endTime) : null;

                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border transition shadow-sm space-y-3 ${statusInfo.bgClass}`}
                    >
                      {/* Cabecera de la tarjeta: Título de Clase + Badge de Estado */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-charcoal">
                              {b.schedule?.classType?.title || 'Clase de Pilates'}
                            </h3>
                            <span className="font-mono text-[10px] font-semibold text-charcoal-muted bg-white/80 px-2 py-0.5 rounded-md border border-sand-200">
                              Ref: {b.bookingCode}
                            </span>
                          </div>
                          <div className="text-xs text-charcoal-muted mt-0.5">
                            {b.schedule?.classType?.intensityLevel || 'Sesión grupal'} ·{' '}
                            {b.schedule?.classType?.durationMinutes || 55} min
                          </div>
                        </div>

                        <div className="shrink-0">{statusInfo.badge}</div>
                      </div>

                      {/* Datos del Alumno (Modo Administrador) */}
                      {isAdmin && b.user && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 text-xs text-[#261025]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#3a1b38] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {b.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold block truncate">{b.user.name}</span>
                              <span className="text-[11px] text-[#78716c] truncate block">{b.user.email}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#3a1b38] border border-purple-200 shrink-0">
                            Alumno
                          </span>
                        </div>
                      )}

                      {/* Detalles: Sede, Horario, Instructor */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-charcoal">
                        <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-sand-200/60">
                          <MapPin className="w-4 h-4 text-sage-600 shrink-0" />
                          <div className="min-w-0 truncate">
                            <span className="font-bold block text-charcoal">
                              {b.schedule?.branch?.name || 'Sede Central'}
                            </span>
                            <span className="text-[11px] text-charcoal-muted truncate block">
                              {b.schedule?.branch?.address}
                              {b.schedule?.branch?.commune ? `, ${b.schedule.branch.commune}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/70 p-2 rounded-xl border border-sand-200/60">
                          <Calendar className="w-4 h-4 text-sage-600 shrink-0" />
                          <div>
                            <span className="font-bold block text-charcoal capitalize">
                              {startTime
                                ? startTime.toLocaleDateString('es-CL', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })
                                : 'Fecha no especificada'}
                            </span>
                            <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                              <Clock className="w-3 h-3 text-sage-600" />
                              {startTime
                                ? `${startTime.toLocaleTimeString('es-CL', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })} - ${
                                    endTime
                                      ? endTime.toLocaleTimeString('es-CL', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : ''
                                  } hrs`
                                : '--:--'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Instructor & Comprobante */}
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

                        {b.voucherUrl ? (
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
                        ) : (
                          <span className="text-[11px] text-charcoal-muted">
                            Pago: {b.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Pasarela Online'}
                          </span>
                        )}
                      </div>

                      {/* Motivo de rechazo si aplica */}
                      {b.status === 'RECHAZADA_ADMIN' && b.rejectionReason && (
                        <div className="p-3 rounded-xl bg-red-100/70 border border-red-200 text-xs text-red-800 space-y-1">
                          <span className="font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Motivo indicado por el administrador:
                          </span>
                          <p className="text-[11px] pl-4">{b.rejectionReason}</p>
                        </div>
                      )}

                      {/* Nota de asistencia si la hay */}
                      {b.attendanceNotes && (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800">
                          <span className="font-semibold">Nota de asistencia: </span>
                          <span>{b.attendanceNotes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-sand-200 bg-sand-50/50 flex items-center justify-between">
            <span className="text-xs text-charcoal-muted">
              Mostrando {filteredBookings.length} de {historyBookings.length} registros históricos
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

      {/* Modal visor de comprobante */}
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
