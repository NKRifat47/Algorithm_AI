import httpStatus from "http-status";
import { UserAuthService } from "./auth.service.js";
import { OtpService } from "../../otp/otp.service.js";
import prisma from "../../../prisma/client.js";
import DevBuildError from "../../../lib/DevBuildError.js";
import { envVars } from "../../../config/env.js";
import { generateTokens } from "../../../utils/generateToken.js";

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: envVars.NODE_ENV === "production",
  sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/user/auth/refresh-token",
});

const register = async (req, res) => {
  try {
    const result = await UserAuthService.register(prisma, req.body);

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: result,
    });
  } catch (error) {
    console.error("register error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register user",
    });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    await OtpService.sendOtp(prisma, email);

    return res.json({
      success: true,
      message: "OTP sent successfully to your email.",
      data: null,
    });
  } catch (error) {
    console.error("sendOtp error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    await OtpService.verifyOtp(prisma, email, otp);

    return res.json({
      success: true,
      message: "Email verified successfully. You can now login.",
      data: null,
    });
  } catch (error) {
    console.error("verifyOtp error:", error);

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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await UserAuthService.login(prisma, email, password);

    // Store refresh token in HttpOnly cookie (safer than JSON body)
    res.cookie(
      "refreshToken",
      result.tokens.refreshToken,
      getRefreshCookieOptions(),
    );

    return res.json({
      success: true,
      message: "User logged in successfully.",
      data: {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
        },
      },
    });
  } catch (error) {
    console.error("login error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to login user",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await OtpService.sendForgotPasswordOtp(prisma, email);

    return res.json({
      success: true,
      message: "Forgot password OTP sent to your email.",
      data: null,
    });
  } catch (error) {
    console.error("forgotPassword error:", error);

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

const verifyForgotPassword = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const resetToken = await OtpService.verifyForgotPasswordOtp(
      prisma,
      email,
      otp,
    );

    return res.json({
      success: true,
      message: "OTP verified. You can now reset your password.",
      data: { resetToken },
    });
  } catch (error) {
    console.error("verifyForgotPassword error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to verify forgot password OTP",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await UserAuthService.resetPassword(prisma, token, newPassword);

    return res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
      data: null,
    });
  } catch (error) {
    console.error("resetPassword error:", error);

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

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id: userId } = req.user;

    await UserAuthService.changePassword(
      prisma,
      userId,
      currentPassword,
      newPassword,
    );

    return res.json({
      success: true,
      message: "Password changed successfully.",
      data: null,
    });
  } catch (error) {
    console.error("changePassword error:", error);

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

const refreshToken = async (req, res) => {
  try {
    const rt = req.cookies?.refreshToken;
    const result = await UserAuthService.refreshSession(prisma, rt);

    // Rotate refresh token
    res.cookie(
      "refreshToken",
      result.tokens.refreshToken,
      getRefreshCookieOptions(),
    );

    return res.json({
      success: true,
      message: "Access token refreshed successfully.",
      data: {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
        },
      },
    });
  } catch (error) {
    console.error("refreshToken error:", error);

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

const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", getRefreshCookieOptions());

    return res.json({
      success: true,
      message: "Logged out successfully",
      data: null,
    });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

const googleCallback = async (req, res) => {
  try {
    // passport sets req.user
    const user = req.user;
    if (!user) {
      throw new DevBuildError("Google authentication failed", 401);
    }

    const tokens = generateTokens(user);

    // Store refresh token in HttpOnly cookie (same as login)
    res.cookie("refreshToken", tokens.refreshToken, getRefreshCookieOptions());

    const frontEndBase =
      envVars.FRONT_END_URL || "http://localhost:5173";
    const redirectUrl = `${frontEndBase.replace(/\/$/, "")}/auth/google/success?accessToken=${encodeURIComponent(
      tokens.accessToken,
    )}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("googleCallback error:", error);

    const frontEndBase = envVars.FRONT_END_URL || "http://localhost:5173";
    const redirectUrl = `${frontEndBase.replace(/\/$/, "")}/auth/google/success?error=${encodeURIComponent(
      error?.message || "Google authentication failed",
    )}`;
    return res.redirect(redirectUrl);
  }
};

export const UserAuthController = {
  register,
  sendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyForgotPassword,
  resetPassword,
  changePassword,
  googleCallback,
};
