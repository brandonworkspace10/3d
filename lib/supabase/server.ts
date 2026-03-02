import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./schema";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component — cookies can only be
            // mutated from a Server Action or Route Handler; safe to ignore.
          }
        },
      },
    }
  );
}
