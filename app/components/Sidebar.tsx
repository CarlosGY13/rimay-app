"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useBusiness } from "@/app/context/BusinessContext";
import { getRubroDef } from "@/lib/rubros";
import {
  RocketIcon,
  SlidersIcon,
  ChatIcon,
  InboxIcon,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  descripcion: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV: NavItem[] = [
  {
    href: "/onboarding",
    label: "Onboarding",
    descripcion: "Elige tu rubro",
    icon: RocketIcon,
  },
  {
    href: "/portal",
    label: "Portal",
    descripcion: "Configura tu agente",
    icon: SlidersIcon,
  },
  {
    href: "/sandbox",
    label: "Sandbox",
    descripcion: "Prueba el chat",
    icon: ChatIcon,
  },
  {
    href: "/inbox",
    label: "Inbox",
    descripcion: "Conversaciones",
    icon: InboxIcon,
  },
];

function iniciales(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length === 0) return "MN";
  const palabras = limpio.split(/\s+/).slice(0, 2);
  return palabras.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { config } = useBusiness();

  const nombreNegocio =
    config.nombre.trim().length > 0 ? config.nombre.trim() : "Mi negocio";
  const subtitulo = config.rubro
    ? getRubroDef(config.rubro).nombre
    : "Sin configurar";

  return (
    <aside className="flex h-full w-full flex-col border-r border-ink-200/70 bg-white/80 backdrop-blur-xl md:w-72">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-6 pb-5 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-soft">
          R
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">
            Rimay
          </span>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">
            AI Concierge
          </span>
        </div>
      </div>

      {/* Negocio activo */}
      <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-ink-50/60 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-xs font-semibold text-white">
          {iniciales(config.nombre)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-900">
            {nombreNegocio}
          </div>
          <div className="truncate text-xs text-ink-400">{subtitulo}</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        {NAV.map((item) => {
          const activo =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                activo
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-ink-100/70 hover:text-ink-900",
              ].join(" ")}
            >
              {activo && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />
              )}
              <Icon
                className={[
                  "h-5 w-5 shrink-0 transition-colors",
                  activo
                    ? "text-brand-600"
                    : "text-ink-400 group-hover:text-ink-600",
                ].join(" ")}
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{item.label}</span>
                <span
                  className={[
                    "text-[11px]",
                    activo ? "text-brand-500" : "text-ink-400",
                  ].join(" ")}
                >
                  {item.descripcion}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Pie */}
      <div className="border-t border-ink-200/70 px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] font-medium text-ink-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Entorno demo · datos simulados
        </div>
      </div>
    </aside>
  );
}
