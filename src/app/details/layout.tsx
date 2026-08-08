import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Build your marketing plan",
  description: "Describe your business and build a practical CAC marketing plan.",
  alternates: { canonical: "/details/" },
};

export default function DetailsLayout({ children }: { children: ReactNode }) {
  return children;
}
