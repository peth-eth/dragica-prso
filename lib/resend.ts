import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Resend } from "resend";
import { selectAudienceId } from "./resend-audience";
import { buildSubscriberDirectory, buildSubscriberStats, type SubscriberContact, type SubscriberDirectory, type SubscriberStats } from "./subscriber-stats";

let _resend: Resend | null = null;
let resendApiKey = "";
type RuntimeEnv = Record<string, unknown>;

function getEnvString(env: RuntimeEnv, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value : "";
}

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  try {
    const { env } = await getCloudflareContext();
    return env as RuntimeEnv;
  } catch {
    return process.env as RuntimeEnv;
  }
}

async function getResend(): Promise<Resend> {
  const apiKey = getEnvString(await getRuntimeEnv(), "RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  if (!_resend || resendApiKey !== apiKey) {
    _resend = new Resend(apiKey);
    resendApiKey = apiKey;
  }
  return _resend;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const fields = error as { message?: unknown; name?: unknown; statusCode?: unknown };
    return [fields.name, fields.message, fields.statusCode].filter(Boolean).join(" ");
  }
  return String(error ?? "");
}

export function isAlreadySubscribedError(error: unknown): boolean {
  const text = getErrorText(error).toLowerCase();
  return text.includes("already") || text.includes("exists") || text.includes("422");
}

export function broadcastName(title: string): string {
  return title.trim().slice(0, 70);
}

async function listContacts(audienceId: string): Promise<SubscriberContact[]> {
  const { data, error } = await (await getResend()).contacts.list({ audienceId });
  if (error) throw new Error(getErrorText(error));

  return (data?.data ?? []).map((contact) => ({
    email: contact.email,
    createdAt: contact.created_at,
    unsubscribed: contact.unsubscribed,
    firstName: contact.first_name,
    lastName: contact.last_name,
  }));
}

async function getAudienceWithContacts(): Promise<{ audienceId: string; contacts: SubscriberContact[] }> {
  const configuredId = getEnvString(await getRuntimeEnv(), "RESEND_AUDIENCE_ID");
  const configuredContacts = await listContacts(configuredId);
  if (configuredContacts.some((contact) => !contact.unsubscribed)) {
    return { audienceId: configuredId, contacts: configuredContacts };
  }

  const resend = await getResend();
  const { data, error } = await resend.audiences.list();
  if (error) throw new Error(getErrorText(error));

  const candidates = await Promise.all((data?.data ?? []).map(async (audience) => ({
    id: audience.id,
    contacts: audience.id === configuredId ? configuredContacts : await listContacts(audience.id),
  })));
  const audienceId = selectAudienceId(configuredId, candidates.map((audience) => ({
    id: audience.id,
    activeContacts: audience.contacts.filter((contact) => !contact.unsubscribed).length,
  })));
  const selected = candidates.find((audience) => audience.id === audienceId);
  return { audienceId, contacts: selected?.contacts ?? configuredContacts };
}

export async function addSubscriber(email: string, name?: string) {
  const { audienceId } = await getAudienceWithContacts();
  const { data, error } = await (await getResend()).contacts.create({
    email,
    firstName: name,
    audienceId,
    unsubscribed: false,
  });

  if (error) {
    throw new Error(getErrorText(error));
  }

  return data;
}

export async function getSubscriberCount(): Promise<number> {
  return (await getSubscriberContacts()).filter((contact) => !contact.unsubscribed).length;
}

async function getSubscriberContacts(): Promise<SubscriberContact[]> {
  return (await getAudienceWithContacts()).contacts;
}

export async function getSubscriberStats(): Promise<SubscriberStats> {
  return buildSubscriberStats(await getSubscriberContacts());
}

export type SubscriberDashboardData = SubscriberStats & SubscriberDirectory;

export async function getSubscriberDashboard(page: number, query: string): Promise<SubscriberDashboardData> {
  const contacts = await getSubscriberContacts();
  return {
    ...buildSubscriberStats(contacts),
    ...buildSubscriberDirectory(contacts, page, 10, query),
  };
}

export async function sendBroadcast(opts: {
  title: string;
  htmlContent: string;
  previewText?: string;
}): Promise<string> {
  const env = await getRuntimeEnv();
  const { audienceId } = await getAudienceWithContacts();
  const from = getEnvString(env, "RESEND_FROM");

  const resend = await getResend();
  const { data: created, error: createErr } = await resend.broadcasts.create({
    audienceId,
    from,
    subject: opts.title,
    html: opts.htmlContent,
    previewText: opts.previewText,
    name: broadcastName(opts.title),
  });

  if (createErr || !created?.id) {
    throw new Error(createErr?.message ?? "Failed to create broadcast");
  }

  const { error: sendErr } = await resend.broadcasts.send(created.id);
  if (sendErr) throw new Error(sendErr.message);

  return created.id;
}
