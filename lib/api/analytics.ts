import { Analytics, TagTotals } from 'lib/model';
import { Match, MatchTag } from 'lib/model';
import { Meeting, MeetingTag } from 'lib/model';
import { Role, isRole } from 'lib/model';
import { User, UserTag } from 'lib/model';
import { APIError } from 'lib/api/error';
import { db } from 'lib/api/firebase';

export type Action = 'created' | 'updated' | 'deleted';

async function getMostRecentAnalytics(orgId: string): Promise<Analytics> {
  const snapshot = await db
    .collection('orgs')
    .doc(orgId)
    .collection('analytics')
    .orderBy('date', 'desc')
    .limit(1)
    .get();
  return snapshot.docs[0]
    ? Analytics.fromFirestoreDoc(snapshot.docs[0])
    : new Analytics();
}

function updateTags<T extends UserTag | MatchTag | MeetingTag>(
  key: Role | 'match' | 'meeting',
  action: Action,
  nums: Analytics,
  currentTags: T[],
  originalTags?: T[]
): void {
  // TODO: Get rid of this weird type cast. We should be able to assign to
  // `nums[key][tag]` directly (`nums[key]` should be of type `TagTotals<T>`).
  const totals = (nums[key] as unknown) as TagTotals<string>;

  // If resource was created (or added to org), increment totals.
  if (action === 'created') totals.total += 1;

  // If resource was deleted (or removed from org), decrement totals.
  if (action === 'deleted') totals.total -= 1;
  currentTags.forEach((tag) => {
    if (isRole(tag)) return;

    // If resource was created (or added to org), increment totals.
    if (action === 'created') totals[tag] += 1;

    // If resource was updated and tag was added, increment totals.
    if (action === 'updated' && originalTags && !originalTags.includes(tag))
      totals[tag] += 1;

    // If resource was deleted (or removed from org), decrement totals.
    if (action === 'deleted') totals[tag] -= 1;
  });

  // If resource was updated and tag removed, decrement totals.
  if (action === 'updated' && originalTags)
    originalTags.forEach((tag) => {
      if (!currentTags.includes(tag)) totals[tag] -= 1;
    });

  // If resource was updated, we must know its original tags to properly
  // increment/decrement org analytics totals.
  if (action === 'updated' && !originalTags)
    throw new APIError('Analytics missing original resource data.', 500);
}

async function saveAnalytics(orgId: string, nums: Analytics): Promise<void> {
  const now = new Date();
  if (nums.id && nums.date.valueOf() >= now.valueOf() - 864e5) {
    // If the doc create time is within 24 hours, update it.
    await db
      .collection('orgs')
      .doc(orgId)
      .collection('analytics')
      .doc(nums.id)
      .set(nums.toFirestore());
  } else {
    // Otherwise, create a new analytics doc.
    const ref = db.collection('orgs').doc(orgId).collection('analytics').doc();
    nums.date = now;
    nums.id = ref.id;
    await ref.set(nums.toFirestore());
  }
}

/**
 * Updates our analytics totals.
 * 1. Determines org(s) that resource belongs to.
 * 2. Fetches the most recent analytics doc for those org(s).
 * 3. If the doc create time is within 24 hours, update it. Otherwise, create a
 *    new analytics doc.
 * @see {@link https://github.com/tutorbookapp/tutorbook#analytics}
 */
export default async function analytics<T extends User | Match | Meeting>(
  current: T,
  action: Action,
  original: T = current
): Promise<void> {
  if (current instanceof User && original instanceof User) {
    // If an update removes orgs, we want to decrement those orgs' statistics
    // based on the original's tags.
    const removedFromOrgs = original.orgs.filter(
      (o) => !current.orgs.includes(o)
    );
    const removedPromises = removedFromOrgs.map(async (orgId) => {
      const nums = await getMostRecentAnalytics(orgId);
      original.tags.filter(isRole).forEach((role) => {
        updateTags(role, 'deleted', nums, original.tags);
      });
      await saveAnalytics(orgId, nums);
    });

    // If an update adds orgs, we want to increment those orgs' statistics
    // based on the current tags.
    const addedToOrgs = current.orgs.filter((o) => !original.orgs.includes(o));
    const addedPromises = addedToOrgs.map(async (orgId) => {
      const nums = await getMostRecentAnalytics(orgId);
      current.tags.filter(isRole).forEach((role) => {
        updateTags(role, 'created', nums, current.tags);
      });
      await saveAnalytics(orgId, nums);
    });

    // If an org was already there, we change those org's statistics based on
    // the change between the original and current tags.
    const existingOrgs = current.orgs.filter((o) => original.orgs.includes(o));
    const existingPromises = existingOrgs.map(async (orgId) => {
      const nums = await getMostRecentAnalytics(orgId);
      current.tags.filter(isRole).forEach((role) => {
        updateTags(role, action, nums, current.tags, original.tags);
      });
      await saveAnalytics(orgId, nums);
    });

    await Promise.all([
      ...existingPromises,
      ...removedPromises,
      ...addedPromises,
    ]);
  } else if (current instanceof Match && original instanceof Match) {
    // TODO: Add edge cases when the orgs on a resource changes.
    const nums = await getMostRecentAnalytics(current.org);
    updateTags('match', action, nums, current.tags, original.tags);
    await saveAnalytics(current.org, nums);
  } else if (current instanceof Meeting && original instanceof Meeting) {
    // TODO: Add edge cases when the orgs on a resource changes.
    const nums = await getMostRecentAnalytics(current.match.org);
    updateTags('meeting', action, nums, current.tags, original.tags);
    await saveAnalytics(current.match.org, nums);
  } else {
    throw new APIError('Analytics resource not a user/match/meeting.', 500);
  }
}
