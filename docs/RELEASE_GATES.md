# Release gates

This branch is a development migration, not an approved production release.

Verified locally:
- Original workspace, forms, reports, printing and settings build with TypeScript/Vite.
- 16 tests cover the original accounting engine on SQLite, persistence via close/reopen, overpayment, idempotency, ownership, concurrent receipts, void restrictions, local authentication and permissions, quote conversion, stock averaging/rollback, and encrypted isolated restoration.

Android acceptance is a separate CI gate: actual SQLCipher, native connection reopen, original accounting operations, isolated restore, and Arabic PDF in airplane mode. Inspect the latest Actions result and native-qa-evidence, not only the APK upload step.

Before production approval:
- Install and exercise the normal debug APK on the owner's physical phone.
- Compare all original screens at phone dimensions and inspect the Arabic PDF.
- Verify biometric unlock, background lock, device restart, file sharing and import on a second device.
- Establish a stable signing key and increment version codes for production updates.
- Approve any Google Drive synchronization separately.
- Merge and production publication remain subject to owner approval.
