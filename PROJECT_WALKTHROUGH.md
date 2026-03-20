# WS Financial Decision Engine — Project Walkthrough

## What This Is

An AI-powered financial planning tool built for Canadians. You enter your financial situation — income, age, province, savings, goals — and it runs 4,000 simulations (1,000 per strategy) to compare four different ways to split your money across RRSP, TFSA, FHSA, and regular investment accounts. Then GPT-4o explains the results in plain English and gives you a personalized recommendation.

The key idea: instead of giving you one "average" number, it shows you the **range of possible outcomes** — worst case, most likely, best case — so you can make an honest, informed decision.

---

## Why This Exists

Every Canadian financial tool out there answers **one question at a time**:

- Wealthsimple's RRSP calculator: "How much will my RRSP grow?"
- Wealthsimple's TFSA calculator: "How much will my TFSA grow?"
- Wealthsimple's tax calculator: "How much tax do I owe?"
- Questrade's account picker: "Which account is right for me?"

But the real question Canadians actually face is:

> "I have $X per month to save — how should I split it across RRSP, TFSA, FHSA, and regular accounts, given MY specific income, province, age, and goals?"

No tool answers that. This one does.

---

## What Makes This Different (6 Value Props)

### 1. Side-by-Side Strategy Comparison

Every other tool makes you run separate calculators and try to compare mentally. This builds 4 strategies from YOUR numbers and shows them next to each other — same screen, same assumptions, same time horizon. You can see immediately that Strategy A gives you $340K but Strategy B gives you $310K with a $4,000 tax refund today.

**Why it matters:** The "right" answer depends on tradeoffs. You can't see tradeoffs when you're flipping between 3 different calculator tabs.

### 2. Honest Outcome Ranges, Not Fake Precision

Wealthsimple's retirement calculator shows one line going up. That's misleading — it implies your money will grow in a straight line at exactly 6% per year. It won't.

This tool runs 1,000 simulations per strategy and shows you the **range**: "In most futures, you'll end up between $280K and $420K, with $340K being the most likely." That's honest. A single number is a guess dressed up as a fact.

**Why it matters:** People make bad decisions when they think an outcome is certain. Showing the range builds realistic expectations.

### 3. AI That Explains, Not Just Calculates

Other tools give you numbers and leave you to figure out what they mean. This sends your complete results to GPT-4o with instructions to explain everything like a friend would — no jargon, with your actual dollar amounts.

Instead of "RRSP contributions are tax-deductible at your marginal rate," you get: "Putting $10,000 into your RRSP saves you $2,965 in taxes this year. That's money back in your pocket at tax time."

**Why it matters:** Most Canadians don't have a finance background. Numbers without explanation are useless for making decisions.

### 4. The Decision Gate — AI Honesty About Its Own Limits

This is the one that's genuinely novel. Every other AI financial tool acts like it has all the answers. This one explicitly separates:

- **What the AI figured out** — tax math, projections, account capacity (things we can calculate)
- **Things only you know** — whether you'll switch jobs, buy a home, have kids, how you'll feel when markets drop 20%

No other tool does this. It's the difference between "Here's your answer" and "Here's what the math says — but here are the things that could change everything, and only you know those."

**Why it matters:** It builds trust. It's honest. And it prevents people from blindly following an AI recommendation without thinking about their own life.

### 5. Personalized Tips Based on YOUR Numbers

Other tools give generic advice articles ("RRSPs are good for high-income earners"). This one looks at your actual situation and generates specific, actionable tips:

- At your 29.65% tax rate, here's exactly how much each RRSP dollar saves you
- Your liquid savings are below 3 months of expenses — consider an emergency fund first
- You have $25,000 in unused RRSP room — you could use a bonus or windfall for a big refund
- You're 27 with a 30-year horizon — time is your biggest advantage because of compounding
- As a first-time buyer, the FHSA is the single best account for you — here's why

**Why it matters:** Generic advice is ignored. Advice with your actual dollar amounts gets acted on.

