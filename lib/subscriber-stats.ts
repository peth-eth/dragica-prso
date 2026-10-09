export type SubscriberContact = {
  createdAt: string;
  unsubscribed: boolean;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type SubscriberGrowthPoint = {
  date: string;
  count: number;
};

export type SubscriberStats = {
  total: number;
  unsubscribed: number;
  growth: SubscriberGrowthPoint[];
};

export type SubscriberListItem = {
  email: string;
  name: string;
  createdAt: string;
};

export type SubscriberDirectory = {
  contacts: SubscriberListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function buildSubscriberStats(contacts: SubscriberContact[], today = new Date()): SubscriberStats {
  const activeContacts = contacts.filter((contact) => !contact.unsubscribed);
  const additions = new Map<string, number>();

  for (const contact of activeContacts) {
    const date = new Date(contact.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    additions.set(key, (additions.get(key) ?? 0) + 1);
  }

  const dates = [...additions.keys()].sort();
  if (dates.length === 0) {
    return { total: 0, unsubscribed: contacts.length, growth: [] };
  }

  const end = today.toISOString().slice(0, 10);
  const cursor = new Date(`${dates[0]}T00:00:00.000Z`);
  const lastDate = new Date(`${end}T00:00:00.000Z`);
  const growth: SubscriberGrowthPoint[] = [];
  let count = 0;

  while (cursor <= lastDate) {
    const date = cursor.toISOString().slice(0, 10);
    count += additions.get(date) ?? 0;
    growth.push({ date, count });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { total: activeContacts.length, unsubscribed: contacts.length - activeContacts.length, growth };
}

export function buildSubscriberDirectory(contacts: SubscriberContact[], page: number, pageSize: number, query: string): SubscriberDirectory {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = contacts
    .filter((contact) => !contact.unsubscribed)
    .filter((contact) => [contact.email, contact.firstName, contact.lastName].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    contacts: filtered.slice(start, start + pageSize).map((contact) => ({
      email: contact.email,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      createdAt: contact.createdAt,
    })),
    pagination: { page: currentPage, pageSize, total, totalPages },
  };
}
