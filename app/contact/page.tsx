import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { company, offices } from "@/lib/content";

export const metadata: Metadata = { title: "CONTACT US" };

const kl = offices[0].places[0];

export default function ContactPage() {
  const [malaysia, france] = offices;
  const pad = 0.007;
  const bbox = `${kl.lon - pad},${kl.lat - pad},${kl.lon + pad},${kl.lat + pad}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${kl.lat}%2C${kl.lon}`;

  return (
    <>
      <section className="starfield border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-16">
          <p className="kicker text-[11px] text-signal">Contact</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">
            {company.name} <span className="align-super text-base text-mist">TM</span>
          </h1>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <a href={company.phoneHref} className="text-paper/90 hover:text-ice">
              {company.phoneDisplay}
            </a>
            <a href={`mailto:${company.email}`} className="text-ice hover:underline">
              {company.email}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="grid gap-12 border-b border-line pb-12 md:grid-cols-2 md:gap-16">
          <OfficeColumn office={malaysia} />
          <OfficeColumn office={france} />
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.35fr_0.85fr]">
          <figure>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-ink">
              <iframe
                title="Map of Malaysian Office 1, MOF Inc. Tower, Kuala Lumpur"
                src={mapSrc}
                className="map-dark h-72 w-full md:h-[22rem]"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_72px_18px_#07090f]" />
            </div>
            <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-3 text-sm text-mist">
              <span>Malaysian Office 1 · MOF Inc. Tower, KLCC</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kl.map)}`}
                target="_blank"
                rel="noreferrer"
                className="text-ice hover:underline"
              >
                Open in Google Maps
              </a>
            </figcaption>
          </figure>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function OfficeColumn({ office }: { office: (typeof offices)[number] }) {
  return (
    <div>
      <p className="text-xs text-mist">by</p>
      <p className="mt-2 text-sm font-medium tracking-wide">{office.entity}</p>
      <p className="mt-1 text-xs text-mist">
        Company No:{office.registration ? ` ${office.registration}` : ""}
      </p>
      <h2 className="kicker mt-8 text-[11px] text-mist">Address</h2>
      <div className="mt-4 space-y-6">
        {office.places.map((place) => (
          <address key={place.name} className="not-italic">
            <p className="text-sm font-medium">{place.name}</p>
            <p className="mt-1.5 text-sm leading-6 text-paper/75">
              {place.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </address>
        ))}
      </div>
    </div>
  );
}
