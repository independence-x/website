"use client";

import dynamic from "next/dynamic";

const StoreAdmin = dynamic(() => import("@/components/StoreAdmin").then((mod) => mod.StoreAdmin), {
  ssr: false,
  loading: () => <p className="px-5 py-16 text-mist">Loading admin…</p>,
});

export function StoreAdminGate() {
  return <StoreAdmin />;
}
