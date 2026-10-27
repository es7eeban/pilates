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
  Repeat,
  CalendarDays,
  SlidersHorizontal,
  Trash2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ClassType, ClassSchedule, Branch } from '../types/schedule';
import type {
  CreateSchedulePayload,
  UpdateSchedulePayload,
  BulkUpdateSchedulesPayload,
  CancelSchedulePayload,
  BulkGenerateSchedulesPayload,
  StudioTimeSlot,
  CreateStudioTimeSlotPayload,
} from '../types/admin';
import { classTypesApi, schedulesApi, branchesApi } from '../services/api';

interface AdminClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onViewAttendees?: (scheduleId: string) => void;
  mode?: 'BLOCKS' | 'UPCOMING';
}

export interface TimeSlotOption {
  value: string;
  start: string;
  end: string;
  label: string;
  period: 'AM' | 'PM';
}

const DEFAULT_AM_SLOTS: TimeSlotOption[] = [
  { value: '08:00-09:00', start: '08:00', end: '09:00', label: 'De 8:00 a 9:00 AM', period: 'AM' },
  { value: '09:00-10:00', start: '09:00', end: '10:00', label: 'De 9:00 a 10:00 AM', period: 'AM' },
  { value: '10:00-11:00', start: '10:00', end: '11:00', label: 'De 10:00 a 11:00 AM', period: 'AM' },
  { value: '11:00-12:00', start: '11:00', end: '12:00', label: 'De 11:00 a 12:00 AM', period: 'AM' },
];

const DEFAULT_PM_SLOTS: TimeSlotOption[] = [
  { value: '12:00-13:00', start: '12:00', end: '13:00', label: 'De 12:00 a 1:00 PM', period: 'PM' },
  { value: '13:00-14:00', start: '13:00', end: '14:00', label: 'De 1:00 a 2:00 PM', period: 'PM' },
  { value: '14:00-15:00', start: '14:00', end: '15:00', label: 'De 2:00 a 3:00 PM', period: 'PM' },
  { value: '15:00-16:00', start: '15:00', end: '16:00', label: 'De 3:00 a 4:00 PM', period: 'PM' },
  { value: '16:00-17:00', start: '16:00', end: '17:00', label: 'De 4:00 a 5:00 PM', period: 'PM' },
  { value: '17:00-18:00', start: '17:00', end: '18:00', label: 'De 5:00 a 6:00 PM', period: 'PM' },
  { value: '18:00-19:00', start: '18:00', end: '19:00', label: 'De 6:00 a 7:00 PM', period: 'PM' },
  { value: '19:00-20:00', start: '19:00', end: '20:00', label: 'De 7:00 a 8:00 PM', period: 'PM' },
  { value: '20:00-21:00', start: '20:00', end: '21:00', label: 'De 8:00 a 9:00 PM', period: 'PM' },
  { value: '21:00-22:00', start: '21:00', end: '22:00', label: 'De 9:00 a 10:00 PM', period: 'PM' },
];

