import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Chapter1Hero } from "@/components/Chapter1Hero";
import { Chapter1CTA } from "@/components/Chapter1CTA";
import { Chapter1bDeliverables } from "@/components/Chapter1bDeliverables";
import { Chapter2Roast } from "@/components/Chapter2Roast";
import { Chapter3Career } from "@/components/Chapter3Career";
import { Chapter4Engine } from "@/components/Chapter4Engine";
import { Chapter5Targets } from "@/components/Chapter5Targets";
import { Chapter6CTA } from "@/components/Chapter6CTA";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Cancel Agency Culture",
  alternateName: "CAC",
  url: "https://cancelagencyculture.in/",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "A web application that creates practical marketing plans for businesses.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free during beta",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <main id="main-content" className="flex min-h-screen flex-col bg-[#020202] text-white font-sans selection:bg-[var(--color-brand-accent)] selection:text-black">
        <Chapter1Hero />
        <Chapter1CTA />
        <Chapter1bDeliverables />
        <Chapter2Roast />
        <Chapter3Career />
        <Chapter4Engine />
        <Chapter5Targets />
        <Chapter6CTA />
      </main>
      <Footer />
    </>
  );
}
