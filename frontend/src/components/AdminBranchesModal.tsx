import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Building2,
  MapPin,
  Phone,
  Edit2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Power,
} from 'lucide-react';
import type { Branch } from '../types/schedule';
import type { CreateBranchPayload, UpdateBranchPayload } from '../types/admin';
import { branchesApi } from '../services/api';

interface AdminBranchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchesUpdated?: () => void;
}

export const AdminBranchesModal: React.FC<AdminBranchesModalProps> = ({
  isOpen,
  onClose,
  onBranchesUpdated,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [commune, setCommune] = useState('');
  const [city, setCity] = useState('Santiago');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await branchesApi.getAll(true);
      setBranches(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sedes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
      setIsFormOpen(false);
      setEditingBranch(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setName('');
    setSlug('');
    setAddress('');
    setCommune('');
    setCity('Santiago');
    setPhone('');
    setIsFormOpen(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setSlug(branch.slug);
    setAddress(branch.address);
    setCommune(branch.commune || '');
    setCity(branch.city || 'Santiago');
    setPhone(branch.phone || '');
    setIsFormOpen(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleGenerateSlug = (val: string) => {
    setName(val);
    if (!editingBranch) {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError('Nombre y dirección son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingBranch) {
        const payload: UpdateBranchPayload = {
          name: name.trim(),
          slug: slug.trim() || undefined,
          address: address.trim(),
          commune: commune.trim() || undefined,
          city: city.trim() || 'Santiago',
          phone: phone.trim() || undefined,
        };
        await branchesApi.update(editingBranch.id, payload);
        setSuccessMsg(`Sede "${name}" actualizada con éxito`);
      } else {
        const payload: CreateBranchPayload = {
          name: name.trim(),
          slug: slug.trim() || undefined,
          address: address.trim(),
          commune: commune.trim() || undefined,
          city: city.trim() || 'Santiago',
          phone: phone.trim() || undefined,
        };
        await branchesApi.create(payload);
        setSuccessMsg(`Sede "${name}" creada con éxito`);
      }

      setIsFormOpen(false);
      setEditingBranch(null);
      await fetchBranches();
      if (onBranchesUpdated) onBranchesUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sede');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    const actionName = branch.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${actionName} la sede "${branch.name}"?`)) return;

    setActionLoadingId(branch.id);
    setError(null);
    try {
      await branchesApi.update(branch.id, { isActive: !branch.isActive });
      await fetchBranches();
      if (onBranchesUpdated) onBranchesUpdated();
    } catch (err: any) {
      setError(err.message || `Error al ${actionName} la sede`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-sand-200 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-sand-100 bg-sand-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-sage-900">Gestión de Sedes</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-terra-light text-terra border border-terra/20">
                Admin
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5 line-clamp-1 sm:line-clamp-none">
              Crea, edita y administra los estudios físicos de pilates disponibles
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                onClick={handleOpenCreate}
                className="px-3 py-1.5 bg-sage-800 hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva Sede</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-muted hover:text-charcoal rounded-full hover:bg-sand-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Modal/Section */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="p-4 bg-sand-50/80 rounded-2xl border border-sand-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                <h3 className="text-sm font-bold text-sage-900">
                  {editingBranch ? `Editar Sede: ${editingBranch.name}` : 'Registrar Nueva Sede'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-charcoal mb-1">Nombre de la Sede *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleGenerateSlug(e.target.value)}
                    placeholder="Ej. Sede Providencia"
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Slug (Identificador URL) *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="ej. sede-providencia"
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-charcoal mb-1">Dirección Completa *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Av. Providencia 1234, Piso 3"
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Comuna</label>
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Ej. Providencia"
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Santiago"
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-charcoal mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 text-xs text-charcoal-muted hover:text-charcoal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sage-800 hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {editingBranch ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
              </div>
            </form>
          )}

          {/* List of Branches */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sage-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-12 text-charcoal-muted">
              <Building2 className="w-10 h-10 mx-auto text-sage-400 mb-2" />
              <p className="text-sm font-semibold text-charcoal">No hay sedes registradas</p>
              <p className="text-xs mt-1">Crea la primera sede utilizando el botón superior.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                    b.isActive
                      ? 'border-sand-200 bg-sand-50/30 hover:bg-white hover:shadow-sm'
                      : 'border-stone-200 bg-stone-50/80 opacity-75'
                  }`}
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${b.isActive ? 'text-sage-700' : 'text-stone-400'}`} />
                        <h4 className="font-bold text-sm text-sage-900">{b.name}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          b.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-stone-200 text-stone-600 border-stone-300'
                        }`}
                      >
                        {b.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div className="space-y-1 text-charcoal-muted pt-1">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sage-600 shrink-0 mt-0.5" />
                        <span>
                          {b.address}{b.commune ? `, ${b.commune}` : ''} ({b.city})
                        </span>
                      </div>
                      {b.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                          <span>{b.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-200/60">
                    <button
                      onClick={() => handleToggleActive(b)}
                      disabled={actionLoadingId === b.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
                        b.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={b.isActive ? 'Desactivar sede' : 'Activar sede'}
                    >
                      {actionLoadingId === b.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Power className="w-3 h-3" />
                      )}
                      <span>{b.isActive ? 'Desactivar' : 'Activar'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sand-200/70 hover:bg-sand-200 text-charcoal border border-sand-300 transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3 text-sage-700" />
                      <span>Editar</span>
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
