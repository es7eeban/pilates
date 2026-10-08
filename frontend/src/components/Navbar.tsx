import React from 'react';
import { LogOut, User as UserIcon, Shield, Sparkles, BookOpen, FileCheck, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenMyBookings: () => void;
  onOpenAdminVouchers: () => void;
  onOpenAttendance: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenMyBookings,
  onOpenAdminVouchers,
  onOpenAttendance,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-terra-light text-terra border border-terra/20">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'INSTRUCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-100 text-sage-800 border border-sage-300">
            <Sparkles className="w-3 h-3" /> Instructor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserIcon className="w-3 h-3" /> Alumno
          </span>
        );
    }
  };

  return (
    <header className="border-b border-sand-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sage-500 text-white flex items-center justify-center font-bold tracking-tight shadow-sm">
            P
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-sage-900 block leading-tight">
              Pilates Studio
            </span>
            <span className="text-[10px] text-charcoal-muted tracking-wide uppercase font-medium">
              Multisede & Agendamiento
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated && user && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenMyBookings}
                className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-sand-100 text-charcoal border border-sand-200 rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-sage-600" />
                <span className="hidden sm:inline">Mis Reservas</span>
              </button>

              {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN' || user.isInstructor) && (
                <button
                  onClick={onOpenAttendance}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Asistencia & Clases</span>
                </button>
              )}

              {user.role === 'ADMIN' && (
                <button
                  onClick={onOpenAdminVouchers}
                  className="px-3 py-1.5 text-xs font-semibold bg-terra-light text-terra hover:bg-terra hover:text-white border border-terra/30 rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Validar Pagos</span>
                </button>
              )}
            </div>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-sand-50/80 px-2.5 py-1.5 rounded-xl border border-sand-200">
                <div className="w-7 h-7 rounded-full bg-sage-200 text-sage-800 flex items-center justify-center font-semibold text-xs">
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
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 text-charcoal-muted hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:text-sage-800 hover:bg-sand-100 rounded-xl transition"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-sage-600 hover:bg-sage-700 text-white rounded-xl shadow-sm transition"
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
