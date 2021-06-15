import { nanoid } from 'nanoid';
import { z } from 'zod';

const date = z.string().or(z.date()).refine((d) => !Number.isNaN(new Date(d).valueOf())).transform((d) => new Date(d)).default(() => new Date());

export const Resource = z.object({
  created: date,
  updated: date,
});
export const Aspect = z.union([
  z.literal('mentoring'),
  z.literal('tutoring'),
]);
export const SocialType = z.union([ 
  z.literal('website'),
  z.literal('linkedin'),
  z.literal('twitter'),
  z.literal('facebook'),
  z.literal('instagram'),
  z.literal('github'),
  z.literal('indiehackers'),
]);
export const Social = z.object({
  type: SocialType,
  url: z.string(),
});
export const Account = Resource.extend({
  id: z.string().default(''),
  name: z.string().default(''),
  photo: z.string().url().default(''),
  email: z.string().email().default(''),
  phone: z.string().regex(/^(\+\d{1,3})\d{10}$/).default(''),
  bio: z.string().default(''),
  background: z.string().url().default(''),
  venue: z.string().url().default(''),
  socials: z.array(Social).default([]),
});
export const OrgSignupConfig = z.object({}).catchall(z.object({
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
export const OrgHomeConfig = z.object({}).catchall(z.object({
  header: z.string(),
  body: z.string(),
}));
export const OrgBookingConfig = z.object({}).catchall(z.object({
  message: z.string(),
}));
export const Org = Account.extend({
  members: z.array(z.string()).default([]),
  aspects: z.array(Aspect).nonempty().default(['tutoring']),
  domains: z.array(z.string()).default([]),
  profiles: z.array(z.string()).default(['name', 'email', 'bio', 'subjects', 'langs', 'availability']),
  subjects: z.array(z.string()).optional(), 
  signup: OrgSignupConfig.default({
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
          'individualized instruction due to COVID-19. We’re making sure ' +
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
  home: OrgHomeConfig.default({
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
  booking: OrgBookingConfig.default({
    en: {
      message:
        'Ex: {{person}} could really use your help with a {{subject}} project.',
    },
  }),
});

export const Timeslot = z.object({
  id: z.string().default(() => nanoid(5)),
  from: date,
  to: date,
  exdates: z.array(date).optional(),
  recur: z.string().regex(/^RRULE:FREQ=(WEEKLY|DAILY);?(INTERVAL=2;?)?(UNTIL=(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?)?$/).optional(),
  last: date.optional(),
});
export const Availability = z.array(Timeslot);

export const Role = z.union([
  z.literal('tutor'),
  z.literal('tutee'),
  z.literal('mentor'),
  z.literal('mentee'),
  z.literal('parent'),
]);
export const Person = z.object({
  id: z.string().default(''), 
  name: z.string().default(''), 
  photo: z.string().url().default(''),
  roles: z.array(Role).default([]), 
});

export const Check = z.union([
  z.literal('email'),
  z.literal('background-check'),
  z.literal('academic-email'),
  z.literal('training'),
  z.literal('interview'),
]);
export const Verification = Resource.extend({
  creator: z.string().default(''),
  org: z.string().default('default'),
  notes: z.string().default(''),
  checks: z.array(Check).default([]),
});

export const UserTag = z.union([
  z.literal('vetted'),
  z.literal('matched'),
  z.literal('meeting'),
  Role,
]);
export const UserHitTag = z.union([
  UserTag,
  z.literal('not-tutor'),
  z.literal('not-tutee'),
  z.literal('not-mentor'),
  z.literal('not-mentee'),
  z.literal('not-parent'),
  z.literal('not-vetted'),
  z.literal('not-matched'),
  z.literal('not-meeting'),
]);
export const USER_TAGS: z.infer<typeof UserTag>[] = [
  'tutor',
  'tutee',
  'mentor',
  'mentee',
  'parent',
  'vetted',
  'matched',
  'meeting',
];
export const Subjects = z.object({ 
  subjects: z.array(z.string()).default([]),
  searches: z.array(z.string()).default([]),
});
export const User = Account.extend({
  age: z.number().optional(),
  orgs: z.array(z.string()).default([]),
  availability: Availability.default([]),
  mentoring: Subjects.default(Subjects.parse({})),
  tutoring: Subjects.default(Subjects.parse({})),
  langs: z.array(z.string()).default(['en']),
  parents: z.array(z.string()).default([]),
  verifications: z.array(Verification).default([]),
  visible: z.boolean().default(false),
  featured: z.array(Aspect).default([]),
  roles: z.array(Role).default([]),
  tags: z.array(UserTag).default([]),
  reference: z.string().default(''),
  timezone: z.string().default('America/Los_Angeles'),
  token: z.string().optional(),
  hash: z.string().optional(),
});

export const MatchTag = z.literal('meeting'); // Match has at least one meeting.
export const MatchHitTag = z.union([MatchTag, z.literal('not-meeting')]);
export const MATCH_TAGS: z.infer<typeof MatchTag>[] = ['meeting'];
export const Match = Resource.extend({
  org: z.string().default('default'),
  subjects: z.array(z.string()).default([]),
  people: z.array(Person).default([]),
  creator: Person.default(Person.parse({})),
  message: z.string().default(''),
  tags: z.array(MatchTag).default([]),
  id: z.string().default(''),
});

export const Venue = Resource.extend({
  id: z.string().default(() => nanoid(10)),
  url: z.string().url().default(() => `https://meet.jit.si/TB-${nanoid(10)}`),
});

export const MeetingTag = z.literal('recurring'); // Meeting is recurring (has rrule).
export const MeetingHitTag = z.union([MeetingTag, z.literal('not-recurring')]);
export const MEETING_TAGS: z.infer<typeof MeetingTag>[] = ['recurring'];
export const MeetingAction = z.union([
  z.literal('all'),
  z.literal('future'),
  z.literal('this'),
]);
export const MeetingStatus = z.union([
  z.literal('created'),
  z.literal('pending'),
  z.literal('logged'),
  z.literal('approved'),
]);
export const Meeting = Resource.extend({
  status: MeetingStatus.default('created'),
  creator: Person.default(Person.parse({})),
  match: Match.default(Match.parse({})),
  venue: Venue.default(Venue.parse({})),
  time: Timeslot.default(Timeslot.parse({})),
  description: z.string().default(''),
  tags: z.array(MeetingTag).default([]),
  parentId: z.string().optional(),
  id: z.string().default(''), 
});

export const Option = z.object({
  label: z.string(),
  value: z.string(),
});
export const Query = z.object({
  search: z.string(),
  hitsPerPage: z.number(),
  page: z.number(),
});
export const MatchesQuery = Query.extend({
  org: z.string().optional(),
  people: z.array(Option),
  subjects: z.array(Option),
});
export const MeetingsQueryInterface = MatchesQuery.extend({
  tags: z.array(MeetingHitTag),
  from: date,
  to: date,
});
export const UsersQuery = Query.extend({
  parents: z.array(z.string()),
  orgs: z.array(z.string()),
  tags: z.array(UserHitTag),
  aspect: Aspect,
  langs: z.array(Option),
  subjects: z.array(Option),
  availability: Availability,
  available: z.boolean().optional(),
  visible: z.boolean().optional(),
});
