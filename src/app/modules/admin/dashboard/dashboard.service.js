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
};

