import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Met ?demo achter de link draait de app met nepgegevens, zonder database.
const demoMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

export const BACKEND = Boolean(url && key) && !demoMode;
export const supabase = BACKEND ? createClient(url, key) : null;
