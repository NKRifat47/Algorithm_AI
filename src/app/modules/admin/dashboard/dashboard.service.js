export const AdminDashboardService = {
  getDashboardStats: async (prisma) => {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const nextMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    const [
      totalUsers,
      activeSubscriptions,
      purchasesToday,
      { _sum: { price: monthlyRevenue } },
      subscriptionsByPlan,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({
        where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
      }),
      prisma.subscription.aggregate({
        where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
        _sum: { price: true },
      }),
      prisma.subscription.groupBy({
        by: ["planId"],
        _count: { _all: true },
      }),
    ]);

    const planIds = subscriptionsByPlan
      .map((s) => s.planId)
      .filter(Boolean);

    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    });

    const planNameById = new Map(plans.map((p) => [p.id, p.name]));

    const subscriptionSummary = subscriptionsByPlan
      .map((s) => ({
        planId: s.planId,
        planName: planNameById.get(s.planId) || "Unknown Plan",
        purchases: s._count._all,
      }))
      .sort((a, b) => b.purchases - a.purchases);

    return {
      totalUsers,
      activeSubscriptions,
      purchasesToday,
      monthlyRevenue: monthlyRevenue || 0,
      subscriptionSummary,
    };
  },

  getSalesTrack: async (prisma, range = "day") => {
    const allowed = new Set(["day", "week", "month"]);
    const selectedRange = allowed.has(range) ? range : "day";

    const now = new Date();

    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const addDays = (d, days) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };

    const startOfISOWeek = (d) => {
      const x = startOfDay(d);
      const day = x.getDay(); // 0..6, Sunday=0
      const diff = day === 0 ? -6 : 1 - day; // move back to Monday
      return addDays(x, diff);
    };

    const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const addMonths = (d, months) => new Date(d.getFullYear(), d.getMonth() + months, 1, 0, 0, 0, 0);

    let points = [];
    let windowStart;
    let windowEnd;

    if (selectedRange === "day") {
      const todayStart = startOfDay(now);
      windowStart = addDays(todayStart, -6);
      windowEnd = addDays(todayStart, 1);

      points = Array.from({ length: 7 }, (_, i) => {
        const bucketStart = addDays(windowStart, i);
        const key = bucketStart.toISOString().slice(0, 10);
        const label = bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { key, label, revenue: 0, purchases: 0, start: bucketStart, end: addDays(bucketStart, 1) };
      });
    } else if (selectedRange === "week") {
      const thisWeekStart = startOfISOWeek(now);
      windowStart = addDays(thisWeekStart, -(7 * 3));
      windowEnd = addDays(thisWeekStart, 7);

      points = Array.from({ length: 4 }, (_, i) => {
        const bucketStart = addDays(windowStart, i * 7);
        const bucketEnd = addDays(bucketStart, 7);
        const key = bucketStart.toISOString().slice(0, 10);
        const labelStart = bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const labelEnd = addDays(bucketEnd, -1).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { key, label: `${labelStart} - ${labelEnd}`, revenue: 0, purchases: 0, start: bucketStart, end: bucketEnd };
      });
    } else {
      const thisMonthStart = startOfMonth(now);
      windowStart = addMonths(thisMonthStart, -5);
      windowEnd = addMonths(thisMonthStart, 1);

      points = Array.from({ length: 6 }, (_, i) => {
        const bucketStart = addMonths(windowStart, i);
        const bucketEnd = addMonths(bucketStart, 1);
        const key = `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, "0")}`;
        const label = bucketStart.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return { key, label, revenue: 0, purchases: 0, start: bucketStart, end: bucketEnd };
      });
    }

    const subs = await prisma.subscription.findMany({
      where: {
        createdAt: { gte: windowStart, lt: windowEnd },
      },
      select: {
        createdAt: true,
        price: true,
      },
    });

    subs.forEach((s) => {
      const createdAt = new Date(s.createdAt);
      const bucket = points.find((p) => createdAt >= p.start && createdAt < p.end);
      if (!bucket) return;
      bucket.purchases += 1;
      bucket.revenue += s.price || 0;
    });

    const series = points.map(({ start, end, ...rest }) => rest);

    return {
      range: selectedRange,
      series,
    };
  },

  getSystemActivity: async (prisma, { limit = 20 } = {}) => {
    const safeLimit = Number.isFinite(Number(limit))
      ? Math.min(Math.max(Number(limit), 1), 100)
      : 20;

    const logs = await prisma.activityLog.findMany({
      where: {
        type: { in: ["USER_REGISTERED", "PLAN_PURCHASED"] },
      },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        type: true,
        message: true,
        userEmail: true,
        meta: true,
        createdAt: true,
      },
    });

    return logs;
  },
};

