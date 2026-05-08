# Adapt GTM Agent System — Full Replication Guide

> **Purpose:** This document enables a Claude instance (or any developer) to rebuild this application from scratch with zero hard-coded data. Every piece of logic, data flow, API contract, and UI structure is documented here.

---

## Table of Contents
1. [Tech Stack & Platform](#1-tech-stack--platform)
2. [Environment Secrets Required](#2-environment-secrets-required)
3. [External Integrations](#3-external-integrations)
4. [Application Architecture](#4-application-architecture)
5. [Backend Functions (Deno Edge)](#5-backend-functions-deno-edge)
6. [Frontend Pages](#6-frontend-pages)
7. [Frontend Components](#7-frontend-components)
8. [Design System & Tokens](#8-design-system--tokens)
9. [Data Schemas / Shapes](#9-data-schemas--shapes)
10. [Automations](#10-automations)
11. [End-to-End Data Flows](#11-end-to-end-data-flows)

---

## 1. Tech Stack & Platform

| Layer | Technology |
|---|---|
| Platform | Base44 (base44.com) — provides auth, DB, hosting, secrets, SDK |
| Frontend | React 18, Vite, Tailwind CSS |
| Backend functions | Deno Deploy (edge functions, accessed via Base44 SDK) |
| CRM | HubSpot (via Private App Token — REST API v3) |
| Messaging | Slack (via Base44 OAuth connector — shared account) |
| AI / LLM | Base44 Core integration → `InvokeLLM` (uses `gemini_3_1_pro` model for web-search-enriched briefs) |
| Fonts | Syne (headings), IBM Plex Mono (labels/mono), DM Sans (body) via Google Fonts |

---

## 2. Environment Secrets Required

Set these in the Base44 dashboard under **Settings → Environment Variables**:

| Secret Name | Description |
|---|---|
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot Private App token with scopes: `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.meetings.read`, `crm.objects.notes.read`, `crm.objects.tasks.read`, `crm.objects.owners.read` |

**Slack** is connected via Base44's built-in OAuth connector (not a secret). Required scopes:
- `chat:write`, `im:write`, `users:read`, `users:read.email`

---

## 3. External Integrations

### HubSpot REST API v3
Base URL: `https://api.hubapi.com`

Auth header on every request:
```
Authorization: Bearer ${HUBSPOT_PRIVATE_APP_TOKEN}
Content-Type: application/json
```

Key endpoints used:
| Endpoint | Method | Purpose |
|---|---|---|
| `/crm/v3/objects/contacts/search` | POST | Search/list contacts |
| `/crm/v3/objects/contacts/{id}` | GET | Get single contact |
| `/crm/v3/objects/deals/search` | POST | List open deals |
| `/crm/v3/objects/deals/{id}` | GET | Get single deal |
| `/crm/v3/objects/meetings/search` | POST | List / search meetings |
| `/crm/v3/objects/meetings/{id}` | GET | Get single meeting |
| `/crm/v3/objects/meetings/{id}/associations/contacts` | GET | Get contacts linked to a meeting |
| `/crm/v3/objects/contacts/{id}/associations/deals` | GET | Get deals linked to a contact |
| `/crm/v3/objects/contacts/{id}/associations/meetings` | GET | Get meetings linked to a contact |
| `/crm/v3/objects/contacts/{id}/associations/notes` | GET | Get notes linked to a contact |
| `/crm/v3/objects/contacts/{id}/associations/tasks` | GET | Get tasks linked to a contact |
| `/crm/v3/objects/notes/{id}` | GET | Get single note |
| `/crm/v3/objects/tasks/{id}` | GET | Get single task |
| `/crm/v3/owners/{ownerId}` | GET | Get owner email from HubSpot owner ID |

### Slack API
Base URL: `https://slack.com/api`

Access token retrieved in backend functions via:
```js
const { accessToken: slackToken } = await base44.asServiceRole.connectors.getConnection('slack');
```

Key endpoints used:
| Endpoint | Purpose |
|---|---|
| `users.lookupByEmail` | Resolve HubSpot owner email → Slack user ID |
| `auth.test` | Get the authorized Slack user ID (fallback) |
| `conversations.open` | Open a DM channel with a user |
| `chat.postMessage` | Send a Slack message with Block Kit blocks |

### Base44 InvokeLLM
Used inside backend functions via:
```js
const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
  prompt: "...",
  add_context_from_internet: true,  // enables web search
  response_json_schema: { type: 'object', properties: { ... } },
  model: 'gemini_3_1_pro',  // required for add_context_from_internet
});
```

---

## 4. Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│  pages/Home.jsx  (root shell)                          │
│  ┌──────────────┐  ┌───────────────────────────────┐   │
│  │ NavBar       │  │ TabBar                        │   │
│  └──────────────┘  └───────────────────────────────┘   │
│  ┌──────────┐  ┌──────────────────┐  ┌────────────┐    │
│  │ Sidebar  │  │ Main Panel       │  │ Meeting    │    │
│  │(contacts)│  │ Agent01 | 02 |03 │  │ Panel      │    │
│  └──────────┘  └──────────────────┘  └────────────┘    │
└─────────────────────────────────────────────────────────┘

Backend Functions:
  agentHealth      → HubSpot connectivity check
  agentContacts    → Fetch 50 latest contacts from HubSpot
  agentMeetings    → Fetch upcoming + past meetings from HubSpot
  agentBrief       → Generate pre-meeting AI intelligence brief
  agentFollowup    → Analyse call transcript → email + CRM updates
  agentPipeline    → Pipeline health scan + risk flags
  slackMeetingReminder → Send AI-enriched Slack DM 30min before meetings
```

---

## 5. Backend Functions (Deno Edge)

All functions follow this pattern:
```js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async (req) => { ... });
```

---

### 5.1 `agentHealth`
**Purpose:** Check HubSpot connectivity  
**Auth required:** None  
**Logic:** Check if `HUBSPOT_PRIVATE_APP_TOKEN` env var is set  
**Response:**
```json
{ "status": "ok|error", "hasHubspot": true, "connected": true, "timestamp": "ISO string" }
```

---

### 5.2 `agentContacts`
**Purpose:** Fetch latest 50 HubSpot contacts  
**Auth required:** None (reads env var directly)  
**HubSpot call:** `POST /crm/v3/objects/contacts/search`  
**Properties fetched:** `firstname`, `lastname`, `email`, `company`, `jobtitle`, `lifecyclestage`, `hs_object_source`, `hs_object_source_label`, `hs_object_source_id`, `createdate`, `linkedin_url`, `linkedinbio`  
**Sort:** `createdate DESCENDING`  
**Limit:** 50  
**Filtering:** Drops contacts with no name  
**Apollo detection:** If `hs_object_source_label` or `hs_object_source_id` contains "apollo" → `fromApollo: true`  
**Response:**
```json
{
  "contacts": [
    {
      "id": "string",
      "name": "string",
      "email": "string|null",
      "company": "string|null",
      "title": "string|null",
      "lifecycle": "string|null",
      "fromApollo": false,
      "linkedinUrl": "string|null",
      "createdDate": "ISO string|null"
    }
  ]
}
```

---

### 5.3 `agentMeetings`
**Purpose:** Fetch upcoming + past meetings with associated contacts  
**HubSpot call:** `POST /crm/v3/objects/meetings/search`  
**Properties fetched:** `hs_meeting_title`, `hs_meeting_start_time`, `hs_meeting_end_time`, `hs_meeting_body`, `hs_internal_meeting_notes`, `hs_meeting_source`, `hs_meeting_outcome`  
**Sort:** `hs_meeting_start_time DESCENDING`  
**Limit:** 50  
**For each meeting:** Fetch associated contact via `/crm/v3/objects/meetings/{id}/associations/contacts` then `/crm/v3/objects/contacts/{contactId}?properties=firstname,lastname,email,company`  
**Status logic:** `startTime < now` → `"Completed"`, else `"Upcoming"`  
**Response:**
```json
{
  "meetings": [
    {
      "id": "string",
      "title": "string",
      "startTime": "ISO string",
      "endTime": "ISO string",
      "status": "Upcoming|Completed",
      "nooksNote": "string|null",
      "contact": { "name": "string", "email": "string", "company": "string" },
      "deal": null,
      "source": "string"
    }
  ]
}
```
Meetings returned sorted: upcoming first (ascending), then past (descending).

---

### 5.4 `agentBrief`
**Purpose:** Generate a rich AI pre-meeting intelligence brief for a contact  
**Input:** `{ query: string, email: string|null, hubspotId: string|null }`  
**Contact lookup priority:** 
1. Direct fetch by `hubspotId` if provided
2. Email search via `POST /crm/v3/objects/contacts/search` with `email EQ` filter
3. Name search with `firstname EQ` + `lastname EQ` filter groups, or `email CONTAINS_TOKEN query`

**If no HubSpot record found:** Runs AI web search-only brief with `add_context_from_internet: true` using `gemini_3_1_pro`, returns contact with `hubspotFound: false`

**If HubSpot record found, fetches:**
- Deals (up to 5): properties `dealname`, `dealstage`, `amount`, `closedate`, `hs_next_step`, `pipeline`, `deal_currency_code`, `hs_deal_stage_probability`, `hs_lastmodifieddate`
- Meetings (up to 5): `hs_meeting_title`, `hs_meeting_start_time`, `hs_meeting_end_time`, `hs_meeting_outcome`, `hs_meeting_body`, `hs_internal_meeting_notes`
- Notes (up to 5): `hs_note_body`, `hs_timestamp`
- Tasks (up to 5): `hs_task_subject`, `hs_task_body`, `hs_task_status`, `hs_task_type`, `hs_timestamp`, `hs_task_completion_date`

**AI call:** `InvokeLLM` with `add_context_from_internet: true`, `model: 'gemini_3_1_pro'`  
**AI prompt asks for:** `linkedinProfile`, `companyIntel`, `companyNews`, `talkingPoints` (4), `riskFlags` (up to 4), `suggestedOpener`

**Fallback logic (if AI fields missing):**
- `talkingPoints`: Generated from CRM data (deal name, last activity, meeting history)
- `riskFlags`: Derived from no activity, no deal, lifecycle stage
- `suggestedOpener`: Generic personalized string using contact's first name

**Response:**
```json
{
  "contact": {
    "hubspotId": "string",
    "name": "string",
    "title": "string|null",
    "company": "string|null",
    "email": "string|null",
    "phone": "string|null",
    "lifecycle": "string|null",
    "hubspotFound": true,
    "linkedinUrl": "string|null",
    "fromApollo": false,
    "location": "string|null"
  },
  "deal": { "found": true, "name": "...", "stage": "...", "amount": "...", "closeDate": "...", "nextStep": "...", "probability": "...", "lastModified": "..." },
  "deals": [ ... ],
  "meetings": [ { "id": "...", "title": "...", "startTime": "...", "outcome": "...", "notes": "..." } ],
  "notes": [ { "type": "note", "body": "...", "date": "...", "rawDate": "..." } ],
  "tasks": [ { "type": "task", "subject": "...", "body": "...", "status": "...", "taskType": "...", "date": "...", "rawDate": "...", "completedDate": "..." } ],
  "companyNews": [ { "headline": "...", "summary": "...", "age": "...", "hot": false, "relevance": "..." } ],
  "linkedinProfile": { "synopsis": "...", "currentRole": "...", "previousCompanies": [...], "recentActivity": "...", "totalExperience": "..." },
  "companyIntel": { "founded": "...", "size": "...", "revenue": "...", "industry": "...", "description": "...", "socialChannels": [...], "latestNews": [...] },
  "talkingPoints": ["...", "...", "...", "..."],
  "riskFlags": ["...", "..."],
  "suggestedOpener": "..."
}
```

---

### 5.5 `agentFollowup`
**Purpose:** Analyse a call transcript to extract insights and draft follow-up  
**Input:** `{ transcript: string, contact: string }`  
**Logic:** Pure text parsing — NO AI call. Uses:
- `painKeywords` array to extract pain point lines
- `commitKeywords` array to extract commitment lines
- `datePattern` regex to extract next-step dates
- Generates email draft and HubSpot update checklist from extracted data

**Pain keywords:** `problem`, `challenge`, `struggle`, `issue`, `pain`, `difficult`, `hard`, `frustrat`, `slow`, `manual`, `broken`, `can't`, `cannot`, `don't have`, `missing`, `lack`  
**Commit keywords:** `will`, `going to`, `send`, `share`, `follow up`, `schedule`, `book`, `demo`, `trial`, `connect`, `introduce`, `next step`, `by`  
**Date pattern:** `monday|tuesday|wednesday|thursday|friday|tomorrow|next week|end of week|eow|eod|\d{1,2}\/\d{1,2}|\d{1,2} (jan|feb|...|dec)`

**Response:**
```json
{
  "contact": "string",
  "painPoints": ["..."],
  "commitments": ["..."],
  "nextStep": "string",
  "nextStepDate": "string|null",
  "emailDraft": "string (full email text)",
  "hubspotUpdates": ["..."]
}
```

---

### 5.6 `agentPipeline`
**Purpose:** Pipeline health scan — identify stale/at-risk deals  
**HubSpot call:** `POST /crm/v3/objects/deals/search`  
**Filter:** Excludes `closedlost` and `closedwon` stages  
**Properties:** `dealname`, `dealstage`, `amount`, `closedate`, `hs_last_sales_activity_date`, `hubspot_owner_id`  
**Limit:** 100  
**For each deal:** Fetch associated contact name and company

**Flag logic:**
- `daysSinceActivity > 14` → `"Stale — Xd no activity"` (red)
- `0 ≤ daysToClose < 14` → `"Closing soon — Xd"` (amber)
- `daysToClose < 0` → `"Overdue by Xd"` (red)
- Otherwise → `"On track"` (green)

**Risk notes:** Appended when: no activity >14d, close date passed, no amount set

**Response:**
```json
{
  "summary": { "totalDeals": 0, "totalValue": "$X", "atRisk": 0, "nextCloseDate": "..." },
  "deals": [
    {
      "name": "string",
      "amount": "string",
      "stage": "string",
      "closeDate": "string|null",
      "contact": "string|null",
      "company": "string|null",
      "flag": "string",
      "flagColor": "green|amber|red",
      "riskNote": "string"
    }
  ],
  "patterns": ["string"],
  "actions": ["string"],
  "forecast": "string"
}
```

---

### 5.7 `slackMeetingReminder`
**Purpose:** Send AI-enriched Slack DM to meeting owner ~30 min before their meeting  
**Trigger:** Scheduled automation every 5 minutes (via Base44 automation)  
**No user input — fully automated**

**Logic:**
1. Calculate 25–35 min future window from `now`
2. Search HubSpot meetings where `hs_meeting_start_time` is within that window
3. For each meeting:
   - Fetch associated contact (name, email, company)
   - Fetch contact's first associated deal (name, stage, amount, close date, next step)
   - Extract meeting notes from `hs_internal_meeting_notes` or `hs_meeting_body` (max 400 chars)
   - Run `InvokeLLM` (no web search, default model) with meeting context → generates `talkingPoints` (3), `riskFlags` (up to 3), `suggestedOpener`
   - Fetch meeting owner's email via `/crm/v3/owners/{hubspot_owner_id}`
   - Resolve owner to Slack user via `users.lookupByEmail`
   - Fallback: use `auth.test` to get the authorized Slack user
   - Open DM channel via `conversations.open`
   - Send Slack Block Kit message via `chat.postMessage`

**Slack message structure (Block Kit):**
1. Header: "🗓️ Meeting in ~30 minutes"
2. Section: meeting title + formatted start time
3. Divider
4. Section: contact name, company, email
5. (If deal) Divider + deal snapshot section
6. (If notes) Divider + meeting notes section
7. (If AI insights) Divider + `🧠 AI Talking Points`
8. (If risk flags) `⚑ Watch-outs`
9. (If opener) `💬 Suggested Opener`
10. Divider + context footer

**Response:**
```json
{ "sent": 2, "details": [ { "meetingId": "...", "title": "...", "contact": "...", "slackUserId": "...", "status": "sent|failed|skipped" } ] }
```

---

## 6. Frontend Pages

### 6.1 `pages/Home.jsx` — Root Shell
**State managed here:**
- `activeTab` (1|2|3) — which agent panel is shown
- `contacts` — list from `agentContacts`
- `meetings` — list from `agentMeetings`
- `selectedContact` — currently selected contact (auto-selects first on load)
- `loadingContacts`, `loadingMeetings`, `syncingMeetings`
- `followupData` — `{ transcript, contact }` passed to Agent02 when "Use for Follow-up" is clicked

**On mount:** Calls `agentContacts` and `agentMeetings` in parallel

**Layout:**
```
NavBar (full width)
TabBar (full width, sticky below navbar)
Content row:
  Sidebar (252px, only when activeTab === 1)
  Main panel (flex-1, scroll)
  MeetingPanel (300px, always visible)
```

**Cross-agent flow:** `handleUseForFollowup(meeting)` → sets `followupData` with meeting's nooksNote as transcript + contact name, switches to tab 2

---

### 6.2 `pages/Agent01.jsx` — Pre-Meeting Brief
**Props:** `{ selectedContact }`  
**States:** `empty | loading | result | error`  
**Auto-triggers** `runBrief(contact)` whenever `selectedContact` changes  
**Steps animation:** 4 steps × 1.2s delay before actual API call  
**Calls:** `base44.functions.invoke('agentBrief', { query, email, hubspotId })`  
**Renders:** `<BriefView>` on success, `<LoadingSteps>` during load

---

### 6.3 `pages/Agent02.jsx` — Post-Call Follow-up
**Props:** `{ initialData }` — optional `{ transcript, contact }` from meeting panel  
**States:** `idle | loading | result | error`  
**Has a sample transcript** (hardcoded demo — clearly labelled, loaded via "Load sample" button)  
**Steps:** 4 steps × 1.2s delay  
**Calls:** `base44.functions.invoke('agentFollowup', { transcript, contact })`  
**Renders:** 2-column results grid (pain points + commitments left, email draft + HubSpot updates right)

---

### 6.4 `pages/Agent03.jsx` — Pipeline Health Monitor
**Props:** none  
**States:** `idle | loading | result | error`  
**Triggered manually** via "Run pipeline health scan" button  
**Steps:** 4 steps × 1.5s delay  
**Calls:** `base44.functions.invoke('agentPipeline', {})`  
**Renders:** Stats grid (4 cards) + deal cards + forecast + actions + risk patterns

---

## 7. Frontend Components

### 7.1 `components/NavBar.jsx`
- Calls `agentHealth` on mount to show HubSpot connection status
- Props: `contactCount` (shown in status pill), `dealCount`
- Displays: logo, "Adapt" brand, "GTM Agent System · Live HubSpot Demo", green/red status pill, date

### 7.2 `components/TabBar.jsx`
- Props: `activeTab`, `onTabChange`, `contactCount`
- Three tabs: `01 Pre-Meeting Brief` (teal), `02 Post-Call Follow-up` (blue), `03 Pipeline Health` (amber)
- Sticky below navbar at `top-[50px]`

### 7.3 `components/Sidebar.jsx`
- Props: `contacts`, `loading`, `onSelectContact`, `selectedContact`
- Search input (filters by name or company, client-side)
- Groups contacts into "Opportunities" (lifecycle === 'opportunity') and "All Contacts"
- Each contact shows initials avatar, name, company, lifecycle badge
- Active contact has green left border + green background

### 7.4 `components/MeetingPanel.jsx`
- Props: `meetings`, `loading`, `syncing`, `onUseForFollowup`, `onSelectContact`, `onSync`
- Width: 300px fixed, right side
- Two tabs: Upcoming (sorted asc by startTime) / Past (sorted desc)
- Each meeting: date box, title, status badge, time, contact link, deal stage
- Expanded state: contact detail, deal card (amber), date chips, meeting notes, "Use for Post-Call Follow-up →" CTA
- Sync button (calls `agentMeetings` again manually)

### 7.5 `components/BriefView.jsx`
- Props: `brief`, `contact`, `generatedAt`
- Renders all sections of the AI brief:
  - Top bar (timestamp, Apollo pill, HubSpot ID pill, Live status)
  - Active deal banner (green if deal found)
  - 2-column: contact card + primary deal snapshot
  - All deals (if >1)
  - `ActivityTimeline` (meetings + notes + tasks)
  - LinkedIn Profile card (blue left border)
  - Company Intel card (amber left border) with stats, description, social channels, news
  - Talking Points + Risk Flags grid
  - Suggested Opener (green card)

### 7.6 `components/ActivityTimeline.jsx`
- Props: `meetings`, `notes`, `tasks`
- Merges all into one timeline sorted by rawDate/date descending
- Renders `MeetingItem`, `NoteItem`, `TaskItem` with icons + color-coded pills
- Meeting outcome → color: completed/scheduled=teal, cancel/no_show=red, other=amber
- Task status → color: completed=teal, not_started=gray, in_progress=blue, deferred=amber

### 7.7 `components/LoadingSteps.jsx`
- Props: `steps` (string[]), `currentStep` (int), `accentColor` (hex), `title` (string)
- Shows step list with: ✓ (done), pulsing dot (active), gray dot (pending)
- Used in all three agents with different accent colors

---

## 8. Design System & Tokens

### CSS Variables (`index.css`)
```css
--bg-primary: #F5F7F9
--bg-secondary: #FFFFFF
--border-default: #DDE2E8
--border-hover: #C5CDD7
--teal: #159A68
--teal-bg: #E8F7F1
--amber: #C47B10
--amber-bg: #FEF6E4
--red: #D93030
--red-bg: #FEF0F0
--blue: #2563EB
--blue-bg: #EFF5FF
--text-primary: #1A2330
--text-secondary: #4A5C6A
--text-muted: #8A9BAA
```

### Reusable `Pill` component pattern (inline in many files)
```jsx
const PILL_STYLES = {
  teal:   { bg: '#E8F7F1', border: '#A8DCC8', text: '#159A68' },
  amber:  { bg: '#FEF6E4', border: '#F0D090', text: '#C47B10' },
  red:    { bg: '#FEF0F0', border: '#F5AAAA', text: '#D93030' },
  gray:   { bg: '#F5F7F9', border: '#DDE2E8', text: '#4A5C6A' },
  blue:   { bg: '#EFF5FF', border: '#BFCFFF', text: '#2563EB' },
  purple: { bg: '#F3F0FF', border: '#C4B5FD', text: '#7C3AED' },
};
// Font: IBM Plex Mono, 10px, padding: 2px 8px, borderRadius: 20px
```

### Typography Rules
- Section labels: IBM Plex Mono, 9px, `#8A9BAA`, `letterSpacing: 0.08em`, UPPERCASE
- Headings: Syne font family, `fontWeight: 700`
- Body: DM Sans
- Monospace data (IDs, dates, amounts): IBM Plex Mono

### Card pattern
```jsx
// background: #FFFFFF
// border: 1px solid #DDE2E8
// borderRadius: 10px
// padding: 16px
// Left accent border: borderLeft: `3px solid ${color}`
```

### Animations
- `.fade-in-up` — CSS keyframe: opacity 0→1, translateY 12px→0, 0.4s ease-out
- `.pulse-dot` — CSS keyframe: opacity + scale pulse, 1.2s, used for loading indicators

---

## 9. Data Schemas / Shapes

### Contact (internal)
```ts
{
  id: string           // HubSpot contact ID
  name: string
  email: string | null
  company: string | null
  title: string | null
  lifecycle: string | null   // e.g. "opportunity", "lead", "customer"
  fromApollo: boolean
  linkedinUrl: string | null
  createdDate: string | null // ISO
}
```

### Meeting (internal, from agentMeetings)
```ts
{
  id: string
  title: string
  startTime: string      // ISO
  endTime: string | null
  status: 'Upcoming' | 'Completed'
  nooksNote: string | null
  contact: { name: string, email: string, company: string }
  deal: null             // always null from agentMeetings (populated by agentBrief)
  source: string
}
```

### Deal (from agentBrief)
```ts
{
  found: boolean
  id: string
  name: string
  stage: string
  amount: string | null   // formatted "$X,XXX"
  closeDate: string | null
  nextStep: string | null
  pipeline: string | null
  probability: string | null  // "XX%"
  lastModified: string | null
}
```

---

## 10. Automations

### Slack Meeting Reminder (Scheduled)
- **Type:** Scheduled
- **Function:** `slackMeetingReminder`
- **Schedule:** Every 5 minutes (minimum interval)
- **Purpose:** Checks every 5 min for meetings starting in 25–35 min window, sends Slack DM

To create this automation in Base44:
```
automation_type: "scheduled"
name: "Slack Meeting Reminder"
function_name: "slackMeetingReminder"
repeat_interval: 5
repeat_unit: "minutes"
```

---

## 11. End-to-End Data Flows

### Flow A: Pre-Meeting Brief
```
User clicks contact in Sidebar
→ Agent01.runBrief({ query, email, hubspotId })
→ Invokes agentBrief function
  → HubSpot: fetch contact by ID / email / name
  → HubSpot: fetch deals, meetings, notes, tasks
  → InvokeLLM (gemini_3_1_pro + web search)
    → Returns: linkedinProfile, companyIntel, talkingPoints, riskFlags, suggestedOpener
→ BriefView renders full brief
```

### Flow B: Post-Call Follow-up
```
User pastes transcript + contact name
→ Agent02.analyse()
→ Invokes agentFollowup({ transcript, contact })
  → Pure text parsing (no AI, no HubSpot)
  → Extracts: painPoints, commitments, nextStepDate
  → Builds: emailDraft, hubspotUpdates list
→ Renders 2-column results view
```

### Flow C: Pipeline Health
```
User clicks "Run pipeline health scan"
→ Agent03.runScan()
→ Invokes agentPipeline({})
  → HubSpot: fetch all open deals (max 100)
  → For each deal: fetch associated contact + company
  → Calculate staleness, urgency, risk flags
  → Generate patterns + actions list
→ Renders stats grid + deal cards + forecast
```

### Flow D: Meeting Panel Sync
```
On Home mount / user clicks sync button
→ fetchMeetings() invokes agentMeetings({})
  → HubSpot: fetch 50 meetings sorted by start time
  → For each: fetch associated contact
→ MeetingPanel renders upcoming/past tabs
```

### Flow E: Meeting → Follow-up Handoff
```
User clicks "Use for Post-Call Follow-up" on a meeting card
→ Home.handleUseForFollowup(meeting)
→ Sets followupData = { transcript: meeting.nooksNote, contact: "Name at Company" }
→ Switches activeTab to 2
→ Agent02 useEffect detects new initialData → pre-fills form
```

### Flow F: Automated Slack Reminder (background)
```
Every 5 minutes (Base44 scheduled automation)
→ slackMeetingReminder function fires
  → HubSpot: search meetings in +25 to +35 min window
  → For each meeting:
    → HubSpot: get contact details
    → HubSpot: get deal details
    → Extract meeting notes
    → InvokeLLM: generate talking points, risks, opener
    → HubSpot: get owner email
    → Slack: resolve email → user ID
    → Slack: open DM → send Block Kit message
```

---

## Notes for Replication

1. **No hard-coded contact/deal/meeting data** anywhere in the codebase — all data comes live from HubSpot.
2. The only "demo" content is the `SAMPLE_TRANSCRIPT` string in `Agent02`, clearly labelled, loaded only when the user clicks "Load sample".
3. The Slack integration requires the Base44 OAuth connector to be authorized with the required scopes before `slackMeetingReminder` will work.
4. The AI model `gemini_3_1_pro` is specifically required for `add_context_from_internet: true` in `agentBrief`. Using any other model will throw an error.
5. All amounts are formatted as `$X,XXX` strings in the backend before being sent to the frontend.
6. Date formatting throughout uses `toLocaleDateString('en-US', {...})` — timezone follows the server's local time (UTC on Deno Deploy).