---
name: GTFS protobuf field presence
description: Optional protobuf fields can look present through inherited defaults.
---

Use actual field presence, not a null check, before interpreting an optional GTFS-Realtime timestamp or stop sequence.

**Why:** The protobuf decoder supplies inherited zero values for absent optional fields. A null check treats an absent trip timestamp as Unix epoch (discarding valid fresh cancellations) and an absent stop sequence as sequence zero (preventing matching by stop ID).

**How to apply:** Distinguish a field explicitly transmitted with zero from an absent field using an own-property check. Regressions must exercise decoded protobuf bytes, including feeds without trip-level timestamps and feeds that identify stops only by stop ID.
