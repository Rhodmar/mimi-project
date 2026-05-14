-- AlterTable
ALTER TABLE `reservation` ADD COLUMN `adminNote` VARCHAR(191) NULL,
    ADD COLUMN `resolvedAt` DATETIME(3) NULL;
