# AI Agent Context & Guidelines - Email Generator KPR

## 1. Project Overview & Ecosystem
This repository (`email-generator-kpr-99` / `kpr-crm`) is part of the **99 Group KPR Operations Suite**.

The ecosystem consists of 3 synchronized operational tools:
1. **Email Generator KPR** (This project)
   - Local path: `D:\Product tim sales`
   - Production URL: `https://email-generator-kpr-99.vercel.app/leads`
   - Purpose: Draft bank submission emails and notify PIC bank contacts.
2. **Mortgage Intelligence Hub**
   - Local path: `D:\Big data Kpr`
   - Production URL: `https://kpr-hub.vercel.app/`
   - Purpose: Tele scorecard, SLA follow-up monitoring, acquisition top-of-funnel analytics, AI council, and CRM pipeline tracking.
3. **PR Request & Leads Automation**
   - Local path: `D:\Automasi PR Request\web`
   - Production URL: `https://pr-request.vercel.app/`
   - Purpose: Automated PR Excel generation, agent agreement PDFs, Google Drive lead folders synchronization.
4. **Operations Command Center Launchpad (Central Portal)**
   - Production URL: `https://pr-request.vercel.app/portal`
   - Purpose: Single entry point for operations staff with quick links to all 3 tools, Google Drive root folders, and master spreadsheets.

---

## 2. Cross-Navigation Requirement for AI Agents
To provide a seamless experience for the Operations team across all tools:
- **Component**: `src/components/AppSwitcher.jsx`
- **Header Integration**: In `src/components/Layout.jsx`, the top header must ALWAYS include:
  1. The "Portal Ops" shortcut link pointing to `https://pr-request.vercel.app/portal`.
  2. The `<AppSwitcher currentApp="email" />` dropdown.
- **Rule for Future Modifications**: When refactoring or redesigning navigation, layouts, or headers, DO NOT remove or break `AppSwitcher` or the Portal link.

---

## 3. Tech Stack & Build Commands
- **Framework**: React 18 + Vite + React Router DOM
- **Icons**: `lucide-react`
- **Styling**: Scoped/modular CSS (`src/index.css`)
- **Build**: `npm run build`
- **Dev**: `npm run dev`
