"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { useBusiness } from "@/app/context/BusinessContext";
import { getRubroDef } from "@/lib/rubros";
import type { CatalogItem, Canales, Tono } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import { SectionCard } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/app/components/ui/Field";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  UploadIcon,
  WhatsappIcon,
  InstagramIcon,
  FacebookIcon,
  GlobeIcon,
} from "@/app/components/icons";
import ItemModal from "./ItemModal";

const TONOS: { value: Tono; label: string }[] = [
  { value: "cercano", label: "Cercano y cálido" },
  { value: "formal", label: "Formal y directo" },
  { value: "juvenil", label: "Juvenil y divertido" },
];

const CANALES: {
  key: keyof Canales;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: "whatsapp", label: "WhatsApp", icon: WhatsappIcon },
  { key: "instagram", label: "Instagram", icon: InstagramIcon },
  { key: "facebook", label: "Facebook", icon: FacebookIcon },
  { key: "web", label: "Web", icon: GlobeIcon },
];

function PortalContent() {
  const {
    config,
    setNombre,
    setTono,
    toggleCanal,
    addItem,
    updateItem,
    removeItem,
    addRegla,
    updateRegla,
    removeRegla,
    setCartaFileName,
    guardado,
    save,
  } = useBusiness();

  const rubroDef = getRubroDef(config.rubro!);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEditando, setItemEditando] = useState<CatalogItem | null>(null);
  const [nuevaRegla, setNuevaRegla] = useState("");

  function abrirNuevo() {
    setItemEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(item: CatalogItem) {
    setItemEditando(item);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setItemEditando(null);
  }

  function guardarItem(datos: Omit<CatalogItem, "id">) {
    if (itemEditando) {
      updateItem(itemEditando.id, datos);
    } else {
      addItem(datos);
    }
    cerrarModal();
  }

  function agregarRegla() {
    const texto = nuevaRegla.trim();
    if (texto.length === 0) return;
    addRegla(texto);
    setNuevaRegla("");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-28">
      <PageHeader
        eyebrow={rubroDef.nombre}
        title="Configura tu agente"
        description="Define tu negocio en lenguaje natural. Tu agente responderá solo con lo que registres aquí."
      />

      <div className="space-y-6">
        {/* ---- Datos comunes ---- */}
        <SectionCard title="Datos del negocio">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio" className="sm:col-span-2">
              <Input
                type="text"
                value={config.nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Pollería el Buen Sazón"
              />
            </Field>

            <Field label="Tono del agente" className="sm:col-span-2">
              <Select
                value={config.tono}
                onChange={(e) => setTono(e.target.value as Tono)}
              >
                {TONOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-5">
            <span className="mb-2 block text-sm font-medium text-ink-700">
              Canales activos
            </span>
            <div className="flex flex-wrap gap-2">
              {CANALES.map((canal) => {
                const activo = config.canales[canal.key];
                const Icon = canal.icon;
                return (
                  <button
                    key={canal.key}
                    type="button"
                    onClick={() => toggleCanal(canal.key)}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
                      activo
                        ? "border-brand-300 bg-brand-50 text-brand-700 shadow-soft"
                        : "border-ink-200 bg-white text-ink-400 hover:border-ink-300 hover:text-ink-600",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {canal.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Las conexiones reales a cada canal se habilitarán en la fase de
              integraciones.
            </p>
          </div>
        </SectionCard>

        {/* ---- Catálogo ---- */}
        <SectionCard
          title={rubroDef.catalogoLabel}
          description={`${config.catalogo.length} ${
            config.catalogo.length === 1 ? "ítem" : "ítems"
          } en tu catálogo`}
          action={
            <Button size="sm" onClick={abrirNuevo}>
              <PlusIcon className="h-4 w-4" />
              Agregar
            </Button>
          }
        >
          {config.catalogo.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">
              Aún no hay ítems. Agrega el primero.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {config.catalogo.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center justify-between gap-3 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink-900">
                        {item.nombre}
                      </span>
                      <Badge tone="neutral">S/ {item.precio.toFixed(2)}</Badge>
                    </div>
                    {atributosItem(item) && (
                      <div className="mt-1 text-xs text-ink-400">
                        {atributosItem(item)}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => abrirEditar(item)}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                      aria-label="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* ---- Reglas ---- */}
        <SectionCard
          title="Reglas del negocio"
          description="Escríbelas como se las explicarías a un nuevo empleado."
        >
          <div className="space-y-2">
            {config.reglas.map((regla, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-xl border border-ink-200 bg-ink-50/50 p-3 transition-colors focus-within:border-brand-300 focus-within:bg-white"
              >
                <Textarea
                  value={regla}
                  onChange={(e) => updateRegla(index, e.target.value)}
                  rows={2}
                  className="flex-1 border-0 bg-transparent p-0 shadow-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => removeRegla(index)}
                  className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar regla"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              type="text"
              value={nuevaRegla}
              onChange={(e) => setNuevaRegla(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") agregarRegla();
              }}
              placeholder="Nueva regla…"
            />
            <Button variant="secondary" onClick={agregarRegla}>
              <PlusIcon className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </SectionCard>

        {/* ---- Carta visual ---- */}
        <SectionCard
          title="Carta o catálogo visual"
          description="Sube una foto de tu carta. (Demo: solo mostramos el nombre del archivo.)"
        >
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/40 px-6 py-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink-400 shadow-soft ring-1 ring-ink-200/60">
              <UploadIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-ink-700">
              {config.cartaFileName ?? "Haz clic para subir una imagen o PDF"}
            </span>
            <span className="text-xs text-ink-400">
              PNG, JPG o PDF · hasta 10MB
            </span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setCartaFileName(file ? file.name : null);
              }}
            />
          </label>
        </SectionCard>
      </div>

      {/* ---- Barra de guardado ---- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/70 bg-white/80 backdrop-blur-xl md:left-72">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3.5">
          {guardado ? (
            <Badge tone="success">
              <CheckIcon className="h-3.5 w-3.5" />
              Configuración guardada
            </Badge>
          ) : (
            <span className="text-sm text-ink-400">
              Los cambios se reflejan en el Sandbox y el Inbox.
            </span>
          )}
          <Button onClick={save}>Guardar configuración</Button>
        </div>
      </div>

      {modalAbierto && (
        <ItemModal
          rubroDef={rubroDef}
          itemInicial={itemEditando}
          onGuardar={guardarItem}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  );
}

function atributosItem(item: CatalogItem): string {
  const partes: string[] = [];
  if (item.categoria) partes.push(capitalizar(item.categoria));
  if (item.duracion) partes.push(item.duracion);
  if (item.color) partes.push(item.color);
  if (item.tallas && item.tallas.length > 0)
    partes.push(`Tallas: ${item.tallas.join(", ")}`);
  if (item.descripcion) partes.push(item.descripcion);
  return partes.join(" · ");
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PortalPage() {
  return (
    <RequireConfig>
      <PortalContent />
    </RequireConfig>
  );
}
