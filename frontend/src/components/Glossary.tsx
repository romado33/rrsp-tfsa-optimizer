import { useState } from 'react';

const GLOSSARY_ENTRIES = [
  {
    term: 'RRSP (Registered Retirement Savings Plan)',
    definition:
      'A government-approved savings account where the money you put in lowers your taxes this year. ' +
      'Your savings grow without being taxed along the way, but you pay tax when you take the money out ' +
      '(usually in retirement, when your income is lower).',
  },
  {
    term: 'TFSA (Tax-Free Savings Account)',
    definition:
      'A savings account where your money grows completely tax-free. You don\u2019t get a tax break ' +
      'when you put money in, but you never pay tax on what it earns \u2014 and you can withdraw anytime ' +
      'without penalty or tax.',
  },
  {
    term: 'FHSA (First Home Savings Account)',
    definition:
      'A special account only for people who have never owned a home. You get a tax break when you ' +
      'put money in (like an RRSP), AND you pay zero tax when you take it out to buy your first home ' +
      '(like a TFSA). It\u2019s the best of both worlds \u2014 but only for your first home purchase.',
  },
  {
    term: 'Contribution Room',
    definition:
      'The maximum amount you\u2019re allowed to put into an account (RRSP, TFSA, or FHSA) this year. ' +
      'If you don\u2019t use all your room, most of it carries forward to next year. You can check your ' +
      'exact numbers by logging into CRA My Account at canada.ca.',
  },
  {
    term: 'CRA My Account',
    definition:
      'A free online service from the Canada Revenue Agency where you can see your tax info, including ' +
      'your RRSP and TFSA contribution room, past tax returns, and benefit payments. ' +
      'Sign up or log in at my.cra-arc.gc.ca. You\u2019ll need a CRA user ID or a bank login to get in.',
  },
  {
    term: 'Tax on Next $1 Earned (Marginal Tax Rate)',
    definition:
      'The tax rate that applies to the very next dollar you earn. Because Canada uses a progressive ' +
      'tax system, not all your income is taxed at the same rate \u2014 only the money in each "bracket" ' +
      'is taxed at that bracket\u2019s rate. This number tells you how much of each extra dollar goes to tax.',
  },
  {
    term: 'Overall Tax Rate (Effective Tax Rate)',
    definition:
      'The average rate you actually pay across ALL your income. It\u2019s always lower than your ' +
      '"Tax on Next $1" rate because your first dollars of income are taxed at lower rates. ' +
      'This is a better measure of your true tax burden.',
  },
  {
    term: 'Take-Home Pay',
    definition:
      'What\u2019s left of your income after federal and provincial taxes. This is the money you ' +
      'actually have available to spend, save, or invest. (Note: this doesn\u2019t include CPP or EI ' +
      'deductions, which reduce your take-home by another ~$4,000/year for most workers.)',
  },
  {
    term: 'CPP and EI',
    definition:
      'Canada Pension Plan (CPP) and Employment Insurance (EI) are mandatory deductions from your ' +
      'paycheque. CPP goes toward your government retirement pension; EI is insurance in case you ' +
      'lose your job. Together they take about $4,000\u2013$5,000/year off your pay. These are NOT ' +
      'included in our calculations.',
  },
  {
    term: 'Tax Bracket',
    definition:
      'A range of income that\u2019s taxed at a specific rate. For example, in 2025 the first $57,375 ' +
      'you earn is taxed at 14.5% federally. If you earn $60,000, only the amount above $57,375 is ' +
      'taxed at the next rate (20.5%) \u2014 you don\u2019t suddenly pay more on ALL your income.',
  },
  {
    term: 'Basic Personal Amount',
    definition:
      'The amount of income every Canadian can earn tax-free each year. For 2025, this is $16,129 ' +
      'federally. Each province also has its own amount. You don\u2019t need to do anything to claim it ' +
      '\u2014 it\u2019s automatically applied.',
  },
  {
    term: 'Stocks',
    definition:
      'When you buy a stock, you\u2019re buying a tiny piece of a company. If the company does well, ' +
      'your stock goes up in value. If it does poorly, it goes down. Over long periods (10+ years), ' +
      'stocks have historically grown around 7\u201310% per year on average, but they can drop 20\u201340% ' +
      'in a bad year. Higher risk, higher potential reward.',
  },
  {
    term: 'Bonds',
    definition:
      'When you buy a bond, you\u2019re lending money to a government or company. They pay you ' +
      'interest and give your money back on a set date. Bonds are generally safer than stocks ' +
      'but grow more slowly \u2014 typically 2\u20135% per year. They help cushion your savings ' +
      'when the stock market drops.',
  },
  {
    term: 'Non-Registered (Regular) Account',
    definition:
      'A regular investment account with no special tax benefits. You can put in as much as you want ' +
      'and take money out anytime, but you pay tax on your gains each year. People use these when ' +
      'they\u2019ve maxed out their RRSP and TFSA room, or need easy access to their money.',
  },
  {
    term: 'Risk Level (Conservative / Balanced / Growth / Aggressive)',
    definition:
      'How your money is split between safer investments (bonds) and riskier ones (stocks). ' +
      'Conservative means more bonds \u2014 steadier but slower growth. Aggressive means all stocks ' +
      '\u2014 bigger potential gains but also bigger drops in bad years. Most people are somewhere in between.',
  },
  {
    term: 'Most Likely Outcome',
    definition:
      'The middle result from 1,000 simulated futures. Half the simulations did better, half did worse. ' +
      'It\u2019s a more honest estimate than just using an "average return" because it accounts for the ' +
      'ups and downs of real markets.',
  },
  {
    term: 'Outcome Range',
    definition:
      'The spread between the worst-case and best-case results from our simulations. The low end ' +
      'represents what happens in a bad market (only 10% of simulations did worse), and the high end ' +
      'represents a good market (only 10% did better). Your actual result will most likely fall ' +
      'somewhere in between.',
  },
  {
    term: 'Compounding',
    definition:
      'When your investments earn money, and then THAT money earns money too. It\u2019s like a snowball ' +
      'rolling downhill \u2014 the longer it rolls, the faster it grows. This is why starting to save ' +
      'early matters so much: $500/month for 30 years at 7% gives you ~$567,000, but only ~$243,000 ' +
      'over 20 years.',
  },
  {
    term: 'Tax Refund from RRSP',
    definition:
      'When you put money into an RRSP, it reduces your taxable income. The government gives you ' +
      'back the tax you would have paid on that money. For example, if your tax rate is 30% and you ' +
      'contribute $10,000, you get about $3,000 back at tax time.',
  },
  {
    term: 'Time Horizon',
    definition:
      'How many years until you plan to use the money (e.g., for retirement or a home purchase). ' +
      'A longer time horizon means you can generally afford to take more risk, because you have ' +
      'more time to recover from bad years in the market.',
  },
  {
    term: 'Taxable Income',
    definition:
      'The amount of your income that the government actually taxes. It\u2019s your total income ' +
      'minus any deductions (like RRSP contributions). If you earn $80,000 and put $10,000 into ' +
      'your RRSP, your taxable income drops to $70,000 \u2014 which means you pay less tax.',
  },
  {
    term: 'Tax-Deferred',
    definition:
      'When your investments grow without being taxed now, but you\u2019ll pay tax later when you take ' +
      'the money out. RRSPs work this way. The advantage is that your money grows faster because ' +
      'nothing is taken out for tax each year. The idea is that you\u2019ll be in a lower tax bracket ' +
      'when you withdraw in retirement.',
  },
  {
    term: 'Confidence Level (High / Medium / Low)',
    definition:
      'How sure the AI is about its recommendation. "High" means one strategy is clearly better ' +
      'for your situation. "Medium" means the best option depends on things only you know (like ' +
      'future plans). "Low" means the strategies are very close and it really comes down to personal preference.',
  },
];

export default function Glossary() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? GLOSSARY_ENTRIES.filter(
        (e) =>
          e.term.toLowerCase().includes(search.toLowerCase()) ||
          e.definition.toLowerCase().includes(search.toLowerCase()),
      )
    : GLOSSARY_ENTRIES;

  return (
    <div className="glossary-wrapper">
      <button
        className="glossary-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>📖</span>
        <span>{isOpen ? 'Hide' : 'Show'} Glossary — What do these terms mean?</span>
      </button>

      {isOpen && (
        <div className="glossary-panel">
          <input
            className="glossary-search"
            type="text"
            placeholder="Search terms (e.g. RRSP, tax bracket, risk)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="glossary-list">
            {filtered.length === 0 && (
              <div className="glossary-empty">No matching terms found.</div>
            )}
            {filtered.map((entry, i) => (
              <div key={i} className="glossary-entry">
                <div className="glossary-term">{entry.term}</div>
                <div className="glossary-definition">{entry.definition}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
