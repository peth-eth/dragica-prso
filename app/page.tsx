import { getQuestions, getSentNewsletters, getSuggestions } from "@/lib/db";
import { getSubscriberCount } from "@/lib/resend";
import PublicSite from "@/app/components/PublicSite";

export const dynamic = "force-dynamic"; // needs runtime env vars (Turso/Resend)

export default async function Page() {
  const [qs, nlList, sgs, subCount] = await Promise.allSettled([
    getQuestions(),
    getSentNewsletters(),
    getSuggestions(),
    getSubscriberCount().catch(() => 0),
  ]);

  return (
    <PublicSite
      initialQuestions={qs.status === "fulfilled" ? qs.value : []}
      initialNewsletters={nlList.status === "fulfilled" ? nlList.value : []}
      initialSuggestions={sgs.status === "fulfilled" ? sgs.value : []}
      initialSubscriberCount={subCount.status === "fulfilled" ? subCount.value : 0}
      turnstileSiteKey=""
    />
  );
}
