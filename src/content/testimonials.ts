export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  /** Shown as "Sample feedback" until real client quotes exist. */
  placeholder: true;
}

export const testimonials: readonly Testimonial[] = [
  {
    quote:
      'I did not write a single word and the site still sounds exactly like how I talk to customers. It was live before I expected it.',
    name: 'Dana Whitfield',
    role: 'Owner',
    company: 'Sample Roofing Co.',
    placeholder: true,
  },
  {
    quote: 'Calm, clear and fast. Hosting and backups are simply handled, which is all I wanted.',
    name: 'Marcus Delacroix',
    role: 'Director',
    company: 'Sample Dental Group',
    placeholder: true,
  },
];
