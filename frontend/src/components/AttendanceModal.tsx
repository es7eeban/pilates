import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ClipboardList,
  MapPin,
  Users,
  Search,
  CheckCheck,
  ArrowLeft,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { attendanceApi, branchesApi } from '../services/api';
import type { InstructorClassSchedule, ClassRosterResponse } from '../types/attendance';
import type { Branch, AttendanceStatus, Booking } from '../types/schedule';
import { useAuth } from '../context/AuthContext';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScheduleId?: string | null;
  refreshKey?: number;
  onOpenHistory?: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  initialScheduleId,
  refreshKey,
  onOpenHistory,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [classes, setClasses] = useState<InstructorClassSchedule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filtros
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  // Vista activa: 'CLASSES' | 'ROSTER'
  const [activeView, setActiveView] = useState<'CLASSES' | 'ROSTER'>('CLASSES');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<ClassRosterResponse | null>(null);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);

  // Búsqueda en nómina y notas en edición
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (isOpen) {
      branchesApi.getAll().then(setBranches).catch(console.error);
      setSuccessBanner(null);
      if (!initialScheduleId) {
        setSelectedDate(new Date().toISOString().slice(0, 10));
        setActiveView('CLASSES');
      }
    }
  }, [isOpen, initialScheduleId]);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceApi.getMyClasses({
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        all: isAdmin ? true : false,
      });
      setClasses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las clases del día');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, isAdmin]);

  // Filtrar solo las clases de la fecha seleccionada (por defecto HOY) que aún están activas (no pasadas al historial como COMPLETED/CANCELLED)
  const dayClasses = useMemo(() => {
    return classes.filter((cls) => {
      const clsDate = new Date(cls.startTime).toISOString().slice(0, 10);
      if (clsDate !== selectedDate) return false;
      // Las clases ya finalizadas ("COMPLETED") o canceladas pasan directamente al Historial
      if (cls.status === 'COMPLETED' || cls.status === 'CANCELLED') return false;
      return true;
    });
  }, [classes, selectedDate]);

  const handleOpenRoster = useCallback(async (scheduleId: string) => {
    try {
      setSelectedScheduleId(scheduleId);
      setActiveView('ROSTER');
      setRosterLoading(true);
      setError(null);
      setSuccessBanner(null);
      const data = await attendanceApi.getClassRoster(scheduleId);
      setRosterData(data);
      const notesMap: Record<string, string> = {};
      data.roster.forEach((b) => {
        notesMap[b.id] = b.attendanceNotes || '';
      });
      setEditingNotes(notesMap);
    } catch (err: any) {
      setError(err.message || 'Error al obtener la lista de alumnos de la clase');
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialScheduleId) {
        handleOpenRoster(initialScheduleId);
      } else if (activeView === 'CLASSES') {
        loadClasses();
      } else if (activeView === 'ROSTER' && selectedScheduleId) {
        handleOpenRoster(selectedScheduleId);
      }
    }
  }, [isOpen, initialScheduleId, refreshKey, loadClasses, handleOpenRoster]);

  const handleRefreshCurrentView = async () => {
    if (activeView === 'CLASSES') {
      await loadClasses();
    } else if (activeView === 'ROSTER' && selectedScheduleId) {
      await handleOpenRoster(selectedScheduleId);
    }
  };

  // Actualizar asistencia individual (Presente / Ausente / Justificado)
  const handleUpdateAttendance = async (bookingId: string, status: AttendanceStatus) => {
    try {
      setActionLoading(`status-${bookingId}`);
      const notes = editingNotes[bookingId];
      const updatedBooking = await attendanceApi.updateAttendance(bookingId, {
        attendanceStatus: status,
        notes: notes || undefined,
      });

      if (rosterData) {
        const newRoster = rosterData.roster.map((b) =>
          b.id === bookingId ? { ...b, ...updatedBooking } : b,
        );

        const attendedCount = newRoster.filter((b) => b.attendanceStatus === 'ATTENDED').length;
        const noShowCount = newRoster.filter((b) => b.attendanceStatus === 'NO_SHOW').length;
        const excusedCount = newRoster.filter((b) => b.attendanceStatus === 'EXCUSED').length;
        const pendingCount = newRoster.filter(
          (b) => !b.attendanceStatus || b.attendanceStatus === 'PENDING',
        ).length;

        setRosterData({
          ...rosterData,
          stats: {
            ...rosterData.stats,
            attendedCount,
            noShowCount,
            excusedCount,
            pendingCount,
          },
          roster: newRoster,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar asistencia');
    } finally {
      setActionLoading(null);
    }
  };

  // Guardar observación individual
  const handleSaveNotes = async (bookingId: string, currentStatus?: AttendanceStatus) => {
    try {
      setActionLoading(`notes-${bookingId}`);
      await attendanceApi.updateAttendance(bookingId, {
        attendanceStatus: currentStatus || 'PENDING',
        notes: editingNotes[bookingId] || '',
      });
      setSuccessBanner('Observación guardada para el alumno.');
    } catch (err: any) {
      setError(err.message || 'Error al guardar nota');
    } finally {
      setActionLoading(null);
    }
  };

  // Marcar todos los inscritos como Presentes
  const handleMarkAllPresent = async () => {
    if (!selectedScheduleId || !rosterData || rosterData.roster.length === 0) return;

    try {
      setActionLoading('bulk-all');
      const attendees = rosterData.roster.map((b) => ({
        bookingId: b.id,
        attendanceStatus: 'ATTENDED' as AttendanceStatus,
        notes: editingNotes[b.id] || b.attendanceNotes || undefined,
      }));

      const refreshed = await attendanceApi.bulkAttendance(selectedScheduleId, attendees);
      setRosterData(refreshed);
      setSuccessBanner('Todos los alumnos de la clase fueron marcados como Presentes.');
    } catch (err: any) {
      setError(err.message || 'Error al marcar asistencia masiva');
    } finally {
      setActionLoading(null);
    }
  };

  // Marcar la clase como "Clase Realizada" -> Guarda asistencia y pasa al Historial
  const handleCompleteClass = async (scheduleId: string) => {
    try {
      setActionLoading(`complete-${scheduleId}`);
      setError(null);

      // Si estamos dentro de la nómina y hay notas editadas, persistir el estado actual de los alumnos
      if (rosterData && rosterData.schedule.id === scheduleId && rosterData.roster.length > 0) {
        const attendeesPayload = rosterData.roster.map((b) => ({
          bookingId: b.id,
          attendanceStatus: (b.attendanceStatus || 'PENDING') as AttendanceStatus,
          notes: editingNotes[b.id] ?? b.attendanceNotes ?? undefined,
        }));
        await attendanceApi.bulkAttendance(scheduleId, attendeesPayload);
      }

      await attendanceApi.updateScheduleStatus(scheduleId, 'COMPLETED');

      setSuccessBanner(
        '✅ Clase marcada como Realizada. Se ha guardado la asistencia y se envió al Historial de Clases.',
      );
      setActiveView('CLASSES');
      setSelectedScheduleId(null);
      setRosterData(null);
      await loadClasses();
    } catch (err: any) {
      setError(err.message || 'Error al finalizar y guardar la clase');
    } finally {
      setActionLoading(null);
    }
  };

  // Renderizador del Badge de Estado de Pago de cada alumno
  const getPaymentStatusBadge = (booking: Booking) => {
    if (
      booking.status === 'CONFIRMADA' ||
      booking.status === 'FINALIZADA' ||
      booking.payment?.status === 'APPROVED'
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Pago Aceptado
        </span>
      );
    }

    if (booking.status === 'PENDIENTE_VALIDACION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          Pago en Revisión
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
        <XCircle className="w-3 h-3 text-red-600" />
        No Pagado
      </span>
    );
  };

  if (!isOpen) return null;

  const filteredRoster = rosterData?.roster.filter((b) => {
    const q = searchTerm.toLowerCase();
    const name = b.user?.name.toLowerCase() || '';
    const email = b.user?.email.toLowerCase() || '';
    const code = b.bookingCode.toLowerCase();
    return name.includes(q) || email.includes(q) || code.includes(q);
  });

  const formatTimeUTC = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });

  const formatDateUTC = (isoString: string) =>
    new Date(isoString).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="px-6 py-5 bg-[#220622] text-white flex items-center justify-between border-b border-[#3a1b38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {activeView === 'CLASSES'
                  ? 'Asistencia & Check-in · Clases del Día'
                  : 'Control de Asistencia y Estado de Pago en Sala'}
              </h2>
              <p className="text-xs text-rose-100/80">
                {activeView === 'CLASSES'
                  ? 'Abre una clase del día para pasar lista, verificar estado de pago y marcarla como Clase Realizada'
                  : 'Marca a cada alumno como Presente o Ausente, verifica su pago y finaliza la sesión para enviarla al Historial'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshCurrentView}
              disabled={loading || rosterLoading}
              className="text-rose-100 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition flex items-center gap-1.5 text-xs font-semibold bg-white/10 border border-white/15"
              title="Actualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || rosterLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={onClose}
              className="text-rose-200 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 font-bold ml-3">
                ✕
              </button>
            </div>
          )}

          {successBanner && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenHistory();
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition"
                  >
                    Ver en Historial →
                  </button>
                )}
                <button
                  onClick={() => setSuccessBanner(null)}
                  className="text-emerald-700 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* VISTA 1: CLASES DEL DÍA */}
          {activeView === 'CLASSES' && (
            <div className="space-y-5">
              {/* Barra de Filtros del Día */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Selector de Fecha (Por defecto Hoy) */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#3a1b38]" />
                    <span className="text-xs font-bold text-stone-700">Fecha de Asistencia:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value || todayIso)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#3a1b38]"
                    />
                    {selectedDate !== todayIso && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(todayIso)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-[#3a1b38] border border-purple-200 hover:bg-purple-100 transition"
                      >
                        Volver a Hoy
                      </button>
                    )}
                  </div>

                  {/* Filtro Sede */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sage-600" />
                    <span className="text-xs font-semibold text-stone-600">Sede:</span>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#3a1b38]"
                    >
                      <option value="ALL">Todas las sedes</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <span className="text-xs font-bold text-[#3a1b38] bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                  {selectedDate === todayIso ? '📅 Mostrando Clases de Hoy' : `📅 Fecha: ${selectedDate}`}
                </span>
              </div>

              {/* Lista de Clases del Día */}
              {loading ? (
                <div className="py-16 text-center text-stone-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3a1b38] mx-auto mb-3" />
                  <p className="text-sm">Cargando clases del día...</p>
                </div>
              ) : dayClasses.length === 0 ? (
                <div className="py-14 text-center bg-white rounded-2xl border border-stone-200 p-6">
                  <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-stone-800">
                    No hay clases pendientes de realizar en esta fecha ({selectedDate})
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Las clases que ya fueron marcadas como "Clase Realizada" se encuentran archivadas en el módulo de Historial de Clases.
                  </p>
                  {onOpenHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenHistory();
                      }}
                      className="mt-4 px-4 py-2 text-xs font-bold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl transition"
                    >
                      Ir al Historial de Clases
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dayClasses.map((cls) => {
                    const enrolled = cls.stats?.enrolled || 0;
                    const attended = cls.stats?.attended || 0;
                    const noShow = cls.stats?.noShow || 0;
                    const pendingValidation = cls.stats?.pendingValidation || 0;
                    const unpaid = cls.stats?.unpaid || 0;
                    const capacity = cls.capacity;
                    const hour = new Date(cls.startTime).getUTCHours();

                    return (
                      <div
                        key={cls.id}
                        className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Cabecera de la tarjeta */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#3a1b38] border border-purple-200">
                                  📍 {cls.branch?.name || 'Sede Principal'}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sand-100 text-charcoal">
                                  {hour < 12 ? 'Jornada AM' : 'Jornada PM'}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-stone-900 mt-2">
                                Clase de Pilates
                              </h3>
                              <p className="text-xs text-stone-500 capitalize mt-0.5">
                                {formatDateUTC(cls.startTime)}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-base font-bold font-mono text-[#3a1b38] bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 block">
                                {formatTimeUTC(cls.startTime)} - {formatTimeUTC(cls.endTime)}
                              </span>
                            </div>
                          </div>

                          {/* Resumen de Alumnos y Estado de Pagos */}
                          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 mb-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-stone-600 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-[#3a1b38]" /> Alumnos agendados:
                              </span>
                              <span className="font-bold text-stone-900">
                                {enrolled} / {capacity} cupos
                              </span>
                            </div>
                            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#3a1b38] h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (enrolled / capacity) * 100)}%` }}
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 pt-1">
                              <span>
                                ✅ Presentes: <strong className="text-emerald-700">{attended}</strong>
                              </span>
                              <span>
                                ❌ Ausentes: <strong className="text-rose-700">{noShow}</strong>
                              </span>
                              <span>
                                ⏳ Sin marcar:{' '}
                                <strong className="text-stone-800">
                                  {Math.max(0, enrolled - attended - noShow)}
                                </strong>
                              </span>
                            </div>

                            {(pendingValidation > 0 || unpaid > 0) && (
                              <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center gap-2 text-[11px]">
                                {pendingValidation > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                                    🟡 {pendingValidation} pago(s) en revisión
                                  </span>
                                )}
                                {unpaid > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-semibold">
                                    🔴 {unpaid} no pagado(s)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botones de Acción (Sin botón "Iniciar Clase") */}
                        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => handleOpenRoster(cls.id)}
                            className="flex-1 py-2.5 px-3 text-xs rounded-xl bg-[#3a1b38] hover:bg-[#4f244c] text-white font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <ClipboardList className="w-4 h-4" />
                            <span>Abrir Clase & Pasar Lista ({enrolled})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCompleteClass(cls.id)}
                            disabled={actionLoading === `complete-${cls.id}`}
                            className="py-2.5 px-3.5 text-xs rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                            title="Marcar clase como realizada y enviarla al historial"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Clase Realizada</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: NÓMINA DE ALUMNOS Y PAGOS DE LA CLASE */}
          {activeView === 'ROSTER' && (
            <div className="space-y-5">
              {/* Barra Superior de Navegación y Finalización */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('CLASSES');
                      loadClasses();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a Clases del Día</span>
                  </button>
                </div>

                {rosterData && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      disabled={actionLoading === 'bulk-all' || rosterData.roster.length === 0}
                      className="px-3.5 py-2 text-xs rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span>Marcar Todos Presentes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompleteClass(rosterData.schedule.id)}
                      disabled={actionLoading === `complete-${rosterData.schedule.id}`}
                      className="px-4 py-2 text-xs rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✅ Clase Realizada (Guardar y Enviar a Historial)</span>
                    </button>
                  </div>
                )}
              </div>

              {rosterLoading ? (
                <div className="py-20 text-center text-stone-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3a1b38] mx-auto mb-3" />
                  <p className="text-sm">Cargando alumnos de la clase...</p>
                </div>
              ) : !rosterData ? (
                <div className="py-12 text-center text-stone-500">
                  No se encontró información de la clase seleccionada.
                </div>
              ) : (
                <>
                  {/* Resumen de la Clase */}
                  <div className="bg-gradient-to-r from-[#261025] to-[#3a1b38] text-white p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-rose-200 text-xs mb-1 capitalize">
                        <span>📍 {rosterData.schedule.branch?.name || 'Sede Central'}</span>
                        <span>•</span>
                        <span>{formatDateUTC(rosterData.schedule.startTime)}</span>
                      </div>
                      <h3 className="text-lg font-bold">Clase de Pilates</h3>
                      <p className="text-xs text-rose-100/90 mt-1">
                        ⏰ Horario: {formatTimeUTC(rosterData.schedule.startTime)} -{' '}
                        {formatTimeUTC(rosterData.schedule.endTime)} hrs · Instructor:{' '}
                        {rosterData.schedule.instructor?.name || user?.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-white/10 px-3 py-2 rounded-xl text-center min-w-[72px] border border-white/15">
                        <span className="block text-lg font-bold">
                          {rosterData.stats.totalEnrolled}
                        </span>
                        <span className="text-[10px] text-rose-100 uppercase font-semibold">
                          Alumnos
                        </span>
                      </div>
                      <div className="bg-emerald-600/40 px-3 py-2 rounded-xl text-center min-w-[72px] border border-emerald-400/50">
                        <span className="block text-lg font-bold text-white">
                          {rosterData.stats.attendedCount}
                        </span>
                        <span className="text-[10px] text-emerald-100 uppercase font-semibold">
                          Presentes
                        </span>
                      </div>
                      <div className="bg-rose-600/40 px-3 py-2 rounded-xl text-center min-w-[72px] border border-rose-400/50">
                        <span className="block text-lg font-bold text-white">
                          {rosterData.stats.noShowCount}
                        </span>
                        <span className="text-[10px] text-rose-100 uppercase font-semibold">
                          Ausentes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buscador de alumnos */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative w-full max-w-xs">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar alumno por nombre, correo o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3a1b38]"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pago Aceptado
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> En Revisión
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> No Pagado
                      </span>
                    </div>
                  </div>

                  {/* Listado de Alumnos con Presente/Ausente + Estado de Pago */}
                  {filteredRoster && filteredRoster.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border border-stone-200">
                      <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-stone-700">
                        No hay alumnos inscritos en esta clase
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Aún puedes marcar la clase como realizada o suspenderla si no hubo inscritos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRoster?.map((booking) => {
                        const isAttended = booking.attendanceStatus === 'ATTENDED';
                        const isNoShow = booking.attendanceStatus === 'NO_SHOW';
                        const isExcused = booking.attendanceStatus === 'EXCUSED';

                        return (
                          <div
                            key={booking.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isAttended
                                ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                                : isNoShow
                                ? 'bg-rose-50/60 border-rose-200'
                                : isExcused
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-white border-stone-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              {/* Datos del Alumno + Estado de Pago */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#3a1b38] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                  {booking.user?.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-stone-900">
                                      {booking.user?.name}
                                    </h4>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold border border-stone-200">
                                      {booking.bookingCode}
                                    </span>
                                    {/* Estado de Pago requerido: Aceptado, En Revisión o No Pagado */}
                                    {getPaymentStatusBadge(booking)}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                                    <span>✉️ {booking.user?.email}</span>
                                    {booking.user?.phone && <span>📞 {booking.user.phone}</span>}
                                    <span className="text-[11px] font-medium text-stone-600">
                                      Método:{' '}
                                      {booking.paymentMethod === 'TRANSFER'
                                        ? 'Transferencia'
                                        : 'Pago Online'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Botones de Asistencia: Presente / No Presente (Ausente) / Justificado */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttendance(booking.id, 'ATTENDED')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-3.5 py-2 text-xs rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    isAttended
                                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500 ring-offset-1'
                                      : 'bg-stone-100 text-stone-700 hover:bg-emerald-100 hover:text-emerald-800'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Presente</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttendance(booking.id, 'NO_SHOW')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-3.5 py-2 text-xs rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    isNoShow
                                      ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-500 ring-offset-1'
                                      : 'bg-stone-100 text-stone-700 hover:bg-rose-100 hover:text-rose-800'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>No Presente</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUpdateAttendance(booking.id, 'EXCUSED')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-3 py-2 text-xs rounded-xl font-semibold transition flex items-center gap-1 ${
                                    isExcused
                                      ? 'bg-amber-600 text-white shadow-sm'
                                      : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-800'
                                  }`}
                                >
                                  <span>Justificado</span>
                                </button>
                              </div>
                            </div>

                            {/* Notas u observaciones de la clase */}
                            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="text-stone-500">
                                {booking.checkInAt ? (
                                  <span className="text-emerald-800 font-semibold">
                                    ✓ Asistencia registrada (
                                    {new Date(booking.checkInAt).toLocaleTimeString('es-CL', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    )
                                  </span>
                                ) : isNoShow ? (
                                  <span className="text-rose-700 font-semibold">
                                    ✕ Marcado como ausente
                                  </span>
                                ) : (
                                  <span>Pendiente de marcar asistencia</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-1 max-w-md">
                                <input
                                  type="text"
                                  placeholder="Observación de clase (opcional)..."
                                  value={editingNotes[booking.id] || ''}
                                  onChange={(e) =>
                                    setEditingNotes({
                                      ...editingNotes,
                                      [booking.id]: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#3a1b38]"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveNotes(booking.id, booking.attendanceStatus)
                                  }
                                  disabled={actionLoading === `notes-${booking.id}`}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold transition"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
