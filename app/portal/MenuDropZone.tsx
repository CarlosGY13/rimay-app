"use client";

import { useCallback, useState, type DragEvent } from "react";
import { useBusiness } from "@/app/context/BusinessContext";
import { getRubroDef } from "@/lib/rubros";
import type { CategoriaPlato, CatalogItem } from "@/lib/types";
import { UploadIcon, SparklesIcon, CheckIcon, AlertIcon } from "@/app/components/icons";
import { Button } from "@/app/components/ui/Button";

type Estado = "idle" | "dragging" | "analyzing" | "review" | "done" | "error";

type ExtractedItem = {
  nombre: string;
  precio: number;
  categoria: string | null;
};

type Conflicto = {
  extraido: ExtractedItem;
  existente: CatalogItem;
  decision: "mantener" | "reemplazar";
};

type Resultado = { agregados: number; reemplazados: number; mantenidos: number };

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const CATEGORIAS_VALIDAS: CategoriaPlato[] = ["entrada", "fondo", "bebida"];

function categoriaValida(c: string | null): CategoriaPlato | undefined {
  return CATEGORIAS_VALIDAS.includes(c as CategoriaPlato)
    ? (c as CategoriaPlato)
    : undefined;
}

export default function MenuDropZone() {
  const { config, addItem, updateItem, setCartaFileName } = useBusiness();
  const rubroDef = getRubroDef(config.rubro!);
  const [estado, setEstado] = useState<Estado>("idle");
  const [archivo, setArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevos, setNuevos] = useState<ExtractedItem[]>([]);
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const procesarArchivo = useCallback(
    async (file: File) => {
      setArchivo(file.name);
      setCartaFileName(file.name);
      setError(null);
      setResultado(null);
      setEstado("analyzing");

      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/business/catalog/extract", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "No se pudo analizar la carta.");
          setEstado("error");
          return;
        }

        const extraidos: ExtractedItem[] = Array.isArray(data.items)
          ? data.items
          : [];

        // Índice del catálogo actual por nombre normalizado.
        const porNombre = new Map<string, CatalogItem>();
        for (const it of config.catalogo) porNombre.set(normalizar(it.nombre), it);

        const vistos = new Set<string>();
        const nuevosArr: ExtractedItem[] = [];
        const conflictosArr: Conflicto[] = [];

        for (const it of extraidos) {
          const key = normalizar(it.nombre);
          if (key.length === 0 || vistos.has(key)) continue; // colapsa repetidos del lote
          vistos.add(key);
          const existente = porNombre.get(key);
          if (existente) {
            conflictosArr.push({ extraido: it, existente, decision: "mantener" });
          } else {
            nuevosArr.push(it);
          }
        }

        setNuevos(nuevosArr);
        setConflictos(conflictosArr);
        setEstado("review");
      } catch {
        setError("No se pudo conectar con el servidor. Intentá de nuevo.");
        setEstado("error");
      }
    },
    [config.catalogo, setCartaFileName]
  );

  function setDecision(index: number, decision: "mantener" | "reemplazar") {
    setConflictos((prev) =>
      prev.map((c, i) => (i === index ? { ...c, decision } : c))
    );
  }

  function aplicar() {
    let agregados = 0;
    let reemplazados = 0;
    let mantenidos = 0;

    for (const it of nuevos) {
      addItem({
        nombre: it.nombre,
        precio: it.precio,
        categoria: categoriaValida(it.categoria),
        origen: "ai",
      });
      agregados++;
    }

    for (const c of conflictos) {
      if (c.decision === "reemplazar") {
        updateItem(c.existente.id, {
          nombre: c.extraido.nombre,
          precio: c.extraido.precio,
          categoria: categoriaValida(c.extraido.categoria) ?? c.existente.categoria,
          origen: "ai",
        });
        reemplazados++;
      } else {
        mantenidos++;
      }
    }

    setResultado({ agregados, reemplazados, mantenidos });
    setEstado("done");
  }

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setEstado((prev) => (prev === "idle" ? "dragging" : prev));
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setEstado((prev) => (prev === "dragging" ? "idle" : prev));
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) procesarArchivo(file);
    },
    [procesarArchivo]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) procesarArchivo(file);
    },
    [procesarArchivo]
  );

  if (estado === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-brand-300 bg-brand-50/60 px-6 py-10 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-50" />
          <SparklesIcon className="relative h-6 w-6 text-brand-600 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-brand-700">
          Analizando la carta con IA…
        </p>
        <p className="text-xs text-brand-500">
          Leyendo {rubroDef.catalogoLabel.toLowerCase()} de{" "}
          <span className="font-medium">{archivo}</span>
        </p>
      </div>
    );
  }

  if (estado === "review") {
    const hayAlgo = nuevos.length > 0 || conflictos.length > 0;
    return (
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-900">
            Revisá lo que detectamos en la carta
          </h3>
        </div>

        {!hayAlgo && (
          <p className="rounded-xl border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
            No se detectaron ítems legibles en la imagen.
          </p>
        )}

        {nuevos.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Nuevos ({nuevos.length}) — se agregarán
            </p>
            <ul className="space-y-1.5">
              {nuevos.map((it, i) => (
                <li
                  key={`n-${i}`}
                  className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2 text-sm"
                >
                  <span className="text-ink-800">{it.nombre}</span>
                  <span className="font-medium text-ink-600">
                    S/ {it.precio.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {conflictos.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
              <AlertIcon className="h-3.5 w-3.5" />
              Ya existen ({conflictos.length}) — elegí con cuál quedarte
            </p>
            <ul className="space-y-2">
              {conflictos.map((c, i) => (
                <li
                  key={`c-${i}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 p-3"
                >
                  <div className="mb-2 text-sm font-medium text-ink-900">
                    {c.existente.nombre}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setDecision(i, "mantener")}
                      className={[
                        "flex-1 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        c.decision === "mantener"
                          ? "border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                          : "border-ink-200 bg-white text-ink-500 hover:border-ink-300",
                      ].join(" ")}
                    >
                      <span className="block font-semibold">Mantener actual</span>
                      <span>S/ {c.existente.precio.toFixed(2)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision(i, "reemplazar")}
                      className={[
                        "flex-1 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        c.decision === "reemplazar"
                          ? "border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                          : "border-ink-200 bg-white text-ink-500 hover:border-ink-300",
                      ].join(" ")}
                    >
                      <span className="block font-semibold">Usar el de la carta</span>
                      <span>S/ {c.extraido.precio.toFixed(2)}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEstado("idle")}>
            Cancelar
          </Button>
          <Button size="sm" onClick={aplicar} disabled={!hayAlgo}>
            Aplicar cambios
          </Button>
        </div>
      </div>
    );
  }

  if (estado === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-emerald-700">
          {resultado && resultado.agregados + resultado.reemplazados > 0
            ? "Catálogo actualizado"
            : "No se hicieron cambios"}
        </p>
        {resultado && (
          <p className="text-xs text-emerald-600">
            {resultado.agregados} agregados · {resultado.reemplazados} reemplazados
            {resultado.mantenidos > 0
              ? ` · ${resultado.mantenidos} sin cambios`
              : ""}
          </p>
        )}
        <p className="mt-1 text-xs text-emerald-500">Archivo: {archivo}</p>
        <button
          type="button"
          onClick={() => setEstado("idle")}
          className="mt-2 text-xs font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
        >
          Subir otra carta
        </button>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50/60 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertIcon className="h-6 w-6 text-red-600" />
        </div>
        <p className="text-sm font-semibold text-red-700">
          No se pudo analizar la carta
        </p>
        <p className="text-xs text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => setEstado("idle")}
          className="mt-2 text-xs font-medium text-red-600 underline underline-offset-2 hover:text-red-800"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all",
        estado === "dragging"
          ? "border-brand-400 bg-brand-50/60 scale-[1.01]"
          : "border-ink-200 bg-ink-50/40 hover:border-brand-300 hover:bg-brand-50/40",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-11 w-11 items-center justify-center rounded-xl shadow-soft ring-1 transition-colors",
          estado === "dragging"
            ? "bg-brand-100 text-brand-600 ring-brand-200"
            : "bg-white text-ink-400 ring-ink-200/60",
        ].join(" ")}
      >
        <UploadIcon className="h-5 w-5" />
      </span>
      <span className="text-sm font-medium text-ink-700">
        {estado === "dragging"
          ? "Suelta aquí tu carta"
          : "Arrastra una foto de tu carta o haz clic para subir"}
      </span>
      <span className="text-xs text-ink-400">
        PNG o JPG · hasta 8MB · la IA leerá los ítems y podrás revisarlos antes de agregar
      </span>
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={onFileSelect}
      />
    </div>
  );
}
