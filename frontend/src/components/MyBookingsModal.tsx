import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, AlertCircle, Loader2, Upload, Ban, CheckCircle2, Eye } from 'lucide-react';
import type { Booking } from '../types/schedule';
import { bookingsApi } from '../services/api';
import { VoucherDropzone } from './VoucherDropzone';
import { VoucherPreviewModal } from './VoucherPreviewModal';

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
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrlInput, setVoucherUrlInput] = useState('');
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<{ url: string; bookingCode?: string; classTitle?: string } | null>(null);

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
    if (!voucherFile && !voucherUrlInput.trim()) return;
    setSubmittingVoucher(true);
    try {
      if (voucherFile) {
        await bookingsApi.uploadVoucherFile(bookingId, voucherFile);
      } else {
        await bookingsApi.uploadVoucher(bookingId, voucherUrlInput.trim());
      }
      setSelectedVoucherBookingId(null);
      setVoucherFile(null);
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
                    <div className="flex items-center gap-1.5">
                      {(b.status === 'CONFIRMADA' || b.status === 'FINALIZADA') && (
                        <>
                          {b.attendanceStatus === 'ATTENDED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✅ Presente
                            </span>
                          )}
                          {b.attendanceStatus === 'NO_SHOW' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              ❌ Ausente
                            </span>
                          )}
                          {b.attendanceStatus === 'EXCUSED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              🟡 Justificada
                            </span>
                          )}
                          {(!b.attendanceStatus || b.attendanceStatus === 'PENDING') && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600">
                              ⏳ En sala
                            </span>
                          )}
                        </>
                      )}
                      {getStatusBadge(b.status)}
                    </div>
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

                  {/* Rejection notice if admin rejected */}
                  {b.status === 'RECHAZADA_ADMIN' && b.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                      <span className="font-bold block">Motivo de rechazo de transferencia:</span>
                      <p>{b.rejectionReason}</p>
                    </div>
                  )}

                  {/* Actions / Voucher input */}
                  {b.status === 'PENDIENTE_PAGO' && b.paymentMethod === 'TRANSFER' && (
                    <div className="pt-2 border-t border-sand-200">
                      {selectedVoucherBookingId === b.id ? (
                        <div className="mt-2 p-3 rounded-xl bg-sand-50/80 border border-sand-200 space-y-3">
                          <VoucherDropzone
                            file={voucherFile}
                            onFileChange={setVoucherFile}
                            urlFallback={voucherUrlInput}
                            onUrlFallbackChange={setVoucherUrlInput}
                            disabled={submittingVoucher}
                          />
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-sand-200">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVoucherBookingId(null);
                                setVoucherFile(null);
                                setVoucherUrlInput('');
                              }}
                              className="px-3 py-1.5 text-xs text-charcoal-muted hover:text-charcoal"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUploadVoucher(b.id)}
                              disabled={submittingVoucher || (!voucherFile && !voucherUrlInput.trim())}
                              className="px-3.5 py-1.5 bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                            >
                              {submittingVoucher ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              Subir Comprobante
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-700 font-medium">Pendiente de comprobante:</span>
                          <button
                            onClick={() => {
                              setSelectedVoucherBookingId(b.id);
                              setVoucherFile(null);
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

                  {/* View attached voucher if available */}
                  {b.voucherUrl && (
                    <div className="pt-2 border-t border-sand-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-sage-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-[11px]">Comprobante adjuntado</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setViewingVoucher({
                            url: b.voucherUrl!,
                            bookingCode: b.bookingCode,
                            classTitle: b.schedule?.classType?.title,
                          })
                        }
                        className="inline-flex items-center gap-1 text-sage-700 hover:text-sage-900 font-bold text-[11px] hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver comprobante
                      </button>
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

      {/* Lightbox / Modal de Previsualización */}
      {viewingVoucher && (
        <VoucherPreviewModal
          isOpen={true}
          onClose={() => setViewingVoucher(null)}
          voucherUrl={viewingVoucher.url}
          bookingCode={viewingVoucher.bookingCode}
          classTitle={viewingVoucher.classTitle}
        />
      )}
    </div>
  );
};
