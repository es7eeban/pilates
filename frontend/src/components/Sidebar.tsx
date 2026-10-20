import React from 'react';
import {
  X,
  Calendar,
  BookOpen,
  ClipboardList,
  Building2,
  Users,
  CalendarPlus,
  FileCheck,
  Bell,
  LogOut,
  Shield,
  User as UserIcon,
  LogIn,
  UserPlus,
  Zap,
  History,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenMyBookings: () => void;
  onOpenClassHistory: () => void;
  onOpenAttendance: () => void;
  onOpenAdminClasses: () => void;
  onOpenAdminBranches: () => void;
  onOpenAdminUsers: () => void;
  onOpenAdminVouchers: () => void;
  onOpenNotifications: () => void;
  onOpenAccount: () => void;
  unreadCount: number;
  offeredWaitlistCount?: number;
  activeView?: 'LANDING' | 'CATALOG';
  onSelectView?: (view: 'LANDING' | 'CATALOG') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenMyBookings,
  onOpenClassHistory,
  onOpenAttendance,
  onOpenAdminClasses,
  onOpenAdminBranches,
  onOpenAdminUsers,
  onOpenAdminVouchers,
  onOpenNotifications,
  onOpenAccount,
  unreadCount,
  offeredWaitlistCount = 0,
  activeView = 'CATALOG',
  onSelectView,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const canAccessMenu = (menuKey: string): boolean => {
    if (!user) return false;
    if (Array.isArray(user.allowedMenus) && user.allowedMenus.length > 0) {
      return user.allowedMenus.includes(menuKey);
    }
    if (user.role === 'ADMIN') return true;
    return ['CATALOG', 'MY_BOOKINGS', 'CLASS_HISTORY', 'NOTIFICATIONS', 'ACCOUNT'].includes(menuKey);
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-terra-light text-terra border border-terra/20">
          <Shield className="w-2.5 h-2.5" /> Administrador
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <UserIcon className="w-2.5 h-2.5" /> Alumno
      </span>
    );
  };

  const handleAction = (callback?: () => void) => {
    if (typeof callback === 'function') {
      callback();
    }
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for mobile/tablet */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Rail / Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#faf9f6] border-r border-[#e8e5df] shadow-lg lg:shadow-none flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Branding */}
        <div className="flex flex-col">
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#e8e5df] bg-white/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center font-bold tracking-tight shadow-sm text-sm">
                P
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-[#220622] block leading-tight">
                  Atelier Somatique
                </span>
                <span className="text-[10px] text-[#7f747b] tracking-wider uppercase font-semibold">
                  Pilates & Wellness
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-sand-100 transition lg:hidden"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* ========================================================================= */}
            {/* ROL ADMINISTRADOR (V1: Administrador + Instructor por defecto)            */}
            {/* ========================================================================= */}
            {isAuthenticated && user?.role === 'ADMIN' ? (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7f747b]">
                  Operación & Agenda
                </div>

                {canAccessMenu('CATALOG') && (
                  <button
                    onClick={() => handleAction(() => onSelectView?.('CATALOG'))}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                      activeView === 'CATALOG'
                        ? 'bg-[#3a1b38] text-white shadow-sm'
                        : 'text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df]'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Inicio & Agenda en Vivo</span>
                  </button>
                )}

                {canAccessMenu('ADMIN_VOUCHERS') && (
                  <button
                    onClick={() => handleAction(onOpenAdminVouchers)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-terra bg-terra-light/70 hover:bg-terra hover:text-white border border-terra/30 transition text-left shadow-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-4 h-4 text-terra group-hover:text-white transition-colors" />
                      <span>Validación de Pagos</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-terra text-white font-bold group-hover:bg-white group-hover:text-terra transition-colors">
                      Vouchers
                    </span>
                  </button>
                )}

                {canAccessMenu('MY_BOOKINGS') && (
                  <button
                    onClick={() => handleAction(onOpenMyBookings)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-sage-600" />
                      <span>Reservas Activas</span>
                    </div>
                    {offeredWaitlistCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5 animate-pulse">
                        <Zap className="w-2.5 h-2.5" /> {offeredWaitlistCount}
                      </span>
                    )}
                  </button>
                )}

                {canAccessMenu('CLASS_HISTORY') && (
                  <button
                    onClick={() => handleAction(onOpenClassHistory)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <History className="w-4 h-4 text-sage-600" />
                      <span>Historial de Clases & Alumnos</span>
                    </div>
                  </button>
                )}

                {canAccessMenu('NOTIFICATIONS') && (
                  <button
                    onClick={() => handleAction(onOpenNotifications)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-sage-600" />
                      <span>Avisos & Notificaciones</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}

                {canAccessMenu('ATTENDANCE') && (
                  <button
                    onClick={() => handleAction(onOpenAttendance)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/60 transition text-left shadow-sm"
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                    <span>Asistencia & Check-in</span>
                  </button>
                )}

                {/* Administración */}
                <div className="pt-3 space-y-1">
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-terra flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Administración
                  </div>

                  {canAccessMenu('ADMIN_CLASSES') && (
                    <button
                      onClick={() => handleAction(onOpenAdminClasses)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                    >
                      <CalendarPlus className="w-4 h-4 text-sage-600" />
                      <span>Clases & Horarios</span>
                    </button>
                  )}

                  {canAccessMenu('ADMIN_BRANCHES') && (
                    <button
                      onClick={() => handleAction(onOpenAdminBranches)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                    >
                      <Building2 className="w-4 h-4 text-sage-600" />
                      <span>Sedes</span>
                    </button>
                  )}

                  {canAccessMenu('ADMIN_USERS') && (
                    <button
                      onClick={() => handleAction(onOpenAdminUsers)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                    >
                      <Users className="w-4 h-4 text-sage-600" />
                      <span>Usuarios & Roles</span>
                    </button>
                  )}
                </div>

                {/* Cuenta */}
                {canAccessMenu('ACCOUNT') && (
                  <div className="pt-3 space-y-1">
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7f747b]">
                      Configuración
                    </div>
                    <button
                      onClick={() => handleAction(onOpenAccount)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                    >
                      <Settings className="w-4 h-4 text-sage-600" />
                      <span>Mi Cuenta</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ========================================================================= */
              /* ROL ALUMNO: MENÚ LIMPIO ENFOCADO EN RESERVAS, NOTIFICACIONES Y SU CUENTA  */
              /* ========================================================================= */
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7f747b]">
                  Menú Principal
                </div>

                {canAccessMenu('CATALOG') && (
                  <button
                    onClick={() => handleAction(() => onSelectView?.('CATALOG'))}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                      activeView === 'CATALOG'
                        ? 'bg-[#3a1b38] text-white shadow-sm'
                        : 'text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df]'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Inicio & Agenda en Vivo</span>
                  </button>
                )}

                {isAuthenticated && (
                  <>
                    {canAccessMenu('MY_BOOKINGS') && (
                      <button
                        onClick={() => handleAction(onOpenMyBookings)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-sage-600" />
                          <span>Mis Reservas Activas</span>
                        </div>
                        {offeredWaitlistCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-0.5 animate-pulse">
                            <Zap className="w-2.5 h-2.5" /> {offeredWaitlistCount}
                          </span>
                        )}
                      </button>
                    )}

                    {canAccessMenu('CLASS_HISTORY') && (
                      <button
                        onClick={() => handleAction(onOpenClassHistory)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <History className="w-4 h-4 text-sage-600" />
                          <span>Historial de Clases</span>
                        </div>
                      </button>
                    )}

                    {canAccessMenu('NOTIFICATIONS') && (
                      <button
                        onClick={() => handleAction(onOpenNotifications)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Bell className="w-4 h-4 text-sage-600" />
                          <span>Avisos & Notificaciones</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    )}

                    {canAccessMenu('ACCOUNT') && (
                      <div className="pt-3 space-y-1">
                        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7f747b]">
                          Mi Perfil
                        </div>
                        <button
                          onClick={() => handleAction(onOpenAccount)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#4d444b] hover:bg-white hover:text-[#220622] hover:shadow-sm border border-transparent hover:border-[#e8e5df] transition text-left"
                        >
                          <Settings className="w-4 h-4 text-sage-600" />
                          <span>Mi Cuenta & Sede Favorita</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Footer: User profile card or login actions */}
        <div className="p-3 border-t border-[#e8e5df] bg-white/70">
          {isAuthenticated && user ? (
            <div className="p-2.5 rounded-2xl bg-sand-50/80 border border-sand-200 flex items-center justify-between gap-2 shadow-sm">
              <button
                type="button"
                onClick={() => handleAction(onOpenAccount)}
                title="Abrir Mi Cuenta"
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-90 transition"
              >
                <div className="w-9 h-9 rounded-full bg-[#3a1b38] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-charcoal truncate leading-tight">
                    {user.name}
                  </div>
                  <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 text-charcoal-muted hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleAction(() => onOpenAuth('login'))}
                className="w-full py-2 px-3 text-xs font-semibold text-charcoal hover:text-[#220622] hover:bg-white rounded-xl border border-sand-300 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-sage-600" />
                <span>Iniciar Sesión</span>
              </button>
              <button
                onClick={() => handleAction(() => onOpenAuth('register'))}
                className="w-full py-2 px-3 text-xs font-semibold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrarse</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