function format12HourTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${mStr}`;
}

function computeAutoLabel(startTime: string, endTime: string, period: 'AM' | 'PM'): string {
  return `De ${format12HourTime(startTime)} a ${format12HourTime(endTime)} ${period}`;
}

function formatSlotHumanLabel(
  startTimeStr: string,
  endTimeStr: string,
  configuredSlots: TimeSlotOption[],
): string {
  const matched = configuredSlots.find((s) => s.start === startTimeStr && s.end === endTimeStr);
  if (matched) return matched.label;
  const hour = parseInt(startTimeStr.split(':')[0], 10);
  const period = hour < 12 ? 'AM' : 'PM';
  return `De ${format12HourTime(startTimeStr)} a ${format12HourTime(endTimeStr)} ${period}`;
}

interface WeeklyBlockGroup {
  key: string;
  dayOfWeekNum: number;
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
  schedules: ClassSchedule[];
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
  const [activeViewMode, setActiveViewMode] = useState<'BLOCKS' | 'UPCOMING' | 'TIME_SLOTS'>(mode);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [customTimeSlots, setCustomTimeSlots] = useState<StudioTimeSlot[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterBranchId, setFilterBranchId] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTimeOfDay, setFilterTimeOfDay] = useState<'ALL' | 'AM' | 'PM'>('ALL');

  // Formulario Unificado Agregar Clase (Recurrente vs En Particular)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [schBranchId, setSchBranchId] = useState('');
  const [schPeriod, setSchPeriod] = useState<'AM' | 'PM'>('AM');
  const [schSlotValue, setSchSlotValue] = useState<string>('09:00-10:00');
  const [schCapacity, setSchCapacity] = useState(8);
  const [schPrice, setSchPrice] = useState(15000);
  const [schDate, setSchDate] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<number[]>([5, 6]);

  // Estado para Editar Clase
  const [editingGroupSchedules, setEditingGroupSchedules] = useState<ClassSchedule[]>([]);
  const [editScope, setEditScope] = useState<'SINGLE_DATE' | 'ALL_RECURRING'>('SINGLE_DATE');
  const [editTargetScheduleId, setEditTargetScheduleId] = useState<string>('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPeriod, setEditPeriod] = useState<'AM' | 'PM'>('AM');
  const [editSlotValue, setEditSlotValue] = useState<string>('09:00-10:00');
  const [editCapacity, setEditCapacity] = useState(8);
  const [editPrice, setEditPrice] = useState(15000);
  const [editReason, setEditReason] = useState('');
  const [editNotifyTarget, setEditNotifyTarget] = useState<'ENROLLED' | 'ALL_CLIENTS'>('ENROLLED');

  // Estado para Suspender / Eliminar Clase
  const [cancellingGroupSchedules, setCancellingGroupSchedules] = useState<ClassSchedule[]>([]);
  const [cancelScope, setCancelScope] = useState<'SINGLE_DATE' | 'ALL_RECURRING'>('SINGLE_DATE');
  const [cancelTargetScheduleId, setCancelTargetScheduleId] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotifyTarget, setCancelNotifyTarget] = useState<'ENROLLED' | 'ALL_CLIENTS'>('ALL_CLIENTS');

  // Estado para Administrador de Tramos Horarios (AM / PM)
  const [slotFormPeriod, setSlotFormPeriod] = useState<'AM' | 'PM'>('AM');
  const [slotFormStart, setSlotFormStart] = useState('09:00');
  const [slotFormEnd, setSlotFormEnd] = useState('10:30');
  const [slotFormLabel, setSlotFormLabel] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotActionLoading, setSlotActionLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Opciones de Horarios dinámicas cargadas desde el backend
  const amSlots = useMemo<TimeSlotOption[]>(() => {
    const list = customTimeSlots.filter((s) => s.period === 'AM' && s.isActive);
    if (list.length === 0) return DEFAULT_AM_SLOTS;
    return list.map((s) => ({
      value: `${s.startTime}-${s.endTime}`,
      start: s.startTime,
      end: s.endTime,
      label: s.label,
      period: 'AM',
    }));
  }, [customTimeSlots]);

  const pmSlots = useMemo<TimeSlotOption[]>(() => {
    const list = customTimeSlots.filter((s) => s.period === 'PM' && s.isActive);
    if (list.length === 0) return DEFAULT_PM_SLOTS;
    return list.map((s) => ({
      value: `${s.startTime}-${s.endTime}`,
      start: s.startTime,
      end: s.endTime,
      label: s.label,
      period: 'PM',
    }));
  }, [customTimeSlots]);

  const allConfiguredSlots = useMemo<TimeSlotOption[]>(() => {
    return [...amSlots, ...pmSlots];
  }, [amSlots, pmSlots]);

  const resolveSlotFromTimes = (
    startTimeIso: string,
    endTimeIso?: string,
  ): { period: 'AM' | 'PM'; slotValue: string } => {
    const startObj = new Date(startTimeIso);
    const startStr = startObj.toISOString().slice(11, 16);
    const endStr = endTimeIso ? new Date(endTimeIso).toISOString().slice(11, 16) : '';
    const hour = startObj.getUTCHours();
    const period: 'AM' | 'PM' = hour < 12 ? 'AM' : 'PM';

    const matchExact = allConfiguredSlots.find((s) => s.start === startStr && s.end === endStr);
    if (matchExact) {
      return { period: matchExact.period, slotValue: matchExact.value };
    }

    const matchStart = allConfiguredSlots.find((s) => s.start === startStr);
    if (matchStart) {
      return { period: matchStart.period, slotValue: matchStart.value };
    }

    const currentGroup = period === 'AM' ? amSlots : pmSlots;
    if (currentGroup.length > 0) {
      return { period, slotValue: currentGroup[0].value };
    }

    return { period, slotValue: `${startStr}-${endStr || '10:00'}` };
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cts, brs, schs, slots] = await Promise.all([
        classTypesApi.getAll(true),
        branchesApi.getAll(true),
        schedulesApi.getAll({
          dateFrom: todayIso,
          dateTo: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        }),
        schedulesApi.getTimeSlots().catch(() => [] as StudioTimeSlot[]),
      ]);
      setClassTypes(cts);
      setBranches(brs);
      setSchedules(schs);
      setCustomTimeSlots(slots);

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
      setActiveViewMode(mode);
      setIsRecurring(mode === 'BLOCKS');
      fetchAllData();
      setIsAddFormOpen(false);
      setEditingGroupSchedules([]);
      setCancellingGroupSchedules([]);
      setEditingSlotId(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, mode]);

  // Sincronizar slot inicial si cambia la lista
  useEffect(() => {
    const list = schPeriod === 'AM' ? amSlots : pmSlots;
    if (list.length > 0 && !list.some((s) => s.value === schSlotValue)) {
      setSchSlotValue(list[0].value);
    }
  }, [amSlots, pmSlots, schPeriod]);

  // Agrupación por Bloques Semanales
  const weeklyBlocks = useMemo<WeeklyBlockGroup[]>(() => {
    const activeSchedules = schedules.filter((sch) => {
      if (sch.status === 'CANCELLED') return false;
      if (filterBranchId !== 'ALL' && sch.branchId !== filterBranchId) return false;
      const hour = new Date(sch.startTime).getUTCHours();
      if (filterTimeOfDay === 'AM' && hour >= 12) return false;
      if (filterTimeOfDay === 'PM' && hour < 12) return false;
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
      const amPm: 'AM' | 'PM' = hour < 12 ? 'AM' : 'PM';
      const startTimeStr = startObj.toISOString().slice(11, 16);
      const endTimeStr = endObj.toISOString().slice(11, 16);
      const branchId = sch.branchId || 'default';
      const branchName = sch.branch?.name || 'Sede Principal';

      const key = `${isoDay}-${startTimeStr}-${endTimeStr}-${branchId}`;
      const enrolled = Math.max(0, sch.capacity - sch.availableSlots);

      const existing = map.get(key);
      if (existing) {
        existing.sessionsCount += 1;
        existing.totalEnrolledAcrossSessions += enrolled;
        existing.schedules.push(sch);
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
          schedules: [sch],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.dayOfWeekNum !== b.dayOfWeekNum) return a.dayOfWeekNum - b.dayOfWeekNum;
      return a.startTimeStr.localeCompare(b.startTimeStr);
    });
  }, [schedules, filterBranchId, filterTimeOfDay]);

  // Clases programadas por fecha
  const upcomingSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      if (sch.status === 'CANCELLED') return false;
      const schDay = new Date(sch.startTime).toISOString().split('T')[0];
      if (!filterDate && schDay < todayIso) return false;
      if (filterDate && schDay !== filterDate) return false;
      if (filterBranchId !== 'ALL' && sch.branchId !== filterBranchId) return false;
      if (filterTimeOfDay !== 'ALL') {
        const hour = new Date(sch.startTime).getUTCHours();
        if (filterTimeOfDay === 'AM' && hour >= 12) return false;
        if (filterTimeOfDay === 'PM' && hour < 12) return false;
      }
      return true;
    });
  }, [schedules, filterBranchId, filterDate, filterTimeOfDay, todayIso]);

  if (!isOpen) return null;

  const findSiblingSchedulesFor = (target: ClassSchedule): ClassSchedule[] => {
    const startObj = new Date(target.startTime);
    const jsDay = startObj.getUTCDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    const startTimeStr = startObj.toISOString().slice(11, 16);
    const branchId = target.branchId || 'default';

    return schedules
      .filter((s) => {
        if (s.status === 'CANCELLED') return false;
        const d = new Date(s.startTime);
        const sJsDay = d.getUTCDay();
        const sIsoDay = sJsDay === 0 ? 7 : sJsDay;
        const sStartStr = d.toISOString().slice(11, 16);
        const sBranch = s.branchId || 'default';
        return sIsoDay === isoDay && sStartStr === startTimeStr && sBranch === branchId;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const handleOpenAddForm = () => {
    setEditingGroupSchedules([]);
    setCancellingGroupSchedules([]);
    setError(null);
    setSuccessMsg(null);
    setIsRecurring(activeViewMode === 'BLOCKS');
    setIsAddFormOpen(true);
  };

  const handlePeriodChangeForAdd = (nextPeriod: 'AM' | 'PM') => {
    setSchPeriod(nextPeriod);
    const list = nextPeriod === 'AM' ? amSlots : pmSlots;
    if (list.length > 0) {
      setSchSlotValue(list[0].value);
    }
  };

  const handlePeriodChangeForEdit = (nextPeriod: 'AM' | 'PM') => {
    setEditPeriod(nextPeriod);
    const list = nextPeriod === 'AM' ? amSlots : pmSlots;
    if (list.length > 0) {
      setEditSlotValue(list[0].value);
    }
  };

  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const [slotStart, slotEnd] = schSlotValue.split('-');
    const [sH, sM] = slotStart.split(':').map(Number);
    const [eH, eM] = slotEnd.split(':').map(Number);
    const calculatedDuration = Math.max(15, eH * 60 + eM - (sH * 60 + sM));

    if (isRecurring) {
      if (!bulkStartDate || !bulkEndDate || bulkDaysOfWeek.length === 0) {
        setError('Selecciona el rango de fechas y al menos un día de la semana (ej. Viernes, Sábado)');
        return;
      }

      setIsSubmitting(true);
      try {
        const payload: BulkGenerateSchedulesPayload = {
          startDate: bulkStartDate,
          endDate: bulkEndDate,
          daysOfWeek: bulkDaysOfWeek,
          times: [slotStart],
          durationMinutes: calculatedDuration,
          classTypeId: classTypes[0]?.id || undefined,
          branchId: schBranchId || branches[0]?.id,
          capacity: Number(schCapacity),
          price: Number(schPrice),
        };

        const res = await schedulesApi.bulkGenerate(payload);
        const dayNames = bulkDaysOfWeek
          .slice()
          .sort((a, b) => a - b)
          .map((d) => DAY_NAMES_BY_ISO[d])
          .join(', ');
        setSuccessMsg(
          `¡Clases recurrentes agendadas (${dayNames}, ${formatSlotHumanLabel(
            slotStart,
            slotEnd,
            allConfiguredSlots,
          )})! Se programaron ${res.count} sesiones de ${calculatedDuration} minutos.`,
        );
        setIsAddFormOpen(false);
        await fetchAllData();
        onUpdated();
      } catch (err: any) {
        setError(err.message || 'Error al agendar las clases recurrentes');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!schDate) {
        setError('Selecciona el día para la clase en particular');
        return;
      }

      setIsSubmitting(true);
      try {
        const startDateTime = new Date(`${schDate}T${slotStart}:00.000Z`).toISOString();
        const endDateTime = new Date(`${schDate}T${slotEnd}:00.000Z`).toISOString();

        const payload: CreateSchedulePayload = {
          classTypeId: classTypes[0]?.id || undefined,
          branchId: schBranchId || branches[0]?.id || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          capacity: Number(schCapacity),
          price: Number(schPrice),
        };

        await schedulesApi.create(payload);
        setSuccessMsg(
          `¡Clase de Pilates agendada con éxito para el ${new Date(
            `${schDate}T12:00:00Z`,
          ).toLocaleDateString('es-CL', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
          })} (${formatSlotHumanLabel(slotStart, slotEnd, allConfiguredSlots)})!`,
        );
        setIsAddFormOpen(false);
        await fetchAllData();
        onUpdated();
      } catch (err: any) {
        setError(err.message || 'Error al agendar la clase en particular');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleOpenEditSchedule = (
    sch: ClassSchedule,
    groupSchedulesOverride?: ClassSchedule[],
    defaultScope: 'SINGLE_DATE' | 'ALL_RECURRING' = 'SINGLE_DATE',
  ) => {
    setCancellingGroupSchedules([]);
    setIsAddFormOpen(false);

    const group =
      groupSchedulesOverride && groupSchedulesOverride.length > 0
        ? groupSchedulesOverride
        : findSiblingSchedulesFor(sch);

    setEditingGroupSchedules(group);
    setEditScope(group.length > 1 ? defaultScope : 'SINGLE_DATE');
    setEditTargetScheduleId(sch.id);

    setEditBranchId(sch.branchId || branches[0]?.id || '');
    const startObj = new Date(sch.startTime);
    setEditDate(startObj.toISOString().split('T')[0]);

    const { period, slotValue } = resolveSlotFromTimes(sch.startTime, sch.endTime);
    setEditPeriod(period);
    setEditSlotValue(slotValue);

    setEditCapacity(sch.capacity);
    setEditPrice(Number(sch.price));
    setEditReason('');
    setEditNotifyTarget('ENROLLED');
    setError(null);
    setSuccessMsg(null);
  };

  const handleSelectTargetScheduleInEdit = (scheduleId: string) => {
    setEditTargetScheduleId(scheduleId);
    const found = editingGroupSchedules.find((s) => s.id === scheduleId);
    if (found) {
      setEditDate(new Date(found.startTime).toISOString().split('T')[0]);
      setEditBranchId(found.branchId || branches[0]?.id || '');
      const { period, slotValue } = resolveSlotFromTimes(found.startTime, found.endTime);
      setEditPeriod(period);
      setEditSlotValue(slotValue);
      setEditCapacity(found.capacity);
      setEditPrice(Number(found.price));
    }
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroupSchedules.length === 0) return;

    const [slotStart, slotEnd] = editSlotValue.split('-');

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingGroupSchedules.length > 1 && editScope === 'ALL_RECURRING') {
        const payload: BulkUpdateSchedulesPayload = {
          scheduleIds: editingGroupSchedules.map((s) => s.id),
          branchId: editBranchId || undefined,
          startTimeSlot: slotStart,
          endTimeSlot: slotEnd,
          capacity: Number(editCapacity),
          price: Number(editPrice),
          reason: editReason.trim() || undefined,
          notifyTarget: editNotifyTarget,
        };

        const res = await schedulesApi.bulkUpdate(payload);
        setSuccessMsg(
          `¡Bloque recurrente actualizado! Se modificaron las ${res.count} fechas programadas al nuevo horario (${formatSlotHumanLabel(
            slotStart,
            slotEnd,
            allConfiguredSlots,
          )}).`,
        );
      } else {
        const targetId = editTargetScheduleId || editingGroupSchedules[0].id;
        const startDateTime = new Date(`${editDate}T${slotStart}:00.000Z`).toISOString();
        const endDateTime = new Date(`${editDate}T${slotEnd}:00.000Z`).toISOString();

        const payload: UpdateSchedulePayload = {
          branchId: editBranchId || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          capacity: Number(editCapacity),
          price: Number(editPrice),
          reason: editReason.trim() || undefined,
          notifyTarget: editNotifyTarget,
        };

        await schedulesApi.update(targetId, payload);
        setSuccessMsg(
          editingGroupSchedules.length > 1
            ? 'Se modificó únicamente la fecha seleccionada sin alterar el resto de las clases recurrentes.'
            : 'Clase modificada con éxito y aviso enviado a los alumnos.',
        );
      }

      setEditingGroupSchedules([]);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al modificar la clase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCancelSchedule = (
    sch: ClassSchedule,
    groupSchedulesOverride?: ClassSchedule[],
    defaultScope: 'SINGLE_DATE' | 'ALL_RECURRING' = 'SINGLE_DATE',
  ) => {
    setEditingGroupSchedules([]);
    setIsAddFormOpen(false);

    const group =
      groupSchedulesOverride && groupSchedulesOverride.length > 0
        ? groupSchedulesOverride
        : findSiblingSchedulesFor(sch);

    setCancellingGroupSchedules(group);
    setCancelScope(group.length > 1 ? defaultScope : 'SINGLE_DATE');
    setCancelTargetScheduleId(sch.id);
    setCancelReason('');
    setCancelNotifyTarget('ALL_CLIENTS');
    setError(null);
    setSuccessMsg(null);
  };

  const handleConfirmCancelSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cancellingGroupSchedules.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (cancellingGroupSchedules.length > 1 && cancelScope === 'ALL_RECURRING') {
        const res = await schedulesApi.bulkCancel({
          scheduleIds: cancellingGroupSchedules.map((s) => s.id),
          reason: cancelReason.trim() || undefined,
          notifyTarget: cancelNotifyTarget,
        });
        setSuccessMsg(
          `Se suspendieron las ${res.count} fechas futuras del bloque recurrente y se notificó a los alumnos.`,
        );
      } else {
        const targetId = cancelTargetScheduleId || cancellingGroupSchedules[0].id;
        const payload: CancelSchedulePayload = {
          reason: cancelReason.trim() || undefined,
          notifyTarget: cancelNotifyTarget,
        };
        await schedulesApi.cancel(targetId, payload);
        setSuccessMsg(
          cancellingGroupSchedules.length > 1
            ? 'Se suspendió únicamente la fecha seleccionada. Las demás fechas recurrentes continúan activas.'
            : 'Clase suspendida y notificación enviada a los alumnos.',
        );
      }

      setCancellingGroupSchedules([]);
      await fetchAllData();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al suspender la clase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers para Gestión de Selectores de Horarios (AM / PM) ---

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const label =
        slotFormLabel.trim() || computeAutoLabel(slotFormStart, slotFormEnd, slotFormPeriod);

      if (editingSlotId) {
        await schedulesApi.updateTimeSlot(editingSlotId, {
          period: slotFormPeriod,
          startTime: slotFormStart,
          endTime: slotFormEnd,
          label,
        });
        setSuccessMsg(`Horario '${label}' actualizado en el selector.`);
      } else {
        const payload: CreateStudioTimeSlotPayload = {
          period: slotFormPeriod,
          startTime: slotFormStart,
          endTime: slotFormEnd,
          label,
        };
        await schedulesApi.createTimeSlot(payload);
        setSuccessMsg(`Nuevo horario '${label}' agregado al selector.`);
      }

      setEditingSlotId(null);
      setSlotFormLabel('');
      const slots = await schedulesApi.getTimeSlots();
      setCustomTimeSlots(slots);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el selector de horario');
    } finally {
      setSlotActionLoading(false);
    }
  };

  const handleStartEditSlot = (slot: StudioTimeSlot) => {
    setEditingSlotId(slot.id);
    setSlotFormPeriod(slot.period);
    setSlotFormStart(slot.startTime);
    setSlotFormEnd(slot.endTime);
    setSlotFormLabel(slot.label);
  };

  const handleCancelEditSlot = () => {
    setEditingSlotId(null);
    setSlotFormLabel('');
    if (slotFormPeriod === 'AM') {
      setSlotFormStart('09:00');
      setSlotFormEnd('10:30');
    } else {
      setSlotFormStart('18:00');
      setSlotFormEnd('19:30');
    }
  };

  const handleDeleteSlot = async (slotId: string, label: string) => {
    if (!window.confirm(`¿Estás seguro de quitar '${label}' de los selectores de agendamiento?`)) {
      return;
    }
    setSlotActionLoading(true);
    setError(null);
    try {
      await schedulesApi.deleteTimeSlot(slotId);
      setSuccessMsg(`Horario '${label}' retirado del selector.`);
      const slots = await schedulesApi.getTimeSlots();
      setCustomTimeSlots(slots);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el selector de horario');
    } finally {
      setSlotActionLoading(false);
    }
  };

  const handleResetDefaultSlots = async () => {
    if (
      !window.confirm(
        '¿Deseas restaurar todos los selectores de horario a los bloques estándar de 1 hora (8 a 12 AM y 12 a 22 PM)?',
      )
    ) {
      return;
    }
    setSlotActionLoading(true);
    setError(null);
    try {
      const slots = await schedulesApi.resetDefaultTimeSlots();
      setCustomTimeSlots(slots);
      setSuccessMsg('Se restauraron los selectores de horario por defecto.');
    } catch (err: any) {
      setError(err.message || 'Error al restaurar los selectores');
    } finally {
      setSlotActionLoading(false);
    }
  };

  const formatPrice = (p: number | string) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Number(p));
  };

  const formatScheduleDateLong = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  };

  const currentAddSlots = schPeriod === 'AM' ? amSlots : pmSlots;
  const currentEditSlots = editPeriod === 'AM' ? amSlots : pmSlots;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header con pestañas (Bloques Semanales, Por Fecha, y Ajustar Horarios AM/PM) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-sand-100 bg-[#faf9f6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center shadow-sm shrink-0">
              {activeViewMode === 'BLOCKS' ? (
                <CalendarPlus className="w-5 h-5" />
              ) : activeViewMode === 'UPCOMING' ? (
                <CalendarClock className="w-5 h-5" />
              ) : (
                <SlidersHorizontal className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#220622]">Control de Clases & Horarios</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#3a1b38] border border-purple-200">
                  Clases de Pilates
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Agenda clases recurrentes o puntuales, y personaliza libremente los horarios que se muestran en el selector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex items-center bg-sand-100 p-1 rounded-xl border border-sand-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveViewMode('BLOCKS')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeViewMode === 'BLOCKS'
                    ? 'bg-[#3a1b38] text-white shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Bloques ({weeklyBlocks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('UPCOMING')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeViewMode === 'UPCOMING'
                    ? 'bg-[#3a1b38] text-white shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Por Fecha ({upcomingSchedules.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('TIME_SLOTS')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeViewMode === 'TIME_SLOTS'
                    ? 'bg-[#3a1b38] text-white shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
                title="Configura los horarios que aparecen en el selector (ej. 9 a 10:30)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Ajustar Horarios</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Botón "+ Agregar Clase" (Visible en vistas de agenda) */}
        {activeViewMode !== 'TIME_SLOTS' && (
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
                    {slot === 'ALL' ? 'AM y PM' : `Jornada ${slot}`}
                  </button>
                ))}
              </div>

              {activeViewMode === 'UPCOMING' && (
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
              {!isAddFormOpen &&
                editingGroupSchedules.length === 0 &&
                cancellingGroupSchedules.length === 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAddForm}
                    className="px-4 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Clase</span>
                  </button>
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
        )}

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

          {/* ========================================================================= */}
          {/* 1. VISTA DE GESTIÓN DE SELECTORES DE HORARIOS (AM / PM)                     */}
          {/* ========================================================================= */}
          {activeViewMode === 'TIME_SLOTS' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50/60 rounded-2xl border border-purple-200">
                <div>
                  <h3 className="text-sm font-bold text-[#220622] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-[#3a1b38]" />
                    <span>Ajustar Selectores de Horarios (AM / PM)</span>
                  </h3>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Aquí defines exactamente qué horas aparecen en el desplegable de agendamiento. Si necesitas clases de 9:00 a 10:30 o quieres quitar horas que no uses, ajústalas aquí.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaultSlots}
                  disabled={slotActionLoading}
                  className="px-3 py-1.5 rounded-xl border border-sand-300 bg-white hover:bg-sand-50 text-charcoal text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sage-600" />
                  <span>Restaurar por defecto</span>
                </button>
              </div>

              {/* Formulario para Agregar o Editar un Horario en el Selector */}
              <form
                onSubmit={handleSaveSlot}
                className="p-4 bg-white rounded-2xl border border-sand-200 shadow-sm space-y-3.5 text-xs"
              >
                <div className="flex items-center justify-between border-b border-sand-100 pb-2">
                  <h4 className="font-bold text-charcoal flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{editingSlotId ? 'Editar Horario del Selector' : 'Agregar Nuevo Tramo Horario'}</span>
                  </h4>
                  {editingSlotId && (
                    <button
                      type="button"
                      onClick={handleCancelEditSlot}
                      className="text-charcoal-muted hover:text-charcoal font-bold"
                    >
                      ✕ Cancelar edición
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-charcoal mb-1">Jornada *</label>
                    <div className="flex bg-sand-100 p-1 rounded-xl border border-sand-200">
                      {(['AM', 'PM'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSlotFormPeriod(p)}
                          className={`flex-1 py-1 rounded-lg font-bold transition text-xs ${
                            slotFormPeriod === p
                              ? 'bg-[#3a1b38] text-white'
                              : 'text-charcoal-muted hover:text-charcoal'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-charcoal mb-1">Hora Inicio *</label>
                    <input
                      type="time"
                      value={slotFormStart}
                      onChange={(e) => {
                        setSlotFormStart(e.target.value);
                        if (!slotFormLabel) {
                          setSlotFormLabel(computeAutoLabel(e.target.value, slotFormEnd, slotFormPeriod));
                        }
                      }}
                      required
                      className="w-full px-3 py-2 bg-sand-50 border border-sand-300 rounded-xl font-mono text-charcoal font-semibold focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-charcoal mb-1">Hora Fin *</label>
                    <input
                      type="time"
                      value={slotFormEnd}
                      onChange={(e) => {
                        setSlotFormEnd(e.target.value);
                        if (!slotFormLabel) {
                          setSlotFormLabel(computeAutoLabel(slotFormStart, e.target.value, slotFormPeriod));
                        }
                      }}
                      required
                      className="w-full px-3 py-2 bg-sand-50 border border-sand-300 rounded-xl font-mono text-charcoal font-semibold focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-charcoal mb-1">Texto en el Selector (Opcional)</label>
                    <input
                      type="text"
                      value={slotFormLabel}
                      onChange={(e) => setSlotFormLabel(e.target.value)}
                      placeholder={computeAutoLabel(slotFormStart, slotFormEnd, slotFormPeriod)}
                      className="w-full px-3 py-2 bg-sand-50 border border-sand-300 rounded-xl text-charcoal focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-sand-100">
                  <div className="text-[11px] text-charcoal-muted">
                    Vista previa: <strong className="text-[#3a1b38]">{slotFormLabel || computeAutoLabel(slotFormStart, slotFormEnd, slotFormPeriod)}</strong>
                  </div>
                  <button
                    type="submit"
                    disabled={slotActionLoading}
                    className="px-4 py-2 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    {slotActionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{editingSlotId ? 'Guardar Cambios' : 'Agregar al Selector'}</span>
                  </button>
                </div>
              </form>

              {/* 2 Columnas de Horarios Configurados (AM vs PM) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna AM */}
                <div className="p-4 bg-white rounded-2xl border border-sand-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-sand-100 pb-2">
                    <span className="font-bold text-xs text-[#220622] flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        AM
                      </span>
                      <span>Horarios Mañana ({amSlots.length})</span>
                    </span>
                    <span className="text-[11px] text-charcoal-muted">Aparecen al elegir AM</span>
                  </div>

                  <div className="space-y-2">
                    {amSlots.map((slot) => {
                      const [sH, sM] = slot.start.split(':').map(Number);
                      const [eH, eM] = slot.end.split(':').map(Number);
                      const dur = Math.max(15, eH * 60 + eM - (sH * 60 + sM));
                      const customMatch = customTimeSlots.find(
                        (c) => c.period === 'AM' && c.startTime === slot.start && c.endTime === slot.end,
                      );

                      return (
                        <div
                          key={slot.value}
                          className="p-2.5 rounded-xl border border-sand-200 bg-sand-50/50 hover:bg-white transition flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-charcoal block">{slot.label}</span>
                            <span className="text-[11px] text-charcoal-muted font-mono">
                              {slot.start} - {slot.end} hrs · {dur} min
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {customMatch && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSlot(customMatch)}
                                  className="p-1.5 rounded-lg bg-white border border-sand-200 text-charcoal-muted hover:text-[#3a1b38] hover:bg-purple-50 transition"
                                  title="Editar este horario"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(customMatch.id, customMatch.label)}
                                  className="p-1.5 rounded-lg bg-white border border-sand-200 text-charcoal-muted hover:text-red-700 hover:bg-red-50 transition"
                                  title="Quitar este horario del selector"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Columna PM */}
                <div className="p-4 bg-white rounded-2xl border border-sand-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-sand-100 pb-2">
                    <span className="font-bold text-xs text-[#220622] flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#3a1b38]">
                        PM
                      </span>
                      <span>Horarios Tarde ({pmSlots.length})</span>
                    </span>
                    <span className="text-[11px] text-charcoal-muted">Aparecen al elegir PM</span>
                  </div>

                  <div className="space-y-2">
                    {pmSlots.map((slot) => {
                      const [sH, sM] = slot.start.split(':').map(Number);
                      const [eH, eM] = slot.end.split(':').map(Number);
                      const dur = Math.max(15, eH * 60 + eM - (sH * 60 + sM));
                      const customMatch = customTimeSlots.find(
                        (c) => c.period === 'PM' && c.startTime === slot.start && c.endTime === slot.end,
                      );

                      return (
                        <div
                          key={slot.value}
                          className="p-2.5 rounded-xl border border-sand-200 bg-sand-50/50 hover:bg-white transition flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-charcoal block">{slot.label}</span>
                            <span className="text-[11px] text-charcoal-muted font-mono">
                              {slot.start} - {slot.end} hrs · {dur} min
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {customMatch && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSlot(customMatch)}
                                  className="p-1.5 rounded-lg bg-white border border-sand-200 text-charcoal-muted hover:text-[#3a1b38] hover:bg-purple-50 transition"
                                  title="Editar este horario"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(customMatch.id, customMatch.label)}
                                  className="p-1.5 rounded-lg bg-white border border-sand-200 text-charcoal-muted hover:text-red-700 hover:bg-red-50 transition"
                                  title="Quitar este horario del selector"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. FORMULARIO PARA AGREGAR CLASE                                          */}
          {/* ========================================================================= */}
          {activeViewMode !== 'TIME_SLOTS' && isAddFormOpen && (
            <form
              onSubmit={handleAddClassSubmit}
              className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4 animate-in fade-in text-xs shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-purple-200">
                <div>
                  <h3 className="font-bold text-[#220622] text-sm">Agregar Clase de Pilates</h3>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    Elige si deseas programar clases recurrentes (ej. Viernes y Sábados) o una clase en particular en una fecha única.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="text-charcoal-muted hover:text-charcoal font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>

              {/* Dos Botones con Descripción: Clase Recurrente vs Clase en Particular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 bg-white rounded-2xl border border-purple-200/80">
                <button
                  type="button"
                  onClick={() => setIsRecurring(true)}
                  className={`p-3 rounded-xl text-left transition flex items-start gap-3 border ${
                    isRecurring
                      ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-xs'
                      : 'bg-transparent text-charcoal hover:bg-sand-50 border-transparent'
                  }`}
                >
                  <Repeat
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isRecurring ? 'text-amber-300' : 'text-[#3a1b38]'
                    }`}
                  />
                  <div>
                    <span className="font-bold block text-xs">
                      Clase Recurrente (Ej. Viernes y Sábados)
                    </span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        isRecurring ? 'text-rose-100/80' : 'text-charcoal-muted'
                      }`}
                    >
                      Se repite semanalmente en los días y rango de fechas que selecciones
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRecurring(false)}
                  className={`p-3 rounded-xl text-left transition flex items-start gap-3 border ${
                    !isRecurring
                      ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-xs'
                      : 'bg-transparent text-charcoal hover:bg-sand-50 border-transparent'
                  }`}
                >
                  <CalendarDays
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      !isRecurring ? 'text-amber-300' : 'text-[#d92676]'
                    }`}
                  />
                  <div>
                    <span className="font-bold block text-xs">
                      Clase en Particular (Un día específico)
                    </span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        !isRecurring ? 'text-rose-100/80' : 'text-charcoal-muted'
                      }`}
                    >
                      Agrega una sesión puntual indicando día, horario, cantidad y tarifa
                    </span>
                  </div>
                </button>
              </div>

              {/* Campos del Formulario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-charcoal mb-1">Sede *</label>
                  <select
                    value={schBranchId}
                    onChange={(e) => setSchBranchId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!isRecurring && (
                  <div>
                    <label className="block font-bold text-charcoal mb-1">
                      Día de la Clase (Fecha) *
                    </label>
                    <input
                      type="date"
                      value={schDate}
                      onChange={(e) => setSchDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>
                )}

                {/* Selector de Jornada (AM / PM) + Select de Horarios Configurables */}
                <div className={isRecurring ? 'sm:col-span-2' : 'sm:col-span-1'}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-charcoal">
                      Horario de la Clase ({schPeriod}) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveViewMode('TIME_SLOTS')}
                      className="text-[11px] font-bold text-[#3a1b38] hover:underline flex items-center gap-1"
                      title="Abrir panel para ajustar qué horarios aparecen en el selector"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Ajustar horarios AM/PM</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white border border-sand-300 rounded-xl p-0.5 shrink-0">
                      {(['AM', 'PM'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePeriodChangeForAdd(p)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition ${
                            schPeriod === p
                              ? 'bg-[#3a1b38] text-white'
                              : 'text-charcoal-muted hover:text-charcoal'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <select
                      value={schSlotValue}
                      onChange={(e) => setSchSlotValue(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl font-semibold text-charcoal focus:outline-none focus:border-[#3a1b38]"
                    >
                      {currentAddSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
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
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal mb-1">
                    Tarifa por Clase (CLP) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={schPrice}
                    onChange={(e) => setSchPrice(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                  />
                </div>

                {isRecurring && (
                  <>
                    <div>
                      <label className="block font-bold text-charcoal mb-1">Desde Fecha *</label>
                      <input
                        type="date"
                        value={bulkStartDate}
                        onChange={(e) => setBulkStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-charcoal mb-1">Hasta Fecha *</label>
                      <input
                        type="date"
                        value={bulkEndDate}
                        onChange={(e) => setBulkEndDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-[#3a1b38]"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-3 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="block font-bold text-charcoal">
                          Días de la Semana en que se imparte la clase recurrente: *
                        </label>
                        <button
                          type="button"
                          onClick={() => setBulkDaysOfWeek([5, 6])}
                          className="text-[11px] font-bold text-[#3a1b38] hover:underline"
                        >
                          Seleccionar Viernes y Sábado
                        </button>
                      </div>
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
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="px-3.5 py-2 text-charcoal-muted hover:text-charcoal font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (isRecurring && bulkDaysOfWeek.length === 0)}
                  className="px-5 py-2.5 bg-[#3a1b38] hover:bg-[#261025] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isRecurring ? 'Guardar Clases Recurrentes' : 'Guardar Clase en Particular'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 3. FORMULARIO EDITAR CLASE (SOLO ESTA FECHA VS RECURRENTE)                */}
          {/* ========================================================================= */}
          {activeViewMode !== 'TIME_SLOTS' && editingGroupSchedules.length > 0 && (
            <form
              onSubmit={handleUpdateSchedule}
              className="p-5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-4 animate-in fade-in text-xs shadow-sm"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-purple-200">
                <div>
                  <h3 className="font-bold text-[#3a1b38] text-sm">
                    Editar Clase de Pilates (Horario, Sede, Cupos o Tarifa)
                  </h3>
                  <p className="text-[11px] text-charcoal-muted">
                    {editingGroupSchedules.length > 1
                      ? 'Esta clase pertenece a una serie recurrente. Elige si deseas aplicar el cambio solo a una fecha puntual o a todas las fechas futuras.'
                      : 'Actualiza los datos de esta clase en particular y notifica a los alumnos.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGroupSchedules([])}
                  className="text-charcoal-muted hover:text-charcoal font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>

              {editingGroupSchedules.length > 1 && (
                <div className="space-y-2.5 p-3.5 bg-white rounded-2xl border border-purple-200">
                  <label className="block font-bold text-[#220622]">
                    ¿A qué clases deseas aplicar esta modificación? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditScope('SINGLE_DATE')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        editScope === 'SINGLE_DATE'
                          ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-xs'
                          : 'bg-sand-50/60 text-charcoal hover:bg-sand-100 border-sand-200'
                      }`}
                    >
                      <CalendarDays
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          editScope === 'SINGLE_DATE' ? 'text-amber-300' : 'text-[#d92676]'
                        }`}
                      />
                      <div>
                        <span className="font-bold block">Solo una fecha en particular (Excepción)</span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            editScope === 'SINGLE_DATE' ? 'text-rose-100/80' : 'text-charcoal-muted'
                          }`}
                        >
                          Modifica únicamente el día elegido sin cambiar las demás clases recurrentes
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditScope('ALL_RECURRING')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        editScope === 'ALL_RECURRING'
                          ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-xs'
                          : 'bg-sand-50/60 text-charcoal hover:bg-sand-100 border-sand-200'
                      }`}
                    >
                      <Repeat
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          editScope === 'ALL_RECURRING' ? 'text-amber-300' : 'text-[#3a1b38]'
                        }`}
                      />
                      <div>
                        <span className="font-bold block">
                          Todas las fechas recurrentes ({editingGroupSchedules.length} sesiones)
                        </span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            editScope === 'ALL_RECURRING' ? 'text-rose-100/80' : 'text-charcoal-muted'
                          }`}
                        >
                          Reemplaza el horario/sede en todas las fechas del bloque sin duplicar
                        </span>
                      </div>
                    </button>
                  </div>

                  {editScope === 'SINGLE_DATE' && (
                    <div className="pt-2">
                      <label className="block font-bold text-charcoal mb-1">
                        Selecciona la fecha de la serie que tiene el cambio puntual:
                      </label>
                      <select
                        value={editTargetScheduleId}
                        onChange={(e) => handleSelectTargetScheduleInEdit(e.target.value)}
                        className="w-full px-3 py-2 bg-sand-50 border border-sand-300 rounded-xl font-semibold text-charcoal focus:outline-none focus:border-[#3a1b38] capitalize"
                      >
                        {editingGroupSchedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatScheduleDateLong(s.startTime)} · {s.startTime.slice(11, 16)} -{' '}
                            {s.endTime.slice(11, 16)} hrs
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
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

                {(editingGroupSchedules.length === 1 || editScope === 'SINGLE_DATE') && (
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">
                      Día de la Clase (Fecha) *
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                    />
                  </div>
                )}

                <div
                  className={
                    editingGroupSchedules.length > 1 && editScope === 'ALL_RECURRING'
                      ? 'sm:col-span-2'
                      : 'sm:col-span-1'
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-charcoal">Nuevo Horario ({editPeriod}) *</label>
                    <button
                      type="button"
                      onClick={() => setActiveViewMode('TIME_SLOTS')}
                      className="text-[11px] font-bold text-[#3a1b38] hover:underline flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Ajustar horarios</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white border border-sand-300 rounded-xl p-0.5 shrink-0">
                      {(['AM', 'PM'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePeriodChangeForEdit(p)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition ${
                            editPeriod === p
                              ? 'bg-[#3a1b38] text-white'
                              : 'text-charcoal-muted hover:text-charcoal'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <select
                      value={editSlotValue}
                      onChange={(e) => setEditSlotValue(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl font-semibold text-charcoal"
                    >
                      {currentEditSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Cantidad Máx. Alumnos</label>
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
                    onChange={(e) => setEditNotifyTarget(e.target.value as 'ENROLLED' | 'ALL_CLIENTS')}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  >
                    <option value="ENROLLED">Solo alumnos inscritos</option>
                    <option value="ALL_CLIENTS">Aviso general a todos los alumnos</option>
                  </select>
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block font-semibold text-charcoal mb-1">
                    Motivo del Cambio (Se incluirá en la notificación)
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Ej. Por inconveniente puntual se ajusta el horario de esta sesión..."
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => setEditingGroupSchedules([])}
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
                  <span>
                    {editingGroupSchedules.length > 1 && editScope === 'ALL_RECURRING'
                      ? `Actualizar las ${editingGroupSchedules.length} Fechas del Bloque`
                      : 'Guardar Cambio en Esta Fecha'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 4. FORMULARIO SUSPENDER / ELIMINAR CLASE                                  */}
          {/* ========================================================================= */}
          {activeViewMode !== 'TIME_SLOTS' && cancellingGroupSchedules.length > 0 && (
            <form
              onSubmit={handleConfirmCancelSchedule}
              className="p-5 bg-red-50/80 rounded-2xl border border-red-200 space-y-4 animate-in fade-in text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-red-200">
                <div>
                  <h3 className="font-bold text-red-900 text-sm">Suspender / Eliminar Clase de Pilates</h3>
                  <p className="text-[11px] text-red-800/80">
                    {cancellingGroupSchedules.length > 1
                      ? 'Puedes suspender únicamente una fecha en particular (dejando activas las demás fechas recurrentes) o suspender todo el bloque.'
                      : 'La clase quedará registrada como Suspendida / Cancelada en el Historial y se avisará a los alumnos.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCancellingGroupSchedules([])}
                  className="text-red-700 hover:text-red-900 font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>

              {cancellingGroupSchedules.length > 1 && (
                <div className="space-y-2.5 p-3.5 bg-white rounded-2xl border border-red-200">
                  <label className="block font-bold text-red-950">¿Qué deseas suspender? *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCancelScope('SINGLE_DATE')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        cancelScope === 'SINGLE_DATE'
                          ? 'bg-red-700 text-white border-red-700 shadow-xs'
                          : 'bg-red-50/40 text-charcoal hover:bg-red-50 border-red-200'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Solo una fecha en particular</span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            cancelScope === 'SINGLE_DATE' ? 'text-red-100' : 'text-charcoal-muted'
                          }`}
                        >
                          Suspende solo el día elegido; el resto de las clases recurrentes siguen activas
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCancelScope('ALL_RECURRING')}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        cancelScope === 'ALL_RECURRING'
                          ? 'bg-red-700 text-white border-red-700 shadow-xs'
                          : 'bg-red-50/40 text-charcoal hover:bg-red-50 border-red-200'
                      }`}
                    >
                      <Repeat className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">
                          Todo el bloque recurrente ({cancellingGroupSchedules.length} fechas)
                        </span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            cancelScope === 'ALL_RECURRING' ? 'text-red-100' : 'text-charcoal-muted'
                          }`}
                        >
                          Suspende todas las fechas futuras programadas de este bloque horario
                        </span>
                      </div>
                    </button>
                  </div>

                  {cancelScope === 'SINGLE_DATE' && (
                    <div className="pt-2">
                      <label className="block font-bold text-red-950 mb-1">
                        Selecciona la fecha específica a suspender:
                      </label>
                      <select
                        value={cancelTargetScheduleId}
                        onChange={(e) => setCancelTargetScheduleId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl font-semibold text-charcoal capitalize"
                      >
                        {cancellingGroupSchedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatScheduleDateLong(s.startTime)} · {s.startTime.slice(11, 16)} -{' '}
                            {s.endTime.slice(11, 16)} hrs
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-red-950 mb-1">
                    Alcance de la Notificación *
                  </label>
                  <select
                    value={cancelNotifyTarget}
                    onChange={(e) => setCancelNotifyTarget(e.target.value as 'ENROLLED' | 'ALL_CLIENTS')}
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl focus:outline-none"
                  >
                    <option value="ALL_CLIENTS">Notificación General a todos los alumnos activos</option>
                    <option value="ENROLLED">Solo a los alumnos inscritos en la fecha</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-red-950 mb-1">Motivo de Suspensión *</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ej. Este viernes no habrá clases por compromiso administrativo..."
                    required
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200">
                <button
                  type="button"
                  onClick={() => setCancellingGroupSchedules([])}
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
                  <span>
                    {cancellingGroupSchedules.length > 1 && cancelScope === 'ALL_RECURRING'
                      ? `Suspender las ${cancellingGroupSchedules.length} Fechas`
                      : 'Confirmar Suspensión de Fecha'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 5. LISTADOS: 'BLOCKS' (BLOQUES) VS 'UPCOMING' (FECHAS)                    */}
          {/* ========================================================================= */}
          {activeViewMode === 'TIME_SLOTS' ? null : loading ? (
            <div className="flex items-center justify-center py-12 text-sage-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : activeViewMode === 'BLOCKS' ? (
            weeklyBlocks.length === 0 ? (
              <div className="text-center py-12 text-charcoal-muted">
                <CalendarPlus className="w-10 h-10 mx-auto text-sage-400 mb-2" />
                <p className="text-sm font-semibold text-charcoal">
                  No hay clases configuradas para este filtro
                </p>
                <p className="text-xs mt-1">
                  Usa el botón superior "Agregar Clase" para programar clases recurrentes o una clase en particular.
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#3a1b38] text-white shadow-2xs">
                            Clase {block.dayLabel} {block.amPm}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              block.sessionsCount > 1
                                ? 'bg-purple-50 text-[#3a1b38] border-purple-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {block.sessionsCount > 1
                              ? `Recurrente (${block.sessionsCount} fechas)`
                              : 'Clase Puntual (1 fecha)'}
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
                            {formatSlotHumanLabel(block.startTimeStr, block.endTimeStr, allConfiguredSlots)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            Máx. {block.capacity} alumnos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-sand-200/80 flex items-center justify-between text-[11px] text-charcoal-muted gap-2">
                      <span className="truncate">
                        {block.sessionsCount === 1
                          ? formatScheduleDateLong(block.sampleSchedule.startTime)
                          : `${block.sessionsCount} sesiones activas en agenda`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenEditSchedule(
                              block.sampleSchedule,
                              block.schedules,
                              block.sessionsCount > 1 ? 'ALL_RECURRING' : 'SINGLE_DATE',
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-[#3a1b38] border border-purple-200 font-bold transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenCancelSchedule(block.sampleSchedule, block.schedules, 'SINGLE_DATE')
                          }
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold transition flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Suspender</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : upcomingSchedules.length === 0 ? (
            <div className="text-center py-12 text-charcoal-muted">
              <Calendar className="w-10 h-10 mx-auto text-sage-400 mb-2" />
              <p className="text-sm font-semibold text-charcoal">
                No hay clases programadas para los filtros seleccionados
              </p>
              <p className="text-xs mt-1">
                Usa el botón superior "Agregar Clase" para agendar sesiones recurrentes o una fecha en particular.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingSchedules.map((sch) => {
                const startHour = new Date(sch.startTime).getUTCHours();
                const isMorning = startHour < 12;
                const enrolled = Math.max(0, sch.capacity - sch.availableSlots);
                const startStr = new Date(sch.startTime).toISOString().slice(11, 16);
                const endStr = new Date(sch.endTime).toISOString().slice(11, 16);
                const siblings = findSiblingSchedulesFor(sch);

                return (
                  <div
                    key={sch.id}
                    className="p-3.5 rounded-xl border border-sand-200 bg-sand-50/30 hover:bg-white hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-sage-900 capitalize">
                          {formatScheduleDateLong(sch.startTime)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#3a1b38] border border-purple-200">
                          {isMorning ? 'Jornada AM' : 'Jornada PM'}
                        </span>
                        {siblings.length > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sand-100 text-charcoal-muted border border-sand-200">
                            Serie Recurrente
                          </span>
                        )}
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
                          <span>{formatSlotHumanLabel(startStr, endStr, allConfiguredSlots)}</span>
                        </div>

                        <span className="text-[11px]">
                          Clase de Pilates · Máx. {sch.capacity} alumnos ({sch.availableSlots} libres)
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
                            onClick={() => handleOpenEditSchedule(sch, siblings, 'SINGLE_DATE')}
                            className="px-2.5 py-1.5 text-xs border border-purple-200 bg-purple-50 text-[#3a1b38] hover:bg-purple-100 rounded-lg transition flex items-center gap-1 font-semibold"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCancelSchedule(sch, siblings, 'SINGLE_DATE')}
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
          )}
        </div>
      </div>
    </div>
  );
};
