export function PageHero({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede?: string;
}) {
  return (
    <section className="starfield border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <p className="kicker text-[11px] text-signal">{kicker}</p>
        <h1 className="display mt-4 max-w-3xl text-4xl leading-[1.05] text-paper md:text-6xl">
          {title}
        </h1>
        {lede && <p className="mt-5 max-w-2xl text-lg leading-8 text-mist">{lede}</p>}
      </div>
    </section>
  );
}
