"use client";

import { useCallback, useState, type DragEvent } from "react";
import { useBusiness } from "@/app/context/BusinessContext";
import { getRubroDef } from "@/lib/rubros";
import type { CategoriaPlato } from "@/lib/types";
import { UploadIcon, SparklesIcon, CheckIcon, AlertIcon } from "@/app/components/icons";

type Estado = "idle" | "dragging" | "analyzing" | "done" | "error";

type ExtractedItem = {
  nombre: string;
  precio: number;
  categoria: string | null;
};

type Resultado = { agregados: number; omitidos: number; total: number };

// Normaliza nombres para deduplicar (sin tildes, minúsculas).
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const CATEGORIAS_VALIDAS: CategoriaPlato[] = ["entrada", "fondo", "bebida"];

export default function MenuDropZone() {
  const { config, addItem, setCartaFileName } = useBusiness();
  const rubroDef = getRubroDef(config.rubro!);
  const [estado, setEstado] = useState<Estado>("idle");
  const [archivo, setArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

        // Dedupe contra el catálogo actual y dentro del mismo lote.
        const existentes = new Set(
          config.catalogo.map((i) => normalizar(i.nombre))
        );
        const enLote = new Set<string>();
        let agregados = 0;
        let omitidos = 0;

        for (const it of extraidos) {
          const key = normalizar(it.nombre);
          if (key.length === 0) continue;
          if (existentes.has(key) || enLote.has(key)) {
            omitidos++;
            continue;
          }
          enLote.add(key);
          const categoria = CATEGORIAS_VALIDAS.includes(
            it.categoria as CategoriaPlato
          )
            ? (it.categoria as CategoriaPlato)
            : undefined;
          addItem({ nombre: it.nombre, precio: it.precio, categoria });
          agregados++;
        }

        setResultado({ agregados, omitidos, total: extraidos.length });
        setEstado("done");
      } catch {
        setError("No se pudo conectar con el servidor. Intentá de nuevo.");
        setEstado("error");
      }
    },
    [config.catalogo, addItem, setCartaFileName]
  );

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

  if (estado === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-6 w-6 text-emerald-600" />
        </div>
        {resultado && resultado.agregados > 0 ? (
          <p className="text-sm font-semibold text-emerald-700">
            Se agregaron {resultado.agregados}{" "}
            {resultado.agregados === 1 ? "ítem" : "ítems"} al catálogo
          </p>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">
            No se agregaron ítems nuevos
          </p>
        )}
        {resultado && resultado.omitidos > 0 && (
          <p className="text-xs text-emerald-600">
            {resultado.omitidos}{" "}
            {resultado.omitidos === 1
              ? "ya estaba en el catálogo y se omitió"
              : "ya estaban en el catálogo y se omitieron"}
          </p>
        )}
        {resultado && resultado.total === 0 && (
          <p className="text-xs text-emerald-600">
            No se detectaron ítems legibles en la imagen.
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
        PNG o JPG · hasta 8MB · la IA leerá los ítems y precios de la imagen
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
