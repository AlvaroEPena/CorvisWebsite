export interface FaqEntry {
  question: string;
  answer: string;
}

/** Single source for the visible FAQ and the FAQPage JSON-LD. Plain text answers only. */
export const faq: readonly FaqEntry[] = [
  {
    question: 'How long does a project take?',
    answer:
      'Most landing pages are ready in a couple of weeks, and full redesigns usually take between four and eight, depending on how fast content and feedback come back. We confirm a timeline after the free consult.',
  },
  {
    question: 'How much does a website cost?',
    answer:
      'Packages start at the prices shown above, and every quote is fixed after we agree the scope. There are no surprise hourly bills.',
  },
  {
    question: 'Will I own the website?',
    answer:
      'Yes. The design, code and content are yours when the project is paid. There is no lock-in and you can host it anywhere.',
  },
  {
    question: 'Can you redesign without hurting my Google rankings?',
    answer:
      'That is part of the job. We audit what ranks today, keep the pages and wording that earn traffic and set up redirects for anything that moves.',
  },
  {
    question: 'Can I edit the site myself?',
    answer:
      'If you want to, yes. We can connect a simple editor for text and images, or you can send changes to us under a care plan.',
  },
  {
    question: 'What happens after launch?',
    answer:
      'You get a support window with every package. After that, the Care & Growth plan covers hosting, updates and monthly improvements, or you can stop and keep everything.',
  },
  {
    question: 'Do you work with an existing brand?',
    answer:
      'Yes. We build around your logo, colors and voice. If you have none yet, we can shape a simple visual direction as part of the project.',
  },
  {
    question: 'What do you need from me to start?',
    answer:
      'A short chat, your current site if you have one, and anything that shows how you want to be seen. We handle the rest and tell you exactly what we need, when.',
  },
];
