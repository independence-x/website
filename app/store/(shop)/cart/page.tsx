import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";

export const metadata: Metadata = { title: "CART" };

export default function CartPage() {
  return <CartView />;
}
