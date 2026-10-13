import React from 'react';
import {
  Menu,
  LogOut,
  User as UserIcon,
  Shield,
  Sparkles,
  Bell,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenNotifications: () => void;
  onOpenMyBookings?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenAuth,
  onOpenNotifications,
  onOpenMyBookings,
  unreadNotificationsCount = 0,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-terra-light text-terra border border-terra/20">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        );
      case 'INSTRUCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-100 text-sage-800 border border-sage-300">
            <Sparkles className="w-2.5 h-2.5" /> Instructor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserIcon className="w-2.5 h-2.5" /> Alumno
          </span>
        );
    }
  };

  return (
    <header className="border-b border-sand-200 bg-white/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Hamburger menu toggle + Studio Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-xl text-charcoal hover:text-black hover:bg-sand-100 transition focus:outline-none"
            title="Abrir menú de navegación"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5 text-charcoal" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#3a1b38] text-white flex items-center justify-center font-bold tracking-tight shadow-sm text-sm">
              P
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#220622] block leading-tight">
                Atelier Somatique
              </span>
              <span className="text-[10px] text-charcoal-muted tracking-wider uppercase font-semibold">
                Pilates & Wellness · Multisede
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick actions & User profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {isAuthenticated && user ? (
            <>
              {onOpenMyBookings && (
                <button
                  type="button"
                  onClick={onOpenMyBookings}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-200 rounded-xl transition shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5 text-sage-600" />
                  <span>Mis Reservas</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 text-charcoal hover:text-sage-800 bg-sand-50/80 hover:bg-sand-100 rounded-xl border border-sand-200 transition shadow-sm"
                title="Notificaciones & Avisos"
              >
                <Bell className="w-4 h-4 text-sage-700" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 bg-sand-50/80 px-2.5 py-1.5 rounded-xl border border-sand-200">
                <div className="w-7 h-7 rounded-full bg-[#3a1b38] text-white flex items-center justify-center font-semibold text-xs shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-charcoal leading-none truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="mt-1">{getRoleBadge(user.role)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 text-charcoal-muted hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:text-sage-800 hover:bg-sand-100 rounded-xl transition"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#3a1b38] hover:bg-[#4f244c] text-white rounded-xl shadow-sm transition"
              >
                Registrarse
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
