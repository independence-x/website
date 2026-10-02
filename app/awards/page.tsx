import type { Metadata } from "next";
import { Shot } from "@/components/Shot";
import { awards } from "@/lib/content";

export const metadata: Metadata = { title: "Awards" };

export default function AwardsPage() {
  return (
    <>
      <section className="starfield border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="kicker text-[11px] text-signal">Awards</p>
          <h1 className="display mt-4 max-w-3xl text-4xl md:text-6xl">
            Recognition in New York and Los Angeles
          </h1>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-16 px-5 py-16">
        {awards.map((award) => (
          <article key={award.title}>
            <h2 className="display text-3xl md:text-4xl">{award.title}</h2>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-mist">{award.body}</p>
            <div className="mt-6">
              <Shot src={award.image} alt={award.alt} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
