import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // Dynamically resolve base URL or fallback to current origin if NEXT_PUBLIC_API_URL is missing
    baseURL: process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8788"),
});

export const { signIn, signOut, useSession } = authClient;
