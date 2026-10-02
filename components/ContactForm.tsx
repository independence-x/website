"use client";

import { FormEvent, useState } from "react";
import { company } from "@/lib/content";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("_honey") || "").trim()) return;

    const first = String(data.get("first") || "").trim();
    const last = String(data.get("last") || "").trim();
    const email = String(data.get("email") || "").trim();
    const comment = String(data.get("comment") || "").trim();

    setStatus("sending");
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${company.email}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: `${first} ${last}`,
          email,
          message: comment,
          _subject: `Website message from ${first} ${last}`,
          _template: "table",
          _captcha: "false",
          _honey: "",
        }),
      });
      const result = (await response.json()) as { success?: string | boolean };
      if (!response.ok || (result.success !== "true" && result.success !== true)) {
        setStatus("error");
        return;
      }
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-ink-2 p-6 md:p-8">
      <h2 className="display text-3xl">Please drop us a message</h2>
      <p className="mt-2 text-sm text-mist">* Indicates required field</p>
      <input
        type="text"
        name="_honey"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <fieldset className="mt-8" disabled={status === "sending"}>
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
              className="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice disabled:opacity-60"
            />
          </label>
          <label className="block text-sm text-mist">
            Last
            <input
              required
              name="last"
              autoComplete="family-name"
              className="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice disabled:opacity-60"
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
          disabled={status === "sending"}
          className="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice disabled:opacity-60"
        />
      </label>
      <label className="mt-5 block text-sm text-mist">
        Comment <span className="text-signal">*</span>
        <textarea
          required
          name="comment"
          rows={6}
          disabled={status === "sending"}
          className="mt-2 w-full resize-y rounded-xl border border-line bg-ink px-3 py-3 text-paper outline-none focus:border-ice disabled:opacity-60"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 rounded-full bg-signal px-6 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-ink disabled:cursor-wait disabled:opacity-70"
      >
        {status === "sending" ? "Sending…" : "Submit"}
      </button>
      <p className="mt-4 min-h-5 text-sm" aria-live="polite">
        {status === "sent" && (
          <span className="text-ice">Your message was sent to {company.email}.</span>
        )}
        {status === "error" && (
          <span className="text-signal">
            The message could not be sent. Please email {company.email} directly.
          </span>
        )}
      </p>
    </form>
  );
}
