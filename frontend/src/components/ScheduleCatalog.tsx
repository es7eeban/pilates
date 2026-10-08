import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, Sparkles, Filter, AlertCircle, RefreshCw, MapPin, Star } from 'lucide-react';
import type { ClassSchedule, ClassType, Branch } from '../types/schedule';
import { schedulesApi, classTypesApi, branchesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ScheduleCatalogProps {
  onRequestLogin: () => void;
  onSelectSchedule: (schedule: ClassSchedule) => void;
}

export const ScheduleCatalog: React.FC<ScheduleCatalogProps> = ({
  onRequestLogin,
  onSelectSchedule,
}) => {
  const { user, isAuthenticated, updatePreferences } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('all');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingFavorite, setSavingFavorite] = useState<boolean>(false);

  // Inicializar sede seleccionada con la sede favorita del usuario si existe
  useEffect(() => {
    if (user?.favoriteBranchId) {
      setSelectedBranchId(user.favoriteBranchId);
    }
  }, [user?.favoriteBranchId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesData, branchesData, schedData] = await Promise.all([
        classTypesApi.getAll(),
        branchesApi.getAll(),
        schedulesApi.getAll({
          classTypeId: selectedClassTypeId !== 'all' ? selectedClassTypeId : undefined,
          branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
          onlyAvailable: onlyAvailable || undefined,
        }),
      ]);
      setClassTypes(typesData);
      setBranches(branchesData);
      setSchedules(schedData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClassTypeId, selectedBranchId, onlyAvailable]);

  // Filtrado en memoria por franja horaria
  const filteredSchedules = schedules.filter((s) => {
    if (selectedTimeOfDay === 'all') return true;
    const hour = new Date(s.startTime).getUTCHours();
    if (selectedTimeOfDay === 'morning') return hour >= 6 && hour < 12;
    if (selectedTimeOfDay === 'afternoon') return hour >= 12 && hour < 18;
    if (selectedTimeOfDay === 'evening') return hour >= 18 && hour < 23;
    return true;
  });

  const handleToggleFavoriteBranch = async (branchId: string) => {
    if (!isAuthenticated) {
      onRequestLogin();
      return;
    }
    setSavingFavorite(true);
    try {
      const newFav = user?.favoriteBranchId === branchId ? null : branchId;
      await updatePreferences({ favoriteBranchId: newFav });
    } catch (err: any) {
      alert(err.message || 'Error al guardar sede favorita');
    } finally {
      setSavingFavorite(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
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
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <section className="mt-8">
      {/* Sede (Branch) Filter Bar */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-sand-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sage-900 uppercase tracking-wide">
            <MapPin className="w-4 h-4 text-sage-600" />
            <span>Selecciona tu Sede:</span>
          </div>
          {user?.favoriteBranch && (
            <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              Tu sede favorita: <strong className="font-semibold">{user.favoriteBranch.name}</strong>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedBranchId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              selectedBranchId === 'all'
                ? 'bg-sage-600 text-white shadow-sm'
                : 'bg-sand-50 text-charcoal hover:bg-sand-100 border border-sand-200'
            }`}
          >
            Todas las Sedes
          </button>

          {branches.map((b) => {
            const isFav = user?.favoriteBranchId === b.id;
            const isSelected = selectedBranchId === b.id;

            return (
              <div
                key={b.id}
                className={`inline-flex items-center rounded-xl text-xs font-semibold border transition overflow-hidden ${
                  isSelected
                    ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                    : 'bg-sand-50 text-charcoal hover:bg-sand-100 border-sand-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBranchId(b.id)}
                  className="px-3.5 py-2 text-left"
                >
                  <span>{b.name}</span>
                  {b.commune && <span className="opacity-75 text-[10px] ml-1.5">({b.commune})</span>}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleFavoriteBranch(b.id)}
                  disabled={savingFavorite}
                  title={isFav ? 'Quitar de favoritos' : 'Marcar como mi sede favorita'}
                  className={`p-2 transition border-l ${
                    isSelected
                      ? 'border-sage-500 hover:bg-sage-700 text-amber-300'
                      : 'border-sand-200 hover:bg-sand-200 text-charcoal-muted'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Header & Second Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sage-800 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" /> Agenda en Vivo
          </div>
          <h2 className="text-2xl font-bold text-sage-900 tracking-tight">
            Próximas Sesiones Disponibles
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Discipline selector */}
          <div className="flex items-center gap-1.5 bg-white border border-sand-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-charcoal-muted" />
            <select
              value={selectedClassTypeId}
              onChange={(e) => setSelectedClassTypeId(e.target.value)}
              className="text-xs bg-transparent text-charcoal font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las disciplinas</option>
              {classTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Time of day selector */}
          <div className="flex items-center gap-1.5 bg-white border border-sand-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-charcoal-muted" />
            <select
              value={selectedTimeOfDay}
              onChange={(e) => setSelectedTimeOfDay(e.target.value)}
              className="text-xs bg-transparent text-charcoal font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Cualquier horario</option>
              <option value="morning">🌅 Mañana (07:00 - 12:00)</option>
              <option value="afternoon">☀️ Tarde (12:00 - 18:00)</option>
              <option value="evening">🌙 Noche (18:00 - 22:00)</option>
            </select>
          </div>

          {/* Only with available slots */}
          <label className="flex items-center gap-2 bg-white border border-sand-200 rounded-xl px-3 py-2 shadow-sm text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded text-sage-600 focus:ring-sage-500"
            />
            <span className="font-medium text-charcoal">Solo con cupos</span>
          </label>

          <button
            onClick={fetchData}
            title="Actualizar agenda"
            className="p-2 bg-white hover:bg-sand-100 border border-sand-200 rounded-xl text-charcoal-muted hover:text-charcoal transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of classes */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 bg-white/60 animate-pulse rounded-2xl border border-sand-200" />
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-sand-200 p-8">
          <Calendar className="w-12 h-12 text-sand-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-charcoal">No hay sesiones disponibles</h3>
          <p className="text-xs text-charcoal-muted max-w-sm mx-auto mt-1">
            No se encontraron clases con los filtros aplicados. Intenta cambiar de sede, disciplina o rango horario.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchedules.map((schedule) => {
            const isFull = schedule.availableSlots <= 0;
            const isLow = schedule.availableSlots > 0 && schedule.availableSlots <= 2;

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-5">
                  {/* Sede badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sage-50 text-sage-800 border border-sage-200">
                      <MapPin className="w-3 h-3 text-sage-600" />
                      {schedule.branch?.name || 'Sede Central'}
                    </span>

                    {isFull ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        Agotado
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

                  <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wide capitalize block mb-1">
                    {formatDate(schedule.startTime)}
                  </span>

                  <h3 className="font-bold text-base text-charcoal group-hover:text-sage-800 transition">
                    {schedule.classType.title}
                  </h3>

                  <p className="text-xs text-charcoal-muted mt-1 line-clamp-2">
                    {schedule.classType.description || 'Sesión guiada para fortalecimiento postural.'}
                  </p>

                  {/* Details */}
                  <div className="mt-4 pt-3 border-t border-sand-100 space-y-2 text-xs text-charcoal-muted">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sage-600" />
                      <span className="font-medium text-charcoal">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </span>
                      <span>({schedule.classType.durationMinutes} min)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-sage-600" />
                      <span>
                        Instructor:{' '}
                        <span className="font-medium text-charcoal">
                          {schedule.instructor?.name || 'Por asignar'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-sage-600" />
                      <span>Nivel: {schedule.classType.intensityLevel}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom / Action */}
                <div className="px-5 py-3.5 bg-sand-50/60 border-t border-sand-100 flex items-center justify-between">
                  <div className="font-bold text-base text-sage-900">
                    {formatPrice(schedule.price)}
                  </div>

                  {isFull ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-sand-200 text-charcoal-muted text-xs font-semibold rounded-xl cursor-not-allowed"
                    >
                      Sin Cupos
                    </button>
                  ) : !isAuthenticated ? (
                    <button
                      onClick={onRequestLogin}
                      className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                    >
                      Reservar
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectSchedule(schedule)}
                      className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                    >
                      Reservar Cupo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
