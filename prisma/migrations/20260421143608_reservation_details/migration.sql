-- AlterTable
ALTER TABLE `reservation` ADD COLUMN `appDocPath` VARCHAR(191) NULL,
    ADD COLUMN `clientName` VARCHAR(191) NULL,
    ADD COLUMN `computation` VARCHAR(191) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `govIdPath` VARCHAR(191) NULL,
    ADD COLUMN `paymentPath` VARCHAR(191) NULL,
    ADD COLUMN `sdp` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending_fulfillment';