### 6. Take It to a Real Advisor

Wealthsimple is removing their complimentary financial advisory service in January 2026. This tool has a Print/PDF button so you can take a comprehensive, personalized report — with 4 strategies, projections, tax analysis, risks, and the AI recommendation — to any financial advisor you choose.

**Why it matters:** The tool doesn't pretend to replace a human advisor. It gives you a starting point so the conversation with an advisor is productive instead of starting from scratch.

---

## The Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express (port 4000) |
| Frontend | React + TypeScript + Vite (port 5173) |
| AI | OpenAI GPT-4o |
| Tax Engine | Custom — 2025 federal + all 13 provincial/territorial brackets |
| Simulations | 1,000 Monte Carlo runs per strategy, worker thread |
| Validation | Zod schemas on AI responses |
| Testing | 38 unit tests (Node.js built-in test runner) |
| Linting | ESLint + Prettier (frontend and backend) |

No database. Stateless — you enter your info, it crunches everything, returns the results.

---

## Project Structure

```
CC_WS/
├── backend/
│   ├── index.js                        Express API server (single endpoint)
│   ├── lib/
│   │   ├── canadianTax.js              2025 federal + all 13 provincial tax brackets
│   │   ├── financialEngine.js          Monte Carlo engine + scenario builder
│   │   ├── financialEngine.worker.js   Runs simulations in a background thread
│   │   └── schemas.js                  Validates AI responses with Zod
│   ├── prompts/
│   │   ├── scenarioNarrationPrompt.md  Instructions for AI to narrate strategies
│   │   └── decisionGatePrompt.md       Instructions for AI recommendation
│   └── test/
│       ├── canadianTax.test.js         19 tax calculation tests
│       └── financialEngine.test.js     19 engine tests
│
├── frontend/
│   └── src/
│       ├── App.tsx                     Main app container (3 views)
│       ├── types.ts                    TypeScript types for all data
│       ├── index.css                   All styles (single file, no framework)
│       ├── components/
│       │   ├── ProfileForm.tsx         Input form with hero section + value props
│       │   ├── AnalyzingView.tsx       Loading screen with progress steps
│       │   ├── ResultsView.tsx         Results page (orchestrates everything below)
│       │   ├── ScenarioCard.tsx        Individual strategy card with projections
│       │   ├── ProjectionBar.tsx       Visual range bar (worst to best case)
│       │   ├── GrowthChart.tsx         Year-by-year growth with milestones
│       │   ├── ComparisonTable.tsx     Side-by-side strategy comparison
│       │   ├── SmartTips.tsx           Personalized tips based on your numbers
│       │   ├── Glossary.tsx            Searchable glossary (22 terms)
│       │   ├── Header.tsx              App header bar
│       │   └── ErrorBoundary.tsx       Catches React errors gracefully
│       └── utils/
│           ├── constants.ts            Provinces, risk options, goals, defaults
│           └── format.ts              Number formatting helpers
```

---

## User Flow — Screen by Screen

### Screen 1: Profile Form

The first thing users see is a **hero section** explaining what the tool does and why it's different — 4 value prop cards and a "how it works" 3-step flow.

Below that, the form collects:

- **About You** — Age, province, income (before tax), first-time buyer checkbox
- **Current Accounts** — RRSP balance + unused room, TFSA balance + unused room, FHSA balance, other investments. Hints tell you where to find each number (CRA My Account at canada.ca).
- **Your Goal** — Monthly savings, time horizon (years), primary goal (retire comfortably / buy first home / retire early / grow savings), risk comfort level
- **Glossary** — A searchable glossary at the bottom with 22 terms explained in plain English (RRSP, TFSA, FHSA, stocks, bonds, compounding, tax brackets, etc.)

### Screen 2: Analyzing (Loading)

Shows progress steps in plain English while the backend works:

