"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const apiBase = (process.env.NEXT_PUBLIC_STORE_API_URL || "").replace(/\/$/, "");
const field =
  "mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice";

type Product = {
  id: number;
  name: string;
  sku: string;
  description: string;
  category: string;
  price_cents: number;
  currency: string;
  stock: number;
  image_url: string | null;
  active: boolean;
};

type OrderRow = {
  order_number: string;
  customer_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  internal_notes: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};

type OrderItem = {
  product_name: string;
  sku: string;
  qty: number;
  unit_price_cents: number;
};

type Customer = {
  email: string;
  customer_name: string;
  company: string;
  phone: string;
  orders: number;
  paid_cents: number;
  currency: string;
  last_order: string;
};

class AuthError extends Error {}

function money(cents: number, currency = "MYR") {
  const amount = (cents / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "MYR" ? `RM ${amount}` : `${currency} ${amount}`;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" });
}

function statusLabel(status: string) {
  if (status === "pending") return "Awaiting payment";
  if (status === "paid") return "Paid";
  if (status === "fulfilled") return "Fulfilled";
  if (status === "cancelled") return "Cancelled";
  return status;
}

async function call<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401) throw new AuthError(data.error || "Sign in again.");
  if (!response.ok) throw new Error(data.error || "The request failed.");
  return data;
}

export function StoreAdmin() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") || "dashboard";
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("idxa-admin-token") || "";
    const savedName = sessionStorage.getItem("idxa-admin-name") || "";
    setToken(saved || null);
    setName(savedName);
    setReady(true);
  }, []);

  function signIn(nextToken: string, nextName: string) {
    sessionStorage.setItem("idxa-admin-token", nextToken);
    sessionStorage.setItem("idxa-admin-name", nextName);
    setToken(nextToken);
    setName(nextName);
  }

  const signOut = useCallback(() => {
    sessionStorage.removeItem("idxa-admin-token");
    sessionStorage.removeItem("idxa-admin-name");
    setToken(null);
    router.replace("/store/admin");
  }, [router]);

  if (!apiBase) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="display text-4xl">Shop API is not configured</h1>
        <p className="mt-4 text-mist">Set NEXT_PUBLIC_STORE_API_URL in .env.local and restart the dev server.</p>
      </section>
    );
  }

  if (!ready) return <p className="px-5 py-16 text-mist">Loading admin…</p>;
  if (!token) return <Login onSuccess={signIn} />;

  const links = [
    ["dashboard", "Dashboard"],
    ["products", "Products"],
    ["orders", "Orders"],
    ["customers", "Customers"],
  ] as const;

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="kicker text-[11px] text-signal">Store admin</p>
        <p className="mt-2 text-sm text-mist">{name}</p>
        <nav className="mt-4 flex gap-2 overflow-auto lg:flex-col">
          {links.map(([id, label]) => (
            <Link
              key={id}
              href={id === "dashboard" ? "/store/admin" : `/store/admin?view=${id}`}
              className={`rounded-full px-3 py-1.5 text-sm ${view === id ? "bg-white text-ink" : "text-mist"}`}
            >
              {label}
            </Link>
          ))}
          <Link href="/store" className="rounded-full px-3 py-1.5 text-sm text-mist">
            View store
          </Link>
          <button type="button" onClick={signOut} className="rounded-full px-3 py-1.5 text-left text-sm text-mist">
            Sign out
          </button>
        </nav>
      </aside>
      <div>
        {view === "products" && <Products token={token} onAuthError={signOut} />}
        {view === "product" && <ProductForm token={token} onAuthError={signOut} />}
        {view === "orders" && <Orders token={token} onAuthError={signOut} />}
        {view === "order" && <OrderDetail token={token} onAuthError={signOut} />}
        {view === "customers" && <Customers token={token} onAuthError={signOut} />}
        {view === "dashboard" && <Dashboard token={token} onAuthError={signOut} />}
      </div>
    </section>
  );
}

