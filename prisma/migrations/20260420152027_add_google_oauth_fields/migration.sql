-- AlterTable
ALTER TABLE "User" ADD COLUMN     "oauthProvider" TEXT,
ADD COLUMN     "oauthProviderId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
