import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas administradores");
}

async function assertAdminOrGestor(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gestor"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso negado");
  return data.map((r) => r.role);
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrGestor(context.userId);
    const [perfis, roles, gd, deptos, empresas] = await Promise.all([
      supabaseAdmin.from("perfis_usuarios").select("id, nome, email, empresa_id, bloqueado, removido, nome_historico, removido_em, bloqueado_em").order("nome"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("gestor_departamentos").select("user_id, departamento_id"),
      supabaseAdmin.from("departamentos").select("id, nome"),
      supabaseAdmin.from("empresas").select("id, nome"),
    ]);
    if (perfis.error) throw new Error(perfis.error.message);
    const rolesByUser = new Map<string, string[]>();
    (roles.data ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const deptsByUser = new Map<string, string[]>();
    (gd.data ?? []).forEach((r) => {
      const arr = deptsByUser.get(r.user_id) ?? [];
      arr.push(r.departamento_id);
      deptsByUser.set(r.user_id, arr);
    });
    const empresasMap = new Map((empresas.data ?? []).map((e) => [e.id, e.nome]));
    return {
      users: (perfis.data ?? []).map((p) => ({
        ...p,
        empresa_nome: p.empresa_id ? empresasMap.get(p.empresa_id) ?? null : null,
        roles: rolesByUser.get(p.id) ?? [],
        departamento_ids: deptsByUser.get(p.id) ?? [],
      })),
      departamentos: deptos.data ?? [],
      empresas: empresas.data ?? [],
    };
  });

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  nome: z.string().min(1).max(120),
  empresa_id: z.string().uuid().nullable().optional(),
  password: z.string().min(8).max(72),
  role: z.enum(["solicitante", "atendente", "gestor", "admin"]),
  departamento_ids: z.array(z.string().uuid()).optional(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome, empresa_id: data.empresa_id ?? null },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    const uid = created.user.id;
    // Garante perfil (trigger handle_new_user já cria, mas reforçamos)
    await supabaseAdmin.from("perfis_usuarios").upsert({
      id: uid, nome: data.nome, email: data.email, empresa_id: data.empresa_id ?? null,
    });
    // Ajusta papel: remove default 'solicitante' se for outro
    if (data.role !== "solicitante") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).eq("role", "solicitante");
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    }
    if (data.role === "gestor" && data.departamento_ids?.length) {
      await supabaseAdmin.from("gestor_departamentos").insert(
        data.departamento_ids.map((d) => ({ user_id: uid, departamento_id: d })),
      );
    }
    return { user_id: uid };
  });

const UpdateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["solicitante", "atendente", "gestor", "admin"]),
  departamento_ids: z.array(z.string().uuid()).optional(),
});

export const adminUpdateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    await supabaseAdmin.from("gestor_departamentos").delete().eq("user_id", data.user_id);
    if (data.role === "gestor" && data.departamento_ids?.length) {
      await supabaseAdmin.from("gestor_departamentos").insert(
        data.departamento_ids.map((d) => ({ user_id: data.user_id, departamento_id: d })),
      );
    }
    return { ok: true };
  });

const BlockSchema = z.object({
  user_id: z.string().uuid(),
  bloqueado: z.boolean(),
});

export const adminBlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BlockSchema.parse(input))
  .handler(async ({ data, context }) => {
    const roles = await assertAdminOrGestor(context.userId);
    const isAdmin = roles.includes("admin");
    if (!isAdmin) {
      // Gestor: precisa que o usuário-alvo tenha pelo menos um chamado em um depto do gestor
      const { data: meDepts } = await supabaseAdmin
        .from("gestor_departamentos").select("departamento_id").eq("user_id", context.userId);
      const deptIds = (meDepts ?? []).map((d) => d.departamento_id);
      if (deptIds.length === 0) throw new Error("Gestor sem departamentos vinculados");
      const { data: chams } = await supabaseAdmin
        .from("chamados").select("id").eq("solicitante_id", data.user_id).in("departamento_id", deptIds).limit(1);
      if (!chams || chams.length === 0) throw new Error("Usuário não pertence ao seu departamento");
    }
    await supabaseAdmin.from("perfis_usuarios").update({
      bloqueado: data.bloqueado,
      bloqueado_em: data.bloqueado ? new Date().toISOString() : null,
      bloqueado_por: data.bloqueado ? context.userId : null,
    }).eq("id", data.user_id);
    // Banir/desbanir no Auth para impedir login
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.bloqueado ? "876000h" : "none",
    });
    return { ok: true };
  });

const RemoveSchema = z.object({ user_id: z.string().uuid() });

export const adminRemoveUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RemoveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) throw new Error("Você não pode remover a si mesmo");
    const { data: perfil } = await supabaseAdmin
      .from("perfis_usuarios").select("nome").eq("id", data.user_id).maybeSingle();
    const nome = perfil?.nome ?? "Usuário";
    await supabaseAdmin.from("perfis_usuarios").update({
      removido: true,
      removido_em: new Date().toISOString(),
      nome_historico: `Ex-funcionário: ${nome}`,
    }).eq("id", data.user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("gestor_departamentos").delete().eq("user_id", data.user_id);
    // Bane no Auth (preserva FKs em chamados/mensagens)
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "876000h" });
    return { ok: true };
  });

const UpdateUserSchema = z.object({
  user_id: z.string().uuid(),
  nome: z.string().min(1).max(120),
  email: z.string().email().max(255),
  empresa_id: z.string().uuid().nullable().optional(),
  password: z.string().min(8).max(72).optional().or(z.literal("")),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, unknown> } = {
      email: data.email,
      user_metadata: { nome: data.nome, empresa_id: data.empresa_id ?? null },
    };
    if (data.password && data.password.length >= 8) authUpdate.password = data.password;
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, authUpdate);
    if (authErr) throw new Error(authErr.message);
    const { error: profErr } = await supabaseAdmin.from("perfis_usuarios").update({
      nome: data.nome,
      email: data.email,
      empresa_id: data.empresa_id ?? null,
    }).eq("id", data.user_id);
    if (profErr) throw new Error(profErr.message);
    return { ok: true };
  });