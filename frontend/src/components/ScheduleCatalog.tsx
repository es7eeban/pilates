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
} from 'lucide-react';
import type { ClassSchedule, Branch } from '../types/schedule';
import { schedulesApi, branchesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WaitlistJoinModal } from './WaitlistJoinModal';

interface ScheduleCatalogProps {
  onRequestLogin: () => void;
  onSelectSchedule: (schedule: ClassSchedule) => void;
  onOpenAccount?: () => void;
}

export const ScheduleCatalog: React.FC<ScheduleCatalogProps> = ({
  onRequestLogin,
  onSelectSchedule,
  onOpenAccount,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<'all' | 'AM' | 'PM'>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [waitlistModalSchedule, setWaitlistModalSchedule] = useState<ClassSchedule | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchesData, schedData] = await Promise.all([
        branchesApi.getAll(),
        schedulesApi.getAll({
          onlyAvailable: onlyAvailable || undefined,
        }),
      ]);
      setBranches(branchesData);
      setSchedules(schedData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la agenda de sesiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [onlyAvailable]);

  // Filtrado por Fecha de Calendario, Horario (AM / PM) y Sede
  const baseFilteredSchedules = useMemo(() => {
    const now = new Date();
    return schedules.filter((s) => {
      // Mostrar próximas sesiones vigentes
      if (new Date(s.endTime) < now) return false;

      // 1. Filtro por Día del Calendario (YYYY-MM-DD en UTC)
      if (selectedDate !== 'all') {
        const sDate = new Date(s.startTime).toISOString().slice(0, 10);
        if (sDate !== selectedDate) return false;
      }

      // 2. Filtro por Horario AM / PM
      if (selectedTimeOfDay !== 'all') {
        const hour = new Date(s.startTime).getUTCHours();
        if (selectedTimeOfDay === 'AM' && hour >= 14) return false;
        if (selectedTimeOfDay === 'PM' && hour < 14) return false;
      }

      return true;
    });
  }, [schedules, selectedDate, selectedTimeOfDay]);

  // Sesiones filtradas cuando se aplica el selector de Sede general
  const filteredSchedules = useMemo(() => {
    if (selectedBranchId === 'all') return baseFilteredSchedules;
    return baseFilteredSchedules.filter((s) => s.branchId === selectedBranchId);
  }, [baseFilteredSchedules, selectedBranchId]);

  // Separación para el Alumno con Sede Favorita:
  // 1) Próximas sesiones en su Sede Favorita
  // 2) Próximas sesiones generales (para ir otro día a otra sede)
  const favoriteBranchId = user?.favoriteBranchId || null;
  const favoriteBranchObj = useMemo(() => {
    if (!favoriteBranchId) return null;
    return user?.favoriteBranch || branches.find((b) => b.id === favoriteBranchId) || null;
  }, [favoriteBranchId, user?.favoriteBranch, branches]);

  const favoriteBranchSchedules = useMemo(() => {
    if (!favoriteBranchId) return [];
    return baseFilteredSchedules.filter((s) => s.branchId === favoriteBranchId);
  }, [baseFilteredSchedules, favoriteBranchId]);

  const generalSchedules = useMemo(() => {
    // Si el usuario filtró explícitamente una sede en el selector, mostrar esa sede
    if (selectedBranchId !== 'all') {
      return filteredSchedules;
    }
    return baseFilteredSchedules;
  }, [baseFilteredSchedules, filteredSchedules, selectedBranchId]);

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
    return hour < 14 ? 'Bloque AM · Mañana' : 'Bloque PM · Tarde';
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

    return (
      <div
        key={schedule.id}
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group ${
          highlightFavorite ? 'border-purple-200 ring-1 ring-purple-100' : 'border-sand-200'
        }`}
      >
        <div className="p-5">
          {/* Sede & Aforo */}
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

            {isFull ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Users className="w-3 h-3" /> Agotado · Sobrecupo
              </span>
            ) : isLow ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                ¡Últimos {schedule.availableSlots} cupos!
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {schedule.availableSlots} de {schedule.capacity} cupos
              </span>
            )}
          </div>

          {/* Fecha */}
          <span className="text-xs font-bold text-[#3a1b38] uppercase tracking-wide capitalize block">
            {formatDate(schedule.startTime)}
          </span>

          {/* Título simple V1 */}
          <h3 className="font-bold text-base text-charcoal mt-1">
            Sesión de Pilates · {schedule.branch?.name || 'Estudio'}
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

        {/* Acción de Reserva */}
        <div className="px-5 py-3.5 bg-sand-50/60 border-t border-sand-100 flex items-center justify-between">
          <div className="font-bold text-base text-sage-900 font-mono">
            {formatPrice(schedule.price)}
          </div>

          {isFull ? (
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
              onClick={() => onSelectSchedule(schedule)}
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
    <section className="mt-6 space-y-8">
      {/* BARRA DE FILTROS V1: SEDE + HORARIO (AM/PM) + CALENDARIO */}
      <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sand-100">
          <div>
            <h2 className="text-lg font-bold text-sage-900">Agenda de Clases en Vivo</h2>
            <p className="text-xs text-charcoal-muted">
              Filtra las sesiones disponibles por sede, jornada horaria (AM / PM) o elige un día en el calendario
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
          {/* 1. Filtro por Sede (alimentado desde Base de Datos) */}
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
              {branches.map((b) => (
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
                { id: 'AM', label: 'AM (Mañana)' },
                { id: 'PM', label: 'PM (Tarde)' },
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

          {user?.role === 'CLIENT' && onOpenAccount && (
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
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 bg-white/60 animate-pulse rounded-2xl border border-sand-200" />
          ))}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* APARTADO 1: PRÓXIMAS SESIONES DE LA SEDE FAVORITA (SI TIENE CONFIGURADA) */}
          {/* ========================================================================= */}
          {favoriteBranchObj && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-50/70 via-white to-rose-50/40 border border-purple-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3a1b38] text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Tu Sede Favorita</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#220622]">
                    Próximas Sesiones en {favoriteBranchObj.name}
                  </h3>
                  <p className="text-xs text-charcoal-muted">
                    Horarios próximos disponibles directamente en tu sede predilecta ({favoriteBranchSchedules.length}{' '}
                    {favoriteBranchSchedules.length === 1 ? 'sesión' : 'sesiones'})
                  </p>
                </div>

                {onOpenAccount && (
                  <button
                    type="button"
                    onClick={onOpenAccount}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 text-[#3a1b38] border border-purple-200 text-xs font-bold transition self-start sm:self-center flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Cambiar Sede Favorita</span>
                  </button>
                )}
              </div>

              {favoriteBranchSchedules.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/90 border border-sand-200 text-center space-y-1">
                  <p className="text-sm font-bold text-charcoal">
                    No hay sesiones en {favoriteBranchObj.name} con el filtro de fecha/horario actual
                  </p>
                  <p className="text-xs text-charcoal-muted">
                    Prueba limpiando la fecha o revisa abajo las sesiones disponibles en las demás sedes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {favoriteBranchSchedules.map((sched) => renderScheduleCard(sched, true))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* APARTADO 2: LISTADO DE PRÓXIMAS SESIONES GENERALES (TODAS LAS SEDES)      */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-sage-800 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {favoriteBranchObj
                      ? 'Agenda General Multi-Sede · Para asistir otro día u otra sucursal'
                      : 'Agenda General de Sesiones'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-sage-900">
                  {selectedBranchId !== 'all'
                    ? `Próximas Sesiones en ${branches.find((b) => b.id === selectedBranchId)?.name || 'Sede Seleccionada'}`
                    : 'Próximas Sesiones Generales (Todas las Sedes)'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-charcoal-muted">
                Mostrando {generalSchedules.length}{' '}
                {generalSchedules.length === 1 ? 'sesión disponible' : 'sesiones disponibles'}
              </span>
            </div>

            {generalSchedules.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-2xl border border-sand-200 p-8">
                <Calendar className="w-10 h-10 text-sand-400 mx-auto mb-2" />
                <h4 className="text-base font-bold text-charcoal">
                  No se encontraron sesiones con estos filtros
                </h4>
                <p className="text-xs text-charcoal-muted max-w-sm mx-auto mt-1">
                  Intenta seleccionar otra sede, cambiar entre horario AM / PM o elegir otro día en el calendario.
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {generalSchedules.map((sched) =>
                  renderScheduleCard(sched, !!favoriteBranchId && sched.branchId === favoriteBranchId),
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Lista de Espera / Sobrecupo */}
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
