import type { Metadata } from "next";
import { StoreAdminGate } from "@/components/StoreAdminGate";

export const metadata: Metadata = {
  title: "STORE ADMIN",
  robots: { index: false, follow: false },
};

export default function StoreAdminPage() {
  return <StoreAdminGate />;
}
