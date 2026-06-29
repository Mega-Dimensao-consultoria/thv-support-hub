import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2, Inbox, PlusCircle, Headphones, ShieldCheck, BarChart3, Settings, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushPrompt } from "@/components/push-prompt";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, roles, perfil, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) {
      const here = pathname + (typeof window !== 'undefined' ? window.location.search : '');
      navigate({ to: "/login", search: { redirect: here } as any });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isGestor = roles.includes("gestor");
  const isAdmin = roles.includes("admin");
  const isAtendente = roles.includes("atendente") || isGestor;

  const nav = [
    { to: "/chamados", label: "Meus chamados", icon: Inbox, show: true },
    { to: "/chamados/novo", label: "Novo chamado", icon: PlusCircle, show: true },
    { to: "/atendimento", label: "Atendimento", icon: Headphones, show: isAtendente },
    { to: "/aprovacoes", label: "Aprovações", icon: ShieldCheck, show: isGestor || isAdmin },
    { to: "/dashboard", label: "Dashboard", icon: BarChart3, show: isGestor || isAdmin },
    { to: "/usuarios", label: "Usuários", icon: Users, show: isAdmin },
    { to: "/admin", label: "Configurações", icon: Settings, show: isGestor || isAdmin },
  ];

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="h-9 w-9 rounded-lg bg-[var(--gradient-brand)] grid place-items-center text-primary-foreground font-bold">T</div>
          <div>
            <div className="font-display font-semibold leading-tight">Grupo THV</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chamados</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.filter((n) => n.show).map((n) => {
            const active = pathname === n.to || (n.to !== "/chamados" && pathname.startsWith(n.to));
            return (
              <button
                type="button"
                key={n.to}
                onClick={() => navigate({ to: n.to })}
                className={`tappable flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-left ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm ring-1 ring-border" : "hover:bg-sidebar-accent/50"}`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-1 text-xs text-muted-foreground">
            <div className="font-medium text-foreground truncate">{perfil?.nome}</div>
            <div className="truncate">{perfil?.email}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {roles.map((r) => (
                <span key={r} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">{r}</span>
              ))}
            </div>
          </div>
          {user && (
            <div className="mb-2">
              <PushPrompt userId={user.id} />
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="mr-2 h-4 w-4" />Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-[var(--gradient-brand)] grid place-items-center text-primary-foreground text-sm font-bold">T</div>
          <span className="font-display font-semibold">Grupo THV</span>
        </div>
        <div className="flex items-center gap-1">
          {user && <PushPrompt userId={user.id} compact />}
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 md:pl-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-card">
        <div className="flex overflow-x-auto gap-1 px-1 py-1">
          {nav.filter((n) => n.show).map((n) => {
            const active = pathname === n.to || (n.to !== "/chamados" && pathname.startsWith(n.to));
            return (
              <button
                type="button"
                key={n.to}
                onClick={() => navigate({ to: n.to })}
                className={`tappable flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] shrink-0 ${active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}
              >
                <n.icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{n.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}