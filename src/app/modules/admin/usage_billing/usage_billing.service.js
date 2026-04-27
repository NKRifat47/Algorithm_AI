export const AdminUsageBillingService = {
  getUsageAndBillingData: async (prismaClient) => {
    // 1. Plan Purchase Total (Sum of past Subscription/Payment prices)
    const {
      _sum: { price: totalRevenue },
    } = await prismaClient.subscription.aggregate({ _sum: { price: true } });

    // 3. Last Month Percentage (Based on subscriptions from last 30 days vs prev 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const {
      _sum: { price: recentRev },
    } = await prismaClient.subscription.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { price: true },
    });
    const {
      _sum: { price: prevRev },
    } = await prismaClient.subscription.aggregate({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { price: true },
    });

    let growthPercent = 0;
    if (prevRev && prevRev > 0) {
      growthPercent = (((recentRev || 0) - prevRev) / prevRev) * 100;
    } else if (recentRev && recentRev > 0) {
      growthPercent = 100;
    }

    // 5. Recent Plan Purchase
    const recentPurchases = await prismaClient.subscription.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        plan: { select: { name: true } },
      },
    });

    const formattedPurchases = recentPurchases.map((p) => ({
      id: p.id,
      userEmail: p.user?.email || "Unknown User",
      planName: p.plan?.name || "Unknown Plan",
      cost: p.price || 0,
      createdAt: p.createdAt,
    }));

    return {
      overview: {
        planPurchaseTotal: totalRevenue || 0,
        growthPercent: Number(growthPercent.toFixed(1)),
      },
      recentPurchases: formattedPurchases,
    };
  },

  getPlans: async (prismaClient) => {
    return await prismaClient.plan.findMany({
      select: {
        id: true,
        name: true,
        monthlyPrice: true,
        yearlyPrice: true,
        requestLimit: true,
        agentLimit: true,
        features: true,
        createdAt: true,
      },
      orderBy: {
        monthlyPrice: "asc",
      },
    });
  },
};
