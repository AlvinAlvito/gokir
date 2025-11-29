-- DropForeignKey
ALTER TABLE `orderrating` DROP FOREIGN KEY `OrderRating_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `orderrating` DROP FOREIGN KEY `OrderRating_orderId_fkey`;

-- DropIndex
DROP INDEX `OrderRating_customerId_fkey` ON `orderrating`;

-- AlterTable
ALTER TABLE `orderrating` MODIFY `comment` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `OrderRating` ADD CONSTRAINT `OrderRating_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `CustomerOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRating` ADD CONSTRAINT `OrderRating_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
