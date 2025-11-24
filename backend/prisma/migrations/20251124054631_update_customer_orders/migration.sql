/*
  Warnings:

  - You are about to alter the column `status` on the `customerorder` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(11))` to `Enum(EnumId(9))`.

*/
-- DropForeignKey
ALTER TABLE `customerorder` DROP FOREIGN KEY `CustomerOrder_menuItemId_fkey`;

-- DropForeignKey
ALTER TABLE `customerorder` DROP FOREIGN KEY `CustomerOrder_storeId_fkey`;

-- DropIndex
DROP INDEX `CustomerOrder_menuItemId_fkey` ON `customerorder`;

-- AlterTable
ALTER TABLE `customerorder` ADD COLUMN `customStoreAddress` VARCHAR(191) NULL,
    ADD COLUMN `customStoreName` VARCHAR(191) NULL,
    ADD COLUMN `driverId` VARCHAR(191) NULL,
    ADD COLUMN `dropoffAddress` VARCHAR(191) NULL,
    ADD COLUMN `orderType` ENUM('FOOD_EXISTING_STORE', 'FOOD_CUSTOM_STORE', 'RIDE') NOT NULL DEFAULT 'FOOD_EXISTING_STORE',
    ADD COLUMN `pickupAddress` VARCHAR(191) NULL,
    MODIFY `storeId` VARCHAR(191) NULL,
    MODIFY `menuItemId` VARCHAR(191) NULL,
    MODIFY `quantity` INTEGER NULL,
    MODIFY `status` ENUM('WAITING_STORE_CONFIRM', 'REJECTED', 'CONFIRMED_COOKING', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'ON_DELIVERY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING_STORE_CONFIRM';

-- CreateIndex
CREATE INDEX `CustomerOrder_driverId_idx` ON `CustomerOrder`(`driverId`);

-- AddForeignKey
ALTER TABLE `CustomerOrder` ADD CONSTRAINT `CustomerOrder_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerOrder` ADD CONSTRAINT `CustomerOrder_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerOrder` ADD CONSTRAINT `CustomerOrder_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `CustomerOrder_storeId_idx` ON `CustomerOrder`(`storeId`);
