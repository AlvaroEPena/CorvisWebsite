export interface ProcessStep {
  title: string;
  description: string;
}

export const processSteps: readonly ProcessStep[] = [
  {
    title: 'Listen',
    description:
      'A free consult. We learn what you sell, who buys it and what the current site is costing you.',
  },
  {
    title: 'Agree the plan',
    description:
      'We boil the business down to one clear idea, then send a plain-English proposal you can e-sign.',
  },
  {
    title: 'Design',
    description: 'Real screens, not mood boards. You react to your own content in your own brand.',
  },
  {
    title: 'Build',
    description:
      'Hand-built, tested on real phones, tuned for speed and checked for accessibility.',
  },
  {
    title: 'Launch and grow',
    description:
      'We handle the switch-over, then keep improving with data and, if you want it, a care plan.',
  },
];
