import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminUsageBillingService } from "./usage_billing.service.js";

const getUsageAndBilling = async (req, res) => {
  try {
    const data = await AdminUsageBillingService.getUsageAndBillingData(prisma);

    return res.json({
      success: true,
      message: "Usage and billing data retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("getUsageAndBilling error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve usage and billing data",
    });
  }
};

const getPlans = async (req, res) => {
  try {
    const plans = await AdminUsageBillingService.getPlans(prisma);
    return res.json({
      success: true,
      message: "Plans retrieved successfully",
      data: plans,
    });
  } catch (error) {
    console.error("getPlans error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve plans",
    });
  }
};

export const AdminUsageBillingController = {
  getUsageAndBilling,
  getPlans,
};
