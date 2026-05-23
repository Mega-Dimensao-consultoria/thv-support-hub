# Sistema de Chamados Internos — Grupo THV

Aplicação completa em React + TanStack Start, Tailwind, shadcn/ui, Lucide. Backend nativo via **Lovable Cloud** (Supabase gerenciado) para banco, auth e realtime.

## 1. Backend (Lovable Cloud)

Ativar Lovable Cloud e criar via migrations:

**Enums**
- `app_role`: `solicitante | atendente | gestor`
- `chamado_status`: `aguardando_aprovacao | atribuido | concluido | aguardando_tratativa | aguardando_tratativa_externa | aguardando_solicitante | reprovado | sem_resolucao`
- `tipo_campo`: `texto | multipla_escolha`

**Tabelas**
- `empresas` (seed: THV Saneamento Ltda, Soluções D'água, Soluções Locadora)
- `perfis_usuarios` (id = auth.uid, nome, email, empresa_id, criado_at) — sem coluna role
- `user_roles` (user_id, role) — tabela separada por segurança, com função `has_role(uuid, app_role)` SECURITY DEFINER
- `departamentos` (id, nome, gestor_id)
- `topicos_suporte` (id, departamento_id, titulo)
- `perguntas_triagem` (id, topico_id, pergunta_texto, tipo_campo, opcoes text[])
- `chamados` (id, protocolo único `THV-YYYY-XXXX` via sequence + trigger, solicitante_id, empresa_solicitante_id, departamento_id, topico_id, status, atendente_id, gestor_aprovador_id, data_criacao, data_atualizacao)
- `respostas_triagem` (chamado_id, pergunta_texto, resposta_texto)
- `mensagens_chamado` (chamado_id, usuario_id, mensagem html, data_envio)
- `avaliacoes` (chamado_id único, nota 1-5, feedback_texto, data_avaliacao)

**Trigger**: novo usuário em `auth.users` → cria `perfis_usuarios` + role `solicitante` em `user_roles` (lendo empresa do `raw_user_meta_data`).

**RLS** em todas as tabelas, usando `has_role()`:
- Solicitante vê apenas seus chamados; atendente vê os atribuídos; gestor vê os do seu departamento.
- Mensagens/respostas/avaliações herdam visibilidade do chamado.
- Configurações (departamentos, tópicos, triagem) somente gestores escrevem; leitura autenticada.

## 2. Estrutura de Rotas (TanStack Start)

```
/                              Home pública (apresentação 3 marcas + CTA "Abrir Chamado")
/login                         Login/Cadastro (email+senha, seleção de empresa)
/_authenticated/chamados       Painel do solicitante (lista + "+ Novo Chamado")
/_authenticated/chamados/novo  Formulário dinâmico (depto → tópico → triagem → editor)
/_authenticated/chamados/$id   Detalhe + chat + ações conforme role + botão PDF
/_authenticated/atendimento    Painel do atendente (chamados atribuídos)
/_authenticated/aprovacoes     Painel do gestor (fila de aprovação + atribuição)
/_authenticated/dashboard      Dashboard analítico (somente gestor)
/_authenticated/admin          Configurações: departamentos, tópicos, perguntas (gestor)
```

Layout `_authenticated` valida sessão; `beforeLoad` em `/dashboard` e `/admin` exige role `gestor`.

## 3. Fluxos Principais

**Abertura**: select depto (RPC) → select tópico filtrado → render dinâmico de perguntas → editor WYSIWYG (TipTap) → submit cria chamado status `aguardando_aprovacao` + grava respostas.

**Aprovação (Gestor)**: Aprovar → modal de atribuição (eu / automática round-robin entre atendentes / escolher manualmente) → status `atribuido`. Reprovar → `reprovado`.

**Atendimento**: chat em tempo real (Supabase Realtime em `mensagens_chamado`); Select de status com as 6 opções; solicitante também envia mensagens e pode marcar como `concluido`.

**Encerramento**: ao virar `concluido`, modal de avaliação (estrelas 1-5 + feedback) para o solicitante. Bloqueia múltiplas avaliações via unique constraint.

**PDF**: botão "Baixar Histórico em PDF" usando `jspdf` + `html2canvas` — cabeçalho com protocolo/empresa/solicitante, respostas de triagem, transcrição cronológica preservando HTML do editor.

## 4. Dashboard do Gestor

Cards e gráficos (Recharts):
- Total de chamados por status
- Tempo médio de resolução (data_atualizacao − data_criacao para `concluido`)
- Chamados por empresa (barras)
- Média de avaliações geral e ranking por atendente

## 5. UI/UX

- Design moderno com identidade do Grupo THV — paleta corporativa (azul água/verde sustentabilidade), tokens semânticos em `src/styles.css` (oklch).
- Tipografia: Space Grotesk (headings) + Inter (body).
- Skeletons em todas as queries; toasts (sonner) em todas as mutações; estados vazios ilustrados.
- Layout responsivo (mobile-first) com sidebar colapsável no desktop.

## Detalhes técnicos

- **Stack**: React 19, TanStack Start/Router/Query, Tailwind v4, shadcn/ui, Lucide, Sonner, TipTap (editor), Recharts, jsPDF + html2canvas, date-fns.
- **Dados**: `createServerFn` com `requireSupabaseAuth` para leituras/escritas sensíveis (atribuição, mudança de status, listagens cross-user); leituras do próprio usuário direto do client com RLS.
- **Realtime**: subscription no canal `mensagens_chamado:chamado_id=eq.X` na tela de detalhe.
- **Protocolo**: sequence `chamados_seq` + trigger `BEFORE INSERT` formatando `THV-{ano}-{lpad seq 4}`.
- **Seed inicial**: 3 empresas + 1 departamento exemplo + tópicos para o primeiro gestor configurar.
- **Promoção de roles**: primeira conta cadastrada como gestor manualmente via SQL (documentado); demais gerenciados em `/admin`.

## Perguntas antes de implementar

1. **Editor WYSIWYG**: TipTap (leve, headless, integra bem com shadcn) está ok? Senão prefere React-Quill?
2. **Primeiro gestor**: posso provisionar via SQL após o seu primeiro cadastro, ou prefere uma tela inicial de "criar admin"?
3. **Atribuição automática**: round-robin simples entre atendentes do departamento, ou pelo menor número de chamados abertos?
4. **Logo/identidade visual**: tem logos das 3 marcas para usar, ou gero placeholders estilizados?

Posso seguir com defaults sensatos (TipTap, SQL inicial, round-robin por menor carga, placeholders) se preferir só aprovar o plano.