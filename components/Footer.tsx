import Link from "next/link";
import { company, nav, offices } from "@/lib/content";
import { asset } from "@/lib/paths";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src={asset("/media/logo.png")} alt="" className="mb-5 h-6 w-auto" />
          <p className="max-w-sm text-sm leading-6 text-mist">
            {company.descriptor}. {company.tagline}.
          </p>
        </div>
        <div>
          <p className="kicker mb-4 text-[11px] text-mist">Visit</p>
          <ul className="space-y-2 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-paper/90 hover:text-ice">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="kicker mb-4 text-[11px] text-mist">Contact</p>
          <ul className="space-y-3 text-sm leading-6 text-paper/90">
            {offices.flatMap((office) =>
              office.places.map((place) => (
                <li key={place.name}>
                  <span className="block">{place.name}</span>
                  <span className="block text-mist">{place.lines.at(-1)}</span>
                </li>
              )),
            )}
          </ul>
          <a href={`mailto:${company.email}`} className="mt-3 block text-sm text-ice hover:underline">
            {company.email}
          </a>
          <a href={company.phoneHref} className="mt-1 block text-sm text-paper/90">
            {company.phoneDisplay}
          </a>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-5 text-right text-xs text-mist">
          {company.name} (TM) — All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
