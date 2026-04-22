import DevBuildError from "../lib/DevBuildError.js";

export const CREDIT_COSTS = {
  AI_QUERY: 10,
  PDF_EXPORT: 30,
  CODEBASE_EXPORT: 150,
};

/**
 * Atomically decrements user credits.
 * Throws DevBuildError(402) when balance is insufficient.
 */
export async function chargeCredits(prisma, userId, { amount, reason, meta }) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new DevBuildError("Invalid credit amount", 500);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, credits: true },
    });

    if (!user) throw new DevBuildError("User not found", 404);
    if ((user.credits ?? 0) < amount) {
      throw new DevBuildError(
        `Insufficient credits. Required ${amount}, available ${user.credits ?? 0}.`,
        402,
      );
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    await tx.activityLog.create({
      data: {
        type: "CREDITS_DEBIT",
        message: `${reason || "CREDITS_DEBIT"} (-${amount})`,
        userEmail: user.email,
        meta: meta ?? {},
      },
    });

    return { remainingCredits: updated.credits };
  });
}

export async function refundCredits(prisma, userId, { amount, reason, meta }) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new DevBuildError("Invalid credit amount", 500);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) throw new DevBuildError("User not found", 404);

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    await tx.activityLog.create({
      data: {
        type: "CREDITS_REFUND",
        message: `${reason || "CREDITS_REFUND"} (+${amount})`,
        userEmail: user.email,
        meta: meta ?? {},
      },
    });

    return { remainingCredits: updated.credits };
  });
}

