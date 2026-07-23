"use client";

import { useEffect, useState } from "react";
import type { CatalogItem, CategoriaPlato } from "@/lib/types";
import type { RubroDef } from "@/lib/rubros";
import { Button } from "@/app/components/ui/Button";
import { Field, Input, Select } from "@/app/components/ui/Field";
import { CloseIcon } from "@/app/components/icons";

type Props = {
  rubroDef: RubroDef;
  itemInicial: CatalogItem | null;
  onGuardar: (datos: Omit<CatalogItem, "id">) => void;
  onCerrar: () => void;
};

const CATEGORIAS: { value: CategoriaPlato; label: string }[] = [
  { value: "entrada", label: "Entrada" },
  { value: "fondo", label: "Fondo" },
  { value: "bebida", label: "Bebida" },
];

export default function ItemModal({
  rubroDef,
  itemInicial,
  onGuardar,
  onCerrar,
}: Props) {
  const [nombre, setNombre] = useState(itemInicial?.nombre ?? "");
  const [precio, setPrecio] = useState(
    itemInicial ? String(itemInicial.precio) : ""
  );
  const [categoria, setCategoria] = useState<CategoriaPlato>(
    itemInicial?.categoria ?? "fondo"
  );
  const [tallasText, setTallasText] = useState(
    itemInicial?.tallas?.join(", ") ?? ""
  );
  const [color, setColor] = useState(itemInicial?.color ?? "");
  const [duracion, setDuracion] = useState(itemInicial?.duracion ?? "");
  const [descripcion, setDescripcion] = useState(
    itemInicial?.descripcion ?? ""
  );

  const tiene = (campo: string) => rubroDef.campos.includes(campo as never);

  // Cerrar con la tecla Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  function guardar() {
    if (nombre.trim().length === 0) return;

    const datos: Omit<CatalogItem, "id"> = {
      nombre: nombre.trim(),
      precio: Number(precio) || 0,
    };

    if (tiene("categoria")) datos.categoria = categoria;
    if (tiene("tallas")) {
      datos.tallas = tallasText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }
    if (tiene("color")) datos.color = color.trim();
    if (tiene("duracion")) datos.duracion = duracion.trim();
    if (tiene("descripcion")) datos.descripcion = descripcion.trim();

    onGuardar(datos);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-ink-900">
              {itemInicial ? "Editar" : "Agregar"} {rubroDef.itemSingular}
            </h3>
            <p className="mt-0.5 text-sm text-ink-400">
              Los cambios se reflejan al instante en tu catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
            aria-label="Cerrar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre">
            <Input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={`Nombre del ${rubroDef.itemSingular}`}
              autoFocus
            />
          </Field>

          <Field label="Precio (S/)">
            <Input
              type="number"
              min="0"
              step="0.10"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          {tiene("categoria") && (
            <Field label="Categoría">
              <Select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaPlato)}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {tiene("tallas") && (
            <Field label="Tallas disponibles" hint="Sepáralas con comas">
              <Input
                type="text"
                value={tallasText}
                onChange={(e) => setTallasText(e.target.value)}
                placeholder="S, M, L, XL"
              />
            </Field>
          )}

          {tiene("color") && (
            <Field label="Color">
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Negro"
              />
            </Field>
          )}

          {tiene("duracion") && (
            <Field label="Duración estimada">
              <Input
                type="text"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="30 min"
              />
            </Field>
          )}

          {tiene("descripcion") && (
            <Field label="Descripción corta">
              <Input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripción"
              />
            </Field>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}
