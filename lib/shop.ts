export type ShopProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  category: string;
  price_cents: number;
  currency: string;
  stock: number;
  image_url: string | null;
};

export type ShopCatalog = {
  currency: string;
  payment_note: string;
  payoneer_ready?: boolean;
  products: ShopProduct[];
};

export type CartLine = { productId: number; qty: number };

export type PlacedOrder = {
  order_number: string;
  total_cents: number;
  currency: string;
  payment_note: string;
  email: string;
  payment_method?: string;
  status?: string;
  redirect_url?: string;
  redirect_method?: string;
  redirect_parameters?: { name: string; value: string }[];
};

export const shopApi = (process.env.NEXT_PUBLIC_STORE_API_URL || "http://shop.independence-x.com/api").replace(/\/$/, "");

export function formatMoney(cents: number, currency = "MYR") {
  const amount = (cents / 100).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "MYR" ? `RM ${amount}` : `${currency} ${amount}`;
}

export async function fetchCatalog(signal?: AbortSignal) {
  const response = await fetch(`${shopApi}/products.php`, { signal });
  const body = (await response.json()) as ShopCatalog & { error?: string };
  if (!response.ok) throw new Error(body.error || "The store could not be loaded.");
  return body;
}
