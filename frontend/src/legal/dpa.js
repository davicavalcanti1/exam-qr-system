// Fonte única do DPA (Contrato/Termo de Tratamento de Dados) — usado tanto na
// página pública quanto no aceite eletrônico dentro do sistema. Ao mudar o texto,
// suba a versão: quem já aceitou será solicitado a aceitar de novo.
//
// PLACEHOLDERS a preencher na constituição da startup (marcados com [ ]):
//   - razão social + CNPJ do ExameQR
//   - nome e e-mail do Encarregado (DPO)

export const DPA_VERSAO = '2026-07-20'

export const DPA_TITULO = 'Termo de Tratamento de Dados Pessoais (DPA)'

export const DPA_TEXTO = `TERMO DE TRATAMENTO DE DADOS PESSOAIS (DATA PROCESSING AGREEMENT — DPA)

Versão ${DPA_VERSAO}

Este Termo integra o contrato de uso da plataforma ExameQR ("Plataforma") e disciplina o tratamento de dados pessoais realizado no âmbito da sua utilização, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).

1. PARTES E PAPÉIS
1.1. CONTROLADORA: a empresa/clínica contratante da Plataforma, que decide sobre as finalidades e os meios do tratamento dos dados de pacientes e demais titulares que insere na Plataforma.
1.2. OPERADOR: ExameQR [razão social e CNPJ a definir na constituição da empresa], que realiza o tratamento de dados pessoais EM NOME e conforme as instruções da Controladora.

2. OBJETO
2.1. O Operador tratará dados pessoais — inclusive dados pessoais sensíveis de saúde (exames, indicações clínicas) — estritamente para prestar as funcionalidades da Plataforma: cadastro e agendamento de exames, controle de teto de crédito de parceiros, cobrança por período, emissão de comprovantes/recibos/contratos, integração com o sistema da própria Controladora (quando ativada) e segurança/auditoria.

3. BASE LEGAL
3.1. O tratamento de dados de saúde apoia-se, conforme o caso, na tutela da saúde (art. 11, II, "f", LGPD), na execução de contrato e no cumprimento de obrigação legal/regulatória. O consentimento do titular é coletado e registrado no cadastro do paciente, com data e hora.

4. OBRIGAÇÕES DO OPERADOR
4.1. Tratar os dados apenas conforme as instruções documentadas da Controladora e este Termo, não os utilizando para finalidade própria.
4.2. Manter confidencialidade e impor dever de sigilo a quem tenha acesso aos dados.
4.3. Adotar medidas técnicas e administrativas de segurança (item 6).
4.4. Auxiliar a Controladora no atendimento às solicitações dos titulares e das autoridades, disponibilizando na Plataforma recursos de exportação e de anonimização de dados.
4.5. Manter registro das operações de tratamento (trilha de auditoria).
4.6. Eliminar ou anonimizar os dados ao término da relação, salvo obrigação legal de guarda (item 7).

5. SUB-OPERADORES
5.1. A Controladora autoriza o uso dos seguintes sub-operadores, comprometendo-se o Operador a impor-lhes obrigações de proteção equivalentes:
   a) Supabase (banco de dados e armazenamento) — região Brasil (São Paulo), sem transferência internacional dos dados;
   b) Resend (envio de e-mails transacionais, como convites e redefinição de senha);
   c) A integração com o sistema de agendamento (NetRis/Netpacs) ocorre com o sistema DA PRÓPRIA Controladora e sob responsabilidade dela.
5.2. Novos sub-operadores serão informados previamente, facultando-se à Controladora se opor por motivo legítimo.

6. SEGURANÇA
6.1. Isolamento por empresa no banco de dados via Row Level Security (RLS); criptografia em trânsito (HTTPS/TLS); credenciais sensíveis mantidas apenas no servidor; controle de acesso por perfil; troca de senha obrigatória no primeiro acesso; possibilidade de desativação imediata de usuários; trilha de auditoria de ações sensíveis.

7. RETENÇÃO E DESCARTE
7.1. Os dados são mantidos enquanto durar a relação com a Controladora e pelo prazo necessário ao cumprimento de obrigações legais.
7.2. Política de referência: registros financeiros/fiscais são mantidos por 5 (cinco) anos; dados pessoais de pacientes tornam-se elegíveis a anonimização ao encerramento da finalidade ou do vínculo, preservando-se o histórico financeiro de forma anonimizada.

8. INCIDENTES DE SEGURANÇA
8.1. O Operador comunicará à Controladora, sem demora injustificada após tomar ciência, qualquer incidente de segurança que possa acarretar risco ou dano relevante aos titulares, prestando as informações necessárias para que a Controladora cumpra suas obrigações perante a ANPD e os titulares.

9. TÉRMINO
9.1. Encerrado o contrato, o Operador, conforme opção da Controladora, devolverá ou eliminará os dados pessoais, salvo os que deva reter por obrigação legal, que permanecerão protegidos até o fim do prazo.

10. RESPONSABILIDADE
10.1. Cada parte responde pelas obrigações que a LGPD lhe atribui na qualidade de Controladora ou Operador.

11. ENCARREGADO (DPO)
11.1. Encarregado do Operador: [nome e e-mail do Encarregado a definir]. Solicitações de titulares devem ser encaminhadas à Controladora, que acionará o Operador quando necessário.

12. LEGISLAÇÃO E FORO
12.1. Aplica-se a legislação brasileira. Fica eleito o foro da comarca de Campina Grande — PB, salvo disposição diversa no contrato principal.

Ao aceitar este Termo, a Controladora declara ter lido e concordado com suas condições, ficando o aceite registrado eletronicamente com nome, usuário, data e hora.`
