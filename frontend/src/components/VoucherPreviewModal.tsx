import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { resolveMediaUrl, isPdfDocument } from '../services/api';

interface VoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherUrl: string | null;
  bookingCode?: string;
  clientName?: string;
  classTitle?: string;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  voucherUrl,
  bookingCode,
  clientName,
  classTitle,
  onApprove,
  onReject,
  isProcessing = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !voucherUrl) return null;

  const fullUrl = resolveMediaUrl(voucherUrl);
  const isPdf = isPdfDocument(voucherUrl);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-charcoal/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100 bg-sand-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-100 text-sage-800 rounded-xl">
              {isPdf ? <FileText className="w-5 h-5" /> : <RotateCw className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-sage-900">
                  Comprobante de Transferencia
                </h3>
                {bookingCode && (
                  <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-sage-200/80 text-sage-900">
                    {bookingCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {clientName ? `Alumno: ${clientName}` : ''}{' '}
                {classTitle ? `· Clase: ${classTitle}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-charcoal-muted hover:text-sage-800 rounded-xl hover:bg-sand-200/60 transition"
              title="Abrir original en nueva pestaña"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={fullUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-charcoal-muted hover:text-sage-800 rounded-xl hover:bg-sand-200/60 transition"
              title="Descargar comprobante"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-charcoal-muted hover:text-charcoal rounded-xl hover:bg-sand-200/60 transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Toolbar for Images */}
        {!isPdf && (
          <div className="flex items-center justify-center gap-3 py-2 px-4 bg-sand-100/60 border-b border-sand-200 text-xs text-charcoal">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white rounded-lg transition"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] font-bold w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white rounded-lg transition"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-sand-300 mx-1" />
            <button
              onClick={handleRotate}
              className="p-1.5 hover:bg-white rounded-lg transition flex items-center gap-1"
              title="Girar 90°"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Girar</span>
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-[11px] hover:bg-white rounded-lg transition font-medium"
            >
              Restablecer
            </button>
          </div>
        )}

        {/* Main Viewer Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-sand-100/30 min-h-[350px]">
          {isPdf ? (
            <div className="w-full h-[60vh] rounded-xl overflow-hidden border border-sand-200 shadow-inner bg-white">
              <iframe
                src={fullUrl}
                title="Visor PDF de Comprobante"
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh] max-w-full flex items-center justify-center p-2">
              <img
                src={fullUrl}
                alt="Comprobante de transferencia bancaria"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md border border-sand-200 select-none"
              />
            </div>
          )}
        </div>

        {/* Footer with actions (if admin) */}
        {(onApprove || onReject) && (
          <div className="px-5 py-3 border-t border-sand-200 bg-sand-50/70 flex items-center justify-between gap-3">
            <span className="text-xs text-charcoal-muted">
              Resolución rápida para esta transferencia:
            </span>
            <div className="flex items-center gap-2">
              {onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isProcessing}
                  className="px-3.5 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              )}
              {onApprove && (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-sage-800 hover:bg-sage-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Aprobar Transferencia
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
