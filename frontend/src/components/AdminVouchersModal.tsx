import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, ExternalLink, Loader2, AlertCircle, Building2, User, Calendar } from 'lucide-react';
import type { Booking } from '../types/schedule';
import { bookingsApi } from '../services/api';

interface AdminVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const AdminVouchersModal: React.FC<AdminVouchersModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingsApi.getPendingVouchers();
      setPendingBookings(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar comprobantes pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPending();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async (id: string) => {
    if (!window.confirm('¿Aprobar comprobante y confirmar la reserva del alumno?')) return;
    setProcessingId(id);
    try {
      await bookingsApi.approveVoucher(id);
      await fetchPending();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Error al aprobar comprobante');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Indica el motivo del rechazo del comprobante (el cupo será liberado):');
    if (!reason || !reason.trim()) return;

    setProcessingId(id);
    try {
      await bookingsApi.rejectVoucher(id, reason.trim());
      await fetchPending();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Error al rechazar comprobante');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-sage-900">Bandeja de Transferencias</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-terra-light text-terra border border-terra/20">
                Admin
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Revisa los comprobantes bancarios cargados por los alumnos para aprobar o liberar cupos
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
          ) : pendingBookings.length === 0 ? (
            <div className="text-center py-12 text-charcoal-muted">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-charcoal">¡Al día! No hay comprobantes pendientes de validación</p>
              <p className="text-xs mt-1">Todas las transferencias registradas han sido procesadas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-sand-200 bg-sand-50/40 hover:bg-white hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sage-900 bg-sage-100 px-2 py-0.5 rounded">
                        {b.bookingCode}
                      </span>
                      <span className="font-bold text-charcoal">{b.schedule?.classType?.title}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-charcoal-muted">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-sage-600" />
                        <span>{b.user?.name} ({b.user?.email})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-sage-600" />
                        <span>{b.schedule?.branch?.name || 'Sede Central'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sage-600" />
                        <span>
                          {new Date(b.schedule?.startTime).toLocaleDateString('es-CL')} · {new Date(b.schedule?.startTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {b.voucherUrl ? (
                      <div className="pt-1">
                        <a
                          href={b.voucherUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sage-700 hover:text-sage-900 font-semibold underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver Comprobante Adjunto
                        </a>
                      </div>
                    ) : (
                      <span className="text-amber-700 text-[11px]">Sin URL de comprobante directo</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(b.id)}
                      disabled={processingId === b.id}
                      className="px-3 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={processingId === b.id}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-1"
                    >
                      {processingId === b.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
