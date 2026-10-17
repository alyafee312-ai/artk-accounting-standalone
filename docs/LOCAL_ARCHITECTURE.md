# Local Android architecture

The standalone entry now mounts the original `AccountingWorkspace`, dashboard, entry forms, reports, tables, print dialog and settings. The original CSS and locally bundled Cairo fonts are used. Backup, login and local user administration are adapted for a device rather than Floot OAuth.

`src/local/accountingWrite.ts` is ported from the inspected Floot writer. The PostgreSQL advisory lock is replaced by a serialized local service and a SQLite transaction. PostgreSQL `FOR UPDATE` is removed because writes hold the SQLite transaction lock. SHA-256 uses Web Crypto rather than Node. Original validation, decimal arithmetic, request-key checks, void restrictions, stock averaging and quote approval/conversion remain.

The Kysely SQLite compiler drives a Capacitor SQLite backend on Android. The production UI never opens IndexedDB or SQL.js. SQL.js is used only by isolated host tests. The Android database is SQLCipher encrypted with a random 256-bit passphrase stored through the plugin's protected Android preferences. Encryption is explicitly enabled in Capacitor configuration. Database schema version 2 has an explicit migration from version 1.

Device unlock uses a 6–12 digit PIN, PBKDF2-HMAC-SHA256 (310,000 iterations), random salt, and persisted throttling. System biometric verification is optional. After device unlock, a local account password is required. Local account passwords are salted PBKDF2 hashes within the encrypted database. The first account uses login `admin` with a password chosen at first launch; no default password is embedded.

Financial writes, idempotency results and audit records commit together. The read service removes employee costs, stock, suppliers, audit data. Admin-only user operations forbid self-demotion/disablement and removal of the last active administrator.

Backups use password-derived AES-256-GCM, PBKDF2-HMAC-SHA256 at 310,000 iterations, a random salt and nonce, and authenticated format identification. Restore first writes only to a freshly migrated empty database and checks foreign keys and integrity. The app can verify this in a disposable database. When explicitly requested in the app, a verified restore is placed in another encrypted database and activated only after successful checks; the previous database is retained.

No Floot API requests are used for daily accounting. Google Drive integration is intentionally deferred. A standalone Android package ID is retained (`com.artk.accounting.standalone`) so this test app can coexist with the original `com.artk.accounting`.

The downloadable APK is built without `VITE_NATIVE_QA`. CI builds a second, isolated QA variant exposing a test hook only for the emulator. That variant creates synthetic data in disposable encrypted databases, tests reopen/restore, and renders an Arabic PDF. It is not the downloadable APK artifact.

Source comparison: all 14 files comprising AccountingWorkspace, AccountingDashboard, AccountingEntry, AccountingTable, AccountingReportsView, AccountingPrint and AccountingStats plus their CSS were compared directly with the live Floot source and matched exactly. Other components were adapted for local authentication, storage and backups.
