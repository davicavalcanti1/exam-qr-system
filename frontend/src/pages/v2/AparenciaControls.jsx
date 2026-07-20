import { useTheme } from '../../theme/ThemeContext'
import { PALETAS } from '../../theme/palettes'

const TEMAS = [
  { k: 'light', label: 'Claro', icon: 'light_mode' },
  { k: 'dark', label: 'Escuro', icon: 'dark_mode' },
  { k: 'system', label: 'Sistema', icon: 'contrast' },
]

// Controles de aparência: tema (claro/escuro/sistema) + paleta de cor de destaque.
export default function AparenciaControls() {
  const { theme, setTheme, accent, setAccent } = useTheme()
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Tema</label>
        <div className="mt-2 grid grid-cols-3 gap-2 bg-surface rounded-xl p-1.5 max-w-sm">
          {TEMAS.map(t => {
            const on = theme === t.k
            return (
              <button key={t.k} onClick={() => setTheme(t.k)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-bold transition ${on ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{t.icon}</span>{t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Cor de destaque</label>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {PALETAS.map(p => {
            const on = accent === p.k
            return (
              <button key={p.k} onClick={() => setAccent(p.k)} title={p.label}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ring-2 ring-offset-2 ring-offset-surface-container-lowest ${on ? 'ring-on-surface' : 'ring-transparent hover:ring-outline-variant'}`}
                style={{ background: p.cor }}>
                {on && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: p.k === 'amarelo' ? '#1f2937' : '#fff' }}>check</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
