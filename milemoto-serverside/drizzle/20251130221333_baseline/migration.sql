CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `name` UNIQUE INDEX(`name`),
	CONSTRAINT `slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parentId` int,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`stateId` bigint unsigned NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`statusEffective` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqCitiesStateName` UNIQUE INDEX(`stateId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `collection_products` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`collectionId` int NOT NULL,
	`productVariantId` bigint unsigned NOT NULL,
	`position` int DEFAULT 0,
	`reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqCollectionProduct` UNIQUE INDEX(`productVariantId`,`collectionId`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`type` enum('manual','automatic') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`matchType` enum('all','any') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
	`rulesJson` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqCollectionSlug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `companyprofile` (
	`id` tinyint unsigned PRIMARY KEY DEFAULT 1,
	`name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`publicEmail` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`phone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`website` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`city` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`state` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`zip` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`countryId` bigint unsigned,
	`latitude` decimal(10,6),
	`longitude` decimal(10,6),
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `idxCountriesCode` UNIQUE INDEX(`code`)
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`code` varchar(10) NOT NULL,
	`symbol` varchar(10) NOT NULL,
	`exchangeRate` decimal(15,8) NOT NULL DEFAULT (1),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueCurrencyCode` UNIQUE INDEX(`code`)
);
--> statement-breakpoint
CREATE TABLE `emaildeliverylogs` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`provider` varchar(50) NOT NULL DEFAULT 'smtp',
	`toEmail` varchar(191) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`status` enum('sent','failed') NOT NULL,
	`messageId` varchar(191),
	`response` longtext,
	`error` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `emailverifications` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`email` varchar(191),
	`tokenHash` char(64) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`usedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `tokenHash` UNIQUE INDEX(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `goodsreceiptlines` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`goodsReceiptId` bigint unsigned NOT NULL,
	`purchaseOrderLineId` bigint unsigned NOT NULL,
	`productVariantId` bigint unsigned NOT NULL,
	`receivedQty` int NOT NULL,
	`rejectedQty` int NOT NULL DEFAULT 0,
	`batchNumber` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`serialNumber` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`expirationDate` date
);
--> statement-breakpoint
CREATE TABLE `goodsreceipts` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`purchaseOrderId` bigint unsigned NOT NULL,
	`grnNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('draft','posted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
	`note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`postedByUserId` bigint unsigned DEFAULT (NULL),
	`postedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqGrnNumber` UNIQUE INDEX(`grnNumber`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `name` UNIQUE INDEX(`name`),
	CONSTRAINT `slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `inboundshippingmethods` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `code` UNIQUE INDEX(`code`)
);
--> statement-breakpoint
CREATE TABLE `languages` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`code` varchar(10) NOT NULL,
	`displayMode` enum('LTR','RTL') NOT NULL DEFAULT 'LTR',
	`countryCode` varchar(10),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueLanguageCode` UNIQUE INDEX(`code`)
);
--> statement-breakpoint
CREATE TABLE `mailsettings` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`host` varchar(255),
	`port` int,
	`username` varchar(255),
	`passwordEnc` blob,
	`encryption` enum('none','tls','ssl') NOT NULL DEFAULT 'tls',
	`fromName` varchar(100),
	`fromEmail` varchar(191),
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `mfabackupcodes` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`codeHash` char(64) NOT NULL,
	`usedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqUserCode` UNIQUE INDEX(`userId`,`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `mfachallenges` (
	`id` char(26) PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`secretEnc` blob NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`expiresAt` datetime NOT NULL,
	`consumedAt` datetime
);
--> statement-breakpoint
CREATE TABLE `mfaloginchallenges` (
	`id` char(26) PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`remember` boolean NOT NULL DEFAULT false,
	`userAgent` varchar(255),
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`expiresAt` datetime NOT NULL,
	`consumedAt` datetime
);
--> statement-breakpoint
CREATE TABLE `passwordresets` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`tokenHash` char(64) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`usedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `tokenHash` UNIQUE INDEX(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `paymentmethods` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueName` UNIQUE INDEX(`name`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`slug` varchar(100) NOT NULL,
	`description` varchar(255) NOT NULL,
	`resourceGroup` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `phoneverifications` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`phone` varchar(32) NOT NULL,
	`codeHash` char(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` datetime NOT NULL,
	`usedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqPhoneVerifCode` UNIQUE INDEX(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `productimages` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`productId` bigint unsigned NOT NULL,
	`productVariantId` bigint unsigned DEFAULT (NULL),
	`imagePath` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`isPrimary` boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`brandId` int,
	`categoryId` int,
	`subCategoryId` int,
	`vendorId` int,
	`warrantyId` int,
	`shippingMethodId` int,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`gradeId` int,
	`shortDescription` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
	`longDescription` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	CONSTRAINT `slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `productspecificationfields` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`productSpecificationId` int NOT NULL,
	`unitFieldId` int NOT NULL,
	`value` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `productspecifications` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`productId` bigint unsigned NOT NULL,
	`unitGroupId` int NOT NULL,
	`unitValueId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `productvariantattributes` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`productVariantId` bigint unsigned NOT NULL,
	`variantValueId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `productvariants` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`productId` bigint unsigned NOT NULL,
	`sku` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`barcode` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`price` decimal(15,2) NOT NULL DEFAULT (0),
	`costPrice` decimal(15,2) DEFAULT (NULL),
	`lowStockThreshold` int DEFAULT 5,
	`idealStockQuantity` int,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueBarcode` UNIQUE INDEX(`barcode`),
	CONSTRAINT `uniqueSku` UNIQUE INDEX(`sku`)
);
--> statement-breakpoint
CREATE TABLE `purchaseorderlines` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`purchaseOrderId` bigint unsigned NOT NULL,
	`productVariantId` bigint unsigned NOT NULL,
	`description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`orderedQty` int NOT NULL,
	`unitCost` decimal(15,2) NOT NULL,
	`taxId` int,
	`expectedLineDeliveryDate` date,
	`comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`receivedQty` int NOT NULL DEFAULT 0,
	`rejectedQty` int NOT NULL DEFAULT 0,
	`cancelledQty` int NOT NULL DEFAULT 0,
	`lineSubtotal` decimal(15,2) NOT NULL DEFAULT (0),
	`lineTax` decimal(15,2) NOT NULL DEFAULT (0),
	`lineTotal` decimal(15,2) NOT NULL DEFAULT (0)
);
--> statement-breakpoint
CREATE TABLE `purchaseorders` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`poNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`vendorId` int NOT NULL,
	`stockLocationId` int NOT NULL,
	`currencyId` int NOT NULL,
	`paymentTerms` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`expectedDeliveryDate` date,
	`paymentMethodId` int NOT NULL,
	`inboundShippingMethodId` int,
	`shippingCost` decimal(15,2) DEFAULT (NULL),
	`discountType` enum('fixed','percentage') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`discountValue` decimal(15,2) DEFAULT (NULL),
	`subtotal` decimal(15,2) NOT NULL DEFAULT (0),
	`discountAmount` decimal(15,2) NOT NULL DEFAULT (0),
	`taxTotal` decimal(15,2) NOT NULL DEFAULT (0),
	`total` decimal(15,2) NOT NULL DEFAULT (0),
	`status` enum('draft','pending_approval','approved','partially_received','fully_received','closed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
	`supplierRef` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`internalNote` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`createdByUserId` bigint unsigned NOT NULL,
	`approvedByUserId` bigint unsigned DEFAULT (NULL),
	`approvedAt` datetime,
	`cancelledAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqPoNumber` UNIQUE INDEX(`poNumber`)
);
--> statement-breakpoint
CREATE TABLE `rolepermissions` (
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqRolePermissionsRolePerm` UNIQUE INDEX(`roleId`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`isSystem` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `name` UNIQUE INDEX(`name`)
);
--> statement-breakpoint
CREATE TABLE `runtimeFlags` (
	`flagKey` varchar(64) PRIMARY KEY,
	`boolValue` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(26) PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`refreshHash` char(64) NOT NULL,
	`userAgent` varchar(255),
	`ip` varchar(64),
	`remember` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`expiresAt` datetime NOT NULL,
	`revokedAt` datetime,
	`replacedBy` char(26)
);
--> statement-breakpoint
CREATE TABLE `shippingarearates` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`countryId` bigint unsigned NOT NULL,
	`stateId` bigint unsigned,
	`cityId` bigint unsigned,
	`cost` decimal(10,2) NOT NULL,
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueLocationRate` UNIQUE INDEX(`cityId`,`countryId`,`stateId`)
);
--> statement-breakpoint
CREATE TABLE `shippingmethods` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
	`cost` decimal(10,2) DEFAULT (NULL),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `code` UNIQUE INDEX(`code`)
);
--> statement-breakpoint
CREATE TABLE `sitesettings` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`description` varchar(255),
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `settingKey` UNIQUE INDEX(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `smsdeliveryreports` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`provider` varchar(50) NOT NULL,
	`channel` enum('sms','whatsapp') NOT NULL DEFAULT 'sms',
	`gatewayId` int,
	`messageId` varchar(100) NOT NULL,
	`toNumber` varchar(32) NOT NULL,
	`statusGroup` varchar(50),
	`statusGroupId` int,
	`statusName` varchar(100),
	`statusId` int,
	`statusDescription` varchar(255),
	`errorName` varchar(100),
	`errorDescription` varchar(255),
	`bulkId` varchar(100),
	`sentAt` datetime,
	`doneAt` datetime,
	`rawPayload` longtext,
	`receivedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqSmsDeliveryProviderMessage` UNIQUE INDEX(`provider`,`messageId`)
);
--> statement-breakpoint
CREATE TABLE `smsgateways` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`provider` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
	`configJson` text NOT NULL DEFAULT ('{}'),
	`secretEnc` blob,
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqSmsGatewayProviderName` UNIQUE INDEX(`provider`,`name`)
);
--> statement-breakpoint
CREATE TABLE `smsusage` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`gatewayId` int NOT NULL,
	`channel` enum('sms','whatsapp') NOT NULL,
	`usageDate` date NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqSmsUsageGatewayChannelDay` UNIQUE INDEX(`gatewayId`,`channel`,`usageDate`)
);
--> statement-breakpoint
CREATE TABLE `states` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`countryId` bigint unsigned NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`statusEffective` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqStatesCountryName` UNIQUE INDEX(`name`,`countryId`)
);
--> statement-breakpoint
CREATE TABLE `stocklevels` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`productVariantId` bigint unsigned NOT NULL,
	`stockLocationId` int NOT NULL,
	`onHand` int NOT NULL DEFAULT 0,
	`allocated` int NOT NULL DEFAULT 0,
	`onOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqStockLevelVariantLocation` UNIQUE INDEX(`productVariantId`,`stockLocationId`)
);
--> statement-breakpoint
CREATE TABLE `stocklocations` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`type` enum('Warehouse','Store','Office','Factory','Others') NOT NULL,
	`description` text,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`postalCode` varchar(20),
	`country` varchar(100)
);
--> statement-breakpoint
CREATE TABLE `stockmovements` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`productVariantId` bigint unsigned NOT NULL,
	`stockLocationId` int NOT NULL,
	`performedByUserId` bigint unsigned,
	`quantity` int NOT NULL,
	`type` enum('purchase_receipt','purchase_return','sale_shipment','adjustment','transfer_in','transfer_out') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`referenceType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`referenceId` bigint unsigned,
	`note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `taxes` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`rate` decimal(10,4) NOT NULL DEFAULT (0),
	`type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`countryId` bigint unsigned,
	`createdAt` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` datetime DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `trusteddevices` (
	`id` char(26) PRIMARY KEY,
	`userId` bigint unsigned NOT NULL,
	`tokenHash` char(64) NOT NULL,
	`fingerPrint` char(64),
	`userAgent` varchar(255),
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`lastUsedAt` datetime,
	`expiresAt` datetime NOT NULL,
	`revokedAt` datetime,
	CONSTRAINT `uniqUserToken` UNIQUE INDEX(`userId`,`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `unitfields` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`unitGroupId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`required` boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `unitgroups` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `unitvalues` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`unitGroupId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
	`fullName` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`username` varchar(191),
	`phone` varchar(32),
	`passwordHash` varchar(191) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
	`mfaEnabled` boolean NOT NULL DEFAULT false,
	`mfaSecretEnc` blob,
	`emailVerifiedAt` datetime,
	`phoneVerifiedAt` datetime,
	`googleSub` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`roleId` int,
	CONSTRAINT `email` UNIQUE INDEX(`email`),
	CONSTRAINT `googleSub` UNIQUE INDEX(`googleSub`),
	CONSTRAINT `uniqUsersPhone` UNIQUE INDEX(`phone`),
	CONSTRAINT `username` UNIQUE INDEX(`username`)
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `name` UNIQUE INDEX(`name`),
	CONSTRAINT `slug` UNIQUE INDEX(`slug`)
);
--> statement-breakpoint
CREATE TABLE `variantvalues` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`variantId` int NOT NULL,
	`value` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueVariantSlug` UNIQUE INDEX(`slug`,`variantId`),
	CONSTRAINT `uniqueVariantValue` UNIQUE INDEX(`value`,`variantId`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`phoneNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`phoneCode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueName` UNIQUE INDEX(`name`)
);
--> statement-breakpoint
CREATE TABLE `warranties` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
	`description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
	`status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `uniqueName` UNIQUE INDEX(`name`)
);
--> statement-breakpoint
CREATE INDEX `idxSlug` ON `brands` (`slug`);--> statement-breakpoint
CREATE INDEX `idxStatus` ON `brands` (`status`);--> statement-breakpoint
CREATE INDEX `idxParentId` ON `categories` (`parentId`);--> statement-breakpoint
CREATE INDEX `idxSlug` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idxStatus` ON `categories` (`status`);--> statement-breakpoint
CREATE INDEX `idxCitiesStateId` ON `cities` (`stateId`);--> statement-breakpoint
CREATE INDEX `idxCitiesStatus` ON `cities` (`status`);--> statement-breakpoint
CREATE INDEX `idxCollection` ON `collection_products` (`collectionId`);--> statement-breakpoint
CREATE INDEX `idxProductVariant` ON `collection_products` (`productVariantId`);--> statement-breakpoint
CREATE INDEX `idxCollectionStatus` ON `collections` (`status`);--> statement-breakpoint
CREATE INDEX `idxCollectionType` ON `collections` (`type`);--> statement-breakpoint
CREATE INDEX `idxCountriesStatus` ON `countries` (`status`);--> statement-breakpoint
CREATE INDEX `idxEmailDeliveryTo` ON `emaildeliverylogs` (`toEmail`);--> statement-breakpoint
CREATE INDEX `idxEmailDeliveryStatus` ON `emaildeliverylogs` (`status`);--> statement-breakpoint
CREATE INDEX `idxEmailVerifUser` ON `emailverifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idxEmailVerifEmail` ON `emailverifications` (`email`);--> statement-breakpoint
CREATE INDEX `idxGoodsReceiptLinesGrn` ON `goodsreceiptlines` (`goodsReceiptId`);--> statement-breakpoint
CREATE INDEX `idxGoodsReceiptLinesPoLine` ON `goodsreceiptlines` (`purchaseOrderLineId`);--> statement-breakpoint
CREATE INDEX `idxGoodsReceiptsPo` ON `goodsreceipts` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idxGoodsReceiptsPostedAt` ON `goodsreceipts` (`postedAt`);--> statement-breakpoint
CREATE INDEX `idxSlug` ON `grades` (`slug`);--> statement-breakpoint
CREATE INDEX `idxStatus` ON `grades` (`status`);--> statement-breakpoint
CREATE INDEX `idxMailSettingsHost` ON `mailsettings` (`host`);--> statement-breakpoint
CREATE INDEX `idxMfaCodesUsed` ON `mfabackupcodes` (`usedAt`);--> statement-breakpoint
CREATE INDEX `idxMfaChExp` ON `mfachallenges` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idxMfaLoginExp` ON `mfaloginchallenges` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idxPwActive` ON `passwordresets` (`expiresAt`,`userId`,`usedAt`);--> statement-breakpoint
CREATE INDEX `idxPwUser` ON `passwordresets` (`userId`);--> statement-breakpoint
CREATE INDEX `idxStatus` ON `paymentmethods` (`status`);--> statement-breakpoint
CREATE INDEX `idxPhoneVerifUser` ON `phoneverifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idxPurchaseOrderLinesPo` ON `purchaseorderlines` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idxPurchaseOrderLinesVariant` ON `purchaseorderlines` (`productVariantId`);--> statement-breakpoint
CREATE INDEX `idxPurchaseOrdersCreatedAt` ON `purchaseorders` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idxPurchaseOrdersCurrency` ON `purchaseorders` (`currencyId`);--> statement-breakpoint
CREATE INDEX `idxPurchaseOrdersStatus` ON `purchaseorders` (`status`);--> statement-breakpoint
CREATE INDEX `idxPurchaseOrdersVendor` ON `purchaseorders` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idxSessionsRevoked` ON `sessions` (`revokedAt`);--> statement-breakpoint
CREATE INDEX `idxSessionsUserExpires` ON `sessions` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `cityId` ON `shippingarearates` (`cityId`);--> statement-breakpoint
CREATE INDEX `stateId` ON `shippingarearates` (`stateId`);--> statement-breakpoint
CREATE INDEX `idxSettingKey` ON `sitesettings` (`settingKey`);--> statement-breakpoint
CREATE INDEX `idxSmsDeliveryMessage` ON `smsdeliveryreports` (`messageId`);--> statement-breakpoint
CREATE INDEX `idxSmsDeliveryTo` ON `smsdeliveryreports` (`toNumber`);--> statement-breakpoint
CREATE INDEX `idxSmsDeliveryStatus` ON `smsdeliveryreports` (`statusName`);--> statement-breakpoint
CREATE INDEX `idxSmsGatewaysStatus` ON `smsgateways` (`status`);--> statement-breakpoint
CREATE INDEX `idxSmsUsageGateway` ON `smsusage` (`gatewayId`);--> statement-breakpoint
CREATE INDEX `idxStatesCountryId` ON `states` (`countryId`);--> statement-breakpoint
CREATE INDEX `idxStatesStatus` ON `states` (`status`);--> statement-breakpoint
CREATE INDEX `idxStockLevelsLocation` ON `stocklevels` (`stockLocationId`);--> statement-breakpoint
CREATE INDEX `idxStockMovementsLocation` ON `stockmovements` (`stockLocationId`);--> statement-breakpoint
CREATE INDEX `idxStockMovementsVariant` ON `stockmovements` (`productVariantId`);--> statement-breakpoint
CREATE INDEX `idxStockMovementsActor` ON `stockmovements` (`performedByUserId`);--> statement-breakpoint
CREATE INDEX `idxTaxesCountryId` ON `taxes` (`countryId`);--> statement-breakpoint
CREATE INDEX `idxTrustedExpires` ON `trusteddevices` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idxTrustedRevoked` ON `trusteddevices` (`revokedAt`);--> statement-breakpoint
CREATE INDEX `idxTrustedUserExpires` ON `trusteddevices` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `unitGroupId` ON `unitfields` (`unitGroupId`);--> statement-breakpoint
CREATE INDEX `unitGroupId` ON `unitvalues` (`unitGroupId`);--> statement-breakpoint
CREATE INDEX `idxName` ON `variants` (`name`);--> statement-breakpoint
CREATE INDEX `idxStatus` ON `variants` (`status`);--> statement-breakpoint
CREATE INDEX `idxStatus` ON `variantvalues` (`status`);--> statement-breakpoint
CREATE INDEX `idxVariantId` ON `variantvalues` (`variantId`);--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `fkCitiesStateId` FOREIGN KEY (`stateId`) REFERENCES `states`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `collection_products` ADD CONSTRAINT `fkCollProdCollection` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `collection_products` ADD CONSTRAINT `fkCollProdVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `companyprofile` ADD CONSTRAINT `fkCompanyProfileCountry` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `emailverifications` ADD CONSTRAINT `fkEmailVerifUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `goodsreceiptlines` ADD CONSTRAINT `fkGoodsReceiptLinesGrn` FOREIGN KEY (`goodsReceiptId`) REFERENCES `goodsreceipts`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `goodsreceiptlines` ADD CONSTRAINT `fkGoodsReceiptLinesPoLine` FOREIGN KEY (`purchaseOrderLineId`) REFERENCES `purchaseorderlines`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `goodsreceiptlines` ADD CONSTRAINT `fkGoodsReceiptLinesVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `goodsreceipts` ADD CONSTRAINT `fkGoodsReceiptsPo` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseorders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `goodsreceipts` ADD CONSTRAINT `fkGoodsReceiptsPostedBy` FOREIGN KEY (`postedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `mfabackupcodes` ADD CONSTRAINT `fkMfaCodesUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `mfachallenges` ADD CONSTRAINT `fkMfaChUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `mfaloginchallenges` ADD CONSTRAINT `fkMfaLoginUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `passwordresets` ADD CONSTRAINT `fkPwUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `phoneverifications` ADD CONSTRAINT `fkPhoneVerifUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `productimages` ADD CONSTRAINT `fkImgProduct` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productimages` ADD CONSTRAINT `fkImgVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsBrand` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsCategory` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsGrade` FOREIGN KEY (`gradeId`) REFERENCES `grades`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsShippingMethod` FOREIGN KEY (`shippingMethodId`) REFERENCES `shippingmethods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsSubCategory` FOREIGN KEY (`subCategoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsVendor` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fkProductsWarranty` FOREIGN KEY (`warrantyId`) REFERENCES `warranties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productspecificationfields` ADD CONSTRAINT `fkSpecFieldsSpec` FOREIGN KEY (`productSpecificationId`) REFERENCES `productspecifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productspecificationfields` ADD CONSTRAINT `fkSpecFieldsUnitField` FOREIGN KEY (`unitFieldId`) REFERENCES `unitfields`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productspecifications` ADD CONSTRAINT `fkProdSpecsProduct` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productspecifications` ADD CONSTRAINT `fkProdSpecsUnitGroup` FOREIGN KEY (`unitGroupId`) REFERENCES `unitgroups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productspecifications` ADD CONSTRAINT `fkProdSpecsUnitValue` FOREIGN KEY (`unitValueId`) REFERENCES `unitvalues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productvariantattributes` ADD CONSTRAINT `fkVarAttrValue` FOREIGN KEY (`variantValueId`) REFERENCES `variantvalues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productvariantattributes` ADD CONSTRAINT `fkVarAttrVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `productvariants` ADD CONSTRAINT `fkVariantProduct` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `purchaseorderlines` ADD CONSTRAINT `fkPurchaseOrderLinesPo` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseorders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorderlines` ADD CONSTRAINT `fkPurchaseOrderLinesTax` FOREIGN KEY (`taxId`) REFERENCES `taxes`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorderlines` ADD CONSTRAINT `fkPurchaseOrderLinesVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersApprovedBy` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersCreatedBy` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersCurrency` FOREIGN KEY (`currencyId`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersPaymentMethod` FOREIGN KEY (`paymentMethodId`) REFERENCES `paymentmethods`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersStockLocation` FOREIGN KEY (`stockLocationId`) REFERENCES `stocklocations`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersInboundShippingMethod` FOREIGN KEY (`inboundShippingMethodId`) REFERENCES `inboundshippingmethods`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `purchaseorders` ADD CONSTRAINT `fkPurchaseOrdersVendor` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `rolepermissions` ADD CONSTRAINT `fkRolePermPerm` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `rolepermissions` ADD CONSTRAINT `fkRolePermRole` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `fkSessionsUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `shippingarearates` ADD CONSTRAINT `shippingarearates_ibfk_1` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `shippingarearates` ADD CONSTRAINT `shippingarearates_ibfk_2` FOREIGN KEY (`stateId`) REFERENCES `states`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `shippingarearates` ADD CONSTRAINT `shippingarearates_ibfk_3` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `smsdeliveryreports` ADD CONSTRAINT `fkSmsDeliveryGateway` FOREIGN KEY (`gatewayId`) REFERENCES `smsgateways`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `smsusage` ADD CONSTRAINT `fkSmsUsageGateway` FOREIGN KEY (`gatewayId`) REFERENCES `smsgateways`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `states` ADD CONSTRAINT `fkStatesCountryId` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `stocklevels` ADD CONSTRAINT `fkStockLevelsLocation` FOREIGN KEY (`stockLocationId`) REFERENCES `stocklocations`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `stocklevels` ADD CONSTRAINT `fkStockLevelsVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `stockmovements` ADD CONSTRAINT `fkStockMovementsLocation` FOREIGN KEY (`stockLocationId`) REFERENCES `stocklocations`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `stockmovements` ADD CONSTRAINT `fkStockMovementsVariant` FOREIGN KEY (`productVariantId`) REFERENCES `productvariants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `stockmovements` ADD CONSTRAINT `fkStockMovementsActor` FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `taxes` ADD CONSTRAINT `fkTaxesCountry` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE `trusteddevices` ADD CONSTRAINT `fkTrustedUser` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `unitfields` ADD CONSTRAINT `unitfields_ibfk_1` FOREIGN KEY (`unitGroupId`) REFERENCES `unitgroups`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `unitvalues` ADD CONSTRAINT `unitvalues_ibfk_1` FOREIGN KEY (`unitGroupId`) REFERENCES `unitgroups`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `fkUserRole` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;--> statement-breakpoint
ALTER TABLE `variantvalues` ADD CONSTRAINT `variantvalues_ibfk_1` FOREIGN KEY (`variantId`) REFERENCES `variants`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;