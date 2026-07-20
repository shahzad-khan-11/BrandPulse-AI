# Client Components & Sub-pages Guide 🧩

This document catalogs the modular components and page layouts used in the BrandPulse AI React frontend.

---

## 1. Application Layout & Navigation

### 1.1 Layout Wrapper ([frontend/src/components/Layout.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/components/Layout.tsx))
Provides the main application shell:
- **Responsive Sidebar**: Collapses on mobile with a toggleable hamburger drawer.
- **Role-Based Menus**: Dynamically hides the "Admin Panel" item unless the logged-in user has the `admin` role.
- **Theme Switcher**: Integrates an HSL theme toggle.
- **Alerts Center**: Feeds notifications from `/notifications` and allows marking them read.

### 1.2 Analytics Charts ([frontend/src/components/AnalyticsCharts.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/components/AnalyticsCharts.tsx))
- **SentimentAreaChart**: Renders a stacked area chart mapping positive, neutral, and negative sentiment trends over the past 7 days.
- Automatically adjusts ticks, grid, and tooltip colors on dark mode toggle.

---

## 2. Dashboard Viewport ([frontend/src/pages/Dashboard.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/pages/Dashboard.tsx))
- Displays brand-specific overview stats (Health Index, total mentions, sentiment breakdown).
- **Sync Mentions**: Dispatches crawler sync requests to the backend.
- **Manual Log**: Opens a modal to manually insert brand reviews and triggers the Gemini AI analyzer in the background.

---

## 3. Brand Configurator ([frontend/src/pages/Brands.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/pages/Brands.tsx))
- Lists all monitored brands in a grid format with keyword chips.
- Add Brand form validates keywords, formats them as a clean array, and sends them to `/brands`.
- Handles deletion cascades.

---

## 4. Mentions Search ([frontend/src/pages/Mentions.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/pages/Mentions.tsx))
- Provides detailed keyword searching, source filtering, and sentiment filtering.
- Displays paginated lists of mentions.
- Renders expandable Gemini AI analysis cards (themes, emotional tone, suggested action, explanation).

---

## 5. Reports Manager ([frontend/src/pages/Reports.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/pages/Reports.tsx))
- Supports creating report entries with files (Max 5MB).
- Lists report history and links to static uploads.

---

## 6. Admin Panel Viewport ([frontend/src/pages/AdminPanel.tsx](file:///C:/Users/modle/OneDrive/Desktop/BrandPulse-AI/frontend/src/pages/AdminPanel.tsx))
Contains three sub-tabs:
- **Team Users**: Lists organization members and allows suspending users.
- **System Health**: Displays connection status.
- **Workflow Logs**: Lists crawler execution history and error flags.
