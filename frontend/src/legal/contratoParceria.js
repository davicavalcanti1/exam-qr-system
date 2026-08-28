// Fonte única do modelo padrão do Contrato de Parceria.
//
// Este arquivo é a SEMENTE do contrato da plataforma: o dono o publica como
// versão em `contrato_padrao` (painel do dono → Contratos), e as empresas que
// adotam (`contrato_modelos.usa_padrao`) geram a partir da versão vigente no
// banco — não deste arquivo. O bundle continua sendo o fallback de quando nada
// foi publicado ainda, que é o comportamento anterior à migration
// 20260828120000_contrato_padrao.
//
// Editar aqui NÃO muda o contrato de ninguém em produção: é preciso publicar
// versão nova no painel. Isso é de propósito — deploy não deve reescrever texto
// jurídico em uso.
//
// ⚠️ REVISÃO JURÍDICA PENDENTE. Este texto foi redigido a partir da legislação
// aplicável (referências ao pé), mas NÃO substitui parecer de advogado. O ponto
// que mais precisa de revisão é a cláusula 4 (vedações éticas — art. 58 e 59 do
// Código de Ética Médica, Res. CFM 2.217/2018): é ela que separa "o parceiro
// contrata e paga um serviço" de "o parceiro é remunerado por encaminhamento",
// que é vedado ao médico.
//
// PREMISSAS DESTE MODELO (mudam o texto, não o código):
//   - o Parceiro é sempre PESSOA JURÍDICA (clínica ou consultório);
//   - a forma de repasse ao paciente VARIA por parceiro → cláusula 8.1, vinda
//     de `parceiros.forma_repasse` (ver REPASSE no fim do arquivo).
//
// PLACEHOLDERS. Três origens, todas resolvidas em `ContratosArea.jsx` → `gerar`:
//   1. cadastro, automático: {{empresa_nome}} {{empresa_cnpj}} {{empresa_endereco}}
//      {{parceiro_nome}} {{parceiro_cnpj}} {{parceiro_endereco}} {{teto}} {{data}}
//   2. parâmetros da clínica (PARAMETROS abaixo): prazos, multa, juros, foro…
//   3. por parceiro: {{forma_repasse}}, de `parceiros.forma_repasse` (REPASSE).
// Não introduza placeholder novo sem origem: o que não resolve fica escrito como
// "{{...}}" no PDF que vai para assinatura.
//
// O texto NÃO tem mais colchetes. Era o que impedia a clínica de simplesmente
// adotar o contrato do sistema: `[comarca/UF]` em branco chegava na assinatura.
//
// BASE LEGAL das cláusulas 7.3 e 14: MP 2.200-2/2001 art. 10 §2; Lei
// 14.063/2020 art. 4º; CPC art. 784, III e §4º (redação da Lei 14.620/2023).

export const CONTRATO_VERSAO = '2026-08-28'

export const CONTRATO_TITULO = 'Contrato de Parceria para Prestação de Serviços de Diagnóstico'

