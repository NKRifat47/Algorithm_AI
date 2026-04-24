/*
  Warnings:

  - You are about to drop the `ApiConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApiUsage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApiUsage" DROP CONSTRAINT "ApiUsage_userId_fkey";

-- DropTable
DROP TABLE "ApiConfig";

-- DropTable
DROP TABLE "ApiUsage";
