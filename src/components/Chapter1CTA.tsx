"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function Chapter1CTA() {
  return (
    <section className="py-12 bg-white dark:bg-[#050505] px-6 sm:px-12 md:px-24 flex flex-col items-center justify-center text-center transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-black dark:text-white mb-4">
          Got a client? Feeling confused? No worries.
        </h2>
        
        <p className="text-lg md:text-xl text-black/60 dark:text-white/60 mb-8 font-light">
          CAC handles everything. from strategy and research to execution-ready plans. Just type the details, and we'll do the heavy lifting. You simply deliver the results.
        </p>

        <div className="flex flex-col items-center gap-4">
          <span className="text-sm font-mono tracking-widest uppercase text-black/40 dark:text-white/40">
            Feeling lucky?
          </span>
          <div className="flex flex-col items-center gap-2">
            <Link 
              href="/details"
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#ff3300] text-black rounded-sm font-bold transition-all duration-300 hover:scale-[1.04] hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(255,51,0,0.4)] hover:brightness-110 active:scale-95 active:translate-y-0 cursor-pointer text-lg"
            >
              Start Building 
              <span className="transition-transform duration-300 group-hover:translate-x-2">&rarr;</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
