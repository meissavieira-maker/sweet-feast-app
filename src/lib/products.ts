import tortaChocolate from "@/assets/torta-chocolate.jpg";
import tortaRedvelvet from "@/assets/torta-redvelvet.jpg";
import tortaLimao from "@/assets/torta-limao.jpg";
import boloCenoura from "@/assets/bolo-cenoura.jpg";
import brigadeiro from "@/assets/brigadeiro.jpg";
import beijinho from "@/assets/beijinho.jpg";

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
  image: string;
  badge?: string;
};

export const products: Product[] = [
  {
    id: "p1",
    category: "fatias",
    name: "Torta de Chocolate Belga",
    description: "Ganache aveludado de chocolate 70% com frutas vermelhas frescas.",
    price: 22.9,
    image: tortaChocolate,
    badge: "Mais pedida",
  },
  {
    id: "p2",
    category: "fatias",
    name: "Red Velvet Clássico",
    description: "Massa de veludo vermelho com cream cheese artesanal.",
    price: 21.5,
    image: tortaRedvelvet,
  },
  {
    id: "p3",
    category: "fatias",
    name: "Torta de Limão Siciliano",
    description: "Creme cítrico cremoso com merengue maçaricado na hora.",
    price: 19.9,
    image: tortaLimao,
  },
  {
    id: "p4",
    category: "bolos",
    name: "Bolo de Cenoura com Ganache",
    description: "O clássico da vovó, fofinho e coberto com chocolate cremoso.",
    price: 64.0,
    image: boloCenoura,
    badge: "Novidade",
  },
  {
    id: "p5",
    category: "docinhos",
    name: "Brigadeiro Gourmet (caixa c/ 12)",
    description: "Chocolate meio amargo finalizado com castanhas caramelizadas.",
    price: 38.0,
    image: brigadeiro,
  },
  {
    id: "p6",
    category: "docinhos",
    name: "Beijinho de Coco (caixa c/ 12)",
    description: "Coco fresco com leite condensado e cravo da índia.",
    price: 34.0,
    image: beijinho,
  },
];
