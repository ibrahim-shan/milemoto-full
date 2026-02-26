# Settings - Completed (Current State)

This file lists settings-related functionality that is already implemented and working in the app (based on the current admin settings routes/services, settings test suite, and completed settings UI work).

## Admin Settings Area (General)

Implemented admin settings area includes:

- Shared settings layout with settings sidebar navigation
- Grouped settings sidebar sections (Store / Operations / Finance & Tax / Communication / Access & Security)
- Permission-gated settings pages via `settings.read`

## Site Settings API (Key/Value Settings) - Implemented

Implemented admin site-settings endpoints (`/api/v1/admin/site-settings/*`) for:

- Localization settings
- Store & currency settings
- Branding settings
- Document settings
- Feature toggles settings
- Stock display settings
- Tax policy settings

All site-settings endpoints are protected with:

- `settings.read` (GET)
- `settings.manage` (PUT)

## Site Settings: Implemented Groups

### Localization Settings

Implemented GET/PUT settings for:

- date format
- time format
- default timezone
- default language

### Store & Currency Settings

Implemented GET/PUT settings for:

- default currency
- currency position
- decimal digits
- copyright text

### Branding Settings

Implemented GET/PUT settings for:

- logo URL
- favicon URL

### Document Settings

Implemented GET/PUT settings for:

- purchase order terms

### Feature Toggles

Implemented GET/PUT settings for:

- cash on delivery enabled
- online payment enabled
- language switcher enabled
- phone verification enabled
- email verification enabled

## Tax Rules Settings (Admin Taxes & Duties) - Implemented

Implemented admin tax rules management (`/api/v1/admin/taxes`) with support for:

- create tax rule
- list taxes
- search/filter taxes
- update tax rule
- delete tax rule

Implemented tax rule fields include:

- name
- type (`percentage` / `fixed`)
- rate
- status (`active` / `inactive`)
- country scope (`countryId` or global)
- effective dates (`validFrom` / `validTo`)

Implemented tax rule behavior includes:

- duplicate rule conflict protection for the same region/scope (tested)
- effective date support in checkout tax rule resolution

## Tax Policy Settings (Dashboard-Configurable) - Implemented

Implemented admin Tax Policy settings page and API:

- `/admin/settings/tax-policy` (frontend page)
- `GET/PUT /api/v1/admin/site-settings/tax-policy` (backend)

Implemented tax policy fields:

- `jurisdictionSource` (`shipping_country` / `billing_country`)
- `taxableBaseMode` (`subtotal` / `subtotal_minus_discount`)
- `shippingTaxable`
- `roundingPrecision`
- `combinationMode` (`stack` / `exclusive`)
- `fallbackMode` (`no_tax` / `block_checkout`)

Implemented integration:

- checkout tax engine reads these settings
- tax policy summary on taxes page reflects stored/current policy values

## Stock Display Settings (Dashboard-Configurable) - Implemented

Implemented admin Stock Display settings page and API:

- `/admin/settings/stock-display` (frontend page)
- `GET/PUT /api/v1/admin/site-settings/stock-display` (backend)

Implemented stock display policy fields:

- `productStockDisplayMode`
  - `exact`
  - `low_stock_only`
  - `binary`
  - `hide`
- `lowStockThreshold`

Implemented integration:

- storefront product detail includes stock display policy values
- product page stock messaging uses dashboard-configured stock display mode and threshold

## Taxes Page (Admin UI) - Completed Enhancements

Completed admin taxes page UX/features include:

- tax rule CRUD usage in admin settings
- policy summary section (Current Tax Policy)
- policy summary now reads dynamic values from Tax Policy settings
- policy status clarity improvements (active/effective-date behavior explanations)
- effective date display support (`Always` when no date window)
- computed runtime status badges (e.g. active/scheduled/expired behavior in UI summary/table)

## Tax Rule Admin Form (UX Enhancements) - Implemented

Completed tax dialog enhancements include:

- effective date fields (`validFrom`, `validTo`)
- clear admin option for “always active” behavior (null date window semantics)
- improved clarity around effective dates and application behavior

## Settings Frontend Data Layer (Implemented)

Implemented frontend site-settings hooks and API wrappers for:

- localization
- store-currency
- branding
- documents
- feature toggles
- tax policy
- stock display

This includes React Query integration for GET/PUT and cache updates after save.

## Other Settings Admin Modules (Implemented & Tested)

Settings test suite confirms implemented API coverage for additional settings/admin setup modules, including:

- currencies
- payment methods
- shipping settings
- inbound shipping methods
- locations geo setup (countries/states/cities)
- stock locations
- units
- languages
- mail settings
- company profile
- active-only filtering behavior (where applicable)

## Settings Permissions / RBAC Usage (Implemented)

Settings routes are implemented with permission checks and are exercised in tests using:

- `settings.read`
- `settings.manage`

Additional settings-related modules also use their corresponding permissions (e.g. locations, stock locations, etc.) in admin routes/tests.

## Settings Test Coverage (Current)

Automated tests are present in `tests/settings/` and cover a broad settings surface, including:

- `site-settings.test.ts`
- `taxes.test.ts`
- `currencies.test.ts`
- `payment-methods.test.ts`
- `shipping.test.ts`
- `inbound-shipping-methods.test.ts`
- `locations-geo.test.ts`
- `stock-locations.test.ts`
- `units.test.ts`
- `languages.test.ts`
- `mail-settings.test.ts`
- `company-profile.test.ts`
- plus additional settings/admin entities in the same folder (e.g. vendors/customers/admin-users)

These tests verify implemented settings endpoints and admin flows across the settings area.
