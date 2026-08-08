"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { signIn, signOut, useSession } from "@/lib/auth-client";

type LocalDevSession = {
  enabled: boolean;
  session?: {
    user: {
      id: string;
      email: string;
      name: string;
    };
  } | null;
};

type LocalDevLogin = {
  user: NonNullable<LocalDevSession["session"]>["user"];
};

export function Navbar() {
  const { data: session, isPending } = useSession();
  const [localDev, setLocalDev] = useState<LocalDevSession>({ enabled: false, session: null });
  const [authError, setAuthError] = useState("");

  const activeUser = session?.user || localDev.session?.user;
  const isLocalTester = !session && Boolean(localDev.session?.user);

  useEffect(() => {
    void fetch("/api/dev-session")
      .then(res => res.json())
      .then((data: LocalDevSession) => setLocalDev(data))
      .catch(() => setLocalDev({ enabled: false, session: null }));
  }, []);

  const handleSignIn = async () => {
    setAuthError("");

    if (localDev.enabled) {
      const response = await fetch("/api/dev-login", { method: "POST" });
      if (response.ok) {
        const data = await response.json() as LocalDevLogin;
        setLocalDev({ enabled: true, session: { user: data.user } });
        window.dispatchEvent(new Event("cac-local-auth-changed"));
        return;
      }
      setAuthError("Tester login is enabled, but the server rejected it. Please refresh and try again.");
      return;
    }

    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/details/" });
      const error = (result as { error?: { message?: string } } | undefined)?.error;
      if (error) {
        setAuthError(error.message || "Google sign-in is not configured for this preview.");
      } else {
        setAuthError("Google sign-in did not redirect. Check the Google OAuth callback URL for this Cloudflare preview.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    if (isLocalTester) {
      await fetch("/api/dev-logout", { method: "POST" });
      setLocalDev(prev => ({ ...prev, session: null }));
      window.dispatchEvent(new Event("cac-local-auth-changed"));
      return;
    }

    await signOut();
  };

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#020202]/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-bold tracking-tight text-black dark:text-white flex items-center gap-3" aria-label="CAC home">
          CAC <span className="text-black/50 dark:text-white/30 font-light hidden sm:inline text-sm mt-0.5">Cancel Agency Culture</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isPending ? (
            <div className="w-32 h-9 bg-black/5 dark:bg-white/5 animate-pulse rounded-sm" aria-label="Loading account" />
          ) : activeUser ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-black dark:text-white hidden sm:inline">{activeUser.name || activeUser.email}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-semibold bg-black/5 text-black dark:bg-white/5 dark:text-white px-4 py-2 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="text-sm font-semibold bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-sm hover:bg-black/90 dark:hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {localDev.enabled ? "Continue as Tester" : "Sign in with Google"}
            </button>
          )}
        </div>
      </div>
      {authError && (
        <div className="absolute right-6 top-[4.5rem] max-w-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 shadow-lg backdrop-blur dark:text-red-300">
          {authError}
        </div>
      )}
    </nav>
  );
}
