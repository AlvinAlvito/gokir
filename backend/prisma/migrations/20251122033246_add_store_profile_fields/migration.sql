/*
  Warnings:

  - A unique constraint covering the columns `[midtransOrderId]` on the table `TicketOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `storeprofile` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `mapsUrl` VARCHAR(191) NULL,
    ADD COLUMN `ownerName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ticketorder` ADD COLUMN `midtransOrderId` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatusRaw` VARCHAR(191) NULL,
    ADD COLUMN `paymentUrl` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `TicketOrder_midtransOrderId_key` ON `TicketOrder`(`midtransOrderId`);
