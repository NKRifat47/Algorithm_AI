import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminDashboardService } from "./dashboard.service.js";

const getDashboardStats = async (req, res) => {
  try {
    const data = await AdminDashboardService.getDashboardStats(prisma);

    return res.json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard stats",
    });
  }
};

const getSalesTrack = async (req, res) => {
  try {
    const { range } = req.query;
    const data = await AdminDashboardService.getSalesTrack(prisma, range);

    return res.json({
      success: true,
      message: "Sales track retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("getSalesTrack error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve sales track",
    });
  }
};

export const AdminDashboardController = {
  getDashboardStats,
  getSalesTrack,
};

