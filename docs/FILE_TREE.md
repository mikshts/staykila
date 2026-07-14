# StayKila — Project File Structure

> Generated from a full scan of `C:\Users\Lenovo\staykila`
> (Excludes `node_modules/`, `dist/`, and `.temp/` — generated/large)

staykila/
├── .zed/
│ └── settings.json
├── docs/
│ ├── CODEBASE_AUDIT.md
│ ├── TURNOVER_BILLING_FIX.md
│ └── codebase-summary/
│ ├── README.md
│ ├── architecture.md
│ ├── authentication.md
│ ├── billing-subscriptions.md
│ ├── data-model.md
│ ├── guest-portal.md
│ ├── key-files.md
│ ├── known-issues.md
│ └── room-lifecycle.md
├── public/
│ ├── favicon.svg
│ ├── favicon1.png
│ ├── icons.svg
│ ├── partner1.png
│ ├── partner2.png
│ ├── partner3.png
│ └── partner4.png
├── src/
│ ├── assets/
│ │ ├── hero.png
│ │ ├── react.svg
│ │ └── vite.svg
│ ├── components/
│ │ ├── ErrorBoundary.jsx
│ │ ├── analytics/
│ │ │ └── AnalyticsPanel.jsx
│ │ ├── auth/
│ │ │ ├── AuthCallback.jsx
│ │ │ ├── HotelSetup.jsx
│ │ │ ├── Login.jsx
│ │ │ ├── ProtectedRoute.jsx
│ │ │ └── Register.jsx
│ │ ├── billing/
│ │ │ ├── BillingPage.jsx
│ │ │ └── TrialBanner.jsx
│ │ ├── common/
│ │ │ └── Eyebrow.jsx
│ │ ├── dashboard/
│ │ │ ├── Dashboard.jsx
│ │ │ ├── QRDownload.jsx
│ │ │ ├── RoomGrid.jsx
│ │ │ ├── RoomList.jsx
│ │ │ ├── Sidebar.jsx
│ │ │ ├── StatsCards.jsx
│ │ │ ├── SubscriptionManager.jsx
│ │ │ └── TopBar.jsx
│ │ ├── guest/
│ │ │ ├── GuestPortal.jsx
│ │ │ └── ImageViewer.jsx
│ │ ├── layout/ (empty)
│ │ ├── modals/
│ │ │ ├── CheckinModal.jsx
│ │ │ ├── CheckoutModal.jsx
│ │ │ ├── ExtendModal.jsx
│ │ │ ├── MenuModal.jsx
│ │ │ ├── PriceModal.jsx
│ │ │ ├── QRModal.jsx
│ │ │ ├── WifiModal.jsx
│ │ │ └── index.js
│ │ ├── pricing/
│ │ │ └── PricingCalculator.jsx
│ │ ├── reports/
│ │ │ └── ReportsPanel.jsx
│ │ ├── settings/
│ │ │ ├── ActivityPanel.jsx
│ │ │ ├── CalendarManager.jsx
│ │ │ ├── MessagesPanel.jsx
│ │ │ ├── RoomDetailPanel.jsx
│ │ │ ├── SettingsPanel.jsx
│ │ │ └── index.js
│ │ └── ui/
│ │ ├── Skeleton.jsx
│ │ └── index.js
│ ├── contexts/
│ │ ├── AuthContext.jsx
│ │ ├── HotelContext.jsx
│ │ └── SubscriptionContext.jsx
│ ├── hooks/
│ │ ├── useBrandFonts.js
│ │ └── usePayments.js
│ ├── lib/
│ │ ├── guestUrl.js
│ │ ├── pricing.js
│ │ └── supabase.js
│ ├── pages/
│ │ ├── LandingPage.jsx
│ │ └── PricingPage.jsx
│ ├── services/
│ │ ├── messageService.js
│ │ └── roomService.js
│ ├── utils/ (empty)
│ ├── App.css
│ ├── App.jsx
│ ├── index.css
│ ├── main.jsx
│ └── sound.js
├── supabase/
│ ├── .temp/
│ └── functions/
│ ├── cancel-subscription/
│ │ └── index.ts
│ ├── change-room-count/ (empty)
│ ├── create-checkout/
│ │ └── index.ts
│ ├── paymongo-webhook/
│ │ └── index.ts
│ └── verify-payment/
│ └── index.ts
├── .gitignore
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── vercel.json
└── vite.config.js
