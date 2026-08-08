"use client";

import { motion } from "framer-motion";

const targets = [
  { title: "Freelancers", desc: "Stop starting every project from a blank Google Doc." },
  { title: "Agency Project Managers", desc: "Reduce meetings. Increase lifespan." },
  { title: "Business Owners", desc: "Discover what's broken before paying someone ₹80,000 to tell you." },
  { title: "Marketing Students", desc: "Turn assignments into something that looks employable." },
];

export function Chapter5Targets() {
  return (
    <section className="py-16 bg-white dark:bg-[#020202] border-t border-black/5 dark:border-white/5 px-6 sm:px-12 md:px-24 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-display font-medium text-black dark:text-white mb-2 tracking-tight">
            Who Needs <span className="bg-[var(--color-brand-accent)] text-black px-2 py-0.5 mx-1 inline-block">CAC?</span>
          </h2>
          <p className="text-base text-black/60 dark:text-white/50 font-light">
            Engineered for professionals who value time over meaningless deliverables.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-px bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-sm overflow-hidden">
          {targets.map((target, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-[#050505] p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-[#0A0A0A] transition-colors"
            >
              <h3 className="text-lg font-display font-medium text-black dark:text-white mb-2">{target.title}</h3>
              <p className="text-black/60 dark:text-white/50 font-light text-sm">{target.desc}</p>
            </motion.div>
          ))}
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-gray-50 dark:bg-[#080808] p-6 md:p-8 hover:bg-gray-100 dark:hover:bg-[#0A0A0A] transition-colors border-t border-black/10 dark:border-white/10"
          >
            <div className="text-[var(--color-brand-accent)] font-mono text-xs mb-3">Our Largest Customer Segment</div>
            <h3 className="text-xl md:text-2xl font-display font-medium text-black dark:text-white mb-4">People Pretending To Know Marketing</h3>
            <ul className="space-y-2 text-black/60 dark:text-white/50 font-light text-sm">
              <li>• People who have said: <span className="text-black dark:text-white italic">"Yeah yeah, I've got the strategy."</span> without actually having the strategy.</li>
              <li>• People who opened Canva and hoped inspiration would arrive.</li>
              <li>• People who have confidently used the phrase: <span className="text-black dark:text-white italic">"Let's circle back."</span> while having no idea what happens next.</li>
              <li>• People who have called a brainstorm meeting because they forgot the deadline.</li>
              <li>• People who believe changing the button color is a growth strategy.</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
