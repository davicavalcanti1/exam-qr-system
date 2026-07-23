import { IconButton } from './primitives'

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }

// Shell padrão de modal: backdrop, painel, cabeçalho e rodapé opcionais.
export function Modal({ open = true, onClose, title, subtitle, icon, children, footer, size = 'md', className = '' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein" onClick={onClose}>
      <div className={`bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${SIZES[size]} max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-popin ${className}`} onClick={e => e.stopPropagation()}>
        {(title || onClose) && (
          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-outline-variant/10 flex-none">
            <div className="flex items-center gap-2 min-w-0">
              {icon && <span className="material-symbols-outlined text-primary flex-none" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{title}</h3>
                {subtitle && <p className="text-xs text-on-surface-variant truncate">{subtitle}</p>}
              </div>
            </div>
            {onClose && <IconButton icon="close" title="Fechar" onClick={onClose} />}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-outline-variant/10 p-4 flex justify-end gap-2 flex-none">{footer}</div>}
      </div>
    </div>
  )
}
