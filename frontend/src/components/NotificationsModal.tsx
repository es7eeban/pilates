import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Calendar,
  Mail,
  MessageSquare,
  Check,
  RefreshCw,
  Eye,
  Shield,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { notificationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../types/notification';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsChanged?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNotificationsChanged,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'my' | 'admin'>('my');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminLogs, setAdminLogs] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector modal para previsualizar Email y WhatsApp
  const [inspectingNotification, setInspectingNotification] = useState<AppNotification | null>(null);
  const [previewTab, setPreviewTab] = useState<'email' | 'whatsapp'>('email');
  const [copiedText, setCopiedText] = useState(false);

  const fetchMyNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationsApi.getMy();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err: any) {
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const logs = await notificationsApi.getAdminLogs(50);
      setAdminLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'my') {
        fetchMyNotifications();
      } else {
        fetchAdminLogs();
      }
    }
  }, [isOpen, activeTab, fetchMyNotifications, fetchAdminLogs]);

  const handleMarkAsRead = async (id: string) => {
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
  };

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

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_APPROVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'PAYMENT_REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'BOOKING_CANCELLED':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'VOUCHER_UPLOADED':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'BOOKING_CREATED':
      default:
        return <Calendar className="w-5 h-5 text-sage-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PAYMENT_APPROVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">Aprobado</span>;
      case 'PAYMENT_REJECTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">Rechazado</span>;
      case 'BOOKING_CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">Cancelado</span>;
      case 'VOUCHER_UPLOADED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">Comprobante</span>;
      case 'BOOKING_CREATED':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sage-100 text-sage-800">Nueva Reserva</span>;
    }
  };

  const list = activeTab === 'my' ? notifications : adminLogs;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-sand-200 bg-sand-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-sage-900 leading-tight">Centro de Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded-full">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted">
                Confirmaciones de reserva, pagos y avisos en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (activeTab === 'my' ? fetchMyNotifications() : fetchAdminLogs())}
              disabled={loading}
              className="p-2 text-charcoal-muted hover:text-charcoal hover:bg-white rounded-xl border border-transparent hover:border-sand-200 transition"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sage-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-charcoal-muted hover:text-charcoal hover:bg-white rounded-xl border border-transparent hover:border-sand-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs & Controls */}
        <div className="px-6 py-3 bg-white border-b border-sand-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-sand-100 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'my'
                  ? 'bg-white text-sage-900 font-bold shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Mis Avisos
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'admin'
                    ? 'bg-white text-sage-900 font-bold shadow-sm'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-terra" />
                Auditoría Global
              </button>
            )}
          </div>

          {activeTab === 'my' && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-sage-700 hover:text-sage-900 font-semibold flex items-center gap-1 px-3 py-1.5 bg-sage-50 hover:bg-sage-100 rounded-xl border border-sage-200 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todo como leído
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-sand-50/30">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {error}
            </div>
          )}

          {loading && list.length === 0 ? (
            <div className="py-12 text-center text-charcoal-muted">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sage-500 mb-2" />
              <p className="text-xs">Cargando notificaciones...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-charcoal-muted">
              <div className="w-12 h-12 rounded-2xl bg-sand-100 mx-auto flex items-center justify-center text-charcoal-muted mb-3">
                <Bell className="w-6 h-6 opacity-40" />
              </div>
              <h3 className="text-sm font-bold text-charcoal">Sin notificaciones</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                {activeTab === 'my'
                  ? 'Aquí verás los comprobantes de tus clases agendadas, confirmaciones de pago y recordatorios.'
                  : 'Aún no hay notificaciones transaccionales registradas en el sistema.'}
              </p>
            </div>
          ) : (
            list.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition relative ${
                  notif.read
                    ? 'bg-white border-sand-200 hover:border-sand-300'
                    : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sand-50 border border-sand-200 shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(notif.type)}
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sin leer" />
                        )}
                        {notif.metadata?.bookingCode && (
                          <span className="font-mono text-[11px] font-bold text-sage-800 bg-sand-100 px-1.5 py-0.5 rounded">
                            {notif.metadata.bookingCode}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-charcoal-muted">
                        {new Date(notif.createdAt).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-sage-900 leading-snug">
                      {notif.title}
                    </h4>

                    {activeTab === 'admin' && notif.user && (
                      <p className="text-[11px] text-charcoal-muted mt-0.5">
                        Destinatario: <span className="font-semibold text-charcoal">{notif.user.name}</span> ({notif.user.email})
                      </p>
                    )}

                    <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Metadata Action Row */}
                    <div className="mt-3 pt-2.5 border-t border-sand-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {notif.metadata?.email && (
                          <button
                            onClick={() => {
                              setInspectingNotification(notif);
                              setPreviewTab('email');
                            }}
                            className="text-[11px] font-semibold text-sage-700 hover:text-sage-900 hover:underline flex items-center gap-1 bg-sand-100 px-2 py-1 rounded-lg transition"
                          >
                            <Mail className="w-3 h-3 text-sage-600" />
                            Ver Correo Simulado
                          </button>
                        )}

                        {notif.metadata?.whatsapp && (
                          <button
                            onClick={() => {
                              setInspectingNotification(notif);
                              setPreviewTab('whatsapp');
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg transition border border-emerald-200"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            Ver WhatsApp Simulado
                          </button>
                        )}
                      </div>

                      {!notif.read && activeTab === 'my' && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="text-[11px] text-charcoal-muted hover:text-emerald-700 font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-sand-50/80 border-t border-sand-200 flex items-center justify-between text-xs text-charcoal-muted">
          <span>Sistema de mensajería transaccional activo</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-300 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Inspector Modal para Email y WhatsApp simulados */}
      {inspectingNotification && (
        <div className="fixed inset-0 z-60 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-sand-200 bg-sand-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sage-600" />
                <h3 className="text-sm font-bold text-sage-900">
                  Despacho Multicanal: {inspectingNotification.metadata?.bookingCode || 'Notificación'}
                </h3>
              </div>
              <button
                onClick={() => setInspectingNotification(null)}
                className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-lg hover:bg-sand-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de canal */}
            <div className="px-5 py-2.5 bg-sand-100/50 border-b border-sand-200 flex items-center gap-2">
              <button
                onClick={() => setPreviewTab('email')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  previewTab === 'email'
                    ? 'bg-white text-sage-900 shadow-sm'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-sage-600" />
                Email Transaccional
              </button>
              <button
                onClick={() => setPreviewTab('whatsapp')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  previewTab === 'whatsapp'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Mensaje
              </button>
            </div>

            {/* Canal Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              {previewTab === 'email' && inspectingNotification.metadata?.email && (
                <div className="space-y-3">
                  <div className="p-3 bg-sand-50 rounded-xl text-xs border border-sand-200 space-y-1">
                    <div>
                      <span className="text-charcoal-muted font-medium">Para: </span>
                      <strong className="text-charcoal">{inspectingNotification.metadata.email.to}</strong>
                    </div>
                    <div>
                      <span className="text-charcoal-muted font-medium">Asunto: </span>
                      <strong className="text-sage-900">{inspectingNotification.metadata.email.subject}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-sand-200 text-xs font-sans whitespace-pre-wrap leading-relaxed text-charcoal">
                    {inspectingNotification.metadata.email.body}
                  </div>
                </div>
              )}

              {previewTab === 'whatsapp' && inspectingNotification.metadata?.whatsapp && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 rounded-xl text-xs border border-emerald-200">
                    <span className="text-emerald-800 font-medium">Destino celular: </span>
                    <strong className="text-emerald-950">{inspectingNotification.metadata.whatsapp.to || '+569XXXXXXXX'}</strong>
                  </div>

                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-xs text-charcoal whitespace-pre-wrap leading-relaxed relative">
                    {inspectingNotification.metadata.whatsapp.message}
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleCopyText(inspectingNotification.metadata?.whatsapp?.message || '')}
                        className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-sm transition"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar texto
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-sand-200 bg-sand-50 flex justify-end">
              <button
                onClick={() => setInspectingNotification(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-sage-600 hover:bg-sage-700 text-white rounded-xl shadow-sm transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
