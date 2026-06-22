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