export const CONTRATO_MODELO = `CONTRATO DE PARCERIA PARA PRESTAÇÃO DE SERVIÇOS DE DIAGNÓSTICO

Modelo versão ${CONTRATO_VERSAO}

1. PARTES

1.1. CONTRATADA: {{empresa_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{empresa_cnpj}}, com sede em {{empresa_endereco}}, neste ato representada por seu representante legal, doravante "CLÍNICA".

1.2. CONTRATANTE: {{parceiro_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{parceiro_cnpj}}, com sede em {{parceiro_endereco}}, neste ato representada pelo representante legal identificado no ato da assinatura eletrônica deste instrumento, doravante "PARCEIRO".

1.3. As Partes declaram que os representantes que assinam este instrumento detêm poderes para tanto e que as informações cadastrais acima estão corretas, obrigando-se a comunicar qualquer alteração.

2. DEFINIÇÕES

2.1. PLATAFORMA: o sistema utilizado pela CLÍNICA para autorizar exames, controlar o teto de crédito do PARCEIRO e fechar as cobranças.
2.2. EXAME: cada procedimento de diagnóstico prestado pela CLÍNICA a paciente indicado pelo PARCEIRO, na forma deste contrato.
2.3. QR CODE: código gerado pela PLATAFORMA que, ao ser lido no atendimento, confirma a realização do EXAME.
2.4. TETO DE CRÉDITO: limite financeiro máximo que o PARCEIRO pode ter em EXAMES realizados e ainda não pagos.
2.5. LOTE: conjunto de EXAMES confirmados em determinado período, fechado para cobrança.

3. OBJETO

3.1. A CLÍNICA prestará serviços de diagnóstico aos pacientes indicados pelo PARCEIRO, e o PARCEIRO figura como CONTRATANTE e responsável pelo pagamento desses serviços, até o TETO DE CRÉDITO e nas condições aqui previstas.

3.2. A contratação é feita pelo PARCEIRO em nome próprio, na qualidade de tomador do serviço. Não há, entre as Partes, sociedade, consórcio, mandato, franquia, vínculo empregatício ou de subordinação, nem responsabilidade solidária por obrigações da outra Parte.

3.3. Este contrato não confere exclusividade a nenhuma das Partes, nem impõe ao PARCEIRO qualquer meta, cota ou volume de indicações.

4. NATUREZA DA CONTRAPRESTAÇÃO E VEDAÇÕES ÉTICAS

4.1. Os valores previstos neste contrato constituem exclusivamente contraprestação por serviços de diagnóstico EFETIVAMENTE PRESTADOS pela CLÍNICA e confirmados pela leitura do QR CODE.

4.2. É expressamente vedado, e as Partes declaram que não ocorre por força deste contrato:
   a) o pagamento ou o recebimento de qualquer remuneração, comissão, bonificação, desconto, cortesia ou vantagem, direta ou indireta, em razão de paciente encaminhado ou recebido;
   b) o pagamento por atendimento não prestado;
   c) a divisão, partilha ou retenção de honorários médicos entre as Partes, ou a inclusão, para fins de cobrança, de profissional que não tenha participado do ato médico;
   d) qualquer forma de vinculação da remuneração de profissional médico ao volume de exames indicados.

4.3. As Partes reconhecem que as vedações do item 4.2 decorrem do Código de Ética Médica (Resolução CFM nº 2.217/2018, em especial os arts. 58, 59, 60 e 67) e que sua inobservância caracteriza infração ética, autorizando a rescisão imediata deste contrato.

4.4. A CLÍNICA não interfere na conduta clínica do PARCEIRO, e o PARCEIRO não interfere na conduta técnica da CLÍNICA. É preservada a liberdade do paciente de escolher o prestador do serviço, devendo o PARCEIRO informá-lo de que a indicação não o obriga a realizar o exame na CLÍNICA.

5. TETO DE CRÉDITO

5.1. O TETO DE CRÉDITO do PARCEIRO é de {{teto}}.
5.2. O valor de cada EXAME é debitado do TETO somente após a confirmação da realização pela leitura do QR CODE. Exames autorizados e não realizados não geram débito.
5.3. Atingido o TETO, a PLATAFORMA bloqueia novas autorizações até que haja pagamento ou revisão do limite.
5.4. A baixa do pagamento de um LOTE recompõe o TETO no valor correspondente.
5.5. O TETO pode ser revisto pela CLÍNICA, para mais ou para menos, mediante comunicação ao PARCEIRO pela PLATAFORMA, com efeito para as autorizações posteriores à comunicação. A redução não afeta exames já autorizados.

6. PREÇOS, COBRANÇA E PAGAMENTO

6.1. Os valores de cada EXAME são os da tabela de preços vigente na PLATAFORMA na data da autorização, disponível ao PARCEIRO no seu painel.
6.2. Reajustes de tabela são comunicados com antecedência mínima de {{reajuste_aviso}} dias e não retroagem a exames já autorizados.
6.3. A CLÍNICA fecha as cobranças por LOTE, conforme a periodicidade por ela definida, disponibilizando ao PARCEIRO a relação dos exames confirmados, com data, paciente, procedimento e valor.
6.4. O pagamento do LOTE vence em {{prazo_pagamento}} dias contados da disponibilização da cobrança, pelo meio indicado pela CLÍNICA.
6.5. A CLÍNICA emite o documento fiscal correspondente aos serviços prestados, na forma da legislação aplicável.
6.6. Divergências sobre o LOTE devem ser apontadas em até {{prazo_impugnacao}} dias da disponibilização; após esse prazo, o LOTE é considerado aceito quanto aos itens não impugnados. A impugnação de um item não suspende o vencimento dos demais.

7. INADIMPLÊNCIA

7.1. O atraso no pagamento sujeita o PARCEIRO a multa de {{multa}}% sobre o valor em atraso, juros de mora de {{juros}}% ao mês, pro rata die, e correção monetária pelo {{correcao}}, sem prejuízo das despesas de cobrança.
7.2. Verificado o atraso, a CLÍNICA pode suspender o TETO DE CRÉDITO e as novas autorizações, restabelecendo-os com a regularização.
7.3. As Partes reconhecem que a relação dos EXAMES confirmados por leitura de QR CODE, integrante do LOTE e disponibilizada na PLATAFORMA, constitui dívida líquida, certa e exigível, e que este instrumento, assinado eletronicamente, é título executivo extrajudicial, nos termos do art. 784, inciso III e § 4º, do Código de Processo Civil.

8. RELAÇÃO DO PARCEIRO COM O PACIENTE

8.1. Forma de repasse do custo do EXAME ao paciente, adotada por este PARCEIRO:
   {{forma_repasse}}

8.2. Qualquer valor cobrado do paciente pelo PARCEIRO é de sua exclusiva responsabilidade, inclusive quanto à informação prévia ao paciente, à emissão de documento fiscal e ao recolhimento de tributos, não cabendo à CLÍNICA qualquer participação nesse valor.
8.3. O PARCEIRO não se apresentará como prestador do serviço de diagnóstico nem utilizará a marca da CLÍNICA sem autorização escrita.
8.4. O PARCEIRO assegura que o paciente é informado de que o exame será realizado pela CLÍNICA e que a indicação não o vincula a ela.

9. OBRIGAÇÕES DO PARCEIRO

9.1. Indicar exames acompanhados de solicitação médica válida, com indicação clínica pertinente.
9.2. Manter seus dados cadastrais atualizados na PLATAFORMA, inclusive o e-mail de contato do responsável.
9.3. Zelar pelas credenciais de acesso, que são pessoais e intransferíveis, respondendo pelos atos praticados por seus usuários, e comunicar imediatamente qualquer suspeita de uso indevido.
9.4. Obter do paciente as autorizações necessárias ao compartilhamento de seus dados com a CLÍNICA para a realização do exame.
9.5. Pagar os LOTES nos prazos ajustados.

10. OBRIGAÇÕES DA CLÍNICA

10.1. Prestar os serviços com a diligência técnica exigível, por profissionais habilitados, mantendo as licenças sanitárias e os registros profissionais pertinentes.
10.2. Emitir o laudo dos exames realizados, na forma e nos prazos praticados.
10.3. Manter na PLATAFORMA, à disposição do PARCEIRO, a tabela de preços, o saldo do TETO e a relação dos exames confirmados.
10.4. Comunicar ao PARCEIRO as alterações de tabela, de TETO e de periodicidade de cobrança.

11. RESPONSABILIDADE TÉCNICA E ASSISTENCIAL

11.1. O ato médico praticado na CLÍNICA, o laudo e a guarda das imagens são de responsabilidade exclusiva da CLÍNICA e de seus profissionais.
11.2. A indicação do exame e a conduta clínica perante o paciente são de responsabilidade exclusiva do PARCEIRO e de seus profissionais.
11.3. Nenhuma das Partes responde por ato ou omissão de profissional vinculado à outra.

12. PROTEÇÃO DE DADOS PESSOAIS

12.1. As Partes obrigam-se ao cumprimento da Lei nº 13.709/2018 (LGPD) e ao sigilo profissional, tratando os dados pessoais e os dados de saúde compartilhados exclusivamente para a finalidade deste contrato.
12.2. Cada Parte é controladora dos dados que trata no âmbito da sua própria atividade, respondendo pelas bases legais que invoca. O tratamento realizado pela PLATAFORMA rege-se pelo Termo de Tratamento de Dados Pessoais (DPA) aceito na PLATAFORMA, que integra este contrato.
12.3. As Partes adotarão medidas técnicas e administrativas de segurança e comunicarão à outra, sem demora injustificada, qualquer incidente de segurança que possa afetar os dados compartilhados.
12.4. Encerrado o contrato, os dados são mantidos apenas pelo prazo exigido por obrigação legal, regulatória ou de guarda de prontuário.

13. CONFIDENCIALIDADE

13.1. As Partes manterão sigilo sobre tabelas de preço, condições comerciais, dados de pacientes e informações a que tiverem acesso em razão deste contrato, obrigação que subsiste por {{sigilo_anos}} anos após o término, e por prazo indeterminado quanto a dados de pacientes e ao segredo profissional.

14. ASSINATURA ELETRÔNICA E VALIDADE PROBATÓRIA

14.1. As Partes ADMITEM EXPRESSAMENTE COMO VÁLIDA a assinatura deste contrato por meio eletrônico, para os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, ainda que o certificado utilizado não seja emitido pela ICP-Brasil.
14.2. As Partes reconhecem como meios idôneos de comprovação de autoria e integridade: a identificação do signatário pelo endereço de e-mail cadastrado e pela confirmação de código enviado a ele; o registro de data, hora e endereço IP do aceite; a trilha de auditoria do provedor de assinatura eletrônica; e o resumo criptográfico (hash SHA-256) do documento assinado.
14.3. As Partes renunciam a impugnar a validade deste instrumento com fundamento exclusivo na sua forma eletrônica ou na ausência de certificação ICP-Brasil, e reconhecem, quando a integridade for conferida por provedor de assinatura, a dispensa de testemunhas prevista no art. 784, § 4º, do Código de Processo Civil.
14.4. A via eletrônica arquivada na PLATAFORMA, acompanhada do respectivo hash e da trilha de auditoria, faz prova do conteúdo contratado.

15. VIGÊNCIA E RESCISÃO

15.1. Este contrato vigora por {{vigencia_meses}} meses a contar da data da assinatura eletrônica, renovando-se automaticamente por iguais períodos, salvo denúncia de qualquer das Partes com {{aviso_previo}} dias de antecedência.
15.2. Qualquer das Partes pode rescindir imotivadamente mediante aviso escrito com {{aviso_previo}} dias de antecedência.
15.3. A rescisão é imediata, independentemente de aviso prévio, em caso de: inadimplemento não sanado em {{prazo_cura}} dias da notificação; uso indevido da PLATAFORMA ou compartilhamento de credenciais; infração ao item 4.2; perda de licença sanitária ou de registro profissional indispensável à atividade; falência, recuperação judicial ou insolvência.
15.4. A rescisão não afeta as obrigações de pagamento dos exames já confirmados, que permanecem exigíveis.
15.5. Rescindido o contrato, cessam as autorizações de novos exames; os exames já autorizados e ainda não realizados podem ser cancelados pela CLÍNICA.

16. DISPOSIÇÕES GERAIS

16.1. A tolerância quanto ao descumprimento de qualquer obrigação não implica novação, renúncia ou alteração do ajustado.
16.2. É vedada a cessão ou transferência deste contrato, total ou parcial, sem anuência escrita da outra Parte.
16.3. A nulidade de qualquer cláusula não contamina as demais.
16.4. Este instrumento, com o DPA e a tabela de preços vigente na PLATAFORMA, constitui o acordo integral entre as Partes quanto ao seu objeto, substituindo entendimentos anteriores.
16.5. As comunicações entre as Partes são válidas quando feitas pela PLATAFORMA ou para os e-mails cadastrados.

17. FORO

17.1. Fica eleito o foro da comarca de {{foro_comarca}} para dirimir controvérsias oriundas deste contrato, com renúncia a qualquer outro.

E por estarem de acordo, as Partes firmam este instrumento por assinatura eletrônica, em via única e digital, na data de {{data}}.`

