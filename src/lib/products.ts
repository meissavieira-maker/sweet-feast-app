export type Category = {
  id: string;
  label: string;
};

export const categories: Category[] = [
  { id: "fatias", label: "Fatias de Torta" },
  { id: "bolos", label: "Caseirinhos Gourmet" },
  { id: "docinhos", label: "Pudim" },
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
