import assert from "node:assert/strict";
import test from "node:test";

import {
  BrandingSettings,
  CompanyProfileInput,
  CreateAreaRate,
  CreateBrand,
  CreateCategory,
  CreateCity,
  CreateCollectionSchema,
  CreateCountry,
  CreateCurrency,
  CreateLanguage,
  CreatePaymentMethod,
  CreateProduct,
  CreateState,
  CreateStockLocation,
  CreateTax,
  CreateUnitGroup,
  CreateVariantSchema,
  CreateVendor,
  CreateWarranty,
  CustomerListQuery,
  DocumentSettings,
  LocalizationSettings,
  StockAdjustmentInput,
  StockTransferInput,
  StoreCurrencySettings,
  UpdateShippingMethod,
} from "../src/api/index";

test("brand/category/paymentMethod/warranty normalize strings and default status", () => {
  const brand = CreateBrand.parse({
    name: "  ACME  ",
    slug: "  ACME  ",
  });
  assert.equal(brand.name, "ACME");
  assert.equal(brand.slug, "acme");
  assert.equal(brand.status, "active");

  const category = CreateCategory.parse({
    name: "  Wheels  ",
    slug: "  Wheels  ",
    parentId: null,
  });
  assert.equal(category.name, "Wheels");
  assert.equal(category.slug, "wheels");
  assert.equal(category.parentId, null);
  assert.equal(category.status, "active");

  const pm = CreatePaymentMethod.parse({ name: "  Cash  " });
  assert.equal(pm.name, "Cash");
  assert.equal(pm.status, "active");

  const warranty = CreateWarranty.parse({ name: "  1 year  " });
  assert.equal(warranty.name, "1 year");
  assert.equal(warranty.status, "active");
});

test("currency/language normalize code casing", () => {
  const currency = CreateCurrency.parse({
    name: "  US Dollar  ",
    code: "  usd  ",
    symbol: "  $  ",
    exchangeRate: 1,
  });
  assert.equal(currency.code, "USD");
  assert.equal(currency.symbol, "$");

  const language = CreateLanguage.parse({
    name: "  English  ",
    code: "  EN  ",
    countryCode: "  us  ",
  });
  assert.equal(language.code, "en");
  assert.equal(language.countryCode, "US");
  assert.equal(language.displayMode, "LTR");
});

test("tax trims name and defaults type/status", () => {
  const tax = CreateTax.parse({ name: "  VAT  ", rate: 15 });
  assert.equal(tax.name, "VAT");
  assert.equal(tax.type, "percentage");
  assert.equal(tax.status, "active");
});

test("vendor optional email/url normalization", () => {
  const vendor = CreateVendor.parse({
    name: "  Vendor  ",
    country: "  US  ",
    email: "  Test@Example.com ",
    website: "  https://example.com  ",
  });
  assert.equal(vendor.name, "Vendor");
  assert.equal(vendor.country, "US");
  assert.equal(vendor.email, "test@example.com");
  assert.equal(vendor.website, "https://example.com");
});

test("unit group rejects duplicate value names/codes after normalization", () => {
  assert.throws(() =>
    CreateUnitGroup.parse({
      name: "  Size  ",
      values: [
        { name: "  Small  ", code: "s" },
        { name: "small", code: "S" },
      ],
      fields: [{ name: "Note" }],
    })
  );
});

test("variant schema normalizes slugs", () => {
  const variant = CreateVariantSchema.parse({
    name: "  Color  ",
    slug: "  Color  ",
    values: [{ value: "  Red  ", slug: "  Red  " }],
  });
  assert.equal(variant.slug, "color");
  assert.equal(variant.values[0].slug, "red");
});

test("collection defaults matchType/rules and normalizes name/slug", () => {
  const collection = CreateCollectionSchema.parse({
    name: "  Sale  ",
    slug: "  Sale  ",
    type: "manual",
  });
  assert.equal(collection.name, "Sale");
  assert.equal(collection.slug, "sale");
  assert.equal(collection.matchType, "all");
  assert.deepEqual(collection.rules, []);
});

