import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Edit2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Ban,
  CalendarPlus,
  BellRing,
  Building2,
  Users,
  CalendarClock,
} from 'lucide-react';
import type { ClassType, ClassSchedule, Branch } from '../types/schedule';
import type {
  CreateSchedulePayload,
  UpdateSchedulePayload,
  CancelSchedulePayload,
  BulkGenerateSchedulesPayload,
} from '../types/admin';
import { classTypesApi, schedulesApi, branchesApi } from '../services/api';

interface AdminClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onViewAttendees?: (scheduleId: string) => void;
  mode?: 'BLOCKS' | 'UPCOMING';
}

interface WeeklyBlockGroup {
  key: string;
  dayOfWeekNum: number; // 1 = Lunes ... 6 = Sábado, 7 = Domingo
  dayLabel: string;
  amPm: 'AM' | 'PM';
  startTimeStr: string;
  endTimeStr: string;
  branchId: string;
  branchName: string;
  branchAddress?: string;
  capacity: number;
  price: number;
  sessionsCount: number;
  totalEnrolledAcrossSessions: number;
  sampleSchedule: ClassSchedule;
}

const DAY_NAMES_BY_ISO: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export const AdminClassesModal: React.FC<AdminClassesModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  onViewAttendees,
  mode = 'BLOCKS',
}) => {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterBranchId, setFilterBranchId] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTimeOfDay, setFilterTimeOfDay] = useState<'ALL' | 'AM' | 'PM'>('ALL');

  // Form State: Single Schedule (Para Próximas Clases)
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [schBranchId, setSchBranchId] = useState('');
  const [schDate, setSchDate] = useState('');
  const [schStartTime, setSchStartTime] = useState('09:00');
  const [schEndTime, setSchEndTime] = useState('10:00');
  const [schCapacity, setSchCapacity] = useState(8);
  const [schPrice, setSchPrice] = useState(15000);

  // Form State: Weekly Block Generator (Para Gestión de Clases & Horarios)
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<number[]>([5, 6]); // Viernes y Sábado por defecto
  const [bulkSlotStart, setBulkSlotStart] = useState('09:00');
  const [bulkSlotEnd, setBulkSlotEnd] = useState('10:00');

  // Form State: Edit / Reschedule Single Day
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [editBranchId, setEditBranchId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editCapacity, setEditCapacity] = useState(8);
  const [editPrice, setEditPrice] = useState(15000);
  const [editReason, setEditReason] = useState('');
  const [editNotifyTarget, setEditNotifyTarget] = useState<'ENROLLED' | 'ALL_CLIENTS'>('ENROLLED');

  // Form State: Cancel / Delete Single Day with Notification
  const [cancellingSchedule, setCancellingSchedule] = useState<ClassSchedule | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotifyTarget, setCancelNotifyTarget] = useState<'ENROLLED' | 'ALL_CLIENTS'>(
    'ALL_CLIENTS',
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cts, brs, schs] = await Promise.all([
        classTypesApi.getAll(true),
        branchesApi.getAll(true),
        schedulesApi.getAll({
          dateFrom: todayIso,
          dateTo: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        }),
      ]);
      setClassTypes(cts);
      setBranches(brs);
      setSchedules(schs);

      if (brs.length > 0 && !schBranchId) setSchBranchId(brs[0].id);

      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      if (!schDate) setSchDate(tomorrowStr);
      if (!bulkStartDate) setBulkStartDate(todayIso);
      if (!bulkEndDate)
        setBulkEndDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar información de clases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
      setIsScheduleFormOpen(false);
      setIsBulkFormOpen(false);
      setEditingSchedule(null);
      setCancellingSchedule(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, mode]);

  // =========================================================================
  // MODO 1 ('BLOCKS'): AGRUPACIÓN POR BLOQUES SEMANALES (EJ. VIERNES AM, SÁBADO AM)
  // =========================================================================
  const weeklyBlocks = useMemo<WeeklyBlockGroup[]>(() => {
    const activeSchedules = schedules.filter((sch) => {
      if (sch.status === 'CANCELLED') return false;
      if (filterBranchId !== 'ALL' && sch.branchId !== filterBranchId) return false;
      const hour = new Date(sch.startTime).getUTCHours();
      if (filterTimeOfDay === 'AM' && hour >= 14) return false;
      if (filterTimeOfDay === 'PM' && hour < 14) return false;
      return true;
    });

    const map = new Map<string, WeeklyBlockGroup>();

    for (const sch of activeSchedules) {
      const startObj = new Date(sch.startTime);
      const endObj = new Date(sch.endTime);
      const jsDay = startObj.getUTCDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      const dayLabel = DAY_NAMES_BY_ISO[isoDay] || 'Día';
      const hour = startObj.getUTCHours();
      const amPm: 'AM' | 'PM' = hour < 14 ? 'AM' : 'PM';
      const startTimeStr = startObj.toISOString().slice(11, 16);
      const endTimeStr = endObj.toISOString().slice(11, 16);
      const branchId = sch.branchId || 'default';
      const branchName = sch.branch?.name || 'Sede Principal';

      const key = `${isoDay}-${amPm}-${startTimeStr}-${branchId}`;
      const enrolled = Math.max(0, sch.capacity - sch.availableSlots);

      const existing = map.get(key);
      if (existing) {
        existing.sessionsCount += 1;
        existing.totalEnrolledAcrossSessions += enrolled;
      } else {
        map.set(key, {
          key,
          dayOfWeekNum: isoDay,
          dayLabel,
          amPm,
          startTimeStr,
          endTimeStr,
          branchId,
          branchName,
          branchAddress: sch.branch?.address,
          capacity: sch.capacity,
          price: Number(sch.price),
          sessionsCount: 1,
          totalEnrolledAcrossSessions: enrolled,
          sampleSchedule: sch,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.dayOfWeekNum !== b.dayOfWeekNum) return a.dayOfWeekNum - b.dayOfWeekNum;
      return a.startTimeStr.localeCompare(b.startTimeStr);
    });
  }, [schedules, filterBranchId, filterTimeOfDay]);

  // =========================================================================
  // MODO 2 ('UPCOMING'): CLASES PROGRAMADAS DE DÍAS POSTERIORES
  // =========================================================================
  const upcomingSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      const schDay = new Date(sch.startTime).toISOString().split('T')[0];
      // En Próximas Clases mostramos las sesiones de días posteriores a hoy (o según filtro de fecha)
      if (!filterDate && schDay <= todayIso) return false;
      if (filterDate && schDay !== filterDate) return false;
      if (filterBranchId !== 'ALL' && sch.branchId !== filterBranchId) return false;
      if (filterTimeOfDay !== 'ALL') {
        const hour = new Date(sch.startTime).getUTCHours();
        if (filterTimeOfDay === 'AM' && hour >= 14) return false;
        if (filterTimeOfDay === 'PM' && hour < 14) return false;
      }
      return true;
    });
  }, [schedules, filterBranchId, filterDate, filterTimeOfDay, todayIso]);

  if (!isOpen) return null;

  // --- Handlers ---

  const handleCreateSingleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schDate || !schStartTime || !schEndTime) {
      setError('Faltan campos obligatorios para el horario');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const startDateTime = new Date(`${schDate}T${schStartTime}:00.000Z`).toISOString();
      const endDateTime = new Date(`${schDate}T${schEndTime}:00.000Z`).toISOString();

      const payload: CreateSchedulePayload = {
        classTypeId: classTypes[0]?.id || undefined,
        branchId: schBranchId || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        capacity: Number(schCapacity),
        price: Number(schPrice),
      };

      await schedulesApi.create(payload);
      setSuccessMsg('Sesión de clase agendada con éxito');
      setIsScheduleFormOpen(false);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al agendar la sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkGenerateSchedules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStartDate || !bulkEndDate || bulkDaysOfWeek.length === 0) {
      setError('Selecciona el rango de fechas y al menos un día de la semana');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const [sh, sm] = bulkSlotStart.split(':').map(Number);
      const [eh, em] = bulkSlotEnd.split(':').map(Number);
      const computedDuration = Math.max(15, eh * 60 + em - (sh * 60 + sm));

      const payload: BulkGenerateSchedulesPayload = {
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        daysOfWeek: bulkDaysOfWeek,
        times: [bulkSlotStart],
        durationMinutes: computedDuration || 60,
        classTypeId: classTypes[0]?.id || undefined,
        branchId: schBranchId || branches[0]?.id,
        capacity: Number(schCapacity),
        price: Number(schPrice),
      };

      const res = await schedulesApi.bulkGenerate(payload);
      setSuccessMsg(
        `¡Bloque horario configurado! Se programaron ${res.count} sesiones en las fechas correspondientes.`,
      );
      setIsBulkFormOpen(false);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al configurar el bloque semanal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditSchedule = (sch: ClassSchedule) => {
    setCancellingSchedule(null);
    setIsScheduleFormOpen(false);
    setIsBulkFormOpen(false);
    setEditingSchedule(sch);
    setEditBranchId(sch.branchId || branches[0]?.id || '');
    const startObj = new Date(sch.startTime);
    const endObj = new Date(sch.endTime);
    setEditDate(startObj.toISOString().split('T')[0]);
    setEditStartTime(startObj.toISOString().slice(11, 16));
    setEditEndTime(endObj.toISOString().slice(11, 16));
    setEditCapacity(sch.capacity);
    setEditPrice(Number(sch.price));
    setEditReason('');
    setEditNotifyTarget('ENROLLED');
    setError(null);
    setSuccessMsg(null);
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const startDateTime = new Date(`${editDate}T${editStartTime}:00.000Z`).toISOString();
      const endDateTime = new Date(`${editDate}T${editEndTime}:00.000Z`).toISOString();

      const payload: UpdateSchedulePayload = {
        branchId: editBranchId || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        capacity: Number(editCapacity),
        price: Number(editPrice),
        reason: editReason.trim() || undefined,
        notifyTarget: editNotifyTarget,
      };

      await schedulesApi.update(editingSchedule.id, payload);
      setSuccessMsg(
        editNotifyTarget === 'ALL_CLIENTS'
          ? 'Sesión modificada y aviso general enviado a todos los alumnos.'
          : 'Sesión modificada y aviso enviado a los alumnos inscritos.',
      );
      setEditingSchedule(null);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al modificar la sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCancelSchedule = (sch: ClassSchedule) => {
    setEditingSchedule(null);
    setIsScheduleFormOpen(false);
    setIsBulkFormOpen(false);
    setCancellingSchedule(sch);
    setCancelReason('');
    setCancelNotifyTarget('ALL_CLIENTS');
    setError(null);
    setSuccessMsg(null);
  };

  const handleConfirmCancelSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSchedule) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: CancelSchedulePayload = {
        reason: cancelReason.trim() || undefined,
        notifyTarget: cancelNotifyTarget,
      };
      await schedulesApi.cancel(cancellingSchedule.id, payload);
      setSuccessMsg(
        cancelNotifyTarget === 'ALL_CLIENTS'
          ? 'Día de clase suspendido y notificación general enviada a todos los alumnos.'
          : 'Día de clase suspendido y notificación enviada a los alumnos inscritos.',
      );
      setCancellingSchedule(null);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (p: number | string) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Number(p));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header dinámico según modo: BLOCKS (Administración) vs UPCOMING (Próximas Clases) */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-[#faf9f6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center shadow-sm">
              {mode === 'BLOCKS' ? (
                <CalendarPlus className="w-5 h-5" />
              ) : (
                <CalendarClock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#220622]">
                  {mode === 'BLOCKS'
                    ? 'Gestión de Clases & Horarios (Bloques Semanales)'
                    : 'Próximas Clases Programadas (Días Posteriores)'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#3a1b38] border border-purple-200">
                  {mode === 'BLOCKS' ? 'Administración' : 'Operación & Agenda'}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {mode === 'BLOCKS'
                  ? 'Resumen de tus bloques de clases por día de la semana (AM / PM), sede, horario y cantidad máxima de alumnos'
                  : 'Revisa las sesiones de los próximos días, alumnos agendados o reprograma/suspende una fecha específica'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros y Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-sand-200 bg-sand-50/40">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-sand-200 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#3a1b38]" />
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="bg-transparent font-semibold text-charcoal focus:outline-none"
              >
                <option value="ALL">Todas las sedes</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white border border-sand-200 rounded-xl p-1">
              {(['ALL', 'AM', 'PM'] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setFilterTimeOfDay(slot)}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition ${
                    filterTimeOfDay === slot
                      ? 'bg-[#3a1b38] text-white'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {slot === 'ALL' ? 'AM y PM' : `Bloque ${slot}`}
                </button>
              ))}
            </div>

            {mode === 'UPCOMING' && (
              <div className="flex items-center gap-1.5 bg-white border border-sand-200 rounded-xl px-2.5 py-1">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
                />
                {filterDate && (
                  <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="text-charcoal-muted hover:text-charcoal"
                    title="Limpiar fecha"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isScheduleFormOpen && !isBulkFormOpen && !editingSchedule && !cancellingSchedule && (
              <>
                {mode === 'BLOCKS' ? (
                  <button
                    onClick={() => {
                      setIsBulkFormOpen(true);
                      setIsScheduleFormOpen(false);
                    }}
                    className="px-3.5 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>+ Configurar Bloque Semanal (AM / PM)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsScheduleFormOpen(true);
                      setIsBulkFormOpen(false);
                    }}
                    className="px-3.5 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agendar Clase en Fecha Puntual</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={fetchAllData}
              disabled={loading}
              className="p-2 text-charcoal-muted hover:text-charcoal bg-white hover:bg-sand-100 rounded-xl transition border border-sand-200"
              title="Actualizar"
            >
              <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Cuerpo Principal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario Configurar Bloque Semanal Recurrente */}
          {isBulkFormOpen && (
            <form
              onSubmit={handleBulkGenerateSchedules}
              className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                <div>
                  <h3 className="font-bold text-[#220622] text-sm">
                    Configurar Bloque de Clases Semanal (Ej. Viernes AM / Sábado AM)
                  </h3>
                  <p className="text-[11px] text-charcoal-muted">
                    Selecciona los días que impartes clases, la sede, el horario (AM o PM) y la cantidad máxima de alumnos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkFormOpen(false)}
                  className="text-charcoal-muted hover:text-charcoal font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Sede *</label>
                  <select
                    value={schBranchId}
                    onChange={(e) => setSchBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-charcoal mb-1">Hora Inicio *</label>
                    <input
                      type="time"
                      value={bulkSlotStart}
                      onChange={(e) => setBulkSlotStart(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-charcoal mb-1">Hora Término *</label>
                    <input
                      type="time"
                      value={bulkSlotEnd}
                      onChange={(e) => setBulkSlotEnd(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">
                    Cantidad Máx. de Alumnos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={schCapacity}
                    onChange={(e) => setSchCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Desde Fecha *</label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Hasta Fecha *</label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">Tarifa por Clase (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={schPrice}
                    onChange={(e) => setSchPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-bold text-charcoal mb-1.5">
                    Días de la Semana en que se imparte este bloque:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { day: 1, label: 'Lunes' },
                      { day: 2, label: 'Martes' },
                      { day: 3, label: 'Miércoles' },
                      { day: 4, label: 'Jueves' },
                      { day: 5, label: 'Viernes' },
                      { day: 6, label: 'Sábado' },
                      { day: 7, label: 'Domingo' },
                    ].map((d) => {
                      const isSelected = bulkDaysOfWeek.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setBulkDaysOfWeek(bulkDaysOfWeek.filter((x) => x !== d.day));
                            } else {
                              setBulkDaysOfWeek([...bulkDaysOfWeek, d.day]);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-xl font-bold transition text-xs border ${
                            isSelected
                              ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-xs'
                              : 'bg-white text-charcoal hover:bg-sand-100 border-sand-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => setIsBulkFormOpen(false)}
                  className="px-3 py-1.5 text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || bulkDaysOfWeek.length === 0}
                  className="px-4 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="w-3.5 h-3.5" />
                  )}
                  Guardar Bloque Semanal
                </button>
              </div>
            </form>
          )}

          {/* Formulario Agendar Fecha Puntual */}
          {isScheduleFormOpen && (
            <form
              onSubmit={handleCreateSingleSchedule}
              className="p-4 bg-sand-50/80 rounded-2xl border border-sand-200 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                <h3 className="font-bold text-sage-900 text-sm">Programar Nueva Sesión Puntual</h3>
                <button
                  type="button"
                  onClick={() => setIsScheduleFormOpen(false)}
                  className="text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal mb-1">Sede *</label>
                  <select
                    value={schBranchId}
                    onChange={(e) => setSchBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={schDate}
                    onChange={(e) => setSchDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Hora Inicio *</label>
                    <input
                      type="time"
                      value={schStartTime}
                      onChange={(e) => setSchStartTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Hora Término *</label>
                    <input
                      type="time"
                      value={schEndTime}
                      onChange={(e) => setSchEndTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Cantidad Máx. Alumnos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={schCapacity}
                    onChange={(e) => setSchCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Tarifa (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={schPrice}
                    onChange={(e) => setSchPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-200">
                <button
                  type="button"
                  onClick={() => setIsScheduleFormOpen(false)}
                  className="px-3 py-1.5 text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Publicar Horario
                </button>
              </div>
            </form>
          )}

          {/* Formulario Modificar Sede u Horario de Fecha Puntual */}
          {editingSchedule && (
            <form
              onSubmit={handleUpdateSchedule}
              className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                <div>
                  <h3 className="font-bold text-[#3a1b38] text-sm">
                    Modificar Sede, Horario o Aforo
                  </h3>
                  <p className="text-[11px] text-charcoal-muted">
                    Actualiza la sede, fecha, horario o cupo máximo y notifica a los alumnos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="text-charcoal-muted hover:text-charcoal"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal mb-1">Sede *</label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Hora Inicio *</label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Hora Fin *</label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Cantidad Máx. Alumnos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Tarifa (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Destinatarios del Aviso
                  </label>
                  <select
                    value={editNotifyTarget}
                    onChange={(e) =>
                      setEditNotifyTarget(e.target.value as 'ENROLLED' | 'ALL_CLIENTS')
                    }
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  >
                    <option value="ENROLLED">Solo alumnos inscritos</option>
                    <option value="ALL_CLIENTS">Aviso general a todos los alumnos</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-charcoal mb-1">
                    Motivo del Cambio (Se incluirá en la notificación)
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Ej. Por mantención se traslada esta sesión excepcionalmente..."
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-3 py-1.5 text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BellRing className="w-3.5 h-3.5" />
                  )}
                  Guardar Cambios y Notificar
                </button>
              </div>
            </form>
          )}

          {/* Formulario Suspender Día con Notificación */}
          {cancellingSchedule && (
            <form
              onSubmit={handleConfirmCancelSchedule}
              className="p-4 bg-red-50/80 rounded-2xl border border-red-200 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-red-200">
                <div>
                  <h3 className="font-bold text-red-900 text-sm">
                    Suspender Día de Clase (
                    {new Date(cancellingSchedule.startTime).toLocaleDateString('es-CL', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                    )
                  </h3>
                  <p className="text-[11px] text-red-800/80">
                    La clase quedará registrada como No Realizada / Cancelada en el Historial con este motivo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCancellingSchedule(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-red-950 mb-1">
                    Alcance de la Notificación *
                  </label>
                  <select
                    value={cancelNotifyTarget}
                    onChange={(e) =>
                      setCancelNotifyTarget(e.target.value as 'ENROLLED' | 'ALL_CLIENTS')
                    }
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl focus:outline-none"
                  >
                    <option value="ALL_CLIENTS">
                      Notificación General a todos los alumnos activos
                    </option>
                    <option value="ENROLLED">Solo a los alumnos inscritos en esta fecha</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-red-950 mb-1">
                    Motivo de Cancelación *
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ej. Este viernes AM no habrá clases por compromiso administrativo..."
                    required
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200">
                <button
                  type="button"
                  onClick={() => setCancellingSchedule(null)}
                  className="px-3 py-1.5 text-red-800 hover:text-red-950"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  Confirmar Suspensión
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* CONTENIDO SEGÚN MODO: 'BLOCKS' (BLOQUES SEMANALES) VS 'UPCOMING' (FECHAS) */}
          {/* ========================================================================= */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sage-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : mode === 'BLOCKS' ? (
            /* MODO 1: ADMINISTRACIÓN -> GESTIÓN DE CLASES POR BLOQUES SEMANALES */
            weeklyBlocks.length === 0 ? (
              <div className="text-center py-12 text-charcoal-muted">
                <CalendarPlus className="w-10 h-10 mx-auto text-sage-400 mb-2" />
                <p className="text-sm font-semibold text-charcoal">
                  No hay bloques semanales configurados para este filtro
                </p>
                <p className="text-xs mt-1">
                  Usa el botón superior "+ Configurar Bloque Semanal (AM / PM)" para agregar tus días y horarios de clase.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {weeklyBlocks.map((block) => (
                  <div
                    key={block.key}
                    className="p-4 rounded-2xl border border-sand-200 bg-sand-50/40 hover:bg-white hover:shadow-sm transition flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#3a1b38] text-white shadow-2xs">
                            Clase {block.dayLabel} {block.amPm}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              block.amPm === 'AM'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-purple-50 text-[#3a1b38] border-purple-200'
                            }`}
                          >
                            {block.amPm === 'AM' ? 'Jornada Mañana' : 'Jornada Tarde'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-sage-900 font-mono">
                          {formatPrice(block.price)}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center gap-2 text-charcoal font-bold text-sm">
                          <MapPin className="w-4 h-4 text-[#d92676] shrink-0" />
                          <span>{block.branchName}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-charcoal-muted">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
                            <Clock className="w-3.5 h-3.5 text-sage-600" />
                            Horario: {block.startTimeStr} - {block.endTimeStr} hrs
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            Máx. {block.capacity} alumnos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-sand-200/80 flex items-center justify-between text-[11px] text-charcoal-muted">
                      <span>
                        {block.sessionsCount}{' '}
                        {block.sessionsCount === 1
                          ? 'fecha activa en agenda'
                          : 'fechas activas en agenda'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditSchedule(block.sampleSchedule)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-[#3a1b38] border border-purple-200 font-bold transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Ajustar Bloque</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* MODO 2: OPERACIÓN & AGENDA -> PRÓXIMAS CLASES (DÍAS POSTERIORES) */
            upcomingSchedules.length === 0 ? (
              <div className="text-center py-12 text-charcoal-muted">
                <Calendar className="w-10 h-10 mx-auto text-sage-400 mb-2" />
                <p className="text-sm font-semibold text-charcoal">
                  No hay próximas clases programadas para los filtros seleccionados
                </p>
                <p className="text-xs mt-1">
                  Las clases del día de hoy se gestionan directamente en "Asistencia & Check-in".
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingSchedules.map((sch) => {
                  const startHour = new Date(sch.startTime).getUTCHours();
                  const isMorning = startHour < 14;
                  const enrolled = Math.max(0, sch.capacity - sch.availableSlots);

                  return (
                    <div
                      key={sch.id}
                      className="p-3.5 rounded-xl border border-sand-200 bg-sand-50/30 hover:bg-white hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-sage-900 capitalize">
                            {new Date(sch.startTime).toLocaleDateString('es-CL', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              timeZone: 'UTC',
                            })}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#3a1b38] border border-purple-200">
                            {isMorning ? 'Bloque AM' : 'Bloque PM'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {enrolled} / {sch.capacity} alumnos inscritos
                          </span>
                          <span className="font-bold text-sage-800">{formatPrice(sch.price)}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-charcoal-muted">
                          <div className="flex items-center gap-1 font-semibold text-charcoal">
                            <MapPin className="w-3.5 h-3.5 text-[#d92676]" />
                            <span>{sch.branch?.name || 'Sede Central'}</span>
                          </div>

                          <div className="flex items-center gap-1 font-medium text-charcoal">
                            <Clock className="w-3.5 h-3.5 text-sage-600" />
                            <span>
                              {new Date(sch.startTime).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'UTC',
                              })}{' '}
                              -{' '}
                              {new Date(sch.endTime).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'UTC',
                              })}{' '}
                              hrs
                            </span>
                          </div>

                          <span className="text-[11px]">
                            Máx. {sch.capacity} alumnos ({sch.availableSlots} libres)
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                        {onViewAttendees && (
                          <button
                            type="button"
                            onClick={() => onViewAttendees(sch.id)}
                            className="px-2.5 py-1.5 text-xs border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1 font-bold"
                          >
                            <UserIcon className="w-3 h-3 text-emerald-600" />
                            <span>Ver Inscritos ({enrolled})</span>
                          </button>
                        )}

                        {sch.status === 'SCHEDULED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(sch)}
                              className="px-2.5 py-1.5 text-xs border border-purple-200 bg-purple-50 text-[#3a1b38] hover:bg-purple-100 rounded-lg transition flex items-center gap-1 font-semibold"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Reprogramar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenCancelSchedule(sch)}
                              className="px-2.5 py-1.5 text-xs border border-red-200 text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1 font-semibold"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Suspender Fecha</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
