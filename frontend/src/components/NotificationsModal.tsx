import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Calendar,
  Check,
  RefreshCw,
  Eye,
  CheckCheck,
  MapPin,
  Clock,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { notificationsApi, bookingsApi, resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../types/notification';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotificationId?: string | null;
  onNotificationsChanged?: () => void;
  onOpenMyBookings?: () => void;
  onOpenAdminVouchers?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  initialNotificationId,
  onNotificationsChanged,
  onOpenMyBookings,
  onOpenAdminVouchers,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de detalle y gestión de la notificación seleccionada
  const [inspectingNotification, setInspectingNotification] = useState<AppNotification | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setInspectingNotification(null);
  }, [user?.id]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationsApi.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        onNotificationsChanged?.();
      } catch (err: any) {
        console.error(err);
      }
    },
    [onNotificationsChanged],
  );

  const fetchMyNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await notificationsApi.getMy();
      // Filtrado defensivo en cliente para garantizar asociación estricta al usuario actual
      const strictlyMine = (res.notifications || []).filter((n) => n.userId === user.id);
      setNotifications(strictlyMine);
      setUnreadCount(strictlyMine.filter((n) => !n.read).length);

      if (initialNotificationId) {
        const target = strictlyMine.find((n) => n.id === initialNotificationId);
        if (target) {
          setInspectingNotification(target);
          setShowRejectInput(false);
          setRejectReason('');
          setActionFeedback(null);
          if (!target.read) {
            handleMarkAsRead(target.id);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar tus notificaciones');
    } finally {
      setLoading(false);
    }
  }, [user, initialNotificationId, handleMarkAsRead]);

  useEffect(() => {
    if (isOpen) {
      fetchMyNotifications();
    } else {
      setInspectingNotification(null);
      setShowRejectInput(false);
      setRejectReason('');
      setActionFeedback(null);
    }
  }, [isOpen, fetchMyNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      onNotificationsChanged?.();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenDetail = (notif: AppNotification) => {
    setInspectingNotification(notif);
    setShowRejectInput(false);
    setRejectReason('');
    setActionFeedback(null);
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
  };

  const handleAdminApproveVoucher = async (bookingId: string, notifId: string) => {
    setProcessingAction(true);
    setActionFeedback(null);
    try {
      await bookingsApi.approveVoucher(bookingId);
      await handleMarkAsRead(notifId);
      setActionFeedback('¡Comprobante aprobado! Se ha enviado la notificación de confirmación al alumno.');
      onNotificationsChanged?.();
      fetchMyNotifications();
    } catch (err: any) {
      setError(err.message || 'No se pudo aprobar el comprobante');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAdminRejectVoucher = async (bookingId: string, notifId: string) => {
    if (!rejectReason.trim()) {
      alert('Indica el motivo del rechazo para informar al alumno.');
      return;
    }
    setProcessingAction(true);
    setActionFeedback(null);
    try {
      await bookingsApi.rejectVoucher(bookingId, rejectReason.trim());
      await handleMarkAsRead(notifId);
      setShowRejectInput(false);
      setActionFeedback('Comprobante rechazado y cupo liberado. Se ha enviado la notificación al alumno.');
      onNotificationsChanged?.();
      fetchMyNotifications();
    } catch (err: any) {
      setError(err.message || 'No se pudo rechazar el comprobante');
    } finally {
      setProcessingAction(false);
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'PAYMENT_REJECTED':
      case 'SCHEDULE_CANCELLED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'BOOKING_CANCELLED':
      case 'SCHEDULE_UPDATED':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'VOUCHER_UPLOADED':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <Calendar className="w-5 h-5 text-sage-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PAYMENT_APPROVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">Pago Aprobado</span>;
      case 'PAYMENT_REJECTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">Pago Rechazado</span>;
      case 'BOOKING_CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">Reserva Cancelada</span>;
      case 'VOUCHER_UPLOADED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">Comprobante por Validar</span>;
      case 'SCHEDULE_UPDATED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900">Cambio de Horario / Sede</span>;
      case 'SCHEDULE_CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">Clase Suspendida</span>;
      case 'WAITLIST_OFFER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">Cupo Liberado</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sage-100 text-sage-800">Aviso de Reserva</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-b border-sand-200 bg-sand-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center shadow-sm shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-sage-900 leading-tight">
                  Avisos & Notificaciones
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded-full">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted line-clamp-1 sm:line-clamp-none">
                {isAdmin
                  ? 'Bandeja personal del administrador: comprobantes recibidos y alertas operativas'
                  : 'Tus avisos personales de confirmación de clases, pagos y cambios de agenda'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-sage-700 hover:text-sage-900 bg-white hover:bg-sand-100 border border-sand-200 rounded-xl transition flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Marcar todo leído</span>
              </button>
            )}
            <button
              onClick={fetchMyNotifications}
              disabled={loading}
              className="p-1.5 sm:p-2 text-charcoal-muted hover:text-charcoal hover:bg-white rounded-xl border border-transparent hover:border-sand-200 transition"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sage-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-charcoal-muted hover:text-charcoal hover:bg-white rounded-xl border border-transparent hover:border-sand-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-3">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-charcoal-muted">
              Cargando tus notificaciones...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-sand-100 text-charcoal-muted flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-charcoal">No tienes notificaciones</p>
              <p className="text-xs text-charcoal-muted max-w-xs mx-auto">
                {isAdmin
                  ? 'Cuando un alumno envíe un comprobante de transferencia, aparecerá aquí para tu validación.'
                  : 'Cuando el administrador valide tu comprobante o haya avisos sobre tus clases, aparecerán aquí.'}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleOpenDetail(n)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  !n.read
                    ? 'bg-sage-50/60 border-sage-300 shadow-xs hover:border-sage-400'
                    : 'bg-white border-sand-200 hover:border-sand-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(n.type)}
                        {n.metadata?.bookingCode && (
                          <span className="font-mono text-[11px] font-bold text-sage-800 bg-sand-100 px-2 py-0.5 rounded">
                            {n.metadata.bookingCode}
                          </span>
                        )}
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Sin leer" />
                        )}
                      </div>
                      <span className="text-[11px] text-charcoal-muted">
                        {new Date(n.createdAt).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-charcoal leading-snug">{n.title}</h4>
                    <p className="text-xs text-charcoal-muted mt-1 line-clamp-2">{n.message}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(n);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#3a1b38] hover:bg-[#261025] text-white text-[11px] font-bold transition inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Abrir y Gestionar Notificación</span>
                      </button>

                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(n.id);
                          }}
                          className="text-[11px] font-semibold text-sage-700 hover:text-sage-900 inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sub-Modal: Detalle y Gestión Directa de la Notificación Seleccionada */}
        {inspectingNotification && (
          <div className="fixed inset-0 z-60 bg-charcoal/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-sand-200 bg-sand-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {getTypeIcon(inspectingNotification.type)}
                  <div>
                    <h3 className="text-sm font-bold text-sage-900">Detalle de la Notificación</h3>
                    <span className="text-[11px] text-charcoal-muted">
                      {new Date(inspectingNotification.createdAt).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingNotification(null)}
                  className="p-1.5 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(inspectingNotification.type)}
                  {inspectingNotification.metadata?.bookingCode && (
                    <span className="font-mono text-xs font-bold text-sage-900 bg-sand-100 px-2.5 py-0.5 rounded-lg border border-sand-200">
                      Código: {inspectingNotification.metadata.bookingCode}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-charcoal">
                    {inspectingNotification.title}
                  </h4>
                  <p className="text-xs text-charcoal leading-relaxed mt-1.5 bg-sand-50/80 p-3.5 rounded-2xl border border-sand-200">
                    {inspectingNotification.message}
                  </p>
                </div>

                {/* Datos asociados a la reserva o sesión */}
                {(inspectingNotification.metadata?.branchName ||
                  inspectingNotification.metadata?.startTime ||
                  inspectingNotification.metadata?.studentName ||
                  inspectingNotification.metadata?.reason) && (
                  <div className="p-4 rounded-2xl bg-white border border-sand-200 space-y-2 text-xs">
                    {inspectingNotification.metadata?.studentName && (
                      <div className="flex items-center justify-between">
                        <span className="text-charcoal-muted">Alumno:</span>
                        <span className="font-bold text-charcoal">
                          {inspectingNotification.metadata.studentName} ({inspectingNotification.metadata.studentEmail})
                        </span>
                      </div>
                    )}
                    {inspectingNotification.metadata?.branchName && (
                      <div className="flex items-center justify-between">
                        <span className="text-charcoal-muted flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-sage-600" /> Sede:
                        </span>
                        <span className="font-bold text-charcoal">
                          {inspectingNotification.metadata.branchName}
                        </span>
                      </div>
                    )}
                    {inspectingNotification.metadata?.startTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-charcoal-muted flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sage-600" /> Fecha y Hora:
                        </span>
                        <span className="font-semibold text-charcoal">
                          {new Date(inspectingNotification.metadata.startTime).toLocaleDateString('es-CL', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC',
                          })}{' '}
                          ·{' '}
                          {new Date(inspectingNotification.metadata.startTime).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}{' '}
                          hrs
                        </span>
                      </div>
                    )}
                    {inspectingNotification.metadata?.reason && (
                      <div className="pt-2 border-t border-sand-100">
                        <span className="text-charcoal-muted block mb-0.5">Motivo informado:</span>
                        <span className="font-semibold text-red-700">
                          "{inspectingNotification.metadata.reason}"
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {actionFeedback && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{actionFeedback}</span>
                  </div>
                )}

                {/* Gestión directa de Voucher para el Administrador */}
                {isAdmin &&
                  inspectingNotification.type === 'VOUCHER_UPLOADED' &&
                  inspectingNotification.metadata?.bookingId && (
                    <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sage-900">
                          Gestión de Comprobante Recibido
                        </span>
                        {inspectingNotification.metadata?.voucherUrl && (
                          <a
                            href={resolveMediaUrl(inspectingNotification.metadata.voucherUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-[#3a1b38] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Ver Archivo Adjunto</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {!actionFeedback && (
                        <>
                          {!showRejectInput ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={processingAction}
                                onClick={() =>
                                  handleAdminApproveVoucher(
                                    inspectingNotification.metadata!.bookingId!,
                                    inspectingNotification.id,
                                  )
                                }
                                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{processingAction ? 'Procesando...' : 'Aprobar Pago'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={processingAction}
                                onClick={() => setShowRejectInput(true)}
                                className="py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo del rechazo (ej. Monto incompleto o imagen ilegible)"
                                className="w-full px-3 py-2 text-xs bg-white border border-sand-300 rounded-xl focus:outline-none focus:border-red-500"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowRejectInput(false)}
                                  className="px-3 py-1.5 text-xs font-semibold text-charcoal-muted hover:text-charcoal"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={processingAction}
                                  onClick={() =>
                                    handleAdminRejectVoucher(
                                      inspectingNotification.metadata!.bookingId!,
                                      inspectingNotification.id,
                                    )
                                  }
                                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50"
                                >
                                  Confirmar Rechazo
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                {/* Acciones rápidas para el Alumno */}
                {!isAdmin && onOpenMyBookings && (
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingNotification(null);
                        onClose();
                        onOpenMyBookings();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#3a1b38] hover:bg-[#261025] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Ir a Mis Reservas Activas</span>
                    </button>
                  </div>
                )}

                {isAdmin && onOpenAdminVouchers && inspectingNotification.type === 'VOUCHER_UPLOADED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingNotification(null);
                      onClose();
                      onOpenAdminVouchers();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-sand-100 text-charcoal border border-sand-200 text-xs font-semibold transition"
                  >
                    Abrir bandeja completa de Validación de Pagos
                  </button>
                )}
              </div>

              <div className="px-6 py-3.5 border-t border-sand-200 bg-sand-50/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingNotification(null)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-sand-100 text-charcoal border border-sand-200 text-xs font-bold transition"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
