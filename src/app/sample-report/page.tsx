import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Sample marketing plan",
  description: "View a generated CAC sample marketing plan before signing in.",
  alternates: { canonical: "/sample-report/" },
};

export default function SampleReportPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="cac-page">
        <div className="cac-shell">
          <header className="max-w-3xl">
            <p className="cac-kicker">Sample report</p>
            <h1 className="cac-page-title mt-3">A complete CAC-generated plan.</h1>
            <p className="cac-lede mt-5">
              This is an example report generated for Cartroid, a synthetic pre-launch custom-gifts business in Kozhikode. It demonstrates CAC’s output; it is not a claim of customer business results.
            </p>
            <Link href="/details/" className="cac-button-primary mt-7 px-6 py-3.5 text-base">
              Build my plan
            </Link>
          </header>

          <div className="cac-panel mt-10 overflow-hidden">
            <Image
              src="/sample-report-cartroid.png"
              alt="Generated Cartroid sample marketing plan"
              width={1440}
              height={7004}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
