# Regression Report


---
## Benchmark Metadata
- **Timestamp**: 2026-06-27T21:42:29.688Z
- **Git Commit**: `eccbc05098f5b82fcf6d1af0065c7fbc1c46dcbc`
- **Environment**: evaluation
- **Engine Version**: v3
- **Dataset Version**: 1.0
---

## Execution Summary
- **Execution Duration**: 112ms
- **Dataset Size**: 12
- **Assertions Executed**: 12
- **Assertions Passed**: 0
- **Assertions Failed**: 12
- **Warnings**: 0


## Regression Details

| Profile | Drift % | Expected IDs | Retrieved IDs | Mismatched | Status |
|---|---|---|---|---|---|
| cafe-budget | 300.0% | 1 | 2 | 3 | ❌ FAIL |
| cafe-luxury | 200.0% | 2 | 2 | 4 | ❌ FAIL |
| gym-budget | 150.0% | 4 | 2 | 6 | ❌ FAIL |
| gym-luxury | 150.0% | 4 | 2 | 6 | ❌ FAIL |
| real-estate-commercial | 150.0% | 4 | 2 | 6 | ❌ FAIL |
| real-estate-residential | 150.0% | 4 | 2 | 6 | ❌ FAIL |
| restaurant-fastfood | 128.6% | 7 | 2 | 9 | ❌ FAIL |
| restaurant-finedining | 114.3% | 7 | 3 | 8 | ❌ FAIL |
| dental-clinic-cosmetic | 108.0% | 25 | 2 | 27 | ❌ FAIL |
| dental-clinic-family | 109.1% | 22 | 2 | 24 | ❌ FAIL |
| hair-salon-budget | 108.7% | 23 | 2 | 25 | ❌ FAIL |
| hair-salon-luxury | 107.7% | 26 | 2 | 28 | ❌ FAIL |
