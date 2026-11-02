"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { formatMoney, PlacedOrder, shopApi } from "@/lib/shop";
import { ProductImage, useCheckoutSubmit, useShop } from "@/components/store/ShopLayout";

const field = "mt-2 w-full border border-[#d0d0d0] bg-white px-3 py-3 text-sm text-[#121212] outline-none focus:border-[#121212]";

export function CheckoutView() {
  const shop = useShop();
  const placeOrder = useCheckoutSubmit();
  const router = useRouter();
  const params = useSearchParams();
  const cancelled = params.get("payment") === "cancelled";
  const payoneerReady = Boolean(shop.catalog?.payoneer_ready);
  const [method, setMethod] = useState("invoice");
  const [picked, setPicked] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!picked && payoneerReady) setMethod("payoneer");
  }, [picked, payoneerReady]);

  useEffect(() => {
    const order = params.get("order");
    if (!cancelled || !order || !shopApi) return;
    fetch(`${shopApi}/payoneer-status.php?order=${encodeURIComponent(order)}`).catch(() => undefined);
  }, [cancelled, params]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const order = await placeOrder(event);
      if (!order) return;
      const saved: PlacedOrder = order;
      sessionStorage.setItem("idxa-order", JSON.stringify(saved));
      if (saved.redirect_url) {
        leaveForPayoneer(saved);
        return;
      }
      shop.clear();
      router.push("/store/thank-you");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order could not be placed.");
    } finally {
      setSending(false);
    }
  }

  if (shop.cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-3xl font-medium">Your cart is empty</h1>
        <Link href="/store" className="mt-6 inline-block text-sm underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={onSubmit} className="order-2 lg:order-1">
        <h1 className="text-3xl font-medium tracking-tight">Checkout</h1>
        <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <section className="mt-8">
          <h2 className="text-lg">Contact</h2>
          <label className="mt-4 block text-sm">
            Email
            <input required type="email" name="email" autoComplete="email" className={field} />
          </label>
        </section>
        <section className="mt-8">
          <h2 className="text-lg">Delivery</h2>
          <label className="mt-4 block text-sm">
            Full name
            <input required name="customer_name" autoComplete="name" className={field} />
          </label>
          <label className="mt-4 block text-sm">
            Phone
            <input required name="phone" autoComplete="tel" className={field} />
          </label>
          <label className="mt-4 block text-sm">
            Company
            <input name="company" autoComplete="organization" className={field} />
          </label>
          <label className="mt-4 block text-sm">
            Address
            <textarea required name="address" rows={3} autoComplete="street-address" className={field} />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              City
              <input required name="city" autoComplete="address-level2" className={field} />
            </label>
            <label className="block text-sm">
              Postcode
              <input required name="postcode" autoComplete="postal-code" className={field} />
            </label>
          </div>
          <label className="mt-4 block text-sm">
            Country
            <select required name="country" defaultValue="MY" autoComplete="country" className={field}>
              <option value="MY">Malaysia</option>
              <option value="FR">France</option>
              <option value="SG">Singapore</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="AU">Australia</option>
              <option value="JP">Japan</option>
              <option value="ID">Indonesia</option>
              <option value="TH">Thailand</option>
              <option value="AE">United Arab Emirates</option>
            </select>
          </label>
          <label className="mt-4 block text-sm">
            Order notes
            <textarea name="notes" rows={3} className={field} />
          </label>
        </section>
        <section className="mt-8">
          <h2 className="text-lg">Payment</h2>
          {cancelled && (
            <p className="mt-3 border border-[#e6e6e6] bg-[#fafafa] p-4 text-sm leading-6">
              The Payoneer payment was cancelled. Your cart is unchanged. You can try again.
            </p>
          )}
          <div className="mt-3 space-y-3">
            <label className={`flex gap-3 border p-4 text-sm ${payoneerReady ? "border-[#121212]" : "border-[#e6e6e6] text-[#6b6b6b]"}`}>
              <input
                type="radio"
                name="payment_method"
                value="payoneer"
                checked={method === "payoneer"}
                disabled={!payoneerReady}
                onChange={() => {
                  setPicked(true);
                  setMethod("payoneer");
                }}
              />
              <span>
                <span className="block text-[#121212]">Payoneer</span>
                <span className="mt-1 block leading-6">
                  Pay by card or a local method on Payoneer&apos;s secure page. A Payoneer account is not required.
                </span>
                {!payoneerReady && (
                  <span className="mt-1 block leading-6">
                    Not connected yet. The shop server still needs the Payoneer merchant code and payment token.
                  </span>
                )}
              </span>
            </label>
            <label className="flex gap-3 border border-[#e6e6e6] p-4 text-sm">
              <input
                type="radio"
                name="payment_method"
                value="invoice"
                checked={method === "invoice"}
                onChange={() => {
                  setPicked(true);
                  setMethod("invoice");
                }}
              />
              <span>
                <span className="block">Request an invoice</span>
                <span className="mt-1 block leading-6 text-[#6b6b6b]">
                  {shop.catalog?.payment_note || "Independence-X will email payment instructions. Nothing is charged now."}
                </span>
              </span>
            </label>
          </div>
        </section>
        {error && <p className="mt-4 text-sm text-[#b42318]">{error}</p>}
        <button type="submit" disabled={sending} className="mt-6 w-full bg-[#121212] py-4 text-sm text-white disabled:opacity-60">
          {sending ? "Please wait…" : method === "payoneer" ? "Continue to Payoneer" : "Place order"}
        </button>
        <Link href="/store/cart" className="mt-4 block text-sm underline">
          Return to cart
        </Link>
      </form>

      <aside className="order-1 h-fit border border-[#e6e6e6] bg-[#fafafa] p-5 lg:sticky lg:top-24 lg:order-2">
        <h2 className="text-lg">Order summary</h2>
        <ul className="mt-4 space-y-4">
          {shop.cart.map((line) => {
            const product = shop.productById(line.productId);
            if (!product) return null;
            return (
              <li key={line.productId} className="flex gap-3 text-sm">
                <div className="relative">
                  <ProductImage product={product} className="h-16 w-14" />
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#6b6b6b] px-1 text-[11px] text-white">
                    {line.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p>{product.name}</p>
                  <p className="text-[#6b6b6b]">{product.sku}</p>
                </div>
                <p>{formatMoney(product.price_cents * line.qty, product.currency)}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex justify-between border-t border-[#e6e6e6] pt-4 text-sm">
          <span>Subtotal</span>
          <span>{formatMoney(shop.subtotal, shop.currency)}</span>
        </div>
        <div className="mt-2 flex justify-between text-base font-medium">
          <span>Total</span>
          <span>{formatMoney(shop.subtotal, shop.currency)}</span>
        </div>
      </aside>
    </div>
  );
}

function leaveForPayoneer(order: PlacedOrder) {
  if (!order.redirect_url) return;
  if (order.redirect_method === "POST") {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = order.redirect_url;
    for (const parameter of order.redirect_parameters || []) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = parameter.name;
      input.value = parameter.value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    return;
  }
  window.location.assign(order.redirect_url);
}
