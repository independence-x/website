"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/shop";
import { ProductImage, QtyControl, ShopNotice, useShop } from "@/components/store/ShopLayout";

export function ProductView() {
  const params = useSearchParams();
  const slug = params.get("slug") || "";
  const shop = useShop();
  const product = shop.catalog?.products.find((item) => item.slug === slug);
  const [qty, setQty] = useState(1);

  if (shop.loading) return <ShopNotice>Loading product…</ShopNotice>;
  if (!product) return <ShopNotice>This product is not available.</ShopNotice>;

  const soldOut = product.stock < 1;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:py-12">
      <p className="text-sm text-[#6b6b6b]">
        <Link href="/store" className="underline">
          Store
        </Link>
        {product.category ? ` / ${product.category}` : ""} / {product.name}
      </p>
      <div className="mt-6 grid items-start gap-10 md:grid-cols-2">
        <div className="aspect-square bg-[#f3f3f3]">
          <ProductImage product={product} className="h-full w-full" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#6b6b6b]">Independence-X</p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight">{product.name}</h1>
          <p className="mt-4 text-lg">{formatMoney(product.price_cents, product.currency)}</p>
          <p className="mt-4 text-sm leading-6 text-[#444]">{product.description}</p>
          <p className="mt-4 text-xs text-[#6b6b6b]">SKU {product.sku}</p>
          {product.stock > 0 && product.stock <= 5 && (
            <p className="mt-2 text-sm">Only {product.stock} left</p>
          )}
          {!soldOut && (
            <div className="mt-6">
              <QtyControl
                value={Math.max(1, Math.min(qty, product.stock))}
                max={product.stock}
                label={product.name}
                onChange={(next) => setQty(Math.max(1, next))}
              />
            </div>
          )}
          <button
            type="button"
            disabled={soldOut}
            onClick={() => shop.add(product.id, qty)}
            className="mt-4 w-full bg-[#121212] py-4 text-sm text-white disabled:cursor-not-allowed disabled:bg-[#121212]/40"
          >
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
          <p className="mt-4 text-xs leading-5 text-[#6b6b6b]">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
        </div>
      </div>
    </div>
  );
}