// Parâmetros que a CLÍNICA define uma vez (`contrato_modelos.parametros`), com o
// default vindo da versão publicada (`contrato_padrao.parametros`). `obrigatorio`
// = sem valor, a geração do contrato é bloqueada em vez de escrever vazio.
export const PARAMETROS = [
  { k: 'prazo_pagamento', label: 'Prazo de pagamento do lote', sufixo: 'dias', padrao: '15', obrigatorio: true, clausula: '6.4' },
  { k: 'reajuste_aviso', label: 'Aviso prévio de reajuste de tabela', sufixo: 'dias', padrao: '30', clausula: '6.2' },
  { k: 'prazo_impugnacao', label: 'Prazo para contestar o lote', sufixo: 'dias', padrao: '5', clausula: '6.6' },
  { k: 'multa', label: 'Multa por atraso', sufixo: '%', padrao: '2', clausula: '7.1' },
  { k: 'juros', label: 'Juros de mora ao mês', sufixo: '%', padrao: '1', clausula: '7.1' },
  { k: 'correcao', label: 'Índice de correção monetária', padrao: 'IPCA', clausula: '7.1' },
  { k: 'sigilo_anos', label: 'Confidencialidade após o término', sufixo: 'anos', padrao: '2', clausula: '13.1' },
  { k: 'vigencia_meses', label: 'Vigência', sufixo: 'meses', padrao: '12', clausula: '15.1' },
  { k: 'aviso_previo', label: 'Aviso prévio para denúncia', sufixo: 'dias', padrao: '30', clausula: '15.1 e 15.2' },
  { k: 'prazo_cura', label: 'Prazo para sanar inadimplemento', sufixo: 'dias', padrao: '10', clausula: '15.3' },
  // Sem default possível: depende de onde a clínica está.
  { k: 'foro_comarca', label: 'Foro (comarca/UF)', padrao: '', obrigatorio: true, clausula: '17.1' },
]

