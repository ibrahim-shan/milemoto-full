import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import * as schema from "./db.schema.js";

// Brands
export const insertBrandSchema = createInsertSchema(schema.brands);
export const selectBrandSchema = createSelectSchema(schema.brands);
export type Brand = InferSelectModel<typeof schema.brands>;
export type NewBrand = InferInsertModel<typeof schema.brands>;

// Categories
export const insertCategorySchema = createInsertSchema(schema.categories);
export const selectCategorySchema = createSelectSchema(schema.categories);
export type Category = InferSelectModel<typeof schema.categories>;
export type NewCategory = InferInsertModel<typeof schema.categories>;

// Cities
export const insertCitySchema = createInsertSchema(schema.cities);
export const selectCitySchema = createSelectSchema(schema.cities);
export type City = InferSelectModel<typeof schema.cities>;
export type NewCity = InferInsertModel<typeof schema.cities>;

// Collections
export const insertCollectionSchema = createInsertSchema(schema.collections);
export const selectCollectionSchema = createSelectSchema(schema.collections);
export type Collection = InferSelectModel<typeof schema.collections>;
export type NewCollection = InferInsertModel<typeof schema.collections>;

// Collection Products
export const insertCollectionProductSchema = createInsertSchema(
  schema.collectionProducts
);
export const selectCollectionProductSchema = createSelectSchema(
  schema.collectionProducts
);
export type CollectionProduct = InferSelectModel<
  typeof schema.collectionProducts
>;
export type NewCollectionProduct = InferInsertModel<
  typeof schema.collectionProducts
>;

// Company Profile
export const insertCompanyProfileSchema = createInsertSchema(
  schema.companyprofile
);
export const selectCompanyProfileSchema = createSelectSchema(
  schema.companyprofile
);
export type CompanyProfile = InferSelectModel<typeof schema.companyprofile>;
export type NewCompanyProfile = InferInsertModel<typeof schema.companyprofile>;

// Countries
export const insertCountrySchema = createInsertSchema(schema.countries);
export const selectCountrySchema = createSelectSchema(schema.countries);
export type Country = InferSelectModel<typeof schema.countries>;
export type NewCountry = InferInsertModel<typeof schema.countries>;

// Currencies
export const insertCurrencySchema = createInsertSchema(schema.currencies);
export const selectCurrencySchema = createSelectSchema(schema.currencies);
export type Currency = InferSelectModel<typeof schema.currencies>;
export type NewCurrency = InferInsertModel<typeof schema.currencies>;

// Email Verifications
export const insertEmailVerificationSchema = createInsertSchema(
  schema.emailverifications
);
export const selectEmailVerificationSchema = createSelectSchema(
  schema.emailverifications
);
export type EmailVerification = InferSelectModel<
  typeof schema.emailverifications
>;
export type NewEmailVerification = InferInsertModel<
  typeof schema.emailverifications
>;

// Phone Verifications
export const insertPhoneVerificationSchema = createInsertSchema(
  schema.phoneverifications
);
export const selectPhoneVerificationSchema = createSelectSchema(
  schema.phoneverifications
);
export type PhoneVerification = InferSelectModel<
  typeof schema.phoneverifications
>;
export type NewPhoneVerification = InferInsertModel<
  typeof schema.phoneverifications
>;

// Goods Receipt Lines
export const insertGoodsReceiptLineSchema = createInsertSchema(
  schema.goodsreceiptlines
);
export const selectGoodsReceiptLineSchema = createSelectSchema(
  schema.goodsreceiptlines
);
export type GoodsReceiptLine = InferSelectModel<
  typeof schema.goodsreceiptlines
>;
export type NewGoodsReceiptLine = InferInsertModel<
  typeof schema.goodsreceiptlines
>;

// Goods Receipts
export const insertGoodsReceiptSchema = createInsertSchema(
  schema.goodsreceipts
);
export const selectGoodsReceiptSchema = createSelectSchema(
  schema.goodsreceipts
);
export type GoodsReceipt = InferSelectModel<typeof schema.goodsreceipts>;
export type NewGoodsReceipt = InferInsertModel<typeof schema.goodsreceipts>;

// Grades
export const insertGradeSchema = createInsertSchema(schema.grades);
export const selectGradeSchema = createSelectSchema(schema.grades);
export type Grade = InferSelectModel<typeof schema.grades>;
export type NewGrade = InferInsertModel<typeof schema.grades>;

// Languages
export const insertLanguageSchema = createInsertSchema(schema.languages);
export const selectLanguageSchema = createSelectSchema(schema.languages);
export type Language = InferSelectModel<typeof schema.languages>;
export type NewLanguage = InferInsertModel<typeof schema.languages>;

