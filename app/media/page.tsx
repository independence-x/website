import type { Metadata } from "next";
import { AutoplayVideo } from "@/components/AutoplayVideo";
import { Shot } from "@/components/Shot";
import { coverage } from "@/lib/content";

export const metadata: Metadata = { title: "MEDIA" };

export default function MediaPage() {
  return (
    <>
      <section className="starfield border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="kicker text-[11px] text-signal">Media</p>
          <h1 className="display mt-4 max-w-3xl text-4xl md:text-6xl">
            Coverage from Europe, the United States, and Asia
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-6xl space-y-16 px-5 py-16">
        {coverage.map((item) => (
          <article key={item.kicker}>
            <p className="kicker text-[11px] text-signal">{item.kicker}</p>
            <h2 className="display mt-3 max-w-3xl text-3xl leading-tight md:text-4xl">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-mist">{item.meta}</p>
            <div className="mt-6">
              <Shot src={item.image} alt={item.alt} />
            </div>
          </article>
        ))}
        <article>
          <p className="kicker text-[11px] text-signal">European media coverage</p>
          <h2 className="display mt-3 text-3xl md:text-4xl">CNET, Google Lunar XPRIZE</h2>
          <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-black">
            <AutoplayVideo
              src="/media/cnet.mp4"
              poster="/media/cnet-poster.jpg"
              controls
              className="aspect-video w-full"
            />
          </div>
        </article>
      </section>
    </>
  );
}
