# WS Financial Decision Engine

A working AI system prototype built for the Wealthsimple AI Builders program.

---

## What This Is

An AI-powered financial decision engine that helps Canadians figure out how to allocate their savings across RRSP, TFSA, FHSA, and non-registered accounts — using Monte Carlo simulations and Claude AI to narrate the results.

**The core insight:** Canadians constantly make suboptimal account allocation decisions because the interplay between RRSP/TFSA/FHSA tax treatments, marginal rates, and long-term compounding is genuinely complex. The current alternative is booking a $300/hr advisor appointment and waiting three weeks.

This system replaces the wait and most of the cost — while keeping the human in the decision seat.

---

## Why This Satisfies the AI Builders Brief

The program evaluates on four criteria. Here is how this project addresses each:

### 1. Genuine problem with clear human/AI boundaries

**AI does:**
- All quantitative analysis (tax calculations, Monte Carlo projections, contribution room)
- Scenario generation and comparison
- Risk identification with specific dollar amounts
- Plain-English narration of what the numbers mean

**Human must decide:**
- Whether they'll actually buy a home (and when)
- Their true risk tolerance under a real market crash
- Family plans, career stability, health — none of which are modelable
- The final allocation

This boundary is made explicit in the UI — not just a disclaimer, but a structured "AI analyzed / Human must decide" section in the decision gate.

### 2. System thinking

The financial engine is a complete pipeline:
```
User profile → Contribution room calculation → Scenario builder → Monte Carlo (1000 runs × 4 scenarios) → Tax-adjusted net worth → Claude narration → Decision gate
```

Each component is isolated with a clear interface. The Claude integration only receives the engine's output — it never touches raw profile data directly.

### 3. Handling uncertainty and failure modes

- Monte Carlo simulation shows P10/P50/P90 outcome bands, not false point estimates
- The decision gate explicitly models confidence as high/medium/low with a reason
- Risks are quantified ("a 1% rate increase adds $X/month to a mortgage") not generic
- Tax calculations use real 2024 federal + provincial brackets for 5 provinces
- The UI contains a hard disclaimer: "This is not financial advice"

### 4. Scalability and AI-first thinking

- Adding provinces is a one-row change in `canadianTax.js`
- Scenario logic is data-driven — adding a fifth scenario is isolated to `buildScenarios()`
- Claude prompts are loaded from `.md` files, not hardcoded strings — easy to iterate
- The architecture is identical to a production fintech API pattern

---

## Project Structure

```
CC_WS/
├── backend/
│   ├── index.js                    # Express API server
│   ├── package.json
│   ├── .env.example                # Template — copy to .env
│   ├── lib/
│   │   ├── canadianTax.js          # Tax brackets + marginal rate calculations
│   │   └── financialEngine.js      # Monte Carlo + scenario builder
│   └── prompts/
│       ├── scenarioNarrationPrompt.md   # Claude prompt for pros/cons narration
│       └── decisionGatePrompt.md        # Claude prompt for AI/human boundary
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                # React entry point
│   │   ├── App.tsx                 # Full UI — profile form, loading, results
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── index.css               # All styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md                       # This file
```

---

## Setup

### Prerequisites

