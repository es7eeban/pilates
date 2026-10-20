import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
  Star,
  Menu,
  X,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Curated Static Branch Data with Specific Class Days
  const curatedBranches = [
    {
      id: 'providencia',
      name: 'Sede Providencia · Estudio Central',
      subtitle: 'El corazón de Atelier Somatique',
      address: 'Av. Providencia 2045, Piso 3 (Metro Los Leones)',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
      badge: 'Lunes a Viernes AM/PM & Sábados',
      classDaysHighlight: 'Clases Lunes a Viernes en doble jornada (07:30 a 20:30) y Sábados mañana.',
      equipment: '10 Reformers Allegro 2, 2 Cadillacs completos, Sala de Mat Somático',
      capacity: 'Máximo 8 alumnos por clase',
      features: ['Metro Los Leones a 50m', 'Camarines con duchas', 'Cafetería de matcha orgánica', 'Lockers inteligentes'],
    },
    {
      id: 'las-condes',
      name: 'Sede Las Condes · Somatic Club',
      subtitle: 'Enfoque de fuerza elástica & recuperación funcional',
      address: 'Av. Apoquindo 4800, Local 12 (Metro Escuela Militar)',
      image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80',
      badge: 'Viernes PM & Tardes Intensivas',
      classDaysHighlight: 'Especialización los días Viernes en jornada tarde (14:30 a 20:00) y Lunes a Jueves tardes.',
      equipment: '8 Reformers con Half-Tower, Accesorios somáticos de descompresión',
      capacity: 'Máximo 6 alumnos por clase',
      features: ['Estacionamiento subterráneo clientes', 'Toallas individuales premium', 'Zona de estiramiento asistido', 'Aromaterapia'],
    },
    {
      id: 'vitacura',
      name: 'Sede Vitacura · Private Sanctuary',
      subtitle: 'Intimidad, rehabilitación postural y silencio',
      address: 'Av. Alonso de Córdova 3890 (Sector Borde Río)',
      image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1200&q=80',
      badge: 'Viernes AM & Mañanas Somáticas',
      classDaysHighlight: 'Especialización los días Viernes en jornada mañana (08:00 a 12:30) y sesiones privadas.',
      equipment: '6 Reformers Studio de máxima amplitud, Cadillac Trapeze privado',
      capacity: 'Máximo 6 alumnos por clase',
      features: ['Valet parking de cortesía', 'Evaluación biomecánica inicial', 'Jardín de relajación zen', 'Infusiones orgánicas'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] selection:bg-[#d92676] selection:text-white flex flex-col font-sans">
      {/* 1. TOP NAVIGATION BAR (ClassPass Sticky Navbar) */}
      <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md border-b border-stone-200/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#3a1b38] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <span className="font-serif font-bold text-lg text-rose-100">P</span>
            </div>
            <div>
              <span className="font-serif font-bold text-xl text-[#261025] block leading-tight tracking-tight">
                Atelier Somatique
              </span>
              <span className="text-[10px] tracking-[0.2em] text-[#78716c] uppercase font-semibold">
                Pilates & Wellness Studio
              </span>
            </div>
          </div>

          {/* Desktop Center Links: Sedes, Cómo Funciona */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-700">
            <button
              onClick={() => scrollToSection('sedes')}
              className="hover:text-[#3a1b38] transition-colors py-1 border-b-2 border-transparent hover:border-[#d92676]"
            >
              Sedes
            </button>
            <button
              onClick={() => scrollToSection('como-funciona')}
              className="hover:text-[#3a1b38] transition-colors py-1 border-b-2 border-transparent hover:border-[#d92676]"
            >
              Cómo Funciona
            </button>
          </nav>

          {/* Desktop Action Buttons: Iniciar Sesión & Comenzar Ahora */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-sm font-bold text-[#3a1b38] hover:text-[#d92676] px-4 py-2.5 rounded-xl transition-all border border-stone-200 hover:border-[#3a1b38]/30 bg-white shadow-sm flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-[#3a1b38]" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3a1b38] to-[#d92676] hover:from-[#261025] hover:to-[#c21865] active:scale-95 text-white font-bold text-sm shadow-md shadow-[#d92676]/25 transition-all flex items-center gap-2 group"
            >
              <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Comenzar Ahora</span>
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2">
            <button
              onClick={() => scrollToSection('sedes')}
              className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Nuestras Sedes
            </button>
            <button
              onClick={() => scrollToSection('como-funciona')}
              className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Cómo Funciona
            </button>

            <div className="pt-3 border-t border-stone-100 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 text-center text-sm font-bold text-[#3a1b38] bg-stone-100 rounded-xl"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister();
                }}
                className="w-full py-2.5 text-center text-sm font-bold text-white bg-[#3a1b38] rounded-xl shadow"
              >
                Comenzar Ahora
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION (Llamativo, Moderno, Degradado con Mesh Glow) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1d0b1c] via-[#2d122b] to-[#120612] text-white py-16 md:py-24">
        {/* Glow Spheres & Atmospheric Light */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#d92676]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-[#3a1b38]/40 rounded-full blur-3xl pointer-events-none"></div>

        {/* Subtle Background Image Overlay */}
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-luminosity pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80"
            alt="Studio background"
            className="w-full h-full object-cover object-center filter brightness-90"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs uppercase tracking-[0.2em] font-semibold text-rose-200 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#d92676] animate-pulse"></span>
              <span>Santuario de Movimiento Consciente & Controlología</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.08] mb-6">
              <span className="font-semibold tracking-wide block text-rose-200">PILATES</span>
              <span className="font-bold text-white block mt-1">
                El movimiento consciente que transforma tu cuerpo.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-stone-300 text-base sm:text-lg lg:text-xl font-light leading-relaxed mb-10 max-w-2xl">
              Entrenamiento de bajo impacto y precisión postural en equipos Reformer, Cadillac y Mat.
              Grupos reducidos a máximo 8 practicantes para una corrección personalizada en nuestras 3 sedes de Santiago.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#d92676] to-[#b8175d] hover:from-[#c21865] hover:to-[#9e114d] active:scale-95 text-white font-bold text-base shadow-xl shadow-[#d92676]/30 transition-all flex items-center gap-3 group"
              >
                <span>Comenzar Ahora</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('sedes')}
                className="px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-base border border-white/20 shadow-md transition-all flex items-center gap-2.5"
              >
                <Building2 className="w-5 h-5 text-rose-300" />
                <span>Explorar Sedes & Días</span>
              </button>
            </div>
          </div>

          {/* Trust Pillars under Hero */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10 text-xs text-stone-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Máximo 6-8 Alumnos</span>
                <span className="text-stone-400">Atención personalizada y corrección uno a uno.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Equipamiento Balanced Body</span>
                <span className="text-stone-400">Allegro 2 clínicos con muelles certificados.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Docentes Especialistas</span>
                <span className="text-stone-400">Kinesiólogos e instructores certificados NY.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN SEDES EN SANTIAGO (`#sedes`) */}
      <section id="sedes" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#3a1b38] text-xs font-bold uppercase tracking-wider mb-2 border border-purple-200">
              <Building2 className="w-3.5 h-3.5 text-[#d92676]" />
              <span>Espacios de Bienestar & Arquitectura</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#261025] tracking-tight">
              Nuestras 3 Sedes en Santiago
            </h2>
            <p className="text-stone-600 text-sm mt-1 max-w-xl">
              Estudios diseñados con luz natural, ventilación de aire puro y equipamiento de alta gama para una práctica armónica.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenRegister}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl border border-stone-300 hover:border-[#3a1b38] text-stone-800 hover:text-[#3a1b38] font-semibold text-xs transition bg-white shadow-sm flex items-center gap-2"
          >
            <span>Reservar en cualquier sede</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {curatedBranches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Branch Image */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={branch.image}
                  alt={branch.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                {/* Specific Class Days Badge */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#3a1b38]/90 text-white backdrop-blur-md border border-white/20 shadow-md">
                    {branch.badge}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-serif font-bold text-xl leading-snug">{branch.name}</h3>
                  <p className="text-xs text-rose-100/90 mt-0.5">{branch.subtitle}</p>
                </div>
              </div>

              {/* Branch Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5 text-xs text-stone-600">
                    <MapPin className="w-4 h-4 text-[#d92676] shrink-0 mt-0.5" />
                    <span>{branch.address}</span>
                  </div>

                  {/* Highlight of days classes are held */}
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Días en que se imparten clases:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">
                      {branch.classDaysHighlight}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Equipamiento & Salas
                    </span>
                    <p className="text-xs text-stone-700 font-medium">
                      {branch.equipment}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Servicios del Estudio
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {branch.features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-stone-100 text-stone-700"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="w-full py-3 px-4 rounded-xl bg-stone-100 hover:bg-[#3a1b38] hover:text-white text-[#3a1b38] font-bold text-xs transition duration-200 flex items-center justify-center gap-2 group-hover:bg-[#3a1b38] group-hover:text-white shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Reservar en esta Sede</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECCIÓN CÓMO FUNCIONA (How it Works estilo ClassPass, `#como-funciona`) */}
      <section id="como-funciona" className="py-20 bg-white border-t border-stone-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#3a1b38] text-xs font-bold uppercase tracking-wider mb-2 border border-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-[#d92676]" />
              <span>Experiencia Sin Fricción</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#261025] tracking-tight">
              ¿Cómo Funciona Atelier Somatique?
            </h2>
            <p className="text-stone-600 text-sm mt-2">
              Un sistema moderno y flexible diseñado para que te concentres exclusivamente en tu movimiento y bienestar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-200 relative group hover:border-[#3a1b38]/30 transition-all">
              <span className="font-serif font-bold text-5xl text-rose-200 group-hover:text-[#d92676] transition-colors block mb-4">
                01
              </span>
              <h3 className="font-serif font-bold text-xl text-[#261025] mb-2">
                Elige tu Sede & Disciplina
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Selecciona entre Providencia, Las Condes o Vitacura según tu cercanía. Filtra por Reformer Dinámico, Alineación Esencial o Cadillac según tus objetivos somáticos.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-200 relative group hover:border-[#3a1b38]/30 transition-all">
              <span className="font-serif font-bold text-5xl text-rose-200 group-hover:text-[#d92676] transition-colors block mb-4">
                02
              </span>
              <h3 className="font-serif font-bold text-xl text-[#261025] mb-2">
                Reserva en Tiempo Real
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Control de aforo estricto mediante base de datos transaccional. Si una clase está llena, nuestra lista de espera inteligente te avisará en cuanto se libere un lugar.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-200 relative group hover:border-[#3a1b38]/30 transition-all">
              <span className="font-serif font-bold text-5xl text-rose-200 group-hover:text-[#d92676] transition-colors block mb-4">
                03
              </span>
              <h3 className="font-serif font-bold text-xl text-[#261025] mb-2">
                Vive tu Sesión Guiada
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Asiste a salas exclusivas de máximo 6 a 8 practicantes con profesores certificados. Corrección biomecánica individual y descompresión axial garantizada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BANNER FINAL DE CONVERSIÓN */}
      <section className="py-16 bg-[#faf9f6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#261025] via-[#3a1b38] to-[#d92676] text-white p-8 sm:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-left">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-rose-200 block mb-2">
                Comienza Hoy Mismo
              </span>
              <h2 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight leading-tight">
                Tu cuerpo merece un entrenamiento consciente.
              </h2>
              <p className="text-rose-100 text-sm sm:text-base mt-3 max-w-xl font-light">
                Únete a Atelier Somatique. Accede a las clases en nuestras 3 sedes, gestiona tus reservas con facilidad y siente la evolución en tu postura y energía.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#261025] hover:bg-rose-50 font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Comenzar Ahora</span>
                <ArrowRight className="w-4 h-4 text-[#d92676]" />
              </button>

              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Iniciar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER EDITORIAL */}
      <footer className="bg-[#261025] text-stone-300 py-12 border-t border-[#3a1b38] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#3a1b38] flex items-center justify-center text-white font-serif font-bold">
                P
              </div>
              <span className="font-serif font-bold text-base text-white">
                Atelier Somatique
              </span>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed">
              Estudio de Pilates & Métodos Somáticos multisede en Santiago de Chile. Controlología de alto nivel y rehabilitación funcional.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              Nuestras Sedes
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>Sede Providencia · Av. Providencia 2045</li>
              <li>Sede Las Condes · Av. Apoquindo 4800</li>
              <li>Sede Vitacura · Alonso de Córdova 3890</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              Disciplinas
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>Reformer Dinámico & Fuerza</li>
              <li>Reformer Esencial & Alineación</li>
              <li>Pilates Avanzado & Cadillac Studio</li>
              <li>Mat Clásico & Flow Somático</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
              Atención & Acceso
            </h4>
            <p className="text-stone-400 text-xs mb-3">
              Para consultas sobre abonos y planes de estudio:
            </p>
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 bg-[#3a1b38] hover:bg-[#512a4e] text-white rounded-xl text-xs font-semibold transition"
            >
              Portal Alumnos & Docentes
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-2">
          <span>© 2026 Atelier Somatique SpA · Todos los derechos reservados.</span>
          <span>Plataforma de Agendamiento Somático & Sobrecupos</span>
        </div>
      </footer>
    </div>
  );
};
