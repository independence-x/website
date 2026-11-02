"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney, PlacedOrder, shopApi } from "@/lib/shop";
import { useShop } from "@/components/store/ShopLayout";

export function ThankYou() {
  const shop = useShop();
  const clearCart = useRef(shop.clear);
  clearCart.current = shop.clear;
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: PlacedOrder | null = null;
    try {
      const raw = sessionStorage.getItem("idxa-order");
      saved = raw ? (JSON.parse(raw) as PlacedOrder) : null;
    } catch {
      saved = null;
    }
    const number = new URLSearchParams(window.location.search).get("order") || saved?.order_number;
    if (!number || !shopApi) {
      setOrder(saved);
      setReady(true);
      return;
    }
    let stopped = false;
    let attempts = 0;
    async function refresh() {
      try {
        const response = await fetch(`${shopApi}/payoneer-status.php?order=${encodeURIComponent(number || "")}`);
        const body = (await response.json()) as PlacedOrder & { status?: string; error?: string };
        if (!response.ok) throw new Error(body.error || "Payment status is unavailable.");
        if (stopped) return;
        const next = { ...saved, ...body, email: saved?.email || "" };
        setOrder(next);
        sessionStorage.setItem("idxa-order", JSON.stringify(next));
        if (next.status === "paid" || next.payment_method !== "payoneer") clearCart.current();
        setReady(true);
        if (next.status === "pending" && next.payment_method === "payoneer" && attempts < 4) {
          attempts += 1;
          window.setTimeout(refresh, 2000);
        }
      } catch {
        if (!stopped) {
          setOrder(saved);
          setReady(true);
        }
      }
    }
    refresh();
    return () => {
      stopped = true;
    };
  }, []);

  if (!ready) return <p className="px-5 py-16 text-center text-sm text-[#6b6b6b]">Loading order…</p>;
  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-3xl font-medium">No recent order</h1>
        <Link href="/store" className="mt-6 inline-block text-sm underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <p className="text-sm text-[#6b6b6b]">Order {order.order_number}</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">{order.status === "cancelled" ? "Payment not completed" : "Thank you"}</h1>
      <p className="mt-4 text-sm leading-6 text-[#444]">
        {order.status === "paid"
          ? `Payoneer confirmed this payment${order.email ? `. A receipt will go to ${order.email}` : ""}.`
          : order.status === "cancelled"
            ? "Payoneer did not take payment, so the order was cancelled and the items were returned to stock."
            : order.payment_method === "payoneer"
              ? `We are waiting for Payoneer to confirm this payment${order.email ? ` for ${order.email}` : ""}.`
              : `We received your order${order.email ? ` and will write to ${order.email}` : ""}. ${order.payment_note}`}
      </p>
      <p className="mt-6 text-lg">{formatMoney(order.total_cents, order.currency)}</p>
      <Link href="/store" className="mt-8 inline-block bg-[#121212] px-6 py-3 text-sm text-white">
        Continue shopping
      </Link>
    </div>
  );
}
