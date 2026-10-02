"use client";

import { FormEvent, useState } from "react";
import { company } from "@/lib/content";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const first = String(data.get("first") || "").trim();
    const last = String(data.get("last") || "").trim();
    const email = String(data.get("email") || "").trim();
    const comment = String(data.get("comment") || "").trim();
    const subject = `Message from ${first} ${last}`;
    const body = `Name: ${first} ${last}\nEmail: ${email}\n\n${comment}`;
    window.location.href = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-ink-2 p-6 md:p-8">
      <h2 className="display text-3xl">Please drop us a message</h2>
      <p className="mt-2 text-sm text-mist">* Indicates required field</p>
      <fieldset className="mt-8">
        <legend className="text-sm text-paper">
          Name <span className="text-signal">*</span>
        </legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-mist">
            First
            <input
              required
              name="first"
              autoComplete="given-name"
              className="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice"
            />
          </label>
          <label className="block text-sm text-mist">
            Last
            <input
              required
              name="last"
              autoComplete="family-name"
              className="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice"
            />
          </label>
        </div>
      </fieldset>
      <label className="mt-5 block text-sm text-mist">
        Email <span className="text-signal">*</span>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice"
        />
      </label>
      <label className="mt-5 block text-sm text-mist">
        Comment <span className="text-signal">*</span>
        <textarea
          required
          name="comment"
          rows={6}
          className="mt-2 w-full resize-y rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice"
        />
      </label>
      <button
        type="submit"
        className="mt-6 rounded-full bg-signal px-6 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-ink"
      >
        Submit
      </button>
      {sent && (
        <p className="mt-4 text-sm text-ice">
          Your email app should open with this message addressed to {company.email}.
        </p>
      )}
    </form>
  );
}
