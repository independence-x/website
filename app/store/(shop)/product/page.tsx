import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductView } from "@/components/store/ProductView";

export const metadata: Metadata = { title: "PRODUCT" };

export default function ProductPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-center text-sm text-[#6b6b6b]">Loading product…</p>}>
      <ProductView />
    </Suspense>
  );
}
