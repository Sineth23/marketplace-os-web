# Screen and Data Contracts — Observed Implementation

Derived from an authenticated read-only observation of the reference application plus static
analysis of its public bundles. The provider is not named, and endpoint paths are expressed
relative to the origin.

Two independent observations were used:

- **Static analysis** of four publicly served JavaScript bundles (377,739 AST nodes, 0 parse
  failures) for the bulk-update and job-status contracts.
- **Authenticated observation** of six screens for the read paths, response shapes, and
  table structures.

Record counts below are the observed `recordsFiltered` values for the observed tenant, not
specifications.

---

## 1. Two page delivery modes

The reference application uses both, and the difference matters for implementation.

| Mode                     | Behaviour                                              | Screens                                                                                                           |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Server-rendered**      | Full HTML with the rows already in it. No XHR on load. | Product Catalog, Listings, Scan Reports, Inventory Reports, Process Batches, Purchase Orders, Organization detail |
| **DataTables over JSON** | Empty shell in the HTML; rows fetched as JSON on load. | Inventory, Pricing, Organizations                                                                                 |

DataTables mode uses a fixed query contract:

```
GET /<resource>.json?search[value]=&start=0&length=100&draw=1
```

Response envelope:

```jsonc
{
  "draw": 1,
  "recordsTotal": 0,
  "recordsFiltered": 4382,
  "data": [/* rows */],
}
```

`recordsTotal` is reported as `0` on the observed tenant; `recordsFiltered` carries the real
total. Treat `recordsTotal` as unreliable and derive totals from `recordsFiltered`.

List screens add a status and date-range filter:

```
GET /<resource>.json?status=All
  &date_range[start_date]=
  &date_range[end_date]=
  &search[value]=
  &start=0&length=100&draw=1
```

---

## 2. Inventory — `GET /inventories.json`

Observed: 4,382 records.

Row shape:

| Field                 | Type           | Notes                        |
| --------------------- | -------------- | ---------------------------- |
| `id`                  | number         | inventory unit id            |
| `hex_id`              | string         | external/hex identifier      |
| `esn`                 | string         | may be `N/A` when absent     |
| `status`              | string         | unit status                  |
| `grade`               | string         |                              |
| `damage_initials`     | string         | damage condition initials    |
| `damage_title`        | string         | damage condition title       |
| `sale_price`          | string         | numeric string, not a number |
| `list_price`          | string         | numeric string               |
| `created_at`          | string         |                              |
| `url`                 | string         | record permalink             |
| `device`              | object         | `title_1`, `title_2`         |
| `sku`                 | object         | see below                    |
| `order`               | object \| null | sales order link             |
| `purchase_order`      | object \| null | purchase order link          |
| `location`            | object \| null | location link                |
| `custom_field_values` | object         | keyed by custom field label  |

Nested `sku`:

`id`, `device_id`, `grade`, `tenant_id`, `title`, `price` (number), `description`,
`sorted_damage_condition_ids` (string), `known_duplicate` (boolean),
`allow_duplicate_title` (boolean), `sellbrite_product_id`, `weight`, `weight_unit`,
`created_at`, `updated_at`, `deleted_at`, `deleted_by`.

Nested `order`: `sequential_id`, `customer`, `channel`, `created_at`, `url`.

Nested `purchase_order`: `id`, `sequential_id`, `vendor`, `created_at`, `url`.

Nested `location`: `id`, `title`, `warehouse_id`, `tenant_id`, `created_at`, `updated_at`.

### Custom fields

`custom_field_values` is a map keyed by the field's display label, and the value is either
`null` or a record:

```jsonc
"custom_field_values": {
  "Battery Health": {
    "id": 0, "inventory_id": 0, "tenant_id": 0,
    "custom_field_label_id": 0, "value": "", "created_at": "", "updated_at": ""
  },
  "Local": null,
  "Marketplace Status": null
}
```

Three labels were observed: `Battery Health`, `Local`, `Marketplace Status`. Labels are
tenant-defined, so treat the map as open-ended rather than a fixed column set. A value of
`null` means the field is not set for that unit, which is distinct from an empty string.

---

## 3. Process Batches — `GET /process_batches.json`

Observed: 15 records. This is the Process Batches list.

Row shape:

| Field                  | Type           | Notes                               |
| ---------------------- | -------------- | ----------------------------------- |
| `id`                   | number         |                                     |
| `tenant_sequential_id` | number         | display number, `PB #16`            |
| `title`                | string         | the description, e.g. `UPDATE SOLD` |
| `status`               | string         | `New` / `Processing` / `Complete`   |
| `created_at`           | string         |                                     |
| `created_by`           | string         | display name of the user            |
| `quantity`             | number \| null | item count; null when not yet known |
| `url`                  | string         | permalink                           |

Table columns rendered: `ID`, `Date`, `Description`, `Status`, `Items`, `Created By`,
`Delete`.

