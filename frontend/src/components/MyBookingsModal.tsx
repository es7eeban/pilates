import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
  Ban,
  Eye,
  Users,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import type { Booking } from '../types/schedule';
import type { WaitlistEntry } from '../types/waitlist';
import { bookingsApi, waitlistApi } from '../services/api';
import { VoucherDropzone } from './VoucherDropzone';
import { VoucherPreviewModal } from './VoucherPreviewModal';
import { WaitlistAcceptModal } from './WaitlistAcceptModal';

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshSchedule: () => void;
  initialTab?: 'bookings' | 'waitlist';
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshSchedule,
  initialTab = 'bookings',
}) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist'>(initialTab);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVoucherBookingId, setSelectedVoucherBookingId] = useState<string | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherUrlInput, setVoucherUrlInput] = useState('');
  const [submittingVoucher, setSubmittingVoucher] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<{
    url: string;
    bookingCode?: string;
    classTitle?: string;
  } | null>(null);

  const [acceptingWaitlistEntry, setAcceptingWaitlistEntry] = useState<WaitlistEntry | null>(null);

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

  const fetchWaitlist = async () => {
    setLoadingWaitlist(true);
    try {
      const data = await waitlistApi.getMyEntries();
      setWaitlistEntries(data);
    } catch {
      // Ignorar
    } finally {
      setLoadingWaitlist(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchBookings();
      fetchWaitlist();
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta reserva? Tu cupo será liberado.')) return;
    try {
      await bookingsApi.cancel(bookingId);
      await fetchBookings();
      await fetchWaitlist();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar reserva');
    }
  };

  const handleDeclineWaitlist = async (scheduleId: string) => {
    if (!window.confirm('¿Deseas renunciar a este sobrecupo? Se ofrecerá de inmediato al siguiente alumno en espera.')) return;
    try {
      await waitlistApi.decline(scheduleId);
      await fetchWaitlist();
      onRefreshSchedule();
    } catch (err: any) {
      alert(err.message || 'Error al declinar sobrecupo');
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

  const offeredCount = waitlistEntries.filter((e) => e.status === 'OFFERED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <h2 className="text-lg font-bold text-sage-900">Mis Clases & Sobrecupos</h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Administra tus reservas agendadas y monitorea tus listas de espera
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-sand-200 bg-sand-50/30 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'border-[#3a1b38] text-[#220622]'
                : 'border-transparent text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mis Reservas ({bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waitlist')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'waitlist'
                ? 'border-[#3a1b38] text-[#220622]'
                : 'border-transparent text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lista de Espera ({waitlistEntries.length})</span>
            {offeredCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5 animate-pulse">
                <Zap className="w-2.5 h-2.5" /> {offeredCount}
              </span>
            )}
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

          {activeTab === 'bookings' ? (
            loading ? (
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
                                className="px-3.5 py-1.5 text-xs font-semibold bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
                              >
                                {submittingVoucher ? 'Subiendo...' : 'Enviar Comprobante'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-amber-800 font-medium">
                              Requiere comprobante de transferencia bancaria
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedVoucherBookingId(b.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-sage-800 border border-sage-300 rounded-xl transition shadow-sm"
                            >
                              Adjuntar Comprobante
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ver comprobante si existe */}
                    {b.voucherUrl && (
                      <div className="pt-2 border-t border-sand-200 flex items-center justify-between">
                        <span className="text-[11px] text-charcoal-muted">
                          Comprobante adjuntado
                        </span>
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
                          onClick={() => handleCancelBooking(b.id)}
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
            )
          ) : (
            /* WAITLIST TAB */
            loadingWaitlist ? (
              <div className="flex items-center justify-center py-12 text-sage-600">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            ) : waitlistEntries.length === 0 ? (
              <div className="text-center py-12 text-charcoal-muted">
                <Users className="w-12 h-12 text-sand-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-charcoal">No estás en ninguna lista de espera</p>
                <p className="text-xs mt-1">
                  Cuando una clase esté agotada, podrás anotarte en el sobrecupo y se te asignará
                  el cupo si alguien cancela.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {waitlistEntries.map((entry) => {
                  const isOffered = entry.status === 'OFFERED';
                  const isWaiting = entry.status === 'WAITING';

                  return (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isOffered
                          ? 'border-amber-400 bg-amber-50/60 shadow-md ring-1 ring-amber-300'
                          : 'border-sand-200 bg-sand-50/40 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOffered ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3" /> ¡Cupo Ofrecido! (1 hora para aceptar)
                            </span>
                          ) : isWaiting ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> En Espera · Posición #{entry.position} de 3
                            </span>
                          ) : entry.status === 'ACCEPTED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aceptado · Convertido en Reserva
                            </span>
                          ) : entry.status === 'EXPIRED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                              Expirado (plazo vencido)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                              Declinado
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-charcoal-muted">
                          Inscrito el {new Date(entry.createdAt).toLocaleDateString('es-CL')}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-sage-900">
                          {entry.schedule?.classType?.title || 'Clase de Pilates'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-muted mt-1.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-sage-600" />
                            <span>{entry.schedule?.branch?.name || 'Sede Central'}</span>
                          </div>
                          {entry.schedule?.startTime && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-sage-600" />
                              <span>
                                {new Date(entry.schedule.startTime).toLocaleDateString('es-CL', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                              <Clock className="w-3.5 h-3.5 text-sage-600 ml-1" />
                              <span>
                                {new Date(entry.schedule.startTime).toLocaleTimeString('es-CL', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action for OFFERED entries */}
                      {isOffered && (
                        <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          <span className="text-xs text-amber-900 font-semibold">
                            Se liberó un cupo. Tienes 1 hora desde la oferta para aceptarlo.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeclineWaitlist(entry.scheduleId)}
                              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition font-medium"
                            >
                              Ceder cupo
                            </button>
                            <button
                              type="button"
                              onClick={() => setAcceptingWaitlistEntry(entry)}
                              className="px-4 py-1.5 bg-[#3a1b38] hover:bg-[#4f244c] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Aceptar Cupo</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
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

      {/* Modal para Aceptar Cupo Ofrecido */}
      {acceptingWaitlistEntry && (
        <WaitlistAcceptModal
          entry={acceptingWaitlistEntry}
          isOpen={true}
          onClose={() => setAcceptingWaitlistEntry(null)}
          onSuccess={() => {
            setAcceptingWaitlistEntry(null);
            fetchBookings();
            fetchWaitlist();
            onRefreshSchedule();
          }}
        />
      )}
    </div>
  );
};
