ALTER TABLE `orders`
  ADD COLUMN `billingFullName` varchar(255) NULL AFTER `shippingPostalCode`,
  ADD COLUMN `billingPhone` varchar(50) NULL AFTER `billingFullName`,
  ADD COLUMN `billingEmail` varchar(255) NULL AFTER `billingPhone`,
  ADD COLUMN `billingCountry` varchar(100) NULL AFTER `billingEmail`,
  ADD COLUMN `billingState` varchar(100) NULL AFTER `billingCountry`,
  ADD COLUMN `billingCity` varchar(100) NULL AFTER `billingState`,
  ADD COLUMN `billingAddressLine1` varchar(255) NULL AFTER `billingCity`,
  ADD COLUMN `billingAddressLine2` varchar(255) NULL AFTER `billingAddressLine1`,
  ADD COLUMN `billingPostalCode` varchar(50) NULL AFTER `billingAddressLine2`;

UPDATE `orders`
SET
  `billingFullName` = `shippingFullName`,
  `billingPhone` = `shippingPhone`,
  `billingEmail` = `shippingEmail`,
  `billingCountry` = `shippingCountry`,
  `billingState` = `shippingState`,
  `billingCity` = `shippingCity`,
  `billingAddressLine1` = `shippingAddressLine1`,
  `billingAddressLine2` = `shippingAddressLine2`,
  `billingPostalCode` = `shippingPostalCode`
WHERE `billingFullName` IS NULL;

ALTER TABLE `orders`
  MODIFY COLUMN `billingFullName` varchar(255) NOT NULL,
  MODIFY COLUMN `billingPhone` varchar(50) NOT NULL,
  MODIFY COLUMN `billingCountry` varchar(100) NOT NULL,
  MODIFY COLUMN `billingState` varchar(100) NOT NULL,
  MODIFY COLUMN `billingCity` varchar(100) NOT NULL,
  MODIFY COLUMN `billingAddressLine1` varchar(255) NOT NULL;

