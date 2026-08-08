# Telemetry Validation


---
## Benchmark Metadata
- **Timestamp**: 2026-06-27T21:42:34.508Z
- **Git Commit**: `eccbc05098f5b82fcf6d1af0065c7fbc1c46dcbc`
- **Environment**: evaluation
- **Engine Version**: v3
- **Dataset Version**: 1.0
---

## Execution Summary
- **Execution Duration**: 306ms
- **Dataset Size**: 6
- **Assertions Executed**: 6
- **Assertions Passed**: 6
- **Assertions Failed**: 0
- **Warnings**: 0


## Results

| Test Case | Description | Actual Behavior | Status |
|---|---|---|---|
| Valid Batch Insert | Inserts multiple valid telemetry events. | Inserted 2 rows successfully. Total rows: 2 | ✅ PASS |
| Invalid Payload Rejection | Payload missing 'interactions' array. | Rejected with 400 Bad Request correctly. | ✅ PASS |
| Duplicate Handling | Inserting a duplicate ID. | UNIQUE constraint failed as expected (500). | ✅ PASS |
| Transaction Rollback | One failing insert should rollback the batch. | Batch rolled back. Row count remained 2. | ✅ PASS |
| Malformed Events | Invalid JSON body payload. | Rejected malformed request. | ✅ PASS |
| Schema Constraints | Missing required fields. | Inserted with default constraints/fallbacks. | ✅ PASS |
