/**
 * Copy for the four service pages (/services/<slug>). Edit the words here. Every claim comes from the
 * packages in pricing.ts and the services in services.ts; there are no ranking promises and no
 * review or rating claims. Prices are not repeated here (they live in pricing.ts and the pricing
 * section) so they cannot drift.
 */
export interface ServiceSection {
  title: string;
  paragraphs: readonly string[];
  /** Optional short list under the paragraphs. */
  list?: readonly string[];
}

export interface ServicePage {
  /** Matches an id in services.ts. */
  serviceId: string;
  /** URL segment: /services/<slug>. */
  slug: string;
  /** Short name used in links and breadcrumbs. */
  name: string;
  /** <title>, under 65 characters. */
  metaTitle: string;
  /** <meta name="description">, 70 to 160 characters. */
  description: string;
  heading: string;
  lead: string;
  sections: readonly ServiceSection[];
  /** Slugs of the other service pages worth reading next. */
  related: readonly string[];
}

export const servicePages: readonly ServicePage[] = [
  {
    serviceId: 'new-build',
    slug: 'web-design',
    name: 'Web design',
    metaTitle: 'Done-for-you web design for local businesses | Corvis',
    description:
      'Corvis designs, writes, builds and launches a fast, branded website for your local business in 14 days, with the copywriting included.',
    heading: 'Web design for local businesses, done for you.',
    lead: 'You run the business. We write the words, design the screens and build the site, and it goes live 14 days after kickoff once your content and approvals are in.',
    sections: [
      {
        title: 'What you get',
        paragraphs: [
          'The Launchpad Foundation is our done-for-you website for a successful local business that customers cannot find online yet. It is fully branded, built around the one idea that makes your business different, and designed to turn a visit into a call, a booking or a message.',
          'Most small businesses are stuck on the same problem: the work is good, the referrals are strong, and the website is missing, dated or confusing. Customers check a business online before they pick up the phone, so a weak site quietly sends them to a competitor. We fix that without asking you to become a writer, a designer or a developer.',
        ],
        list: [
          'Up to 5 pages: Home, About, Services, Gallery and Contact',
          'All the copywriting, up to 400 words per page, with two rounds of edits',
          'A mobile-first build, designed for customers searching on their phones',
          'A contact form that emails you the moment someone writes',
          'A 14-day turnaround from kickoff to live',
        ],
      },
      {
        title: 'Copywriting is included, and it is written for your industry',
        paragraphs: [
          'The slowest part of almost every website project is the words. Owners are asked to write their own copy, nothing gets written, and the launch slips by months. In our process we write it. We learn what you sell, who buys it and where customers look for you today, then write for your kind of business in the language your customers use.',
          'A plumber needs emergency-call wording and clear service areas. A dental practice needs reassurance about comfort and insurance. A planner needs the feeling of the events themselves. You review every page and approve it, and you get two rounds of edits to make it sound like you.',
        ],
      },
      {
        title: 'Fast, because speed is part of the design',
        paragraphs: [
          'Every site is hand-built, tested on real phones and built to score 95 or higher for Lighthouse performance on mobile. That is a target we build to, not a promise about your results. Pages are kept lean and images are sized properly, because a site that loads quickly is easier to use and easier for search engines to read.',
          'The 14 days count from kickoff, once your content and approvals are in. If something we are waiting on from you is late, the clock waits too, and we tell you exactly what we need and when.',
        ],
      },
      {
        title: 'How a project works',
        paragraphs: [
          'You start with a free consult with Aaron, which can be as fast as 15 minutes. We agree a plain-English proposal with a fixed price, then write and design real screens in your brand. Alvaro builds and tests the site, and we launch it. After launch, our Fully Managed Digital Infrastructure plan keeps it hosted, secure and backed up so it never depreciates.',
          'Aaron is your one point of contact from the first call to launch, so you never have to chase anyone.',
        ],
      },
      {
        title: 'Where we work',
        paragraphs: [
          'Corvis is based on the West Coast and builds websites for local businesses across the United States. We have worked with businesses in Seattle, Los Angeles, Salt Lake City, New Orleans, Indianapolis and Chicago. Everything happens over a call and email, so your location is never a problem.',
        ],
      },
    ],
    related: ['local-search', 'managed-hosting', 'website-redesign'],
  },
  {
    serviceId: 'local-search',
    slug: 'local-search',
    name: 'Local search growth',
    metaTitle: 'Local search pages for service businesses | Corvis',
    description:
      'The Market Leader adds up to 10 service and location pages, written for you, so customers searching in your area can find and understand your business.',
    heading: 'Be easy to find for the services you sell, in the places you serve.',
    lead: 'The Market Leader adds up to 10 service and location pages to your site, each written for one service or one town, with a smart form and an instant email alert on every one.',
    sections: [
      {
        title: 'Why separate pages matter',
        paragraphs: [
          'When someone searches for exactly what you do in the place where they live, a single page that tries to cover every service and every town rarely answers the question well. A page about one service in one area does. It tells the visitor, and the search engine, precisely what you offer and where.',
          'That is the idea behind The Market Leader. It includes everything in The Launchpad Foundation, plus up to 10 dedicated service and location pages. We call it information visibility: making sure the right information about your business is on the page where the right customer lands.',
        ],
      },
      {
        title: 'What is included',
        paragraphs: [
          'Each page is written for you, up to 400 words, in the same plain, industry-specific style as the rest of your site. You review and approve every one.',
        ],
        list: [
          'Up to 10 service and location pages, one focus for each',
          'The copywriting for those pages, included',
          'A smart form on every page, each sending an instant email alert',
          'Everything in The Launchpad Foundation: up to 5 core pages, mobile-first, 14-day launch for the core site',
        ],
      },
      {
        title: 'How each page is built',
        paragraphs: [
          'Every service or location page follows the same clear shape so visitors find what they need quickly: a plain headline that names the service and the place, a short explanation of what you do and who it is for, the details that help someone decide, such as what is included, how it works and how to start, and a form to get in touch.',
          'Because each page has one job, the writing stays specific. A page for drain cleaning in one town reads very differently from a page for water heater installation in the next, and that difference is exactly what helps the right customer recognise that you are the business they were looking for.',
        ],
      },
      {
        title: 'Instant email lead alerts, so no inquiry sits unseen',
        paragraphs: [
          'A lead that waits a day for a reply is often a lead lost. Every form on your site emails you the moment someone writes, with their name, contact details and message, so you can answer while they are still interested. Replying to the alert reaches them directly.',
        ],
      },
      {
        title: 'What we do not promise',
        paragraphs: [
          'No one can honestly guarantee a ranking on Google, and we do not. What we do is build clear, fast, well-written pages designed to be found and understood, and measure what brings you leads. The timeline for the extra pages is confirmed at kickoff, because it depends on how many pages you choose and how quickly content is approved.',
        ],
      },
      {
        title: 'Who it suits',
        paragraphs: [
          'The Market Leader is for businesses that serve several areas or sell several distinct services, and want each of them to have its own place on the web: a contractor with a different page for each trade, a clinic with a page for each treatment, or a company serving several nearby towns.',
          'Corvis is based on the West Coast and works with local businesses across the United States, including in Seattle, Los Angeles, Salt Lake City, New Orleans, Indianapolis and Chicago.',
        ],
      },
    ],
    related: ['web-design', 'managed-hosting', 'website-redesign'],
  },
  {
    serviceId: 'care-plan',
    slug: 'managed-hosting',
    name: 'Managed hosting',
    metaTitle: 'Fully managed website hosting and security | Corvis',
    description:
      'Fully Managed Digital Infrastructure: premium global hosting, proactive security and versioned backups with one-click rollback, billed monthly.',
    heading: 'Hosting, security and backups, handled for you.',
    lead: 'Fully Managed Digital Infrastructure keeps your site fast, protected and recoverable, billed monthly, so you never touch a server, a patch or a backup.',
    sections: [
      {
        title: 'A website is not a one-time purchase',
        paragraphs: [
          'A site that is built and then left alone slowly gets slower, less secure and more out of date. Software needs patches, hosting needs watching, and mistakes happen. Most owners do not want a second job managing any of that. We take it on.',
          'Fully Managed Digital Infrastructure combines everything in The Launchpad Foundation and The Market Leader with the ongoing care that keeps the site running well, so your new asset does not lose value over time.',
        ],
      },
      {
        title: 'What is included',
        paragraphs: [],
        list: [
          'Premium global hosting: your site is served from a fast worldwide network, with no server for you to manage',
          'Proactive security: we keep the site patched and protected so threats are dealt with before you notice them',
          'Versioned backups with one-click rollback: every change is saved as a version, so any mistake can be undone quickly',
        ],
      },
      {
        title: 'What proactive security means here',
        paragraphs: [
          'Your pages are built ahead of time and served as ready-made files, so there is no database or login page on the public site for anyone to attack. We keep the tools your site is built with up to date, apply fixes as they are released, and serve everything over a secure HTTPS connection.',
          'If we spot a problem, or a visitor reports one, we handle it. You do not need to watch for warnings or learn what a patch is. The point of the plan is that these things are not your job, and the person who handles them is us.',
        ],
      },
      {
        title: 'How the backups work',
        paragraphs: [
          'Your site lives in a version-controlled repository, so every change to its code and content is recorded and can be restored. The hosting platform also keeps earlier published versions, which lets us roll the live site back to a previous one. If an edit goes wrong, we undo it rather than rebuild it.',
          'Backups cover your website itself. They are not a backup of data held in other services you may use.',
        ],
      },
      {
        title: 'Fast by default',
        paragraphs: [
          'Your pages are built ahead of time and delivered from servers close to your visitors, which is a large part of why we can build to a 95 or higher Lighthouse performance score on mobile. Speed is a target we build to, and it helps real visitors as much as it helps search engines.',
        ],
      },
      {
        title: 'Billing and terms',
        paragraphs: [
          'The plan is billed monthly. Because your site is built, hosted and looked after as part of the plan, it stays live and cared for while you subscribe. Your words, photos and logo are always yours. If you ever want to take the whole website with you, you can buy it out. The minimum term and the buy-out price are written in plain English in your proposal.',
          'Corvis works with local businesses across the United States from the West Coast, so the care plan works the same wherever you are.',
        ],
      },
    ],
    related: ['web-design', 'local-search', 'website-redesign'],
  },
  {
    serviceId: 'redesign',
    slug: 'website-redesign',
    name: 'Website redesign',
    metaTitle: 'Website redesign for local businesses | Corvis',
    description:
      'Already have a tired website? Corvis audits your content and speed, keeps what works, rebuilds the rest and sets up redirects that protect your traffic.',
    heading: 'A redesign that keeps what works.',
    lead: 'If you already have a site that looks tired, we keep what is working, rebuild the rest around your core idea, and make sure the traffic you already have is protected.',
    sections: [
      {
        title: 'Start with what you already have',
        paragraphs: [
          'A redesign is not a reason to throw everything away. Your current site may already hold pages people find, wording that works and links from other places. Before we design anything, we run a content and speed audit: what is worth keeping, what is slowing the site down, and what is missing for a customer deciding whether to call.',
          'That audit shapes the project. We keep the useful parts, rewrite what is weak, and rebuild the structure so the site is faster, clearer and easier to use on a phone. You see the findings in plain English before any design starts, so you know why each change is being made and can say no to any of them.',
        ],
      },
      {
        title: 'What is included',
        paragraphs: [],
        list: [
          'A content and speed audit of your current site',
          'A fresh design in your brand, built mobile-first',
          'Rewritten copy for the pages that need it, written for your industry',
          'Redirects that protect your traffic, so old links and bookmarks still land in the right place',
          'A contact form that emails you the moment someone writes',
        ],
      },
      {
        title: 'What usually stays and what usually changes',
        paragraphs: [
          'What usually stays: your name and brand, the photos that show your real work, the wording your customers already respond to, and the pages that already bring visitors. These are assets, and a good redesign builds on them.',
          'What usually changes: the structure and layout so the site works properly on a phone, the loading speed, the calls to action so it is obvious how to book or get in touch, and any wording that is out of date, vague or written for the business you used to be.',
        ],
      },
      {
        title: 'Redirects, explained',
        paragraphs: [
          'When pages move or change address, anyone following an old link, from a search result, a directory or an old email, can land on an error page. A redirect sends them to the matching new page instead. Setting these up carefully is one of the quiet things that keeps a redesign from losing the visitors you already earn.',
        ],
      },
      {
        title: 'See a redesign before you hire us',
        paragraphs: [
          'The home page has a before-and-after slider and our sandbox lets you test drive both an older site and its rebuild, at desktop, tablet and phone widths. It is a sample project with the details changed, so you can see how a redesign changes the experience without it being a real client.',
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'You start with a free consult with Aaron. We agree a plain-English proposal with a fixed price once we understand the size of the job, because a redesign depends on how many pages you have and how much needs rewriting. Alvaro builds and tests the site, and after launch the Fully Managed Digital Infrastructure plan looks after hosting, security and backups.',
          'We are based on the West Coast and work with local businesses across the United States, including in Seattle, Los Angeles, Salt Lake City, New Orleans, Indianapolis and Chicago.',
        ],
      },
    ],
    related: ['web-design', 'local-search', 'managed-hosting'],
  },
];

export const getServicePage = (slug: string): ServicePage | undefined =>
  servicePages.find((page) => page.slug === slug);
