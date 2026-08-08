"use client";

import { motion } from "framer-motion";
import { 
  CalendarDays, Target, TriangleAlert, Search, Lightbulb, 
  SquarePen, Hash, BarChart3, BrainCircuit, Flame, FileText, Flag 
} from "lucide-react";

const deliverables = [
  { icon: CalendarDays, title: "30 Day Content Calendar" },
  { icon: Target, title: "Step-by-Step Strategy" },
  { icon: TriangleAlert, title: "Customer Pain Points" },
  { icon: Search, title: "Competitor Analysis" },
  { icon: Lightbulb, title: "Growth Opportunities" },
  { icon: SquarePen, title: "Caption Bank" },
  { icon: Hash, title: "Hashtag Generator" },
  { icon: BarChart3, title: "ROI Calculator" },
  { icon: BrainCircuit, title: "Consumer Psychology" },
  { icon: Flame, title: "Website Roast" },
  { icon: FileText, title: "Exportable Reports" },
  { 
    icon: Flag, 
    title: (
      <span className="block leading-snug">
        <strong className="block font-semibold">VERIFIED RESULTS</strong>
        <span className="block font-normal opacity-75">No courses · No consultations · Just results.</span>
      </span>
    )
  }
];

export function Chapter1bDeliverables() {
  return (
    <section className="py-24 bg-white dark:bg-[#020202] border-t border-black/5 dark:border-white/5 px-6 sm:px-12 md:px-24 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <div className="text-[var(--color-brand-accent)] font-medium tracking-widest text-xs uppercase mb-4">What You Actually Get</div>
          <h2 className="text-3xl md:text-5xl font-display font-medium text-black dark:text-white mb-4">The Output Array.</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-sm overflow-hidden">
          {deliverables.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-[#050505] hover:bg-gray-50 dark:hover:bg-[#0A0A0A] p-6 lg:p-8 transition-colors group"
            >
              <div className="mb-6 transition-colors duration-300 text-black/70 dark:text-white/70 group-hover:text-[var(--color-brand-accent)]">
                <item.icon size={22} strokeWidth={1.5} />
              </div>
              <div className="text-black/80 dark:text-white/80 font-medium text-sm md:text-base group-hover:text-[var(--color-brand-accent)] transition-colors">{item.title}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
