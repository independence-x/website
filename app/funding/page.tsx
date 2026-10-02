import type { Metadata } from "next";
import { funders, totals } from "@/lib/content";
import { asset } from "@/lib/paths";

export const metadata: Metadata = { title: "Funding" };

export default function FundingPage() {
  return (
    <>
      <section className="starfield border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="kicker text-[11px] text-signal">Funding</p>
          <h1 className="display mt-4 text-4xl md:text-6xl">Total Funded</h1>
          <p className="display mt-4 text-3xl text-ice md:text-5xl">{totals.funded}</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <ul className="grid gap-4 md:grid-cols-2">
          {funders.map((funder) => (
            <li
              key={funder.name}
              className="grid overflow-hidden rounded-3xl border border-line sm:grid-cols-[180px_1fr]"
            >
              <div
                className={`flex items-center justify-center p-5 ${
                  funder.dark ? "bg-black" : "bg-white"
                }`}
              >
                <img
                  src={asset(funder.image)}
                  alt={funder.name}
                  className="max-h-28 w-auto max-w-full object-contain"
                />
              </div>
              <div className="bg-ink-2 p-6">
                <h2 className="display text-2xl leading-tight">{funder.name}</h2>
                <p className="mt-3 text-ice">{funder.amount}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
