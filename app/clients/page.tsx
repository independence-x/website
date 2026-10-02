import type { Metadata } from "next";
import { clients, totals } from "@/lib/content";

export const metadata: Metadata = { title: "CLIENTS" };

export default function ClientsPage() {
  return (
    <>
      <section className="starfield border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="kicker text-[11px] text-signal">Clients</p>
          <h1 className="display mt-4 text-4xl md:text-6xl">Total Contract</h1>
          <p className="display mt-4 text-3xl text-ice md:text-5xl">{totals.contracts}</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <li
              key={client.name}
              className="flex flex-col overflow-hidden rounded-3xl border border-line"
            >
              <div
                className={`flex h-40 items-center justify-center p-6 ${
                  client.dark ? "bg-black" : "bg-white"
                }`}
              >
                <img
                  src={client.image}
                  alt={client.name}
                  className="max-h-24 w-auto max-w-[80%] object-contain"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between bg-ink-2 p-5">
                <h2 className="display text-2xl">{client.name}</h2>
                <p className="mt-3 text-sm text-mist">{client.country}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
