import type { Metadata } from "next";
import { Collection } from "@/components/store/Collection";

export const metadata: Metadata = { title: "STORE" };

export default function StorePage() {
  return <Collection />;
}
