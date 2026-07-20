import DocsLayout, { P } from './DocsLayout'
import { DPA_TEXTO, DPA_VERSAO } from '../../legal/dpa'

export default function TratamentoDados() {
  return (
    <DocsLayout
      title="Termo de Tratamento de Dados (DPA)"
      subtitle="Acordo entre o ExameQR (Operador) e a empresa contratante (Controladora), nos termos da LGPD. Aceito eletronicamente por cada empresa ao entrar no sistema."
      updated={DPA_VERSAO}
    >
      <P>Este é o texto integral do Termo aceito pelas empresas contratantes:</P>
      <div className="mt-4 text-[14px] leading-relaxed text-on-surface/90 whitespace-pre-wrap bg-surface-container rounded-2xl p-6">{DPA_TEXTO}</div>
    </DocsLayout>
  )
}
