"use client";

import { motion } from "framer-motion";
import { 
  Building2, BrainCircuit, TriangleAlert, Search, Sparkles, 
  CalendarDays, Target, FolderArchive, Flag 
} from "lucide-react";

const scenes = [
  {
    icon: Building2,
    title: "Your Business",
    text: "What do you sell?\n\nWho buys it?\n\nWhat do you want more of?\n\nSales?\nLeads?\nCustomers?\nWorld domination?\n\nThat's all CAC needs."
  },
  {
    icon: BrainCircuit,
    title: "CAC Researches",
    text: "Competitors.\nMarket.\nCustomers.\nOpportunities.\n\n(The legal kind.)"
  },
  {
    icon: TriangleAlert,
    title: "Pain Points Found",
    text: "What annoys customers?\nWhat makes them buy?\nWhat makes them leave?\n\nCAC figures it out."
  },
  {
    icon: Search,
    title: "Competitor Investigation",
    text: "Strengths.\nWeaknesses.\nPositioning.\nMissed opportunities.\n\nEverything."
  },
  {
    icon: Sparkles,
    title: "Opportunities Found",
    text: "Not:\n\"Post consistently.\"\n\nNot:\n\"Be authentic.\"\n\nActual growth opportunities."
  },
  {
    icon: CalendarDays,
    title: "Content Calendar",
    text: "No blank Notion page.\nNo panic.\nNo \"What do we post tomorrow?\"\n\nDone."
  },
  {
    icon: Target,
    title: "Strategy Generated",
    text: "Clear.\nActionable.\nClient-ready.\n\nNo buzzword soup."
  },
  {
    icon: FolderArchive,
    title: "Everything Packaged",
    text: "Reports.\nInsights.\nContent.\nStrategy.\n\nReady to export."
  },
  {
    icon: Flag,
    title: "THE OUTCOME.",
    text: (
      <>
        <span className="block mb-4">Get paid.</span>
        <span className="block mb-4">Or save agency fees.</span>
        <span className="block">Either way, you win.</span>
      </>
    )
  }
];

export function Chapter4Engine() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-[#020202] border-t border-black/5 dark:border-white/5 px-6 sm:px-12 md:px-24 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-[var(--color-brand-accent)] font-mono tracking-widest text-xs uppercase mb-4">
            The Anti-Agency Engine
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-medium text-black dark:text-white tracking-tight leading-tight">
            What Actually Happens<br/>After You Click <span className="bg-[var(--color-brand-accent)] text-black px-2 py-0.5 mx-1 inline-block">"Start"</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-sm overflow-hidden">
          {scenes.map((scene, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-[#050505] p-8 hover:bg-gray-50 dark:hover:bg-[#0A0A0A] transition-colors group"
            >
              <div className="mb-4 transition-colors duration-300 text-black/70 dark:text-white/70 group-hover:text-[var(--color-brand-accent)]">
                <scene.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-display font-medium text-black dark:text-white mb-4">{scene.title}</h3>
              <div className="text-sm text-black/60 dark:text-white/50 font-light leading-relaxed whitespace-pre-line">
                {scene.text}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Final Output Kicker */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 pt-16 border-t border-black/5 dark:border-white/5 text-center"
        >
          <div className="text-xl md:text-2xl font-medium text-black dark:text-white">
            Everything agencies charge ₹80,000 for. <span className="text-[var(--color-brand-accent)]">Generated in minutes.</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
