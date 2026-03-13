INSERT INTO permissions (slug, description, resourceGroup)
VALUES ('invoices.manage', 'Manage invoices', 'Sales')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  resourceGroup = VALUES(resourceGroup);

INSERT INTO rolepermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p ON p.slug = 'invoices.manage'
WHERE r.name = 'Super Admin'
ON DUPLICATE KEY UPDATE
  permissionId = VALUES(permissionId);

