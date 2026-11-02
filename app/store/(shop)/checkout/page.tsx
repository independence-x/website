import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/store/CheckoutView";

export const metadata: Metadata = { title: "CHECKOUT" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-center text-sm text-[#6b6b6b]">Loading checkout…</p>}>
      <CheckoutView />
    </Suspense>
  );
}
