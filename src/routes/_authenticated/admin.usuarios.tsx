import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, Lock, Unlock, Trash2, Pencil, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { adminListUsers, adminCreateUser, adminUpdateUserRole, adminBlockUser, adminRemoveUser, adminUpdateUser } from "@/lib/admin.functions";

type Role = "solicitante" | "atendente" | "gestor" | "admin";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: AdminUsuarios,
});

function AdminUsuarios() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListUsers);
  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUserRole);
  const blockFn = useServerFn(adminBlockUser);
  const removeFn = useServerFn(adminRemoveUser);
  const updateUserFn = useServerFn(adminUpdateUser);

  useEffect(() => {
    if (!loading && !roles.includes("admin")) navigate({ to: "/chamados" });
  }, [loading, roles, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: () => listFn(),
    enabled: roles.includes("admin"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users-full"] });

  if (loading || !roles.includes("admin")) {
    return <div className="grid place-items-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Cadastre, defina papéis, bloqueie e remova usuários.</p>
        </div>
        <CreateUserDialog
          empresas={data?.empresas ?? []}
          departamentos={data?.departamentos ?? []}
          onCreate={async (payload) => {
            try {
              await createFn({ data: payload });
              toast.success("Usuário criado");
              invalidate();
              return true;
            } catch (e) { toast.error((e as Error).message); return false; }
          }}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="divide-y">
              {data?.users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{u.removido ? u.nome_historico : u.nome}</span>
                      {u.removido && <Badge variant="destructive">Removido</Badge>}
                      {u.bloqueado && !u.removido && <Badge variant="secondary">Bloqueado</Badge>}
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="uppercase text-[10px]">{r}</Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} • {u.empresa_nome ?? "—"}
                      {u.roles.includes("gestor") && u.departamento_ids.length > 0 && (
                        <> • Deptos: {u.departamento_ids.map((id) => data?.departamentos.find((d) => d.id === id)?.nome).filter(Boolean).join(", ")}</>
                      )}
                    </div>
                  </div>
                  {!u.removido && (
                    <div className="flex items-center gap-2">
                      <EditRoleDialog
                        user={u}
                        departamentos={data?.departamentos ?? []}
                        onSave={async (payload) => {
                          try {
                            await updateFn({ data: { user_id: u.id, ...payload } });
                            toast.success("Papel atualizado"); invalidate(); return true;
                          } catch (e) { toast.error((e as Error).message); return false; }
                        }}
                      />
                      <EditUserDataDialog
                        user={u}
                        empresas={data?.empresas ?? []}
                        onSave={async (payload) => {
                          try {
                            await updateUserFn({ data: { user_id: u.id, ...payload } });
                            toast.success("Dados atualizados"); invalidate(); return true;
                          } catch (e) { toast.error((e as Error).message); return false; }
                        }}
                      />
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await blockFn({ data: { user_id: u.id, bloqueado: !u.bloqueado } });
                          toast.success(u.bloqueado ? "Usuário desbloqueado" : "Usuário bloqueado");
                          invalidate();
                        } catch (e) { toast.error((e as Error).message); }
                      }}>
                        {u.bloqueado ? <><Unlock className="h-4 w-4 mr-1" />Desbloquear</> : <><Lock className="h-4 w-4 mr-1" />Bloquear</>}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário perderá acesso imediato. Os chamados antigos passarão a ser identificados como
                              <strong> "Ex-funcionário: {u.nome}"</strong>, preservando o histórico para auditoria.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              try {
                                await removeFn({ data: { user_id: u.id } });
                                toast.success("Usuário removido"); invalidate();
                              } catch (e) { toast.error((e as Error).message); }
                            }}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
              {data?.users.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário cadastrado.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateUserDialog({ empresas, departamentos, onCreate }: {
  empresas: { id: string; nome: string }[];
  departamentos: { id: string; nome: string }[];
  onCreate: (p: { email: string; nome: string; password: string; empresa_id: string | null; role: Role; departamento_ids?: string[] }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [role, setRole] = useState<Role>("solicitante");
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setNome(""); setEmail(""); setPassword(""); setEmpresaId(""); setRole("solicitante"); setDeptIds([]); };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" />Novo usuário</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cadastrar novo usuário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Senha provisória</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" /></div>
          <div>
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solicitante">Solicitante</SelectItem>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "gestor" && (
            <div>
              <Label>Departamentos sob gestão</Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                {departamentos.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={deptIds.includes(d.id)} onCheckedChange={(v) => {
                      setDeptIds((prev) => v ? [...prev, d.id] : prev.filter((x) => x !== d.id));
                    }} />
                    {d.nome}
                  </label>
                ))}
                {departamentos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum departamento.</p>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={saving || !nome || !email || password.length < 8} onClick={async () => {
            setSaving(true);
            const ok = await onCreate({ nome, email, password, empresa_id: empresaId || null, role, departamento_ids: role === "gestor" ? deptIds : undefined });
            setSaving(false);
            if (ok) { setOpen(false); reset(); }
          }}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({ user, departamentos, onSave }: {
  user: { id: string; roles: string[]; departamento_ids: string[] };
  departamentos: { id: string; nome: string }[];
  onSave: (p: { role: Role; departamento_ids?: string[] }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>((user.roles[0] as Role) ?? "solicitante");
  const [deptIds, setDeptIds] = useState<string[]>(user.departamento_ids);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setRole((user.roles[0] as Role) ?? "solicitante"); setDeptIds(user.departamento_ids); } }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-1" />Editar</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar papel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solicitante">Solicitante</SelectItem>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "gestor" && (
            <div>
              <Label>Departamentos sob gestão</Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                {departamentos.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={deptIds.includes(d.id)} onCheckedChange={(v) => {
                      setDeptIds((prev) => v ? [...prev, d.id] : prev.filter((x) => x !== d.id));
                    }} />
                    {d.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            const ok = await onSave({ role, departamento_ids: role === "gestor" ? deptIds : undefined });
            setSaving(false);
            if (ok) setOpen(false);
          }}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDataDialog({ user, empresas, onSave }: {
  user: { id: string; nome: string | null; email: string; empresa_id: string | null };
  empresas: { id: string; nome: string }[];
  onSave: (p: { nome: string; email: string; empresa_id: string | null; password?: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(user.nome ?? "");
  const [email, setEmail] = useState(user.email);
  const [empresaId, setEmpresaId] = useState<string>(user.empresa_id ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(user.nome ?? "");
      setEmail(user.email);
      setEmpresaId(user.empresa_id ?? "");
      setPassword("");
    }
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><UserCog className="h-4 w-4 mr-1" />Dados</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar dados do usuário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nova senha (opcional)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="deixe em branco para manter" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={saving || !nome || !email} onClick={async () => {
            setSaving(true);
            const ok = await onSave({
              nome, email,
              empresa_id: empresaId || null,
              password: password.length >= 8 ? password : undefined,
            });
            setSaving(false);
            if (ok) setOpen(false);
          }}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}