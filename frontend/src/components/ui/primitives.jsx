// Kit de componentes ExameQR — base do redesign. Tudo herda os tokens do tailwind
// (verde/ouro Campina, Fustat/Inter). Reusar em todas as telas.

export function Spinner({ size = 24, className = '' }) {
  const b = Math.max(2, Math.round(size / 8))
  return <span className={`inline-block rounded-full border-primary border-t-transparent animate-spin ${className}`}
    style={{ width: size, height: size, borderWidth: b }} aria-label="carregando" />
}

export function Loading({ label = 'Carregando…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-on-surface-variant">
      <Spinner size={32} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

const BTN_SIZES = { sm: 'text-xs px-3 py-1.5 gap-1', md: 'text-sm px-5 py-2.5 gap-1.5', lg: 'text-base px-6 py-3 gap-2' }
const BTN_VARIANTS = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-sm shadow-primary/20',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  ghost: 'text-on-surface-variant hover:text-primary hover:bg-primary/5',
  outline: 'ring-1 ring-outline-variant/40 text-on-surface hover:ring-primary hover:text-primary',
  danger: 'bg-error-container/50 text-on-error-container hover:bg-error-container/80',
  gold: 'bg-secondary-container text-on-secondary-container hover:brightness-95',
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, iconRight, children, className = '', ...props }) {
  const ic = size === 'sm' ? '16px' : size === 'lg' ? '22px' : '18px'
  return (
    <button
      className={`inline-flex items-center justify-center font-bold rounded-lg transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled} {...props}>
      {loading
        ? <Spinner size={size === 'sm' ? 14 : 16} className="!border-current !border-t-transparent" />
        : icon && <span className="material-symbols-outlined" style={{ fontSize: ic }}>{icon}</span>}
      {children}
      {!loading && iconRight && <span className="material-symbols-outlined" style={{ fontSize: ic }}>{iconRight}</span>}
    </button>
  )
}

export function IconButton({ icon, title, className = '', size = 18, ...props }) {
  return (
    <button title={title} aria-label={title}
      className={`p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`} {...props}>
      <span className="material-symbols-outlined" style={{ fontSize: size }}>{icon}</span>
    </button>
  )
}

export function Card({ children, className = '', as: Tag = 'section', ...props }) {
  return <Tag className={`bg-surface-container-lowest rounded-2xl shadow-card ${className}`} {...props}>{children}</Tag>
}

export function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {icon && <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-on-surface">{title}</h2>
          {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
    </div>
  )
}

const BADGE = {
  neutral: 'bg-surface-container text-on-surface-variant',
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-secondary-container text-on-secondary-container',
  warn: 'bg-yellow-50 text-yellow-700',
  success: 'bg-tertiary-fixed-dim/25 text-on-tertiary-fixed-variant',
  danger: 'bg-error-container/50 text-on-error-container',
}
export function Badge({ tone = 'neutral', icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${BADGE[tone]} ${className}`}>
      {icon && <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{icon}</span>}
      {children}
    </span>
  )
}

export function EmptyState({ icon = 'inbox', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-16 px-6">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">{icon}</span>
      <p className="font-semibold text-on-surface">{title}</p>
      {hint && <p className="text-sm text-on-surface-variant max-w-xs">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

const FIELD_INPUT = 'w-full px-3.5 py-2.5 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none transition focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant/50'

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{label}{required && <span className="text-error"> *</span>}</span>}
      <div className={label ? 'mt-1' : ''}>{children}</div>
      {hint && <span className="text-[11px] text-on-surface-variant mt-1 block">{hint}</span>}
    </label>
  )
}

export function Input({ className = '', ...props }) { return <input className={`${FIELD_INPUT} ${className}`} {...props} /> }
export function Textarea({ className = '', ...props }) { return <textarea className={`${FIELD_INPUT} ${className}`} {...props} /> }
export function Select({ className = '', children, ...props }) { return <select className={`${FIELD_INPUT} ${className}`} {...props}>{children}</select> }
