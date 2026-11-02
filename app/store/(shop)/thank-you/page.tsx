import type { Metadata } from "next";
import { ThankYou } from "@/components/store/ThankYou";

export const metadata: Metadata = { title: "THANK YOU" };

export default function ThankYouPage() {
  return <ThankYou />;
}
