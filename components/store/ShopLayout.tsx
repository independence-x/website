"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  FormEvent,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  CartLine,
  fetchCatalog,
  formatMoney,
  ShopCatalog,
  ShopProduct,
  shopApi,
} from "@/lib/shop";

type ShopContextValue = {
  catalog: ShopCatalog | null;
  loading: boolean;
  error: string;
  cart: CartLine[];
  count: number;
  subtotal: number;
  currency: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (productId: number, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
  productById: (id: number) => ShopProduct | undefined;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("Shop is unavailable.");
  return value;
}

export function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [loading, setLoading] = useState(Boolean(shopApi));
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("idxa-cart") || "[]") as CartLine[];
      if (Array.isArray(saved)) {
        setCart(saved.filter((line) => line && Number.isInteger(line.productId) && line.qty > 0));
      }
    } catch {
      setCart([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("idxa-cart", JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (!shopApi) return;
    const controller = new AbortController();
    fetchCatalog(controller.signal)
      .then(setCatalog)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError("The product list could not be loaded.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const products = catalog?.products ?? [];
  const currency = catalog?.currency || "MYR";

  function productById(id: number) {
    return products.find((product) => product.id === id);
  }

  function add(productId: number, qty = 1) {
    if (qty < 1) return;
    setCart((current) => {
      const product = products.find((item) => item.id === productId);
      const max = product ? product.stock : 99;
      if (max < 1) return current;
      const existing = current.find((line) => line.productId === productId);
      if (!existing) return [...current, { productId, qty: Math.min(qty, max) }];
      return current.map((line) =>
        line.productId === productId ? { ...line, qty: Math.min(line.qty + qty, max) } : line,
      );
    });
    setOpen(true);
  }

  function clear() {
    setCart([]);
  }

  function setQty(productId: number, qty: number) {
    setCart((current) => {
      if (qty < 1) return current.filter((line) => line.productId !== productId);
      const product = products.find((item) => item.id === productId);
      const max = product ? product.stock : 99;
      return current.map((line) =>
        line.productId === productId ? { ...line, qty: Math.min(qty, max) } : line,
      );
    });
  }

  const count = cart.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = cart.reduce((sum, line) => {
    const product = productById(line.productId);
    return product ? sum + product.price_cents * Math.min(line.qty, product.stock) : sum;
  }, 0);

  const quiet = pathname.includes("/checkout") || pathname.includes("/thank-you");

  const value = { catalog, loading, error, cart, count, subtotal, currency, open, setOpen, add, setQty, clear, productById };

  return (
    <ShopContext.Provider value={value}>
      <div className="min-h-[70vh] bg-white text-[#121212]">
        <div className="bg-[#121212] px-5 py-2 text-center text-[12px] tracking-wide text-white">
          {catalog?.payoneer_ready
            ? "Pay with Payoneer at checkout. Cards and local methods are taken on Payoneer's secure page."
            : "Orders are confirmed by email. Payoneer Checkout is not connected yet."}
        </div>
        <div className="border-b border-[#e6e6e6] bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
            <Link href="/store" className="text-sm font-medium tracking-[0.18em] uppercase">
              Store
            </Link>
            {!quiet && (
              <nav className="hidden gap-6 text-sm text-[#444] sm:flex">
                <Link href="/store" className={pathname === "/store" || pathname === "/store/" ? "text-[#121212]" : ""}>
                  All products
                </Link>
              </nav>
            )}
            <div className="flex items-center gap-4 text-sm">
              {!quiet && (
                <Link href="/store/cart" className="hidden text-[#444] sm:inline">
                  Cart
                </Link>
              )}
              <button type="button" className="relative" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}>
                <CartIcon />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#121212] px-1 text-[11px] text-white">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        {children}
      </div>
      <CartDrawer />
    </ShopContext.Provider>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 7h15l-1.5 9h-12L5 4H2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="20" r="1.3" fill="currentColor" />
      <circle cx="18" cy="20" r="1.3" fill="currentColor" />
    </svg>
  );
}

function CartDrawer() {
  const shop = useShop();
  if (!shop.open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close cart" onClick={() => shop.setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white text-[#121212] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6e6e6] px-5 py-4">
          <h2 className="text-lg">Cart</h2>
          <button type="button" onClick={() => shop.setOpen(false)} aria-label="Close cart" className="text-2xl leading-none">
            ×
          </button>
        </div>
        <CartLines />
        <div className="border-t border-[#e6e6e6] px-5 py-5">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatMoney(shop.subtotal, shop.currency)}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#6b6b6b]">Taxes and delivery are confirmed with your payment instructions.</p>
          <Link
            href="/store/checkout"
            onClick={() => shop.setOpen(false)}
            className={`mt-4 block py-3 text-center text-sm text-white ${shop.count ? "bg-[#121212]" : "pointer-events-none bg-[#121212]/40"}`}
          >
            Checkout
          </Link>
          <Link href="/store/cart" onClick={() => shop.setOpen(false)} className="mt-3 block text-center text-sm underline">
            View cart
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function CartLines({ checkout = false }: { checkout?: boolean }) {
  const shop = useShop();
  if (shop.cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p>Your cart is empty.</p>
        <Link href="/store" onClick={() => shop.setOpen(false)} className="mt-4 text-sm underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <ul className={`flex-1 space-y-5 overflow-auto px-5 py-5 ${checkout ? "" : ""}`}>
      {shop.cart.map((line) => {
        const product = shop.productById(line.productId);
        return (
          <li key={line.productId} className="flex gap-4">
            <ProductImage product={product} className="h-24 w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3 text-sm">
                <Link href={product ? `/store/product?slug=${product.slug}` : "/store"} onClick={() => shop.setOpen(false)} className="font-medium">
                  {product?.name || "No longer listed"}
                </Link>
                <span>{product ? formatMoney(product.price_cents * line.qty, product.currency) : ""}</span>
              </div>
              {product && <p className="mt-1 text-xs text-[#6b6b6b]">{formatMoney(product.price_cents, product.currency)}</p>}
              <div className="mt-3 flex items-center justify-between">
                <QtyControl
                  value={line.qty}
                  max={product?.stock ?? 99}
                  label={product?.name || "item"}
                  onChange={(qty) => shop.setQty(line.productId, qty)}
                />
                <button type="button" className="text-xs underline text-[#6b6b6b]" onClick={() => shop.setQty(line.productId, 0)}>
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function QtyControl({
  value,
  max,
  label,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="inline-flex items-center border border-[#d0d0d0]">
      <button type="button" className="h-9 w-9" onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
        −
      </button>
      <span className="w-8 text-center text-sm">{value}</span>
      <button
        type="button"
        className="h-9 w-9 disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function ProductImage({ product, className }: { product?: ShopProduct | null; className?: string }) {
  if (product?.image_url) {
    return <img src={product.image_url} alt="" className={`object-cover ${className || ""}`} />;
  }
  return (
    <div className={`grid place-items-center bg-[#f3f3f3] text-xs text-[#8a8a8a] ${className || ""}`}>
      {product?.name.slice(0, 1) || "—"}
    </div>
  );
}

export function ShopNotice({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-16 text-center text-sm text-[#6b6b6b]">{children}</p>;
}

export function useCheckoutSubmit() {
  const shop = useShop();

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("website") || "").trim()) return null;
    const items = shop.cart
      .map((line) => {
        const product = shop.productById(line.productId);
        if (!product || product.stock < 1) return null;
        return { product_id: line.productId, qty: Math.min(line.qty, product.stock) };
      })
      .filter(Boolean);
    const response = await fetch(`${shopApi}/orders.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        customer_name: String(data.get("customer_name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        company: String(data.get("company") || "").trim(),
        address: String(data.get("address") || "").trim(),
        city: String(data.get("city") || "").trim(),
        postcode: String(data.get("postcode") || "").trim(),
        country: String(data.get("country") || "").trim(),
        notes: String(data.get("notes") || "").trim(),
        payment_method: String(data.get("payment_method") || "invoice"),
        website: "",
        items,
      }),
    });
    const body = (await response.json()) as { order_number: string; total_cents: number; currency: string; payment_note: string; error?: string };
    if (!response.ok) throw new Error(body.error || "The order could not be placed.");
    return { ...body, email: String(data.get("email") || "").trim() };
  }

  return placeOrder;
}
