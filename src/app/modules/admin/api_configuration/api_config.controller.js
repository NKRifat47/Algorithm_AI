import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminApiConfigService } from "./api_config.service.js";

const getApiConfig = async (req, res) => {
  try {
    const data = await AdminApiConfigService.getApiConfig(prisma);
    return res.json({
      success: true,
      message: "API config retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("getApiConfig error:", error);
    if (error instanceof DevBuildError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve API configuration",
    });
  }
};

const updateApiConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await AdminApiConfigService.updateApiConfig(
      prisma,
      id,
      req.body,
    );
    return res.json({
      success: true,
      message: "API config updated successfully",
      data,
    });
  } catch (error) {
    console.error("updateApiConfig error:", error);
    if (error instanceof DevBuildError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update API configuration",
    });
  }
};

const createApiKey = async (req, res) => {
  try {
    if (!req.body.name || !req.body.key) {
      return res
        .status(400)
        .json({ success: false, message: "Name and Key are required" });
    }
    const data = await AdminApiConfigService.createApiKey(prisma, req.body);
    return res.status(201).json({
      success: true,
      message: "API key created successfully",
      data,
    });
  } catch (error) {
    console.error("createApiKey error:", error);
    if (error instanceof DevBuildError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create API key",
    });
  }
};

const deleteApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    await AdminApiConfigService.deleteApiKey(prisma, id);
    return res.json({
      success: true,
      message: "API key deleted successfully",
    });
  } catch (error) {
    console.error("deleteApiKey error:", error);
    if (error instanceof DevBuildError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to delete API key",
    });
  }
};

export const AdminApiConfigController = {
  getApiConfig,
  updateApiConfig,
  createApiKey,
  deleteApiKey,
};
