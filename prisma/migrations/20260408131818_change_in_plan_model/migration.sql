/*
  Warnings:

  - You are about to drop the column `price` on the `Plan` table. All the data in the column will be lost.
  - Added the required column `monthlyPrice` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearlyPrice` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "price",
ADD COLUMN     "monthlyPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "stripeMonthlyPriceId" TEXT,
ADD COLUMN     "stripeYearlyPriceId" TEXT,
ADD COLUMN     "yearlyPrice" DOUBLE PRECISION NOT NULL;
