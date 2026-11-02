"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/shop";
import { CartLines, useShop } from "@/components/store/ShopLayout";

export function CartView() {
  const shop = useShop();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-medium tracking-tight">Your cart</h1>
      <div className="mt-8 border-t border-[#e6e6e6]">
        <CartLines checkout />
      </div>
      {shop.cart.length > 0 && (
        <div className="mt-6 border-t border-[#e6e6e6] pt-6">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatMoney(shop.subtotal, shop.currency)}</span>
          </div>
          <p className="mt-2 text-xs text-[#6b6b6b]">Taxes and delivery are confirmed with your payment instructions.</p>
          <Link href="/store/checkout" className="mt-5 block bg-[#121212] py-4 text-center text-sm text-white">
            Checkout
          </Link>
          <Link href="/store" className="mt-4 block text-center text-sm underline">
            Continue shopping
          </Link>
        </div>
      )}
    </div>
  );
}
