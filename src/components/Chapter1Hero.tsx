"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const LABELS = [
  "Strategy", "Consulting", "Meetings", "Workshops", 
  "Research", "Reports", "Presentations", "Retainers"
];

const LABEL_ROTATIONS = [-12, 9, -5, 14, -10, 6, -14, 11];

type Phase = 'grid' | 'stack' | 'compress' | 'done';

export function Chapter1Hero() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const [phase, setPhase] = useState<Phase>('grid');
  const [cost, setCost] = useState("0");

  useEffect(() => {
    // 80K counting animation
    const costs = ["500", "2,000", "7,500", "15,000", "35,000", "50,000", "80K"];
    let countIndex = 0;
    const countInterval = setInterval(() => {
      setCost(costs[countIndex]);
      countIndex++;
      if (countIndex >= costs.length) {
        clearInterval(countInterval);
      }
    }, 120);

    // 1.0s: Grid appearance/stacking begins
    const t1 = setTimeout(() => setPhase('stack'), 1000); 
    const t2 = setTimeout(() => setPhase('compress'), 1400);
    const t3 = setTimeout(() => setPhase('done'), 1700);

    return () => { 
      clearInterval(countInterval);
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3); 
    };
  }, []);

  const isStacked = phase === 'stack' || phase === 'compress';

  return (
    <section className="pt-32 pb-16 flex flex-col justify-center bg-white dark:bg-[#050505] px-6 sm:px-12 md:px-24 transition-colors duration-300 min-h-[90vh]">
      <div className="max-w-[1400px] w-full mx-auto">
        
        {/* Pre-headline tag */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] w-8 bg-[#ff3300]/40" />
          <span className="text-[#ff3300] font-mono text-xs md:text-sm font-bold tracking-widest uppercase">
            Your 24/7 AI-Powered Agency
          </span>
          <div className="h-[1px] w-8 bg-[#ff3300]/40" />
        </div>

        <h1 className="text-6xl md:text-8xl lg:text-[130px] font-display font-bold tracking-tighter leading-[0.95] text-black dark:text-white">
          <div className="flex flex-wrap items-baseline gap-x-4 md:gap-x-6 lg:gap-x-8">
            <span className="bg-[#ff3300] text-black px-2 py-0.5 md:px-4 md:py-1">
              Everything
            </span>
            <span>agencies</span>
          </div>
          
          <div className="mt-2 md:mt-4">
            charge <motion.span 
              animate={cost === "80K" ? { x: [-2, 2, -2, 2, 0] } : {}} 
              transition={{ duration: 0.4 }} 
              className="inline-block"
            >
              ₹{cost}
            </motion.span> for.
          </div>
          
          {/* Animation Block Perfectly Slotted */}
          <div className="relative mt-2 md:mt-4 min-h-[140px] md:min-h-[260px]">
            <AnimatePresence mode="popLayout">
              {(phase === 'grid' || phase === 'stack') && (
                <motion.div 
                  key="labels"
                  className={`w-full max-w-4xl pt-4 ${isStacked ? 'relative flex justify-start items-center h-[120px] ml-12' : 'flex flex-wrap justify-start gap-2 md:gap-4'}`}
                  exit={{ scale: 0, opacity: 0, filter: "blur(10px)", transition: { duration: 0.3, ease: "anticipate" } }}
                >
                  {LABELS.map((label, i) => (
                    <motion.div
                      layout
                      key={label}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        y: 0,
                        rotate: isStacked ? LABEL_ROTATIONS[i] : 0
                      }}
                      transition={{ 
                        layout: { duration: 0.4, type: "spring", bounce: 0.2 },
                        opacity: { delay: phase === 'grid' ? i * 0.05 : 0 }
                      }}
                      className={`${isStacked ? 'absolute' : 'relative'} px-4 py-2 md:px-6 md:py-3 bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-lg text-base md:text-2xl font-mono whitespace-nowrap text-black/80 dark:text-white/80 shadow-sm z-10 origin-center`}
                    >
                      {label}
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {phase === 'done' && (
                <motion.div
                  key="headline"
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                  className="text-[#ff3300]"
                >
                  Compressed into one<br/>website.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'done' ? 1 : 0 }}
          transition={{ duration: 0.8, ease }}
          className="mt-8 md:mt-12 max-w-3xl"
        >
          <p className="text-lg md:text-xl text-black/60 dark:text-white/50 font-light leading-relaxed">
            Your competitors hired an agency. You opened a website.<br className="hidden md:block"/>
            Let&apos;s see who wins.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
