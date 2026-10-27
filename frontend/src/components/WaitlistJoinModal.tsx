import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Sparkles, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import type { ClassSchedule } from '../types/schedule';
import type { WaitlistSummaryResponse } from '../types/waitlist';
import { waitlistApi } from '../services/api';

interface WaitlistJoinModalProps {
  schedule: ClassSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WaitlistJoinModal: React.FC<WaitlistJoinModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [summary, setSummary] = useState<WaitlistSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedPosition, setJoinedPosition] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && schedule) {
      setError(null);
      setJoinedPosition(null);
      setLoadingSummary(true);
      waitlistApi
        .getSummary(schedule.id)
        .then((data) => setSummary(data))
        .catch(() => setSummary(null))
        .finally(() => setLoadingSummary(false));
    }
  }, [isOpen, schedule]);

  if (!isOpen || !schedule) return null;

  const handleJoin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await waitlistApi.join(schedule.id);
      setJoinedPosition(res.entry.position);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al unirse a la lista de espera');
    } finally {
      setSubmitting(false);
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

  const currentWaitCount = summary?.waitlistCount ?? 0;
  const maxWait = summary?.waitlistMax ?? 3;
  const isFull = summary?.isWaitlistFull ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <h2 className="text-lg font-bold text-sage-900">
              {joinedPosition ? '¡Inscripción Exitosa!' : 'Lista de Espera & Sobrecupo'}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {joinedPosition
                ? 'Quedaste registrado en la lista de espera'
                : 'Anotate para tomar el cupo en caso de que alguien cancele'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {joinedPosition ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-charcoal">
                  ¡Estás en la posición #{joinedPosition} de la lista de espera!
                </h3>
                <p className="text-xs text-charcoal-muted mt-2 max-w-sm mx-auto leading-relaxed">
                  Si un alumno cancela o un pago no se valida, el sistema te promoverá automáticamente
                  y te enviará una notificación con <strong>1 hora</strong> para aceptar tu cupo.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-sage-600 hover:bg-sage-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                >
                  Entendido, volver a la agenda
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Class Summary Card */}
              <div className="p-4 rounded-xl border border-sand-200 bg-sand-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-sage-900">
                    Clase de Pilates
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                    Clase Completa (0/{schedule.capacity})
                  </span>
                </div>

                <div className="space-y-1 text-xs text-charcoal-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sage-600" />
                    <span>{schedule.branch?.name || 'Sede Central'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-sage-600" />
                    <span className="capitalize">{formatDate(schedule.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-sage-600" />
                    <span>
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Waitlist Status Info */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Users className="w-4 h-4 text-amber-700" />
                    <span>Estado del Sobrecupo:</span>
                  </div>
                  {loadingSummary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                  ) : (
                    <span className="text-xs font-bold text-amber-900">
                      {currentWaitCount} de {maxWait} en espera
                    </span>
                  )}
                </div>

                <p className="text-xs text-amber-800 leading-relaxed">
                  Permitimos hasta 3 sobrecupos por clase. Si un participante cancela su asistencia,
                  el cupo pasa de inmediato al siguiente alumno en orden FIFO.
                </p>

                <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-amber-900">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ventana de aceptación: 1 hora desde la liberación del cupo.</span>
                </div>
              </div>

              {isFull ? (
                <div className="p-3 bg-stone-100 text-stone-600 rounded-xl text-xs text-center font-medium">
                  Lo sentimos, la lista de espera para esta clase ya alcanzó el límite máximo de {maxWait} sobrecupos.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={submitting || loadingSummary}
                  className="w-full py-3 px-4 bg-[#3a1b38] hover:bg-[#4f244c] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando sobrecupo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Inscribirme en Lista de Espera</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
