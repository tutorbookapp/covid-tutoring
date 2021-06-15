import { z } from 'zod';

export const Resource = z.object({
  created: z.date(),
  updated: z.date(),
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
  id: z.string(),
  name: z.string(),
  photo: z.string().url(),
  email: z.string().email(),
  phone: z.string().regex(/^(\+\d{1,3})\d{10}$/),
  bio: z.string(),
  background: z.string().url(),
  venue: z.string().url(),
  socials: z.array(Social),
});
export const OrgSignupConfig = z.object({}).catchall(z.object({
  header: z.string(),
  body: z.string(),
  bio: z.string(),
}));
export const OrgHomeConfig = z.object({}).catchall(z.object({
  header: z.string(),
  body: z.string(),
}));
export const OrgBookingConfig = z.object({}).catchall(z.object({
  message: z.string(),
}));
export const Org = Account.extend({
  members: z.array(z.string()).nonempty(),
  aspects: z.array(Aspect).nonempty(),
  domains: z.array(z.string()),
  profiles: z.array(z.string()),
  subjects: z.array(z.string()).optional(), 
  signup: OrgSignupConfig,
  home: OrgHomeConfig,
  booking: OrgBookingConfig,
});

export const Timeslot = z.object({
  id: z.string(),
  from: z.date(),
  to: z.date(),
  exdates: z.array(z.date()).optional(),
  recur: z.string().optional(),
  last: z.date().optional(),
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
  id: z.string(), 
  name: z.string().optional(), 
  photo: z.string().url().optional(),
  roles: z.array(Role), 
});

export const Check = z.union([
  z.literal('email'),
  z.literal('background-check'),
  z.literal('academic-email'),
  z.literal('training'),
  z.literal('interview'),
]);
export const Verification = Resource.extend({
  creator: z.string(),
  org: z.string(),
  notes: z.string(),
  checks: z.array(Check),
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
  subjects: z.array(z.string()),
  searches: z.array(z.string()),
});
export const User = Account.extend({
  age: z.number().optional(),
  orgs: z.array(z.string()),
  availability: Availability,
  mentoring: Subjects,
  tutoring: Subjects,
  langs: z.array(z.string()),
  parents: z.array(z.string()),
  verifications: z.array(Verification),
  visible: z.boolean(),
  featured: z.array(Aspect),
  roles: z.array(Role),
  tags: z.array(UserTag),
  reference: z.string(),
  timezone: z.string(),
  token: z.string().optional(),
  hash: z.string().optional(),
});

export const MatchTag = z.literal('meeting'); // Match has at least one meeting.
export const MatchHitTag = z.union([MatchTag, z.literal('not-meeting')]);
export const MATCH_TAGS: z.infer<typeof MatchTag>[] = ['meeting'];
export const Match = Resource.extend({
  org: z.string(),
  subjects: z.array(z.string()),
  people: z.array(Person),
  creator: Person,
  message: z.string(),
  tags: z.array(MatchTag),
  id: z.string(),
});

export const Venue = Resource.extend({
  id: z.string(),
  url: z.string().url(),
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
  status: MeetingStatus,
  creator: Person,
  match: Match,
  venue: Venue,
  time: Timeslot,
  description: z.string(),
  tags: z.array(MeetingTag),
  parentId: z.string().optional(),
  id: z.string(), 
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
  from: z.date(),
  to: z.date(),
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
