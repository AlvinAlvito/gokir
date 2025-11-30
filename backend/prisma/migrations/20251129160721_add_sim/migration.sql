-- AlterTable
ALTER TABLE `driverprofile` ADD COLUMN `simCardUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `orderrating` ALTER COLUMN `updatedAt` DROP DEFAULT;
