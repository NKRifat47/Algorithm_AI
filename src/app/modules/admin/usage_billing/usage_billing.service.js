import prisma from "../../../prisma/client.js";

export const AdminUsageBillingService = {
  getUsageAndBillingData: async (prisma) => {
    // 1. Plan Purchase Total (Sum of past Subscription/Payment prices)
    const {
      _sum: { price: totalRevenue },
    } = await prisma.subscription.aggregate({ _sum: { price: true } });

    // 2. API Requests
    const {
      _sum: { requestCount: totalRequests, tokensUsed: totalTokens },
    } = await prisma.apiUsage.aggregate({
      _sum: { requestCount: true, tokensUsed: true },
    });

    // 3. Last Month Percentage (Based on subscriptions from last 30 days vs prev 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const {
      _sum: { price: recentRev },
    } = await prisma.subscription.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { price: true },
    });
    const {
      _sum: { price: prevRev },
    } = await prisma.subscription.aggregate({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { price: true },
    });

    let growthPercent = 0;
    if (prevRev && prevRev > 0) {
      growthPercent = (((recentRev || 0) - prevRev) / prevRev) * 100;
    } else if (recentRev && recentRev > 0) {
      growthPercent = 100;
    }

    // 4. API Request Usages (Last 7 Days) for Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const usages = await prisma.apiUsage.findMany({
      where: { date: { gte: sevenDaysAgo } },
      select: { date: true, tokensUsed: true, requestCount: true },
      orderBy: { date: "asc" },
    });

    const chartDataMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      // Store using a formatted key like 'Feb 12'
      const displayDateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      chartDataMap[dateStr] = {
        displayDate: displayDateStr,
        fullDate: dateStr,
        tokens: 0,
        requests: 0,
      };
    }

    usages.forEach((u) => {
      const dateStr = new Date(u.date).toISOString().split("T")[0];
      if (chartDataMap[dateStr]) {
        chartDataMap[dateStr].tokens += u.tokensUsed;
        chartDataMap[dateStr].requests += u.requestCount;
      }
    });
    const chartData = Object.values(chartDataMap);

    // 5. Recent Plan Purchase
    const recentPurchases = await prisma.subscription.findMany({
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
        apiRequests: totalRequests || 0,
        totalTokens: totalTokens || 0,
        growthPercent: Number(growthPercent.toFixed(1)),
      },
      chartData,
      recentPurchases: formattedPurchases,
    };
  },

  getPlans: async (prisma) => {
    return await prisma.plan.findMany({
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
