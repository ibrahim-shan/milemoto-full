ALTER TABLE `purchaseorderlines`
  ADD COLUMN `taxName` varchar(255) NULL AFTER `taxId`,
  ADD COLUMN `taxType` varchar(50) NULL AFTER `taxName`,
  ADD COLUMN `taxRate` decimal(10,4) NULL AFTER `taxType`;
