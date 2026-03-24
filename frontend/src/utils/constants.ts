import type { FinancialProfile } from '../types';

export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const PROGRESS_STEPS = [
  { label: 'Figuring out how much room you have in each account...' },
  { label: 'Simulating 1,000 possible futures for each strategy...' },
  { label: 'Calculating your taxes for your province...' },
  { label: 'Building 4 different savings strategies...' },
  { label: 'Asking AI to explain your options in plain English...' },
  { label: 'Putting together your recommendation...' },
];

export const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Québec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

export const RISK_OPTIONS = [
  { value: 'conservative', label: 'Play it safe (40/60)', description: 'Smaller ups and downs, steadier growth' },
  { value: 'balanced', label: 'Middle of the road (60/40)', description: 'Some ups and downs, solid growth over time' },
  { value: 'growth', label: 'Go for growth (80/20)', description: 'Bigger ups and downs, more potential over time' },
  { value: 'aggressive', label: 'All-in on stocks (100/0)', description: 'Biggest swings, highest long-term potential' },
];

export const GOAL_OPTIONS = [
  { value: 'retire', label: 'Retire comfortably', icon: '🌅' },
  { value: 'buy_home', label: 'Buy my first home', icon: '🏡' },
  { value: 'fire', label: 'Retire early', icon: '🔥' },
  { value: 'wealth', label: 'Grow my savings', icon: '📊' },
];

export const DEFAULT_PROFILE: FinancialProfile = {
  age: 32,
  province: 'ON',
  annualIncome: 90000,
  rrspBalance: 18000,
  rrspRoom: 8000,
  tfsaBalance: 15000,
  tfsaRoom: 7000,
  fhsaBalance: 0,
  nonRegisteredBalance: 5000,
  monthlySavings: 2500,
  riskTolerance: 'balanced',
  primaryGoal: 'buy_home',
  timeHorizon: 10,
  isFirstTimeBuyer: true,
  rdspEnabled: false,
  rdspBalance: 0,
  rdspFamilyIncome: 0,
};
