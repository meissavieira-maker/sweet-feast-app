import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "./products";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (p: Product) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartCtx>(() => {
    const safeItems = items.filter((i) => i?.product?.id);
    const count = safeItems.reduce((s, i) => s + (i?.qty ?? 0), 0);
    const total = safeItems.reduce((s, i) => s + (i?.qty ?? 0) * (i?.product?.price ?? 0), 0);
    return {
      items: safeItems,
      count,
      total,
      add: (p) =>
        setItems((prev) => {
          if (!p?.id) return prev;
          const found = prev.find((i) => i?.product?.id === p.id);
          if (found) return prev.map((i) => (i?.product?.id === p.id ? { ...i, qty: (i?.qty ?? 0) + 1 } : i));
          return [...prev, { product: p, qty: 1 }];
        }),
      remove: (id) => setItems((prev) => prev.filter((i) => i?.product?.id !== id)),
      setQty: (id, qty) =>
        setItems((prev) =>
          qty <= 0 ? prev.filter((i) => i?.product?.id !== id) : prev.map((i) => (i?.product?.id === id ? { ...i, qty } : i)),
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const formatBRL = (v: number) =>
  (Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
