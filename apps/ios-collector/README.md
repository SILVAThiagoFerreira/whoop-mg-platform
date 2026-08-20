# iPhone collector bridge

The web dashboard cannot access Bluetooth or HealthKit from Safari. The native
iPhone collector therefore remains the only component allowed to read the
bracelet and Apple Health. This folder contains the upload boundary used by a
native iOS target: `WhoopCloudSync.swift` sends timestamped, provenance-labeled
observations to the authenticated Apps Script adapter.

The existing iOS reference client in `NoopApp-noop-7898090` already contains the
CoreBluetooth WHOOP collector and the HealthKit bridge. The host app should:

1. obtain a short-lived Google access token in memory using its native OAuth
   flow;
2. map validated `WhoopStore`/HealthKit rows to `WhoopCloudObservation` values;
3. construct `WhoopCloudSync` with the deployed Apps Script Web App HTTPS URL;
4. call `upload` after a successful Bluetooth/HealthKit sync and retry the same
   event IDs when the device comes back online.

The server deduplicates by `eventId` and keeps the Drive spreadsheet append-only.
The access token is never written to disk, sent to GitHub Pages, or included in
the service worker cache. The dashboard polls the resulting private workspace
every 15 seconds.

## Required native capabilities

- CoreBluetooth for the bracelet connection;
- HealthKit only when the app is signed with the HealthKit entitlement and the
  user grants access;
- Background fetch/BLE restoration according to Apple's current signing and
  background-execution rules;
- a Google OAuth client configured for the iOS bundle identifier.

An AltStore/free-Apple-ID build may not carry HealthKit. In that case the
collector must report `UNKNOWN`/unavailable rather than claiming HealthKit data.
