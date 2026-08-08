import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Legal and privacy",
  description:
    "Terms, privacy, AI use, and planned pricing for Cancel Agency Culture.",
  alternates: { canonical: "/legal/" },
};

export default function LegalPage() {
  const sections = [
    { id: "founders-flex", title: "Founder’s Flex" },
    { id: "terms", title: "Terms & Conditions" },
    { id: "privacy", title: "Privacy Policy" },
    { id: "refunds", title: "Refund & Cancellation Policy" },
    { id: "ai", title: "AI & Knowledge Engine Disclosure" },
    { id: "acceptable-use", title: "Acceptable Use Policy" },
    { id: "cookies", title: "Cookie Policy" },
    { id: "disclaimer", title: "Disclaimer" },
  ];

  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="flex min-h-screen flex-col bg-white dark:bg-[#020202] text-black dark:text-white font-sans transition-colors duration-300"
      >
        <div className="pt-32 pb-24 px-6 sm:px-12 md:px-24 max-w-7xl mx-auto w-full">
          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter mb-4">
              The Boring (But Important) Stuff
            </h1>
            <p className="text-xl text-black/50 dark:text-white/50 font-light max-w-2xl">
              We hate reading these too, but the lawyers said we have to have them. Here are the rules of the road for Cancel Agency Culture.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
            {/* Sidebar Navigation */}
            <aside className="md:w-64 shrink-0">
              <div className="sticky top-24">
                <nav className="flex flex-col gap-3" aria-label="Legal sections">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="text-black/60 dark:text-white/60 hover:text-[var(--color-brand-accent)] dark:hover:text-[var(--color-brand-accent)] transition-colors text-sm font-medium"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="flex-1 space-y-20 max-w-3xl">
              <section id="founders-flex" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Founder’s Flex</h2>
                <div className="space-y-5 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    CAC was supposed to be open-source.
                  </p>
                  <p>
                    Then we remembered being the good guy is cute, not profitable.
                  </p>
                  <p>
                    also, open-sourcing an intelligence engine like this felt illegal.
                  </p>
                  <div className="border-t border-black/10 dark:border-white/10 my-8" />
                  <p>
                    CAC turns messy business details into strategy, content direction, customer psychology, competitor insights, and growth moves.
                  </p>
                  <p>
                    Built for founders and business owners who want agency-level thinking without fuzz.
                  </p>
                  <p className="font-mono text-sm">
                    <a
                      href="https://www.instagram.com/cancelagencyculture/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-brand-accent)] hover:underline"
                    >
                      @cancelagencyculture
                    </a>
                  </p>
                </div>
              </section>

              <section id="terms" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Terms &amp; Conditions</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    By using Cancel Agency Culture, also known as CAC, you agree to these terms. We keep them simple because nobody likes reading legal jargon disguised as a personality test.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Pricing</h3>
                  <div className="space-y-4 text-black dark:text-white">
                    <p className="font-semibold">₹799 every 31 days.</p>
                    <p className="font-semibold">yes thats true.we ain&apos;t do the 30 days rule here.</p>
                    <p>Imagine a software that literally solves today&apos;s biggest marketing issues and cost less than a weeks Zomato orders!</p>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">User Responsibilities</h3>
                  <p>
                    We&apos;ll give you the strategy. We can&apos;t promise the internet will suddenly fall in love with your business. You are responsible for how you implement the strategies we provide.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Account Suspension</h3>
                  <p>
                    We reserve the right to suspend or terminate accounts that abuse our systems, attempt to reverse-engineer our engine, or violate our acceptable use policy. Play nice.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Age &amp; Eligibility</h3>
                  <p>
                    Anyone may browse CAC, but if you purchase a subscription or create an account, you must be legally permitted to do so under the laws that apply to you. If your local laws require parental or guardian consent, that consent is your responsibility.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Intellectual Property &amp; Liability</h3>
                  <p>
                    The strategies generated for your business are yours to use. However, the CAC platform, engine, and code belong to us. Our liability is limited to the amount you paid us in the last 31 days.
                  </p>
                  
                  <p className="mt-8 pt-4 border-t border-black/10 dark:border-white/10 text-sm">
                    Questions? Email us at <a href="mailto:founder@cancelagencyculture.in" className="text-[var(--color-brand-accent)] hover:underline">founder@cancelagencyculture.in</a>
                  </p>
                </div>
              </section>

              <section id="privacy" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Privacy Policy</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    We collect only what we need to give you a great marketing strategy. We don&apos;t sell your data, and we don&apos;t spy on you.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">What We Collect &amp; Why</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Authentication:</strong> Your email and basic profile info to create and secure your account.</li>
                    <li><strong>Business Information:</strong> The details you provide about your business (industry, audience, budget) are used strictly to generate your strategy.</li>
                    <li><strong>Analytics:</strong> Anonymous usage data to help us understand which features are working and which ones suck.</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Data Retention &amp; Deletion</h3>
                  <p>
                    We keep your business data as long as your account is active so you can access your strategies. You can request account deletion at any time, and we will wipe your data from our active databases.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Security &amp; Your Rights</h3>
                  <p>
                    Your data is secured using industry-standard encryption. You have the right to access, correct, or delete your personal data. Just email us and we&apos;ll sort it out.
                  </p>
                </div>
              </section>

              <section id="refunds" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Refund &amp; Cancellation Policy</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    We want you to be happy with CAC. If you&apos;re not, let&apos;s make it right.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Subscription &amp; Renewal</h3>
                  <p>
                    During beta testing, access is free. When billing is enabled, the planned subscription is ₹799 every 31 days and renews automatically unless you cancel it before the renewal date.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Cancellation</h3>
                  <p>
                    You can cancel your subscription at any time from your account settings. Once cancelled, you will retain access to your account until the end of your current 31-day billing cycle.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-black dark:text-white mt-8 mb-2">Refunds</h3>
                  <p>
                    If our system completely fails to generate a strategy for you due to a technical error on our end, we&apos;ll refund your most recent payment. We do not offer refunds simply because you didn&apos;t like or didn&apos;t implement the strategy. Our engine does the work; the execution is up to you.
                  </p>
                </div>
              </section>

              <section id="ai" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">AI &amp; Knowledge Engine Disclosure</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    CAC combines curated marketing knowledge with AI-assisted personalization.
                  </p>
                  <p>
                    Our recommendations are designed to help you make better decisions, not replace your own judgement. 
                  </p>
                  <p>
                    While our Knowledge Engine is trained on proven marketing principles and real-world data, AI can occasionally hallucinate or provide generic advice. Users should apply their own business judgement before acting on any generated strategy or spending money on ad campaigns based on our recommendations.
                  </p>
                </div>
              </section>

              <section id="acceptable-use" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Acceptable Use Policy</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    We built CAC to help founders. Don&apos;t use it to do bad things.
                  </p>
                  <p>
                    You agree not to use our platform to generate strategies for illegal businesses, hate groups, scams, or anything that causes harm to others.
                  </p>
                  <p>
                    You also agree not to scrape our database, reverse-engineer our Knowledge Engine, or resell our generated strategies as an agency without telling your clients (though honestly, we can&apos;t really stop you from taking credit for the good ideas).
                  </p>
                </div>
              </section>

              <section id="cookies" className="scroll-mt-32">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Cookie Policy</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    We use cookies to keep you logged in and to understand how you use our site. We don&apos;t use them to track you across the internet or sell your browsing history to advertisers.
                  </p>
                  <p>
                    If you disable cookies in your browser, some parts of CAC (like logging in) might not work properly.
                  </p>
                </div>
              </section>

              <section id="disclaimer" className="scroll-mt-32 pb-24">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Disclaimer</h2>
                <div className="space-y-4 text-black/70 dark:text-white/70 leading-relaxed font-light">
                  <p>
                    Great marketing should be accessible. We respect great agencies, but we believe every business deserves high-quality marketing guidance without necessarily paying massive retainers.
                  </p>
                  <p>
                    However, marketing is not magic. The strategies we provide are educational and advisory. We make no guarantees about revenue, traffic, or business growth. Your success depends entirely on your execution, market conditions, and the actual quality of your product or service.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
