# Partner Export Import — Backend Contract

The frontend parses partner export files in the browser, detects the file type from its
columns, and posts the mapped rows to the backend for a preview. The backend stores the
preview, lets an operator review it, and applies the approved rows to the tenant's data.

This document specifies the backend endpoints, the request and response shapes, the storage
model, and the rules the backend must enforce. The frontend implementation lives in this
repository.

## 1. Endpoints

All paths are relative to the API origin. Every request carries the session access token and
is scoped to one organization.

| Method | Path                                                                   | Purpose                           |
| ------ | ---------------------------------------------------------------------- | --------------------------------- |
| `POST` | `/v1/organizations/{organizationId}/partner-exports/preview`           | Create a preview from mapped rows |
| `GET`  | `/v1/organizations/{organizationId}/partner-exports/{batchId}`         | Read a preview                    |
| `POST` | `/v1/organizations/{organizationId}/partner-exports/{batchId}/approve` | Apply an approved preview         |

The backend must verify current membership of the organization on every one of these calls.
A browser-supplied organization ID is a selector, not an authorization.

## 2. Preview creation

```http
POST /v1/organizations/{organizationId}/partner-exports/preview
Content-Type: application/json
```

```jsonc
{
  "sourceFileName": "batch16.csv",
  "exportKind": "processBatch",
  "rows": [
    {
      "rowNumber": 2,
      "unitId": "V0",
      "serialNumber": null,
      "manufacturer": "Apple",
      "model": "AirPods 2nd Gen",
      "variant": "A2032",
      "network": "Wi-Fi",
      "capacity": null,
      "color": "White",
      "grade": "B Grade",
      "damages": null,
      "status": "Sold",
      "location": null,
      "purchaseOrder": null,
      "salesOrder": null,
      "salePrice": null,
      "customFields": {},
    },
  ],
  "rejected": [{ "rowNumber": 7, "message": "The unit identifier is required." }],
}
```

### Field notes

- `exportKind` is one of `inventory`, `processBatch`, `purchaseOrder`, `salesOrder`, `pricing`,
  `productCatalog`, `organization`. The backend must reject any other value.
- `rows` are the rows the frontend's parser produced. The backend does not receive the raw
  file and does not re-parse it.
- Row fields are present only when the export carried them. An absent value is `null` or
  omitted, never an empty string, and the backend must not treat an absent value as a value
  to write.
- `customFields` is a map keyed by the export's own field label. The labels are tenant
  defined, so the backend must not assume a fixed set.
- `rejected` carries the rows the frontend could not map. The backend stores them for display
  and does not attempt to import them.

### Limits

The frontend refuses to post a preview larger than 3.5 MB and tells the operator to split the
file. The backend should enforce its own limit and return `413` rather than accepting a body
it cannot process.

### Response

```jsonc
{
  "batch": {
    "id": "pe_01HQ…",
    "status": "preview",
    "exportKind": "processBatch",
    "kindLabel": "Process batch",
    "sourceFileName": "batch16.csv",
    "rowCount": 24,
    "acceptedCount": 24,
    "rejected": [],
    "createdAt": "2026-10-24T17:12:13.917Z",
    "result": null,
  },
}
```

`status` is `preview` until the batch is approved. `result` is `null` until then.

## 3. Reading a preview

```http
GET /v1/organizations/{organizationId}/partner-exports/{batchId}
```

Returns the same `batch` object. The backend must return `404` when the batch does not exist
or belongs to another organization.

## 4. Approval

```http
POST /v1/organizations/{organizationId}/partner-exports/{batchId}/approve
Content-Type: application/json

{}
```

The backend applies the stored rows to the tenant's data, then returns the batch with
`status` set to `approved` and `result` populated:

```jsonc
{
  "batch": {
    "id": "pe_01HQ…",
    "status": "approved",
    "exportKind": "processBatch",
    "kindLabel": "Process batch",
    "sourceFileName": "batch16.csv",
    "rowCount": 24,
    "acceptedCount": 24,
    "rejected": [],
    "createdAt": "2026-10-24T17:12:13.917Z",
    "result": { "importedCount": 24, "skippedCount": 0 },
  },
}
```

### Approval rules

- Approving a batch that was already approved must not apply the rows twice. The backend
  should make the operation idempotent, keyed on the batch ID.
- The backend must re-validate the rows at approval time rather than trusting the preview.
  A row that has become invalid since the preview was created is skipped and counted in
  `skippedCount`.
- Approval applies only the rows the preview accepted. Rows in `rejected` are never applied.

## 5. Storage model

The backend owns the data. The entity names below are the domain terms used across the
frontend, so the two repositories agree.

### 5.1 Preview batches

| Column             | Type      | Notes                                            |
| ------------------ | --------- | ------------------------------------------------ |
| `id`               | string    | primary key                                      |
| `organization_id`  | string    | tenant scope                                     |
| `export_kind`      | string    | one of the seven kinds                           |
| `source_file_name` | string    | the operator's file name                         |
| `status`           | string    | `preview` or `approved`                          |
| `row_count`        | integer   | rows received                                    |
| `accepted_count`   | integer   | rows held for import                             |
| `rejected`         | jsonb     | the row-level findings                           |
| `payload`          | jsonb     | the mapped rows, held until approval             |
| `result`           | jsonb     | `{ importedCount, skippedCount }` after approval |
| `created_at`       | timestamp |                                                  |
| `approved_at`      | timestamp | null until approved                              |

### 5.2 Imported records

The six kinds map onto the following records. Fields not present in the current frontend
model are marked, because they need new columns or child tables.

