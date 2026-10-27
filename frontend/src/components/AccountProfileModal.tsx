import React, { useEffect, useState } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Save,
  Landmark,
  CreditCard,
  Hash,
  FileText,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { branchesApi, authApi } from '../services/api';
import type { Branch } from '../types/schedule';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

const CHILEAN_BANKS = [
  'Banco de Chile',
  'Banco Santander',
  'Banco Estado',
  'Banco BCI',
  'Banco Itaú',
  'Scotiabank Chile',
  'Banco BICE',
  'Banco Security',
  'Banco Falabella',
  'Banco Consorcio',
  'Mercado Pago / Tenpo',
  'Otro Banco',
];

const ACCOUNT_TYPES = [
  'Cuenta Corriente',
  'Cuenta Vista / Cuenta RUT',
  'Cuenta de Ahorro',
  'Cuenta Empresa / SpA',
];

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const { user, updatePreferences } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [favoriteBranchId, setFavoriteBranchId] = useState<string | null>(null);
  const [favoriteTimeSchedule, setFavoriteTimeSchedule] = useState<string | null>(null);

  // Datos bancarios del Administrador (para Pasarela de Pago y Transferencias de Alumnos)
  const [bankName, setBankName] = useState('Banco de Chile');
  const [bankAccountType, setBankAccountType] = useState('Cuenta Corriente');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountRut, setBankAccountRut] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankPaymentEmail, setBankPaymentEmail] = useState('');
  const [bankPaymentNotes, setBankPaymentNotes] = useState('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setFavoriteBranchId(user.favoriteBranchId || null);
      setFavoriteTimeSchedule(user.favoriteTimeSchedule || null);
      setError(null);
      setSuccessMsg(null);

      if (user.role === 'ADMIN') {
        // Inicializar desde el perfil del admin o consultar valores vigentes del estudio
        setBankName(user.bankName || 'Banco de Chile');
        setBankAccountType(user.bankAccountType || 'Cuenta Corriente');
        setBankAccountNumber(user.bankAccountNumber || '00-123-45678-90');
        setBankAccountRut(user.bankAccountRut || '76.543.210-K');
        setBankAccountHolder(user.bankAccountHolder || user.name || 'K PILATES SpA');
        setBankPaymentEmail(user.bankPaymentEmail || user.email || 'pagos@estudiopilates.cl');
        setBankPaymentNotes(
          user.bankPaymentNotes ||
            'Indica tu nombre o código de reserva en el comentario de la transferencia.',
        );

        authApi
          .getStudioBankInfo()
          .then((info) => {
            setBankName(user.bankName || info.bankName || 'Banco de Chile');
            setBankAccountType(user.bankAccountType || info.bankAccountType || 'Cuenta Corriente');
            setBankAccountNumber(user.bankAccountNumber || info.bankAccountNumber || '');
            setBankAccountRut(user.bankAccountRut || info.bankAccountRut || '');
            setBankAccountHolder(user.bankAccountHolder || info.bankAccountHolder || user.name);
            setBankPaymentEmail(user.bankPaymentEmail || info.bankPaymentEmail || user.email);
            setBankPaymentNotes(user.bankPaymentNotes ?? info.bankPaymentNotes ?? '');
          })
          .catch(() => {
            // Mantener valores locales
          });
      }

      setLoadingBranches(true);
      branchesApi
        .getAll(false)
        .then((data) => setBranches(data))
        .catch(() => setBranches([]))
        .finally(() => setLoadingBranches(false));
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isClient = user.role === 'CLIENT';
  const isAdmin = user.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Nombre, correo electrónico y teléfono son obligatorios.');
      return;
    }

    if (isAdmin && (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountRut.trim())) {
      setError(
        'Por favor completa al menos el Banco, Número de Cuenta y RUT para las transferencias y pasarela de pago.',
      );
      return;
    }

    setSaving(true);
    try {
      await updatePreferences({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        favoriteBranchId: isClient ? favoriteBranchId : user.favoriteBranchId,
        favoriteTimeSchedule: isClient ? favoriteTimeSchedule : user.favoriteTimeSchedule,
        ...(isAdmin && {
          bankName: bankName.trim(),
          bankAccountType: bankAccountType.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountRut: bankAccountRut.trim(),
          bankAccountHolder: bankAccountHolder.trim() || name.trim(),
          bankPaymentEmail: bankPaymentEmail.trim() || email.trim(),
          bankPaymentNotes: bankPaymentNotes.trim() || null,
        }),
      });
      setSuccessMsg(
        isAdmin
          ? 'Tus datos de contacto y la cuenta bancaria del estudio se actualizaron correctamente. Los alumnos ya verán estos datos al transferir.'
          : 'Tus datos de cuenta y preferencias se actualizaron correctamente.',
      );
      onProfileUpdated?.();
    } catch (err: any) {
      setError(err.message || 'No se pudieron actualizar los datos de tu cuenta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-sand-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-sand-200 bg-sand-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-sage-900 leading-tight">Mi Cuenta</h2>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-terra-light text-terra border border-terra/20">
                    <Shield className="w-2.5 h-2.5" /> Administrador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserIcon className="w-2.5 h-2.5" /> Alumno
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted">
                {isClient
                  ? 'Actualiza tus datos de contacto y elige tu sede favorita para tus sesiones'
                  : 'Gestiona tus datos administrativos y la cuenta bancaria para transferencias y futura pasarela de pagos'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-charcoal-muted hover:text-charcoal hover:bg-white rounded-xl border border-transparent hover:border-sand-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Datos de Contacto */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-[#3a1b38]" />
              <span>Datos de Contacto</span>
            </h3>

            <div className="grid grid-cols-1 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-charcoal mb-1.5">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                    placeholder="Tu nombre y apellido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-charcoal mb-1.5">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                      placeholder="correo@ejemplo.cl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1.5">
                    Teléfono / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Datos Bancarios del Administrador (Para Pasarela de Pago y Transferencias) */}
          {isAdmin && (
            <div className="pt-5 border-t border-sand-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3a1b38] flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-[#d92676]" />
                    <span>Cuenta Bancaria del Estudio (Transferencias & Pasarela de Pago)</span>
                  </h3>
                  <p className="text-xs text-charcoal-muted mt-1">
                    Esta cuenta se muestra en vivo a los alumnos cuando reservan por transferencia y quedará vinculada para recibir los abonos cuando activemos la pasarela de pago online.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-[#3a1b38] border border-purple-200 shrink-0 self-start">
                  <CreditCard className="w-3 h-3 text-[#d92676]" /> Sincronizado con Alumnos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Banco / Institución Financiera *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      list="chilean-banks-list"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                      placeholder="Ej. Banco de Chile"
                      className="w-full pl-9 pr-3 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                    />
                    <datalist id="chilean-banks-list">
                      {CHILEAN_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={bankAccountType}
                    onChange={(e) => setBankAccountType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Número de Cuenta *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      required
                      placeholder="Ej. 00-123-45678-90"
                      className="w-full pl-9 pr-3 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-mono font-semibold focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    RUT del Titular / Empresa *
                  </label>
                  <input
                    type="text"
                    value={bankAccountRut}
                    onChange={(e) => setBankAccountRut(e.target.value)}
                    required
                    placeholder="Ej. 76.543.210-K o 15.432.198-7"
                    className="w-full px-3.5 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-mono font-semibold focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Nombre o Razón Social del Titular *
                  </label>
                  <input
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    required
                    placeholder="Ej. K PILATES SpA"
                    className="w-full px-3.5 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    Correo para Comprobantes / Notificación *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={bankPaymentEmail}
                      onChange={(e) => setBankPaymentEmail(e.target.value)}
                      required
                      placeholder="pagos@estudiopilates.cl"
                      className="w-full pl-9 pr-3 py-2.5 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal font-medium focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-charcoal mb-1">
                    Instrucciones / Glosa para los Alumnos (Opcional)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-charcoal-muted absolute left-3 top-3" />
                    <input
                      type="text"
                      value={bankPaymentNotes}
                      onChange={(e) => setBankPaymentNotes(e.target.value)}
                      placeholder="Ej. Indica tu nombre o código de reserva en el asunto de la transferencia"
                      className="w-full pl-9 pr-3 py-2 bg-sand-50/70 border border-sand-300 rounded-xl text-charcoal focus:bg-white focus:outline-none focus:border-[#3a1b38]"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa en Vivo para Alumnos */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#220622]">
                    Vista previa que verán los alumnos al pagar por transferencia:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#3a1b38] border border-purple-200">
                    En Vivo
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-charcoal-muted pt-1">
                  <div>
                    Banco: <strong className="text-charcoal">{bankName || '—'}</strong>
                  </div>
                  <div>
                    Tipo: <strong className="text-charcoal">{bankAccountType || '—'}</strong>
                  </div>
                  <div>
                    N° Cuenta:{' '}
                    <strong className="text-charcoal font-mono">{bankAccountNumber || '—'}</strong>
                  </div>
                  <div>
                    RUT: <strong className="text-charcoal font-mono">{bankAccountRut || '—'}</strong>
                  </div>
                  <div>
                    Titular: <strong className="text-charcoal">{bankAccountHolder || name || '—'}</strong>
                  </div>
                  <div>
                    Email: <strong className="text-charcoal">{bankPaymentEmail || email || '—'}</strong>
                  </div>
                </div>
                {bankPaymentNotes && (
                  <p className="text-[11px] text-[#3a1b38] italic pt-1 border-t border-purple-200/60">
                    “{bankPaymentNotes}”
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. Selección de Sede Favorita (Exclusivo Alumno) */}
          {isClient && (
            <div className="pt-4 border-t border-sand-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>Mi Sede Favorita</span>
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  Al elegir tu sede favorita, verás en primer lugar sus próximas sesiones disponibles en tu pantalla de Inicio y Agenda en Vivo.
                </p>
              </div>

              {loadingBranches ? (
                <div className="p-4 text-xs text-charcoal-muted bg-sand-50 rounded-2xl border border-sand-200">
                  Cargando sedes disponibles...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFavoriteBranchId(null)}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start justify-between gap-2 ${
                      favoriteBranchId === null
                        ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-sm'
                        : 'bg-sand-50/60 hover:bg-sand-100 text-charcoal border-sand-200'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">Sin sede fija</span>
                      <span
                        className={`text-[11px] block mt-0.5 ${
                          favoriteBranchId === null ? 'text-rose-100/80' : 'text-charcoal-muted'
                        }`}
                      >
                        Ver todas las sedes por igual
                      </span>
                    </div>
                    {favoriteBranchId === null && (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                    )}
                  </button>

                  {branches.map((branch) => {
                    const selected = favoriteBranchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setFavoriteBranchId(branch.id)}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-start justify-between gap-2 ${
                          selected
                            ? 'bg-[#3a1b38] text-white border-[#3a1b38] shadow-sm'
                            : 'bg-sand-50/60 hover:bg-sand-100 text-charcoal border-sand-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <MapPin
                              className={`w-3.5 h-3.5 shrink-0 ${
                                selected ? 'text-amber-300' : 'text-sage-600'
                              }`}
                            />
                            <span className="text-xs font-bold truncate">{branch.name}</span>
                          </div>
                          <span
                            className={`text-[11px] block mt-0.5 truncate ${
                              selected ? 'text-rose-100/80' : 'text-charcoal-muted'
                            }`}
                          >
                            {branch.address}
                          </span>
                        </div>
                        <Star
                          className={`w-4 h-4 shrink-0 ${
                            selected ? 'fill-amber-400 text-amber-400' : 'text-sand-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preferencia de Horario AM / PM */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-charcoal mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sage-600" />
                  <span>Jornada Horaria Preferida (Opcional)</span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { key: null, label: 'Cualquiera (AM / PM)' },
                    { key: 'AM', label: 'Horario AM (Mañana)' },
                    { key: 'PM', label: 'Horario PM (Tarde)' },
                  ].map((opt) => {
                    const active = favoriteTimeSchedule === opt.key;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setFavoriteTimeSchedule(opt.key)}
                        className={`py-2 px-3 rounded-xl font-semibold border transition ${
                          active
                            ? 'bg-sage-700 text-white border-sage-700 shadow-xs'
                            : 'bg-sand-50 text-charcoal hover:bg-sand-100 border-sand-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-sand-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-charcoal hover:bg-sand-100 border border-sand-200 transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3a1b38] hover:bg-[#261025] text-white shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
