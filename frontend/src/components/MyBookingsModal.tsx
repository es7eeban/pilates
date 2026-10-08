import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, AlertCircle, Loader2, Upload, Ban } from 'lucide-react';
import type { Booking } from '../types/schedule';
import { bookingsApi } from '../services/api';

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshSchedule: () => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshSchedule,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoucherBookingId, setSelectedVoucherBookingId] = useState<string | null>(null);
  const [voucherUrlInput, setVoucherUrlInput] = useState('');
  const [submittingVoucher, setSubmittingVoucher] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingsApi.getMyBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener tus reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta reserva? Tu cupo será liberado.')) return;
    try {
      await bookingsApi.cancel(bookingId);
      await fetchBookings();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar reserva');
    }
  };

  const handleUploadVoucher = async (bookingId: string) => {
    if (!voucherUrlInput.trim()) return;
    setSubmittingVoucher(true);
    try {
      await bookingsApi.uploadVoucher(bookingId, voucherUrlInput.trim());
      setSelectedVoucherBookingId(null);
      setVoucherUrlInput('');
      await fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Error al adjuntar comprobante');
    } finally {
      setSubmittingVoucher(false);
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMADA':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Confirmada
          </span>
        );
      case 'PENDIENTE_VALIDACION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            En Validación
          </span>
        );
      case 'PENDIENTE_PAGO':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Pendiente Pago
          </span>
        );
      case 'RECHAZADA_ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            Rechazada
          </span>
        );
      case 'CANCELADA_CLIENTE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
            Cancelada
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sand-100 text-charcoal">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <h2 className="text-lg font-bold text-sage-900">Mis Reservas</h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Consulta tus clases agendadas y el estado de tus comprobantes
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
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sage-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-charcoal-muted">
              <Calendar className="w-12 h-12 text-sand-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-charcoal">No tienes reservas activas todavía</p>
              <p className="text-xs mt-1">Explora la agenda y reserva tu primera clase de pilates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-sand-200 bg-sand-50/40 hover:bg-white hover:shadow-sm transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sage-800 bg-sage-100/60 px-2.5 py-1 rounded-lg">
                      {b.bookingCode}
                    </span>
                    <div>{getStatusBadge(b.status)}</div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-sage-900">{b.schedule?.classType?.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-muted mt-1.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sage-600" />
                        <span>{b.schedule?.branch?.name || 'Sede Central'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sage-600" />
                        <span>
                          {new Date(b.schedule?.startTime).toLocaleDateString('es-CL', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-sage-600 ml-1" />
                        <span>
                          {new Date(b.schedule?.startTime).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Voucher input */}
                  {b.status === 'PENDIENTE_PAGO' && b.paymentMethod === 'TRANSFER' && (
                    <div className="pt-2 border-t border-sand-200">
                      {selectedVoucherBookingId === b.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="url"
                            value={voucherUrlInput}
                            onChange={(e) => setVoucherUrlInput(e.target.value)}
                            placeholder="Pega la URL de tu comprobante"
                            className="flex-1 px-3 py-1.5 bg-white border border-sand-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sage-500"
                          />
                          <button
                            onClick={() => handleUploadVoucher(b.id)}
                            disabled={submittingVoucher || !voucherUrlInput.trim()}
                            className="px-3 py-1.5 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                          >
                            {submittingVoucher ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            Enviar
                          </button>
                          <button
                            onClick={() => setSelectedVoucherBookingId(null)}
                            className="px-2 py-1.5 text-xs text-charcoal-muted hover:text-charcoal"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-700 font-medium">Pendiente de comprobante:</span>
                          <button
                            onClick={() => {
                              setSelectedVoucherBookingId(b.id);
                              setVoucherUrlInput('');
                            }}
                            className="text-sage-700 hover:text-sage-900 font-bold underline"
                          >
                            Adjuntar comprobante ahora
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {b.status !== 'CANCELADA_CLIENTE' && b.status !== 'RECHAZADA_ADMIN' && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="text-[11px] text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                      >
                        <Ban className="w-3 h-3" />
                        Cancelar reserva
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
