import type { Era, Person } from './portrait.types';

export const eras: Era[] = [
  { id: '1900', label: '1900 - 1929' },
  { id: '1930', label: '1930 - 1959' },
  { id: '1960', label: '1960 - 1989' },
  { id: '1990', label: '1990 - Present' },
];

export const people: Person[] = [
  {
    id: '1',
    name: 'Jesse Livermore',
    era: '1900',
    eraLabel: '1920s',
    description: 'Known as the "Boy Plunger", Livermore is famous for making and losing multi-million dollar fortunes and shorting the 1929 market crash.',
    tags: ['Speculator', 'Market Logic', 'Day Trading']
  },
  {
    id: '2',
    name: 'Richard Wyckoff',
    era: '1900',
    eraLabel: '1910s',
    description: 'A stock market authority, founder of Magazine of Wall Street, and developer of the Wyckoff Method of technical analysis.',
    tags: ['Technical Analysis', 'Volume', 'Price Action']
  },
  {
    id: '3',
    name: 'Benjamin Graham',
    era: '1930',
    eraLabel: '1930s',
    description: 'The father of value investing. Mentor to Warren Buffett. Author of "The Intelligent Investor" and "Security Analysis".',
    tags: ['Value Investing', 'Fundamentals', 'Long-term']
  },
   {
    id: '4',
    name: 'George Soros',
    era: '1990',
    eraLabel: '1990s',
    description: 'Known as "The Man Who Broke the Bank of England". Famous for his quantum fund and reflexivity theory.',
    tags: ['Hedge Fund', 'Macro', 'Reflexivity']
  },
  {
    id: '5',
    name: 'Paul Tudor Jones',
    era: '1960', // Correct era based on fame start around 1980s but let's put it in 1960-1989 bucket
    eraLabel: '1980s',
    description: 'Founder of Tudor Investment Corporation. Famous for predicting the 1987 crash and his macro trading style.',
    tags: ['Macro', 'Futures', 'Risk Management']
  },
    {
    id: '6',
    name: 'Ray Dalio',
    era: '1990', // Bridgewater founded earlier, but fame peaked later
    eraLabel: '2000s',
    description: 'Founder of Bridgewater Associates, the world\'s largest hedge fund. Creator of the "All Weather" portfolio strategy.',
    tags: ['Principles', 'Bridgewater', 'Systematic']
  }
];