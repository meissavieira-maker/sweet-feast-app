export type Category = {
  id: string;
  label: string;
};

export const categories: Category[] = [
  { id: "fatias", label: "Fatias de Torta" },
  { id: "bolos", label: "Bolos Caseiros" },
  { id: "docinhos", label: "Docinhos" },
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
