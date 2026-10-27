import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Zap,
  XCircle,
} from 'lucide-react';
import type { WaitlistEntry } from '../types/waitlist';
import type { StudioBankInfo } from '../types/auth';
import { waitlistApi, bookingsApi, authApi } from '../services/api';
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
  const [paymentMethod, setPaymentMethod] = useState<'GATEWAY' | 'TRANSFER'>('TRANSFER');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrl, setVoucherUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [completed, setCompleted] = useState<any | null>(null);
  const [bankInfo, setBankInfo] = useState<StudioBankInfo>({
    bankName: 'Banco de Chile',
    bankAccountType: 'Cuenta Corriente',
    bankAccountNumber: '00-123-45678-90',
    bankAccountRut: '76.543.210-K',
    bankAccountHolder: 'K PILATES SpA',
    bankPaymentEmail: 'pagos@estudiopilates.cl',
    bankPaymentNotes: 'Indica tu nombre o código de reserva en el comentario de la transferencia.',
  });

  useEffect(() => {
    if (isOpen) {
      setCompleted(null);
      setError(null);
      authApi
        .getStudioBankInfo()
        .then((data) => setBankInfo(data))
        .catch(() => {});
    }
  }, [isOpen, entry?.id]);

  if (!isOpen || !entry || !entry.schedule) return null;

  const schedule = entry.schedule;

  const formatPrice = (price: number | string) => {
    const num = Number(price);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(num);
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
    if (
      !window.confirm(
        '¿Seguro que deseas rechazar este cupo? Se ofrecerá de inmediato al siguiente alumno en la lista de espera.',
      )
    )
      return;
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

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-charcoal">
                  ¡Reserva Exitosa!
                </h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>A la espera de confirmación</span>
                </div>
              </div>

              {entry?.schedule && (
                <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 text-left text-xs space-y-2.5 text-charcoal">
                  <div className="flex justify-between items-center pb-2 border-b border-sand-200/70">
                    <span className="text-charcoal-muted font-medium">Clase:</span>
                    <span className="font-bold text-sage-900">
                      {entry.schedule.classType?.title || 'Clase de Pilates'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-muted font-medium">Día:</span>
                    <span className="font-semibold capitalize text-charcoal">
                      {formatDate(entry.schedule.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal-muted font-medium">Horario:</span>
                    <span className="font-semibold text-charcoal">
                      {formatTime(entry.schedule.startTime)} - {formatTime(entry.schedule.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-charcoal-muted font-medium shrink-0">Lugar:</span>
                    <div className="text-right">
                      <span className="font-semibold text-charcoal block">
                        {entry.schedule.branch?.name || 'Sede Central'}
                      </span>
                      {entry.schedule.branch?.address && (
                        <span className="text-[11px] text-charcoal-muted block">
                          {entry.schedule.branch.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                    Clase de Pilates
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
                  <div
                    className="p-3 rounded-xl border border-sand-200 bg-sand-50/50 opacity-60 cursor-not-allowed text-left flex flex-col justify-between"
                    title="Pasarela de pago online próximamente disponible"
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard className="w-4 h-4 text-charcoal-muted" />
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sand-200 text-charcoal-muted">
                        Próximamente
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-charcoal-muted">Webpay / Tarjetas</div>
                      <div className="text-[10px] text-charcoal-muted mt-0.5">
                        Pasarela Online
                      </div>
                    </div>
                  </div>

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
                      <Building2
                        className={`w-4 h-4 ${
                          paymentMethod === 'TRANSFER' ? 'text-sage-600' : 'text-charcoal-muted'
                        }`}
                      />
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'TRANSFER'
                            ? 'border-sage-600 bg-sage-600'
                            : 'border-sand-400'
                        }`}
                      >
                        {paymentMethod === 'TRANSFER' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-charcoal">Transferencia</div>
                      <div className="text-[10px] text-charcoal-muted mt-0.5">
                        Adjuntar comprobante
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Transfer Details & Voucher */}
              {paymentMethod === 'TRANSFER' && (
                <div className="p-3.5 rounded-xl bg-sand-50/70 border border-sand-200 space-y-3">
                  <div className="text-xs text-charcoal-muted space-y-1">
                    <p className="font-semibold text-charcoal">
                      Datos Bancarios para Transferencia:
                    </p>
                    <p>
                      {bankInfo.bankName} · {bankInfo.bankAccountType}:{' '}
                      <strong className="font-mono text-charcoal">
                        {bankInfo.bankAccountNumber}
                      </strong>
                    </p>
                    <p>
                      {bankInfo.bankAccountHolder} · RUT:{' '}
                      <strong className="font-mono text-charcoal">{bankInfo.bankAccountRut}</strong>
                    </p>
                    <p>{bankInfo.bankPaymentEmail}</p>
                    {bankInfo.bankPaymentNotes && (
                      <p className="text-[11px] text-[#3a1b38] pt-0.5">
                        💡 {bankInfo.bankPaymentNotes}
                      </p>
                    )}
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
                  <span>
                    {declining
                      ? 'Rechazando...'
                      : 'Rechazar y ceder al siguiente en lista de espera'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
