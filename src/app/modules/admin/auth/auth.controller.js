import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { AdminAuthService } from "./auth.service.js";
import { envVars } from "../../../config/env.js";

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: envVars.NODE_ENV === "production",
  sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/admin/auth/refresh-token",
});

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AdminAuthService.login(prisma, email, password);

    // Store refresh token in HttpOnly cookie (safer than JSON body)
    res.cookie("refreshToken", result.tokens.refreshToken, getRefreshCookieOptions());

    return res.json({
      success: true,
      message: "Admin logged in successfully",
      data: {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
        },
      },
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

const adminRefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const result = await AdminAuthService.refreshSession(prisma, refreshToken);

    // Rotate refresh token
    res.cookie("refreshToken", result.tokens.refreshToken, getRefreshCookieOptions());

    return res.json({
      success: true,
      message: "Access token refreshed successfully",
      data: {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
        },
      },
    });
  } catch (error) {
    console.error("adminRefreshToken error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to refresh token",
    });
  }
};

const adminLogout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", getRefreshCookieOptions());

    return res.json({
      success: true,
      message: "Logged out successfully",
      data: null,
    });
  } catch (error) {
    console.error("adminLogout error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

export const AdminAuthController = {
  adminLogin,
  adminRefreshToken,
  adminLogout,
  adminForgotPassword,
  adminForgotPasswordVerify,
  adminForgotPasswordReset,
  adminChangePassword,
};