1. Figuring out how much room you have in each account...
2. Simulating 1,000 possible futures for each strategy...
3. Calculating your taxes for your province...
4. Building 4 different savings strategies...
5. Asking AI to explain your options in plain English...
6. Putting together your recommendation...

### Screen 3: Results

This is the main payoff. From top to bottom:

**1. Tax Snapshot** — Four stats at a glance:
- Tax on Next $1 Earned (marginal rate, explained in plain language)
- Overall Tax Rate (effective rate)
- Take-Home Pay
- RRSP Room Left

**2. Personalized Smart Tips** — Color-coded cards with advice specific to YOUR numbers:
- Green (money): "Your tax rate makes RRSPs extra valuable"
- Orange (warning): "Consider building an emergency fund first"
- Blue (info): "Time is your biggest advantage"
- Purple (opportunity): "You have $25K in unused RRSP room"

**3. Four Strategy Cards** — Click to compare:
- 🏦 Tax Saver — RRSP first, get a tax refund now
- 💰 Tax-Free Growth — TFSA first, never pay tax on gains
- 🏠 Home Buyer (or ⚖️ Even Split) — FHSA first if eligible
- 📈 Maximum Flexibility — Regular account, full access anytime

Each card shows: most likely outcome, outcome range bar, tax saved this year, monthly allocation breakdown, AI-written pros and cons.

**4. Year-by-Year Growth Chart** — For whichever strategy you click, a bar chart shows growth over time with the possible range (worst to best case) and milestone markers ($50K, $100K, $250K, etc.).

**5. Strategy Comparison Table** — All 4 strategies side by side: most likely outcome, worst case, best case, tax refund, monthly to each account. Best values highlighted.

**6. Risk Assessment** — AI-identified risks specific to your plan, color-coded by severity (high/medium/low).

**7. AI Recommendation (Decision Gate)** — The core differentiator:
- Which strategy the AI recommends, with a confidence level
- 🤖 "What the AI figured out" — things it calculated
- 🧠 "Things only you know" — things the AI can't predict
- An honest "bottom line" paragraph
- Clear disclaimer: "This is not financial advice"

**8. Glossary** — Same searchable glossary from the form page.

**9. Print / Save PDF** — Take the full report to a real financial advisor.

---

## What's Under the Hood

### The Financial Engine

`financialEngine.js` is the core — no AI involved, just math:

1. **Contribution Room** — Calculates how much you can put into RRSP ($32,490 max for 2025), TFSA ($7,000), and FHSA ($8,000) based on income and carried-forward room
2. **Scenario Builder** — Creates 4 strategies by splitting your savings differently across accounts
3. **Monte Carlo Simulation** — Runs 1,000 simulations per strategy (4,000 total) in a background worker thread so the server doesn't freeze. Each simulation randomizes yearly returns based on your risk level.
4. **Tax Treatment** — Applies different tax rules per account:
   - RRSP: taxed on withdrawal (estimated 20% in retirement)
   - TFSA: completely tax-free
   - FHSA: tax-free for home purchase
   - Non-registered: 30% annual tax drag on gains

### The Tax Engine

`canadianTax.js` has complete 2025 figures:

- Federal tax brackets including the new 14.5% blended rate
- All 13 provinces and territories with correct 2025 brackets
- Provincial basic personal amounts
- Proper bracket-spanning RRSP tax saving calculation (not just a simple multiplication)

### The AI Layer

`index.js` makes two parallel GPT-4o calls:

1. **Narration** — Explains each strategy in plain English with the user's actual dollar amounts
2. **Decision Gate** — Picks a recommendation, separates AI-knowable from human-decidable factors, identifies risks

Both prompts explicitly instruct the AI to avoid jargon, use dollar amounts, and be honest about what it doesn't know. Zod schemas validate the response structure.

---

## How to Run It

