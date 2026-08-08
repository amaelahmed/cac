"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { 
  GraduationCap, ScrollText, Sparkles, Briefcase, 
  MessageCircleQuestion, AlertTriangle, Search, 
  Bot, PlayCircle, Coffee, Presentation, Mic, Skull 
} from "lucide-react";

const scenes = [
  {
    icon: GraduationCap,
    title: "Complete Marketing Course",
    text: "You finally understand funnels.\nUnfortunately, not clients."
  },
  {
    icon: ScrollText,
    title: "Get Certificate",
    text: "Congratulations. Your parents are proud.\nYou now have a certificate and absolutely no idea what to do next."
  },
  {
    icon: Sparkles,
    title: "Feel unstoppable for 48 hours and LinkedIn updation",
    text: "\"Growth Strategist | Brand Consultant | Marketing Expert\"\nYou've never had a client."
  },
  {
    icon: Briefcase,
    title: "First Client Meeting",
    text: "The meeting starts.\nConfidence leaves the body."
  },
  {
    icon: MessageCircleQuestion,
    title: "Client Asks",
    text: "The inevitable question.\n\"So what's the strategy?\""
  },
  {
    icon: AlertTriangle,
    title: "Panic",
    text: "Fight or flight response triggered.\nThinking about leaving the city after the question."
  },
  {
    icon: Search,
    title: "Open 47 Chrome Tabs",
    text: "Marketing strategy template.\nMarketing strategy PDF.\nMarketing strategy example.\nMarketing strategy please save me."
  },
  {
    icon: Bot,
    title: "Asking ChatGPT",
    text: "\"Bro give me the stratergy\"\nChatGPT: \"Leverage synergy across channels.\"\nFeels betrayed by an AI.\nFuck you GPT"
  },
  {
    icon: PlayCircle,
    title: "Watch 12 Marketing Gurus",
    text: "One is 19.\nOne rents Lamborghinis.\nOne sells a course on selling courses."
  },
  {
    icon: Coffee,
    title: "It's 3:17 AM.",
    text: "Staring blankly at the screen.\nThe deck is still terrible."
  },
  {
    icon: Presentation,
    title: "Make Slides",
    text: "If the data is bad, make it spin.\nReplace substance with animations."
  },
  {
    icon: Mic,
    title: "Present Anyway",
    text: "Fake it till you make it.\nMaybe confidence is a strategy."
  },
  {
    icon: Skull,
    title: "Reality Arrives",
    text: "Client:\n\"Cool. What exactly are we posting on Tuesday?\""
  }
];

export function Chapter3Career() {
  const targetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollRange, setScrollRange] = useState(0);
  
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
    restDelta: 0.001
  });

  // Calculate the required horizontal translation distance dynamically based on actual content width
  
  useEffect(() => {
    const updateScrollRange = () => {
      if (trackRef.current) {
        const scrollWidth = trackRef.current.scrollWidth;
        const clientWidth = window.innerWidth;
        // Add a little padding to the end so the last card isn't flush with the screen edge
        setScrollRange(scrollWidth - clientWidth + 100);
      }
    };

    updateScrollRange();
    window.addEventListener("resize", updateScrollRange);
    return () => window.removeEventListener("resize", updateScrollRange);
  }, []);

  const x = useTransform(smoothProgress, [0, 1], [0, -scrollRange]);

  return (
    <section ref={targetRef} className="h-[400vh] bg-white dark:bg-[#020202] border-y border-black/5 dark:border-white/5 relative transition-colors duration-300">
      <div className="sticky top-0 min-h-screen overflow-x-hidden flex flex-col justify-center py-24 md:py-0">
        
        {/* Intro Block */}
        <div className="md:absolute top-12 left-6 md:left-12 lg:left-24 z-10 max-w-sm mb-12 md:mb-0 px-6 md:px-0">
          <h2 className="text-2xl md:text-3xl font-display font-medium text-black dark:text-white drop-shadow-xl mb-4">
            The Average <span className="bg-[var(--color-brand-accent)] text-black px-2 py-0.5 mx-1 inline-block">Marketing</span> Career
          </h2>
          <div className="text-sm md:text-base text-black/60 dark:text-white/50 font-light leading-relaxed whitespace-pre-line">
            Most marketing advice sounds like:<br/>
            "Leverage synergy to maximize engagement."<br/><br/>
            Nobody knows what that means.<br/>
            Not even the people saying it.
          </div>
        </div>

        {/* Seamless Comic Strip Track */}
        <motion.div 
          ref={trackRef}
          style={{ x }} 
          className="flex gap-12 md:gap-20 px-6 md:px-12 lg:px-24 items-start md:mt-24 w-max"
        >
          {scenes.map((scene, i) => {
            const Icon = scene.icon;
            return (
              <div 
                key={i} 
                className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0 flex flex-col items-start text-left space-y-4"
              >
                <div className="text-black/40 dark:text-white/40 mb-2">
                  <Icon className="w-6 h-6 md:w-8 md:h-8" strokeWidth={1.5} />
                </div>
                
                <h3 className="text-xl md:text-2xl font-display font-medium text-black dark:text-white tracking-tight leading-snug">
                  {scene.title}
                </h3>
                
                <div className="text-base md:text-lg text-black/70 dark:text-white/70 font-light leading-relaxed whitespace-pre-wrap font-sans">
                  {scene.text}
                </div>
              </div>
            );
          })}
        </motion.div>
        
      </div>
    </section>
  );
}
