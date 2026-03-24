import type { FinancialProfile, TaxSummary, ContributionRooms, Scenario } from '../types';
import { fmtFull } from '../utils/format';

/**
 * Context-aware tips based on the user's specific numbers.
 * Wealthsimple gives generic advice articles — this gives personalized,
 * actionable tips tied to YOUR income, age, and accounts.
 */
export default function SmartTips({
  profile,
  taxSummary,
  contributionRooms,
  scenarios,
}: {
  profile: FinancialProfile;
  taxSummary: TaxSummary;
  contributionRooms: ContributionRooms;
  scenarios: Scenario[];
}) {
  const tips = generateTips(profile, taxSummary, contributionRooms, scenarios);
  if (tips.length === 0) return null;

  return (
    <div className="smart-tips">
      <h3>💡 Personalized Tips for You</h3>
      <div className="tips-list">
        {tips.map((tip, i) => (
          <div key={i} className={`tip-card tip-${tip.type}`}>
            <span className="tip-icon">{tip.icon}</span>
            <div>
              <div className="tip-title">{tip.title}</div>
              <div className="tip-body">{tip.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Tip {
  icon: string;
  title: string;
  body: string;
  type: 'money' | 'warning' | 'info' | 'opportunity';
}

function generateTips(
  profile: FinancialProfile,
  taxSummary: TaxSummary,
  rooms: ContributionRooms,
  scenarios: Scenario[],
): Tip[] {
  const tips: Tip[] = [];
  const annualSavings = profile.monthlySavings * 12;

  if (taxSummary.marginalRate >= 29.65) {
    const rrspScenario = scenarios.find((s) => s.id === 'rrsp_max');
    if (rrspScenario && rrspScenario.rrspTaxSaving > 0) {
      tips.push({
        icon: '💰',
        title: 'Your tax rate makes RRSPs extra valuable',
        body:
          `At your ${taxSummary.marginalRate}% combined tax rate, every $1,000 you put into ` +
          `an RRSP saves you ${fmtFull(Math.round(taxSummary.marginalRate * 10))} in taxes this year. ` +
          `That's free money you can reinvest.`,
        type: 'money',
      });
    }
  } else if (taxSummary.marginalRate < 25) {
    tips.push({
      icon: '💡',
      title: 'TFSA might be your best bet right now',
      body:
        `At your ${taxSummary.marginalRate}% tax rate, the RRSP tax break is relatively small. ` +
        `A TFSA lets your money grow completely tax-free, and you can take it out anytime — ` +
        `no tax, no penalty, no questions asked.`,
      type: 'info',
    });
  }

  if (profile.isFirstTimeBuyer && profile.primaryGoal === 'buy_home' && rooms.fhsaEligible) {
    tips.push({
      icon: '🏠',
      title: 'The FHSA is made for you',
      body:
        `As a first-time buyer saving for a home, the FHSA gives you a tax break when you ` +
        `put money in AND zero tax when you take it out for your home. No other account does both. ` +
        `Max it out ($8,000/year) before anything else.`,
      type: 'opportunity',
    });
  }

  if (annualSavings > rooms.rrsp + rooms.tfsa + (rooms.fhsaEligible ? 8000 : 0)) {
    tips.push({
      icon: '📈',
      title: 'You save more than your registered room',
      body:
        `Your $${(profile.monthlySavings).toLocaleString()}/month in savings exceeds your available RRSP + TFSA ` +
        `room. The overflow will go into a regular (non-registered) account. That's not bad — ` +
        `it just means you'll pay some tax on the gains each year.`,
      type: 'info',
    });
  }

  const monthsOfExpenses = 3;
  const estimatedMonthlyExpenses = Math.round((taxSummary.afterTaxIncome - annualSavings) / 12);
  const emergencyTarget = estimatedMonthlyExpenses * monthsOfExpenses;
  const liquidSavings = profile.tfsaBalance + profile.nonRegisteredBalance;

  if (liquidSavings < emergencyTarget && estimatedMonthlyExpenses > 0) {
    tips.push({
      icon: '🛡️',
      title: 'Consider building an emergency fund first',
      body:
        `Financial experts recommend having 3 months of expenses (about ` +
        `${fmtFull(emergencyTarget)}) in an account you can access quickly. Your TFSA + ` +
        `other investments total ${fmtFull(liquidSavings)}. Consider keeping some savings liquid ` +
        `before locking them away in an RRSP.`,
      type: 'warning',
    });
  }

  if (profile.age < 30 && profile.timeHorizon >= 25) {
    tips.push({
      icon: '⏰',
      title: 'Time is your biggest advantage',
      body:
        `Starting to invest in your ${profile.age < 25 ? 'early' : 'late'} twenties means ` +
        `your money has ${profile.timeHorizon} years to grow. Even small amounts now can ` +
        `become large sums thanks to compounding — your gains start earning their own gains.`,
      type: 'info',
    });
  } else if (profile.age >= 50 && profile.timeHorizon <= 15) {
    tips.push({
      icon: '🎯',
      title: 'Focus on protecting what you have',
      body:
        `With ${profile.timeHorizon} years until your goal, you have less time to recover ` +
        `from a market downturn. Consider whether a more conservative mix might let you sleep ` +
        `better at night, even if the projected returns are a bit lower.`,
      type: 'info',
    });
  }

  if (rooms.rdspEnabled && rooms.rdspGrant > 0) {
    const govMoney = rooms.rdspGrant + rooms.rdspBond;
    tips.push({
      icon: '♿',
      title: `Government will add ${fmtFull(govMoney)}/year to your RDSP`,
      body:
        rooms.rdspBond > 0
          ? `By contributing just ${fmtFull(rooms.rdsp)}/year, you unlock ${fmtFull(rooms.rdspGrant)} in matching grants. ` +
            `Plus, you qualify for a ${fmtFull(rooms.rdspBond)} bond — no contribution needed. ` +
            `That's ${fmtFull(govMoney)} in free government money every year.`
          : `By contributing just ${fmtFull(rooms.rdsp)}/year, you unlock ${fmtFull(rooms.rdspGrant)} in government matching grants. ` +
            `That's a ${Math.round((rooms.rdspGrant / rooms.rdsp) * 100)}% return before your money even starts growing.`,
      type: 'money',
    });
  }

  if (profile.rrspRoom > 20000) {
    tips.push({
      icon: '📋',
      title: `You have ${fmtFull(profile.rrspRoom)} in unused RRSP room`,
      body:
        `Unused RRSP room carries forward forever, so there's no rush. But if you get a bonus ` +
        `or windfall, you can make a lump-sum RRSP contribution and claim a big tax refund. ` +
        `It doesn't have to be monthly — a one-time deposit works too.`,
      type: 'opportunity',
    });
  }

  return tips;
}
