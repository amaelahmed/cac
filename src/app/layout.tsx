import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cancelagencyculture.in"),
  title: {
    default: "CAC | AI Marketing Strategist",
    template: "%s | CAC",
  },
  description: "Generate Agency-Level Marketing Strategy In Minutes.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Cancel Agency Culture",
    title: "CAC | AI Marketing Strategist",
    description: "Generate Agency-Level Marketing Strategy In Minutes.",
    images: [{
      url: "/android-chrome-512x512.png",
      width: 512,
      height: 512,
      alt: "Cancel Agency Culture",
    }],
  },
  twitter: {
    card: "summary",
    title: "CAC | AI Marketing Strategist",
    description: "Generate Agency-Level Marketing Strategy In Minutes.",
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-[#050505] text-black dark:text-[#f5f5f5] transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
