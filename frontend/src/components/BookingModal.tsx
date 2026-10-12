import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, CreditCard, Building2, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import type { ClassSchedule } from '../types/schedule';
import { bookingsApi } from '../services/api';
import { VoucherDropzone } from './VoucherDropzone';

interface BookingModalProps {
  schedule: ClassSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'GATEWAY' | 'TRANSFER'>('GATEWAY');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrl, setVoucherUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<any | null>(null);

  if (!isOpen || !schedule) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <h2 className="text-lg font-bold text-sage-900">
              {completedBooking ? '¡Reserva Registrada!' : 'Confirmar Reserva de Clase'}
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {completedBooking
                ? 'Tu cupo ha sido reservado exitosamente'
                : 'Revisa los detalles de tu sesión y método de pago'}
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
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {completedBooking ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
                  Código de Reserva
                </span>
                <div className="text-2xl font-extrabold text-sage-900 tracking-wider font-mono mt-1">
                  {completedBooking.bookingCode}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 text-left text-xs space-y-2 text-charcoal">
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Clase:</span>
                  <span className="font-semibold">{schedule.classType.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Sede:</span>
                  <span className="font-semibold">{schedule.branch?.name || 'Sede Central'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Horario:</span>
                  <span className="font-semibold">{formatDate(schedule.startTime)} · {formatTime(schedule.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Estado:</span>
                  <span className="font-bold text-sage-800">
                    {completedBooking.status === 'CONFIRMADA'
                      ? 'CONFIRMADA ✅'
                      : completedBooking.status === 'PENDIENTE_VALIDACION'
                      ? 'PENDIENTE DE VALIDACIÓN (Comprobante en revisión)'
                      : 'PENDIENTE DE PAGO'}
                  </span>
                </div>
              </div>

              {completedBooking.paymentMethod === 'TRANSFER' && !completedBooking.voucherUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                  <p className="font-bold mb-1">Recuerda adjuntar tu comprobante:</p>
                  <p>
                    Puedes transferir a los datos bancarios y subir el recibo desde la sección "Mis Reservas" para que el administrador valide tu cupo.
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
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
                  <h3 className="font-bold text-sm text-sage-900">{schedule.classType.title}</h3>
                  <span className="font-bold text-sm text-sage-800">{formatPrice(schedule.price)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-charcoal">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sage-600" />
                    <span>{schedule.branch?.name || 'Sede Central'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sage-600" />
                    <span>{schedule.instructor?.name || 'Instructor asignado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="w-3.5 h-3.5 text-sage-600" />
                    <span className="capitalize">{formatDate(schedule.startTime)}</span>
                    <Clock className="w-3.5 h-3.5 text-sage-600 ml-2" />
                    <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                      paymentMethod === 'GATEWAY'
                        ? 'border-sage-600 bg-sage-50/60 ring-2 ring-sage-500/20'
                        : 'border-sand-200 hover:border-sand-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-5 h-5 text-sage-600" />
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'GATEWAY'}
                        onChange={() => setPaymentMethod('GATEWAY')}
                        className="text-sage-600 focus:ring-sage-500"
                      />
                    </div>
                    <span className="font-bold text-xs text-charcoal">Pasarela Online</span>
                    <span className="text-[10px] text-charcoal-muted mt-0.5">Webpay / Tarjetas</span>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                      paymentMethod === 'TRANSFER'
                        ? 'border-sage-600 bg-sage-50/60 ring-2 ring-sage-500/20'
                        : 'border-sand-200 hover:border-sand-300 bg-white'
                    }`}
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
                    <span className="text-[10px] text-charcoal-muted mt-0.5">Con Comprobante</span>
                  </label>
                </div>
              </div>

              {/* Transfer Details if selected */}
              {paymentMethod === 'TRANSFER' && (
                <div className="p-4 rounded-xl bg-sand-50/80 border border-sand-200 text-xs space-y-2">
                  <div className="font-bold text-sage-900 mb-1">Datos Bancarios del Estudio:</div>
                  <div className="grid grid-cols-2 gap-1.5 text-charcoal-muted">
                    <div>Banco: <span className="font-medium text-charcoal">Banco de Chile</span></div>
                    <div>Tipo: <span className="font-medium text-charcoal">Cuenta Corriente</span></div>
                    <div>N° Cuenta: <span className="font-medium text-charcoal">00-123-45678-90</span></div>
                    <div>RUT: <span className="font-medium text-charcoal">76.543.210-K</span></div>
                    <div className="col-span-2">Email: <span className="font-medium text-charcoal">pagos@estudiopilates.cl</span></div>
                  </div>

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
                      {paymentMethod === 'GATEWAY' ? 'Pagar con Pasarela' : 'Confirmar Reserva por Transferencia'}
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
