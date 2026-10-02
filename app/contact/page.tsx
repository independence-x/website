import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { company, offices } from "@/lib/content";

export const metadata: Metadata = { title: "CONTACT US" };

export default function ContactPage() {
  const [malaysia, france] = offices;

  return (
    <>
      <section className="starfield border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
          <h1 className="display text-4xl md:text-5xl">
            {company.name} <span className="align-super text-lg text-mist">TM</span>
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-14 md:grid-cols-2">
          <OfficeColumn office={malaysia} showContact />
          <OfficeColumn office={france} />
        </div>
        <div className="mt-16 max-w-xl">
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function OfficeMap({
  name,
  lat,
  lon,
  featured = false,
}: {
  name: string;
  lat: number;
  lon: number;
  featured?: boolean;
}) {
  const pad = featured ? 0.008 : 0.01;
  const bbox = `${lon - pad},${lat - pad},${lon + pad},${lat + pad}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className={`mt-4 overflow-hidden rounded-2xl border border-line ${featured ? "shadow-[0_0_0_1px_rgba(154,215,255,0.35)]" : ""}`}>
      <iframe
        title={`Map of ${name}`}
        src={src}
        className={featured ? "h-80 w-full bg-ink-2" : "h-52 w-full bg-ink-2"}
        loading={featured ? "eager" : "lazy"}
      />
    </div>
  );
}

function OfficeColumn({
  office,
  showContact = false,
}: {
  office: (typeof offices)[number];
  showContact?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-mist">by</p>
      <p className="mt-3 text-lg font-semibold">{office.entity}</p>
      <p className="mt-1 text-sm text-mist">
        Company No:{office.registration ? ` ${office.registration}` : ""}
      </p>

      <h2 className="mt-10 text-base font-semibold">Address:</h2>
      <div className="mt-4 space-y-8">
        {office.places.map((place) => (
          <address key={place.name} className="not-italic">
            <p className="font-semibold">{place.name}</p>
            <p className="mt-2 leading-7 text-paper/90">
              {place.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <OfficeMap
              name={place.name}
              lat={place.lat}
              lon={place.lon}
              featured={place.name === "Malaysian Office 1"}
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.map)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-ice hover:underline"
            >
              Open in Google Maps
            </a>
          </address>
        ))}
      </div>

      {showContact && (
        <>
          <h2 className="mt-10 text-base font-semibold">Tel:</h2>
          <a href={company.phoneHref} className="mt-2 block text-paper/90">
            {company.phoneDisplay}
          </a>
          <h2 className="mt-8 text-base font-semibold">Email:</h2>
          <a href={`mailto:${company.email}`} className="mt-2 block text-ice hover:underline">
            {company.email}
          </a>
        </>
      )}
    </div>
  );
}