- Node.js 18+
- An Anthropic API key (https://console.anthropic.com)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm start
# Server runs on http://localhost:4000
```

### 2. Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

Open http://localhost:5173 in your browser.

### Health Check

```
GET http://localhost:4000/health
```

Returns: `{ status: "ok", model: "claude-sonnet-4-6", timestamp: "..." }`

---

## How It Works

### Financial Engine (no AI)

**Step 1: Contribution Room**

```
RRSP room = min(18% of income, $31,560) + unused carried-forward room
TFSA room = $7,000 (2024) + unused room from prior years
FHSA room = $8,000/year (if first-time buyer, lifetime max $40,000)
```

**Step 2: Scenario Builder**

Four strategies are built based on the user's profile and goal:
- **RRSP Maximizer** — fill RRSP first for immediate tax deduction
- **TFSA Maximizer** — fill TFSA first for tax-free flexible growth
- **FHSA First / Balanced Split** — FHSA for home buyers; 50/50 split otherwise
- **Flexible Growth** — partial registered accounts + non-registered for liquidity

**Step 3: Monte Carlo Simulation**

Each scenario runs 1,000 independent simulations over the user's time horizon.

Each year, a random annual return is sampled from a normal distribution using the Box-Muller transform:
```
Z = sqrt(-2 × ln(U1)) × cos(2π × U2)
return = mean + std × Z
```

Asset allocation parameters (based on long-run historical averages):
| Risk Level    | Mean Return | Std Dev |
|---------------|-------------|---------|
| Conservative  | 5.5%        | 8%      |
| Balanced      | 7.0%        | 12%     |
| Growth        | 8.5%        | 16%     |
| Aggressive    | 10.0%       | 20%     |

**Tax treatment per account:**
- RRSP: grows tax-deferred; balance reduced by 20% (assumed retirement tax rate) at horizon
- TFSA: grows tax-free; balance is the real after-tax value
- FHSA: tax-free if goal is buy_home; RRSP-like treatment otherwise
- Non-registered: annual returns reduced by 30% tax drag on positive returns

After 1,000 simulations, the final portfolio values are sorted and percentiles extracted:
- P10 = "bad scenario" (bottom 10% of outcomes)
- P50 = median, most likely outcome
- P90 = "good scenario" (top 10% of outcomes)

**Step 4: Tax Calculations**

Canadian 2024 federal + provincial brackets for ON, BC, AB, QC, MB.

RRSP/FHSA tax saving = contribution × marginal rate
Example: $26,400 RRSP at 43.4% marginal rate = $11,460 saved this year.

### AI Layer (Claude)

After the financial engine completes, two Claude API calls run in **parallel**:

**Call 1: Scenario narration**
Prompt receives: full engine output (all 4 scenarios with projections, tax summary, contribution rooms).
Returns: per-scenario narration (2–3 sentences with real dollar amounts), pros (3), cons (2).

**Call 2: Decision gate**
Prompt receives: same engine output.
Returns:
- Recommended scenario ID + name
- Confidence level (high/medium/low) + reason
- 5 things the AI analyzed (quantitative)
- 5 things only the human can decide (qualitative)
- Bottom line paragraph
- 3–4 quantified risks

Total time: ~15–25 seconds (dominated by Claude API calls).

### Frontend

Single-page React app, three views:
1. **Profile form** — collects all inputs
2. **Loading screen** — animated progress messages during API call
3. **Results** — tax snapshot, 4 scenario cards, risk panel, decision gate

No chart library. The projection range bar is pure CSS, showing P10→P90 as a coloured band. This keeps the bundle lean and demonstrates the UI can be built from scratch.

---

## API Reference

### POST /api/analyze

**Request:**
```json
{
  "profile": {
    "age": 32,
    "province": "ON",
    "annualIncome": 90000,
    "rrspBalance": 18000,
    "rrspRoom": 8000,
    "tfsaBalance": 15000,
    "tfsaRoom": 7000,
    "fhsaBalance": 0,
    "nonRegisteredBalance": 5000,
    "monthlySavings": 2500,
    "riskTolerance": "balanced",
    "primaryGoal": "buy_home",
    "timeHorizon": 10,
    "isFirstTimeBuyer": true
  }
}
```

**Response:**
```json
{
  "scenarios": [
    {
      "id": "rrsp_max",
      "name": "RRSP Maximizer",
      "icon": "🏦",
      "tagline": "...",
      "annual": { "rrsp": 26400, "tfsa": 3600, "fhsa": 0, "nonRegistered": 0 },
      "monthly": { "rrsp": 2200, "tfsa": 300, "fhsa": 0, "nonRegistered": 0 },
      "projections": { "p10": 380000, "p25": 460000, "p50": 590000, "p75": 760000, "p90": 980000 },
      "byYear": [{ "year": 1, "p10": 38000, "p50": 42000, "p90": 47000 }, "..."],
      "rrspTaxSaving": 11462,
      "allocationLabel": "Balanced (60/40)",
      "narration": "With $2,200/month into RRSP...",
      "pros": ["Saves you $11,462 in taxes this year", "..."],
      "cons": ["Withdrawals taxed as income in retirement", "..."]
    }
  ],
  "taxSummary": {
    "totalTax": 21440,
    "effectiveRate": 23.8,
    "marginalRate": 43.4,
    "afterTaxIncome": 68560
  },
  "contributionRooms": {
    "rrsp": 24200,
    "tfsa": 14000,
    "fhsa": 8000,
    "fhsaEligible": true
  },
  "decisionGate": {
    "recommendedScenarioId": "fhsa_first",
    "recommendedScenarioName": "FHSA + RRSP Strategy",
    "confidence": "medium",
    "confidenceReason": "...",
    "aiAnalyzed": ["Tax savings at 43.4% marginal rate", "..."],
    "humanMustDecide": ["Whether you'll buy a home in 3–5 years", "..."],
    "bottomLine": "...",
    "risks": [{ "name": "Rate Risk", "description": "...", "severity": "high", "impact": "..." }]
  }
}
```

---

## Demo Script (2-minute walkthrough)

1. Open http://localhost:5173
2. Walk through the pre-filled profile (age 32, $90k income, Ontario, first-time buyer, $2,500/month savings)
3. Click "Analyze My Finances →"
4. Show the loading screen — point out "Running 4,000 Monte Carlo simulations"
5. On results:
   - Point to the tax snapshot: "43.4% marginal rate — every RRSP dollar saves 43 cents immediately"
   - Show the 4 scenario cards — different P10/P50/P90 ranges
   - Point to the AI pick badge
   - Scroll to decision gate: "Here's where the human/AI boundary becomes explicit"
   - Read out two items from "What the AI analyzed" vs "What only you can decide"
   - Finish on the bottom line paragraph

**Key talking point:** "Most financial tools tell you what to do. This one tells you what it can know — and what only you can decide. That's the product design principle the AI Builders program is looking for."

---

## Limitations and Honest Gaps

- **No inflation adjustment** — projections are nominal, not real
- **No CPP/EI** — omits ~$4k/year in payroll taxes that affect monthly savings
- **Simplified non-registered tax** — real taxation depends on account turnover and asset type
- **No pension income splitting, OAS clawbacks, or AMT**
- **5 provinces only** — SK, NS, NB, PE, NL, NT, NU, YT not modeled
- **Static returns** — mean-reversion, sequence-of-returns risk, and regime changes are not modeled
- **Not financial advice** — this is a decision support tool, not a substitute for a CFP

---

## Future Extensions

- **Real account sync** — connect to Wealthsimple API (if available) to pre-fill balances
- **Mortgage integration** — model the buy vs rent tradeoff with current rate environment
- **Tax-loss harvesting scenarios** — model non-registered account optimization
- **Life event modelling** — marriage, children, job loss shocks to the simulation
- **Export to PDF** — generate a shareable report for an advisor meeting
- **Streaming responses** — stream Claude's narration progressively instead of waiting for full response
