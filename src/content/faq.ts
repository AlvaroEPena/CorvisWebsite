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
      'The Launchpad Foundation starts at $4,500 and The Market Leader at $6,800. Every build also includes our Fully Managed Digital Infrastructure at $149 per month. Your quote is fixed after the free consult.',
  },
  {
    question: 'Who writes the content?',
    answer:
      'We do. Professional, industry-specific copywriting is included in every build. You review and approve it.',
  },
  {
    question: 'What is Fully Managed Digital Infrastructure?',
    answer:
      'It is the care plan that keeps your site running: premium global hosting, proactive security and versioned backups with one-click rollback. It is required with both packages and billed at $149 a month, so you never manage a server.',
  },
  {
    question: 'Will my site rank first on Google?',
    answer:
      'No one can honestly promise rankings. The Market Leader gives you up to 10 dedicated service and location pages built to capture local search traffic, and we measure what brings you leads.',
  },
  {
    question: 'Will I own the website?',
    answer:
      'Yes. The design and content are yours once the project is paid, and we hand over everything if you ever want to move.',
  },
  {
    question: 'How will I know when someone contacts me?',
    answer:
      'The Market Leader includes lead-capture forms with spam protection and instant email alerts, so every inquiry reaches your inbox the moment it is sent.',
  },
  {
    question: 'What do you need from me to start?',
    answer:
      'A short chat, your logo and photos if you have them, and a quick approval on the words and design. We handle the rest and tell you exactly what we need, when.',
  },
];
