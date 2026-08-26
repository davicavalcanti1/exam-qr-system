import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/adminApi'
import { Card, Button, Field, Input, Loading } from '../../../components/ui'

/**
 * Quem, de fora, entra aqui.
 *
 * Substitui o INSERT manual em sso_tenants. Nasce pensando em mais de um
 * cliente: cada sistema externo que quiser entrar vira uma linha, sem SQL e sem
 * deploy.
 *
 * Duas listas, e a diferença entre elas é a que confunde:
 *   - Sistemas: de qual sistema externo, para qual empresa daqui. Sem linha,
 *     aquele sistema não entra — é o interruptor.
 *   - Cargos: cargo de lá vira qual papel aqui. Sem tradução a pessoa não
 *     entra, mesmo com o sistema dela liberado.
 */
export default function SsoArea() {
  const [tenants, setTenants] = useState([])
  const [papeis, setPapeis] = useState([])
  const [duplicados, setDuplicados] = useState([])
  const [vinculos, setVinculos] = useState([])
  const [novoVinculo, setNovoVinculo] = useState({ origem_email: '', destino_email: '' })
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState('')
  const [novo, setNovo] = useState({ co_tenant_id: '', empresa_id: '' })

  async function carregar() {
    try {
      const [t, p, d, v] = await Promise.all([
        adminApi.ssoTenants(), adminApi.ssoPapeis(), adminApi.ssoDuplicados(), adminApi.ssoVinculos(),
      ])
      setTenants(t.tenants || [])
      setPapeis(p.papeis || [])
      setDuplicados(d.duplicados || [])
      setVinculos(v.vinculos || [])
    } catch (e) { setMsg(e.message) } finally { setCarregando(false) }
  }

  useEffect(() => { carregar() }, [])

  async function salvarTenant() {
    setMsg('')
    try {
      await adminApi.ssoSalvarTenant(novo)
      setNovo({ co_tenant_id: '', empresa_id: '' })
      await carregar()
    } catch (e) { setMsg(e.message) }
  }

  async function removerTenant(id) {
    setMsg('')
    try { await adminApi.ssoRemoverTenant(id); await carregar() } catch (e) { setMsg(e.message) }
  }

  async function salvarVinculo() {
    setMsg('')
    try {
      await adminApi.ssoSalvarVinculo(novoVinculo)
      setNovoVinculo({ origem_email: '', destino_email: '' })
      await carregar()
    } catch (e) { setMsg(e.message) }
  }

  async function removerVinculo(origemEmail) {
    setMsg('')
    try { await adminApi.ssoRemoverVinculo(origemEmail); await carregar() } catch (e) { setMsg(e.message) }
  }

  async function salvarPapel(co_role, exameqr_role) {
    setMsg('')
    try { await adminApi.ssoSalvarPapel({ co_role, exameqr_role }); await carregar() } catch (e) { setMsg(e.message) }
  }

  if (carregando) return <Loading />

  return (
    <div className="space-y-6">
      {msg && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{msg}</div>}

      <Card title="Sistemas que podem entrar">
        <p className="mb-4 text-sm text-slate-600">
          Cada linha libera um sistema externo a entrar aqui, já apontando para
          qual empresa as pessoas dele pertencem. <strong>Sem linha, ninguém daquele
          sistema entra</strong> — é assim de propósito: é melhor recusar do que
          colocar alguém na clínica errada.
        </p>

        {tenants.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum sistema liberado.</p>
        ) : (
          <div className="mb-4 divide-y rounded border">
            {tenants.map(t => (
              <div key={t.co_tenant_id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.empresas?.nome || 'Empresa removida'}</p>
                  <p className="truncate font-mono text-xs text-slate-500">{t.co_tenant_id}</p>
                </div>
                <Button variant="ghost" onClick={() => removerTenant(t.co_tenant_id)}>Remover</Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Identificador do tenant no sistema de origem">
            <Input
              value={novo.co_tenant_id}
              onChange={e => setNovo({ ...novo, co_tenant_id: e.target.value })}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </Field>
          <Field label="Empresa correspondente aqui">
            <Input
              value={novo.empresa_id}
              onChange={e => setNovo({ ...novo, empresa_id: e.target.value })}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </Field>
        </div>
        <Button className="mt-3" onClick={salvarTenant}>Liberar sistema</Button>
      </Card>

      {duplicados.length > 0 && (
        <Card title="Mesma pessoa, duas contas">
          <p className="mb-4 text-sm text-slate-600">
            Estas pessoas já tinham conta aqui antes do acesso externo, e ganharam
            uma segunda ao entrar pelo sistema de origem. Para o banco são pessoas
            diferentes: o que cada conta criou fica com ela, e a mesma pessoa
            aparece duas vezes em listagens e na auditoria.
          </p>
          <div className="divide-y rounded border">
            {duplicados.map(d => (
              <div key={d.email} className="p-3 text-sm">
                <p className="font-medium">{d.sombra.nome || d.email}</p>
                <p className="font-mono text-xs text-slate-500">{d.email}</p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                  <span>vinda de fora: <strong>{d.sombra.role || 'sem papel'}</strong></span>
                  <span>conta daqui: <strong>{d.nativo.role || 'sem papel'}</strong></span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Nada é feito automaticamente — juntar ou desativar conta é decisão de
            quem conhece o histórico de cada uma. O caminho mais limpo costuma ser
            desativar a conta antiga depois de conferir o que estava preso a ela;
            transformar a antiga em conta de acesso externo <strong>não</strong> é
            recomendado, porque ela continuaria tendo senha — e é justamente não
            ter senha que faz revogar no sistema de origem bastar.
          </p>
        </Card>
      )}

      <Card title="Entrar numa conta que já existe">
        <p className="mb-4 text-sm text-slate-600">
          Por padrão, quem chega de fora ganha uma conta nova aqui, com o papel
          traduzido pela tabela abaixo. Um vínculo muda isso: a pessoa entra
          <strong> na conta que ela já tem</strong>, com o papel que ela já tem.
          É assim que o dono da plataforma continua dono ao entrar pelo sistema —
          sem que cargo nenhum de fora possa conceder isso.
        </p>

        {vinculos.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">Nenhum vínculo. Todos ganham conta nova.</p>
        ) : (
          <div className="mb-4 divide-y rounded border">
            {vinculos.map(v => (
              <div key={v.origem_email} className="flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{v.origem_email} <span className="text-slate-400">→</span> <strong>{v.destino_email}</strong></p>
                  <p className="text-xs text-slate-500">
                    {v.ultimo_acesso ? `último acesso em ${new Date(v.ultimo_acesso).toLocaleString('pt-BR')}` : 'nunca usado'}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => removerVinculo(v.origem_email)}>Remover</Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="E-mail da pessoa no sistema de origem">
            <Input value={novoVinculo.origem_email}
              onChange={e => setNovoVinculo({ ...novoVinculo, origem_email: e.target.value })}
              placeholder="pessoa@empresa.com" />
          </Field>
          <Field label="E-mail da conta dela aqui">
            <Input value={novoVinculo.destino_email}
              onChange={e => setNovoVinculo({ ...novoVinculo, destino_email: e.target.value })}
              placeholder="pessoa@empresa.com" />
          </Field>
        </div>
        <Button className="mt-3" onClick={salvarVinculo}>Vincular</Button>

        <p className="mt-3 text-xs text-slate-500">
          Vale saber o preço: a conta vinculada é daqui e tem senha, então
          <strong> para ela, remover o acesso no sistema de origem não basta</strong> —
          a entrada por senha continua existindo. É aceitável para o dono da
          plataforma, que não deveria poder ser trancado do lado de fora por um
          sistema externo; para o resto da equipe, a conta nova é mais segura.
        </p>
      </Card>

      <Card title="Cargos de fora, papéis aqui">
        <p className="mb-4 text-sm text-slate-600">
          O sistema de origem manda o cargo da pessoa; esta tabela diz o que ele
          significa aqui. <strong>Cargo sem tradução não entra</strong>, mesmo com o
          sistema dele liberado — deixar em branco é como se desliga um cargo.
        </p>
        <div className="divide-y rounded border">
          {papeis.map(p => (
            <div key={p.co_role} className="flex items-center gap-3 p-3">
              <span className="w-40 shrink-0 font-mono text-sm">{p.co_role}</span>
              <span className="text-slate-400">→</span>
              <select
                className="flex-1 rounded border px-2 py-1 text-sm"
                value={p.exameqr_role || ''}
                onChange={e => salvarPapel(p.co_role, e.target.value)}
              >
                <option value="">— sem acesso —</option>
                <option value="empresa_admin">Administrador da clínica</option>
                <option value="empresa_operador">Operador da clínica</option>
                <option value="parceiro_coordenador">Coordenador do parceiro</option>
                <option value="parceiro_funcionario">Funcionário do parceiro</option>
              </select>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Dono da plataforma não aparece na lista de propósito: o banco recusa
          essa tradução, então não há como um cargo de fora virar dono daqui —
          nem por engano.
        </p>
      </Card>
    </div>
  )
}
