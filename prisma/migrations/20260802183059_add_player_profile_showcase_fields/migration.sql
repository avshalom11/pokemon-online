-- AlterTable
ALTER TABLE "player_profile" ADD COLUMN     "aboutMe" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "avatarDexNumber" INTEGER,
ADD COLUMN     "profileThemeId" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "regionId" TEXT NOT NULL DEFAULT 'kanto',
ADD COLUMN     "showAboutMeOnProfile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPartyOnProfile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showStatsOnProfile" BOOLEAN NOT NULL DEFAULT true;
