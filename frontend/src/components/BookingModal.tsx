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
} from 'lucide-react';
import type { ClassSchedule, Booking } from '../types/schedule';
import type { StudioBankInfo } from '../types/auth';
import { bookingsApi, authApi } from '../services/api';
import { VoucherDropzone } from './VoucherDropzone';

interface BookingModalProps {
  schedule: ClassSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingBooking?: Booking | null;
  userBookings?: Booking[];
}

export const BookingModal: React.FC<BookingModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSuccess,
  existingBooking,
  userBookings,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'GATEWAY' | 'TRANSFER'>('TRANSFER');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrl, setVoucherUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<any | null>(null);
  const [bankInfo, setBankInfo] = useState<StudioBankInfo>({
    bankName: 'Banco de Chile',
    bankAccountType: 'Cuenta Corriente',
    bankAccountNumber: '00-123-45678-90',
    bankAccountRut: '76.543.210-K',
    bankAccountHolder: 'K PILATES SpA',
    bankPaymentEmail: 'pagos@estudiopilates.cl',
    bankPaymentNotes: 'Indica tu nombre o código de reserva en el comentario de la transferencia.',
  });

  // Determinar de forma síncrona si ya existe una reserva activa para esta clase
  // ya sea recién creada en este modal, pasada directamente o encontrada en la lista de reservas
  const activeBooking =
    completedBooking ||
    existingBooking ||
    (schedule?.id && userBookings
      ? userBookings.find(
          (b) =>
            b.scheduleId === schedule.id &&
            ['CONFIRMADA', 'PENDIENTE_VALIDACION', 'PENDIENTE_PAGO'].includes(b.status),
        )
      : null) ||
    null;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setVoucherFile(null);
      setVoucherUrl('');
      authApi
        .getStudioBankInfo()
        .then((data) => setBankInfo(data))
        .catch(() => {
          // Mantener respaldo por defecto
        });
    } else {
      setCompletedBooking(null);
    }
  }, [isOpen, schedule?.id]);

  const handleClose = () => {
    setCompletedBooking(null);
    setError(null);
    setVoucherFile(null);
    setVoucherUrl('');
    onClose();
  };

  if (!isOpen || !schedule) return null;

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

  const handleConfirmBooking = async (e: React.FormEvent) => {
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

      const res = await bookingsApi.create({
        scheduleId: schedule.id,
        paymentMethod,
        voucherUrl: finalVoucherUrl,
      });
      setCompletedBooking(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <h2 className="text-lg font-bold text-sage-900">
              {activeBooking
                ? activeBooking.status === 'CONFIRMADA'
                  ? '¡Clase Confirmada!'
                  : '¡Reserva Exitosa!'
                : 'Confirmar Reserva de Clase'}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {activeBooking
                ? activeBooking.status === 'CONFIRMADA'
                  ? 'Tu cupo se encuentra confirmado para esta sesión'
                  : 'A la espera de confirmación'
                : 'Revisa los detalles de tu sesión y método de pago'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeBooking ? (
            <div className="text-center py-4 space-y-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm ${
                  activeBooking.status === 'CONFIRMADA'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {activeBooking.status === 'CONFIRMADA' ? (
                  <CheckCircle2 className="w-9 h-9" />
                ) : (
                  <Clock className="w-9 h-9" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-charcoal">
                  {activeBooking.status === 'CONFIRMADA'
                    ? '¡Tu Clase está Confirmada!'
                    : '¡Reserva Exitosa!'}
                </h3>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    activeBooking.status === 'CONFIRMADA'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {activeBooking.status === 'CONFIRMADA' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reserva Confirmada por el Estudio</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>A la espera de confirmación</span>
                    </>
                  )}
                </div>
              </div>

              {/* Información detallada de la clase */}
              <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 text-left text-xs space-y-2.5 text-charcoal">
                <div className="flex justify-between items-center pb-2 border-b border-sand-200/70">
                  <span className="text-charcoal-muted font-medium">Clase:</span>
                  <span className="font-bold text-sage-900">
                    {schedule.classType?.title || 'Clase de Pilates'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-charcoal-muted font-medium">Día:</span>
                  <span className="font-semibold capitalize text-charcoal">
                    {formatDate(schedule.startTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-charcoal-muted font-medium">Horario:</span>
                  <span className="font-semibold text-charcoal">
                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-charcoal-muted font-medium shrink-0">Lugar:</span>
                  <div className="text-right">
                    <span className="font-semibold text-charcoal block">
                      {schedule.branch?.name || 'Sede Central'}
                    </span>
                    {schedule.branch?.address && (
                      <span className="text-[11px] text-charcoal-muted block">
                        {schedule.branch.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {activeBooking.status !== 'CONFIRMADA' && (
                <>
                  {activeBooking.voucherUrl ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-left flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Comprobante recibido. El administrador validará tu reserva a la brevedad.</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left space-y-1">
                      <p className="font-bold">Recuerda realizar tu transferencia y adjuntar el comprobante:</p>
                      <p>
                        {bankInfo.bankName} · {bankInfo.bankAccountType} N°{' '}
                        <strong className="font-mono">{bankInfo.bankAccountNumber}</strong> (RUT:{' '}
                        {bankInfo.bankAccountRut} · {bankInfo.bankAccountHolder})
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Puedes adjuntar el comprobante desde la sección "Mis Reservas" para que el administrador valide tu reserva.
                      </p>
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 bg-sage-600 hover:bg-sage-700 text-white font-medium text-sm rounded-xl shadow transition"
              >
                Cerrar y Ver Mi Agenda
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmBooking} className="space-y-5">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                  <h3 className="font-bold text-sm text-sage-900">Clase de Pilates</h3>
                  <span className="font-bold text-sm text-sage-800">{formatPrice(schedule.price)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-charcoal">
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                    <span className="font-medium">{schedule.branch?.name || 'Sede Central'}</span>
                    {schedule.branch?.address && (
                      <span className="text-charcoal-muted text-[11px]">({schedule.branch.address})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                    <span className="capitalize font-medium">{formatDate(schedule.startTime)}</span>
                    <Clock className="w-3.5 h-3.5 text-sage-600 ml-2 shrink-0" />
                    <span className="font-medium">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Método de Pago
                  </label>
                  <span className="text-[11px] text-charcoal-muted">Solo transferencia por el momento</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Pasarela Online (Deshabilitada temporalmente) */}
                  <div
                    className="p-3.5 rounded-xl border border-sand-200 bg-sand-50/60 opacity-60 cursor-not-allowed flex flex-col justify-between"
                    title="Pasarela de pago online próximamente disponible"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-5 h-5 text-charcoal-muted" />
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sand-200 text-charcoal-muted">
                        Próximamente
                      </span>
                    </div>
                    <span className="font-bold text-xs text-charcoal-muted">Pasarela Online</span>
                    <span className="text-[10px] text-charcoal-muted mt-0.5">Webpay / Tarjetas</span>
                  </div>

                  {/* Transferencia Bancaria (Activa) */}
                  <label
                    className="p-3.5 rounded-xl border-2 border-sage-600 bg-sage-50/60 ring-2 ring-sage-500/20 flex flex-col justify-between cursor-pointer transition shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Building2 className="w-5 h-5 text-sage-600" />
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'TRANSFER'}
                        onChange={() => setPaymentMethod('TRANSFER')}
                        className="text-sage-600 focus:ring-sage-500"
                      />
                    </div>
                    <span className="font-bold text-xs text-charcoal">Transferencia</span>
                    <span className="text-[10px] text-sage-700 font-semibold mt-0.5">Con Comprobante</span>
                  </label>
                </div>
              </div>

              {/* Transfer Details if selected (Live from Admin Account) */}
              {paymentMethod === 'TRANSFER' && (
                <div className="p-4 rounded-xl bg-sand-50/80 border border-sand-200 text-xs space-y-2">
                  <div className="font-bold text-sage-900 mb-1">
                    Datos Bancarios del Estudio (Actualizados):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-charcoal-muted">
                    <div>
                      Banco: <span className="font-semibold text-charcoal">{bankInfo.bankName}</span>
                    </div>
                    <div>
                      Tipo:{' '}
                      <span className="font-semibold text-charcoal">{bankInfo.bankAccountType}</span>
                    </div>
                    <div>
                      N° Cuenta:{' '}
                      <span className="font-semibold font-mono text-charcoal">
                        {bankInfo.bankAccountNumber}
                      </span>
                    </div>
                    <div>
                      RUT:{' '}
                      <span className="font-semibold font-mono text-charcoal">
                        {bankInfo.bankAccountRut}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      Titular:{' '}
                      <span className="font-semibold text-charcoal">
                        {bankInfo.bankAccountHolder}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      Email comprobantes:{' '}
                      <span className="font-semibold text-charcoal">
                        {bankInfo.bankPaymentEmail}
                      </span>
                    </div>
                  </div>
                  {bankInfo.bankPaymentNotes && (
                    <p className="text-[11px] text-[#3a1b38] bg-purple-50/70 px-2.5 py-1.5 rounded-lg border border-purple-200/70">
                      💡 {bankInfo.bankPaymentNotes}
                    </p>
                  )}

                  <div className="pt-2 border-t border-sand-200 mt-2">
                    <VoucherDropzone
                      file={voucherFile}
                      onFileChange={setVoucherFile}
                      urlFallback={voucherUrl}
                      onUrlFallbackChange={setVoucherUrl}
                      disabled={loading}
                    />
                    <span className="text-[10px] text-charcoal-muted mt-1 block">
                      {voucherFile || voucherUrl
                        ? '✓ Comprobante listo. Al confirmar, tu reserva pasará a revisión del administrador.'
                        : 'Puedes adjuntar el comprobante ahora o después desde "Mis Reservas".'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reservando cupo...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Confirmar Reserva por Transferencia
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
