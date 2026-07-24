import WidgetPage from "@/app/widget/page";

const MENU_DESTACADO = [
  { nombre: "Combo familiar", precio: 65, desc: "Pollo entero + papas + ensalada + gaseosa 1.5L" },
  { nombre: "1/4 de pollo", precio: 18, desc: "Con papas fritas y ensalada fresca" },
  { nombre: "1/2 pollo", precio: 32, desc: "Con papas fritas, ensalada y crema de ají" },
];

export default function DemoClientePage() {
  return (
    <div className="relative min-h-screen bg-amber-50 font-sans">
      {/* Hero */}
      <header className="bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400 px-6 pb-16 pt-12 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <span className="mb-3 inline-block text-5xl">🍗</span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            El Pato Feliz
          </h1>
          <p className="mt-3 text-lg text-white/90">
            El mejor pollo a la brasa de la ciudad. Delivery y recojo en tienda.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Abierto ahora · Lun–Dom 11am–10pm
          </div>
        </div>
      </header>

      {/* Menu section */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Nuestro Menú
        </h2>
        <p className="mb-8 text-center text-sm text-gray-500">
          Haz tu pedido por el chat o llámanos al (01) 555-1234
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {MENU_DESTACADO.map((item) => (
            <div
              key={item.nombre}
              className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-2xl">
                🍗
              </div>
              <h3 className="font-semibold text-gray-900">{item.nombre}</h3>
              <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
              <p className="mt-3 text-lg font-bold text-orange-600">
                S/ {item.precio.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Extras */}
        <div className="mt-10 rounded-2xl border border-orange-100 bg-white p-6">
          <h3 className="mb-3 font-semibold text-gray-900">Extras</h3>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-700">
              Crema de ají extra — S/ 2.00
            </span>
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-700">
              Porción extra de papas — S/ 8.00
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-2 font-semibold text-gray-900">📍 Ubicación</h3>
            <p className="text-sm text-gray-600">
              Av. La Marina 2450, San Miguel<br />
              Lima, Perú
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-2 font-semibold text-gray-900">🛵 Delivery</h3>
            <p className="text-sm text-gray-600">
              Costo de envío: S/ 5.00<br />
              Radio máximo: 5 km
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-orange-100 bg-white py-6 text-center text-xs text-gray-400">
        El Pato Feliz © 2026 · Atención al cliente potenciada por Rimay AI
      </footer>

      {/* Chat widget */}
      <WidgetPage />
    </div>
  );
}
