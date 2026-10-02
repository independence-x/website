"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav } from "@/lib/content";
import { asset } from "@/lib/paths";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <img
            src={asset("/media/logo.png")}
            alt="Independence-X Aerospace"
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-[13px] tracking-wide transition ${
                  active
                    ? "bg-white text-ink"
                    : "text-mist hover:text-paper"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex w-4 flex-col gap-1.5">
            <span className={`h-px bg-paper transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
            <span className={`h-px bg-paper transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-ink px-5 py-4 lg:hidden">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block py-3 text-lg ${
                    pathname === item.href ? "text-paper" : "text-mist"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
