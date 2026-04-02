import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminAuthService } from "./auth.service.js";

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AdminAuthService.login(prisma, email, password);

    return res.json({
      success: true,
      message: "Admin logged in successfully",
      data: result,
    });
  } catch (error) {
    console.error("adminLogin error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to login admin",
    });
  }
};

const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await AdminAuthService.sendForgotPasswordOtp(prisma, email);

    return res.json({
      success: true,
      message: "OTP sent to admin email successfully",
      data: null,
    });
  } catch (error) {
    console.error("adminForgotPassword error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send forgot password OTP",
    });
  }
};

const adminForgotPasswordVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const resetToken = await AdminAuthService.verifyForgotPasswordOtp(
      prisma,
      email,
      otp,
    );

    return res.json({
      success: true,
      message: "OTP verified successfully",
      data: { resetToken },
    });
  } catch (error) {
    console.error("adminForgotPasswordVerify error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

const adminForgotPasswordReset = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    await AdminAuthService.resetPassword(
      prisma,
      token,
      newPassword,
      confirmPassword,
    );

    return res.json({
      success: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    console.error("adminForgotPasswordReset error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

const adminChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id: userId } = req.user;

    await AdminAuthService.changePassword(
      prisma,
      userId,
      currentPassword,
      newPassword,
    );

    return res.json({
      success: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    console.error("adminChangePassword error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

export const AdminAuthController = {
  adminLogin,
  adminForgotPassword,
  adminForgotPasswordVerify,
  adminForgotPasswordReset,
  adminChangePassword,
};
