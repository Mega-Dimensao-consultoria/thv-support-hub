import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Droplets, Wrench, Truck, ArrowRight, Shield, Clock, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      return Object.fromEntries((data ?? []).map((d) => [d.key, d.value])) as Record<string, string>;
    },
  });
  const t = (k: string, fallback: string) => settings?.[k] ?? fallback;

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
          <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">{t("hero_badge", "Central de Atendimento Interno")}</span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl whitespace-pre-line">
            {t("hero_title", "Resolva qualquer demanda do Grupo THV em um só lugar.")}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground whitespace-pre-line">
            {t("hero_subtitle", "Abra chamados, acompanhe tratativas em tempo real e avalie atendimentos — para todas as empresas do grupo.")}
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/login">
              <Button size="lg" className="h-14 px-8 text-base shadow-[var(--shadow-soft)]">
                {t("hero_cta", "Abrir Chamado")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("empresas_title", "Empresas do grupo")}</h2>
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
            { icon: Clock, t: t("feature_1_title", "Resposta rápida"), d: t("feature_1_desc", "Acompanhamento em tempo real") },
            { icon: Shield, t: t("feature_2_title", "Triagem inteligente"), d: t("feature_2_desc", "Perguntas dinâmicas por tópico") },
            { icon: BarChart3, t: t("feature_3_title", "Gestão completa"), d: t("feature_3_desc", "Dashboards e avaliações") },
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
        © {new Date().getFullYear()} {t("footer_text", "Grupo THV. Central de Chamados Interna.")}
      </footer>
    </div>
  );
}
