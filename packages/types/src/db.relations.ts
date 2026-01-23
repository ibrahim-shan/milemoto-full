import { defineRelations } from "drizzle-orm";
import * as schema from "./db.schema.js";

export const relations = defineRelations(schema, (r) => ({
  categories: {
    category: r.one.categories({
      from: r.categories.parentId,
      to: r.categories.id,
      alias: "categories_parentId_categories_id",
    }),
    categories: r.many.categories({
      alias: "categories_parentId_categories_id",
    }),
    productsCategoryId: r.many.products({
      alias: "products_categoryId_categories_id",
    }),
    productsSubCategoryId: r.many.products({
      alias: "products_subCategoryId_categories_id",
    }),
  },
  cities: {
    state: r.one.states({
      from: r.cities.stateId,
      to: r.states.id,
    }),
    shippingarearates: r.many.shippingarearates(),
  },
  states: {
    cities: r.many.cities(),
    shippingarearates: r.many.shippingarearates(),
    country: r.one.countries({
      from: r.states.countryId,
      to: r.countries.id,
    }),
  },
  collections: {
    productvariants: r.many.productvariants({
      from: r.collections.id.through(r.collectionProducts.collectionId),
      to: r.productvariants.id.through(r.collectionProducts.productVariantId),
    }),
  },
  productvariants: {
    collections: r.many.collections(),
    goodsreceiptlines: r.many.goodsreceiptlines(),
    products: r.many.products({
      alias: "products_id_productvariants_id_via_productimages",
    }),
    variantvalues: r.many.variantvalues(),
    product: r.one.products({
      from: r.productvariants.productId,
      to: r.products.id,
      alias: "productvariants_productId_products_id",
    }),
    purchaseorderlines: r.many.purchaseorderlines(),
    stocklocationsViaStocklevels: r.many.stocklocations({
      alias: "stocklocations_id_productvariants_id_via_stocklevels",
    }),
    stocklocationsViaStockmovements: r.many.stocklocations({
      alias: "stocklocations_id_productvariants_id_via_stockmovements",
    }),
  },
  companyprofile: {
    country: r.one.countries({
      from: r.companyprofile.countryId,
      to: r.countries.id,
    }),
  },
  countries: {
    companyprofiles: r.many.companyprofile(),
    shippingarearates: r.many.shippingarearates(),
    states: r.many.states(),
    taxes: r.many.taxes(),
  },
  emailverifications: {
    user: r.one.users({
      from: r.emailverifications.userId,
      to: r.users.id,
    }),
  },
  phoneverifications: {
    user: r.one.users({
      from: r.phoneverifications.userId,
      to: r.users.id,
    }),
  },
  users: {
    emailverifications: r.many.emailverifications(),
    phoneverifications: r.many.phoneverifications(),
    purchaseordersViaGoodsreceipts: r.many.purchaseorders({
      alias: "purchaseorders_id_users_id_via_goodsreceipts",
    }),
    mfabackupcodes: r.many.mfabackupcodes(),
    mfachallenges: r.many.mfachallenges(),
    mfaloginchallenges: r.many.mfaloginchallenges(),
    passwordresets: r.many.passwordresets(),
    purchaseordersApprovedByUserId: r.many.purchaseorders({
      alias: "purchaseorders_approvedByUserId_users_id",
    }),
    purchaseordersCreatedByUserId: r.many.purchaseorders({
      alias: "purchaseorders_createdByUserId_users_id",
    }),
    sessions: r.many.sessions(),
    trusteddevices: r.many.trusteddevices(),
    userRole: r.one.roles({
      from: r.users.roleId,
      to: r.roles.id,
    }),
  },
  goodsreceiptlines: {
    goodsreceipt: r.one.goodsreceipts({
      from: r.goodsreceiptlines.goodsReceiptId,
      to: r.goodsreceipts.id,
    }),
    purchaseorderline: r.one.purchaseorderlines({
      from: r.goodsreceiptlines.purchaseOrderLineId,
      to: r.purchaseorderlines.id,
    }),
    productvariant: r.one.productvariants({
      from: r.goodsreceiptlines.productVariantId,
      to: r.productvariants.id,
    }),
  },
  goodsreceipts: {
    goodsreceiptlines: r.many.goodsreceiptlines(),
  },
  purchaseorderlines: {
    goodsreceiptlines: r.many.goodsreceiptlines(),
    purchaseorder: r.one.purchaseorders({
      from: r.purchaseorderlines.purchaseOrderId,
      to: r.purchaseorders.id,
    }),
    tax: r.one.taxes({
      from: r.purchaseorderlines.taxId,
      to: r.taxes.id,
    }),
    productvariant: r.one.productvariants({
      from: r.purchaseorderlines.productVariantId,
      to: r.productvariants.id,
    }),
  },
  purchaseorders: {
    users: r.many.users({
      from: r.purchaseorders.id.through(r.goodsreceipts.purchaseOrderId),
      to: r.users.id.through(r.goodsreceipts.postedByUserId),
      alias: "purchaseorders_id_users_id_via_goodsreceipts",
    }),
    purchaseorderlines: r.many.purchaseorderlines(),
    userApprovedByUserId: r.one.users({
      from: r.purchaseorders.approvedByUserId,
      to: r.users.id,
      alias: "purchaseorders_approvedByUserId_users_id",
    }),
    userCreatedByUserId: r.one.users({
      from: r.purchaseorders.createdByUserId,
      to: r.users.id,
      alias: "purchaseorders_createdByUserId_users_id",
    }),
    currency: r.one.currencies({
      from: r.purchaseorders.currencyId,
      to: r.currencies.id,
    }),
    paymentmethod: r.one.paymentmethods({
      from: r.purchaseorders.paymentMethodId,
      to: r.paymentmethods.id,
    }),
    inboundshippingmethod: r.one.inboundshippingmethods({
      from: r.purchaseorders.inboundShippingMethodId,
      to: r.inboundshippingmethods.id,
    }),
    stocklocation: r.one.stocklocations({
      from: r.purchaseorders.stockLocationId,
      to: r.stocklocations.id,
    }),
    vendor: r.one.vendors({
      from: r.purchaseorders.vendorId,
      to: r.vendors.id,
    }),
  },
  mfabackupcodes: {
    user: r.one.users({
      from: r.mfabackupcodes.userId,
      to: r.users.id,
    }),
  },
  mfachallenges: {
    user: r.one.users({
      from: r.mfachallenges.userId,
      to: r.users.id,
    }),
  },
  mfaloginchallenges: {
    user: r.one.users({
      from: r.mfaloginchallenges.userId,
      to: r.users.id,
    }),
  },
  passwordresets: {
    user: r.one.users({
      from: r.passwordresets.userId,
      to: r.users.id,
    }),
  },
  products: {
    productvariantsViaProductimages: r.many.productvariants({
      from: r.products.id.through(r.productimages.productId),
      to: r.productvariants.id.through(r.productimages.productVariantId),
      alias: "products_id_productvariants_id_via_productimages",
    }),
    brand: r.one.brands({
      from: r.products.brandId,
      to: r.brands.id,
    }),
    categoryCategoryId: r.one.categories({
      from: r.products.categoryId,
      to: r.categories.id,
      alias: "products_categoryId_categories_id",
    }),
    grade: r.one.grades({
      from: r.products.gradeId,
      to: r.grades.id,
    }),
    shippingmethod: r.one.shippingmethods({
      from: r.products.shippingMethodId,
      to: r.shippingmethods.id,
    }),
    categorySubCategoryId: r.one.categories({
      from: r.products.subCategoryId,
      to: r.categories.id,
      alias: "products_subCategoryId_categories_id",
    }),
    vendor: r.one.vendors({
      from: r.products.vendorId,
      to: r.vendors.id,
    }),
    warranty: r.one.warranties({
      from: r.products.warrantyId,
      to: r.warranties.id,
    }),
    productspecifications: r.many.productspecifications(),
    productvariantsProductId: r.many.productvariants({
      alias: "productvariants_productId_products_id",
    }),
  },
  brands: {
    products: r.many.products(),
  },
  grades: {
    products: r.many.products(),
  },
  shippingmethods: {
    products: r.many.products(),
  },
  inboundshippingmethods: {
    purchaseorders: r.many.purchaseorders(),
  },
  vendors: {
    products: r.many.products(),
    purchaseorders: r.many.purchaseorders(),
  },
  warranties: {
    products: r.many.products(),
  },
  productspecifications: {
    unitfields: r.many.unitfields({
      from: r.productspecifications.id.through(
        r.productspecificationfields.productSpecificationId
      ),
      to: r.unitfields.id.through(r.productspecificationfields.unitFieldId),
    }),
    product: r.one.products({
      from: r.productspecifications.productId,
      to: r.products.id,
    }),
    unitgroup: r.one.unitgroups({
      from: r.productspecifications.unitGroupId,
      to: r.unitgroups.id,
    }),
    unitvalue: r.one.unitvalues({
      from: r.productspecifications.unitValueId,
      to: r.unitvalues.id,
    }),
  },
  unitfields: {
    productspecifications: r.many.productspecifications(),
    unitgroup: r.one.unitgroups({
      from: r.unitfields.unitGroupId,
      to: r.unitgroups.id,
    }),
  },
  unitgroups: {
    productspecifications: r.many.productspecifications(),
    unitfields: r.many.unitfields(),
    unitvalues: r.many.unitvalues(),
  },
  unitvalues: {
    productspecifications: r.many.productspecifications(),
    unitgroup: r.one.unitgroups({
      from: r.unitvalues.unitGroupId,
      to: r.unitgroups.id,
    }),
  },
  variantvalues: {
    productvariants: r.many.productvariants({
      from: r.variantvalues.id.through(
        r.productvariantattributes.variantValueId
      ),
      to: r.productvariants.id.through(
        r.productvariantattributes.productVariantId
      ),
    }),
    variant: r.one.variants({
      from: r.variantvalues.variantId,
      to: r.variants.id,
    }),
  },
  taxes: {
    purchaseorderlines: r.many.purchaseorderlines(),
    country: r.one.countries({
      from: r.taxes.countryId,
      to: r.countries.id,
    }),
  },
  currencies: {
    purchaseorders: r.many.purchaseorders(),
  },
  paymentmethods: {
    purchaseorders: r.many.purchaseorders(),
  },
  stocklocations: {
    purchaseorders: r.many.purchaseorders(),
    productvariantsViaStocklevels: r.many.productvariants({
      from: r.stocklocations.id.through(r.stocklevels.stockLocationId),
      to: r.productvariants.id.through(r.stocklevels.productVariantId),
      alias: "stocklocations_id_productvariants_id_via_stocklevels",
    }),
    productvariantsViaStockmovements: r.many.productvariants({
      from: r.stocklocations.id.through(r.stockmovements.stockLocationId),
      to: r.productvariants.id.through(r.stockmovements.productVariantId),
      alias: "stocklocations_id_productvariants_id_via_stockmovements",
    }),
  },
  permissions: {
    roles: r.many.roles({
      from: r.permissions.id.through(r.rolepermissions.permissionId),
      to: r.roles.id.through(r.rolepermissions.roleId),
    }),
  },
  smsgateways: {
    smsdeliveryreports: r.many.smsdeliveryreports(),
    smsusage: r.many.smsusage(),
  },
  smsdeliveryreports: {
    smsgateway: r.one.smsgateways({
      from: r.smsdeliveryreports.gatewayId,
      to: r.smsgateways.id,
    }),
  },
  smsusage: {
    smsgateway: r.one.smsgateways({
      from: r.smsusage.gatewayId,
      to: r.smsgateways.id,
    }),
  },
  roles: {
    permissions: r.many.permissions(),
    users: r.many.users(),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },
  shippingarearates: {
    country: r.one.countries({
      from: r.shippingarearates.countryId,
      to: r.countries.id,
    }),
    state: r.one.states({
      from: r.shippingarearates.stateId,
      to: r.states.id,
    }),
    city: r.one.cities({
      from: r.shippingarearates.cityId,
      to: r.cities.id,
    }),
  },
  trusteddevices: {
    user: r.one.users({
      from: r.trusteddevices.userId,
      to: r.users.id,
    }),
  },
  variants: {
    variantvalues: r.many.variantvalues(),
  },
}));
