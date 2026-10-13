import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, CreditCard, Building2, CheckCircle2, AlertCircle, Loader2, ArrowRight, Zap, XCircle } from 'lucide-react';
import type { WaitlistEntry } from '../types/waitlist';
import { waitlistApi, bookingsApi } from '../services/api';
import { VoucherDropzone } from './VoucherDropzone';

interface WaitlistAcceptModalProps {
  entry: WaitlistEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WaitlistAcceptModal: React.FC<WaitlistAcceptModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'GATEWAY' | 'TRANSFER'>('GATEWAY');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrl, setVoucherUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [completed, setCompleted] = useState<any | null>(null);

  if (!isOpen || !entry || !entry.schedule) return null;

  const schedule = entry.schedule;

  const formatPrice = (price: number | string) => {
    const num = Number(price);
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(num);
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

  const calculateRemainingMinutes = () => {
    if (!entry.expiresAt) return 60;
    const diff = new Date(entry.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 60000));
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalVoucherUrl: string | undefined = undefined;

      if (paymentMethod === 'TRANSFER') {
        if (voucherFile) {
          const uploaded = await bookingsApi.uploadVoucherDirect(voucherFile);
          finalVoucherUrl = uploaded.url;
        } else if (voucherUrl.trim()) {
          finalVoucherUrl = voucherUrl.trim();
        }
      }

      const res = await waitlistApi.accept(schedule.id, {
        paymentMethod,
        voucherUrl: finalVoucherUrl,
      });

      setCompleted(res.booking);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al aceptar cupo en lista de espera');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('¿Seguro que deseas rechazar este cupo? Se ofrecerá de inmediato al siguiente alumno en la lista de espera.')) return;
    setDeclining(true);
    setError(null);
    try {
      await waitlistApi.decline(schedule.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al rechazar cupo');
    } finally {
      setDeclining(false);
    }
  };

  const remainingMins = calculateRemainingMinutes();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500 text-white">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-lg font-bold text-sage-900">
                {completed ? '¡Cupo Confirmado!' : '¡Cupo Disponible para Ti!'}
              </h2>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {completed
                ? 'Tu cupo ha sido reservado exitosamente'
                : 'Se liberó un espacio en tu clase solicitada'}
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

          {completed ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-charcoal">
                  ¡Reserva Exitosa desde Sobrecupo!
                </h3>
                <p className="text-xs text-charcoal-muted mt-1 max-w-sm mx-auto">
                  Has tomado el cupo liberado a tiempo. Código de reserva:
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-sand-100 text-sage-900 font-mono font-bold text-sm rounded-lg border border-sand-300">
                  {completed.bookingCode}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-sage-600 hover:bg-sage-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                >
                  Ver mis reservas
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              {/* Urgent Countdown Alert */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 text-xs">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Ventana de Aceptación: 1 Hora</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
                      {remainingMins > 0 ? `${remainingMins} min restantes` : 'Expirando pronto'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    Si no aceptas este cupo antes del tiempo límite, se transferirá automáticamente al siguiente alumno en espera.
                  </p>
                </div>
              </div>

              {/* Class Summary */}
              <div className="p-4 rounded-xl border border-sand-200 bg-sand-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-sage-900">
                    {schedule.classType?.title || 'Clase de Pilates'}
                  </span>
                  <span className="text-xs font-bold text-sage-900">
                    {formatPrice(schedule.price)}
                  </span>
                </div>
                <div className="text-xs text-charcoal-muted space-y-1">
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

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal block">
                  Selecciona tu Método de Pago:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('GATEWAY')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentMethod === 'GATEWAY'
                        ? 'border-sage-600 bg-sage-50/50 ring-1 ring-sage-600'
                        : 'border-sand-200 bg-white hover:bg-sand-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard className={`w-4 h-4 ${paymentMethod === 'GATEWAY' ? 'text-sage-600' : 'text-charcoal-muted'}`} />
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === 'GATEWAY' ? 'border-sage-600 bg-sage-600' : 'border-sand-400'}`}>
                        {paymentMethod === 'GATEWAY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-charcoal">Webpay / Tarjetas</div>
                      <div className="text-[10px] text-charcoal-muted mt-0.5">Confirmación inmediata</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentMethod === 'TRANSFER'
                        ? 'border-sage-600 bg-sage-50/50 ring-1 ring-sage-600'
                        : 'border-sand-200 bg-white hover:bg-sand-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Building2 className={`w-4 h-4 ${paymentMethod === 'TRANSFER' ? 'text-sage-600' : 'text-charcoal-muted'}`} />
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'border-sage-600 bg-sage-600' : 'border-sand-400'}`}>
                        {paymentMethod === 'TRANSFER' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-charcoal">Transferencia</div>
                      <div className="text-[10px] text-charcoal-muted mt-0.5">Adjuntar comprobante</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Transfer Details & Voucher */}
              {paymentMethod === 'TRANSFER' && (
                <div className="p-3.5 rounded-xl bg-sand-50/70 border border-sand-200 space-y-3">
                  <div className="text-xs text-charcoal-muted space-y-1">
                    <p className="font-semibold text-charcoal">Datos Bancarios para Transferencia:</p>
                    <p>Banco de Chile · Cuenta Corriente: 123-45678-90</p>
                    <p>Pilates Studio Spa · RUT: 76.543.210-K</p>
                    <p>contacto@pilates-studio.cl</p>
                  </div>

                  <VoucherDropzone
                    file={voucherFile}
                    onFileChange={setVoucherFile}
                    urlFallback={voucherUrl}
                    onUrlFallbackChange={setVoucherUrl}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading || declining}
                  className="w-full py-3 px-4 bg-[#3a1b38] hover:bg-[#4f244c] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirmando cupo y creando reserva...</span>
                    </>
                  ) : (
                    <>
                      <span>Aceptar Cupo y Formalizar Reserva</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={loading || declining}
                  className="w-full py-2 px-3 text-xs font-medium text-charcoal-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{declining ? 'Rechazando...' : 'Rechazar y ceder al siguiente en lista de espera'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
