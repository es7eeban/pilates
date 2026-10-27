import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  MapPin,
  Star,
  Users,
  X,
  Settings,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import type { ClassSchedule, Branch, Booking } from '../types/schedule';
import { schedulesApi, branchesApi, bookingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WaitlistJoinModal } from './WaitlistJoinModal';

interface ScheduleCatalogProps {
  onRequestLogin: () => void;
  onSelectSchedule: (schedule: ClassSchedule, existingBooking?: Booking | null) => void;
  onOpenAccount?: () => void;
  onManageSchedule?: (schedule: ClassSchedule) => void;
  myBookings?: Booking[];
}

const PAGE_SIZE = 6;

export const ScheduleCatalog: React.FC<ScheduleCatalogProps> = ({
  onRequestLogin,
  onSelectSchedule,
  onOpenAccount,
  onManageSchedule,
  myBookings: initialMyBookings,
}) => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>(initialMyBookings || []);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'all' | 'AM' | 'PM'>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [waitlistModalSchedule, setWaitlistModalSchedule] = useState<ClassSchedule | null>(null);

  // Sincronizar reservas si se reciben por prop
  useEffect(() => {
    if (initialMyBookings) {
      setUserBookings(initialMyBookings);
    }
  }, [initialMyBookings]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchesData, schedData, myBookingsData] = await Promise.all([
        branchesApi.getAll(),
        schedulesApi.getAll({
          onlyAvailable: onlyAvailable || undefined,
        }),
        isAuthenticated && !isAdmin
          ? bookingsApi.getMyBookings().catch(() => [] as Booking[])
          : Promise.resolve([] as Booking[]),
      ]);
      setBranches(branchesData);
      setSchedules(schedData);
      if (isAuthenticated && !isAdmin && myBookingsData.length > 0) {
        setUserBookings(myBookingsData);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la agenda de sesiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [onlyAvailable]);

  // Al cambiar cualquier filtro, reiniciar la página a 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranchId, selectedDate, selectedTimeOfDay, onlyAvailable]);

  // Sede Favorita para perfil Alumno
  const favoriteBranchId = !isAdmin ? user?.favoriteBranchId || null : null;
  const favoriteBranchObj = useMemo(() => {
    if (!favoriteBranchId || isAdmin) return null;
    return user?.favoriteBranch || branches.find((b) => b.id === favoriteBranchId) || null;
  }, [favoriteBranchId, isAdmin, user?.favoriteBranch, branches]);

  // Filtrado robusto por Sede, Horario (AM/PM) y Día de Calendario
  const filteredSchedules = useMemo(() => {
    const now = new Date();

    return schedules.filter((s) => {
      // 1. Filtro por Día del Calendario
      if (selectedDate !== 'all') {
        const rawDate = (s.startTime || '').slice(0, 10);
        const isoDate = new Date(s.startTime).toISOString().slice(0, 10);
        if (rawDate !== selectedDate && isoDate !== selectedDate) {
          return false;
        }
      } else {
        // En vista general ("Todos los días"), excluir sesiones ya finalizadas
        if (new Date(s.endTime) < now) return false;
      }

      // 2. Filtro por Horario AM / PM
      if (selectedTimeOfDay !== 'all') {
        const hour = new Date(s.startTime).getUTCHours();
        if (selectedTimeOfDay === 'AM' && hour >= 12) return false;
        if (selectedTimeOfDay === 'PM' && hour < 12) return false;
      }

      // 3. Filtro por Sede
      if (selectedBranchId !== 'all') {
        if (s.branchId !== selectedBranchId) return false;
      }

      // 4. Solo con cupos disponibles si está activado
      if (onlyAvailable && s.availableSlots <= 0) {
        return false;
      }

      return true;
    });
  }, [schedules, selectedDate, selectedTimeOfDay, selectedBranchId, onlyAvailable]);

  // Paginación: 6 clases por página
  const totalPages = Math.ceil(filteredSchedules.length / PAGE_SIZE) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSchedules.slice(start, start + PAGE_SIZE);
  }, [filteredSchedules, currentPage]);

  const hasActiveFilters =
    selectedBranchId !== 'all' ||
    selectedDate !== 'all' ||
    selectedTimeOfDay !== 'all' ||
    onlyAvailable;

  const handleResetFilters = () => {
    setSelectedBranchId('all');
    setSelectedDate('all');
    setSelectedTimeOfDay('all');
    setOnlyAvailable(false);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const getAmPmLabel = (isoString: string) => {
    const hour = new Date(isoString).getUTCHours();
    return hour < 12 ? 'Jornada AM' : 'Jornada PM';
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  };

  const formatPrice = (price: number | string) => {
    const num = Number(price);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const renderScheduleCard = (schedule: ClassSchedule, highlightFavorite = false) => {
    const isFull = schedule.availableSlots <= 0;
    const isLow = schedule.availableSlots > 0 && schedule.availableSlots <= 2;
    const enrolledCount = Math.max(0, schedule.capacity - schedule.availableSlots);

    // Verificar si el alumno ya tiene una reserva activa para esta sesión
    const userBooking = userBookings.find(
      (b) =>
        b.scheduleId === schedule.id &&
        ['CONFIRMADA', 'PENDIENTE_VALIDACION', 'PENDIENTE_PAGO'].includes(b.status),
    );

    const isConfirmed = userBooking?.status === 'CONFIRMADA';

    return (
      <div
        key={schedule.id}
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group ${
          userBooking
            ? isConfirmed
              ? 'border-emerald-300 ring-2 ring-emerald-500/30'
              : 'border-amber-300 ring-2 ring-amber-500/30'
            : highlightFavorite
              ? 'border-purple-200 ring-1 ring-purple-100'
              : 'border-sand-200'
        }`}
      >
        <div className="p-5">
          {/* Sede & Aforo / Estado de Reserva */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                highlightFavorite
                  ? 'bg-purple-50 text-[#3a1b38] border-purple-200'
                  : 'bg-sage-50 text-sage-800 border-sage-200'
              }`}
            >
              {highlightFavorite ? (
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              ) : (
                <MapPin className="w-3 h-3 text-sage-600" />
              )}
              {schedule.branch?.name || 'Sede Central'}
            </span>

            {userBooking ? (
              isConfirmed ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Clase Confirmada
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3 text-amber-600" /> En Espera
                </span>
              )
            ) : isFull ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Users className="w-3 h-3" />{' '}
                {isAdmin ? `Completo (${schedule.capacity}/${schedule.capacity})` : 'Agotado · Sobrecupo'}
              </span>
            ) : isLow ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                ¡Últimos {schedule.availableSlots} cupos!
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {schedule.availableSlots} de {schedule.capacity} cupos libres
              </span>
            )}
          </div>

          {/* Fecha */}
          <span className="text-xs font-bold text-[#3a1b38] uppercase tracking-wide capitalize block">
            {formatDate(schedule.startTime)}
          </span>

          {/* Título de la Clase */}
          <h3 className="font-bold text-base text-charcoal mt-1">
            {schedule.classType?.title || 'Sesión de Pilates'} · {schedule.branch?.name || 'Estudio'}
          </h3>

          {/* Detalles de Horario AM / PM */}
          <div className="mt-3.5 pt-3 border-t border-sand-100 space-y-2 text-xs text-charcoal-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sage-600" />
                <span className="font-bold text-charcoal font-mono">
                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)} hrs
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sand-100 text-charcoal">
                {getAmPmLabel(schedule.startTime)}
              </span>
            </div>

            {schedule.branch?.address && (
              <div className="flex items-center gap-1.5 text-[11px] text-charcoal-muted truncate">
                <MapPin className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                <span className="truncate">{schedule.branch.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pie de tarjeta: Acción para Alumno vs Indicador de Ocupación para Admin */}
        <div className="px-5 py-3.5 bg-sand-50/60 border-t border-sand-100 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-base text-sage-900 font-mono">
            {formatPrice(schedule.price)}
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-[#3a1b38] border border-purple-200 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {enrolledCount} / {schedule.capacity} agendados
              </span>
              {onManageSchedule && (
                <button
                  type="button"
                  onClick={() => onManageSchedule(schedule)}
                  className="px-3 py-1.5 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1"
                  title="Ver nómina de alumnos de esta sesión"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Ver Nómina</span>
                </button>
              )}
            </div>
          ) : userBooking ? (
            /* Alumno ya reservó esta clase: abrir modal de confirmación con estado e información */
            <button
              type="button"
              onClick={() => onSelectSchedule(schedule, userBooking)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                isConfirmed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              title="Ver confirmación y detalles de tu reserva"
            >
              {isConfirmed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ver Confirmación</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>En Espera de Confirmación</span>
                </>
              )}
            </button>
          ) : isFull ? (
            !isAuthenticated ? (
              <button
                onClick={onRequestLogin}
                className="px-3.5 py-2 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sobrecupo</span>
              </button>
            ) : (
              <button
                onClick={() => setWaitlistModalSchedule(schedule)}
                className="px-3.5 py-2 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Unirse a Sobrecupo</span>
              </button>
            )
          ) : !isAuthenticated ? (
            <button
              onClick={onRequestLogin}
              className="px-4 py-2 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-semibold rounded-xl transition shadow-sm"
            >
              Reservar Clase
            </button>
          ) : (
            <button
              onClick={() => onSelectSchedule(schedule, null)}
              className="px-4 py-2 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-semibold rounded-xl transition shadow-sm"
            >
              Reservar Clase
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-6 space-y-6">
      {/* BARRA DE FILTROS: SEDE + HORARIO (AM/PM) + CALENDARIO */}
      <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sand-100">
          <div>
            <h2 className="text-lg font-bold text-sage-900">
              {isAdmin ? 'Monitoreo de Agenda de Clases en Vivo' : 'Agenda de Clases en Vivo'}
            </h2>
            <p className="text-xs text-charcoal-muted">
              {isAdmin
                ? 'Consulta el estado de ocupación de las sesiones agendadas por sede, horario (AM / PM) o día'
                : 'Filtra las sesiones disponibles por sede, jornada horaria (AM / PM) o elige un día en el calendario'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-sand-100 hover:bg-sand-200 text-charcoal text-xs font-semibold rounded-xl transition flex items-center gap-1 border border-sand-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchData}
              title="Actualizar agenda"
              className="p-2 bg-sand-50 hover:bg-sand-100 border border-sand-200 rounded-xl text-charcoal-muted hover:text-charcoal transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Filtro por Sede */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-muted mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#3a1b38]" />
              <span>1. Filtrar por Sede</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-sand-50 border border-sand-200 rounded-xl text-charcoal focus:outline-none focus:border-[#3a1b38] cursor-pointer"
              aria-label="Filtrar por sede"
            >
              <option value="all">Todas las Sedes ({branches.length})</option>
              {favoriteBranchObj && (
                <option value={favoriteBranchObj.id}>
                  ⭐ Mi Sede: {favoriteBranchObj.name}
                </option>
              )}
              {branches
                .filter((b) => b.id !== favoriteBranchObj?.id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.commune ? `· ${b.commune}` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* 2. Filtro por Horario (AM / PM) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-muted mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#3a1b38]" />
              <span>2. Horario (AM / PM)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'AM', label: 'AM' },
                { id: 'PM', label: 'PM' },
              ].map((slot) => {
                const active = selectedTimeOfDay === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedTimeOfDay(slot.id as 'all' | 'AM' | 'PM')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      active
                        ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-xs'
                        : 'bg-sand-50 text-charcoal hover:bg-sand-100 border-sand-200'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Filtro por Día del Calendario */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#3a1b38]" />
                <span>3. Día en Calendario</span>
              </label>
              {selectedDate !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('all')}
                  className="text-[11px] font-bold text-[#3a1b38] hover:underline"
                >
                  Ver todos los días
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate !== 'all' ? selectedDate : ''}
                onChange={(e) => setSelectedDate(e.target.value || 'all')}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-sand-50 border border-sand-200 rounded-xl text-charcoal focus:outline-none focus:border-[#3a1b38]"
                title="Elegir día específico del calendario"
              />
              {selectedDate !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('all')}
                  className="p-2 text-charcoal-muted hover:text-charcoal bg-sand-100 hover:bg-sand-200 rounded-xl text-xs"
                  title="Quitar filtro de fecha"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Opción adicional de solo sesiones con cupos */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-charcoal font-medium">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded text-[#3a1b38] focus:ring-[#3a1b38]"
            />
            <span>Mostrar únicamente sesiones con cupos disponibles</span>
          </label>

          {!isAdmin && user?.role === 'CLIENT' && onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              className="text-xs font-semibold text-[#3a1b38] hover:underline inline-flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>
                {favoriteBranchObj
                  ? `Sede favorita: ${favoriteBranchObj.name} (Cambiar en Mi Cuenta)`
                  : 'Elige tu Sede Favorita en Mi Cuenta →'}
              </span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-56 bg-white/60 animate-pulse rounded-2xl border border-sand-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sage-800 text-xs font-bold uppercase tracking-wider mb-0.5">
                <Calendar className="w-3.5 h-3.5 text-[#3a1b38]" />
                <span>
                  {selectedDate !== 'all'
                    ? `Clases del ${new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        timeZone: 'UTC',
                      })}`
                    : 'Próximas Clases Agendadas'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-sage-900">
                {selectedBranchId !== 'all'
                  ? `Clases en ${branches.find((b) => b.id === selectedBranchId)?.name || 'Sede Seleccionada'}`
                  : 'Agenda de Sesiones'}
              </h3>
            </div>
            <span className="text-xs font-semibold text-charcoal-muted">
              {filteredSchedules.length}{' '}
              {filteredSchedules.length === 1 ? 'clase encontrada' : 'clases encontradas'}
            </span>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-sand-200 p-8">
              <Calendar className="w-10 h-10 text-sand-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-charcoal">
                No se encontraron sesiones con estos filtros
              </h4>
              <p className="text-xs text-charcoal-muted max-w-sm mx-auto mt-1">
                Intenta seleccionar otra fecha en el calendario, cambiar entre horario AM / PM o elegir otra sede.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 text-xs font-bold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl shadow-sm transition"
                >
                  Ver todas las sesiones disponibles
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Cuadrícula de 6 clases por página */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginatedSchedules.map((sched) =>
                  renderScheduleCard(
                    sched,
                    !isAdmin && !!favoriteBranchId && sched.branchId === favoriteBranchId,
                  ),
                )}
              </div>

              {/* Barra de Paginación */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-sand-200">
                  <span className="text-xs font-medium text-charcoal-muted">
                    Mostrando {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(currentPage * PAGE_SIZE, filteredSchedules.length)} de{' '}
                    {filteredSchedules.length} clases
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-sand-200 bg-white hover:bg-sand-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ← Anterior
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                          currentPage === page
                            ? 'bg-[#3a1b38] text-white shadow-xs'
                            : 'bg-white text-charcoal hover:bg-sand-100 border border-sand-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-sand-200 bg-white hover:bg-sand-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de Lista de Espera / Sobrecupo (solo para alumnos) */}
      <WaitlistJoinModal
        schedule={waitlistModalSchedule}
        isOpen={!!waitlistModalSchedule}
        onClose={() => setWaitlistModalSchedule(null)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </section>
  );
};
