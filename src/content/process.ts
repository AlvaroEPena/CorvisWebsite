export interface ProcessStep {
  title: string;
  description: string;
}

export const processSteps: readonly ProcessStep[] = [
  {
    title: 'Listen',
    description:
      'A free consult with Aaron. We learn what you sell, who buys it and where customers look for you today.',
  },
  {
    title: 'Agree the plan',
    description:
      'We boil the business down to one clear idea, then send a plain-English proposal with a fixed price.',
  },
  {
    title: 'Write and design',
    description:
      'We write the copy and design real screens in your brand. You review and approve, nothing more.',
  },
  {
    title: 'Build and launch',
    description:
      'Hand-built, tested on real phones and live 14 days from kickoff, once your content and approvals are in.',
  },
  {
    title: 'Manage and grow',
    description:
      'Hosting, security and backups run in the background while we keep improving what brings you leads.',
  },
];
