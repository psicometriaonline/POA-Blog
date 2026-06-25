const LIST_NAME = "Leads";
const TAG_NAME = "Leads - Blog";

let cachedListId: string | null = null;
let cachedTagId: string | null = null;

function getConfig(): { baseUrl: string; token: string } | null {
  const rawUrl = process.env.ACTIVECAMPAIGN_API_URL;
  const token = process.env.ACTIVECAMPAIGN_API_KEY;
  if (!rawUrl || !token) return null;
  const baseUrl = rawUrl.replace(/\/+$/, "").replace(/\/api\/3$/, "");
  return { baseUrl: `${baseUrl}/api/3`, token };
}

export function isActiveCampaignConfigured(): boolean {
  return getConfig() !== null;
}

async function acFetch(
  config: { baseUrl: string; token: string },
  path: string,
  init?: RequestInit
): Promise<any> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Api-Token": config.token,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const detail = json?.errors?.[0]?.title || json?.message || text || res.statusText;
    throw new Error(`ActiveCampaign ${res.status}: ${detail}`);
  }
  return json;
}

async function resolveListId(config: { baseUrl: string; token: string }): Promise<string | null> {
  if (cachedListId) return cachedListId;
  const data = await acFetch(config, `/lists?filters[name]=${encodeURIComponent(LIST_NAME)}`);
  const list = (data?.lists || []).find((l: any) => l.name === LIST_NAME) || data?.lists?.[0];
  if (list?.id) {
    cachedListId = String(list.id);
    return cachedListId;
  }
  return null;
}

async function resolveTagId(config: { baseUrl: string; token: string }): Promise<string | null> {
  if (cachedTagId) return cachedTagId;
  const data = await acFetch(config, `/tags?search=${encodeURIComponent(TAG_NAME)}`);
  const existing = (data?.tags || []).find((t: any) => t.tag === TAG_NAME);
  if (existing?.id) {
    cachedTagId = String(existing.id);
    return cachedTagId;
  }
  const created = await acFetch(config, `/tags`, {
    method: "POST",
    body: JSON.stringify({ tag: { tag: TAG_NAME, tagType: "contact", description: "" } }),
  });
  if (created?.tag?.id) {
    cachedTagId = String(created.tag.id);
    return cachedTagId;
  }
  return null;
}

function splitName(name?: string): { firstName: string; lastName: string } {
  const trimmed = (name || "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");
  return { firstName, lastName };
}

export async function syncLead(params: { name?: string; email: string }): Promise<void> {
  const config = getConfig();
  if (!config) {
    throw new Error("ActiveCampaign não está configurado (credenciais ausentes).");
  }

  const { firstName, lastName } = splitName(params.name);

  const contactRes = await acFetch(config, `/contact/sync`, {
    method: "POST",
    body: JSON.stringify({
      contact: { email: params.email, firstName, lastName },
    }),
  });
  const contactId = contactRes?.contact?.id;
  if (!contactId) {
    throw new Error("ActiveCampaign: não foi possível criar/atualizar o contato.");
  }

  const listId = await resolveListId(config);
  if (listId) {
    await acFetch(config, `/contactLists`, {
      method: "POST",
      body: JSON.stringify({
        contactList: { list: listId, contact: contactId, status: 1 },
      }),
    });
  }

  const tagId = await resolveTagId(config);
  if (tagId) {
    await acFetch(config, `/contactTags`, {
      method: "POST",
      body: JSON.stringify({
        contactTag: { contact: contactId, tag: tagId },
      }),
    });
  }
}
