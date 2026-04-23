import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import DevBuildError from "../../../lib/DevBuildError.js";
import { generateTokens } from "../../../utils/generateToken.js";
import { envVars } from "../../../config/env.js";
import { redisClient } from "../../../config/redis.config.js";
import { AdminNotificationService } from "../../admin/notification/notification.service.js";

const FREE_CREDITS_ON_SIGNUP = 300;

export const UserAuthService = {
  register: async (prisma, userData) => {
    const { firstName, lastName, email, password } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new DevBuildError("User with this email already exists", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isVerified: false,
        credits: FREE_CREDITS_ON_SIGNUP,
      },
    });

    await prisma.activityLog.create({
      data: {
        type: "USER_REGISTERED",
        message: "New user registered",
        userEmail: newUser.email,
        meta: {
          userId: newUser.id,
        },
      },
    });

    await AdminNotificationService.notifyAdmins(prisma, {
      type: "USER_REGISTERED",
      message: `${newUser.email} user registered in your system`,
      meta: { userId: newUser.id },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };
  },

  login: async (prisma, email, password) => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new DevBuildError("Invalid email or password", 401);
    }

    if (user.status === "BLOCKED") {
      throw new DevBuildError(
        "Your account has been blocked. Please contact support.",
        403,
      );
    }

    if (!user.isVerified) {
      throw new DevBuildError("Please verify your email first", 403);
    }

    if (!user.password) {
      throw new DevBuildError(
        "This account was created with Google. Please login with Google.",
        401,
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new DevBuildError("Invalid email or password", 401);
    }

    const tokens = generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        credits: user.credits,
      },
      tokens,
    };
  },

  refreshSession: async (prisma, refreshToken) => {
    if (!refreshToken) {
      throw new DevBuildError("Refresh token is required", 400);
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, envVars.JWT_REFRESH_TOKEN);
    } catch {
      throw new DevBuildError("Invalid or expired refresh token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || user.role !== "USER") {
      throw new DevBuildError("Invalid refresh token", 401);
    }

    const tokens = generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        credits: user.credits,
      },
      tokens,
    };
  },

  resetPassword: async (prisma, token, newPassword) => {
    if (!token || !newPassword) {
      throw new DevBuildError("Token and password are required", 400);
    }

    const tokenRedisKey = `user-reset-token:${token}`;
    const isTokenValid = await redisClient.get(tokenRedisKey);

    if (!isTokenValid) {
      throw new DevBuildError(
        "Reset token is invalid, expired, or has already been used",
        401,
      );
    }

    let payload;
    try {
      payload = jwt.verify(token, envVars.JWT_SECRET_TOKEN);
    } catch (error) {
      throw new DevBuildError("Invalid or expired reset token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    await redisClient.del(tokenRedisKey);
  },

  changePassword: async (prisma, userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new DevBuildError("Current password is incorrect", 401);
    }

    if (currentPassword === newPassword) {
      throw new DevBuildError(
        "New password must be different from the current password",
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });
  },
};
