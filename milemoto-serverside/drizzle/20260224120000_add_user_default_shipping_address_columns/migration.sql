ALTER TABLE `users`
  ADD COLUMN `defaultShippingFullName` varchar(255) NULL,
  ADD COLUMN `defaultShippingPhone` varchar(50) NULL,
  ADD COLUMN `defaultShippingEmail` varchar(255) NULL,
  ADD COLUMN `defaultShippingCountry` varchar(100) NULL,
  ADD COLUMN `defaultShippingCountryId` int NULL,
  ADD COLUMN `defaultShippingState` varchar(100) NULL,
  ADD COLUMN `defaultShippingStateId` int NULL,
  ADD COLUMN `defaultShippingCity` varchar(100) NULL,
  ADD COLUMN `defaultShippingCityId` int NULL,
  ADD COLUMN `defaultShippingAddressLine1` varchar(255) NULL,
  ADD COLUMN `defaultShippingAddressLine2` varchar(255) NULL,
  ADD COLUMN `defaultShippingPostalCode` varchar(50) NULL;

