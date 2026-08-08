"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function Chapter6CTA() {
  return (
    <section className="py-16 bg-gray-50 dark:bg-[#050505] border-t border-black/5 dark:border-white/5 px-6 sm:px-12 md:px-24 flex flex-col items-center justify-center text-center transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl"
      >
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-display font-medium text-black dark:text-white mb-10 tracking-tight leading-tight">
          <span className="relative inline-block mb-2 md:mb-4">
            <span className="relative z-10 line-through decoration-orange-500 decoration-[4px] md:decoration-[8px] text-black/60 dark:text-white/60">Your marketing degree got you here.</span>
          </span>
          <br />
          Let <span className="bg-[var(--color-brand-accent)] text-black px-2 py-0.5 mx-1 inline-block">CAC</span> get you through the clients.
        </h2>
        
        <p className="text-xl md:text-2xl text-black/60 dark:text-white/50 font-light mb-16">
          <span className="line-through decoration-orange-500 decoration-2 md:decoration-4 mr-2">Stop Googling marketing strategies.</span>
          <br className="sm:hidden" />
          <span className="text-black/90 dark:text-white/90 font-medium">Start delivering them.</span>
        </p>

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              href="/details" 
              className="group flex items-center justify-center gap-2 px-10 py-5 bg-[var(--color-brand-accent)] text-black rounded-sm font-bold transition-all duration-300 hover:scale-[1.04] hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(255,51,0,0.4)] hover:brightness-110 active:scale-95 active:translate-y-0 cursor-pointer text-lg"
            >
              Start Building Strategy 
              <span className="transition-transform duration-300 group-hover:translate-x-2">&rarr;</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
