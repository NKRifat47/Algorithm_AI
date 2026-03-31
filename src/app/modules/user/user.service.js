import { envVars } from "../../config/env.js";
import DevBuildError from "../../lib/DevBuildError.js";
import bcrypt from "bcrypt";
import { Role } from "../../utils/role.js";

export const UserService = {

  // BASIC FIND METHODS

  findByEmail: async (prisma, email) =>
    prisma.user.findUnique({ where: { email } }),

  findByUsername: async (prisma, username) =>
    prisma.user.findUnique({ where: { username } }),

  findById: async (prisma, id) =>
    prisma.user.findUnique({ where: { id } }),


  // ✅ ONLY USER INFO (NO PROFILE)

  findUserInfoById: async (prisma, id) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),


  // UPDATE / DELETE

  update: async (prisma, id, data) =>
    prisma.user.update({
      where: { id },
      data,
    }),

  delete: async (prisma, id) =>
    prisma.user.delete({
      where: { id },
    }),


  // USER + FULL PROFILE

  findByIdWithProfile: async (prisma, id) =>
    prisma.user.findUnique({
      where: { id },
    }),

  findAllWithProfile: async (prisma) =>
    prisma.user.findMany({}),

  updateAvatar: async (prisma, id, avatarUrl, avatarUrlPath) =>
    prisma.user.update({
      where: { id },
      data: { avatarUrl, avatarUrlPath },
    }),
};


export const createUserService = async (payload) => {
  const { prisma, email, password, picture, role, ...rest } = payload;

  if (!email || !password) {
    throw new DevBuildError("Email and password are required", 400);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new DevBuildError("User already exists", 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    Number(envVars.BCRYPT_SALT_ROUND || 10)
  );

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      avatarUrl: picture?.url,
      avatarUrlPath: picture?.path,
      isVerified: false,
      role: Role.CUSTOMER, // Default role
      oauthProvider: "email",
      ...rest,
    },
  });

  return user;
};



