# Database example data

This folder contains JSON files with example documents for each MongoDB collection. Use them for seeding, testing, or as a reference for the data shape.

| File | Collection | Description |
|------|------------|-------------|
| `expenses.json` | expenses | Expense records (item, cost, recurring flag) |
| `inventory.json` | inventory | Per-product size quantities (XXS–XXL, ?) |
| `orders.json` | orders | Orders with line items, tracking, status |
| `products.json` | products | Product catalog (name, image, sizes) |
| `users.json` | users | User accounts (email, hashed password, name) |

**Note:** Documents use MongoDB extended JSON (`$oid`, `$date`). The `products.json` image field is truncated; replace with a full base64 string if needed.