// MFA Backup Codes
export const insertMfaBackupCodeSchema = createInsertSchema(
  schema.mfabackupcodes
);
export const selectMfaBackupCodeSchema = createSelectSchema(
  schema.mfabackupcodes
);
export type MfaBackupCode = InferSelectModel<typeof schema.mfabackupcodes>;
export type NewMfaBackupCode = InferInsertModel<typeof schema.mfabackupcodes>;

// MFA Challenges
export const insertMfaChallengeSchema = createInsertSchema(
  schema.mfachallenges
);
export const selectMfaChallengeSchema = createSelectSchema(
  schema.mfachallenges
);
export type MfaChallenge = InferSelectModel<typeof schema.mfachallenges>;
export type NewMfaChallenge = InferInsertModel<typeof schema.mfachallenges>;

// MFA Login Challenges
export const insertMfaLoginChallengeSchema = createInsertSchema(
  schema.mfaloginchallenges
);
export const selectMfaLoginChallengeSchema = createSelectSchema(
  schema.mfaloginchallenges
);
export type MfaLoginChallenge = InferSelectModel<
  typeof schema.mfaloginchallenges
>;
export type NewMfaLoginChallenge = InferInsertModel<
  typeof schema.mfaloginchallenges
>;

// Mail Settings
export const insertMailSettingSchema = createInsertSchema(schema.mailsettings);
export const selectMailSettingSchema = createSelectSchema(schema.mailsettings);
export type MailSetting = InferSelectModel<typeof schema.mailsettings>;
export type NewMailSetting = InferInsertModel<typeof schema.mailsettings>;

// Message Templates

// Email Delivery Logs
export const insertEmailDeliveryLogSchema = createInsertSchema(schema.emaildeliverylogs);
export const selectEmailDeliveryLogSchema = createSelectSchema(schema.emaildeliverylogs);
export type EmailDeliveryLog = InferSelectModel<typeof schema.emaildeliverylogs>;
export type NewEmailDeliveryLog = InferInsertModel<typeof schema.emaildeliverylogs>;

// SMS Gateways
export const insertSmsGatewaySchema = createInsertSchema(schema.smsgateways);
export const selectSmsGatewaySchema = createSelectSchema(schema.smsgateways);
export type SmsGateway = InferSelectModel<typeof schema.smsgateways>;
export type NewSmsGateway = InferInsertModel<typeof schema.smsgateways>;

// SMS Usage
export const insertSmsUsageSchema = createInsertSchema(schema.smsusage);
export const selectSmsUsageSchema = createSelectSchema(schema.smsusage);
export type SmsUsage = InferSelectModel<typeof schema.smsusage>;
export type NewSmsUsage = InferInsertModel<typeof schema.smsusage>;

// SMS Delivery Reports
export const insertSmsDeliveryReportSchema = createInsertSchema(
  schema.smsdeliveryreports
);
export const selectSmsDeliveryReportSchema = createSelectSchema(
  schema.smsdeliveryreports
);
export type SmsDeliveryReport = InferSelectModel<
  typeof schema.smsdeliveryreports
>;
export type NewSmsDeliveryReport = InferInsertModel<
  typeof schema.smsdeliveryreports
>;

// Password Resets
export const insertPasswordResetSchema = createInsertSchema(
  schema.passwordresets
);
export const selectPasswordResetSchema = createSelectSchema(
  schema.passwordresets
);
export type PasswordReset = InferSelectModel<typeof schema.passwordresets>;
export type NewPasswordReset = InferInsertModel<typeof schema.passwordresets>;

// Payment Methods
export const insertPaymentMethodSchema = createInsertSchema(
  schema.paymentmethods
);
export const selectPaymentMethodSchema = createSelectSchema(
  schema.paymentmethods
);
export type PaymentMethod = InferSelectModel<typeof schema.paymentmethods>;
export type NewPaymentMethod = InferInsertModel<typeof schema.paymentmethods>;

// Permissions
export const insertPermissionSchema = createInsertSchema(schema.permissions);
export const selectPermissionSchema = createSelectSchema(schema.permissions);
export type Permission = InferSelectModel<typeof schema.permissions>;
export type NewPermission = InferInsertModel<typeof schema.permissions>;

// Product Images
export const insertProductImageSchema = createInsertSchema(
  schema.productimages
);
export const selectProductImageSchema = createSelectSchema(
  schema.productimages
);
export type ProductImage = InferSelectModel<typeof schema.productimages>;
export type NewProductImage = InferInsertModel<typeof schema.productimages>;

// Products
export const insertProductSchema = createInsertSchema(schema.products);
export const selectProductSchema = createSelectSchema(schema.products);
export type Product = InferSelectModel<typeof schema.products>;
export type NewProduct = InferInsertModel<typeof schema.products>;

