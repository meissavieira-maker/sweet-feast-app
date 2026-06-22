export type Category = {
  id: string;
  label: string;
};

export const categories: Category[] = [
  { id: "fatias", label: "Fatias-Caseirinhos-Pudins" },
];

export type Product = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  badge?: string | null;
};

const fallbackCategory = categories[0]?.id ?? "fatias";

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeProduct(row: unknown): Product | null {
  if (!row || typeof row !== "object") return null;
  const data = row as Record<string, unknown>;
  const id = safeText(data.id).trim();
  if (!id) return null;

  return {
    id,
    category: safeText(data.category, fallbackCategory) || fallbackCategory,
    name: safeText(data.name, "Produto sem nome") || "Produto sem nome",
    description: safeText(data.description),
    price: Math.max(0, safeNumber(data.price)),
    image_url: safeText(data.image_url),
    stock: Math.max(0, Math.trunc(safeNumber(data.stock))),
    badge: safeText(data.badge) || null,
  };
}

export function normalizeProducts(rows: unknown): Product[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeProduct).filter((product): product is Product => Boolean(product));
}
