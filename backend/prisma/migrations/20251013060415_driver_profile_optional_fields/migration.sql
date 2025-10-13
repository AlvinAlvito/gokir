/*
  Warnings:

  - You are about to alter the column `status` on the `driverprofile` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `driverprofile` ADD COLUMN `address` VARCHAR(191) NULL,
    MODIFY `name` VARCHAR(191) NULL,
    MODIFY `nim` VARCHAR(191) NULL,
    MODIFY `birthPlace` VARCHAR(191) NULL,
    MODIFY `birthDate` DATETIME(3) NULL,
    MODIFY `idCardUrl` VARCHAR(191) NULL,
    MODIFY `studentCardUrl` VARCHAR(191) NULL,
    MODIFY `facePhotoUrl` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';
