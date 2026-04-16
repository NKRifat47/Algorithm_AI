import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

async function main() {
  const passwordHash = await bcrypt.hash("11", 10);

  const planData = {
    name: "Test 001",
    monthlyPrice: 10,
    yearlyPrice: 120,
    stripeMonthlyPriceId: "price_1TJwU81tuanUVwVFV4yICkh2",
    stripeYearlyPriceId: "price_1TJwUZ1tuanUVwVF8nr2nhRx",
    requestLimit: 0,
    agentLimit: 0,
    features: ["this is test", "token 10 "],
  };

  const existingPlan = await prisma.plan.findFirst({
    where: { name: planData.name },
    orderBy: { createdAt: "desc" },
  });

  const plan = existingPlan
    ? await prisma.plan.update({
        where: { id: existingPlan.id },
        data: planData,
      })
    : await prisma.plan.create({ data: planData });

  const admin = await prisma.user.upsert({
    where: { email: "system@test.com" },
    update: {
      firstName: "System",
      lastName: "Owner",
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      isVerified: true,
    },
    create: {
      email: "system@test.com",
      password: passwordHash,
      firstName: "System",
      lastName: "Owner",
      role: "ADMIN",
      status: "ACTIVE",
      isVerified: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@test.com" },
    update: {
      firstName: "Nowazesh",
      lastName: "Kobir Rifat",
      password: passwordHash,
      role: "USER",
      status: "ACTIVE",
      isVerified: true,
      planId: plan.id,
    },
    create: {
      email: "user@test.com",
      password: passwordHash,
      firstName: "Nowazesh",
      lastName: "Kobir Rifat",
      role: "USER",
      status: "ACTIVE",
      isVerified: true,
      planId: plan.id,
    },
  });

  const startDate = new Date();
  const endDate = addMonths(startDate, 1);

  const existingSub = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      endDate: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        price: plan.monthlyPrice,
        status: "ACTIVE",
        startDate,
        endDate,
      },
    });
  }

  console.log("✅ Seed completed");
  console.log("Admin:", admin.email);
  console.log("User:", user.email);
  console.log("Plan:", plan.name);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
