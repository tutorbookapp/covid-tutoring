import { z } from 'zod';

import { Account } from 'lib/model/account';
import { Aspect } from 'lib/model/aspect';

const SignupConfig = z.object({}).catchall(z.object({
  mentoring: z.object({
    header: z.string(),
    body: z.string(),
    bio: z.string(),
  }),
  tutoring: z.object({
    header: z.string(),
    body: z.string(),
    bio: z.string(),
  }),
}));
const HomeConfig = z.object({}).catchall(z.object({
  header: z.string(),
  body: z.string(),
}));
const BookingConfig = z.object({}).catchall(z.object({
  message: z.string(),
}));

/**
 * An `Org` object represents a non-profit organization that is using Tutorbook
 * to manage their virtual tutoring programs.
 * @typedef {Object} Org
 * @property members - An array of user UIDs that are members of this org.
 * @property aspects - The supported aspects of a given org (i.e. are they more
 * focused on `tutoring` or `mentoring`). The first one listed is the default.
 * @property domains - Array of valid email domains that can access this org's
 * data (e.g. `pausd.us` and `pausd.org`).
 * @property profiles - Array of required profile fields (e.g. `phone`).
 * @property signup - Configuration for the org's unique custom sign-up page.
 * @property home - Configuration for the org's unique custom landing homepage.
 * @property booking - Configuration for the org's user booking pages.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/138}
 */
export const Org = Account.extend({
  members: z.array(z.string()).default([]),
  aspects: z.array(Aspect).nonempty().default(['tutoring']),
  domains: z.array(z.string()).default([]),
  profiles: z.array(z.string()).default(['name', 'email', 'bio', 'subjects', 'langs', 'availability']),
  subjects: z.array(z.string()).optional(), 
  signup: SignupConfig.default({
    en: {
      mentoring: {
        header: 'Guide the next generation',
        body:
          'Help us redefine mentorship. We’re connecting high performing and ' +
          'underserved 9-12 students with experts (like you) to collaborate ' +
          'on meaningful projects that you’re both passionate about. ' +
          'Complete the form below to create your profile and sign-up as a ' +
          'mentor.',
        bio:
          'Ex: Founder of "The Church Co", Drummer, IndieHacker.  I’m ' +
          'currently working on "The Church Co" ($30k MRR) where we create ' +
          'high quality, low cost websites for churches and nonprofits. I’d ' +
          'love to have a student shadow my work and help build some church ' +
          'websites.',
      },
      tutoring: {
        header: 'Support students throughout COVID',
        body:
          'Help us support the millions of K-12 students who no longer have ' +
          "individualized instruction due to COVID-19. We're making sure " +
          'that no one loses out on education in these difficult times by ' +
          'connecting students with free, volunteer tutors like you.',
        bio:
          'Ex: I’m currently an electrical engineering Ph.D. student at ' +
          'Stanford University who has been volunteering with AmeriCorps ' +
          '(tutoring local high schoolers) for over five years now. I’m ' +
          'passionate about teaching and would love to help you in any way ' +
          'that I can!',
      },
    },
 
  }),
  home: HomeConfig.default({
    en: {
      header: 'How it works',
      body:
        'First, new volunteers register using the sign-up form linked to the ' +
        'right. Organization admins then vet those volunteers (to ensure ' +
        'they are who they say they are) before adding them to the search ' +
        'view for students to find. Finally, students and parents use the ' +
        'search view (linked to the right) to find and request those ' +
        'volunteers. Recurring meetings (e.g. on Zoom or Google Meet) are ' +
        'then set up via email.',
    },
  }),
  booking: BookingConfig.default({
    en: {
      message:
        'Ex: {{person}} could really use your help with a {{subject}} project.',
    },
  }),
});
export type Org = z.infer<typeof Org>;
export type OrgJSON = z.input<typeof Org>;
