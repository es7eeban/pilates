import React, { useEffect, useState } from 'react';
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
  Power,
  Layers,
  Ban,
  CalendarPlus,
} from 'lucide-react';
import type { ClassType, ClassSchedule, Branch, Instructor } from '../types/schedule';
import type {
  CreateClassTypePayload,
  UpdateClassTypePayload,
  CreateSchedulePayload,
  BulkGenerateSchedulesPayload,
} from '../types/admin';
import { classTypesApi, schedulesApi, branchesApi, usersApi } from '../services/api';

interface AdminClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const AdminClassesModal: React.FC<AdminClassesModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'DISCIPLINES' | 'SCHEDULES'>('SCHEDULES');

  // Common data
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State: Class Types
  const [isClassTypeFormOpen, setIsClassTypeFormOpen] = useState(false);
  const [editingClassType, setEditingClassType] = useState<ClassType | null>(null);
  const [ctTitle, setCtTitle] = useState('');
  const [ctDescription, setCtDescription] = useState('');
  const [ctCapacity, setCtCapacity] = useState(8);
  const [ctPrice, setCtPrice] = useState(15000);
  const [ctDuration, setCtDuration] = useState(60);
  const [ctIntensity, setCtIntensity] = useState('Todos los niveles');

  // Form State: Single Schedule
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [schClassTypeId, setSchClassTypeId] = useState('');
  const [schBranchId, setSchBranchId] = useState('');
  const [schInstructorId, setSchInstructorId] = useState('');
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cts, brs, insts, schs] = await Promise.all([
        classTypesApi.getAll(true),
        branchesApi.getAll(true),
        usersApi.getInstructors(),
        schedulesApi.getAll({
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        }),
      ]);
      setClassTypes(cts);
      setBranches(brs);
      setInstructors(insts);
      setSchedules(schs);

      // Defaults for forms
      if (cts.length > 0 && !schClassTypeId) setSchClassTypeId(cts[0].id);
      if (brs.length > 0 && !schBranchId) setSchBranchId(brs[0].id);
      if (insts.length > 0 && !schInstructorId) setSchInstructorId(insts[0].id);

      const todayStr = new Date().toISOString().split('T')[0];
      if (!schDate) setSchDate(todayStr);
      if (!bulkStartDate) setBulkStartDate(todayStr);
      if (!bulkEndDate) setBulkEndDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar información de clases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
      setIsClassTypeFormOpen(false);
      setIsScheduleFormOpen(false);
      setIsBulkFormOpen(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Handlers: Disciplinas ---

  const handleOpenCreateClassType = () => {
    setEditingClassType(null);
    setCtTitle('');
    setCtDescription('');
    setCtCapacity(8);
    setCtPrice(15000);
    setCtDuration(60);
    setCtIntensity('Todos los niveles');
    setIsClassTypeFormOpen(true);
  };

  const handleOpenEditClassType = (ct: ClassType) => {
    setEditingClassType(ct);
    setCtTitle(ct.title);
    setCtDescription(ct.description || '');
    setCtCapacity(ct.defaultCapacity);
    setCtPrice(Number(ct.defaultPrice));
    setCtDuration(ct.durationMinutes);
    setCtIntensity(ct.intensityLevel);
    setIsClassTypeFormOpen(true);
  };

  const handleSubmitClassType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctTitle.trim()) {
      setError('El título de la disciplina es obligatorio');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingClassType) {
        const payload: UpdateClassTypePayload = {
          title: ctTitle.trim(),
          description: ctDescription.trim() || undefined,
          defaultCapacity: Number(ctCapacity),
          defaultPrice: Number(ctPrice),
          durationMinutes: Number(ctDuration),
          intensityLevel: ctIntensity,
        };
        await classTypesApi.update(editingClassType.id, payload);
        setSuccessMsg(`Disciplina "${ctTitle}" actualizada`);
      } else {
        const payload: CreateClassTypePayload = {
          title: ctTitle.trim(),
          description: ctDescription.trim() || undefined,
          defaultCapacity: Number(ctCapacity),
          defaultPrice: Number(ctPrice),
          durationMinutes: Number(ctDuration),
          intensityLevel: ctIntensity,
        };
        await classTypesApi.create(payload);
        setSuccessMsg(`Disciplina "${ctTitle}" creada exitosamente`);
      }

      setIsClassTypeFormOpen(false);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar disciplina');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleClassTypeActive = async (ct: ClassType) => {
    const action = ct.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${action} la disciplina "${ct.title}"?`)) return;

    setError(null);
    try {
      await classTypesApi.update(ct.id, { isActive: !ct.isActive });
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || `Error al ${action} disciplina`);
    }
  };

  // --- Handlers: Schedules ---

  const handleCreateSingleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schClassTypeId || !schDate || !schStartTime || !schEndTime) {
      setError('Faltan campos obligatorios para el horario');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const startDateTime = new Date(`${schDate}T${schStartTime}:00`).toISOString();
      const endDateTime = new Date(`${schDate}T${schEndTime}:00`).toISOString();

      const payload: CreateSchedulePayload = {
        classTypeId: schClassTypeId,
        branchId: schBranchId || undefined,
        instructorId: schInstructorId || undefined,
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
      const payload: BulkGenerateSchedulesPayload = {
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        daysOfWeek: bulkDaysOfWeek,
        timeSlots: [{ startTime: bulkSlotStart, endTime: bulkSlotEnd }],
        classTypeId: schClassTypeId || classTypes[0]?.id,
        branchId: schBranchId || branches[0]?.id,
        instructorId: schInstructorId || instructors[0]?.id,
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

  const handleCancelSchedule = async (scheduleId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta sesión programada?')) return;

    setCancellingId(scheduleId);
    setError(null);
    try {
      await schedulesApi.cancel(scheduleId);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la sesión');
    } finally {
      setCancellingId(null);
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
              <h2 className="text-lg font-bold text-sage-900">Gestión de Clases & Agenda</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-terra-light text-terra border border-terra/20">
                Admin
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Crea disciplinas, tarifas y publica bloques horarios en el calendario
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-sand-200 bg-sand-50/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('SCHEDULES');
                setIsClassTypeFormOpen(false);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'SCHEDULES'
                  ? 'border-sage-800 text-sage-900 bg-white shadow-sm'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <Calendar className="w-4 h-4 text-sage-700" />
              <span>Horarios Programados ({schedules.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('DISCIPLINES');
                setIsScheduleFormOpen(false);
                setIsBulkFormOpen(false);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'DISCIPLINES'
                  ? 'border-sage-800 text-sage-900 bg-white shadow-sm'
                  : 'border-transparent text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <Layers className="w-4 h-4 text-sage-700" />
              <span>Disciplinas & Tarifas ({classTypes.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            {activeTab === 'SCHEDULES' && !isScheduleFormOpen && !isBulkFormOpen && (
              <>
                <button
                  onClick={() => {
                    setIsScheduleFormOpen(true);
                    setIsBulkFormOpen(false);
                  }}
                  className="px-3 py-1.5 bg-sage-800 hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
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
                  <span className="hidden sm:inline">Generador Masivo</span>
                </button>
              </>
            )}

            {activeTab === 'DISCIPLINES' && !isClassTypeFormOpen && (
              <button
                onClick={handleOpenCreateClassType}
                className="px-3 py-1.5 bg-sage-800 hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Disciplina</span>
              </button>
            )}
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

          {/* TAB 1: SCHEDULES (HORARIOS) */}
          {activeTab === 'SCHEDULES' && (
            <div className="space-y-4">
              {/* Form: Single Schedule */}
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
                      <label className="block font-semibold text-charcoal mb-1">Disciplina *</label>
                      <select
                        value={schClassTypeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchClassTypeId(val);
                          const found = classTypes.find((c) => c.id === val);
                          if (found) {
                            setSchCapacity(found.defaultCapacity);
                            setSchPrice(Number(found.defaultPrice));
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      >
                        {classTypes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.durationMinutes}m)
                          </option>
                        ))}
                      </select>
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
                            {b.name} ({b.commune || b.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Instructor Titular</label>
                      <select
                        value={schInstructorId}
                        onChange={(e) => setSchInstructorId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      >
                        <option value="">Sin instructor asignado</option>
                        {instructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.role})
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

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Hora Inicio *</label>
                      <input
                        type="time"
                        value={schStartTime}
                        onChange={(e) => setSchStartTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Hora Término *</label>
                      <input
                        type="time"
                        value={schEndTime}
                        onChange={(e) => setSchEndTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
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
                      className="px-4 py-2 bg-sage-800 hover:bg-sage-900 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Publicar Horario
                    </button>
                  </div>
                </form>
              )}

              {/* Form: Bulk Generate */}
              {isBulkFormOpen && (
                <form
                  onSubmit={handleBulkGenerateSchedules}
                  className="p-4 bg-sage-50/60 rounded-2xl border border-sage-300 space-y-3 animate-in fade-in text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-sage-200">
                    <div>
                      <h3 className="font-bold text-sage-900 text-sm">Generador Masivo de Horarios Recurrentes</h3>
                      <p className="text-[11px] text-charcoal-muted">
                        Genera todas las sesiones periódicas del mes o quincena en un solo clic
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
                      <label className="block font-semibold text-charcoal mb-1">Disciplina *</label>
                      <select
                        value={schClassTypeId}
                        onChange={(e) => setSchClassTypeId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      >
                        {classTypes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
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

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">Instructor Titular</label>
                      <select
                        value={schInstructorId}
                        onChange={(e) => setSchInstructorId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      >
                        {instructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
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
                                  ? 'bg-sage-800 text-white border-sage-900 shadow-sm'
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
                      className="px-4 py-2 bg-sage-800 hover:bg-sage-900 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                      Generar Sesiones Masivas
                    </button>
                  </div>
                </form>
              )}

              {/* Schedules List */}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sage-600">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12 text-charcoal-muted">
                  <Calendar className="w-10 h-10 mx-auto text-sage-400 mb-2" />
                  <p className="text-sm font-semibold text-charcoal">No hay sesiones en la agenda</p>
                  <p className="text-xs mt-1">Crea horarios usando el botón superior.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {schedules.map((sch) => (
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
                            {sch.classType.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-100 text-sage-800 border border-sage-200">
                            {sch.availableSlots} / {sch.capacity} cupos
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
                            {sch.status}
                          </span>
                          <span className="font-bold text-sage-800">
                            {formatPrice(sch.price)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-charcoal-muted">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-sage-600" />
                            <span>
                              {new Date(sch.startTime).toLocaleDateString('es-CL', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                timeZone: 'UTC',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
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
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-sage-600" />
                            <span>{sch.branch?.name || 'Sede Central'}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5 text-sage-600" />
                            <span>{sch.instructor?.name || 'Sin instructor'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {sch.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleCancelSchedule(sch.id)}
                            disabled={cancellingId === sch.id}
                            className="px-2.5 py-1 text-xs border border-red-200 text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                            title="Cancelar sesión programada"
                          >
                            {cancellingId === sch.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            <span>Cancelar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISCIPLINES (TIPOS DE CLASE) */}
          {activeTab === 'DISCIPLINES' && (
            <div className="space-y-4">
              {/* Form: Class Type */}
              {isClassTypeFormOpen && (
                <form
                  onSubmit={handleSubmitClassType}
                  className="p-4 bg-sand-50/80 rounded-2xl border border-sand-200 space-y-3 animate-in fade-in text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                    <h3 className="font-bold text-sage-900 text-sm">
                      {editingClassType
                        ? `Editar Disciplina: ${editingClassType.title}`
                        : 'Registrar Nueva Disciplina'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsClassTypeFormOpen(false)}
                      className="text-charcoal-muted hover:text-charcoal"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-charcoal mb-1">
                        Título de la Disciplina *
                      </label>
                      <input
                        type="text"
                        value={ctTitle}
                        onChange={(e) => setCtTitle(e.target.value)}
                        placeholder="Ej. Pilates Reformer Pro"
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-charcoal mb-1">Descripción</label>
                      <textarea
                        rows={2}
                        value={ctDescription}
                        onChange={(e) => setCtDescription(e.target.value)}
                        placeholder="Descripción de la técnica, enfoque y beneficios..."
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">
                        Tarifa por Sesión (CLP) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={ctPrice}
                        onChange={(e) => setCtPrice(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">
                        Capacidad por Defecto (Camas) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={ctCapacity}
                        onChange={(e) => setCtCapacity(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">
                        Duración (Minutos) *
                      </label>
                      <input
                        type="number"
                        min="15"
                        step="5"
                        value={ctDuration}
                        onChange={(e) => setCtDuration(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-charcoal mb-1">
                        Nivel de Intensidad
                      </label>
                      <select
                        value={ctIntensity}
                        onChange={(e) => setCtIntensity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                      >
                        <option value="Todos los niveles">Todos los niveles</option>
                        <option value="Principiante">Principiante</option>
                        <option value="Intermedio">Intermedio</option>
                        <option value="Avanzado">Avanzado / Pro</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-200">
                    <button
                      type="button"
                      onClick={() => setIsClassTypeFormOpen(false)}
                      className="px-3.5 py-2 text-charcoal-muted hover:text-charcoal"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-sage-800 hover:bg-sage-900 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      {editingClassType ? 'Guardar Cambios' : 'Crear Disciplina'}
                    </button>
                  </div>
                </form>
              )}

              {/* Class Types Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classTypes.map((ct) => (
                  <div
                    key={ct.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                      ct.isActive
                        ? 'border-sand-200 bg-sand-50/30 hover:bg-white hover:shadow-sm'
                        : 'border-stone-200 bg-stone-50/80 opacity-70'
                    }`}
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-sage-900">{ct.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            ct.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-stone-200 text-stone-600 border-stone-300'
                          }`}
                        >
                          {ct.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>

                      {ct.description && (
                        <p className="text-charcoal-muted line-clamp-2">{ct.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-charcoal-muted">
                        <span className="font-bold text-sage-800">
                          {formatPrice(ct.defaultPrice)}
                        </span>
                        <span>· {ct.durationMinutes} min</span>
                        <span>· {ct.defaultCapacity} camas</span>
                        <span className="bg-sand-200/60 px-1.5 py-0.5 rounded text-[10px]">
                          {ct.intensityLevel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-200/60">
                      <button
                        onClick={() => handleToggleClassTypeActive(ct)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
                          ct.isActive
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={ct.isActive ? 'Desactivar disciplina' : 'Activar disciplina'}
                      >
                        <Power className="w-3 h-3" />
                        <span>{ct.isActive ? 'Desactivar' : 'Activar'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditClassType(ct)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sand-200/70 hover:bg-sand-200 text-charcoal border border-sand-300 transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-sage-700" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
