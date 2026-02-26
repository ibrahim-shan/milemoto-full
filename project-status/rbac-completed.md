# RBAC - Completed (Current State)

This file lists RBAC (roles & permissions) functionality that is already implemented and working in the app (based on the current RBAC routes/services and RBAC test suite).

## RBAC Module (Admin)

Implemented admin RBAC endpoints for:

- Permissions listing
- Role listing
- Role detail (with attached permissions)
- Role creation
- Role update
- Role deletion

## RBAC Routes (Admin)

Implemented endpoints:

- `GET /api/v1/admin/rbac/permissions`
- `GET /api/v1/admin/rbac/roles`
- `GET /api/v1/admin/rbac/roles/:id`
- `POST /api/v1/admin/rbac/roles`
- `PUT /api/v1/admin/rbac/roles/:id`
- `DELETE /api/v1/admin/rbac/roles/:id`

Route protection is implemented with:

- `rbac.read`
- `rbac.manage`

## Permissions (RBAC)

Implemented permission listing behavior:

- Returns all permissions
- Sorted by `resourceGroup` and `slug`
- Mapped to API response DTO format with timestamps

## Roles (RBAC) - Implemented

### Role Listing

Implemented role list endpoint supports:

- listing roles
- optional search by role name/description
- ordered output by role name

### Role Detail

Implemented role detail endpoint returns:

- role metadata (`id`, `name`, `description`, `isSystem`, timestamps)
- attached permissions (`permissions[]`)

### Role Creation

Implemented role creation behavior includes:

- create custom (non-system) roles
- optional description
- permission assignment on create (`permissionIds`)
- de-duplication of permission IDs before insert
- role name uniqueness check
- conflict response on duplicate name (`409`)

### Role Update

Implemented role update behavior includes:

- update role name
- update role description
- replace role permissions (`permissionIds`)
- de-duplication of permission IDs before re-linking
- uniqueness validation when renaming
- conflict response on duplicate role name (`409`)

### Role Deletion

Implemented role deletion behavior includes:

- delete role-permission links
- delete role record
- returns success payload

## System Role Protection (Implemented)

RBAC write service enforces protections for system roles:

- system roles cannot be edited
- system roles cannot be deleted

This behavior is covered by automated tests.

## Permission Enforcement (RBAC) - Implemented

RBAC admin routes enforce permissions correctly:

- users with `rbac.read` but without `rbac.manage` cannot create roles (`403`)
- users without `rbac.read` cannot access RBAC read endpoints (`403`)

This confirms route-level authorization enforcement for RBAC management.

## User Permissions Resolution (Implemented)

Implemented user-permission resolution in RBAC service:

- retrieves effective permissions from user role -> rolepermissions -> permissions
- de-duplicates permission slugs
- used by auth `/api/v1/auth/permissions` endpoint

## Audit Logging Integration (RBAC Writes) - Implemented

RBAC write operations include audit logging hooks (when audit context is provided) for:

- role create
- role update
- role delete

Route layer passes audit context (userId, ip, userAgent) to RBAC write service.

## RBAC Test Coverage (Current)

Automated tests are present in `tests/rbac/` and cover:

- `permissions.test.ts`
  - authorized permissions listing
- `roles.test.ts`
  - role CRUD + role detail + search
- `forbidden.test.ts`
  - permission enforcement (`403` cases)
- `role-uniqueness.test.ts`
  - duplicate create/update name conflict handling (`409`)
- `system-role.test.ts`
  - system-role edit/delete protection (`403`)

## RBAC + Auth Integration (Implemented)

RBAC is integrated into admin authentication/testing flows:

- admin users are created and assigned roles in tests
- auth login returns tokens used to access RBAC endpoints
- permission checks are enforced through shared authz middleware
