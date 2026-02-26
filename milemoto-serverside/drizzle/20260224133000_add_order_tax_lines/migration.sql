CREATE TABLE `ordertaxlines` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `orderId` bigint unsigned NOT NULL,
  `taxId` int,
  `taxName` varchar(255) NOT NULL,
  `taxType` varchar(50) NOT NULL,
  `taxRate` decimal(10,4) NOT NULL,
  `countryId` bigint unsigned,
  `amount` decimal(15,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idxOrderTaxLinesOrder` (`orderId`),
  KEY `idxOrderTaxLinesTaxId` (`taxId`),
  CONSTRAINT `fkOrderTaxLinesOrder` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fkOrderTaxLinesTax` FOREIGN KEY (`taxId`) REFERENCES `taxes` (`id`) ON DELETE SET NULL ON UPDATE SET NULL
);

