import { auth } from "@/lib/auth";
import NewsletterBuilder from "@/app/components/newsletter-builder";
import SignInPanel from "@/app/components/sign-in-panel";

export default async function AdminPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-plum-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-plum-900">
            <span className="theme-icon-small">✉</span>
            <span>Uređivanje Glasnika</span>
          </div>
          <h1 className="serif-title text-4xl font-extrabold leading-tight text-plum-950 md:text-5xl">
            Tjedni glasnik
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
            Zalijepite bilješke, pritisnite „Uredi", pa dovršite tekst i slike u jednom polju te pošaljite glasnik pretplatnicima.
          </p>
        </div>
      </header>

      {session?.user?.email ? (
        <NewsletterBuilder userEmail={session.user.email} />
      ) : (
        <SignInPanel />
      )}
    </div>
  );
}
