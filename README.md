# @famgia/omnify-gui

Visual schema editor for Omnify with version history tracking.

## Features

- Visual schema editor with drag-and-drop
- Real-time code preview (Laravel, TypeScript, SQL)
- Relationship diagram visualization
- **Version History** - Track schema changes over time
- **Pending Changes Preview** - See what changed before generating

## Usage

```bash
# From your project directory
omnify gui
```

This opens the GUI at `http://localhost:3456/`

## Development

### Architecture

In development mode, the GUI runs as two separate processes:

| Process | Port | Purpose |
|---------|------|---------|
| Vite Dev Server | 5173 | Frontend with Hot Module Replacement (HMR) |
| Express API | 3456 | Backend API server |

**You only need to access `http://localhost:5173/`** - API calls are automatically proxied to port 3456.

### Running Development Server

```bash
cd packages/gui
pnpm dev
```

Then open: `http://localhost:5173/`

### Production Mode

In production, Express serves both frontend and API on a single port:

```bash
pnpm build
node dist/server/index.js
# → http://localhost:3456/
```

## Version History

The GUI tracks schema changes in `.omnify/versions/` directory:

```
.omnify/
  versions/
    0001_initial.lock
    0002_add_users.lock
    0003_add_posts.lock
  current.lock
```

### Version File Format

Each version file (YAML) contains:

```yaml
version: 1
timestamp: "2025-12-28T10:00:00.000Z"
driver: mysql
migration: "create_users_table"
description: "Initial schema setup"
changes:
  - action: schema_added
    schema: User
  - action: property_added
    schema: User
    property: email
snapshot:
  User:
    name: User
    kind: object
    properties:
      email:
        type: Email
        unique: true
    options:
      id: true
      timestamps: true
```

### Change Actions

| Action | Description |
|--------|-------------|
| `schema_added` | New schema created |
| `schema_removed` | Schema deleted |
| `schema_modified` | Schema options changed |
| `property_added` | New property added |
| `property_removed` | Property deleted |
| `property_modified` | Property definition changed |
| `property_renamed` | Property renamed |
| `index_added` | New index added |
| `index_removed` | Index deleted |
| `option_changed` | Schema option changed |

### Viewing History

1. Click **"History"** in the sidebar
2. View all versions with timestamps and change counts
3. Click the **eye icon** to view version details
4. Click the **diff icon** to compare with previous version

### Pending Changes

The home page shows a badge with pending changes count:

- **"No Changes"** - Current schemas match latest version
- **"X Changes"** - X changes detected, click to preview

Click the button to see detailed diff before generating migrations.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/versions` | List all versions |
| `GET /api/versions/pending` | Get pending changes |
| `GET /api/versions/latest` | Get latest version |
| `GET /api/versions/:version` | Get specific version |
| `GET /api/versions/diff/:from/:to` | Compare two versions |

## CLI Integration

When running `omnify generate`, a new version is automatically created:

```bash
omnify generate
# → Generates migrations
# → Creates new version in .omnify/versions/
# → Updates current.lock
```