**Inventory and process batch rows** are the same record: a serialized unit.

| Field               | Source                        | Notes                                                             |
| ------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `source_unit_id`    | `unitId`                      | the partner's unit identifier; the natural key for repeat imports |
| `serial_number`     | `serialNumber`                | may be null                                                       |
| `sku_id`            | resolved                      | the catalog SKU this unit belongs to                              |
| `grade`             | `grade`                       |                                                                   |
| `damages`           | `damages`                     |                                                                   |
| `status`            | `status`                      | the source status value                                           |
| `inventory_state`   | derived                       | the Marketplace OS availability state                             |
| `location_id`       | resolved from `location`      | a location record, not free text                                  |
| `purchase_order_id` | resolved from `purchaseOrder` |                                                                   |
| `sales_order_id`    | resolved from `salesOrder`    |                                                                   |
| `sale_price`        | `salePrice`                   | numeric, null when absent                                         |
| `list_price`        | `listPrice`                   | numeric, null when absent — **new**                               |
| `hex_id`            | —                             | **new**, the partner's alternate unit identifier                  |
| `damage_initials`   | —                             | **new**, separate from `damages`                                  |
| `damage_title`      | —                             | **new**, separate from `damages`                                  |

**Unit custom field values** need a child table rather than columns, because the field
labels are tenant defined.

| Column              | Type   | Notes                                                      |
| ------------------- | ------ | ---------------------------------------------------------- |
| `inventory_unit_id` | string | the unit                                                   |
| `field_label`       | string | the export's own label, for example a battery-health label |
| `value`             | string | the value, or null when the field is not set               |

**Purchase order rows**

| Field                | Source                       | Notes                  |
| -------------------- | ---------------------------- | ---------------------- |
| `sequential_id`      | `sequentialId`               | the display number     |
| `date`               | `date`                       |                        |
| `channel`            | `channel`                    |                        |
| `organization_id`    | resolved from `organization` | the customer or vendor |
| `quantity`           | `quantity`                   |                        |
| `transaction_number` | `transactionNumber`          |                        |
| `status`             | `status`                     |                        |

**Sales order rows**

| Field             | Source                   | Notes   |
| ----------------- | ------------------------ | ------- |
| `sequential_id`   | `sequentialId`           |         |
| `date`            | `date`                   |         |
| `channel`         | `channel`                |         |
| `organization_id` | resolved from `customer` |         |
| `status`          | `status`                 |         |
| `quantity`        | `quantity`               |         |
| `amount`          | `amount`                 | numeric |

**Pricing rows** update the catalog SKU: `price`, `quantity`, and the product attributes
`manufacturer`, `model`, `variant`, `network`, `capacity`, `color`, `grade`, `conditions`.

**Product catalog rows** create or update catalog SKUs: `sku`, `title`, `grade`,
`conditions`.

**Organization rows** create or update customer records: `name`, `created_at`.

### 5.3 Locations

`location` in an export is a title, not an identifier. The backend needs a location record
with a `warehouse_id` so locations can be grouped, and a lookup that resolves a title to an
existing record within the tenant before creating one.

## 6. Import rules the backend must apply

1. **Upsert on the natural key, not a blind insert.** A repeated import of the same file
   must not duplicate units. The natural key for a unit is its `source_unit_id` within the
   tenant. For a catalog SKU it is the SKU value. For an organization it is the name within
   the tenant.
2. **Absent values do not overwrite.** A row that omits a field leaves the stored value
   alone. A row that carries a value updates it. This distinction matters because export
   column sets vary by screen.
3. **Resolve references.** `sku`, `location`, `purchaseOrder`, `salesOrder`, `organization`,
   and `customer` arrive as labels or display numbers. The backend resolves them to
   records, creating a record only when a natural key allows it, and otherwise records the
   reference as unresolved rather than dropping the row.
4. **Soft delete is not part of an export.** No export carries a deletion marker, so an
   import must never delete a record that the file does not mention.
5. **Tenant isolation.** Every read and write is scoped to one organization, and the
   backend verifies current membership on every call.
6. **Report what happened.** `importedCount` counts rows that changed a record,
   `skippedCount` counts rows that were accepted but changed nothing or could not be
   applied. A row that changed nothing is not a failure, but it is not an import either.

## 7. What the frontend does not do

- It never sends the raw file. Only the mapped rows travel to the backend.
- It never writes tenant data directly. The preview and approval cycle is the only path.
- It holds no provider credentials. There are none, because the customer exports the file
  themselves.

## 8. Not implemented in this change

The six screens in the partner application are not one to one with the six import kinds.
The following are out of scope for the import path and are noted so the backend does not
build for them prematurely:

- Reading data directly from the partner's API. The customer exports the file.
- Bulk-update jobs. The partner application runs status changes as jobs; an import creates
  a record of a change, it does not run one against the partner's account.
- Photo and document attachments.
- Audit history beyond the preview and approval trail.

## 9. Implementation checklist

- [ ] Add the three endpoints with organization membership checks
- [ ] Add the preview batch table with the columns in section 5.1
- [ ] Add or extend the records in section 5.2, including the new unit fields
- [ ] Add the unit custom field values child table
- [ ] Add a location record with a warehouse reference
- [ ] Implement upsert semantics per section 6, rule 1
- [ ] Implement the absent-value rule in section 6, rule 2
- [ ] Implement reference resolution per section 6, rule 3
- [ ] Make approval idempotent per section 4
- [ ] Return the response shapes in sections 2 and 4