// Product Specification Fields
export const insertProductSpecificationFieldSchema = createInsertSchema(
  schema.productspecificationfields
);
export const selectProductSpecificationFieldSchema = createSelectSchema(
  schema.productspecificationfields
);
export type ProductSpecificationField = InferSelectModel<
  typeof schema.productspecificationfields
>;
export type NewProductSpecificationField = InferInsertModel<
  typeof schema.productspecificationfields
>;

// Product Specifications
export const insertProductSpecificationSchema = createInsertSchema(
  schema.productspecifications
);
export const selectProductSpecificationSchema = createSelectSchema(
  schema.productspecifications
);
export type ProductSpecification = InferSelectModel<
  typeof schema.productspecifications
>;
export type NewProductSpecification = InferInsertModel<
  typeof schema.productspecifications
>;

// Product Variant Attributes
export const insertProductVariantAttributeSchema = createInsertSchema(
  schema.productvariantattributes
);
export const selectProductVariantAttributeSchema = createSelectSchema(
  schema.productvariantattributes
);
export type ProductVariantAttribute = InferSelectModel<
  typeof schema.productvariantattributes
>;
export type NewProductVariantAttribute = InferInsertModel<
  typeof schema.productvariantattributes
>;

// Product Variants
export const insertProductVariantSchema = createInsertSchema(
  schema.productvariants
);
export const selectProductVariantSchema = createSelectSchema(
  schema.productvariants
);
export type ProductVariant = InferSelectModel<typeof schema.productvariants>;
export type NewProductVariant = InferInsertModel<typeof schema.productvariants>;

// Purchase Order Lines
export const insertPurchaseOrderLineSchema = createInsertSchema(
  schema.purchaseorderlines
);
export const selectPurchaseOrderLineSchema = createSelectSchema(
  schema.purchaseorderlines
);
export type PurchaseOrderLine = InferSelectModel<
  typeof schema.purchaseorderlines
>;
export type NewPurchaseOrderLine = InferInsertModel<
  typeof schema.purchaseorderlines
>;

// Purchase Orders
export const insertPurchaseOrderSchema = createInsertSchema(
  schema.purchaseorders
);
export const selectPurchaseOrderSchema = createSelectSchema(
  schema.purchaseorders
);
export type PurchaseOrder = InferSelectModel<typeof schema.purchaseorders>;
export type NewPurchaseOrder = InferInsertModel<typeof schema.purchaseorders>;

// Role Permissions
export const insertRolePermissionSchema = createInsertSchema(
  schema.rolepermissions
);
export const selectRolePermissionSchema = createSelectSchema(
  schema.rolepermissions
);
export type RolePermission = InferSelectModel<typeof schema.rolepermissions>;
export type NewRolePermission = InferInsertModel<typeof schema.rolepermissions>;

// Roles
export const insertRoleSchema = createInsertSchema(schema.roles);
export const selectRoleSchema = createSelectSchema(schema.roles);
export type Role = InferSelectModel<typeof schema.roles>;
export type NewRole = InferInsertModel<typeof schema.roles>;

// Runtime Flags
export const insertRuntimeFlagSchema = createInsertSchema(schema.runtimeflags);
export const selectRuntimeFlagSchema = createSelectSchema(schema.runtimeflags);
export type RuntimeFlag = InferSelectModel<typeof schema.runtimeflags>;
export type NewRuntimeFlag = InferInsertModel<typeof schema.runtimeflags>;

// Sessions
export const insertSessionSchema = createInsertSchema(schema.sessions);
export const selectSessionSchema = createSelectSchema(schema.sessions);
export type Session = InferSelectModel<typeof schema.sessions>;
export type NewSession = InferInsertModel<typeof schema.sessions>;

// Shipping Area Rates
export const insertShippingAreaRateSchema = createInsertSchema(
  schema.shippingarearates
);
export const selectShippingAreaRateSchema = createSelectSchema(
  schema.shippingarearates
);
export type ShippingAreaRate = InferSelectModel<
  typeof schema.shippingarearates
>;
export type NewShippingAreaRate = InferInsertModel<
  typeof schema.shippingarearates
>;

// Shipping Methods
export const insertShippingMethodSchema = createInsertSchema(
  schema.shippingmethods
);
export const selectShippingMethodSchema = createSelectSchema(
  schema.shippingmethods
);
export type ShippingMethod = InferSelectModel<typeof schema.shippingmethods>;
export type NewShippingMethod = InferInsertModel<typeof schema.shippingmethods>;

// Inbound Shipping Methods
export const insertInboundShippingMethodSchema = createInsertSchema(
  schema.inboundshippingmethods
);
export const selectInboundShippingMethodSchema = createSelectSchema(
  schema.inboundshippingmethods
);
export type InboundShippingMethod = InferSelectModel<
  typeof schema.inboundshippingmethods
