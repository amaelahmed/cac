import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-8 border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#020202] px-6 sm:px-12 md:px-24 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-6 text-lg md:text-xl text-black/60 dark:text-white/50 font-light mb-16 leading-relaxed">
          <div className="py-4 flex flex-wrap gap-x-4 gap-y-2 justify-start items-center">
            <span>Got feedback?</span>
            <span className="text-[var(--color-brand-accent)]/50">•</span>
            <span>Found a bug?</span>
            <span className="text-[var(--color-brand-accent)]/50">•</span>
            <span>Need a feature?</span>
            <span className="text-[var(--color-brand-accent)]/50">•</span>
            <span>Want to complain about marketing?</span>
            <span className="text-[var(--color-brand-accent)]/50">•</span>
            <span>Want to complain about life?</span>
          </div>
          
          <p className="font-mono text-sm md:text-base">
            <Mail className="inline w-4 h-4 mr-2 text-[var(--color-brand-accent)]" /> <a href="mailto:founder@cancelagencyculture.in" className="text-[var(--color-brand-accent)] hover:underline">founder@cancelagencyculture.in</a>
          </p>
          
          <div className="py-4">
            The founder reads every email personally.<br/>
            Usually within 24 hours.
          </div>
        </div>
        
        <div className="border-t border-black/10 dark:border-white/10 pt-8 mt-16 text-sm text-black/40 dark:text-white/30 font-mono flex flex-col md:flex-row justify-between items-center gap-4">
          <div>Cancel Agency Culture © {new Date().getFullYear()}</div>
          <div className="flex gap-6">
            <a href="/legal" className="hover:text-black dark:hover:text-white transition-colors">The Boring (But Important) Stuff</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