### Batch detail — `/process_batches/{id}`

Server-rendered. Table columns:

`PO`, `Product`, `ID`, `ESN`, `Grade`, `Damages`, `Status`, `Location`, `Sold`, `Order`,
`Battery Health`, `Marketplace Status`, `Local`.

`Battery Health` and `Marketplace Status` are custom-field columns and render empty when the
field is unset. `Product` renders a title plus a specification line and a `SKU:` line.

---

## 4. Purchase Orders — `GET /inventory_batches.json`

Observed: 90 records. The navigation label is "Purchase Orders" and the route is
`/inventory_batches`; the screen title is "Receiving".

Row shape:

| Field                  | Type   | Notes                    |
| ---------------------- | ------ | ------------------------ |
| `id`                   | number |                          |
| `tenant_sequential_id` | number | display number, `PO #90` |
| `channel`              | string | e.g. `Retail`            |
| `date`                 | string |                          |
| `quantity`             | number | device count             |
| `transaction_number`   | string | may be empty             |
| `status`               | string |                          |
| `organization`         | object | see below                |
| `url`                  | string | permalink                |

Nested `organization`: `id`, `name`, `tenant_id`, `tenant_sequential_id`, `created_at`,
`updated_at`, `created_by`, `deleted_at`, `deleted_by`, `combined_into`, `invoice_email`,
`phone_number`.

Table columns rendered: `ID`, `Date`, `Channel`, `Vendor`, `Devices`, `Transaction`,
`Status`. The `Vendor` column renders the organization name.

---

## 5. Pricing — `GET /pricing.json`

Observed: 172 records. One row per SKU.

| Field                         | Type                           | Notes                        |
| ----------------------------- | ------------------------------ | ---------------------------- |
| `id`                          | number                         |                              |
| `device_id`                   | number                         |                              |
| `grade`                       | string                         |                              |
| `tenant_id`                   | number                         |                              |
| `title`                       | string                         |                              |
| `price`                       | string                         | numeric string               |
| `description`                 | string \| null                 |                              |
| `sorted_damage_condition_ids` | string                         |                              |
| `quantity`                    | number                         | stock quantity for the SKU   |
| `known_duplicate`             | boolean                        |                              |
| `allow_duplicate_title`       | boolean                        |                              |
| `sellbrite_product_id`        | string \| null                 |                              |
| `weight`, `weight_unit`       | number \| null, string \| null |                              |
| `damage_conditions`           | array                          | empty on the observed tenant |
| `created_at`, `updated_at`    | string                         |                              |
| `deleted_at`, `deleted_by`    | null                           | soft-delete columns          |
| `device`                      | object                         | see below                    |

Nested `device`: `id`, `manufacturer`, `model`, `variant`, `capacity`, `color`, `network`,
`created_at`, `updated_at`, `tenant_id`, `deleted_at`, `deleted_by`, `combined_into`,
`known_duplicate`, `product_type_id`, `product_attributes` (object).

This is the closest thing to a canonical product record in the system: manufacturer, model,
variant, capacity, color, and network are all first-class here.

---

## 6. Product Catalog — `/products`

Server-rendered. Sub-tabs: Product Variations, SKUs, Products, Manufacturers, Models,
Variants, Networks, Colors, Capacities, Grades, Damage Conditions.

Table columns: `ID`, `SKU`, `Product`, `Grade`, `Conditions`.

The `SKU` column holds the composed identifier, for example
`IPHONE17A3258256GBBLACOB`, built from the product, network, capacity, color, and grade
codes. The `Product` cell renders the device title plus a specification line such as
`Unlocked | 256GB | Black | A3258` and a condition tag such as `OPEN BOX`.

The product list heading carries the tenant's own name, so that part of the heading is
tenant naming rather than a fixed part of the schema.

---

## 7. Organizations — `GET /organizations.json`

Observed: 142 records.

Row shape: `id`, `name`, `created_at`, `url`.

Organization detail is server-rendered at `/organizations/{id}` and exposes
`/organizations/{id}.json` for the record. It shows name and phone number, and lists related
sales orders.

---

## 8. Listings — `/listings`

Server-rendered. Table columns: `Product Connection`, `Channel`, `Title`, `SKU(s)`, `Price`,
`Buybox`.

`Product Connection` renders a connected indicator, `Channel` a marketplace name, `SKU(s)` the
catalog SKU, and `Price` a formatted currency string.

---

## 9. Scan Reports — `/scan_reports`

Server-rendered. Table columns: `ID`, `Date`, `Title`, `Type`.

Observed 62 rows, `SR #63` style identifiers, and a `Type` of `Inventory`.

---

## 10. Inventory Reports — `/inventory_reports`

Server-rendered. Table columns: `Created`, `Title`, `Subtitle`, `Public Link`.

No rows were observed on the observed tenant.

---

## 11. Bulk-update and job-status contracts

