import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../utils/sendEmail.js";
import { generateTokens } from "../../../utils/generateToken.js";
import { envVars } from "../../../config/env.js";
import { redisClient } from "../../../config/redis.config.js";
import DevBuildError from "../../../lib/DevBuildError.js";

const OTP_EXPIRATION = 2 * 60; // 2 minutes

const generateOtp = (length = 6) =>
  crypto.randomInt(10 ** (length - 1), 10 ** length).toString();

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]?\$/.test(value);

export const AdminAuthService = {
  login: async (prisma, email, password) => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "ADMIN") {
      throw new DevBuildError("Invalid email or password", 401);
    }

    const storedPassword = user.passwordHash || user.password;
    if (!storedPassword) {
      throw new DevBuildError("Invalid email or password", 401);
    }

    let isMatch = false;
    if (isBcryptHash(storedPassword)) {
      isMatch = await bcrypt.compare(password, storedPassword);
    } else {
      isMatch = storedPassword === password;
    }

    if (!isMatch) {
      throw new DevBuildError("Invalid email or password", 401);
    }

    const tokens = generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  },

  sendForgotPasswordOtp: async (prisma, email) => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "ADMIN") {
      throw new DevBuildError("Admin user not found", 404);
    }

    const otp = generateOtp();
    const redisKey = `admin-forgot-password:${email}`;

    await redisClient.set(redisKey, otp, {
      EX: OTP_EXPIRATION,
    });

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    await sendEmail({
      to: email,
      subject: "Admin Forgot Password OTP",
      templateName: "forgotPassword",
      templateData: {
        name: fullName || email,
        otp,
      },
    });
  },

  verifyForgotPasswordOtp: async (prisma, email, otp) => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "ADMIN") {
      throw new DevBuildError("Admin user not found", 404);
    }

    const redisKey = `admin-forgot-password:${email}`;
    const savedOtp = await redisClient.get(redisKey);

    if (!savedOtp || savedOtp !== otp) {
      throw new DevBuildError("Invalid or expired OTP", 401);
    }

    await redisClient.del(redisKey);

    const resetToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      envVars.JWT_SECRET_TOKEN,
      { expiresIn: "10m" },
    );

    const tokenRedisKey = `admin-reset-token:${resetToken}`;
    await redisClient.set(tokenRedisKey, "valid", {
      EX: 10 * 60, // 10 minutes
    });

    return resetToken;
  },

  resetPassword: async (prisma, token, newPassword, confirmPassword) => {
    if (!token || !newPassword || !confirmPassword) {
      throw new DevBuildError("Token and password fields are required", 400);
    }

    if (newPassword !== confirmPassword) {
      throw new DevBuildError("Passwords do not match", 400);
    }

    const tokenRedisKey = `admin-reset-token:${token}`;
    const isTokenValid = await redisClient.get(tokenRedisKey);

    if (!isTokenValid) {
      throw new DevBuildError("Reset token is invalid, expired, or has already been used", 401);
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

    if (!user || user.role !== "ADMIN") {
      throw new DevBuildError("Admin user not found", 404);
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
};
