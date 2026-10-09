"use client";

import { signIn } from "next-auth/react";

export default function SignInPanel() {
  return (
    <section className="admin-card mx-auto max-w-xl p-6 text-center md:p-8">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-light text-3xl text-teal-earring">✉</div>
      <h2 className="serif-title text-3xl font-extrabold text-plum-950">Prijava za administratore</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
        Pristup je ograničen na Google račune s dopuštenim e-mailom. Nakon prijave možete pripremiti novi nacrt glasnika.
      </p>
      <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-gray-500">
        Ako Google zatraži potvrdu brojem, otvorite Google/Gmail aplikaciju na telefonu ili odaberite "Pokušajte na drugi način".
      </p>
      <button type="button" className="admin-primary mt-6 w-full" onClick={() => signIn("google")}>
        Nastavi s Google računom
      </button>
    </section>
  );
}
