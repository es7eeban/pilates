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
}

export const AdminClassesModal: React.FC<AdminClassesModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  onViewAttendees,
}) => {
  // Common data
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters for schedule list
  const [filterBranchId, setFilterBranchId] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTimeOfDay, setFilterTimeOfDay] = useState<'ALL' | 'AM' | 'PM'>('ALL');

  // Form State: Single Schedule
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [schBranchId, setSchBranchId] = useState('');
  const [schDate, setSchDate] = useState('');
  const [schStartTime, setSchStartTime] = useState('09:00');
  const [schEndTime, setSchEndTime] = useState('10:00');
  const [schCapacity, setSchCapacity] = useState(8);
  const [schPrice, setSchPrice] = useState(15000);

  // Form State: Bulk Schedules
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<number[]>([1, 3, 5]); // Lun, Mie, Vie
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
  const [cancelNotifyTarget, setCancelNotifyTarget] = useState<'ENROLLED' | 'ALL_CLIENTS'>('ALL_CLIENTS');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cts, brs, schs] = await Promise.all([
        classTypesApi.getAll(true),
        branchesApi.getAll(true),
        schedulesApi.getAll({
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
        }),
      ]);
      setClassTypes(cts);
      setBranches(brs);
      setSchedules(schs);

      if (brs.length > 0 && !schBranchId) setSchBranchId(brs[0].id);

      const todayStr = new Date().toISOString().split('T')[0];
      if (!schDate) setSchDate(todayStr);
      if (!bulkStartDate) setBulkStartDate(todayStr);
      if (!bulkEndDate)
        setBulkEndDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
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
  }, [isOpen]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      if (filterBranchId !== 'ALL' && sch.branchId !== filterBranchId) return false;
      if (filterDate) {
        const schDay = new Date(sch.startTime).toISOString().split('T')[0];
        if (schDay !== filterDate) return false;
      }
      if (filterTimeOfDay !== 'ALL') {
        const hour = new Date(sch.startTime).getUTCHours();
        if (filterTimeOfDay === 'AM' && hour >= 12) return false;
        if (filterTimeOfDay === 'PM' && hour < 12) return false;
      }
      return true;
    });
  }, [schedules, filterBranchId, filterDate, filterTimeOfDay]);

  if (!isOpen) return null;

  // --- Handlers: Create & Bulk Schedules ---

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
      setSuccessMsg('Sesión de clase agendada con éxito en el calendario');
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
      setSuccessMsg(`¡Se han generado masivamente ${res.count} sesiones de clase!`);
      setIsBulkFormOpen(false);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al generar sesiones recurrentes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Edit / Reschedule Single Day ---

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

  // --- Handlers: Cancel / Delete Single Day ---

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
          ? 'Día de clase cancelado y notificación general enviada a todos los alumnos.'
          : 'Día de clase cancelado y notificación enviada a los alumnos inscritos.',
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-sage-900">Gestión de Clases & Horarios</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-terra-light text-terra border border-terra/20">
                Admin · V1
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Programa sesiones individuales o recurrentes, o modifica/cancela un día específico con aviso a los alumnos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-sand-200 bg-sand-50/30">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-sand-200 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-sage-700" />
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
                  className={`px-2 py-0.5 rounded-lg font-bold transition ${
                    filterTimeOfDay === slot
                      ? 'bg-[#3a1b38] text-white'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {slot === 'ALL' ? 'Todo' : slot}
                </button>
              ))}
            </div>

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
          </div>

          <div className="flex items-center gap-2">
            {!isScheduleFormOpen && !isBulkFormOpen && !editingSchedule && !cancellingSchedule && (
              <>
                <button
                  onClick={() => {
                    setIsScheduleFormOpen(true);
                    setIsBulkFormOpen(false);
                  }}
                  className="px-3 py-1.5 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar Horario</span>
                </button>
                <button
                  onClick={() => {
                    setIsBulkFormOpen(true);
                    setIsScheduleFormOpen(false);
                  }}
                  className="px-3 py-1.5 bg-sand-200 hover:bg-sand-300 text-sage-900 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-sand-300"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-sage-700" />
                  <span>Generador Recurrente</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={fetchAllData}
              disabled={loading}
              className="p-1.5 text-charcoal-muted hover:text-charcoal bg-sand-100 hover:bg-sand-200 rounded-xl transition border border-sand-200"
              title="Recargar datos de clases"
            >
              <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
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

          {/* Form 1: Single Schedule */}
          {isScheduleFormOpen && (
            <form
              onSubmit={handleCreateSingleSchedule}
              className="p-4 bg-sand-50/80 rounded-2xl border border-sand-200 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                <h3 className="font-bold text-sage-900 text-sm">Programar Nueva Sesión de Clase</h3>
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
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.commune || b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Fecha de la Clase *</label>
                  <input
                    type="date"
                    value={schDate}
                    onChange={(e) => setSchDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
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
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Hora Término *</label>
                    <input
                      type="time"
                      value={schEndTime}
                      onChange={(e) => setSchEndTime(e.target.value)}
                      required
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Aforo Máximo (Camas)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={schCapacity}
                    onChange={(e) => setSchCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
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
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Publicar Horario
                </button>
              </div>
            </form>
          )}

          {/* Form 2: Bulk Generate */}
          {isBulkFormOpen && (
            <form
              onSubmit={handleBulkGenerateSchedules}
              className="p-4 bg-sage-50/60 rounded-2xl border border-sage-300 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-sage-200">
                <div>
                  <h3 className="font-bold text-sage-900 text-sm">Generador de Horarios Recurrentes</h3>
                  <p className="text-[11px] text-charcoal-muted">
                    Define los días de la semana (ej. todos los Viernes AM) en una sede; luego podrás modificar o eliminar días puntuales si surge algún imprevisto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkFormOpen(false)}
                  className="text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-charcoal mb-1">Fecha Inicio Rango *</label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Fecha Fin Rango *</label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Sede *</label>
                  <select
                    value={schBranchId}
                    onChange={(e) => setSchBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
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
                    <label className="block font-semibold text-charcoal mb-1">Hora Inicio</label>
                    <input
                      type="time"
                      value={bulkSlotStart}
                      onChange={(e) => setBulkSlotStart(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">Hora Fin</label>
                    <input
                      type="time"
                      value={bulkSlotEnd}
                      onChange={(e) => setBulkSlotEnd(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Aforo Máximo (Camas)</label>
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

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-charcoal mb-1.5">
                    Días de la Semana a Programar:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { day: 1, label: 'Lunes' },
                      { day: 2, label: 'Martes' },
                      { day: 3, label: 'Miércoles' },
                      { day: 4, label: 'Jueves' },
                      { day: 5, label: 'Viernes' },
                      { day: 6, label: 'Sábado' },
                      { day: 0, label: 'Domingo' },
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
                          className={`px-3 py-1.5 rounded-xl font-bold transition text-xs border ${
                            isSelected
                              ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-sm'
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sage-200">
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
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                  Generar Sesiones Recurrentes
                </button>
              </div>
            </form>
          )}

          {/* Form 3: Edit / Change Branch or Schedule of Specific Day */}
          {editingSchedule && (
            <form
              onSubmit={handleUpdateSchedule}
              className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                <div>
                  <h3 className="font-bold text-[#3a1b38] text-sm">
                    Modificar Sede u Horario de este Día
                  </h3>
                  <p className="text-[11px] text-charcoal-muted">
                    Actualiza la sede, fecha o bloque horario y envía un aviso automático a los alumnos.
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
                  <label className="block font-semibold text-charcoal mb-1">Sede de la Sesión *</label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  <label className="block font-semibold text-charcoal mb-1">Aforo Máximo</label>
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
                  <label className="block font-semibold text-charcoal mb-1">Destinatarios del Aviso</label>
                  <select
                    value={editNotifyTarget}
                    onChange={(e) =>
                      setEditNotifyTarget(e.target.value as 'ENROLLED' | 'ALL_CLIENTS')
                    }
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  >
                    <option value="ENROLLED">Solo alumnos inscritos en este día</option>
                    <option value="ALL_CLIENTS">Aviso general a todos los alumnos</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-charcoal mb-1">
                    Mensaje o Motivo del Cambio (Se incluirá en la notificación)
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Ej. Por mantención se traslada esta sesión excepcionalmente a Sede Vitacura..."
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
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                  Guardar Cambios y Notificar
                </button>
              </div>
            </form>
          )}

          {/* Form 4: Cancel / Remove Specific Day with General or Enrolled Notification */}
          {cancellingSchedule && (
            <form
              onSubmit={handleConfirmCancelSchedule}
              className="p-4 bg-red-50/80 rounded-2xl border border-red-200 space-y-3 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-red-200">
                <div>
                  <h3 className="font-bold text-red-900 text-sm">
                    Suspender / Eliminar Día de Clase ({new Date(cancellingSchedule.startTime).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })})
                  </h3>
                  <p className="text-[11px] text-red-800/80">
                    Cancela este bloque puntual y deja una notificación a los alumnos.
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
                    Alcance del Aviso / Notificación *
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
                    <option value="ENROLLED">
                      Solo a los alumnos inscritos en esta sesión
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-red-950 mb-1">
                    Motivo para los Alumnos *
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
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Confirmar Suspensión y Notificar
                </button>
              </div>
            </form>
          )}

          {/* Schedules List */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sage-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-12 text-charcoal-muted">
              <Calendar className="w-10 h-10 mx-auto text-sage-400 mb-2" />
              <p className="text-sm font-semibold text-charcoal">No hay sesiones para los filtros seleccionados</p>
              <p className="text-xs mt-1">Crea nuevos horarios usando los botones superiores.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSchedules.map((sch) => {
                const startHour = new Date(sch.startTime).getUTCHours();
                const isMorning = startHour < 12;

                return (
                  <div
                    key={sch.id}
                    className={`p-3.5 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      sch.status === 'CANCELLED'
                        ? 'border-stone-200 bg-stone-50/70 opacity-60'
                        : 'border-sand-200 bg-sand-50/30 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-sage-900">
                          Sesión de Práctica · {sch.branch?.name || 'Sede Central'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#3a1b38] border border-purple-200">
                          {isMorning ? 'Horario AM' : 'Horario PM'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-100 text-sage-800 border border-sage-200">
                          {sch.availableSlots} / {sch.capacity} cupos libres
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            sch.status === 'SCHEDULED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sch.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : sch.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {sch.status === 'SCHEDULED'
                            ? 'PROGRAMADA'
                            : sch.status === 'CANCELLED'
                            ? 'SUSPENDIDA'
                            : sch.status}
                        </span>
                        <span className="font-bold text-sage-800">{formatPrice(sch.price)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-charcoal-muted">
                        <div className="flex items-center gap-1 font-medium text-charcoal capitalize">
                          <Calendar className="w-3.5 h-3.5 text-sage-600" />
                          <span>
                            {new Date(sch.startTime).toLocaleDateString('es-CL', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'short',
                              timeZone: 'UTC',
                            })}
                          </span>
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

                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#d92676]" />
                          <span>{sch.branch?.name || 'Sede Central'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                      {onViewAttendees && (
                        <button
                          type="button"
                          onClick={() => onViewAttendees(sch.id)}
                          className="px-2.5 py-1 text-xs border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1 font-semibold shadow-xs"
                          title="Ver listado de alumnos inscritos y control de asistencia"
                        >
                          <UserIcon className="w-3 h-3 text-emerald-600" />
                          <span>Asistentes</span>
                        </button>
                      )}

                      {sch.status === 'SCHEDULED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSchedule(sch)}
                            className="px-2.5 py-1 text-xs border border-purple-200 bg-purple-50 text-[#3a1b38] hover:bg-purple-100 rounded-lg transition flex items-center gap-1 font-semibold"
                            title="Cambiar sede, fecha u horario de este día"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Cambiar Sede / Hora</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCancelSchedule(sch)}
                            className="px-2.5 py-1 text-xs border border-red-200 text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1 font-semibold"
                            title="Suspender este día y enviar notificación"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Suspender Día</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
