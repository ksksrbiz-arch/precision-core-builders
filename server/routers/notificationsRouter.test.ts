/**
 * notificationsRouter tests — delegation, auth enforcement, and input
 * validation for every procedure.
 *
 * All I/O is mocked: `../db` so importing the full appRouter never builds a
 * real Supabase client, `../_data/notificationsRepo` so no query runs, and
 * `../_core/delivery` so no email/SMS is sent. Follows the caller/context
 * style of blueprintRouter.test.ts.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../db", () => {
  function makeSingle() {
    return Promise.resolve({ data: null, error: null });
  }
  function makeBuilder(): any {
    const p: any = Promise.resolve({ data: [], error: null, count: 0 });
    const chain = () => makeBuilder();
    for (const m of [
      "select",
      "insert",
      "update",
      "delete",
      "upsert",
      "eq",
      "neq",
      "order",
      "limit",
      "range",
    ]) {
      p[m] = chain;
    }
    p.single = makeSingle;
    p.maybeSingle = () => Promise.resolve({ data: null, error: null });
    return p;
  }
  return {
    db: { from: () => makeBuilder() },
    paginate: () => ({ from: 0, to: 19 }),
  };
});

vi.mock("../_data/notificationsRepo", () => ({
  notificationsRepo: {
    listForRecipient: vi.fn(),
    markRead: vi.fn(),
    insert: vi.fn(),
    markSent: vi.fn(),
    markFailed: vi.fn(),
    recipientContact: vi.fn(),
    adminList: vi.fn(),
    clientsByUserIds: vi.fn(),
  },
}));

vi.mock("../_core/delivery", () => ({
  sendEmail: vi.fn(),
  sendSms: vi.fn(),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { notificationsRepo } from "../_data/notificationsRepo";
import { sendEmail, sendSms } from "../_core/delivery";

const repo = vi.mocked(notificationsRepo);
const email = vi.mocked(sendEmail);
const sms = vi.mocked(sendSms);

function ctx(userId?: string, role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: userId
      ? { id: userId, email: `${userId}@example.com`, name: userId, role }
      : null,
    req: {} as any,
    res: {} as any,
  };
}

const RECIPIENT = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notificationsRouter — list", () => {
  it("delegates to listForRecipient with the caller's id + unreadOnly", async () => {
    repo.listForRecipient.mockResolvedValue([{ id: 1 }] as any);
    const caller = appRouter.createCaller(ctx("user-9", "user"));

    const res = await caller.notifications.list({ unreadOnly: true });

    expect(repo.listForRecipient).toHaveBeenCalledWith("user-9", true);
    expect(res).toEqual([{ id: 1 }]);
  });

  it("passes undefined unreadOnly when omitted", async () => {
    repo.listForRecipient.mockResolvedValue([] as any);
    const caller = appRouter.createCaller(ctx("user-9", "user"));

    await caller.notifications.list({});

    expect(repo.listForRecipient).toHaveBeenCalledWith("user-9", undefined);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.notifications.list({})).rejects.toThrow(
      /unauthorized/i
    );
    expect(repo.listForRecipient).not.toHaveBeenCalled();
  });
});

describe("notificationsRouter — markRead", () => {
  it("delegates ids + caller id to markRead", async () => {
    repo.markRead.mockResolvedValue([{ id: 3 }] as any);
    const caller = appRouter.createCaller(ctx("user-2", "user"));

    const res = await caller.notifications.markRead({ ids: [3, 4] });

    expect(repo.markRead).toHaveBeenCalledWith([3, 4], "user-2");
    expect(res).toEqual([{ id: 3 }]);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.notifications.markRead({ ids: [1] })).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("rejects an empty id list", async () => {
    const caller = appRouter.createCaller(ctx("user-2", "user"));
    await expect(caller.notifications.markRead({ ids: [] })).rejects.toThrow();
    expect(repo.markRead).not.toHaveBeenCalled();
  });

  it("rejects non-positive ids", async () => {
    const caller = appRouter.createCaller(ctx("user-2", "user"));
    await expect(caller.notifications.markRead({ ids: [0] })).rejects.toThrow();
  });
});

describe("notificationsRouter — send (authorization)", () => {
  const validInput = {
    recipientId: RECIPIENT,
    channel: "in_app" as const,
    body: "hello",
  };

  it("rejects anonymous callers", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.notifications.send(validInput)).rejects.toThrow(
      /unauthorized/i
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers", async () => {
    const caller = appRouter.createCaller(ctx("user-2", "user"));
    await expect(caller.notifications.send(validInput)).rejects.toThrow(
      /forbidden/i
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });
});

describe("notificationsRouter — send (validation)", () => {
  const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

  it("rejects an invalid channel enum", async () => {
    await expect(
      admin().notifications.send({
        recipientId: RECIPIENT,
        channel: "carrier-pigeon" as any,
        body: "hi",
      })
    ).rejects.toThrow();
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it("rejects a non-uuid recipientId", async () => {
    await expect(
      admin().notifications.send({
        recipientId: "not-a-uuid",
        channel: "in_app",
        body: "hi",
      })
    ).rejects.toThrow();
  });

  it("rejects an empty body", async () => {
    await expect(
      admin().notifications.send({
        recipientId: RECIPIENT,
        channel: "in_app",
        body: "",
      })
    ).rejects.toThrow();
  });

  it("rejects a non-positive projectId", async () => {
    await expect(
      admin().notifications.send({
        recipientId: RECIPIENT,
        channel: "in_app",
        body: "hi",
        projectId: 0,
      })
    ).rejects.toThrow();
  });
});

describe("notificationsRouter — send (delivery behaviour)", () => {
  const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

  it("in_app inserts then markSent with no external delivery", async () => {
    repo.insert.mockResolvedValue({ id: 55 } as any);
    repo.markSent.mockResolvedValue({ id: 55, status: "sent" } as any);

    const res = await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "in_app",
      body: "in-app body",
      subject: "hey",
      projectId: 7,
    });

    expect(repo.insert).toHaveBeenCalledWith({
      recipient_id: RECIPIENT,
      project_id: 7,
      channel: "in_app",
      subject: "hey",
      body: "in-app body",
      status: "pending",
    });
    expect(repo.markSent).toHaveBeenCalledWith(55);
    expect(email).not.toHaveBeenCalled();
    expect(sms).not.toHaveBeenCalled();
    expect(res).toEqual({ id: 55, status: "sent" });
  });

  it("email delivery: resolves contact, sends, then markSent", async () => {
    repo.insert.mockResolvedValue({ id: 60 } as any);
    repo.recipientContact.mockResolvedValue({
      email: "c@x.com",
      phone: null,
    });
    email.mockResolvedValue({ channel: "email", ok: true });
    repo.markSent.mockResolvedValue({ id: 60, status: "sent" } as any);

    await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "email",
      subject: "Subj",
      body: "email body",
    });

    expect(repo.recipientContact).toHaveBeenCalledWith(RECIPIENT);
    expect(email).toHaveBeenCalledWith({
      subject: "Subj",
      text: "email body",
      to: "c@x.com",
    });
    expect(repo.markSent).toHaveBeenCalledWith(60);
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("email with no address on file marks failed without sending", async () => {
    repo.insert.mockResolvedValue({ id: 61 } as any);
    repo.recipientContact.mockResolvedValue({ email: null, phone: null });
    repo.markFailed.mockResolvedValue({ id: 61, status: "failed" } as any);

    await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "email",
      body: "x",
    });

    expect(email).not.toHaveBeenCalled();
    expect(repo.markFailed).toHaveBeenCalledWith(
      61,
      "No email address on file for recipient."
    );
  });

  it("sms delivery: sends via sms and markSent", async () => {
    repo.insert.mockResolvedValue({ id: 62 } as any);
    repo.recipientContact.mockResolvedValue({
      email: null,
      phone: "+15550001111",
    });
    sms.mockResolvedValue({ channel: "sms", ok: true });
    repo.markSent.mockResolvedValue({ id: 62 } as any);

    await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "sms",
      body: "sms body",
    });

    expect(sms).toHaveBeenCalledWith({
      body: "sms body",
      to: "+15550001111",
    });
    expect(repo.markSent).toHaveBeenCalledWith(62);
  });

  it("sms with no phone on file marks failed without sending", async () => {
    repo.insert.mockResolvedValue({ id: 63 } as any);
    repo.recipientContact.mockResolvedValue({ email: null, phone: null });
    repo.markFailed.mockResolvedValue({ id: 63 } as any);

    await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "sms",
      body: "x",
    });

    expect(sms).not.toHaveBeenCalled();
    expect(repo.markFailed).toHaveBeenCalledWith(
      63,
      "No phone number on file for recipient."
    );
  });

  it("skipped provider marks failed with a not-configured reason", async () => {
    repo.insert.mockResolvedValue({ id: 64 } as any);
    repo.recipientContact.mockResolvedValue({
      email: "c@x.com",
      phone: null,
    });
    email.mockResolvedValue({ channel: "email", ok: false, skipped: true });
    repo.markFailed.mockResolvedValue({ id: 64 } as any);

    await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "email",
      body: "x",
    });

    expect(repo.markFailed).toHaveBeenCalledWith(
      64,
      "Email (Resend) provider is not configured."
    );
  });

  it("failed provider marks failed with the returned error", async () => {
    repo.insert.mockResolvedValue({ id: 65 } as any);
    repo.recipientContact.mockResolvedValue({
      email: null,
      phone: "+15550001111",
    });
    sms.mockResolvedValue({ channel: "sms", ok: false, error: "boom" });
    repo.markFailed.mockResolvedValue({ id: 65 } as any);

    await admin().notifications.send({
      recipientId: RECIPIENT,
      channel: "sms",
      body: "x",
    });

    expect(repo.markFailed).toHaveBeenCalledWith(65, "boom");
  });
});

describe("notificationsRouter — adminList", () => {
  const admin = () => appRouter.createCaller(ctx("admin-1", "admin"));

  it("requires admin role", async () => {
    const userCaller = appRouter.createCaller(ctx("user-2", "user"));
    await expect(userCaller.notifications.adminList({})).rejects.toThrow(
      /forbidden/i
    );
    expect(repo.adminList).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.notifications.adminList({})).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("rejects an invalid status enum", async () => {
    await expect(
      admin().notifications.adminList({ status: "nope" as any })
    ).rejects.toThrow();
  });

  it("rejects an out-of-range pageSize", async () => {
    await expect(
      admin().notifications.adminList({ pageSize: 101 })
    ).rejects.toThrow();
  });

  it("delegates filters and joins recipients onto rows", async () => {
    repo.adminList.mockResolvedValue({
      data: [
        { id: 1, recipient_id: RECIPIENT, body: "a" },
        { id: 2, recipient_id: null, body: "b" },
      ],
      count: 2,
    } as any);
    repo.clientsByUserIds.mockResolvedValue([
      { id: 9, user_id: RECIPIENT, name: "Jane", email: "j@x.com" },
    ] as any);

    const filters = { page: 1, pageSize: 20, status: "sent" as const };
    const res = await admin().notifications.adminList(filters);

    expect(repo.adminList).toHaveBeenCalledWith(filters);
    expect(repo.clientsByUserIds).toHaveBeenCalledWith([RECIPIENT]);
    expect(res.total).toBe(2);
    expect(res.data[0].recipient).toEqual({
      id: 9,
      name: "Jane",
      email: "j@x.com",
    });
    expect(res.data[1].recipient).toBeNull();
  });

  it("skips the client lookup when no rows have recipients", async () => {
    repo.adminList.mockResolvedValue({
      data: [{ id: 3, recipient_id: null, body: "c" }],
      count: 1,
    } as any);

    const res = await admin().notifications.adminList({});

    expect(repo.clientsByUserIds).not.toHaveBeenCalled();
    expect(res.data[0].recipient).toBeNull();
    expect(res.total).toBe(1);
  });
});
