// Selo de co-branding "Em parceria com a Imago" — padrão usado por empresas
// que desenvolvem projetos em conjunto. Discreto, logo da Imago em verde da paleta.
export default function PartnershipMark({ className = '', imgClass = 'h-5' }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-on-surface-variant/60">
        Em parceria com
      </span>
      <img
        src="/imago-green.png"
        alt="Imago — Diagnóstico por Imagem"
        className={`${imgClass} object-contain opacity-90`}
      />
    </div>
  )
}
