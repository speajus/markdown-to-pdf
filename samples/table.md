# Table Styling

## Inline Formatting

| Feature | Syntax | Example |
|---------|--------|---------|
| **Bold** | `**text**` | This cell is **bold** |
| *Italic* | `*text*` | This cell is *italic* |
| ***Bold Italic*** | `***text***` | This is ***bold and italic*** |
| ~~Strikethrough~~ | `~~text~~` | This is ~~removed~~ |
| `Inline Code` | `` `code` `` | Use `console.log()` here |
| [Links](https://example.com) | `[text](url)` | Visit [Example](https://example.com) |

## Mixed Formatting in Cells

| Component | Status | Notes |
|-----------|--------|-------|
| **Auth Service** | `running` | Migrated to [OAuth 2.0](https://oauth.net/2/) |
| *Cache Layer* | ~~disabled~~ `enabled` | Now uses **Redis** with *TTL* of `300s` |
| ***API Gateway*** | `v2.1.0` | See [changelog](https://example.com/changelog) for **breaking changes** |
| Database | **primary**: `healthy` | Failover to *secondary* is ~~manual~~ **automatic** |

## Alignment

| Left | Center | Right |
|:-----|:------:|------:|
| **Bold left** | *Centered italic* | `right code` |
| [Link](https://example.com) | ~~struck~~ | **123.45** |
| Normal text | `code` and **bold** | *italic right* |

## Multiline Cells

| Feature | Details | Status |
|---------|---------|--------|
| Line breaks | First line<br>Second line<br/>Third line | Supported |
| Long wrapping text | This cell contains a much longer paragraph of text that should automatically wrap within the cell boundaries and cause the row height to increase dynamically | Auto-wrapped |
| Combined | Short intro<br>Then a longer explanation that wraps within the cell to test both line breaks and natural wrapping together | **Working** |

## Technical Reference

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getData()` | `Promise<T>` | Fetches data from the **primary** endpoint |
| `setConfig()` | `void` | Updates the *runtime* configuration |
| `validate()` | `boolean` | Returns ~~true~~ `Result<T>` after [RFC-42](https://example.com/rfc42) |
| `connect()` | `Connection` | Establishes a **secure** connection via *TLS 1.3* |

