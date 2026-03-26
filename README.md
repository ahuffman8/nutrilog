# NutriLog 🥗

AI-powered health & nutrition tracking app. Log food in plain English, track macros, estimate calorie burn, and get personalized daily insights — all powered by Claude.

## Features

- **Natural language food logging** — type "a bowl of oatmeal with blueberries and coffee" and Claude extracts the full nutritional breakdown
- **Food diary** — browse your daily log with macro progress bars and per-meal cards
- **AI calorie burn estimation** — log "45 min run" and Claude estimates calories burned based on your weight
- **Dashboard** — weekly bar chart, rolling averages, streak counter, and daily AI insight
- **Onboarding + goals** — Mifflin-St Jeor BMR, TDEE with activity multiplier, auto-calculated macro targets
- **Dark mode** — full dark/light mode toggle
- **Mobile-responsive** — works great in a phone browser

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Recharts
- **Backend**: Next.js API routes (Node.js/Express-like)
- **Database**: SQLite via `better-sqlite3`
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

### 1. Install Node.js (if not already installed)

**macOS (recommended: using Homebrew)**
```bash
brew install node
```

**macOS (alternative: direct installer)**
Download from https://nodejs.org/en/download — choose the LTS version.

**Windows**: Download the installer from https://nodejs.org/

Verify installation:
```bash
node --version   # should print v18+ or v20+
npm --version
```

### 2. Configure your API key

```bash
cd ~/nutrilog
cp .env.example .env
```

Edit `.env` and replace `your_api_key_here` with your actual Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Install dependencies

```bash
npm install
```

### 4. Seed the database with example data

This creates a sample user (Alex) with 7 days of realistic meals and activities so the app looks populated on first run:

```bash
npm run seed
```

### 5. Start the app

```bash
npm start
```

The app will be available at **http://localhost:3000**

> **Note**: `npm start` runs the production build. First run `npm run build` if you want to build, or use `npm run dev` for development with hot reload.

**Quick start (development):**
```bash
npm run dev
```

## Project Structure

```
nutrilog/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with dark mode support
│   │   ├── page.tsx            # Main app page (onboarding → main app)
│   │   ├── globals.css         # Tailwind + CSS variables
│   │   └── api/                # API routes
│   │       ├── parse-food/     # POST: Claude food parsing
│   │       ├── log-entry/      # POST/DELETE: save food entries
│   │       ├── log/[date]/     # GET: diary for a date
│   │       ├── parse-activity/ # POST: Claude activity parsing
│   │       ├── log-activity/   # POST/DELETE: save activities
│   │       ├── dashboard/
│   │       │   ├── summary/    # GET: weekly stats
│   │       │   └── insight/    # POST: AI daily insight
│   │       ├── profile/        # GET/PUT: user profile
│   │       └── goals/          # GET/PUT: daily macro goals
│   ├── components/
│   │   ├── Onboarding.tsx      # 4-step first-launch flow
│   │   ├── Dashboard.tsx       # Weekly chart, stats, AI insight
│   │   ├── FoodLogger.tsx      # Natural language food logging
│   │   ├── FoodDiary.tsx       # Daily food log browser
│   │   ├── Settings.tsx        # Profile & goals editor
│   │   └── ui/
│   │       ├── MacroBar.tsx    # Reusable progress bar
│   │       └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── db.ts               # SQLite setup (singleton)
│   │   ├── calculations.ts     # BMR/TDEE/macro calculations
│   │   └── seed.ts             # Database seeding script
│   └── types/
│       └── index.ts            # TypeScript types
├── nutrilog.db                 # SQLite database (created on first run)
├── .env                        # API key (do not commit)
├── .env.example                # Template
└── README.md
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/parse-food` | POST | Claude parses natural language → structured nutrition data |
| `/api/log-entry` | POST/DELETE | Save or delete a confirmed food entry |
| `/api/log/:date` | GET | All entries + totals for a date (YYYY-MM-DD) |
| `/api/parse-activity` | POST | Claude estimates calories burned from activity description |
| `/api/log-activity` | POST/DELETE | Save or delete an activity entry |
| `/api/dashboard/summary` | GET | Weekly stats, today's balance, streak |
| `/api/dashboard/insight` | POST | Claude generates a 2-3 sentence daily recommendation |
| `/api/profile` | GET/PUT | User profile |
| `/api/goals` | GET/PUT | Daily macro/calorie targets |

## Claude API Usage

All AI calls use `claude-sonnet-4-20250514`. Three use cases:

1. **Food parsing** (`/api/parse-food`): Converts "I had a burrito bowl with chicken and rice" → JSON with per-item calories/macros
2. **Activity parsing** (`/api/parse-activity`): Converts "45 min run" + user weight → calories burned using MET formula
3. **Daily insight** (`/api/dashboard/insight`): Analyzes 7-day history → personalized 2-3 sentence recommendation

All Claude calls return strict JSON (no markdown) via system prompt instructions.

## Macro Color Coding

| Macro | Color |
|-------|-------|
| Calories | 🔴 Red |
| Protein | 🟢 Green |
| Carbs | 🟠 Orange |
| Fat | 🔵 Blue |
| Fiber | 🟣 Purple |
| Sugar | 🩷 Pink |

## First Launch

On first launch (without seeding), you'll see the onboarding flow:
1. **Name, Age, Sex**
2. **Height & Weight** (metric/imperial toggle)
3. **Goal weight, Activity level, Primary goal**
4. **Review auto-calculated targets** (BMR → TDEE → macros)

After completing onboarding, the app goes straight to the dashboard.

## Wearable Integration

The Settings page includes a "Connect Wearable" section as a placeholder. Whoop integration is displayed as "coming soon" — no actual API calls are made.
