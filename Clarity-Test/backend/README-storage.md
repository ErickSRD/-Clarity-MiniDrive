# Storage strategy

Files are stored on local disk under a configurable `STORAGE_DIR` (default `backend/data/storage`).

Blobs are written with sanitized filenames and a unique prefix (timestamp + random) to avoid collisions. Metadata stored in SQLite references the blob relative path.

Example layout:

```
backend/data/
  minidrive.db
  storage/
    ab/
      ab1234... (blob file)
    cd/
      cd9876... (blob file)
```

Notes:
- Ensure the storage directory is writable by the app.
- Paths containing spaces are supported, but be careful with scripts that don't quote paths on Windows.
