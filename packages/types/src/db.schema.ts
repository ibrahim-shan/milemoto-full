import {
  mysqlTable,
  int,
  varchar,
  text,
  mysqlEnum,
  timestamp,
  bigint,
  longtext,
  tinyint,
  decimal,
  datetime,
  char,
  date,
  varbinary,
  blob,
  boolean,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const brands = mysqlTable(
  "brands",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    description: text(),
    status: mysqlEnum(["active", "inactive"]).default("active"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxSlug").on(table.slug),
    index("idxStatus").on(table.status),
    uniqueIndex("name").on(table.name),
    uniqueIndex("slug").on(table.slug),
  ]
);

export const categories = mysqlTable(
  "categories",
  {
    id: int().autoincrement().primaryKey(),
      name: varchar({ length: 255 }).notNull(),
      slug: varchar({ length: 255 }).notNull(),
      description: text(),
      imageUrl: varchar({ length: 1000 }),
      parentId: int(),
    status: mysqlEnum(["active", "inactive"]).default("active"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxParentId").on(table.parentId),
    index("idxSlug").on(table.slug),
    index("idxStatus").on(table.status),
    uniqueIndex("slug").on(table.slug),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "categories_ibfk_1",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const cities = mysqlTable(
  "cities",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    stateId: bigint({ unsigned: true, mode: "number" }).notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    statusEffective: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxCitiesStateId").on(table.stateId),
    index("idxCitiesStatus").on(table.status),
    uniqueIndex("uniqCitiesStateName").on(table.stateId, table.name),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.id],
      name: "fkCitiesStateId",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ]
);

export const collections = mysqlTable(
  "collections",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    slug: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    type: mysqlEnum(["manual", "automatic"])
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    matchType: mysqlEnum(["all", "any"])
      .default("all")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    rulesJson: longtext().charSet("utf8mb4").collate("utf8mb4_bin"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxCollectionStatus").on(table.status),
    index("idxCollectionType").on(table.type),
    uniqueIndex("uniqCollectionSlug").on(table.slug),
  ]
);

export const collectionProducts = mysqlTable(
  "collection_products",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    collectionId: int().notNull(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    position: int().default(0),
    reason: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxCollection").on(table.collectionId),
    index("idxProductVariant").on(table.productVariantId),
    uniqueIndex("uniqCollectionProduct").on(
      table.productVariantId,
      table.collectionId
    ),
    foreignKey({
      columns: [table.collectionId],
      foreignColumns: [collections.id],
      name: "fkCollProdCollection",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkCollProdVariant",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const companyprofile = mysqlTable(
  "companyprofile",
  {
    id: tinyint({ unsigned: true }).default(1).primaryKey(),
    name: varchar({ length: 191 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    publicEmail: varchar({ length: 191 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    phone: varchar({ length: 64 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    website: varchar({ length: 191 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    address: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    city: varchar({ length: 191 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    state: varchar({ length: 191 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    zip: varchar({ length: 32 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    countryId: bigint({ unsigned: true, mode: "number" }),
    latitude: decimal({ precision: 10, scale: 6 }),
    longitude: decimal({ precision: 10, scale: 6 }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.id],
      name: "fkCompanyProfileCountry",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const countries = mysqlTable(
  "countries",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    code: varchar({ length: 10 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("idxCountriesCode").on(table.code),
    index("idxCountriesStatus").on(table.status),
  ]
);

export const currencies = mysqlTable(
  "currencies",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 10 }).notNull(),
    symbol: varchar({ length: 10 }).notNull(),
    exchangeRate: decimal({ precision: 15, scale: 8, mode: "number" })
      .default(1.0)
      .notNull(),
    status: mysqlEnum(["active", "inactive"]).default("active").notNull(),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("uniqueCurrencyCode").on(table.code)]
);

export const coupons = mysqlTable(
  "coupons",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    code: varchar({ length: 100 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci").notNull(),
    type: mysqlEnum(["fixed", "percentage"]).notNull(),
    value: decimal({ precision: 15, scale: 2, mode: "number" }).notNull(),
    minSubtotal: decimal({ precision: 15, scale: 2, mode: "number" }),
    maxDiscount: decimal({ precision: 15, scale: 2, mode: "number" }),
    startsAt: datetime(),
    endsAt: datetime(),
    status: mysqlEnum(["active", "inactive"]).default("active").notNull(),
    usageLimit: int(),
    perUserLimit: int(),
    usedCount: int().default(0).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqCouponsCode").on(table.code),
    index("idxCouponsStatus").on(table.status),
    index("idxCouponsStartsAt").on(table.startsAt),
    index("idxCouponsEndsAt").on(table.endsAt),
  ]
);

export const emailverifications = mysqlTable(
  "emailverifications",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    email: varchar({ length: 191 }),
    tokenHash: char({ length: 64 }).notNull(),
    expiresAt: datetime().notNull(),
    usedAt: datetime(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxEmailVerifUser").on(table.userId),
    index("idxEmailVerifEmail").on(table.email),
    uniqueIndex("tokenHash").on(table.tokenHash),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkEmailVerifUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const phoneverifications = mysqlTable(
  "phoneverifications",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    phone: varchar({ length: 32 }).notNull(),
    codeHash: char({ length: 64 }).notNull(),
    attempts: int().default(0).notNull(),
    expiresAt: datetime().notNull(),
    usedAt: datetime(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxPhoneVerifUser").on(table.userId),
    uniqueIndex("uniqPhoneVerifCode").on(table.codeHash),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkPhoneVerifUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const goodsreceiptlines = mysqlTable(
  "goodsreceiptlines",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    goodsReceiptId: bigint({ unsigned: true, mode: "number" }).notNull(),
    purchaseOrderLineId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    receivedQty: int().notNull(),
    rejectedQty: int().default(0).notNull(),
    batchNumber: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    serialNumber: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    expirationDate: date(),
  },
  (table) => [
    index("idxGoodsReceiptLinesGrn").on(table.goodsReceiptId),
    index("idxGoodsReceiptLinesPoLine").on(table.purchaseOrderLineId),
    foreignKey({
      columns: [table.goodsReceiptId],
      foreignColumns: [goodsreceipts.id],
      name: "fkGoodsReceiptLinesGrn",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.purchaseOrderLineId],
      foreignColumns: [purchaseorderlines.id],
      name: "fkGoodsReceiptLinesPoLine",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkGoodsReceiptLinesVariant",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ]
);

export const goodsreceipts = mysqlTable(
  "goodsreceipts",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    purchaseOrderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    grnNumber: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["draft", "posted"])
      .default("draft")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    note: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    postedByUserId: bigint({ unsigned: true, mode: "number" }).default(
      sql`NULL`
    ),
    postedAt: datetime(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxGoodsReceiptsPo").on(table.purchaseOrderId),
    index("idxGoodsReceiptsPostedAt").on(table.postedAt),
    uniqueIndex("uniqGrnNumber").on(table.grnNumber),
    foreignKey({
      columns: [table.purchaseOrderId],
      foreignColumns: [purchaseorders.id],
      name: "fkGoodsReceiptsPo",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.postedByUserId],
      foreignColumns: [users.id],
      name: "fkGoodsReceiptsPostedBy",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const grades = mysqlTable(
  "grades",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    description: text(),
    status: mysqlEnum(["active", "inactive"]).default("active"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxSlug").on(table.slug),
    index("idxStatus").on(table.status),
    uniqueIndex("name").on(table.name),
    uniqueIndex("slug").on(table.slug),
  ]
);

export const languages = mysqlTable(
  "languages",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 10 }).notNull(),
    displayMode: mysqlEnum(["LTR", "RTL"]).default("LTR").notNull(),
    countryCode: varchar({ length: 10 }),
    status: mysqlEnum(["active", "inactive"]).default("active").notNull(),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("uniqueLanguageCode").on(table.code)]
);

export const mfabackupcodes = mysqlTable(
  "mfabackupcodes",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    codeHash: char({ length: 64 }).notNull(),
    usedAt: datetime(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxMfaCodesUsed").on(table.usedAt),
    uniqueIndex("uniqUserCode").on(table.userId, table.codeHash),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkMfaCodesUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const mfachallenges = mysqlTable(
  "mfachallenges",
  {
    id: char({ length: 26 }).primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    secretEnc: blob({ mode: "buffer" }).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: datetime().notNull(),
    consumedAt: datetime(),
  },
  (table) => [
    index("idxMfaChExp").on(table.expiresAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkMfaChUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const mfaloginchallenges = mysqlTable(
  "mfaloginchallenges",
  {
    id: char({ length: 26 }).primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    remember: boolean().default(false).notNull(),
    userAgent: varchar({ length: 255 }),
    ip: varchar({ length: 64 }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: datetime().notNull(),
    consumedAt: datetime(),
  },
  (table) => [
    index("idxMfaLoginExp").on(table.expiresAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkMfaLoginUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const mailsettings = mysqlTable(
  "mailsettings",
  {
    id: int().autoincrement().primaryKey(),
    host: varchar({ length: 255 }),
    port: int(),
    username: varchar({ length: 255 }),
    // Store encrypted bytes (AES-256-GCM blob). Do not use varbinary, it maps binary to string in Drizzle.
    passwordEnc: blob({ mode: "buffer" }),
    encryption: mysqlEnum(["none", "tls", "ssl"]).default("tls").notNull(),
    fromName: varchar({ length: 100 }),
    fromEmail: varchar({ length: 191 }),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idxMailSettingsHost").on(table.host)]
);

export const emaildeliverylogs = mysqlTable(
  "emaildeliverylogs",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    provider: varchar({ length: 50 }).default("smtp").notNull(),
    toEmail: varchar({ length: 191 }).notNull(),
    subject: varchar({ length: 255 }).notNull(),
    status: mysqlEnum(["sent", "failed"]).notNull(),
    messageId: varchar({ length: 191 }),
    response: longtext(),
    error: longtext(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxEmailDeliveryTo").on(table.toEmail),
    index("idxEmailDeliveryStatus").on(table.status),
  ]
);

export const smsgateways = mysqlTable(
  "smsgateways",
  {
    id: int().autoincrement().primaryKey(),
    provider: varchar({ length: 50 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    status: mysqlEnum(["active", "inactive"]).default("inactive").notNull(),
    configJson: text().notNull().default("{}"),
    secretEnc: blob({ mode: "buffer" }),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idxSmsGatewaysStatus").on(table.status),
    uniqueIndex("uniqSmsGatewayProviderName").on(table.provider, table.name),
  ]
);

export const smsusage = mysqlTable(
  "smsusage",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    gatewayId: int().notNull(),
    channel: mysqlEnum(["sms", "whatsapp"]).notNull(),
    usageDate: date().notNull(),
    count: int().default(0).notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqSmsUsageGatewayChannelDay").on(
      table.gatewayId,
      table.channel,
      table.usageDate
    ),
    index("idxSmsUsageGateway").on(table.gatewayId),
    foreignKey({
      columns: [table.gatewayId],
      foreignColumns: [smsgateways.id],
      name: "fkSmsUsageGateway",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const smsdeliveryreports = mysqlTable(
  "smsdeliveryreports",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    provider: varchar({ length: 50 }).notNull(),
    channel: mysqlEnum(["sms", "whatsapp"]).default("sms").notNull(),
    gatewayId: int(),
    messageId: varchar({ length: 100 }).notNull(),
    toNumber: varchar({ length: 32 }).notNull(),
    statusGroup: varchar({ length: 50 }),
    statusGroupId: int(),
    statusName: varchar({ length: 100 }),
    statusId: int(),
    statusDescription: varchar({ length: 255 }),
    errorName: varchar({ length: 100 }),
    errorDescription: varchar({ length: 255 }),
    bulkId: varchar({ length: 100 }),
    sentAt: datetime(),
    doneAt: datetime(),
    rawPayload: longtext(),
    receivedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxSmsDeliveryMessage").on(table.messageId),
    index("idxSmsDeliveryTo").on(table.toNumber),
    index("idxSmsDeliveryStatus").on(table.statusName),
    uniqueIndex("uniqSmsDeliveryProviderMessage").on(table.provider, table.messageId),
    foreignKey({
      columns: [table.gatewayId],
      foreignColumns: [smsgateways.id],
      name: "fkSmsDeliveryGateway",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const passwordresets = mysqlTable(
  "passwordresets",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    tokenHash: char({ length: 64 }).notNull(),
    expiresAt: datetime().notNull(),
    usedAt: datetime(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxPwActive").on(table.expiresAt, table.userId, table.usedAt),
    index("idxPwUser").on(table.userId),
    uniqueIndex("tokenHash").on(table.tokenHash),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkPwUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const paymentmethods = mysqlTable(
  "paymentmethods",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxStatus").on(table.status),
    uniqueIndex("uniqueName").on(table.name),
  ]
);

export const permissions = mysqlTable(
  "permissions",
  {
    id: int().autoincrement().primaryKey(),
    slug: varchar({ length: 100 }).notNull(),
    description: varchar({ length: 255 }).notNull(),
    resourceGroup: varchar({ length: 50 }).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [uniqueIndex("slug").on(table.slug)]
);

export const productimages = mysqlTable(
  "productimages",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    productId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).default(
      sql`NULL`
    ),
    imagePath: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    isPrimary: boolean().default(false),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fkImgProduct",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkImgVariant",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const products = mysqlTable(
  "products",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    slug: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    brandId: int(),
    categoryId: int(),
    subCategoryId: int(),
    vendorId: int(),
    warrantyId: int(),
    shippingMethodId: int(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    gradeId: int(),
    shortDescription: varchar({ length: 255 })
      .default("")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    longDescription: text()
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    isFeatured: boolean().default(false).notNull(),
  },
  (table) => [
    // NOTE: FULLTEXT index on products.name is applied via SQL migration because
    // this Drizzle MySQL version does not expose a FULLTEXT index builder API.
    uniqueIndex("slug").on(table.slug),
    foreignKey({
      columns: [table.brandId],
      foreignColumns: [brands.id],
      name: "fkProductsBrand",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "fkProductsCategory",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.gradeId],
      foreignColumns: [grades.id],
      name: "fkProductsGrade",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.shippingMethodId],
      foreignColumns: [shippingmethods.id],
      name: "fkProductsShippingMethod",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.subCategoryId],
      foreignColumns: [categories.id],
      name: "fkProductsSubCategory",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.vendorId],
      foreignColumns: [vendors.id],
      name: "fkProductsVendor",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.warrantyId],
      foreignColumns: [warranties.id],
      name: "fkProductsWarranty",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const productspecificationfields = mysqlTable(
  "productspecificationfields",
  {
    id: int().autoincrement().primaryKey(),
    productSpecificationId: int().notNull(),
    unitFieldId: int().notNull(),
    value: varchar({ length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.productSpecificationId],
      foreignColumns: [productspecifications.id],
      name: "fkSpecFieldsSpec",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.unitFieldId],
      foreignColumns: [unitfields.id],
      name: "fkSpecFieldsUnitField",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ]
);

export const productspecifications = mysqlTable(
  "productspecifications",
  {
    id: int().autoincrement().primaryKey(),
    productId: bigint({ unsigned: true, mode: "number" }).notNull(),
    unitGroupId: int().notNull(),
    unitValueId: int().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fkProdSpecsProduct",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.unitGroupId],
      foreignColumns: [unitgroups.id],
      name: "fkProdSpecsUnitGroup",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.unitValueId],
      foreignColumns: [unitvalues.id],
      name: "fkProdSpecsUnitValue",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ]
);

export const productvariantattributes = mysqlTable(
  "productvariantattributes",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    variantValueId: int().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.variantValueId],
      foreignColumns: [variantvalues.id],
      name: "fkVarAttrValue",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkVarAttrVariant",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const productvariants = mysqlTable(
  "productvariants",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    productId: bigint({ unsigned: true, mode: "number" }).notNull(),
    sku: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    barcode: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    price: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    costPrice: decimal({ precision: 15, scale: 2, mode: "number" }).default(
      sql`NULL`
    ),
    lowStockThreshold: int().default(5),
    idealStockQuantity: int(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxVariantProduct").on(table.productId),
    uniqueIndex("uniqueBarcode").on(table.barcode),
    uniqueIndex("uniqueSku").on(table.sku),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fkVariantProduct",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const purchaseorderlines = mysqlTable(
  "purchaseorderlines",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    purchaseOrderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    description: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    orderedQty: int().notNull(),
    unitCost: decimal({ precision: 15, scale: 2, mode: "number" }).notNull(),
    taxId: int(),
    taxName: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    taxType: varchar({ length: 50 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    taxRate: decimal({ precision: 10, scale: 4, mode: "number" }),
    expectedLineDeliveryDate: date(),
    comments: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    receivedQty: int().default(0).notNull(),
    rejectedQty: int().default(0).notNull(),
    cancelledQty: int().default(0).notNull(),
    lineSubtotal: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    lineTax: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    lineTotal: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
  },
  (table) => [
    index("idxPurchaseOrderLinesPo").on(table.purchaseOrderId),
    index("idxPurchaseOrderLinesVariant").on(table.productVariantId),
    foreignKey({
      columns: [table.purchaseOrderId],
      foreignColumns: [purchaseorders.id],
      name: "fkPurchaseOrderLinesPo",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxes.id],
      name: "fkPurchaseOrderLinesTax",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkPurchaseOrderLinesVariant",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ]
);

export const purchaseorders = mysqlTable(
  "purchaseorders",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    poNumber: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    subject: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    vendorId: int().notNull(),
    stockLocationId: int().notNull(),
    currencyId: int().notNull(),
    paymentTerms: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    expectedDeliveryDate: date(),
    paymentMethodId: int().notNull(),
    inboundShippingMethodId: int(),
    shippingCost: decimal({ precision: 15, scale: 2, mode: "number" }).default(
      sql`NULL`
    ),
    discountType: mysqlEnum(["fixed", "percentage"])
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    discountValue: decimal({ precision: 15, scale: 2, mode: "number" }).default(
      sql`NULL`
    ),
    subtotal: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    discountAmount: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    taxTotal: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    total: decimal({ precision: 15, scale: 2, mode: "number" })
      .default(0.0)
      .notNull(),
    status: mysqlEnum([
      "draft",
      "pending_approval",
      "approved",
      "partially_received",
      "fully_received",
      "closed",
      "cancelled",
    ])
      .default("draft")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    supplierRef: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    internalNote: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    createdByUserId: bigint({ unsigned: true, mode: "number" }).notNull(),
    approvedByUserId: bigint({ unsigned: true, mode: "number" }).default(
      sql`NULL`
    ),
    approvedAt: datetime(),
    cancelledAt: datetime(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxPurchaseOrdersCreatedAt").on(table.createdAt),
    index("idxPurchaseOrdersCurrency").on(table.currencyId),
    index("idxPurchaseOrdersStatus").on(table.status),
    index("idxPurchaseOrdersVendor").on(table.vendorId),
    uniqueIndex("uniqPoNumber").on(table.poNumber),
    foreignKey({
      columns: [table.approvedByUserId],
      foreignColumns: [users.id],
      name: "fkPurchaseOrdersApprovedBy",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "fkPurchaseOrdersCreatedBy",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.id],
      name: "fkPurchaseOrdersCurrency",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.paymentMethodId],
      foreignColumns: [paymentmethods.id],
      name: "fkPurchaseOrdersPaymentMethod",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.stockLocationId],
      foreignColumns: [stocklocations.id],
      name: "fkPurchaseOrdersStockLocation",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.inboundShippingMethodId],
      foreignColumns: [inboundshippingmethods.id],
      name: "fkPurchaseOrdersInboundShippingMethod",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
    foreignKey({
      columns: [table.vendorId],
      foreignColumns: [vendors.id],
      name: "fkPurchaseOrdersVendor",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ]
);

export const rolepermissions = mysqlTable(
  "rolepermissions",
  {
    roleId: int().notNull(),
    permissionId: int().notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqRolePermissionsRolePerm").on(
      table.roleId,
      table.permissionId
    ),
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [permissions.id],
      name: "fkRolePermPerm",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "fkRolePermRole",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const roles = mysqlTable(
  "roles",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 50 }).notNull(),
    description: varchar({ length: 255 }),
    isSystem: boolean().default(false),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [uniqueIndex("name").on(table.name)]
);

export const runtimeflags = mysqlTable("runtimeFlags", {
  flagKey: varchar({ length: 64 }).primaryKey(),
  boolValue: boolean().default(false).notNull(),
  updatedAt: timestamp()
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const sessions = mysqlTable(
  "sessions",
  {
    id: char({ length: 26 }).primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    refreshHash: char({ length: 64 }).notNull(),
    userAgent: varchar({ length: 255 }),
    ip: varchar({ length: 64 }),
    remember: boolean().default(false).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: datetime().notNull(),
    revokedAt: datetime(),
    replacedBy: char({ length: 26 }),
  },
  (table) => [
    index("idxSessionsRevoked").on(table.revokedAt),
    index("idxSessionsUserExpires").on(table.userId, table.expiresAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkSessionsUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const shippingarearates = mysqlTable(
  "shippingarearates",
  {
    id: int().autoincrement().primaryKey(),
    countryId: bigint({ unsigned: true, mode: "number" }).notNull(),
    stateId: bigint({ unsigned: true, mode: "number" }),
    cityId: bigint({ unsigned: true, mode: "number" }),
    cost: decimal({ precision: 10, scale: 2, mode: "number" }).notNull(),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("cityId").on(table.cityId),
    index("stateId").on(table.stateId),
    uniqueIndex("uniqueLocationRate").on(
      table.cityId,
      table.countryId,
      table.stateId
    ),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.id],
      name: "shippingarearates_ibfk_1",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.id],
      name: "shippingarearates_ibfk_2",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.cityId],
      foreignColumns: [cities.id],
      name: "shippingarearates_ibfk_3",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const shippingmethods = mysqlTable(
  "shippingmethods",
  {
    id: int().autoincrement().primaryKey(),
    code: varchar({ length: 50 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    status: mysqlEnum(["active", "inactive"]).default("inactive").notNull(),
    cost: decimal({ precision: 10, scale: 2, mode: "number" }).default(
      sql`NULL`
    ),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("code").on(table.code)]
);

export const inboundshippingmethods = mysqlTable(
  "inboundshippingmethods",
  {
    id: int().autoincrement().primaryKey(),
    code: varchar({ length: 50 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    status: mysqlEnum(["active", "inactive"]).default("inactive").notNull(),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("code").on(table.code)]
);

export const sitesettings = mysqlTable(
  "sitesettings",
  {
    id: int().autoincrement().primaryKey(),
    settingKey: varchar({ length: 100 }).notNull(),
    settingValue: text().notNull(),
    description: varchar({ length: 255 }),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idxSettingKey").on(table.settingKey),
    uniqueIndex("settingKey").on(table.settingKey),
  ]
);

export const states = mysqlTable(
  "states",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    countryId: bigint({ unsigned: true, mode: "number" }).notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    statusEffective: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxStatesCountryId").on(table.countryId),
    index("idxStatesStatus").on(table.status),
    uniqueIndex("uniqStatesCountryName").on(table.name, table.countryId),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.id],
      name: "fkStatesCountryId",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ]
);

export const stocklevels = mysqlTable(
  "stocklevels",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    stockLocationId: int().notNull(),
    onHand: int().default(0).notNull(),
    allocated: int().default(0).notNull(),
    onOrder: int().default(0).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxStockLevelsLocation").on(table.stockLocationId),
    uniqueIndex("uniqStockLevelVariantLocation").on(
      table.productVariantId,
      table.stockLocationId
    ),
    foreignKey({
      columns: [table.stockLocationId],
      foreignColumns: [stocklocations.id],
      name: "fkStockLevelsLocation",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkStockLevelsVariant",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ]
);

export const stocklocations = mysqlTable("stocklocations", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  type: mysqlEnum([
    "Warehouse",
    "Store",
    "Office",
    "Factory",
    "Others",
  ]).notNull(),
  description: text(),
  status: mysqlEnum(["active", "inactive"]).default("active"),
  createdAt: timestamp()
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp()
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  address: text(),
  city: varchar({ length: 100 }),
  state: varchar({ length: 100 }),
  postalCode: varchar({ length: 20 }),
  country: varchar({ length: 100 }),
});

export const stockmovements = mysqlTable(
  "stockmovements",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    stockLocationId: int().notNull(),
    performedByUserId: bigint({ unsigned: true, mode: "number" }),
    quantity: int().notNull(),
    type: mysqlEnum([
      "purchase_receipt",
      "purchase_return",
      "sale_shipment",
      "adjustment",
      "transfer_in",
      "transfer_out",
    ])
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    referenceType: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    referenceId: bigint({ unsigned: true, mode: "number" }),
    transferId: varchar({ length: 36 }), // UUID to correlate transfer_in/transfer_out pairs
    note: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxStockMovementsLocation").on(table.stockLocationId),
    index("idxStockMovementsVariant").on(table.productVariantId),
    index("idxStockMovementsActor").on(table.performedByUserId),
    index("idxStockMovementsTransfer").on(table.transferId),
    foreignKey({
      columns: [table.stockLocationId],
      foreignColumns: [stocklocations.id],
      name: "fkStockMovementsLocation",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkStockMovementsVariant",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.performedByUserId],
      foreignColumns: [users.id],
      name: "fkStockMovementsActor",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const taxes = mysqlTable(
  "taxes",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    rate: decimal({ precision: 10, scale: 4, mode: "number" })
      .default(0.0)
      .notNull(),
    type: mysqlEnum(["percentage", "fixed"]).default("percentage").notNull(),
    status: mysqlEnum(["active", "inactive"]).default("active").notNull(),
    countryId: bigint({ unsigned: true, mode: "number" }),
    validFrom: datetime(),
    validTo: datetime(),
    createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idxTaxesCountryId").on(table.countryId),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.id],
      name: "fkTaxesCountry",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const trusteddevices = mysqlTable(
  "trusteddevices",
  {
    id: char({ length: 26 }).primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    tokenHash: char({ length: 64 }).notNull(),
    fingerPrint: char({ length: 64 }),
    userAgent: varchar({ length: 255 }),
    ip: varchar({ length: 64 }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    lastUsedAt: datetime(),
    expiresAt: datetime().notNull(),
    revokedAt: datetime(),
  },
  (table) => [
    index("idxTrustedExpires").on(table.expiresAt),
    index("idxTrustedRevoked").on(table.revokedAt),
    index("idxTrustedUserExpires").on(table.userId, table.expiresAt),
    uniqueIndex("uniqUserToken").on(table.userId, table.tokenHash),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkTrustedUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const unitfields = mysqlTable(
  "unitfields",
  {
    id: int().autoincrement().primaryKey(),
    unitGroupId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    required: boolean().default(false),
  },
  (table) => [
    index("unitGroupId").on(table.unitGroupId),
    foreignKey({
      columns: [table.unitGroupId],
      foreignColumns: [unitgroups.id],
      name: "unitfields_ibfk_1",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const unitgroups = mysqlTable("unitgroups", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  status: mysqlEnum(["active", "inactive"]).default("active"),
  createdAt: timestamp()
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp()
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const unitvalues = mysqlTable( 
  "unitvalues",
  {
    id: int().autoincrement().primaryKey(),
    unitGroupId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 50 }).notNull(),
  },
  (table) => [
    index("unitGroupId").on(table.unitGroupId),
    foreignKey({
      columns: [table.unitGroupId],
      foreignColumns: [unitgroups.id],
      name: "unitvalues_ibfk_1",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const users = mysqlTable(
  "users",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    fullName: varchar({ length: 191 }).notNull(),
    email: varchar({ length: 191 }).notNull(),
    username: varchar({ length: 191 }),
    phone: varchar({ length: 32 }),
    passwordHash: varchar({ length: 191 }).notNull(),
    role: mysqlEnum(["user", "admin"]).default("user").notNull(),
    status: mysqlEnum(["active", "inactive", "blocked"])
      .default("active")
      .notNull(),
    mfaEnabled: boolean().default(false).notNull(),
    mfaSecretEnc: blob({ mode: "buffer" }),
    emailVerifiedAt: datetime(),
    phoneVerifiedAt: datetime(),
    defaultShippingFullName: varchar({ length: 255 }),
    defaultShippingPhone: varchar({ length: 50 }),
    defaultShippingEmail: varchar({ length: 255 }),
    defaultShippingCountry: varchar({ length: 100 }),
    defaultShippingCountryId: int(),
    defaultShippingState: varchar({ length: 100 }),
    defaultShippingStateId: int(),
    defaultShippingCity: varchar({ length: 100 }),
    defaultShippingCityId: int(),
    defaultShippingAddressLine1: varchar({ length: 255 }),
    defaultShippingAddressLine2: varchar({ length: 255 }),
    defaultShippingPostalCode: varchar({ length: 50 }),
    googleSub: varchar({ length: 64 }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    roleId: int(),
  },
  (table) => [
    uniqueIndex("email").on(table.email),
    uniqueIndex("googleSub").on(table.googleSub),
    uniqueIndex("uniqUsersPhone").on(table.phone),
    uniqueIndex("username").on(table.username),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "fkUserRole",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const variants = mysqlTable(
  "variants",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    slug: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxName").on(table.name),
    index("idxStatus").on(table.status),
    uniqueIndex("name").on(table.name),
    uniqueIndex("slug").on(table.slug),
  ]
);

export const variantvalues = mysqlTable(
  "variantvalues",
  {
    id: int().autoincrement().primaryKey(),
    variantId: int().notNull(),
    value: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    slug: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxStatus").on(table.status),
    index("idxVariantId").on(table.variantId),
    uniqueIndex("uniqueVariantSlug").on(table.slug, table.variantId),
    uniqueIndex("uniqueVariantValue").on(table.value, table.variantId),
    foreignKey({
      columns: [table.variantId],
      foreignColumns: [variants.id],
      name: "variantvalues_ibfk_1",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const vendors = mysqlTable(
  "vendors",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    description: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    country: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    address: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    phoneNumber: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    phoneCode: varchar({ length: 20 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    email: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    website: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [uniqueIndex("uniqueName").on(table.name)]
);

export const warranties = mysqlTable(
  "warranties",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    description: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    status: mysqlEnum(["active", "inactive"])
      .default("active")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [uniqueIndex("uniqueName").on(table.name)]
);

// ─────────────────────────────────────────────────────────────────────────────
// Shopping Cart - Server-side cart for authenticated users
// ─────────────────────────────────────────────────────────────────────────────

export const carts = mysqlTable(
  "carts",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqCartUser").on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkCartsUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const cartitems = mysqlTable(
  "cartitems",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    cartId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    quantity: int().default(1).notNull(),
    addedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqCartItemVariant").on(table.cartId, table.productVariantId),
    index("idxCartItemsCart").on(table.cartId),
    index("idxCartItemsVariant").on(table.productVariantId),
    foreignKey({
      columns: [table.cartId],
      foreignColumns: [carts.id],
      name: "fkCartItemsCart",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkCartItemsVariant",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const wishlistitems = mysqlTable(
  "wishlistitems",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productId: bigint({ unsigned: true, mode: "number" }).notNull(),
    addedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqWishlistUserProduct").on(table.userId, table.productId),
    index("idxWishlistUser").on(table.userId),
    index("idxWishlistProduct").on(table.productId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkWishlistItemsUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fkWishlistItemsProduct",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs - Track sensitive admin operations
// ─────────────────────────────────────────────────────────────────────────────

export const productreviews = mysqlTable(
  "productreviews",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    productId: bigint({ unsigned: true, mode: "number" }).notNull(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    rating: tinyint({ unsigned: true }).notNull(),
    previousRating: tinyint({ unsigned: true }),
    comment: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci").notNull(),
    previousComment: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    status: mysqlEnum(["pending", "approved", "rejected", "deleted_by_user"])
      .default("pending")
      .notNull(),
    moderationNote: varchar({ length: 500 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    isSuspicious: tinyint({ unsigned: true }).default(0).notNull(),
    suspiciousScore: int().default(0).notNull(),
    suspiciousReasonsJson: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    suspiciousFlaggedAt: datetime(),
    editedAt: datetime(),
    approvedAt: datetime(),
    approvedByUserId: bigint({ unsigned: true, mode: "number" }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxProductReviewsUserProduct").on(table.userId, table.productId),
    index("idxProductReviewsProductStatus").on(table.productId, table.status),
    index("idxProductReviewsStatusCreatedAt").on(table.status, table.createdAt),
    index("idxProductReviewsSuspiciousStatusCreatedAt").on(
      table.isSuspicious,
      table.status,
      table.createdAt
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fkProductReviewsProduct",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkProductReviewsUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.approvedByUserId],
      foreignColumns: [users.id],
      name: "fkProductReviewsApprovedBy",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const orders = mysqlTable(
  "orders",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    orderNumber: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    status: mysqlEnum([
      "pending_confirmation",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ])
      .default("pending_confirmation")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    paymentMethod: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    paymentStatus: mysqlEnum([
      "unpaid",
      "pending",
      "paid",
      "failed",
      "cancelled",
      "refunded",
      "partially_refunded",
    ])
      .default("unpaid")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    paymentProvider: varchar({ length: 100 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    paymentReference: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    currency: char({ length: 3 }).notNull(),
    subtotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    discountTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    shippingTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    taxTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    grandTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    shippingMethodCode: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci"),
    couponCode: varchar({ length: 100 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    notes: text().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    shippingFullName: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    shippingPhone: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    shippingEmail: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    shippingCountry: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    shippingState: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    shippingCity: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    shippingAddressLine1: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    shippingAddressLine2: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    shippingPostalCode: varchar({ length: 50 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    billingFullName: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    billingPhone: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    billingEmail: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    billingCountry: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    billingState: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    billingCity: varchar({ length: 100 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    billingAddressLine1: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    billingAddressLine2: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    billingPostalCode: varchar({ length: 50 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    placedAt: datetime().notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqOrderNumber").on(table.orderNumber),
    index("idxOrdersUserCreatedAt").on(table.userId, table.createdAt),
    index("idxOrdersStatusCreatedAt").on(table.status, table.createdAt),
    index("idxOrdersPlacedAt").on(table.placedAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkOrdersUser",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ]
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    invoiceNumber: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    orderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    status: mysqlEnum(["draft", "issued", "paid", "partially_paid", "void"])
      .default("issued")
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    currency: char({ length: 3 }).notNull(),
    subtotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    discountTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    shippingTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    taxTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    grandTotal: decimal({ precision: 15, scale: 2, mode: "number" }).default(0.0).notNull(),
    issuedAt: datetime().default(sql`CURRENT_TIMESTAMP`).notNull(),
    dueAt: datetime(),
    paidAt: datetime(),
    note: varchar({ length: 1000 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    createdByUserId: bigint({ unsigned: true, mode: "number" }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqInvoiceNumber").on(table.invoiceNumber),
    uniqueIndex("uniqInvoiceOrder").on(table.orderId),
    index("idxInvoicesStatusIssuedAt").on(table.status, table.issuedAt),
    index("idxInvoicesCreatedAt").on(table.createdAt),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "fkInvoicesOrder",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "fkInvoicesCreatedBy",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const couponredemptions = mysqlTable(
  "couponredemptions",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    couponId: bigint({ unsigned: true, mode: "number" }).notNull(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    orderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    discountAmount: decimal({ precision: 15, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uniqCouponRedemptionsCouponOrder").on(table.couponId, table.orderId),
    index("idxCouponRedemptionsCouponUser").on(table.couponId, table.userId),
    index("idxCouponRedemptionsOrder").on(table.orderId),
    foreignKey({
      columns: [table.couponId],
      foreignColumns: [coupons.id],
      name: "fkCouponRedemptionsCoupon",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkCouponRedemptionsUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "fkCouponRedemptionsOrder",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);

export const orderitems = mysqlTable(
  "orderitems",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    orderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productId: bigint({ unsigned: true, mode: "number" }).notNull(),
    productVariantId: bigint({ unsigned: true, mode: "number" }).notNull(),
    sku: varchar({ length: 100 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    productName: varchar({ length: 255 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    variantName: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    imageSrc: varchar({ length: 1024 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    unitPrice: decimal({ precision: 15, scale: 2, mode: "number" }).notNull(),
    quantity: int().notNull(),
    lineTotal: decimal({ precision: 15, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxOrderItemsOrder").on(table.orderId),
    index("idxOrderItemsVariant").on(table.productVariantId),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "fkOrderItemsOrder",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fkOrderItemsProduct",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.productVariantId],
      foreignColumns: [productvariants.id],
      name: "fkOrderItemsVariant",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ]
);

export const orderstatushistory = mysqlTable(
  "orderstatushistory",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    orderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    fromStatus: varchar({ length: 50 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    toStatus: varchar({ length: 50 })
      .charSet("utf8mb4")
      .collate("utf8mb4_unicode_ci")
      .notNull(),
    reason: varchar({ length: 500 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    actorUserId: bigint({ unsigned: true, mode: "number" }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxOrderStatusHistoryOrder").on(table.orderId),
    index("idxOrderStatusHistoryCreatedAt").on(table.createdAt),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "fkOrderStatusHistoryOrder",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.id],
      name: "fkOrderStatusHistoryActor",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const orderrequests = mysqlTable(
  "orderrequests",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    orderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    userId: bigint({ unsigned: true, mode: "number" }).notNull(),
    type: mysqlEnum(["cancel", "return", "refund"]).notNull(),
    status: mysqlEnum(["pending", "approved", "rejected", "completed", "cancelled_by_user"])
      .default("pending")
      .notNull(),
    reason: varchar({ length: 1000 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    adminNote: varchar({ length: 1000 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    metadataJson: longtext().charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
    requestedAt: datetime().default(sql`CURRENT_TIMESTAMP`).notNull(),
    decidedAt: datetime(),
    completedAt: datetime(),
    decidedByUserId: bigint({ unsigned: true, mode: "number" }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    activeRequestKey: varchar({ length: 128 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci"),
  },
  (table) => [
    uniqueIndex("uqOrderRequestsActiveRequestKey").on(table.activeRequestKey),
    index("idxOrderRequestsOrderTypeStatus").on(table.orderId, table.type, table.status),
    index("idxOrderRequestsUserStatusRequestedAt").on(table.userId, table.status, table.requestedAt),
    index("idxOrderRequestsStatusRequestedAt").on(table.status, table.requestedAt),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "fkOrderRequestsOrder",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "fkOrderRequestsUser",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.decidedByUserId],
      foreignColumns: [users.id],
      name: "fkOrderRequestsDecidedBy",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ]
);

export const ordertaxlines = mysqlTable(
  "ordertaxlines",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    orderId: bigint({ unsigned: true, mode: "number" }).notNull(),
    taxId: int(),
    taxName: varchar({ length: 255 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci").notNull(),
    taxType: varchar({ length: 50 }).charSet("utf8mb4").collate("utf8mb4_unicode_ci").notNull(),
    taxRate: decimal({ precision: 10, scale: 4, mode: "number" }).notNull(),
    countryId: bigint({ unsigned: true, mode: "number" }),
    amount: decimal({ precision: 15, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxOrderTaxLinesOrder").on(table.orderId),
    index("idxOrderTaxLinesTaxId").on(table.taxId),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "fkOrderTaxLinesOrder",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.taxId],
      foreignColumns: [taxes.id],
      name: "fkOrderTaxLinesTax",
    })
      .onUpdate("set null")
      .onDelete("set null"),
  ]
);

export const auditlogs = mysqlTable(
  "auditlogs",
  {
    id: bigint({ unsigned: true, mode: "number" }).autoincrement().primaryKey(),
    userId: int().notNull(),
    action: mysqlEnum(["create", "update", "delete", "login", "login_failed", "logout", "refresh", "password_change", "password_reset"]).notNull(),
    entityType: varchar({ length: 50 }).notNull(),
    entityId: varchar({ length: 50 }),
    metadata: longtext(),
    ipAddress: varchar({ length: 45 }),
    userAgent: varchar({ length: 512 }),
    createdAt: timestamp()
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idxUserId").on(table.userId),
    index("idxEntityType").on(table.entityType),
    index("idxCreatedAt").on(table.createdAt),
    index("idxEntityTypeId").on(table.entityType, table.entityId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "auditlogs_userId_fk",
    })
      .onUpdate("restrict")
      .onDelete("cascade"),
  ]
);
