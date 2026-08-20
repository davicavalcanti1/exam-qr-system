#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Gate das migrations — o que impede um `supabase db push` DO ZERO
   ---------------------------------------------------------------------------
       node scripts/check-migrations.mjs      (ou: npm run check:migrations)

   Sai com código 1 quando acha bloqueador.

   ── POR QUE ESTE SCRIPT EXISTE ─────────────────────────────────────────────
   Em 17/ago o `db push` abortava na 22ª migration e ninguém sabia por quê. A
   causa: `get_empresa_uso()` era redefinida com uma coluna a mais no
   `returns table`, via `create or replace` e sem `drop function` antes.
   Postgres recusa mudança de tipo de retorno.

   O detalhe cruel é que esse erro é **invisível no ambiente que já aplicou
   tudo**: a migration está registrada e nunca roda de novo. Ele só aparece ao
   criar ambiente NOVO — que no white-label é exatamente o onboarding de uma
   empresa nova. O bug morava no repositório havia semanas sem sintoma.

   Um gate estático custa segundos e pega essa classe inteira antes do push.

   ── O QUE ELE NÃO É ────────────────────────────────────────────────────────
   Não é um parser de SQL nem substitui rodar o push. Ele acha duas famílias de
   erro por leitura de texto; SQL inválido de outra natureza passa por aqui.
   ═══════════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(AQUI, "..", "supabase", "migrations");

/* O `(?=...)` para no primeiro token que fecha o cabeçalho da função, para que
   o corpo (que pode conter a palavra "returns") não entre na assinatura. */
const RE_FUNC =
  /create\s+or\s+replace\s+function\s+([a-z_0-9."]+)\s*\(([^)]*)\)(.*?)(?=\s+(?:as|language|security|stable|immutable|volatile|set\s)\b)/gis;
const RE_DROP = /drop\s+function\s+(?:if\s+exists\s+)?([a-z_0-9."]+)/gi;

/* Postgres não tem IF NOT EXISTS para policy nem para trigger — é erro de
   sintaxe, e o push morre na hora. O padrão correto é
   `drop policy if exists ...; create policy ...`. */
const SINTAXE_INVALIDA = [
  [/create\s+policy\s+if\s+not\s+exists/i, "`create policy if not exists` não existe no Postgres — use `drop policy if exists` + `create policy`"],
  [/create\s+trigger\s+if\s+not\s+exists/i, "`create trigger if not exists` não existe no Postgres — use `drop trigger if exists` + `create trigger`"],
];

const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Tira comentários antes de qualquer análise.
 *
 * Não é preciosismo: a primeira versão deste script dava falso NEGATIVO por
 * causa disto. A migration corrigida traz, num comentário, a mensagem que o
 * Postgres emite — "HINT: Use DROP FUNCTION public.get_empresa_uso() first." —
 * e a regex do `drop` casava com o comentário. Resultado: o script achava que
 * havia drop mesmo quando o drop tinha sido removido do SQL, e aprovava o
 * bloqueador.
 *
 * Descoberto por auto-teste: desfazer o conserto e conferir que o gate ACUSA.
 * Gate que só foi visto passando não foi testado.
 *
 * O literal de string não é tratado: `--` dentro de string é raro em migration
 * e o custo de errar aqui é um falso positivo, que alguém lê e resolve — não um
 * falso negativo, que é o que morde.
 */
const semComentarios = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ");

const arquivos = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const problemas = [];
const vistas = new Map(); // nome -> { arquivo, assinatura }

for (const arquivo of arquivos) {
  const sql = semComentarios(readFileSync(join(DIR, arquivo), "utf8"));

  for (const [re, mensagem] of SINTAXE_INVALIDA) {
    if (re.test(sql)) problemas.push({ arquivo, tipo: "sintaxe", mensagem });
  }

  const dropadas = new Set(
    [...sql.matchAll(RE_DROP)].map((m) => m[1].toLowerCase().replace(/"/g, "")),
  );

  for (const m of sql.matchAll(RE_FUNC)) {
    const nome = m[1].toLowerCase().replace(/"/g, "");
    const assinatura = `${norm(m[2])}||${norm(m[3])}`;
    const antes = vistas.get(nome);

    if (antes && antes.assinatura !== assinatura && !dropadas.has(nome)) {
      problemas.push({
        arquivo,
        tipo: "assinatura",
        mensagem:
          `${nome}() muda de assinatura desde ${antes.arquivo} e não tem ` +
          `\`drop function if exists ${nome}();\` antes do create. ` +
          `Postgres vai recusar: "cannot change return type of existing function".`,
      });
    }
    vistas.set(nome, { arquivo, assinatura });
  }
}

console.log(`${arquivos.length} migrations verificadas.`);

if (problemas.length === 0) {
  console.log("Nenhum bloqueador de replay encontrado.");
  process.exit(0);
}

console.error(`\n${problemas.length} bloqueador(es) — o push do zero vai falhar:\n`);
for (const p of problemas) {
  console.error(`  [${p.tipo}] ${p.arquivo}`);
  console.error(`      ${p.mensagem}\n`);
}
process.exit(1);
