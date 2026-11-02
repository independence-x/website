"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney, ShopProduct } from "@/lib/shop";
import { ProductImage, ShopNotice, useShop } from "@/components/store/ShopLayout";

export function Collection() {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const products = shop.catalog?.products ?? [];
  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
    return ["All", ...names];
  }, [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery = !needle || `${product.name} ${product.sku}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price_cents - b.price_cents);
    if (sort === "price-desc") sorted.sort((a, b) => b.price_cents - a.price_cents);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products, query, category, sort]);

  if (!shopApiMissing() && shop.loading) return <ShopNotice>Loading products…</ShopNotice>;
  if (!shopApiMissing() && shop.error) return <ShopNotice>{shop.error}</ShopNotice>;
  if (shopApiMissing()) {
    return <ShopNotice>The catalog is not connected yet. Start the local shop, then refresh this page.</ShopNotice>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e6e6e6] pb-6">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">All products</h1>
          <p className="mt-2 text-sm text-[#6b6b6b]">{visible.length} products</p>
        </div>
        <label className="text-sm text-[#6b6b6b]">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="ml-2 bg-white py-2 text-[#121212]"
          >
            <option value="featured">Featured</option>
            <option value="name">Alphabetically, A–Z</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`border px-3 py-1.5 text-sm ${category === name ? "border-[#121212] bg-[#121212] text-white" : "border-[#d0d0d0]"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search products"
          className="w-full border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#121212] placeholder:text-[#8a8a8a] sm:max-w-xs"
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-sm text-[#6b6b6b]">No products match.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  const shop = useShop();
  const soldOut = product.stock < 1;

  return (
    <article>
      <Link href={`/store/product?slug=${product.slug}`} className="group block">
        <div className="relative aspect-square overflow-hidden bg-[#f3f3f3]">
          <ProductImage product={product} className="h-full w-full transition duration-300 group-hover:scale-[1.03]" />
          {soldOut && (
            <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[11px] uppercase tracking-wide">Sold out</span>
          )}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 text-sm">
          <h2 className="font-medium">{product.name}</h2>
          <p>{formatMoney(product.price_cents, product.currency)}</p>
        </div>
      </Link>
      <button
        type="button"
        disabled={soldOut}
        onClick={() => shop.add(product.id, 1)}
        className="mt-3 w-full border border-[#121212] py-2 text-sm disabled:cursor-not-allowed disabled:border-[#d0d0d0] disabled:text-[#8a8a8a]"
      >
        {soldOut ? "Sold out" : "Add to cart"}
      </button>
    </article>
  );
}

function shopApiMissing() {
  return !(process.env.NEXT_PUBLIC_STORE_API_URL || "").trim();
}
