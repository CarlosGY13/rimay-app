import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
          R
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          Rimay
        </h1>

        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-600">
          El agente de atención que tu negocio configura, sin tocar código.
        </p>

        <div className="mt-10">
          <Link
            href="/onboarding"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-6 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            Configurar mi agente
          </Link>
        </div>

        <p className="mt-12 text-xs text-ink-400">
          <span className="font-medium text-ink-500">Rimay</span> significa
          &laquo;hablar&raquo; en quechua.
        </p>
      </div>
    </main>
  );
}
