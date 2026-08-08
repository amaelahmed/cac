"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Terminal, Activity, ScanLine, ShieldCheck, SearchCode } from "lucide-react";
import { useState, useEffect } from "react";
import { normalizeUrlInput } from "../../shared/normalizeUrlInput.js";

const terminalLogs = [
  "> INITIALIZING COMPETITOR SCAN... [OK]",
  "> BYPASSING MARKETING FLUFF... [OK]",
  "> LOCATING CONVERSION LEAKS... [IN PROGRESS]",
  "> ANALYZING VALUE PROPOSITION... [WARNING: WEAK]",
  "> MEASURING BOUNCE VELOCITY... [CRITICAL]",
  "> CALCULATING AGENCY INVOICE INFLATION... [HIGH]",
  "> GENERATING WIREFRAME TOPOLOGY... [OK]",
  "> COMPILING TACTICAL ROAST... [ALMOST DONE]"
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function Chapter2Roast() {
  const [isRoasting, setIsRoasting] = useState(false);
  const [logIndex, setLogIndex] = useState(0);
  const [roastResult, setRoastResult] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isRoasting || roastResult) return;
    
    // Rapid typing effect interval
    const interval = setInterval(() => {
      setLogIndex((prev) => {
        if (prev < terminalLogs.length - 1) return prev + 1;
        return prev;
      });
    }, 1200); // Fast log updates
    
    return () => clearInterval(interval);
  }, [isRoasting, roastResult]);

  const handleRoast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRoasting(true);
    setLogIndex(0);
    setRoastResult(null);
    setErrorMsg("");

    try {
      const normalized = normalizeUrlInput(url);
      if (!normalized.ok) throw new Error(normalized.error);
      setUrl(normalized.url);

      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized.url }),
      });
      const scrapeData = await scrapeResponse.json();
      if (!scrapeResponse.ok) throw new Error(scrapeData?.error || "We could not read that website. Sign in and try again.");

      const response = await fetch("/api/generate-roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteText: scrapeData.text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "We could not check the website. Try again.");

      setRoastResult(Array.isArray(data.roast) ? data.roast.join("\n\n") : data.roast || "No website feedback was returned.");
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
      setIsRoasting(false);
    }
  };

  return (
    <section className="relative py-24 bg-white dark:bg-[#020202] overflow-hidden flex justify-center text-black dark:text-white transition-colors duration-300">

      <div className="relative z-10 w-full max-w-6xl px-6 sm:px-12">
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono text-black/70 dark:text-white/70 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--color-brand-accent)] shadow-[0_0_8px_var(--color-brand-accent)] animate-pulse" />
            LIVE INTELLIGENCE GATHERING
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 tracking-tight">
            Free Website Roast.
          </h2>
          <p className="text-lg text-black/60 dark:text-white/50 font-light max-w-2xl mx-auto leading-relaxed">
            Drop your URL into the terminal. Our AI will scan your architecture, expose conversion leaks, and generate a strategic teardown in 2 minutes. (Requires Sign In)
          </p>
        </div>

        {/* Intelligence Terminal UI */}
        <div className="mx-auto max-w-4xl bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
          
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-xs font-mono text-black/40 dark:text-white/40 flex items-center">
                <Terminal className="w-3 h-3" />
              </div>
            </div>
            {isRoasting && !roastResult && (
              <div className="flex items-center gap-2 text-[var(--color-brand-accent)] text-xs font-mono animate-pulse">
                <Activity className="w-4 h-4" />
                SCANNING
              </div>
            )}
            {roastResult && (
              <div className="flex items-center gap-2 text-green-500 text-xs font-mono">
                <Activity className="w-4 h-4" />
                COMPLETE
              </div>
            )}
          </div>

          <div className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {!isRoasting && !roastResult ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
                  className="flex flex-col gap-6"
                  onSubmit={handleRoast}
                >
                  {errorMsg && (
                    <div className="text-red-500 text-sm font-mono bg-red-500/10 p-3 rounded-md">
                      ERROR: {errorMsg}
                    </div>
                  )}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <SearchCode className="w-5 h-5 text-black/30 dark:text-white/30" />
                    </div>
                    <input
                      type="text"
                      inputMode="url"
                      placeholder="yourwebsite.com"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white px-12 py-5 rounded-lg focus:outline-none focus:border-[var(--color-brand-accent)] focus:bg-black/10 dark:focus:bg-white/10 transition-all placeholder:text-black/30 dark:placeholder:text-white/20 font-mono text-sm md:text-base shadow-inner"
                    />
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <ul className="flex gap-6 font-mono text-xs text-black/50 dark:text-white/40">
                      <li className="flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> SSL Secured</li>
                      <li className="flex items-center gap-1"><Activity className="w-3 h-3"/> Fast Analysis</li>
                    </ul>

                    <button 
                      type="submit"
                      className="group w-full md:w-auto px-8 py-4 bg-black text-white dark:bg-white dark:text-black font-semibold rounded-lg hover:bg-black/90 dark:hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      Initialize Scan
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.form>
              ) : roastResult ? (
                 <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-sm md:text-base text-black/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
                 >
                   <div className="mb-4 text-[var(--color-brand-accent)] font-bold">» ROAST REPORT GENERATED FOR: {url}</div>
                   {roastResult}
                   <div className="mt-8">
                     <button onClick={() => {setIsRoasting(false); setRoastResult(null);}} className="text-xs bg-black/10 dark:bg-white/10 px-4 py-2 rounded hover:bg-black/20 dark:hover:bg-white/20 transition-colors">Scan Another Target</button>
                   </div>
                 </motion.div>
              ) : (
                <motion.div 
                  key="scanning"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 h-64"
                >
                  {/* Terminal Logs */}
                  <div 
                    className="font-mono text-xs md:text-sm flex flex-col gap-3 h-full overflow-hidden relative"
                    style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}
                  >
                    {terminalLogs.slice(0, logIndex + 1).map((log, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={i === logIndex ? "text-[var(--color-brand-accent)] font-semibold" : "text-black/50 dark:text-white/50"}
                      >
                        {log}
                      </motion.div>
                    ))}
                    {/* Blinking cursor */}
                    <motion.div 
                      animate={{ opacity: [1, 0] }} 
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-2 h-4 bg-[var(--color-brand-accent)] mt-1"
                    />
                  </div>

                  {/* Wireframe Scanner */}
                  <div className="relative border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 rounded-md overflow-hidden p-4 flex flex-col gap-3">
                    {/* Skeleton lines */}
                    <div className="w-3/4 h-4 bg-black/10 dark:bg-white/10 rounded-sm" />
                    <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded-sm" />
                    <div className="w-full h-24 bg-black/5 dark:bg-white/5 rounded-sm mt-2 flex items-center justify-center border border-black/5 dark:border-white/5 relative overflow-hidden">
                      <ScanLine className="w-8 h-8 text-black/20 dark:text-white/20" />
                      {/* Internal scan pulse */}
                      <motion.div 
                        className="absolute inset-0 bg-[var(--color-brand-accent)]/10"
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1/3 h-16 bg-black/10 dark:bg-white/10 rounded-sm" />
                      <div className="w-1/3 h-16 bg-black/10 dark:bg-white/10 rounded-sm" />
                      <div className="w-1/3 h-16 bg-black/10 dark:bg-white/10 rounded-sm" />
                    </div>

                    {/* CSS Scanning line */}
                    <motion.div 
                      className="absolute inset-x-0 h-[2px] bg-[var(--color-brand-accent)] shadow-[0_0_15px_var(--color-brand-accent)] z-10"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
      </div>
    </section>
  );
}
