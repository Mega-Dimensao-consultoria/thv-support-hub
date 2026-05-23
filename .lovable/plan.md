## Objetivo

Adicionar papel **admin** (acima de gestor) e um painel de administração completo para gerenciar usuários, papéis, departamentos vinculados a gestores, bloqueio e remoção lógica preservando histórico de chamados.

## 1. Banco de dados (migration)

**Enum `app_role`**: adicionar valor `'admin'`.

**`perfis_usuarios`** — novas colunas:
- `bloqueado boolean not null default false`
- `bloqueado_em timestamptz`, `bloqueado_por uuid`
- `removido boolean not null default false`
- `removido_em timestamptz`
- `nome_historico text` (snapshot do nome no momento da remoção, usado para exibir "Ex-funcionário: <nome>")

**Nova tabela `gestor_departamentos`** (N:N — um gestor pode ter vários departamentos):
- `user_id uuid`, `departamento_id uuid`, `created_at`
- PK composta (`user_id`, `departamento_id`)

> A coluna atual `departamentos.gestor_id` é 1:1; passa a ser legada (mantida para compatibilidade, mas a UI e as queries de "gestores do depto" usam a nova tabela).

**Funções security definer**:
- `is_admin(_uid uuid)` — wrapper sobre `has_role`.
- `is_active(_uid uuid)` — `not bloqueado and not removido`.
- `is_gestor_of_dept(_uid, _dept)` — consulta `gestor_departamentos`.

**Políticas RLS — atualizações**:
- `chamados`, `mensagens_chamado`, etc.: bloquear INSERT/UPDATE quando `not is_active(auth.uid())`.
- `user_roles`: somente **admin** pode INSERT/UPDATE/DELETE papéis (gestor perde essa permissão).
- `perfis_usuarios`: admin tem ALL; gestor pode UPDATE apenas `bloqueado` de usuários do seu departamento; remoção/role-change só admin.
- `departamentos`, `topicos_suporte`, `perguntas_triagem`: admin ALL; gestor mantém escrita no que já tinha (config operacional).
- `gestor_departamentos`: SELECT autenticado; INSERT/DELETE só admin.

**Trigger `handle_new_user`**: mantém criação de perfil; papel padrão continua `solicitante`.

**Trigger de auditoria em login/uso**: opcional — bloquear via política RLS já é suficiente; cliente também checa `bloqueado` e faz `signOut`.

## 2. Remoção lógica (preserva histórico)

Soft-delete em `perfis_usuarios`:
1. `nome_historico := 'Ex-funcionário: ' || nome`
2. `removido := true`, `removido_em := now()`
3. Revoga todos os `user_roles` do usuário.
4. Remove vínculos em `gestor_departamentos`.
5. (Opcional) Server function admin chama `supabaseAdmin.auth.admin.deleteUser(id)` ou `updateUserById(id, { ban_duration: '876600h' })` para impedir login. **Decisão recomendada**: banir (não deletar) para manter FK em `auth.users` íntegra.

**Exibição em chamados**: helper UI lê `nome_historico` quando `removido = true`; senão `nome`. Aplicado em lista de chamados, detalhe, chat e dashboard.

## 3. Server functions (admin) — `src/lib/admin.functions.ts`

Todas com `requireSupabaseAuth` + verificação `has_role(uid, 'admin')`; usam `supabaseAdmin` para criar/banir usuários:

- `adminListUsers()` — perfis + roles + departamentos vinculados + flags.
- `adminCreateUser({ email, nome, empresa_id, role, departamento_ids? })` — cria via `auth.admin.createUser`, insere perfil, role; se `role='gestor'`, insere em `gestor_departamentos`.
- `adminUpdateUserRole({ user_id, role, departamento_ids? })`.
- `adminSetUserDepartments({ user_id, departamento_ids })` — só faz sentido p/ gestor.
- `adminBlockUser({ user_id, bloqueado })` — também aceito por **gestor** (server function separada `gestorBlockUser` restrita ao próprio departamento).
- `adminRemoveUser({ user_id })` — soft delete + ban.

## 4. Frontend

**Rota `/admin/usuarios`** (somente admin, gate em `_authenticated` + check de role):
- Tabela: nome, email, empresa, papel, departamentos (chips), status (ativo/bloqueado/removido), ações.
- Modal "Novo usuário": email, nome, empresa, papel (select), multi-select de departamentos (visível se papel=gestor).
- Ações por linha: editar papel/departamentos, bloquear/desbloquear, remover (com confirmação destacando que histórico será preservado como "Ex-funcionário").

**Rota `/admin` (config existente)**: ganha aba "Usuários" linkando para `/admin/usuarios`. Acesso de config (departamentos, tópicos, perguntas) passa a exigir admin **ou** gestor; criação de gestor só admin.

**Gestor — ação de bloqueio**: na tela `/atendimento` e numa nova aba "Equipe" em `/dashboard`, gestor vê usuários do(s) seu(s) departamento(s) e pode bloquear/desbloquear (não remover, não mudar papel).

**Exibição de "Ex-funcionário"**: criar helper `displayName(perfil)` reutilizado em todas as listagens/detalhes de chamados.

**Login**: ao autenticar, verificar `perfis_usuarios.bloqueado/removido`; se true, `signOut` + toast "Acesso bloqueado".

## 5. Primeiro admin

Documentar no toast pós-deploy:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'seu@email.com';
```
(Mesmo padrão usado para gestor, agora apontando para admin.)

## Detalhes técnicos

```text
auth.users ──1:1── perfis_usuarios ──N:1── empresas
                       │
                       ├── user_roles (N — solicitante|atendente|gestor|admin)
                       └── gestor_departamentos (N:N) ── departamentos
chamados.solicitante_id / atendente_id → perfis_usuarios (nunca CASCADE)
```

- Nenhum FK com CASCADE em `chamados`/`mensagens` para `perfis_usuarios` — soft delete preserva tudo.
- RLS de leitura de chamados continua igual; nomes vêm de `perfis_usuarios` mesmo após remoção (linha permanece, só com flags).
- Toda mutação privilegiada passa por server fn — UI nunca chama `auth.admin.*` direto.

## Perguntas pendentes

1. Ao remover usuário, prefere **banir no Auth** (recomendado, FK preservada) ou **deletar do Auth** (mais "limpo", exige nullable nos FKs)?
2. Gestor pode bloquear usuários **somente do seu departamento** ou qualquer solicitante? (Plano assume: só do seu depto.)
3. Admin também aparece como opção de "atendente"/responsável em chamados, ou é puramente administrativo? (Plano assume: puramente administrativo.)
