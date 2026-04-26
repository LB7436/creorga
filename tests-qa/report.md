# QA Audit Report

**2026-04-23T17:00:02.057Z**

**Score : 41/41** (0 échecs)

| Module | Test | Résultat | Notes |
|---|---|---|---|
| Infra | backend :3002 | ✅ |  |
| Infra | web :5174 | ✅ |  |
| Infra | pos :5175 | ✅ |  |
| Infra | marketing :5176 | ✅ |  |
| Infra | superadmin :5177 | ✅ |  |
| Infra | guest :5178 | ✅ |  |
| Infra | ollama :11434 | ✅ |  |
| Auth | login admin | ✅ | token acquis |
| Auth | fallback mode | ✅ | DB indisponible → fallback |
| Payments | 6 gateways listés | ✅ | 6 providers |
| FloorState | GET state | ✅ | 12 tables |
| FloorState | addChair | ✅ | id=yf3g3l2o |
| FloorState | addItemToChair | ✅ | 1 items |
| FloorState | transfer chair t2→t5 | ✅ | tableId=t5 |
| FloorState | transfer item ch→ch | ✅ |  |
| Portal | PATCH admin→backend | ✅ |  |
| Portal | GET guest side | ✅ | sync confirmé |
| AI | ollama running | ✅ |  |
| AI | gemma2:2b installed | ✅ |  |
| AI | inference responds | ✅ | okay |
| FrontEnd | / | ✅ | status 200 |
| FrontEnd | /login | ✅ | status 200 |
| FrontEnd | /modules | ✅ | status 200 |
| FrontEnd | /setup | ✅ | status 200 |
| FrontEnd | /pos/floor | ✅ | status 200 |
| FrontEnd | /pos/design | ✅ | status 200 |
| FrontEnd | /pos/dashboard | ✅ | status 200 |
| FrontEnd | /clients | ✅ | status 200 |
| FrontEnd | /crm/clients | ✅ | status 200 |
| FrontEnd | /invoices/devis | ✅ | status 200 |
| FrontEnd | /hr/planning | ✅ | status 200 |
| FrontEnd | /haccp/journee | ✅ | status 200 |
| FrontEnd | /accounting/caisse | ✅ | status 200 |
| FrontEnd | /ai | ✅ | status 200 |
| FrontEnd | /ai/local | ✅ | status 200 |
| FrontEnd | /settings/modules | ✅ | status 200 |
| FrontEnd | /settings/env-mode | ✅ | status 200 |
| FrontEnd | /settings/theme | ✅ | status 200 |
| CORS | origin http://localhost:5174 | ✅ | allow=http://localhost:5174 |
| CORS | origin http://localhost:5175 | ✅ | allow=http://localhost:5175 |
| CORS | origin http://localhost:5178 | ✅ | allow=http://localhost:5178 |