From the static analysis of the public bundles.

### Request

```js
const jp = {
  "Sales Orders": "/orders/bulk_updates.json",
  "Purchase Orders": "/inventory_batches/bulk_updates.json",
  Organizations: "/organizations/bulk_updates.json",
};
```

```js
let n = { ids: this.selected };
n = Object.assign(n, { payload: this.payload });
axios.post(jp[this.index_type], n).then((r) => {
  this.job_status = r.data;
});
```

Request body:

```jsonc
{ "ids": [/* selected record ids */], "payload": {/* action-specific changes */} }
```

Response is a `job_status` object; its `id` drives the status component.

### Polling

```js
new Ap(`/job_statuses/${this.job_status_id}.json`, (t) => t.finished_at || t.failed_at);
```

- `GET /job_statuses/{id}.json`
- Terminal when `finished_at` or `failed_at` is set
- `job_status.description` is the progress text
- The monitor can be paused and resumed

The `New` / `Processing` / `Complete` values in the Process Batches list map onto this
lifecycle.

### Notes, photos, and column settings

| Endpoint                           | Method | Body                                             |
| ---------------------------------- | ------ | ------------------------------------------------ |
| `/notes.json`                      | POST   | `{ note: { text, noteable_id, noteable_type } }` |
| `/photos.json`                     | PUT    | `{ photos: [{ id, sort_index }] }`               |
| `/settings/tables.json`            | POST   | `{ table_setting: { title, columns } }`          |
| `/users.json?all=true&active=true` | GET    | —                                                |
| `/audit_steps/{id}`                | GET    | audit step detail                                |

Notes are polymorphic through `noteable_type` plus `noteable_id`. Table column selection is a
persisted per-user server-side setting.

---

## 12. Implications for the Marketplace OS data model

1. **The catalog and the serialized unit are separate records.** A SKU carries
   manufacturer, model, variant, capacity, color, network, grade, and price. A unit carries
   `hex_id`, `esn`, status, location, damage, sale price, and links to its order, purchase
   order, and SKU. The existing `InventorySku` and `InventoryUnit` types in `lib/api.ts` map
   onto this directly, and are missing `hex_id`, `damage_initials` / `damage_title`, and
   `list_price`.

2. **Custom fields need a child table, not columns.** `custom_field_values` is a tenant-defined
   map. A normalised `inventory_custom_field_values` table keyed by
   `(inventory_unit_id, field_label)` is required, plus a labels table. The columns named
   `Battery Health`, `Marketplace Status`, and `Local` are tenant labels and must not be
   hard-coded.

3. **Purchase orders are `inventory_batch`.** The route, the nav label, and the model name
   disagree with each other. Pick one internal name and keep the mapping explicit.

4. **Process Batches are a different thing from Purchase Orders.** Process Batches are
   bulk-update jobs; the entity is `inventory_batch` in the source, but the Process Batches
   list is a separate resource from `/inventory_batches.json`. They need separate tables.

5. **Prices are numeric strings in most places** and a number in `sku.price` and
   `pricing.price`. Normalise on write.

6. **Location is a first-class record** with `warehouse_id`, not a free-text column. The
   existing `InventoryUnit.location` is a plain string and will need a location table or a
   retained title.

7. **Deleted records are soft-deleted** via `deleted_at` and `deleted_by` on SKUs, devices, and
   organizations. List endpoints already filter them out.

8. **The list envelope carries an unreliable total.** Use `recordsFiltered`.

9. **Two delivery modes are in play.** A client that only speaks the DataTables JSON
   convention will not work against the server-rendered screens. Marketplace OS should
   standardise on the JSON convention for its own reads.

## 13. Fields the existing model does not yet carry

| Field                             | Where it lives        | Why it matters                                                   |
| --------------------------------- | --------------------- | ---------------------------------------------------------------- |
| `hex_id`                          | inventory unit        | external unit identifier                                         |
| `damage_initials`, `damage_title` | inventory unit        | damage conditions, currently collapsed into one `damages` string |
| `list_price`                      | inventory unit        | separate from `sale_price`                                       |
| `custom_field_values`             | inventory unit        | battery health, marketplace status, local flag                   |
| `quantity`                        | SKU                   | stock quantity for a SKU, needed for pricing and stock levels    |
| `device.product_attributes`       | device                | free-form product attributes                                     |
| `damage_conditions`               | SKU                   | array of condition records                                       |
| `purchase_order`                  | inventory unit        | PO link, vendor, sequential id                                   |
| `order`                           | inventory unit        | sales order link, channel, customer                              |
| `location.warehouse_id`           | inventory unit        | warehouse grouping                                               |
| `organization`                    | purchase order        | customer/vendor record                                           |
| `tenant_sequential_id`            | batch, purchase order | the display number (`PB #16`, `PO #90`)                          |
| `transaction_number`              | purchase order        | external transaction reference                                   |