export const PARAMETROS_PADRAO = Object.fromEntries(PARAMETROS.map(p => [p.k, p.padrao]))

// Cláusula 8.1, por parceiro (`parceiros.forma_repasse`). O texto de cada opção
// entra inteiro no contrato — é a redação que separa compra de serviço de
// vantagem por encaminhamento, então não é para resumir na tela e sim para o
// parceiro assinar declarando qual é o caso dele.
export const REPASSE = {
  sem_repasse: {
    label: 'Sem repasse ao paciente',
    texto: '(a) Sem repasse: o custo do EXAME é integralmente absorvido pelo PARCEIRO, nada sendo cobrado do paciente a esse título.',
  },
  repasse_integral: {
    label: 'Repasse integral, sem margem',
    texto: '(b) Repasse integral: o PARCEIRO repassa ao paciente exatamente o valor que paga à CLÍNICA, sem acréscimo de margem.',
  },
  repasse_margem: {
    label: 'Repasse com margem do parceiro',
    texto: '(c) Repasse com margem: o PARCEIRO cobra do paciente valor próprio, superior ao que paga à CLÍNICA, por sua exclusiva conta e responsabilidade, observado o item 8.2.',
  },
}

// PENDÊNCIAS deste modelo — não são defeitos do texto, são dados que o sistema
// ainda não tem:
//
//  1. O endereço das duas partes vem de `empresas.endereco` e
//     `parceiros.endereco` (migration 20260715160000_dados_cnpj), preenchidos
//     pela consulta de CNPJ. Cadastro sem endereço gera contrato com "—" na
//     qualificação: o painel do dono sinaliza. Já o REPRESENTANTE LEGAL não
//     existe em nenhuma das duas tabelas — a cláusula 1.2 resolve remetendo a
//     quem assina eletronicamente, e a 1.1 continua genérica.
//  2. A cláusula 14.2 promete registro de IP e hora do aceite. Isso é verdade no
//     caminho ZapSign e AINDA NÃO no aceite interno, que grava `assinado_at` com
//     o relógio do navegador (`pages/v2/ContratoModal.jsx`) e não registra IP.
//     Enquanto esse aceite não for para o servidor, o item 14.2 descreve mais do
//     que o sistema entrega quando o provedor está desligado.