test("shipping schemas coerce numeric fields", () => {
  const area = CreateAreaRate.parse({
    countryId: "1",
    stateId: null,
    cityId: undefined,
    cost: "12.5",
  });
  assert.equal(area.countryId, 1);
  assert.equal(area.cost, 12.5);

  const method = UpdateShippingMethod.parse({ cost: "9.99" });
  assert.equal(method.cost, 9.99);
});

test("site settings trim timezone/copyright and keep nullables", () => {
  const loc = LocalizationSettings.parse({
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    defaultTimezone: "  UTC  ",
    defaultLanguageId: 1,
  });
  assert.equal(loc.defaultTimezone, "UTC");

  const store = StoreCurrencySettings.parse({
    defaultCurrencyId: 1,
    currencyPosition: "before",
    decimalDigits: 2,
    copyrightText: "  © Milemoto  ",
  });
  assert.equal(store.copyrightText, "© Milemoto");

  const branding = BrandingSettings.parse({ logoUrl: null });
  assert.equal(branding.logoUrl, null);

  const docs = DocumentSettings.parse({ purchaseOrderTerms: "  Terms  " });
  assert.equal(docs.purchaseOrderTerms, "Terms");
});

test("stock adjustments reject zero and trim note", () => {
  assert.throws(() =>
    StockAdjustmentInput.parse({
      productVariantId: 1,
      stockLocationId: 1,
      quantity: 0,
    })
  );

  const transfer = StockTransferInput.parse({
    productVariantId: 1,
    fromLocationId: 1,
    toLocationId: 2,
    quantity: 5,
    note: "  moved  ",
  });
  assert.equal(transfer.note, "moved");
});

test("stock location trims name and defaults status", () => {
  const loc = CreateStockLocation.parse({
    name: "  Main  ",
    type: "Warehouse",
  });
  assert.equal(loc.name, "Main");
  assert.equal(loc.status, "active");
});

test("location schemas coerce FKs and normalize code casing", () => {
  const country = CreateCountry.parse({ name: "  United States  ", code: " us ", status: "active" });
  assert.equal(country.name, "United States");
  assert.equal(country.code, "US");

  const state = CreateState.parse({ name: "  California  ", countryId: "1", status: "active" });
  assert.equal(state.name, "California");
  assert.equal(state.countryId, 1);

  const city = CreateCity.parse({ name: "  LA  ", stateId: "2", status: "inactive" });
  assert.equal(city.name, "LA");
  assert.equal(city.stateId, 2);
});

test("company profile input supports nullish optional fields", () => {
  const company = CompanyProfileInput.parse({
    name: "  Milemoto  ",
    publicEmail: "",
    website: null,
    countryId: "1",
    latitude: null,
    longitude: null,
  });
  assert.equal(company.name, "Milemoto");
  assert.equal(company.publicEmail, undefined);
  assert.equal(company.website, null);
  assert.equal(company.countryId, 1);
});

test("product schema normalizes variant barcode empty string to null and coerces numbers", () => {
  const product = CreateProduct.parse({
    name: "  Product  ",
    shortDescription: "  Short  ",
    longDescription: "  Long  ",
    brandId: 1,
    categoryId: 2,
    subCategoryId: 3,
    gradeId: 4,
    variants: [
      {
        sku: "  SKU-1  ",
        barcode: "  ",
        price: "10.5",
        costPrice: "",
        name: "  Default  ",
        attributes: [{ variantValueId: 1 }],
      },
    ],
    images: ["img1.png"],
  });
  assert.equal(product.name, "Product");
  assert.equal(product.variants[0].sku, "SKU-1");
  assert.equal(product.variants[0].barcode, null);
  assert.equal(product.variants[0].price, 10.5);
  assert.equal(product.variants[0].costPrice, undefined);
  assert.equal(product.variants[0].lowStockThreshold, 5);
});

test("customer list query enforces date-only", () => {
  const q = CustomerListQuery.parse({
    page: 1,
    limit: 10,
    dateStart: "2025-12-07",
    dateEnd: "",
    ordersMin: "1",
  });
  assert.equal(q.dateStart, "2025-12-07");
  assert.equal(q.dateEnd, undefined);
  assert.equal(q.ordersMin, 1);

  assert.throws(() =>
    CustomerListQuery.parse({
      page: 1,
      limit: 10,
      dateStart: "2025-12-07T00:00:00.000Z",
    })
  );
});

