export type Category = {
  id: string;
  label: string;
};

/** Fallback usado apenas se o banco ainda não tiver categorias. */
export const categories: Category[] = [
  { id: "fatias", label: "Fatias" },
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
  featured?: boolean;
};
