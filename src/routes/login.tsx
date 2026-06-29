import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? (search.redirect as string) : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = (() => {
    const r = search.redirect;
    if (!r || typeof r !== 'string') return '/chamados';
    // só aceitamos paths relativos para evitar open-redirect
    return r.startsWith('/') && !r.startsWith('//') ? r : '/chamados';
  })();
  const [tab, setTab] = useState("entrar");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // Signup fields
  const [nome, setNome] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [senhaReg, setSenhaReg] = useState("");
  const [empresaId, setEmpresaId] = useState("");

  const { data: empresas } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectTo });
    });
  }, [navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: redirectTo });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return toast.error("Selecione a empresa");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: emailReg,
      password: senhaReg,
      options: {
        emailRedirectTo: `${window.location.origin}/chamados`,
        data: { nome, empresa_id: empresaId },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
    setTab("entrar");
    setEmail(emailReg);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <button type="button" onClick={() => navigate({ to: "/" })} className="tappable mb-6 flex items-center justify-center gap-2 w-full">
          <div className="h-10 w-10 rounded-lg bg-[var(--gradient-brand)] grid place-items-center text-primary-foreground font-bold">T</div>
          <span className="font-display text-xl font-semibold">Grupo THV</span>
        </button>
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle>Central de Chamados</CardTitle>
            <CardDescription>Acesse com seu e-mail corporativo</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="cadastrar">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="entrar">
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
                  </div>
                  <Button className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="cadastrar">
                <form onSubmit={handleSignup} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailReg">E-mail</Label>
                    <Input id="emailReg" type="email" required value={emailReg} onChange={(e) => setEmailReg(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senhaReg">Senha</Label>
                    <Input id="senhaReg" type="password" required minLength={6} value={senhaReg} onChange={(e) => setSenhaReg(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Select value={empresaId} onValueChange={setEmpresaId}>
                      <SelectTrigger><SelectValue placeholder="Selecione sua empresa" /></SelectTrigger>
                      <SelectContent>
                        {empresas?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}