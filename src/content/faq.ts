export interface FaqEntry {
  question: string;
  answer: string;
}

/** Single source for the visible FAQ and the FAQPage JSON-LD. Plain text answers only. */
export const faq: readonly FaqEntry[] = [
  {
    question: 'How fast can my site be live?',
    answer:
      'The Launchpad Foundation goes live 14 days from kickoff, once your content and approvals are in. The Market Leader has more pages, so we confirm its timeline at kickoff.',
  },
  {
    question: 'What does it cost?',
    answer:
      'The Launchpad Foundation starts at 3,800 and The Market Leader at 4,940. Our Fully Managed Digital Infrastructure is 274 a month and brings both packages together with hosting, security and backups. Prices are in US dollars, and your quote is fixed after the free consult.',
  },
  {
    question: 'Who writes the content?',
    answer:
      'We do. Professional, industry-specific copywriting is included in every build. You review and approve it.',
  },
  {
    question: 'What is Fully Managed Digital Infrastructure?',
    answer:
      'It is the care plan that keeps your site running: premium global hosting, proactive security and versioned backups with one-click rollback. It combines everything in both packages with that ongoing care, billed at 274 a month, so you never manage a server.',
  },
  {
    question: 'Will my site rank first on Google?',
    answer:
      'No one can honestly promise rankings. The Market Leader gives you up to 10 service and location pages, each written so people searching for exactly that can find and understand you, and we measure what brings you leads.',
  },
  {
    question: 'Will I own the website?',
    answer:
      'Your site is built, hosted and looked after as part of your monthly plan, so it stays live and cared for while you subscribe. Your words, photos and logo are always yours. If you want to take the whole website with you, you can buy it out, and the minimum term and buy-out price are written in plain English in your proposal.',
  },
  {
    question: 'How will I know when someone contacts me?',
    answer:
      'Both packages include instant email lead alerts: your contact form emails you the moment someone writes, and the Market Leader adds smart forms on every service and location page.',
  },
  {
    question: 'What do you need from me to start?',
    answer:
      'A short chat, your logo and photos if you have them, and a quick approval on the words and design. We handle the rest and tell you exactly what we need, when.',
  },
];
