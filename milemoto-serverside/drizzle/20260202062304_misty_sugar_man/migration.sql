ALTER TABLE `stockmovements` ADD `transferId` varchar(36);--> statement-breakpoint
CREATE INDEX `idxStockMovementsTransfer` ON `stockmovements` (`transferId`);