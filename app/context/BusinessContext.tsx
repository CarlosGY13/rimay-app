"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { crearConfigInicial, CANALES_DEFAULT } from "@/lib/rubros";

const CONFIG_VACIA: BusinessConfig = {
  rubro: null,
  nombre: "",
  tono: "cercano",
  canales: { whatsapp: false, instagram: false, facebook: false, web: false },
  catalogo: [],
  reglas: [],
  cartaFileName: null,
};

// Forma de la regla tal como la devuelve la API (texto + id de la fila).
type ReglaApi = { id: string; text: string };
type BusinessApi = {
  nombre: string;
  rubro: Rubro;
  tono: Tono;
  catalogo: CatalogItem[];
  reglas: ReglaApi[];
};

type BusinessContextValue = {
  config: BusinessConfig;
  isConfigured: boolean;
  // estado de carga / conexión
  loading: boolean;
  error: string | null;
  retry: () => void;
  actionError: string | null;
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
  persistRegla: (index: number) => void;
  removeRegla: (index: number) => void;
  // carta visual
  setCartaFileName: (nombre: string | null) => void;
  // conversaciones (inbox)
  conversaciones: Conversacion[];
  addConversacion: (conv: Omit<Conversacion, "id">) => void;
  // guardado
  guardado: boolean;
  saveError: boolean;
  save: () => void;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

// Helper de fetch JSON que lanza si la respuesta no es OK.
async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BusinessConfig>(CONFIG_VACIA);
  // ids de las reglas, alineados por índice con config.reglas.
  const [ruleIds, setRuleIds] = useState<string[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const actionErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashActionError = useCallback((msg: string) => {
    setActionError(msg);
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    actionErrorTimer.current = setTimeout(() => setActionError(null), 4000);
  }, []);

  // Aplica la respuesta de la API al estado local.
  const applyBusiness = useCallback((data: BusinessApi) => {
    setConfig((prev) => ({
      ...prev,
      nombre: data.nombre,
      rubro: data.rubro,
      tono: data.tono,
      catalogo: data.catalogo,
      reglas: data.reglas.map((r) => r.text),
    }));
    setRuleIds(data.reglas.map((r) => r.id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [business, convs] = await Promise.all([
        apiJson<BusinessApi>("/api/business"),
        apiJson<{ conversations: Conversacion[] }>("/api/conversations"),
      ]);
      applyBusiness(business);
      setConversaciones(convs.conversations ?? []);
    } catch {
      setError("No se pudo conectar con el servidor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [applyBusiness]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Onboarding: fija rubro y resiembra catálogo + reglas ----
  const selectRubro = useCallback(
    (rubro: Rubro) => {
      // Optimista: pre-carga el ejemplo del rubro para UI instantánea.
      const ejemplo = crearConfigInicial(rubro);
      const prevConfig = config;
      const prevRuleIds = ruleIds;
      setConfig(ejemplo);
      setRuleIds(ejemplo.reglas.map((_, i) => `temp-${i}`));

      apiJson<BusinessApi>("/api/business", {
        method: "PUT",
        body: JSON.stringify({ rubro }),
      })
        .then(applyBusiness)
        .catch(() => {
          setConfig(prevConfig);
          setRuleIds(prevRuleIds);
          flashActionError("No se pudo configurar el rubro.");
        });
    },
    [config, ruleIds, applyBusiness, flashActionError]
  );

  // ---- Campos comunes ----
  const setNombre = useCallback((nombre: string) => {
    // Local; se persiste con "Guardar configuración".
    setConfig((prev) => ({ ...prev, nombre }));
  }, []);

  const setTono = useCallback(
    (tono: Tono) => {
      const prev = config.tono;
      setConfig((c) => ({ ...c, tono }));
      apiJson<BusinessApi>("/api/business", {
        method: "PATCH",
        body: JSON.stringify({ tono }),
      }).catch(() => {
        setConfig((c) => ({ ...c, tono: prev }));
        flashActionError("No se pudo cambiar el tono.");
      });
    },
    [config.tono, flashActionError]
  );

  const toggleCanal = useCallback((canal: keyof Canales) => {
    // Local (los canales no se persisten en esta etapa).
    setConfig((prev) => ({
      ...prev,
      canales: { ...prev.canales, [canal]: !prev.canales[canal] },
    }));
  }, []);

  // ---- Catálogo ----
  const addItem = useCallback(
    (item: Omit<CatalogItem, "id">) => {
      const tempId = `temp-${Date.now()}`;
      setConfig((prev) => ({
        ...prev,
        catalogo: [...prev.catalogo, { ...item, id: tempId }],
      }));

      apiJson<CatalogItem>("/api/business/catalog", {
        method: "POST",
        body: JSON.stringify(item),
      })
        .then((saved) => {
          setConfig((prev) => ({
            ...prev,
            catalogo: prev.catalogo.map((it) =>
              it.id === tempId ? saved : it
            ),
          }));
        })
        .catch(() => {
          setConfig((prev) => ({
            ...prev,
            catalogo: prev.catalogo.filter((it) => it.id !== tempId),
          }));
          flashActionError("No se pudo agregar el ítem.");
        });
    },
    [flashActionError]
  );

  const updateItem = useCallback(
    (id: string, cambios: Partial<CatalogItem>) => {
      let previo: CatalogItem | undefined;
      setConfig((prev) => ({
        ...prev,
        catalogo: prev.catalogo.map((it) => {
          if (it.id === id) {
            previo = it;
            return { ...it, ...cambios };
          }
          return it;
        }),
      }));

      apiJson<CatalogItem>(`/api/business/catalog/${id}`, {
        method: "PATCH",
        body: JSON.stringify(cambios),
      }).catch(() => {
        if (previo) {
          const restore = previo;
          setConfig((prev) => ({
            ...prev,
            catalogo: prev.catalogo.map((it) =>
              it.id === id ? restore : it
            ),
          }));
        }
        flashActionError("No se pudo actualizar el ítem.");
      });
    },
    [flashActionError]
  );

  const removeItem = useCallback(
    (id: string) => {
      let snapshot: CatalogItem[] = [];
      setConfig((prev) => {
        snapshot = prev.catalogo;
        return { ...prev, catalogo: prev.catalogo.filter((it) => it.id !== id) };
      });

      apiJson(`/api/business/catalog/${id}`, { method: "DELETE" }).catch(() => {
        setConfig((prev) => ({ ...prev, catalogo: snapshot }));
        flashActionError("No se pudo eliminar el ítem.");
      });
    },
    [flashActionError]
  );

  // ---- Reglas ----
  const addRegla = useCallback(
    (texto: string) => {
      const tempId = `temp-${Date.now()}`;
      setConfig((prev) => ({ ...prev, reglas: [...prev.reglas, texto] }));
      setRuleIds((prev) => [...prev, tempId]);

      apiJson<ReglaApi>("/api/business/rules", {
        method: "POST",
        body: JSON.stringify({ text: texto }),
      })
        .then((saved) => {
          setRuleIds((prev) =>
            prev.map((rid) => (rid === tempId ? saved.id : rid))
          );
        })
        .catch(() => {
          // Rollback: quitar la regla temporal recién agregada (por su tempId).
          setRuleIds((prevIds) => {
            const idx = prevIds.indexOf(tempId);
            if (idx !== -1) {
              setConfig((c) => ({
                ...c,
                reglas: c.reglas.filter((_, i) => i !== idx),
              }));
            }
            return prevIds.filter((rid) => rid !== tempId);
          });
          flashActionError("No se pudo agregar la regla.");
        });
    },
    [flashActionError]
  );

  const updateRegla = useCallback((index: number, texto: string) => {
    // Local; se persiste en onBlur (persistRegla).
    setConfig((prev) => ({
      ...prev,
      reglas: prev.reglas.map((r, i) => (i === index ? texto : r)),
    }));
  }, []);

  const persistRegla = useCallback(
    (index: number) => {
      const id = ruleIds[index];
      const texto = config.reglas[index];
      if (!id || id.startsWith("temp-") || !texto || texto.trim().length === 0)
        return;
      apiJson<ReglaApi>(`/api/business/rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: texto }),
      }).catch(() => {
        flashActionError("No se pudo guardar la regla.");
        load();
      });
    },
    [ruleIds, config.reglas, flashActionError, load]
  );

  const removeRegla = useCallback(
    (index: number) => {
      const id = ruleIds[index];
      let snapReglas: string[] = [];
      let snapIds: string[] = [];
      setConfig((prev) => {
        snapReglas = prev.reglas;
        return { ...prev, reglas: prev.reglas.filter((_, i) => i !== index) };
      });
      setRuleIds((prev) => {
        snapIds = prev;
        return prev.filter((_, i) => i !== index);
      });

      if (!id || id.startsWith("temp-")) return;
      apiJson(`/api/business/rules/${id}`, { method: "DELETE" }).catch(() => {
        setConfig((prev) => ({ ...prev, reglas: snapReglas }));
        setRuleIds(snapIds);
        flashActionError("No se pudo eliminar la regla.");
      });
    },
    [ruleIds, flashActionError]
  );

  const setCartaFileName = useCallback((nombre: string | null) => {
    // Local (no se persiste en esta etapa).
    setConfig((prev) => ({ ...prev, cartaFileName: nombre }));
  }, []);

  // ---- Conversaciones ----
  const addConversacion = useCallback(
    (conv: Omit<Conversacion, "id">) => {
      apiJson<Conversacion>("/api/conversations", {
        method: "POST",
        body: JSON.stringify(conv),
      })
        .then((saved) => {
          setConversaciones((prev) => [saved, ...prev]);
        })
        .catch(() => {
          flashActionError("No se pudo registrar la conversación.");
        });
    },
    [flashActionError]
  );

  // ---- Guardar (persiste nombre + tono) ----
  const save = useCallback(() => {
    setSaveError(false);
    apiJson<BusinessApi>("/api/business", {
      method: "PATCH",
      body: JSON.stringify({ nombre: config.nombre, tono: config.tono }),
    })
      .then(() => {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);
      })
      .catch(() => {
        setSaveError(true);
        setTimeout(() => setSaveError(false), 4000);
      });
  }, [config.nombre, config.tono]);

  const value = useMemo<BusinessContextValue>(
    () => ({
      config,
      isConfigured: config.rubro !== null,
      loading,
      error,
      retry: load,
      actionError,
      selectRubro,
      setNombre,
      setTono,
      toggleCanal,
      addItem,
      updateItem,
      removeItem,
      addRegla,
      updateRegla,
      persistRegla,
      removeRegla,
      setCartaFileName,
      conversaciones,
      addConversacion,
      guardado,
      saveError,
      save,
    }),
    [
      config,
      loading,
      error,
      actionError,
      conversaciones,
      guardado,
      saveError,
      load,
      selectRubro,
      setNombre,
      setTono,
      toggleCanal,
      addItem,
      updateItem,
      removeItem,
      addRegla,
      updateRegla,
      persistRegla,
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
