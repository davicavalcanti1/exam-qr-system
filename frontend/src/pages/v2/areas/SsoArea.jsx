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
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState('')
  const [novo, setNovo] = useState({ co_tenant_id: '', empresa_id: '' })

  async function carregar() {
    try {
      const [t, p] = await Promise.all([adminApi.ssoTenants(), adminApi.ssoPapeis()])
      setTenants(t.tenants || [])
      setPapeis(p.papeis || [])
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
