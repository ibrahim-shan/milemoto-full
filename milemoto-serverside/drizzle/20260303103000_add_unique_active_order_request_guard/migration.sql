ALTER TABLE `orderrequests`
  ADD COLUMN `activeRequestKey` varchar(128)
    GENERATED ALWAYS AS (
      CASE
        WHEN `status` IN ('pending', 'approved')
          THEN CONCAT(`userId`, ':', `orderId`, ':', `type`)
        ELSE NULL
      END
    ) STORED;

CREATE UNIQUE INDEX `uqOrderRequestsActiveRequestKey`
  ON `orderrequests` (`activeRequestKey`);
