import { getCloudflareContext } from "@opennextjs/cloudflare";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { parseAllowedAdmins } from "./admin-email";

type RuntimeEnv = Record<string, unknown>;

function getEnvString(env: RuntimeEnv, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value : "";
}

export function createAuthConfig(env: RuntimeEnv): NextAuthConfig {
  const allowedAdmins = parseAllowedAdmins(getEnvString(env, "ADMIN_EMAILS"));

  return {
    // Workers sits behind a proxy; derive the host from request headers.
    trustHost: true,
    secret: getEnvString(env, "NEXTAUTH_SECRET"),
    providers: [
      Google({
        clientId: getEnvString(env, "GOOGLE_CLIENT_ID"),
        clientSecret: getEnvString(env, "GOOGLE_CLIENT_SECRET"),
      }),
    ],
    callbacks: {
      async signIn({ profile }) {
        const email = profile?.email?.toLowerCase();
        return Boolean(email && allowedAdmins.includes(email));
      },
      async session({ session }) {
        if (session.user?.email) {
          session.user.email = session.user.email.toLowerCase();
        }
        return session;
      },
    },
    pages: {
      signIn: "/admin",
    },
  };
}

// Cloudflare secrets are request-scoped bindings, not process.env values.
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const { env } = await getCloudflareContext();
  return createAuthConfig(env as RuntimeEnv);
});
