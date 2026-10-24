# Inventory Batch Contract — Static Analysis Findings

Source: static analysis of a third-party serialized-inventory web application's public JavaScript
bundles. No account access, no session capture, no data extraction were involved.

- Tool: REA 6.7.0 (`analyze-javascript-application`, `analyze_web_bundle` via CDP)
- Artifacts analyzed: 4 publicly served bundles (1.4 MB, 377,739 AST nodes, 0 parse failures)
- Evidence: `ev_648cc789e3a76e21f68918187a119c6032b15fac07324dc863aca07e469bac94`

The provider is not named here, and the endpoint paths below are expressed relative to the
origin. The field and payload shapes are what Marketplace OS needs; the specific host and
vendor name are not part of the contract.

## 1. Process Batches are bulk-update jobs

The "Process Batches" screen is **not** a separate CRUD resource. It is a view over
**bulk-update jobs** against the `inventory_batch` model.

The client bundle carries this mapping:

```js
const jp = {
  "Sales Orders": "/orders/bulk_updates.json",
  "Purchase Orders": "/inventory_batches/bulk_updates.json",
  Organizations: "/organizations/bulk_updates.json",
};
const Fp = {
  "Sales Orders": "order",
  "Purchase Orders": "inventory_batch",
};
```

So the Process Batches list is `inventory_batch` records, and each one was created by a
bulk-update job.

## 2. Bulk update request/response contract

From the `BulkEditModal` component:

```js
save() {
  if (confirm("Are you sure?")) {
    let e = jp[this.index_type];      // e.g. "/inventory_batches/bulk_updates.json"
    let n = { ids: this.selected };   // array of selected record ids
    n = Object.assign(n, { payload: this.payload });
    axios.post(e, n).then(r => { this.$set(this, "job_status", r.data) });
  }
}
```

Request body:

```jsonc
{
  "ids": [/* selected inventory_batch ids */],
  "payload": {/* action-specific changes, built by the action's component */},
}
```

Response: a `job_status` object, consumed as `r.data` with `r.data.id` passed to the
status component.

## 3. Job status polling

From the `BulkEditJobStatus` component:

```js
mounted() {
  let e = new Ap(`/job_statuses/${this.job_status_id}.json`,
                t => t.finished_at || t.failed_at);
  e.monitor();
  e.on("tick", this.tick);
  e.on("done", this.done);
}
```

- Poll endpoint: `GET /job_statuses/{id}.json`
- Terminal condition: `finished_at` **or** `failed_at` is set
- `job_status.description` is the human-readable progress text
- On `finished`, the app resets, hides the modal, and reloads the page

The monitor helper polls with an interval and exposes `start` / `pause` / `resume` / `stop`,
so it is a long-poll style monitor that can be paused and resumed.

## 4. Batch list row fields

The inventory table row renderer references these cell keys:

| Cell key             | Notes                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inventory_batch_id` | renders a `PO #` link from `row.purchase_order.url`, `row.purchase_order.vendor`, `row.purchase_order.created_at`, `row.purchase_order.sequential_id` |
| `device_title_1`     | rendered by the `device-cell` component with `row.device` and `row.sku`                                                                               |

The PO popover shows `Vendor` and `Created` dates, and the label is `PO #{sequential_id}`.

## 5. Other discovered endpoints

| Endpoint                               | Method       | Payload / purpose                                            |
| -------------------------------------- | ------------ | ------------------------------------------------------------ |
| `/inventory_batches/bulk_updates.json` | POST         | `{ ids, payload }` — Process Batches                         |
| `/orders/bulk_updates.json`            | POST         | `{ ids, payload }` — Sales Orders bulk edit                  |
| `/organizations/bulk_updates.json`     | POST         | `{ ids, payload }` — Organizations bulk edit                 |
| `/job_statuses/{id}.json`              | GET (polled) | job progress; terminal on `finished_at` / `failed_at`        |
| `/notes.json`                          | POST         | `{ note: { text, noteable_id, noteable_type } }`             |
| `/notes/{id}`                          | GET          | note record (audit timeline link)                            |
| `/photos.json`                         | PUT          | `{ photos: [{ id, sort_index }] }` — reorder photos          |
| `/settings/tables.json`                | POST         | `{ table_setting: { title, columns } }` — saved table layout |
| `/users.json?all=true&active=true`     | GET          | user list                                                    |
| `/audit_steps/{id}`                    | GET          | audit step detail (from the activity timeline)               |

Referenced record paths (lazy-loaded rows, not call sites in the analyzed bundles):
`/inventories/{id}`, `/orders/{id}`, `/orders/{id}/inventories`, `/organizations/{id}`,
`/rmas/{id}`, `/photos/{id}`, `/notes/{id}`, `/audit_steps/{id}`.

## 6. Audit trail

The activity timeline renders `audit_steps` with fields:

- `id`, `text`, `date`
- `visible` — when true the step links to `/audit_steps/{id}`
- `creator_name`
- `api_creator_name` — when present, renders `via {api_creator_name}` instead of `creator_name`

This means the provider already attributes batch activity to an **API app** when the change
came through its public API. Worth noting for the backend design: the API path is a
first-class, audited citizen in this model.

## 7. Notes and photos

- Notes: `POST /notes.json` with `{ note: { text, noteable_id, noteable_type } }`.
  `noteable_type` is the polymorphic owner (for example `inventory_batch`), `noteable_id` its
  id.
- Photos: `PUT /photos.json` with `{ photos: [{ id, sort_index }] }`. Photo records expose
  `external_url` / `image_url` and a `sort_index`.

## 8. Column configuration is server-side

`POST /settings/tables.json` with `{ table_setting: { title, columns } }` persists the visible
column set per table. The inventory table's column keys are referenced throughout the row
renderer (for example `inventory_batch_id`, `device_title_1`).

**Implication for Marketplace OS:** column layout is a per-user server-side setting, not a
client preference. Any UI that replicates the "Columns" dropdown needs a persisted
table-setting concept.

## 9. What this changes about the plan

1. Process Batches are **jobs over `inventory_batch` records**, not a standalone resource.
   A `process_batches` table should carry: `id`, `description`, `status`
   (`new` / `processing` / `complete`), `item_count`, `created_by`, `created_at`,
   `finished_at`, `failed_at`, `error`.
2. The status lifecycle maps directly to `job_status`: `created_at` to `finished_at` /
   `failed_at`, plus a `description` progress string.
3. A batch's items are **inventory units** (device rows), each with PO, device title, SKU,
   ESN, grade, damages, status, location, sold price, order, battery health, marketplace
   status — matching the `device-cell` and column keys above.
4. Notes are polymorphic and attach to any record, so notes need `noteable_type` +
   `noteable_id` rather than a single `batch_id` column.
5. The `api_creator_name` field confirms the public API is the intended integration path for
   exactly this workflow.
