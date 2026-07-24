"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BusinessConfig,
  CatalogItem,
  Conversacion,
  Rubro,
  Tono,
  Canales,
} from "@/lib/types";
import { crearConfigInicial } from "@/lib/rubros";
import { getInboxEjemplo } from "@/lib/mockInbox";

const CONFIG_VACIA: BusinessConfig = {
  rubro: null,
  nombre: "",
  tono: "cercano",
  canales: { whatsapp: false, instagram: false, facebook: false, web: false },
  catalogo: [],
  reglas: [],
  cartaFileName: null,
};

type BusinessContextValue = {
  config: BusinessConfig;
  isConfigured: boolean;
  // onboarding
  selectRubro: (rubro: Rubro) => void;
  // campos comunes
  setNombre: (nombre: string) => void;
  setTono: (tono: Tono) => void;
  toggleCanal: (canal: keyof Canales) => void;
  // catálogo
  addItem: (item: Omit<CatalogItem, "id">) => void;
  updateItem: (id: string, cambios: Partial<CatalogItem>) => void;
  removeItem: (id: string) => void;
  // reglas
  addRegla: (texto: string) => void;
  updateRegla: (index: number, texto: string) => void;
  removeRegla: (index: number) => void;
  // carta visual
  setCartaFileName: (nombre: string | null) => void;
  // conversaciones (inbox)
  conversaciones: Conversacion[];
  addConversacion: (conv: Omit<Conversacion, "id">) => void;
  // guardado
  guardado: boolean;
  save: () => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

function generarId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BusinessConfig>(CONFIG_VACIA);
  const [guardado, setGuardado] = useState(false);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);

  const selectRubro = useCallback((rubro: Rubro) => {
    setConfig(crearConfigInicial(rubro));
    setConversaciones(getInboxEjemplo(rubro));
    setGuardado(false);
  }, []);

  const setNombre = useCallback((nombre: string) => {
    setConfig((prev) => ({ ...prev, nombre }));
  }, []);

  const setTono = useCallback((tono: Tono) => {
    setConfig((prev) => ({ ...prev, tono }));
  }, []);

  const toggleCanal = useCallback((canal: keyof Canales) => {
    setConfig((prev) => ({
      ...prev,
      canales: { ...prev.canales, [canal]: !prev.canales[canal] },
    }));
  }, []);

  const addItem = useCallback((item: Omit<CatalogItem, "id">) => {
    setConfig((prev) => ({
      ...prev,
      catalogo: [...prev.catalogo, { ...item, id: generarId() }],
    }));
  }, []);

  const updateItem = useCallback(
    (id: string, cambios: Partial<CatalogItem>) => {
      setConfig((prev) => ({
        ...prev,
        catalogo: prev.catalogo.map((it) =>
          it.id === id ? { ...it, ...cambios } : it
        ),
      }));
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      catalogo: prev.catalogo.filter((it) => it.id !== id),
    }));
  }, []);

  const addRegla = useCallback((texto: string) => {
    setConfig((prev) => ({ ...prev, reglas: [...prev.reglas, texto] }));
  }, []);

  const updateRegla = useCallback((index: number, texto: string) => {
    setConfig((prev) => ({
      ...prev,
      reglas: prev.reglas.map((r, i) => (i === index ? texto : r)),
    }));
  }, []);

  const removeRegla = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      reglas: prev.reglas.filter((_, i) => i !== index),
    }));
  }, []);

  const setCartaFileName = useCallback((nombre: string | null) => {
    setConfig((prev) => ({ ...prev, cartaFileName: nombre }));
  }, []);

  const addConversacion = useCallback((conv: Omit<Conversacion, "id">) => {
    setConversaciones((prev) => [
      { ...conv, id: generarId() },
      ...prev,
    ]);
  }, []);

  const save = useCallback(() => {
    // MOCK: no hay persistencia real. Solo confirmamos visualmente.
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  }, []);

  const value = useMemo<BusinessContextValue>(
    () => ({
      config,
      isConfigured: config.rubro !== null,
      selectRubro,
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
      conversaciones,
      addConversacion,
      guardado,
      save,
    }),
    [
      config,
      conversaciones,
      guardado,
      selectRubro,
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
      addConversacion,
      save,
    ]
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error("useBusiness debe usarse dentro de <BusinessProvider>");
  }
  return ctx;
}
