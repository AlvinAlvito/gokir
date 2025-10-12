/*
  Warnings:

  - You are about to drop the column `reviewedById` on the `driverprofile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `driverprofile` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `driverprofile` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `VarChar(191)`.

*/
-- DropForeignKey
ALTER TABLE `driverprofile` DROP FOREIGN KEY `DriverProfile_reviewedById_fkey`;

-- DropIndex
DROP INDEX `DriverProfile_reviewedById_fkey` ON `driverprofile`;

-- AlterTable
ALTER TABLE `driverprofile` DROP COLUMN `reviewedById`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `whatsapp` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `_ReviewedBy` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ReviewedBy_AB_unique`(`A`, `B`),
    INDEX `_ReviewedBy_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_ReviewedBy` ADD CONSTRAINT `_ReviewedBy_A_fkey` FOREIGN KEY (`A`) REFERENCES `DriverProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ReviewedBy` ADD CONSTRAINT `_ReviewedBy_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
