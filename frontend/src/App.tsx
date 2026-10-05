import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react'

export function App() {
  return (
    <div className="min-h-screen bg-sand-50 text-charcoal">
      {/* Header */}
      <header className="border-b border-sand-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sage-500 text-white flex items-center justify-center font-bold tracking-tight">
              P
            </div>
            <span className="font-semibold text-lg tracking-tight text-sage-900">
              Pilates Studio
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <span className="text-sage-700 bg-sage-50 px-3 py-1.5 rounded-full border border-sage-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Entorno Dev Activo
            </span>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Sistema de Agendamiento & Pagos
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-sage-900 mb-6">
          Encuentra tu ritmo, conecta con tu cuerpo y reserva tu reformer.
        </h1>

        <p className="text-lg text-charcoal-muted max-w-2xl mx-auto mb-10">
          Plataforma moderna para la reserva de horas de pilates, integración con pasarelas de pago y validación de transferencias bancarias.
        </p>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Agenda en Tiempo Real</h3>
            <p className="text-sm text-charcoal-muted">Control estricto de aforo y cupos garantizados.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Doble Método de Pago</h3>
            <p className="text-sm text-charcoal-muted">Pasarela online automatizada o transferencia con comprobante.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-charcoal mb-1">Auditoría de Pagos</h3>
            <p className="text-sm text-charcoal-muted">Panel administrativo para validación inmediata de reservas.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
