/*
  Warnings:

  - You are about to drop the `_reviewedby` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_reviewedby` DROP FOREIGN KEY `_ReviewedBy_A_fkey`;

-- DropForeignKey
ALTER TABLE `_reviewedby` DROP FOREIGN KEY `_ReviewedBy_B_fkey`;

-- AlterTable
ALTER TABLE `driverprofile` ADD COLUMN `reviewedById` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `_reviewedby`;

-- AddForeignKey
ALTER TABLE `DriverProfile` ADD CONSTRAINT `DriverProfile_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
