import { prisma } from "@/lib/prisma";

/**
 * Per-user rate limiting backed by the existing MongoDB, so the app stays on
 * free infrastructure with no extra service to provision.
 *
 * Every AI call writes one tiny `UsageEvent`. A check reads that user's events
 * for the last 24 hours (a bounded, indexed read) and derives both the short
 * burst window and the daily quota from the same rows.
 *
 * Limits are deliberately below the Gemini and Groq free-tier ceilings so a
 * single user cannot exhaust the shared key for everyone else.
 */

export type RateLimitedAction = "generate" | "answers" | "extract";

interface Rule {
  /** Short burst window, guarding requests-per-minute provider limits. */
  windowMs: number;
  maxInWindow: number;
  /** Rolling 24h quota, guarding requests-per-day provider limits. */
  dailyMax: number;
  label: string;
}

const RULES: Record<RateLimitedAction, Rule> = {
  generate: { windowMs: 5 * 60_000, maxInWindow: 5, dailyMax: 40, label: "CV generations" },
  answers: { windowMs: 5 * 60_000, maxInWindow: 5, dailyMax: 40, label: "answer sets" },
  extract: { windowMs: 10 * 60_000, maxInWindow: 5, dailyMax: 20, label: "CV uploads" },
};

const DAY_MS = 24 * 60 * 60_000;
/** Events are useless once past the widest window; prune them well after that. */
const RETENTION_MS = 48 * 60 * 60_000;

interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry. Only meaningful when `ok` is false. */
  retryAfter: number;
  message?: string;
  remainingToday: number;
}

/**
 * Claims one unit of quota, or refuses.
 *
 * The event row is written *before* the count is read. A check-then-write would
 * let two parallel requests — a double-click, a duplicated tab — both read the
 * same count, both pass, and both spend upstream free-tier quota, which is the
 * one thing this exists to prevent. Writing first means each request sees the
 * other's claim; a rejected claim is rolled back immediately.
 *
 * Under an exact tie both requests may roll back when one could have proceeded.
 * Occasionally refusing a request that would have been allowed is the correct
 * trade against occasionally spending quota that was not available.
 */
export async function reserveQuota(
  userId: string,
  action: RateLimitedAction,
): Promise<RateLimitResult> {
  const rule = RULES[action];
  const claim = await prisma.usageEvent.create({
    data: { userId, action },
    select: { id: true },
  });

  try {
    const now = Date.now();
    const events = await prisma.usageEvent.findMany({
      where: { userId, action, createdAt: { gte: new Date(now - DAY_MS) } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      // Two over the cap bounds the read while still leaving enough rows to
      // locate the pivot below.
      take: rule.dailyMax + 2,
    });

    // Everything already claimed by someone else — this request's own row must
    // not count against itself.
    const others = events.filter((event) => event.id !== claim.id);
    const remainingToday = Math.max(0, rule.dailyMax - others.length - 1);

    if (others.length >= rule.dailyMax) {
      // `others` is newest-first, so a slot frees when the `dailyMax`-th newest
      // ages out — not when the oldest row fetched does, which would still
      // leave the window full and reject the caller again.
      const pivot = others[rule.dailyMax - 1].createdAt.getTime();
      const retryAfter = Math.max(1, Math.ceil((pivot + DAY_MS - now) / 1000));
      await release(claim.id);
      return {
        ok: false,
        retryAfter,
        remainingToday: 0,
        message: `You've used all ${rule.dailyMax} ${rule.label} for today. Your quota refreshes in ${formatDuration(retryAfter)}.`,
      };
    }

    const windowStart = now - rule.windowMs;
    const inWindow = others.filter((event) => event.createdAt.getTime() >= windowStart);

    if (inWindow.length >= rule.maxInWindow) {
      const pivot = inWindow[rule.maxInWindow - 1].createdAt.getTime();
      const retryAfter = Math.max(1, Math.ceil((pivot + rule.windowMs - now) / 1000));
      await release(claim.id);
      return {
        ok: false,
        retryAfter,
        remainingToday,
        message: `That's ${rule.maxInWindow} ${rule.label} in quick succession — give it ${formatDuration(retryAfter)} and try again.`,
      };
    }

    // Opportunistic pruning keeps the free 512MB cluster tidy without a cron job.
    if (Math.random() < 0.02) {
      prisma.usageEvent
        .deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_MS) } } })
        .catch(() => {
          /* pruning is best-effort and must never fail a user request */
        });
    }

    return { ok: true, retryAfter: 0, remainingToday };
  } catch (error) {
    // The claim must never outlive a failure to evaluate it.
    await release(claim.id);
    throw error;
  }
}

async function release(id: string): Promise<void> {
  await prisma.usageEvent.delete({ where: { id } }).catch(() => {
    /* already gone, or pruned — nothing to undo */
  });
}

/** Remaining daily allowance for each action, for display in the UI. */
export async function getUsageSummary(userId: string) {
  const dayStart = new Date(Date.now() - DAY_MS);
  const events = await prisma.usageEvent.groupBy({
    by: ["action"],
    where: { userId, createdAt: { gte: dayStart } },
    _count: { action: true },
  });

  const used = new Map(events.map((event) => [event.action, event._count.action]));
  return (Object.keys(RULES) as RateLimitedAction[]).map((action) => ({
    action,
    label: RULES[action].label,
    used: used.get(action) ?? 0,
    limit: RULES[action].dailyMax,
    remaining: Math.max(0, RULES[action].dailyMax - (used.get(action) ?? 0)),
  }));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}
