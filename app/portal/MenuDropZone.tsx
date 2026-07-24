"use client";

import { useCallback, useState, type DragEvent } from "react";
import { useBusiness } from "@/app/context/BusinessContext";
import { getRubroDef } from "@/lib/rubros";
import type { CatalogItem } from "@/lib/types";
import { UploadIcon, SparklesIcon, CheckIcon } from "@/app/components/icons";

type Estado = "idle" | "dragging" | "analyzing" | "done";

// Platillos de prueba que simula haber extraído de la carta.
const ITEMS_EXTRAIDOS: Omit<CatalogItem, "id">[] = [
  { nombre: "Pollo a la brasa entero", precio: 55, categoria: "fondo" },
  { nombre: "Arroz chaufa de pollo", precio: 22, categoria: "fondo" },
  { nombre: "Papa a la huancaína", precio: 14, categoria: "entrada" },
  { nombre: "Chicha morada 1L", precio: 10, categoria: "bebida" },
  { nombre: "Anticuchos con papas", precio: 20, categoria: "entrada" },
];

export default function MenuDropZone() {
  const { config, addItem, setCartaFileName } = useBusiness();
  const rubroDef = getRubroDef(config.rubro!);
  const [estado, setEstado] = useState<Estado>("idle");
  const [archivo, setArchivo] = useState<string | null>(null);

  const procesarArchivo = useCallback(
    (file: File) => {
      setArchivo(file.name);
      setCartaFileName(file.name);
      setEstado("analyzing");

      // Simula 2 segundos de "análisis con IA"
      setTimeout(() => {
        ITEMS_EXTRAIDOS.forEach((item) => addItem(item));
        setEstado("done");
      }, 2000);
    },
    [addItem, setCartaFileName]
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
          Analizando menú...
        </p>
        <p className="text-xs text-brand-500">
          Extrayendo {rubroDef.catalogoLabel.toLowerCase()} de{" "}
          <span className="font-medium">{archivo}</span>
        </p>
      </div>
    );
  }

  if (estado === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-emerald-700">
          ¡Listo! Se agregaron {ITEMS_EXTRAIDOS.length} ítems al catálogo
        </p>
        <p className="text-xs text-emerald-500">
          Archivo: {archivo}
        </p>
        <button
          type="button"
          onClick={() => setEstado("idle")}
          className="mt-2 text-xs font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
        >
          Subir otro archivo
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
          ? "Suelta aquí tu archivo"
          : "Arrastra tu carta o haz clic para subir"}
      </span>
      <span className="text-xs text-ink-400">
        PNG, JPG o PDF · hasta 10MB · se extraerán los ítems automáticamente
      </span>
      <input
        type="file"
        accept="image/*,.pdf"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={onFileSelect}
      />
    </div>
  );
}
