"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { useBusiness } from "@/app/context/BusinessContext";
import { getRubroDef } from "@/lib/rubros";
import type { CatalogItem, Tono } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import { SectionCard } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/app/components/ui/Field";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  AlertIcon,
  TelegramIcon,
  WhatsappIcon,
  InstagramIcon,
  FacebookIcon,
  GlobeIcon,
} from "@/app/components/icons";
import ItemModal from "./ItemModal";
import MenuDropZone from "./MenuDropZone";

const TONOS: { value: Tono; label: string }[] = [
  { value: "cercano", label: "Cercano y cálido" },
  { value: "formal", label: "Formal y directo" },
  { value: "juvenil", label: "Juvenil y divertido" },
];

// Canales de mensajería. Hoy solo Telegram está integrado y operativo; el
// resto se muestran como "próximamente" (no seleccionables) para no prometer
// algo que aún no funciona.
const CANALES: {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  conectado: boolean;
}[] = [
  { key: "telegram", label: "Telegram", icon: TelegramIcon, conectado: true },
  { key: "whatsapp", label: "WhatsApp", icon: WhatsappIcon, conectado: false },
  { key: "instagram", label: "Instagram", icon: InstagramIcon, conectado: false },
  { key: "facebook", label: "Facebook", icon: FacebookIcon, conectado: false },
  { key: "web", label: "Web", icon: GlobeIcon, conectado: false },
];

