INSERT INTO `roles` (`name`, `description`, `isSystem`)
VALUES ('Super Admin', 'System owner', true)
ON DUPLICATE KEY UPDATE `name` = `name`;