function Login({ onSuccess }: { onSuccess: (token: string, name: string) => void }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSending(true);
    setError("");
    try {
      const result = await call<{ token: string; name: string }>("/admin/login.php", null, {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email") || ""),
          password: String(data.get("password") || ""),
        }),
      });
      onSuccess(result.token, result.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <p className="kicker text-[11px] text-signal">Store admin</p>
      <h1 className="display mt-3 text-5xl">Sign in</h1>
      <p className="mt-3 text-sm text-mist">This sign-in is for the local shop database.</p>
      <form onSubmit={onSubmit} className="mt-6 rounded-3xl border border-line bg-ink-2 p-6">
        <label className="block text-sm text-mist">
          Email
          <input required type="email" name="email" autoComplete="username" className={field} />
        </label>
        <label className="mt-4 block text-sm text-mist">
          Password
          <input required type="password" name="password" autoComplete="current-password" className={field} />
        </label>
        {error && <p className="mt-4 text-sm text-signal">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="mt-5 rounded-full bg-signal px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {sending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}

function Dashboard({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [data, setData] = useState<{
    live: number;
    products: number;
    low_stock: number;
    pending: number;
    revenue_cents: number;
    currency: string;
    recent_orders: OrderRow[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call<NonNullable<typeof data>>("/admin/dashboard.php", token)
      .then(setData)
      .catch((caught) => (caught instanceof AuthError ? onAuthError() : setError(caught.message)));
  }, [token, onAuthError]);

  if (error) return <p className="text-signal">{error}</p>;
  if (!data) return <p className="text-mist">Loading dashboard…</p>;

  const cards = [
    ["Live products", String(data.live), `${data.products} total`],
    ["Low stock", String(data.low_stock), "5 or fewer, still listed"],
    ["Awaiting payment", String(data.pending), ""],
    ["Paid and fulfilled", money(data.revenue_cents, data.currency), ""],
  ];

  return (
    <div>
      <h1 className="display text-5xl">Dashboard</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note]) => (
          <article key={label} className="rounded-3xl border border-line bg-ink-2 p-4">
            <p className="text-sm text-mist">{label}</p>
            <p className="display mt-2 text-3xl">{value}</p>
            {note && <p className="text-sm text-mist">{note}</p>}
          </article>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-mist" colSpan={4}>
                  No orders yet.
                </td>
              </tr>
            )}
            {data.recent_orders.map((order) => (
              <tr key={order.order_number} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link className="text-ice" href={`/store/admin?view=order&number=${encodeURIComponent(order.order_number)}`}>
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{order.customer_name}</td>
                <td className="px-4 py-3">{statusLabel(order.status)}</td>
                <td className="px-4 py-3">{money(order.total_cents, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Products({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  function load(q = query) {
    const path = q.trim() ? `/admin/products.php?q=${encodeURIComponent(q.trim())}` : "/admin/products.php";
    call<{ products: Product[] }>(path, token)
      .then((data) => setProducts(data.products))
      .catch((caught) => (caught instanceof AuthError ? onAuthError() : setError(caught.message)));
  }

  useEffect(() => {
    load("");
    // The first list is unfiltered. Search submits explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function remove(id: number) {
    if (!window.confirm("Remove this product?")) return;
    try {
      await call("/admin/product-delete.php", token, { method: "POST", body: JSON.stringify({ id }) });
      load();
    } catch (caught) {
      if (caught instanceof AuthError) onAuthError();
      else setError(caught instanceof Error ? caught.message : "Could not remove the product.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl">Products</h1>
        <Link href="/store/admin?view=product" className="rounded-full bg-signal px-4 py-2 text-sm font-medium text-white">
          Add product
        </Link>
      </div>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, SKU, category"
          className="w-full max-w-sm rounded-xl border border-line bg-ink px-3 py-3"
        />
        <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm">
          Search
        </button>
      </form>
      {error && <p className="mt-4 text-signal">{error}</p>}
      {!products ? (
        <p className="mt-6 text-mist">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="mt-6 text-mist">No products yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="text-mist">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link className="text-ice" href={`/store/admin?view=product&id=${product.id}`}>
                      {product.name}
                    </Link>
                    <div className="text-mist">{product.sku}{product.category ? ` · ${product.category}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">{money(product.price_cents, product.currency)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3">{product.active ? "Live" : "Hidden"}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-signal" onClick={() => remove(product.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductForm({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") || "";
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    call<{ products: Product[] }>(`/admin/products.php`, token)
      .then((data) => {
        const found = data.products.find((item) => String(item.id) === id) || null;
        if (!found) setError("Product not found.");
        setProduct(found);
        setLoaded(true);
      })
      .catch((caught) => (caught instanceof AuthError ? onAuthError() : setError(caught.message)));
  }, [id, token, onAuthError]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("image");
    const payload: Record<string, unknown> = {
      id: id ? Number(id) : undefined,
      name: String(data.get("name") || ""),
      sku: String(data.get("sku") || ""),
      category: String(data.get("category") || ""),
      price: String(data.get("price") || ""),
      stock: Number(data.get("stock") || 0),
      description: String(data.get("description") || ""),
      image_url: String(data.get("image_url") || ""),
      active: data.get("active") === "on",
      remove_image: data.get("remove_image") === "on",
    };
    if (file instanceof File && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      payload.image_base64 = btoa(binary);
      payload.image_type = file.type;
    }
    setSending(true);
    setError("");
    try {
      await call("/admin/products.php", token, { method: "POST", body: JSON.stringify(payload) });
      router.push("/store/admin?view=products");
    } catch (caught) {
      if (caught instanceof AuthError) onAuthError();
      else setError(caught instanceof Error ? caught.message : "Could not save the product.");
    } finally {
      setSending(false);
    }
  }

  if (!loaded) return <p className="text-mist">Loading product…</p>;

  return (
    <div>
      <h1 className="display text-5xl">{id ? "Edit product" : "Add product"}</h1>
      <form onSubmit={onSubmit} className="mt-6 max-w-2xl rounded-3xl border border-line bg-ink-2 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-mist">Name<input required name="name" defaultValue={product?.name || ""} className={field} /></label>
          <label className="block text-sm text-mist">SKU<input required name="sku" defaultValue={product?.sku || ""} className={field} /></label>
          <label className="block text-sm text-mist">Category<input name="category" defaultValue={product?.category || ""} className={field} /></label>
          <label className="block text-sm text-mist">
            Price (MYR)
            <input required name="price" inputMode="decimal" defaultValue={product ? centsToInput(product.price_cents) : ""} className={field} />
          </label>
          <label className="block text-sm text-mist">
            Stock
            <input required name="stock" inputMode="numeric" defaultValue={product?.stock ?? 0} className={field} />
          </label>
          <label className="mt-8 flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="active" defaultChecked={product ? product.active : true} />
            Show on the public store
          </label>
        </div>
        <label className="mt-4 block text-sm text-mist">
          Description
          <textarea name="description" rows={5} defaultValue={product?.description || ""} className={field} />
        </label>
        <label className="mt-4 block text-sm text-mist">
          Photo
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={field} />
        </label>
        <label className="mt-4 block text-sm text-mist">
          Or an https image link
          <input name="image_url" defaultValue={product?.image_url?.startsWith("https://") ? product.image_url : ""} className={field} />
        </label>
        {product?.image_url && (
          <label className="mt-4 flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="remove_image" />
            Remove the current photo
          </label>
        )}
        {error && <p className="mt-4 text-sm text-signal">{error}</p>}
        <button type="submit" disabled={sending} className="mt-5 rounded-full bg-signal px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {sending ? "Saving…" : id ? "Save product" : "Add product"}
        </button>
      </form>
    </div>
  );
}

function Orders({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  function load(nextQuery = query, nextStatus = status) {
    const search = new URLSearchParams();
    if (nextQuery.trim()) search.set("q", nextQuery.trim());
    if (nextStatus !== "all") search.set("status", nextStatus);
    const suffix = search.toString() ? `?${search}` : "";
    call<{ orders: OrderRow[] }>(`/admin/orders.php${suffix}`, token)
      .then((data) => setOrders(data.orders))
      .catch((caught) => (caught instanceof AuthError ? onAuthError() : setError(caught.message)));
  }

  useEffect(() => {
    load("", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div>
      <h1 className="display text-5xl">Orders</h1>
      <form
        className="mt-6 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, name, email" className="w-full max-w-sm rounded-xl border border-line bg-ink px-3 py-3" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-line bg-ink px-3 py-3">
          <option value="all">All statuses</option>
          <option value="pending">Awaiting payment</option>
          <option value="paid">Paid</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm">Filter</button>
      </form>
      {error && <p className="mt-4 text-signal">{error}</p>}
      {!orders ? (
        <p className="mt-6 text-mist">Loading orders…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="text-mist">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td className="px-4 py-4 text-mist" colSpan={5}>No orders match this view.</td></tr>
              )}
              {orders.map((order) => (
                <tr key={order.order_number} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link className="text-ice" href={`/store/admin?view=order&number=${encodeURIComponent(order.order_number)}`}>{order.order_number}</Link>
                  </td>
                  <td className="px-4 py-3">{order.customer_name}<div className="text-mist">{order.email}</div></td>
                  <td className="px-4 py-3">{statusLabel(order.status)}</td>
                  <td className="px-4 py-3">{money(order.total_cents, order.currency)}</td>
                  <td className="px-4 py-3">{when(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderDetail({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const params = useSearchParams();
  const number = params.get("number") || "";
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    call<{ order: OrderRow; items: OrderItem[] }>(`/admin/order.php?number=${encodeURIComponent(number)}`, token)
      .then((data) => {
        setOrder(data.order);
        setItems(data.items);
      })
      .catch((caught) => (caught instanceof AuthError ? onAuthError() : setError(caught.message)));
  }

  useEffect(() => {
    if (number) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSending(true);
    setError("");
    setNotice("");
    try {
      await call("/admin/order.php", token, {
        method: "POST",
        body: JSON.stringify({
          number,
          status: String(data.get("status") || ""),
          internal_notes: String(data.get("internal_notes") || ""),
        }),
      });
      setNotice("Order updated.");
      load();
    } catch (caught) {
      if (caught instanceof AuthError) onAuthError();
      else setError(caught instanceof Error ? caught.message : "Could not update the order.");
    } finally {
      setSending(false);
    }
  }

  if (error && !order) return <p className="text-signal">{error}</p>;
  if (!order) return <p className="text-mist">Loading order…</p>;

  return (
    <div>
      <h1 className="display text-5xl">{order.order_number}</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-ink-2 p-6">
          <h2 className="display text-3xl">Customer</h2>
          <p className="mt-3">{order.customer_name}<br />{order.email}<br />{order.phone}</p>
          {order.company && <p className="mt-2">{order.company}</p>}
          <p className="mt-3 whitespace-pre-wrap">{order.address}</p>
          {order.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-mist">Customer note: {order.notes}</p>}
          <p className="mt-3 text-sm text-mist">Placed {when(order.created_at)}</p>
        </section>
        <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-ink-2 p-6">
          <h2 className="display text-3xl">Status</h2>
          <label className="mt-4 block text-sm text-mist">
            Order status
            <select name="status" defaultValue={order.status} key={order.status} className={field}>
              <option value="pending">Awaiting payment</option>
              <option value="paid">Paid</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="mt-4 block text-sm text-mist">
            Internal note
            <textarea name="internal_notes" rows={5} defaultValue={order.internal_notes} key={order.internal_notes} className={field} />
          </label>
          <p className="mt-3 text-sm text-mist">Cancelling returns the items to stock.</p>
          {error && <p className="mt-3 text-sm text-signal">{error}</p>}
          {notice && <p className="mt-3 text-sm text-ice">{notice}</p>}
          <button type="submit" disabled={sending} className="mt-4 rounded-full bg-signal px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
            {sending ? "Saving…" : "Save order"}
          </button>
        </form>
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Line</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.sku}-${item.product_name}`} className="border-t border-line">
                <td className="px-4 py-3">{item.product_name}<div className="text-mist">{item.sku}</div></td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3">{money(item.unit_price_cents * item.qty, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-4 text-lg">Total {money(order.total_cents, order.currency)}</p>
      </div>
    </div>
  );
}

function Customers({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call<{ customers: Customer[] }>("/admin/customers.php", token)
      .then((data) => setRows(data.customers))
      .catch((caught) => (caught instanceof AuthError ? onAuthError() : setError(caught.message)));
  }, [token, onAuthError]);

  if (error) return <p className="text-signal">{error}</p>;
  if (!rows) return <p className="text-mist">Loading customers…</p>;

  return (
    <div>
      <h1 className="display text-5xl">Customers</h1>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Last order</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="px-4 py-4 text-mist" colSpan={5}>Customers appear here after an order is placed.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.email} className="border-t border-line">
                <td className="px-4 py-3">{row.customer_name}<div className="text-mist">{row.email}</div></td>
                <td className="px-4 py-3">{row.company}</td>
                <td className="px-4 py-3">
                  <Link className="text-ice" href={`/store/admin?view=orders`}>{row.orders}</Link>
                </td>
                <td className="px-4 py-3">{money(row.paid_cents, row.currency)}</td>
                <td className="px-4 py-3">{when(row.last_order)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
