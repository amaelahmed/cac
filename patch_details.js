const fs = require('fs');

let content = fs.readFileSync('src/app/details/page.tsx', 'utf8');

// 1. Update shared input classes
content = content.replace(
  'const inputBase = "w-full bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-sm px-4 py-3 text-black dark:text-white text-sm font-sans outline-none transition-all duration-200 placeholder:text-black/30 dark:placeholder:text-white/20 focus:border-[var(--color-brand-accent)] focus:ring-1 focus:ring-[var(--color-brand-accent)]/20";',
  'const inputBase = "w-full bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-sm px-3 py-2 text-black dark:text-white text-sm font-sans outline-none transition-all duration-200 placeholder:text-black/30 dark:placeholder:text-white/20 focus:border-[var(--color-brand-accent)] focus:ring-1 focus:ring-[var(--color-brand-accent)]/20";'
);
content = content.replace(
  'const selectBase = `${inputBase} appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat`;',
  'const selectBase = `${inputBase} appearance-none bg-[length:10px] bg-[right_10px_center] bg-no-repeat`;'
);
content = content.replace(
  'const labelBase = "block text-black/60 dark:text-white/60 text-[11px] font-semibold uppercase tracking-wider mb-2 transition-colors";',
  'const labelBase = "block text-black/60 dark:text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1 transition-colors";'
);
content = content.replace(
  'const hintBase = "text-black/40 dark:text-white/25 text-xs mt-1.5 transition-colors";',
  'const hintBase = "text-black/40 dark:text-white/25 text-[10px] mt-0.5 transition-colors";'
);

// 2. Page wrapper and header spacing
content = content.replace('pt-32 pb-24 px-4 sm:px-6 lg:px-8', 'pt-20 pb-12 px-4 sm:px-6 lg:px-8');
content = content.replace('mb-16 text-center', 'mb-6 text-center');
content = content.replace('mb-6">', 'mb-3">');
content = content.replace('text-4xl md:text-5xl lg:text-6xl', 'text-2xl md:text-3xl');
content = content.replace('text-lg max-w-xl mx-auto', 'text-sm max-w-xl mx-auto');

fs.writeFileSync('src/app/details/page.tsx', content);
