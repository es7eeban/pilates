import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, AlertCircle, Link2, CheckCircle2 } from 'lucide-react';

interface VoucherDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  urlFallback?: string;
  onUrlFallbackChange?: (url: string) => void;
  disabled?: boolean;
}

export const VoucherDropzone: React.FC<VoucherDropzoneProps> = ({
  file,
  onFileChange,
  urlFallback = '',
  onUrlFallbackChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const validateAndSelectFile = (selectedFile: File) => {
    setErrorMessage(null);

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrorMessage('Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage('El tamaño del archivo supera el límite de 5 MB.');
      return;
    }

    onFileChange(selectedFile);
    if (onUrlFallbackChange) onUrlFallbackChange('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    onFileChange(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-charcoal uppercase tracking-wider">
          Comprobante de Transferencia
        </label>
        {onUrlFallbackChange && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-sage-700 hover:text-sage-900 font-medium inline-flex items-center gap-1 hover:underline"
          >
            <Link2 className="w-3 h-3" />
            {showUrlInput ? 'Cargar archivo' : 'O usar enlace URL'}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {showUrlInput ? (
        <div className="space-y-1">
          <input
            type="url"
            value={urlFallback}
            onChange={(e) => {
              if (onUrlFallbackChange) onUrlFallbackChange(e.target.value);
              if (file) handleRemoveFile();
            }}
            placeholder="https://ejemplo.com/comprobante.pdf"
            disabled={disabled}
            className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl text-xs focus:ring-2 focus:ring-sage-500 focus:outline-none"
          />
          <span className="text-[10px] text-charcoal-muted">
            Pega una URL directa donde esté alojado tu comprobante bancario.
          </span>
        </div>
      ) : file ? (
        /* Selected File Card */
        <div className="p-3 bg-sage-50/70 border border-sage-300 rounded-xl flex items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3 overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa comprobante"
                className="w-12 h-12 rounded-lg object-cover border border-sage-300 shadow-sm shrink-0"
              />
            ) : file.type === 'application/pdf' ? (
              <div className="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 border border-red-200">
                <FileText className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-sage-200 text-sage-800 flex items-center justify-center shrink-0">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-sage-900 truncate" title={file.name}>
                  {file.name}
                </p>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <p className="text-[11px] text-charcoal-muted mt-0.5">
                {formatFileSize(file.size)} · {file.type === 'application/pdf' ? 'Documento PDF' : 'Imagen'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            disabled={disabled}
            className="p-1 text-charcoal-muted hover:text-red-600 rounded-lg hover:bg-red-50 transition shrink-0"
            title="Quitar archivo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Drag and Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
            isDragging
              ? 'border-sage-600 bg-sage-50 ring-2 ring-sage-500/20'
              : 'border-sand-300 hover:border-sage-400 bg-sand-50/50 hover:bg-sand-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={disabled}
          />
          <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center mx-auto mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-sage-900">
            Haz clic para seleccionar o arrastra tu comprobante aquí
          </p>
          <p className="text-[10px] text-charcoal-muted mt-1">
            Formatos aceptados: JPG, PNG, WEBP o PDF (Máximo 5 MB)
          </p>
        </div>
      )}
    </div>
  );
};
