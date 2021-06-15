import { z } from 'zod';

import { Aspect } from 'lib/model/aspect';
import { Availability } from 'lib/model/availability';
import { Option, Query } from 'lib/model/query/base';
import { UserHitTag } from 'lib/model/user';

/**
 * All the supported filters for the search view.
 * @extends {QueryInterface}
 * @property parents - Parents that the user has to have.
 * @property orgs - Orgs that the user has to belong to.
 * @property tags - Algolia search index tags the user must have.
 * @property aspect - Whether to filter by mentoring or tutoring subjects.
 * @property langs - The languages that the user can speak.
 * @property subjects - Subjects that the user can tutor or mentor.
 * @property availability - When the user is available.
 * @property [available] - When true, we only show results that are available.
 * We have to use this in order to only show results that are available in the
 * search view (for students) but to show all results in the users dashboard.
 * @property [visible] - Regular users can only ever see users where this is
 * `true`. Organization admins, however, can see all their users (regardless of
 * their visibility) which is why this property exists.
 */
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
