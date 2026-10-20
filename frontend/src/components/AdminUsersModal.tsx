import React, { useEffect, useState } from 'react';
import {
  X,
  Search,
  Plus,
  User as UserIcon,
  Shield,
  Phone,
  Mail,
  Edit2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Power,
  Building2,
  KeyRound,
} from 'lucide-react';
import type { User, UserRole } from '../types/auth';
import type { Branch } from '../types/schedule';
import type { AdminCreateUserPayload, AdminUpdateUserPayload } from '../types/admin';
import { usersApi, branchesApi } from '../services/api';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsersUpdated?: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  onUsersUpdated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [isInstructor, setIsInstructor] = useState(false);
  const [favoriteBranchId, setFavoriteBranchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getAll({
        search: searchTerm.trim() || undefined,
        role: selectedRoleFilter === 'ALL' ? undefined : selectedRoleFilter,
      });
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const branchList = await branchesApi.getAll(true);
      setBranches(branchList);
    } catch {
      // Ignorar fallo de sedes secundario
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchBranches();
      setIsFormOpen(false);
      setEditingUser(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, selectedRoleFilter]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('CLIENT');
    setIsInstructor(false);
    setFavoriteBranchId('');
    setIsFormOpen(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setPassword('');
    setRole(u.role === 'INSTRUCTOR' ? 'ADMIN' : u.role);
    setIsInstructor(u.isInstructor);
    setFavoriteBranchId(u.favoriteBranchId || '');
    setIsFormOpen(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Nombre, email y teléfono son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingUser) {
        const payload: AdminUpdateUserPayload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password.trim() ? password.trim() : undefined,
          role,
          isInstructor: role === 'ADMIN' ? true : isInstructor,
          favoriteBranchId: favoriteBranchId || null,
        };
        await usersApi.update(editingUser.id, payload);
        setSuccessMsg(`Usuario "${name}" actualizado con éxito`);
      } else {
        const payload: AdminCreateUserPayload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password.trim() ? password.trim() : 'Pilates123!',
          role,
          isInstructor: role === 'ADMIN',
          favoriteBranchId: favoriteBranchId || undefined,
        };
        await usersApi.create(payload);
        setSuccessMsg(`Usuario "${name}" creado exitosamente`);
      }

      setIsFormOpen(false);
      setEditingUser(null);
      await fetchUsers();
      if (onUsersUpdated) onUsersUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    const actionName = u.isActive !== false ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${actionName} el acceso de "${u.name}"?`)) return;

    setActionLoadingId(u.id);
    setError(null);
    try {
      await usersApi.toggleActive(u.id);
      await fetchUsers();
      if (onUsersUpdated) onUsersUpdated();
    } catch (err: any) {
      setError(err.message || `Error al ${actionName} usuario`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'ADMIN':
      case 'INSTRUCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-terra-light text-terra border border-terra/20">
            <Shield className="w-3 h-3" /> Administrador
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserIcon className="w-3 h-3" /> Alumno
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-100 bg-sand-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-sage-900">Gestión de Usuarios</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-terra-light text-terra border border-terra/20">
                Admin · V1
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Administra cuentas de alumnos y administradores del estudio
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                onClick={handleOpenCreate}
                className="px-3 py-1.5 bg-sage-800 hover:bg-sage-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Usuario
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

        {/* Filters bar */}
        {!isFormOpen && (
          <div className="p-4 bg-sand-50/40 border-b border-sand-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, email o tel..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-sand-300 rounded-xl text-xs focus:ring-2 focus:ring-sage-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedRoleFilter === 'ALL'
                    ? 'bg-sage-800 text-white'
                    : 'bg-white text-charcoal hover:bg-sand-100 border border-sand-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedRoleFilter('CLIENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedRoleFilter === 'CLIENT'
                    ? 'bg-sage-800 text-white'
                    : 'bg-white text-charcoal hover:bg-sand-100 border border-sand-200'
                }`}
              >
                Alumnos
              </button>
              <button
                onClick={() => setSelectedRoleFilter('ADMIN')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedRoleFilter === 'ADMIN'
                    ? 'bg-sage-800 text-white'
                    : 'bg-white text-charcoal hover:bg-sand-100 border border-sand-200'
                }`}
              >
                Administradores
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
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

          {/* Form Create / Edit */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="p-4 bg-sand-50/80 rounded-2xl border border-sand-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                <h3 className="text-sm font-bold text-sage-900">
                  {editingUser ? `Editar Usuario: ${editingUser.name}` : 'Crear Nuevo Usuario'}
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
                  <label className="block font-semibold text-charcoal mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Sofía Valenzuela"
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sofia@ejemplo.cl"
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Teléfono Móvil *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+56 9 8765 4321"
                    required
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    {editingUser ? 'Nueva Contraseña (Opcional para restablecer)' : 'Contraseña Inicial (Opcional)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Por defecto: Pilates123!'}
                      className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none font-mono text-[11px]"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-charcoal-muted absolute right-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Rol en el Sistema *</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setRole(nextRole);
                      setIsInstructor(nextRole === 'ADMIN');
                    }}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  >
                    <option value="CLIENT">Alumno / Cliente (CLIENT)</option>
                    <option value="ADMIN">Administrador General (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal mb-1">Sede Favorita / Asignada</label>
                  <select
                    value={favoriteBranchId}
                    onChange={(e) => setFavoriteBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand-300 rounded-xl focus:ring-2 focus:ring-sage-500 focus:outline-none"
                  >
                    <option value="">Sin sede preferida</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.commune || b.city})
                      </option>
                    ))}
                  </select>
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
                  {editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          )}

          {/* List of Users */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sage-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-charcoal-muted">
              <UserIcon className="w-10 h-10 mx-auto text-sage-400 mb-2" />
              <p className="text-sm font-semibold text-charcoal">No se encontraron usuarios</p>
              <p className="text-xs mt-1">Prueba cambiando los filtros o el término de búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    u.isActive !== false
                      ? 'border-sand-200 bg-sand-50/30 hover:bg-white hover:shadow-sm'
                      : 'border-stone-200 bg-stone-50/80 opacity-70'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sage-200 text-sage-800 font-bold flex items-center justify-center text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-sage-900">{u.name}</span>
                        {getRoleBadge(u.role)}
                        {u.isActive === false && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-charcoal-muted">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-sage-600" />
                          <span>{u.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-sage-600" />
                          <span>{u.phone}</span>
                        </div>
                        {u.favoriteBranch && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-sage-600" />
                            <span>{u.favoriteBranch.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={actionLoadingId === u.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
                        u.isActive !== false
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={u.isActive !== false ? 'Desactivar acceso' : 'Reactivar acceso'}
                    >
                      {actionLoadingId === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                      <span>{u.isActive !== false ? 'Suspender' : 'Activar'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sand-200/70 hover:bg-sand-200 text-charcoal border border-sand-300 transition flex items-center gap-1"
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
