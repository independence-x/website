import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "STORE" };

export default function StorePage() {
  return (
    <section className="starfield">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-24">
        <p className="kicker text-[11px] text-signal">Store</p>
        <h1 className="display mt-4 text-4xl md:text-6xl">This area is password protected</h1>
        <p className="mt-5 text-lg leading-8 text-mist">
          Please contact Independence-X Aerospace to request access to the store.
        </p>
        <Link
          href="/contact"
          className="mt-8 w-fit rounded-full bg-signal px-5 py-3 text-sm font-medium text-white"
        >
          Contact us
        </Link>
      </div>
    </section>
  );
}
