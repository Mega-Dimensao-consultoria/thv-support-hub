import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Droplets, Wrench, Truck, ArrowRight, Shield, Clock, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[var(--gradient-brand)] grid place-items-center text-primary-foreground font-bold">T</div>
            <span className="font-display text-lg font-semibold">Grupo THV</span>
          </div>
          <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">Central de Atendimento Interno</span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
            Resolva qualquer demanda do <span className="bg-[var(--gradient-brand)] bg-clip-text text-transparent">Grupo THV</span> em um só lugar.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Abra chamados, acompanhe tratativas em tempo real e avalie atendimentos — para todas as empresas do grupo.
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/login">
              <Button size="lg" className="h-14 px-8 text-base shadow-[var(--shadow-soft)]">
                Abrir Chamado <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">Empresas do grupo</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { icon: Wrench, nome: "THV Saneamento Ltda", desc: "Soluções completas em saneamento e infraestrutura hídrica." },
            { icon: Droplets, nome: "Soluções D'água", desc: "Tratamento, captação e distribuição de água." },
            { icon: Truck, nome: "Soluções Locadora", desc: "Locação de equipamentos e veículos especializados." },
          ].map((e) => (
            <div key={e.nome} className="rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-[var(--shadow-soft)]">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <e.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{e.nome}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-3">
          {[
            { icon: Clock, t: "Resposta rápida", d: "Acompanhamento em tempo real" },
            { icon: Shield, t: "Triagem inteligente", d: "Perguntas dinâmicas por tópico" },
            { icon: BarChart3, t: "Gestão completa", d: "Dashboards e avaliações" },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent"><f.icon className="h-5 w-5" /></div>
              <div>
                <h4 className="font-semibold">{f.t}</h4>
                <p className="text-sm text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Grupo THV. Central de Chamados Interna.
      </footer>
    </div>
  );
}