>;
export type NewInboundShippingMethod = InferInsertModel<
  typeof schema.inboundshippingmethods
>;

// Site Settings
export const insertSiteSettingSchema = createInsertSchema(schema.sitesettings);
export const selectSiteSettingSchema = createSelectSchema(schema.sitesettings);
export type SiteSetting = InferSelectModel<typeof schema.sitesettings>;
export type NewSiteSetting = InferInsertModel<typeof schema.sitesettings>;

// States
export const insertStateSchema = createInsertSchema(schema.states);
export const selectStateSchema = createSelectSchema(schema.states);
export type State = InferSelectModel<typeof schema.states>;
export type NewState = InferInsertModel<typeof schema.states>;

// Stock Levels
export const insertStockLevelSchema = createInsertSchema(schema.stocklevels);
export const selectStockLevelSchema = createSelectSchema(schema.stocklevels);
export type StockLevel = InferSelectModel<typeof schema.stocklevels>;
export type NewStockLevel = InferInsertModel<typeof schema.stocklevels>;

// Stock Locations
export const insertStockLocationSchema = createInsertSchema(
  schema.stocklocations
);
export const selectStockLocationSchema = createSelectSchema(
  schema.stocklocations
);
export type StockLocation = InferSelectModel<typeof schema.stocklocations>;
export type NewStockLocation = InferInsertModel<typeof schema.stocklocations>;

// Stock Movements
export const insertStockMovementSchema = createInsertSchema(
  schema.stockmovements
);
export const selectStockMovementSchema = createSelectSchema(
  schema.stockmovements
);
export type StockMovement = InferSelectModel<typeof schema.stockmovements>;
export type NewStockMovement = InferInsertModel<typeof schema.stockmovements>;

// Taxes
export const insertTaxSchema = createInsertSchema(schema.taxes);
export const selectTaxSchema = createSelectSchema(schema.taxes);
export type Tax = InferSelectModel<typeof schema.taxes>;
export type NewTax = InferInsertModel<typeof schema.taxes>;

// Trusted Devices
export const insertTrustedDeviceSchema = createInsertSchema(
  schema.trusteddevices
);
export const selectTrustedDeviceSchema = createSelectSchema(
  schema.trusteddevices
);
export type TrustedDevice = InferSelectModel<typeof schema.trusteddevices>;
export type NewTrustedDevice = InferInsertModel<typeof schema.trusteddevices>;

// Unit Fields
export const insertUnitFieldSchema = createInsertSchema(schema.unitfields);
export const selectUnitFieldSchema = createSelectSchema(schema.unitfields);
export type UnitField = InferSelectModel<typeof schema.unitfields>;
export type NewUnitField = InferInsertModel<typeof schema.unitfields>;

// Unit Groups
export const insertUnitGroupSchema = createInsertSchema(schema.unitgroups);
export const selectUnitGroupSchema = createSelectSchema(schema.unitgroups);
export type UnitGroup = InferSelectModel<typeof schema.unitgroups>;
export type NewUnitGroup = InferInsertModel<typeof schema.unitgroups>;

// Unit Values
export const insertUnitValueSchema = createInsertSchema(schema.unitvalues);
export const selectUnitValueSchema = createSelectSchema(schema.unitvalues);
export type UnitValue = InferSelectModel<typeof schema.unitvalues>;
export type NewUnitValue = InferInsertModel<typeof schema.unitvalues>;

// Users
export const insertUserSchema = createInsertSchema(schema.users);
export const selectUserSchema = createSelectSchema(schema.users);
export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

// Variants
export const insertVariantSchema = createInsertSchema(schema.variants);
export const selectVariantSchema = createSelectSchema(schema.variants);
export type Variant = InferSelectModel<typeof schema.variants>;
export type NewVariant = InferInsertModel<typeof schema.variants>;

// Variant Values
export const insertVariantValueSchema = createInsertSchema(
  schema.variantvalues
);
export const selectVariantValueSchema = createSelectSchema(
  schema.variantvalues
);
export type VariantValue = InferSelectModel<typeof schema.variantvalues>;
export type NewVariantValue = InferInsertModel<typeof schema.variantvalues>;

// Vendors
export const insertVendorSchema = createInsertSchema(schema.vendors);
export const selectVendorSchema = createSelectSchema(schema.vendors);
export type Vendor = InferSelectModel<typeof schema.vendors>;
export type NewVendor = InferInsertModel<typeof schema.vendors>;

// Warranties
export const insertWarrantySchema = createInsertSchema(schema.warranties);
export const selectWarrantySchema = createSelectSchema(schema.warranties);
export type Warranty = InferSelectModel<typeof schema.warranties>;
export type NewWarranty = InferInsertModel<typeof schema.warranties>;
