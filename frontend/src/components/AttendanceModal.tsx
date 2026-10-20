import React, { useState, useEffect, useCallback } from 'react';
import { attendanceApi, branchesApi } from '../services/api';
import type { InstructorClassSchedule, ClassRosterResponse } from '../types/attendance';
import type { Branch, AttendanceStatus } from '../types/schedule';
import { useAuth } from '../context/AuthContext';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScheduleId?: string | null;
  refreshKey?: number;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  initialScheduleId,
  refreshKey,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Estados generales
  const [classes, setClasses] = useState<InstructorClassSchedule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  // Por defecto, los administradores ven todas las clases del estudio
  const [viewAllInstructors, setViewAllInstructors] = useState<boolean>(true);

  // Vista activa: 'CLASSES' | 'ROSTER'
  const [activeView, setActiveView] = useState<'CLASSES' | 'ROSTER'>('CLASSES');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<ClassRosterResponse | null>(null);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);

  // Búsqueda en nómina y notas en edición
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cargar sedes
  useEffect(() => {
    if (isOpen) {
      branchesApi.getAll().then(setBranches).catch(console.error);
    }
  }, [isOpen]);

  // Si el rol es admin, asegurar vista global por defecto
  useEffect(() => {
    if (isAdmin) {
      setViewAllInstructors(true);
    }
  }, [isAdmin]);

  // Cargar lista de clases
  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceApi.getMyClasses({
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        all: isAdmin ? viewAllInstructors : false,
      });
      setClasses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las clases asignadas');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, statusFilter, viewAllInstructors, isAdmin]);

  // Cargar nómina de una clase
  const handleOpenRoster = useCallback(async (scheduleId: string) => {
    try {
      setSelectedScheduleId(scheduleId);
      setActiveView('ROSTER');
      setRosterLoading(true);
      setError(null);
      const data = await attendanceApi.getClassRoster(scheduleId);
      setRosterData(data);
      // Inicializar notas
      const notesMap: Record<string, string> = {};
      data.roster.forEach((b) => {
        notesMap[b.id] = b.attendanceNotes || '';
      });
      setEditingNotes(notesMap);
    } catch (err: any) {
      setError(err.message || 'Error al obtener nómina de la clase');
    } finally {
      setRosterLoading(false);
    }
  }, []);

  // Manejar apertura inicial o cambios de refreshKey / initialScheduleId
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

  // Refrescar manualmente la vista activa
  const handleRefreshCurrentView = async () => {
    if (activeView === 'CLASSES') {
      await loadClasses();
    } else if (activeView === 'ROSTER' && selectedScheduleId) {
      await handleOpenRoster(selectedScheduleId);
    }
  };

  // Actualizar asistencia individual
  const handleUpdateAttendance = async (bookingId: string, status: AttendanceStatus) => {
    try {
      setActionLoading(`status-${bookingId}`);
      const notes = editingNotes[bookingId];
      const updatedBooking = await attendanceApi.updateAttendance(bookingId, {
        attendanceStatus: status,
        notes: notes || undefined,
      });

      // Actualizar localmente la nómina
      if (rosterData) {
        const newRoster = rosterData.roster.map((b) =>
          b.id === bookingId ? { ...b, ...updatedBooking } : b,
        );

        // Recalcular métricas
        const attendedCount = newRoster.filter((b) => b.attendanceStatus === 'ATTENDED').length;
        const noShowCount = newRoster.filter((b) => b.attendanceStatus === 'NO_SHOW').length;
        const excusedCount = newRoster.filter((b) => b.attendanceStatus === 'EXCUSED').length;
        const pendingCount = newRoster.filter((b) => b.attendanceStatus === 'PENDING').length;

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
      alert(`Error al actualizar asistencia: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Guardar notas individuales
  const handleSaveNotes = async (bookingId: string, currentStatus?: AttendanceStatus) => {
    try {
      setActionLoading(`notes-${bookingId}`);
      await attendanceApi.updateAttendance(bookingId, {
        attendanceStatus: currentStatus || 'PENDING',
        notes: editingNotes[bookingId] || '',
      });
      alert('Nota guardada correctamente');
    } catch (err: any) {
      alert(`Error al guardar notas: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Marcar todos presentes (Bulk check-in)
  const handleMarkAllPresent = async () => {
    if (!selectedScheduleId || !rosterData) return;
    if (!confirm('¿Deseas marcar a todos los alumnos confirmados como Presentes (ATTENDED)?')) return;

    try {
      setActionLoading('bulk-all');
      const attendees = rosterData.roster
        .filter((b) => b.status === 'CONFIRMADA' || b.status === 'FINALIZADA')
        .map((b) => ({
          bookingId: b.id,
          attendanceStatus: 'ATTENDED' as AttendanceStatus,
          notes: editingNotes[b.id] || b.attendanceNotes || undefined,
        }));

      const refreshed = await attendanceApi.bulkAttendance(selectedScheduleId, attendees);
      setRosterData(refreshed);
    } catch (err: any) {
      alert(`Error en check-in masivo: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Actualizar estado de la clase (Iniciar o Finalizar)
  const handleUpdateScheduleStatus = async (
    scheduleId: string,
    newStatus: 'IN_PROGRESS' | 'COMPLETED',
  ) => {
    const actionText = newStatus === 'IN_PROGRESS' ? 'iniciar la clase' : 'finalizar la clase';
    if (!confirm(`¿Confirmas que deseas ${actionText}?`)) return;

    try {
      setActionLoading(`class-status-${scheduleId}`);
      const updated = await attendanceApi.updateScheduleStatus(scheduleId, newStatus);

      // Si estamos en la vista de nómina, refrescar schedule
      if (rosterData && rosterData.schedule.id === scheduleId) {
        setRosterData({
          ...rosterData,
          schedule: {
            ...rosterData.schedule,
            status: updated.status,
          },
        });
      }

      // Si estamos en la vista de clases, refrescar lista
      setClasses((prev) =>
        prev.map((c) => (c.id === scheduleId ? { ...c, status: updated.status } : c)),
      );
    } catch (err: any) {
      alert(`Error al cambiar estado de la clase: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const filteredRoster = rosterData?.roster.filter((b) => {
    const q = searchTerm.toLowerCase();
    const name = b.user?.name.toLowerCase() || '';
    const email = b.user?.email.toLowerCase() || '';
    const code = b.bookingCode.toLowerCase();
    return name.includes(q) || email.includes(q) || code.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="px-6 py-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-700/60 rounded-xl text-xl">📋</span>
            <div>
              <h2 className="text-xl font-serif font-medium tracking-tight">
                {activeView === 'CLASSES'
                  ? 'Panel de Clases & Control de Asistencia'
                  : 'Nómina de Asistencia en Sala'}
              </h2>
              <p className="text-xs text-stone-300">
                {activeView === 'CLASSES'
                  ? 'Gestiona tus sesiones asignadas, aforo e inicia la toma de asistencia'
                  : 'Check-in en tiempo real, registro de novedades y contacto con alumnos'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshCurrentView}
              disabled={loading || rosterLoading}
              className="text-stone-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-stone-800 transition flex items-center gap-1.5 text-xs font-semibold bg-stone-800/80 border border-stone-700 shadow-sm"
              title="Actualizar listado de clases y nómina"
            >
              <span className={`text-xs ${loading || rosterLoading ? 'animate-spin' : ''}`}>🔄</span>
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-2 rounded-lg hover:bg-stone-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 font-bold ml-3"
              >
                ✕
              </button>
            </div>
          )}

          {/* VISTA 1: LISTADO DE CLASES */}
          {activeView === 'CLASSES' && (
            <div className="space-y-6">
              {/* Barra de Filtros */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Filtro Sede */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-stone-600">Sede:</span>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="ALL">Todas las sedes</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Estado */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-stone-600">Estado:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="ALL">Todos los estados</option>
                      <option value="SCHEDULED">Programadas</option>
                      <option value="IN_PROGRESS">En Curso</option>
                      <option value="COMPLETED">Finalizadas</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filtro Admin: Ver todas las clases */}
                  {isAdmin && (
                    <div className="flex items-center space-x-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                      <input
                        type="checkbox"
                        id="viewAllToggle"
                        checked={viewAllInstructors}
                        onChange={(e) => setViewAllInstructors(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <label
                        htmlFor="viewAllToggle"
                        className="text-xs font-medium text-stone-700 cursor-pointer select-none"
                      >
                        👑 Modo Admin (Ver todas las clases)
                      </label>
                    </div>
                  )}

                  <button
                    onClick={loadClasses}
                    disabled={loading}
                    className="p-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition text-xs flex items-center gap-1 font-semibold"
                    title="Recargar clases"
                  >
                    <span className={loading ? 'animate-spin' : ''}>🔄</span>
                    <span className="hidden sm:inline">Refrescar</span>
                  </button>
                </div>
              </div>

              {/* Lista de Tarjetas de Clases */}
              {loading ? (
                <div className="py-16 text-center text-stone-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                  <p className="text-sm">Cargando sesiones asignadas...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-stone-200">
                  <span className="text-4xl block mb-2">🧘‍♀️</span>
                  <h3 className="text-base font-serif font-medium text-stone-800">
                    No se encontraron clases para los filtros seleccionados
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Prueba cambiando la sede seleccionada o limpiando los filtros.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map((cls) => {
                    const startDate = new Date(cls.startTime);
                    const endDate = new Date(cls.endTime);
                    const enrolled = cls.stats?.enrolled || 0;
                    const attended = cls.stats?.attended || 0;
                    const capacity = cls.capacity;

                    return (
                      <div
                        key={cls.id}
                        className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Encabezado de la tarjeta */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                                  📍 {cls.branch?.name || 'Sede Principal'}
                                </span>
                                {cls.status === 'SCHEDULED' && (
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                    Programada
                                  </span>
                                )}
                                {cls.status === 'IN_PROGRESS' && (
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    En Curso
                                  </span>
                                )}
                                {cls.status === 'COMPLETED' && (
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                                    Finalizada
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-serif font-medium text-stone-900 mt-1.5">
                                {cls.classType.title}
                              </h3>
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-serif font-bold text-stone-800">
                                {startDate.toLocaleTimeString('es-CL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="block text-[11px] text-stone-400">
                                Hasta {endDate.toLocaleTimeString('es-CL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Fecha e Instructor */}
                          <div className="text-xs text-stone-500 mb-3 space-y-1">
                            <p>
                              🗓️{' '}
                              {startDate.toLocaleDateString('es-CL', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                            {isAdmin && (
                              <p>
                                👤 Instructor:{' '}
                                <span className="font-medium text-stone-700">
                                  {cls.instructor?.name || 'Sin asignar'}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Barra de Aforo e Inscriptos */}
                          <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 mb-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-stone-600">Alumnos inscritos:</span>
                              <span className="font-bold text-stone-900">
                                {enrolled} / {capacity} cupos
                              </span>
                            </div>
                            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, (enrolled / capacity) * 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                              <span>✅ Asistieron: <strong className="text-emerald-700">{attended}</strong></span>
                              <span>⏳ Pendientes: <strong className="text-amber-600">{enrolled - attended}</strong></span>
                            </div>
                            {cls.stats?.pendingValidation && cls.stats.pendingValidation > 0 ? (
                              <div className="mt-2 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                                <span>⚠️ Comprobantes por validar:</span>
                                <strong>{cls.stats.pendingValidation} alumno(s)</strong>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Botones de Acción de la Clase */}
                        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                          {cls.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleUpdateScheduleStatus(cls.id, 'IN_PROGRESS')}
                              disabled={actionLoading === `class-status-${cls.id}`}
                              className="px-3 py-2 text-xs rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium border border-emerald-200 transition"
                            >
                              ▶️ Iniciar
                            </button>
                          )}
                          {cls.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleUpdateScheduleStatus(cls.id, 'COMPLETED')}
                              disabled={actionLoading === `class-status-${cls.id}`}
                              className="px-3 py-2 text-xs rounded-xl bg-stone-800 text-white hover:bg-stone-900 font-medium transition"
                            >
                              🏁 Finalizar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenRoster(cls.id)}
                            className="flex-1 py-2 px-3 text-xs rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <span>📋</span>
                            <span>Ver Nómina & Asistencia</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: NÓMINA DE ALUMNOS (ROSTER) */}
          {activeView === 'ROSTER' && (
            <div className="space-y-6">
              {/* Encabezado Superior de Navegación de Nómina */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveView('CLASSES');
                      loadClasses();
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl transition"
                  >
                    <span>←</span>
                    <span>Volver a mis clases</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedScheduleId) handleOpenRoster(selectedScheduleId);
                    }}
                    disabled={rosterLoading}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl transition"
                    title="Recargar nómina de alumnos"
                  >
                    <span className={rosterLoading ? 'animate-spin' : ''}>🔄</span>
                    <span className="hidden sm:inline">Refrescar</span>
                  </button>
                </div>

                {rosterData && (
                  <div className="flex items-center gap-2">
                    {rosterData.schedule.status === 'SCHEDULED' && (
                      <button
                        onClick={() =>
                          handleUpdateScheduleStatus(rosterData.schedule.id, 'IN_PROGRESS')
                        }
                        disabled={actionLoading === `class-status-${rosterData.schedule.id}`}
                        className="px-3 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition"
                      >
                        ▶️ Iniciar Clase
                      </button>
                    )}
                    {rosterData.schedule.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() =>
                          handleUpdateScheduleStatus(rosterData.schedule.id, 'COMPLETED')
                        }
                        disabled={actionLoading === `class-status-${rosterData.schedule.id}`}
                        className="px-3 py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-medium transition"
                      >
                        🏁 Finalizar Clase
                      </button>
                    )}
                    <button
                      onClick={handleMarkAllPresent}
                      disabled={actionLoading === 'bulk-all' || rosterData.roster.length === 0}
                      className="px-3.5 py-2 text-xs rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold border border-emerald-300 transition flex items-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Marcar Todos Presentes</span>
                    </button>
                  </div>
                )}
              </div>

              {rosterLoading ? (
                <div className="py-20 text-center text-stone-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                  <p className="text-sm">Cargando nómina de alumnos...</p>
                </div>
              ) : !rosterData ? (
                <div className="py-12 text-center text-stone-500">
                  No se encontró información de la nómina.
                </div>
              ) : (
                <>
                  {/* Banner con Detalles de la Clase */}
                  <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2 text-emerald-200 text-xs mb-1">
                        <span>📍 {rosterData.schedule.branch?.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(rosterData.schedule.startTime).toLocaleDateString('es-CL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </span>
                      </div>
                      <h3 className="text-xl font-serif font-medium">
                        {rosterData.schedule.classType.title}
                      </h3>
                      <p className="text-xs text-emerald-200 mt-1">
                        ⏰ Horario:{' '}
                        {new Date(rosterData.schedule.startTime).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(rosterData.schedule.endTime).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        | Instructor: {rosterData.schedule.instructor?.name}
                      </p>
                    </div>

                    {/* Tarjetas de Métricas Rápidas */}
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-800/80 px-3 py-2 rounded-xl text-center min-w-[70px]">
                        <span className="block text-xl font-bold font-serif">
                          {rosterData.stats.totalEnrolled}
                        </span>
                        <span className="text-[10px] text-emerald-200 uppercase font-medium">
                          Inscritos
                        </span>
                      </div>
                      <div className="bg-emerald-700 px-3 py-2 rounded-xl text-center min-w-[70px] border border-emerald-500">
                        <span className="block text-xl font-bold font-serif text-white">
                          {rosterData.stats.attendedCount}
                        </span>
                        <span className="text-[10px] text-emerald-100 uppercase font-medium">
                          Presentes
                        </span>
                      </div>
                      <div className="bg-rose-900/80 px-3 py-2 rounded-xl text-center min-w-[70px]">
                        <span className="block text-xl font-bold font-serif text-rose-200">
                          {rosterData.stats.noShowCount}
                        </span>
                        <span className="text-[10px] text-rose-200 uppercase font-medium">
                          Ausentes
                        </span>
                      </div>
                      <div className="bg-stone-800/80 px-3 py-2 rounded-xl text-center min-w-[70px]">
                        <span className="block text-xl font-bold font-serif text-stone-200">
                          {rosterData.stats.pendingCount}
                        </span>
                        <span className="text-[10px] text-stone-300 uppercase font-medium">
                          Pendientes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buscador de alumnos */}
                  <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-xs">
                      <input
                        type="text"
                        placeholder="Buscar alumno o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <span className="absolute left-3 top-2.5 text-stone-400 text-xs">🔍</span>
                    </div>
                    <span className="text-xs text-stone-500">
                      Mostrando {filteredRoster?.length || 0} de {rosterData.roster.length} alumnos
                    </span>
                  </div>

                  {/* Listado de Alumnos */}
                  {filteredRoster && filteredRoster.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border border-stone-200">
                      <span className="text-3xl block mb-2">👤</span>
                      <p className="text-sm font-medium text-stone-700">
                        No hay alumnos registrados en esta clase
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Los alumnos aparecerán aquí cuando confirmen su reserva.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRoster?.map((booking) => {
                        const isAttended = booking.attendanceStatus === 'ATTENDED';
                        const isNoShow = booking.attendanceStatus === 'NO_SHOW';
                        const isExcused = booking.attendanceStatus === 'EXCUSED';
                        const isPending = !booking.attendanceStatus || booking.attendanceStatus === 'PENDING';

                        const phoneClean = booking.user?.phone?.replace(/\D/g, '') || '';

                        return (
                          <div
                            key={booking.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isAttended
                                ? 'bg-emerald-50/70 border-emerald-200 shadow-sm'
                                : isNoShow
                                ? 'bg-rose-50/70 border-rose-200'
                                : isExcused
                                ? 'bg-amber-50/70 border-amber-200'
                                : 'bg-white border-stone-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              {/* Información del Alumno */}
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                                  {booking.user?.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-serif font-medium text-stone-900">
                                      {booking.user?.name}
                                    </h4>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold">
                                      {booking.bookingCode}
                                    </span>
                                    {booking.status === 'PENDIENTE_VALIDACION' && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                        <span>⚠️</span> Por Validar
                                      </span>
                                    )}
                                    {booking.status === 'CONFIRMADA' && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Confirmada
                                      </span>
                                    )}
                                    {booking.status === 'FINALIZADA' && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                        Finalizada
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-3 text-xs text-stone-500 mt-0.5">
                                    <span>✉️ {booking.user?.email}</span>
                                    {booking.user?.phone && (
                                      <a
                                        href={`https://wa.me/${phoneClean}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-medium"
                                        title="Escribir por WhatsApp"
                                      >
                                        <span>💬 {booking.user.phone}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Botones de Acción de Asistencia 1-Click */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateAttendance(booking.id, 'ATTENDED')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition flex items-center gap-1 ${
                                    isAttended
                                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500 ring-offset-1'
                                      : 'bg-stone-100 text-stone-700 hover:bg-emerald-100 hover:text-emerald-800'
                                  }`}
                                >
                                  <span>✅</span>
                                  <span>Presente</span>
                                </button>

                                <button
                                  onClick={() => handleUpdateAttendance(booking.id, 'NO_SHOW')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition flex items-center gap-1 ${
                                    isNoShow
                                      ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-500 ring-offset-1'
                                      : 'bg-stone-100 text-stone-700 hover:bg-rose-100 hover:text-rose-800'
                                  }`}
                                >
                                  <span>❌</span>
                                  <span>Ausente</span>
                                </button>

                                <button
                                  onClick={() => handleUpdateAttendance(booking.id, 'EXCUSED')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition flex items-center gap-1 ${
                                    isExcused
                                      ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400 ring-offset-1'
                                      : 'bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-800'
                                  }`}
                                >
                                  <span>🟡</span>
                                  <span>Justificado</span>
                                </button>

                                <button
                                  onClick={() => handleUpdateAttendance(booking.id, 'PENDING')}
                                  disabled={actionLoading === `status-${booking.id}`}
                                  className={`px-2.5 py-1.5 text-xs rounded-xl font-medium transition ${
                                    isPending
                                      ? 'bg-stone-300 text-stone-800'
                                      : 'text-stone-400 hover:bg-stone-200'
                                  }`}
                                  title="Restablecer a pendiente"
                                >
                                  <span>⏳</span>
                                </button>
                              </div>
                            </div>

                            {/* Detalles de Check-in y Notas */}
                            <div className="mt-3 pt-3 border-t border-stone-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="text-stone-500 flex items-center gap-2">
                                {booking.checkInAt ? (
                                  <span className="text-emerald-800 font-medium">
                                    🕒 Check-in registrado a las{' '}
                                    {new Date(booking.checkInAt).toLocaleTimeString('es-CL', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                ) : (
                                  <span>Check-in pendiente</span>
                                )}
                              </div>

                              {/* Input de Notas del Alumno */}
                              <div className="flex items-center gap-2 flex-1 max-w-md">
                                <input
                                  type="text"
                                  placeholder="Observaciones (ej. molestia lumbar, puntual)..."
                                  value={editingNotes[booking.id] || ''}
                                  onChange={(e) =>
                                    setEditingNotes({
                                      ...editingNotes,
                                      [booking.id]: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                />
                                <button
                                  onClick={() =>
                                    handleSaveNotes(booking.id, booking.attendanceStatus)
                                  }
                                  disabled={actionLoading === `notes-${booking.id}`}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium transition"
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