function PortalContent() {
  const {
    config,
    setNombre,
    setTono,
    addItem,
    updateItem,
    removeItem,
    addRegla,
    updateRegla,
    persistRegla,
    removeRegla,
    setDeliveryMode,
    togglePago,
    addZona,
    removeZona,
    guardado,
    saveError,
    actionError,
    save,
  } = useBusiness();

  const rubroDef = getRubroDef(config.rubro!);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEditando, setItemEditando] = useState<CatalogItem | null>(null);
  const [nuevaRegla, setNuevaRegla] = useState("");
  const [nuevoDistrito, setNuevoDistrito] = useState("");
  const [nuevaTarifa, setNuevaTarifa] = useState("");
  const [nuevoPago, setNuevoPago] = useState("");

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
      // Al editar, preservamos el origen del ítem (IA o manual).
      updateItem(itemEditando.id, {
        ...datos,
        origen: itemEditando.origen ?? "manual",
      });
    } else {
      addItem({ ...datos, origen: "manual" });
    }
    cerrarModal();
  }

  function agregarRegla() {
    const texto = nuevaRegla.trim();
    if (texto.length === 0) return;
    addRegla(texto);
    setNuevaRegla("");
  }

  function agregarZona() {
    const distrito = nuevoDistrito.trim();
    const fee = parseFloat(nuevaTarifa.replace(",", "."));
    if (distrito.length === 0 || !Number.isFinite(fee) || fee < 0) return;
    addZona(distrito, fee);
    setNuevoDistrito("");
    setNuevaTarifa("");
  }

  function agregarPago() {
    const metodo = nuevoPago.trim();
    if (metodo.length === 0) return;
    // No duplicar: si el método ya existe (ignorando mayúsculas/tildes de caja),
    // no lo agregamos de nuevo ni lo quitamos por error.
    const yaExiste = config.paymentMethods.some(
      (m) => m.toLowerCase() === metodo.toLowerCase()
    );
    if (yaExiste) {
      setNuevoPago("");
      return;
    }
    togglePago(metodo);
    setNuevoPago("");
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
              Canales
            </span>
            <div className="flex flex-wrap gap-2">
              {CANALES.map((canal) => {
                const Icon = canal.icon;
                return (
                  <div
                    key={canal.key}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium",
                      canal.conectado
                        ? "border-brand-300 bg-brand-50 text-brand-700 shadow-soft"
                        : "border-ink-200 bg-ink-50/60 text-ink-400",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {canal.label}
                    {canal.conectado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                        <CheckIcon className="h-3 w-3" />
                        Conectado
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Próximamente
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ---- Carga rápida de carta ---- */}
        <MenuDropZone />

        {/* ---- Catálogo ---- */}
        <SectionCard
          title={rubroDef.catalogoLabel}
          description={`${config.catalogo.length} ${
            config.catalogo.length === 1 ? "ítem" : "ítems"
          } en tu catálogo · o agrégalos a mano`}
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
                      <span
                        className={[
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          item.origen === "ai"
                            ? "bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100"
                            : "bg-ink-100 text-ink-500",
                        ].join(" ")}
                        title={
                          item.origen === "ai"
                            ? "Extraído de una carta con IA"
                            : "Agregado a mano"
                        }
                      >
                        {item.origen === "ai" ? "IA" : "Manual"}
                      </span>
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
          {config.reglas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">
              Aún no hay reglas. Agrega la primera abajo.
            </p>
          ) : (
            <div className="space-y-2">
              {config.reglas.map((regla, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-xl border border-ink-200 bg-ink-50/50 p-3 transition-colors focus-within:border-brand-300 focus-within:bg-white"
                >
                  <Textarea
                    value={regla}
                    onChange={(e) => updateRegla(index, e.target.value)}
                    onBlur={() => persistRegla(index)}
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
          )}

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

        {/* ---- Entregas y pagos ---- */}
        <SectionCard
          title="Entregas y pagos"
          description="Define cómo se resuelve el envío y qué métodos de pago aceptas."
        >
          {/* Modo de entrega */}
          <Field label="Modo de entrega a domicilio">
            <Select
              value={config.deliveryMode}
              onChange={(e) =>
                setDeliveryMode(e.target.value as typeof config.deliveryMode)
              }
            >
              <option value="automatico">
                Automático — aplica la tabla de distritos
              </option>
              <option value="confirmacion">
                Con confirmación — una persona valida la ubicación
              </option>
            </Select>
          </Field>
          <p className="mt-1.5 text-xs text-ink-400">
            {config.deliveryMode === "automatico"
              ? "El agente cobra el envío según la tabla. Si el distrito no está listado, deriva a una persona."
              : "El agente toma el pedido y la dirección, y deriva a una persona para confirmar la ubicación antes de cerrar el envío."}
          </p>

          {/* Métodos de pago */}
          <div className="mt-6">
            <span className="mb-2 block text-sm font-medium text-ink-700">
              Métodos de pago aceptados
            </span>
            {config.paymentMethods.length === 0 ? (
              <p className="mb-2 text-xs text-ink-400">
                Aún no agregaste métodos de pago.
              </p>
            ) : (
              <div className="mb-2 flex flex-wrap gap-2">
                {config.paymentMethods.map((metodo) => (
                  <span
                    key={metodo}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                  >
                    {metodo}
                    <button
                      type="button"
                      onClick={() => togglePago(metodo)}
                      className="rounded p-0.5 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-700"
                      aria-label={`Quitar ${metodo}`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="text"
                value={nuevoPago}
                onChange={(e) => setNuevoPago(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarPago();
                  }
                }}
                placeholder="Ej. Yape, efectivo, tarjeta…"
              />
              <Button variant="secondary" onClick={agregarPago}>
                <PlusIcon className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Tabla de zonas de delivery */}
          <div className="mt-6">
            <span className="mb-1 block text-sm font-medium text-ink-700">
              Tarifas de envío por distrito
            </span>
            <p className="mb-2 text-xs text-ink-400">
              Solo se ofrece delivery a los distritos listados. Un distrito
              fuera de la tabla se deriva a una persona.
            </p>
            {config.zonas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">
                Aún no hay zonas. Agrega la primera abajo.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {config.zonas.map((zona) => (
                  <li
                    key={zona.id}
                    className="group flex items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-900">
                        {zona.distrito}
                      </span>
                      <Badge tone="neutral">
                        Envío S/ {zona.fee.toFixed(2)}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeZona(zona.id)}
                      className="rounded-lg p-2 text-ink-400 opacity-70 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      aria-label={`Eliminar ${zona.distrito}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                type="text"
                value={nuevoDistrito}
                onChange={(e) => setNuevoDistrito(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarZona();
                  }
                }}
                placeholder="Distrito (ej. Miraflores)"
                className="sm:flex-1"
              />
              <Input
                type="number"
                min="0"
                step="0.5"
                value={nuevaTarifa}
                onChange={(e) => setNuevaTarifa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarZona();
                  }
                }}
                placeholder="Tarifa S/"
                className="sm:w-32"
              />
              <Button variant="secondary" onClick={agregarZona}>
                <PlusIcon className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>
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
          ) : saveError || actionError ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertIcon className="h-4 w-4" />
              {actionError ?? "No se pudo guardar. Intenta de nuevo."}
            </span>
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
