export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  placeholder: true;
}

export const testimonials: readonly Testimonial[] = [
  {
    quote:
      'They asked better questions in one call than our last agency did in a month. The new site says exactly what we do.',
    name: 'Marisol Okafor',
    role: 'Owner',
    company: 'Alder & Finch Landscaping',
    placeholder: true,
  },
  {
    quote: 'Fast, clear and calm to work with. We went from a site we hid to one we lead with.',
    name: 'Tobias Lindqvist',
    role: 'Clinic director',
    company: 'Kestrel Physio',
    placeholder: true,
  },
  {
    quote: 'Pricing was plain, the timeline held, and the page loads before you can blink.',
    name: 'Priya Venkataraman',
    role: 'Founder',
    company: 'Marlowe Coffee Roasters',
    placeholder: true,
  },
];
