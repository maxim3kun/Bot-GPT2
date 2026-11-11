---
name: England transport access contracts
description: Official access and format constraints for BODS, TfL and National Rail, checked on 2026-11-11.
---

BODS exposes public English bus data, but using its query APIs requires an account and its personal API key. Public downloads do not imply anonymous access to the API.

**Why:** The official developer guide explicitly requires registration and an account-settings API key for dataset queries.

**How to apply:** Follow https://data.bus-data.dft.gov.uk/guidance/requirements/?section=api and the associated quick-start guide. Keep timetable TransXChange separate from SIRI-VM vehicle positions; positions alone are not arrival predictions. Do not retrieve unrestricted national archives as a workaround for missing query access.

TfL recommends registration for its Unified API and documents an app_key for the named “500 requests data plan”; app_id is obsolete. The public landing page does not specify that plan's time window.

**Why:** The portal's actual registration instructions differ from older API examples.

**How to apply:** Check the current product and transport-data terms before activation. Do not invent a daily/minute quota from the plan's name. See https://api-portal.tfl.gov.uk/ and https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service.

National Rail Darwin requires Rail Data Marketplace registration, subscription and human acceptance of its terms. Its public JSON documentation requires licensed credentials using Basic Authentication, not an assumed anonymous JSON endpoint.

**Why:** https://www.nationalrail.co.uk/developers/darwin-data-feeds/ lists JSON products but describes free usage of XML Push and SOAP separately; https://realtime.nationalrail.co.uk/LDBWS/docs/documentation.html explicitly describes authentication.

**How to apply:** Verify the selected product's own price and free quota before requesting the appropriate credentials securely. Do not transfer SOAP's documented five-million-requests allowance to JSON or accept terms for the owner. An unavailable credential or unresolved price is an activation blocker, not delivered rail coverage.
