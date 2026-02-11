CREATE TABLE `cartitems` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`cartId` bigint unsigned NOT NULL,
	`productVariantId` bigint unsigned NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`addedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqCartItemVariant` UNIQUE INDEX(`cartId`,`productVariantId`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqCartUser` UNIQUE INDEX(`userId`)
);
--> statement-breakpoint
CREATE INDEX `idxCartItemsCart` ON `cartitems` (`cartId`);--> statement-breakpoint
CREATE INDEX `idxCartItemsVariant` ON `cartitems` (`productVariantId`);--> statement-breakpoint
ALTER TABLE `cartitems` ADD CONSTRAINT `fkCartItemsCart` FOREIGN KEY (`cartId`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `cartitems` ADD CONSTRAINT `fkCartItemsVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `fkCartsUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;