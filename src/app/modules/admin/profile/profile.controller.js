import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminProfileService } from "./profile.service.js";

const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const data = await AdminProfileService.getProfile(id);
    return res.json({
      success: true,
      message: "Profile retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("getProfile error:", error);
    if (error instanceof DevBuildError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const updateData = {
      ...req.body,
    };


    if (req.file) {
      updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    const data = await AdminProfileService.updateProfile(id, updateData);
    return res.json({
      success: true,
      message: "Profile updated successfully",
      data,
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    if (error instanceof DevBuildError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const AdminProfileController = {
  getProfile,
  updateProfile,
};
