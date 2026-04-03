import { UserProfileService } from "./profile.service.js";
import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";

const getProfile = async (req, res) => {
  try {
    const result = await UserProfileService.getProfile(req.user.id);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Profile fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const updateData = {};

    // Handle Name splitting
    if (name) {
      const nameParts = name.trim().split(/\s+/);
      updateData.firstName = nameParts[0] || "";
      updateData.lastName = nameParts.slice(1).join(" ") || "";
    }

    // Handle Avatar File Upload
    if (req.file) {
      // Create file URL (served statically via app.use("/uploads", ...))
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    } else if (avatar) {
      // Fallback to URL if provided in body and no file uploaded
      updateData.avatar = avatar;
    }

    const result = await UserProfileService.updateProfile(req.user.id, updateData);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("updateProfile error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const UserProfileController = {
  getProfile,
  updateProfile,
};
