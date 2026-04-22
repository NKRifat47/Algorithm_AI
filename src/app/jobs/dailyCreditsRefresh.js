import cron from "node-cron";
import prisma from "../prisma/client.js";

const DEFAULT_DAILY_CREDITS = 300;
const DEFAULT_TZ = "America/New_York";

function getUsMidnightUtcDate(now = new Date(), tz = DEFAULT_TZ) {
  // Build a "YYYY-MM-DD" for the given timezone, then interpret it as midnight
  // in that timezone, and return the equivalent UTC Date.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const localDateStr = `${y}-${m}-${d}`;

  // Convert "local midnight" to a UTC date by asking what time it is in UTC
  // when the timezone shows 00:00:00.
  const asIfUtc = new Date(`${localDateStr}T00:00:00.000Z`);
  const tzOffsetMs =
    new Date(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(asIfUtc),
    ).getTime() - asIfUtc.getTime();

  return new Date(asIfUtc.getTime() - tzOffsetMs);
}

export async function runDailyCreditsRefresh({
  credits = DEFAULT_DAILY_CREDITS,
  tz = DEFAULT_TZ,
} = {}) {
  const usMidnightUtc = getUsMidnightUtcDate(new Date(), tz);

  const result = await prisma.user.updateMany({
    where: {
      role: "USER",
      // "Free user" = no active subscription (never purchased or expired/cancelled)
      subscriptions: {
        none: {
          status: "ACTIVE",
          endDate: { gt: new Date() },
        },
      },
      OR: [
        { lastCreditsRefreshAt: null },
        { lastCreditsRefreshAt: { lt: usMidnightUtc } },
      ],
    },
    data: {
      credits,
      lastCreditsRefreshAt: new Date(),
    },
  });

  return { updatedUsers: result.count, usMidnightUtc, credits, tz };
}

export function startDailyCreditsRefreshCron({
  credits = DEFAULT_DAILY_CREDITS,
  tz = DEFAULT_TZ,
  schedule = "0 0 * * *", // 12:00 AM
} = {}) {
  return cron.schedule(
    schedule,
    async () => {
      try {
        const { updatedUsers } = await runDailyCreditsRefresh({ credits, tz });
        console.log(
          `✅ Daily credits refresh ran (${tz}). Users refreshed: ${updatedUsers}`,
        );
      } catch (err) {
        console.error("❌ Daily credits refresh failed:", err);
      }
    },
    { timezone: tz },
  );
}

