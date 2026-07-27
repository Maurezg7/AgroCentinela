import { Link } from "react-router-dom";
import {
  Snowflake, MapPin, Satellite, Sparkles, BellRing,
  ArrowRight, WifiOff,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/inicio" className="flex items-center gap-2">
          <img src="/logo.svg" className="h-8 w-8" alt="AgroCentinela" />
          <span className="font-display text-lg font-semibold tracking-tight">
            AgroCentinela
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-primary/60 hover:text-primary"
        >
          Entrar
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/hero-agrocentinela.jpg"
          alt=""
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 sm:pt-24 md:pb-32 md:pt-32">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-frost/30 bg-frost/10 px-3 py-1 text-xs font-medium text-frost">
            <Snowflake className="size-3.5" />
            Alertas de helada · Salta, NOA
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            El agrónomo de bolsillo{" "}
            <span className="bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent">
              que funciona sin señal.
            </span>
          </h1>

          <blockquote className="mt-8 max-w-2xl rounded-2xl border border-warning/30 bg-card/70 p-5 shadow-frost backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-warning">
              <BellRing className="size-3.5" />
              Alerta de ejemplo
            </div>
            <p className="text-base leading-relaxed text-foreground/95 sm:text-lg">
              «Helada probable el jueves a las 3&nbsp;AM. Tu pimiento está en floración:
              regá antes del anochecer.»
            </p>
          </blockquote>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-ember px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[0.98]"
            >
              Registrar mi parcela
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3.5 text-base font-medium text-foreground/90 backdrop-blur transition hover:border-frost/50 hover:text-frost"
            >
              Ver mis alertas
            </Link>
          </div>

          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <WifiOff className="size-4" />
            Diseñada para el campo: offline-first, instalable en tu celular.
          </p>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          El problema
        </span>
        <p className="mt-4 max-w-3xl font-display text-2xl leading-snug text-foreground/95 text-balance sm:text-3xl md:text-4xl">
          En el NOA, una helada puede arruinar meses de trabajo en una sola madrugada.
          Y el pequeño productor no tiene un agrónomo de cabecera{" "}
          <span className="text-muted-foreground">
            —ni señal estable para consultar un pronóstico cuando más importa.
          </span>
        </p>
      </div>
    </section>
  );
}

const steps = [
  {
    icon: MapPin,
    title: "Registro en el campo",
    desc: "Cargá tu parcela con un tap: cultivo, superficie y tu ubicación exacta con el GPS del celular.",
  },
  {
    icon: Satellite,
    title: "Monitoreo autónomo",
    desc: "Traemos el pronóstico real de tu coordenada, sin que tengas que mirar nada.",
  },
  {
    icon: Sparkles,
    title: "IA híbrida",
    desc: "Amazon Bedrock + Claude interpretan el clima según tu cultivo y su etapa. Si no hay señal, hay respaldo local.",
  },
  {
    icon: BellRing,
    title: "Alerta y acción",
    desc: "Recibís un mensaje claro en español, con la acción concreta a tomar antes de la próxima helada.",
  },
];

function HowItWorks() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Cómo funciona
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Del campo a la acción, en cuatro pasos.
          </h2>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:bg-card/80"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary transition group-hover:bg-gradient-ember group-hover:text-primary-foreground group-hover:shadow-glow">
                  <step.icon className="size-5" />
                </span>
                <span className="font-display text-sm font-semibold text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border/60 bg-gradient-sky">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center md:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
          La próxima helada no te agarra dormido.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-foreground/80 sm:text-lg">
          Registrá tu primera parcela en menos de un minuto y probá el motor de riesgo.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-ember px-7 py-4 text-base font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[0.98]"
        >
          Registrar mi parcela
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <img src="/logo.svg" className="h-6 w-6" alt="" />
          AgroCentinela · Hecho para los productores del NOA.
        </div>
        <p className="text-xs text-muted-foreground">
          Hackathon AWS × Código Facilito × Kiro — Reto 2, julio 2026.
        </p>
      </div>
    </footer>
  );
}
