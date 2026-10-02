import Link from "next/link";
import { AutoplayVideo } from "@/components/AutoplayVideo";
import {
  company,
  mercapFeatures,
  mercapSystems,
  sequence,
  totals,
} from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] overflow-hidden border-b border-line">
        <AutoplayVideo
          src="/media/hero.mp4"
          poster="/media/hero.jpg"
          loop
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink from-10% via-ink/88 to-ink/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/50" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-end px-5 py-16 md:py-24">
          <p className="kicker text-[12px] text-ice">{company.descriptor}</p>
          <h1 className="display mt-4 max-w-4xl text-5xl leading-[0.95] md:text-7xl">
            {company.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-paper/80">
            MERCAP is the Microgravity Experiment Re-entry Capsule from{" "}
            {company.name}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#mercap"
              className="rounded-full bg-signal px-5 py-3 text-sm font-medium text-white"
            >
              Explore MERCAP
            </a>
            <Link
              href="/contact"
              className="rounded-full border border-white/30 px-5 py-3 text-sm text-paper"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl md:grid-cols-3">
          <Link href="/clients" className="border-b border-line px-5 py-8 md:border-b-0 md:border-r">
            <p className="kicker text-[11px] text-mist">Total contract</p>
            <p className="display mt-3 text-3xl">{totals.contracts}</p>
          </Link>
          <Link href="/funding" className="border-b border-line px-5 py-8 md:border-b-0 md:border-r">
            <p className="kicker text-[11px] text-mist">Total funded</p>
            <p className="display mt-3 text-3xl">{totals.funded}</p>
          </Link>
          <Link href="/awards" className="px-5 py-8">
            <p className="kicker text-[11px] text-mist">Recognition</p>
            <p className="display mt-3 text-3xl">Pioneer Award 2016</p>
            <p className="mt-2 text-sm text-mist">USD55,000 cash prize</p>
          </Link>
        </div>
      </section>

      <section id="mercap" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="kicker text-[11px] text-signal">MERCAP</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">
              Microgravity Experiment Re-entry Capsule
            </h2>
            <p className="mt-5 text-mist leading-7">
              A re-entry capsule for biotech and pharmaceutical experiments, flown
              by {company.name}.
            </p>
            <img
              src="/media/mercap-brochure.png"
              alt="MERCAP brochure showing capsule systems, key features, and the launch to touchdown sequence"
              className="mt-8 w-full rounded-3xl border border-line"
            />
          </div>
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mercapFeatures.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-line bg-ink-2 p-5">
                  <h3 className="display text-2xl">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-mist">{feature.body}</p>
                </article>
              ))}
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {mercapSystems.map((system) => (
                <li
                  key={system}
                  className="rounded-full border border-line px-3 py-1.5 text-sm text-paper/90"
                >
                  {system}
                </li>
              ))}
            </ul>
            <ol className="mt-8 space-y-0">
              {sequence.map((step, index) => (
                <li key={step.n} className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <span className="display flex h-10 w-10 items-center justify-center rounded-full border border-signal text-sm text-signal">
                      {step.n}
                    </span>
                    {index < sequence.length - 1 && <span className="h-8 w-px bg-line" />}
                  </div>
                  <div className="pb-4">
                    <p className="kicker text-[10px] text-mist">{step.phase} phase</p>
                    <p className="mt-1 text-paper">{step.label}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-3xl border border-line bg-black">
          <AutoplayVideo
            src="/media/mercap.mp4"
            poster="/media/mercap-poster.jpg"
            controls
            className="aspect-video w-full"
          />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="kicker text-[11px] text-signal">Coverage</p>
          <h2 className="display mt-3 text-4xl">European Media Coverage</h2>
          <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-black">
            <AutoplayVideo
              src="/media/cnet.mp4"
              poster="/media/cnet-poster.jpg"
              controls
              className="aspect-video w-full"
            />
          </div>
          <Link href="/media" className="mt-6 inline-block text-sm text-ice hover:underline">
            See French, US, German, and Singaporean coverage
          </Link>
        </div>
      </section>
    </>
  );
}
