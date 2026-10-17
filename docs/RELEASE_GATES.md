# Android release gates

The existing APK is a UI preview, not a full accounting system.

Before release:
- Restore original Floot screens and business rules.
- Implement encrypted local persistence with Android Keystore.
- Add owner-only authentication and optional biometric unlock.
- Verify offline data entry, receipt numbering and invoice totals.
- Verify encrypted backup and restoration on another device.
- Verify migration never exposes Floot credentials.
- Test a signed Android build on a physical phone.
- Import customers, projects and logo manually after approval.

Never use test APK builds for real financial records.
