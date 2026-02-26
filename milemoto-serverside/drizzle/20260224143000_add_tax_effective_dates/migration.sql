ALTER TABLE `taxes`
  ADD COLUMN `validFrom` datetime NULL AFTER `countryId`,
  ADD COLUMN `validTo` datetime NULL AFTER `validFrom`;

