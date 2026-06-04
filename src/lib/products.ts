export type Category = {
  id: string;
  label: string;
};

export const categories: Category[] = [
  { id: "fatias", label: "Fatias" },
  { id: "bolos", label: "Caseirinhos" },
  { id: "docinhos", label: "Pudins" },
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