```bash
# Backend
cd backend
npm install
# Add your OpenAI API key to backend/.env
npm start              # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

---

## Video Script

### Opening (30 seconds)

> "If you're a Canadian trying to figure out where to put your savings — RRSP, TFSA, FHSA — you've probably noticed every tool out there only shows you one account at a time. Wealthsimple has an RRSP calculator. A separate TFSA calculator. A separate tax calculator. But nobody shows you all your options side by side.
>
> I built something that does."

### Demo — Profile Form (60 seconds)

> "When you open the app, you see right away what makes it different — 4 strategies compared, 1,000 simulations each, AI that explains things in plain English, and it's honest about what it doesn't know.
>
> You fill in your info — age, province, income. Then your current account balances. If you don't know your RRSP or TFSA room, the app tells you exactly where to find it — CRA My Account at canada.ca.
>
> Then your goal — retirement, buying a first home, early retirement, or just growing your savings. And how much risk you're comfortable with. There's a glossary at the bottom if you don't know what any term means."

### Demo — Results (2-3 minutes)

> "Hit Analyze, and it runs 4,000 simulations on your numbers. Here's what comes back.
>
> First, your tax snapshot — your tax rate, take-home pay, RRSP room.
>
> Then, personalized tips based on YOUR numbers. Not generic articles. This is telling me that at my specific tax rate, every $1,000 in RRSP saves me this many dollars. And it's warning me that my liquid savings are below 3 months of expenses, so I should think about an emergency fund before locking money away.
>
> Now the four strategies. Each one shows the most likely outcome, the range of possible outcomes, how much tax you save this year, and how your monthly savings would be split. The AI writes plain-English pros and cons for each one.
>
> Click a card and you get a year-by-year growth chart — not a single line, but the full range. The green band shows where you'll most likely end up. And it flags milestones — when you'll hit $100K, $250K.
>
> Below that, a comparison table shows all four strategies side by side in one view. Most likely outcome, worst case, best case, tax refund, monthly allocations. The best values are highlighted.
>
> Then the risks. The AI identifies specific risks for YOUR plan — not generic 'markets might go down' but actual dollar amounts.
>
> And here's the part that's genuinely new — the Decision Gate. The AI picks a recommendation, but then it explicitly says: here's what I was able to calculate, and here's what only YOU can decide. Things like whether you'll change jobs, buy a home, have kids. No other tool does this. Most tools just give you an answer and pretend they know your future. This one is honest about its limits.
>
> And if you want to take this to a real financial advisor, hit Print and save it as a PDF."

### Closing (30 seconds)

> "All the tax figures are accurate for 2025 — all 13 provinces and territories. Everything is explained in plain English with a built-in glossary. And it's honest about what it doesn't know.
>
> The only free tool that compares all your Canadian savings options side by side, simulates thousands of possible futures, and explains the results in plain English — while being honest about what it can't predict."

---

## Talking Points (Quick Reference)

- "This isn't just another calculator — it compares 4 strategies side by side and shows the range of outcomes, not just one number"
- "Everything is explained in plain English with a built-in glossary — you don't need a finance background"
- "The AI doesn't just give you a number — it tells you what it figured out AND what only you can decide"
- "It warns you about things other tools ignore, like whether you have an emergency fund"
- "All tax figures are accurate for 2025 across all 13 provinces and territories"
- "You can print the whole report and take it to a real financial advisor"
- "Wealthsimple is actually removing their advisory service in 2026 — this gives you a report you can take to ANY advisor"
- "No jargon anywhere — if a term appears, it's in the glossary with a plain-English explanation"
- "We simulate 1,000 possible futures per strategy instead of pretending we know exactly what will happen"
- "The Decision Gate concept is genuinely novel — no other financial tool admits what it doesn't know"

---

## What We DON'T Do (And Why That's Honest)

- We don't include CPP/EI deductions, OAS clawbacks, pension income splitting, or inflation — and we say so
- We don't pretend to be financial advice — there's a disclaimer on every results page
- We don't hide behind "average returns" — we show the full range of uncertainty
- We don't claim the AI knows your life — it explicitly says what only you can decide
