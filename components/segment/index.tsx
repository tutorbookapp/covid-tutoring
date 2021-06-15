import { useEffect, useRef } from 'react';
import { SegmentAnalytics } from '@segment/analytics.js-core';
import { dequal } from 'dequal/lite';

import Intercom from 'lib/intercom';
import { accountToSegment } from 'lib/model/account';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

declare global {
  interface Window {
    analytics: SegmentAnalytics.AnalyticsJS;
  }
}

export interface SegmentProps {
  intercom?: boolean;
}

export default function Segment({ intercom }: SegmentProps): null {
  const { org } = useOrg();
  const { user } = useUser();

  const prevIdentity = useRef<Record<string, unknown>>();
  useEffect(() => {
    const identity = accountToSegment(user);
    if (dequal(prevIdentity.current, identity)) return;
    if (user.id) window.analytics?.alias(user.id);
    window.analytics?.identify(user.id, identity);
    prevIdentity.current = identity;
  }, [user]);

  useEffect(() => {
    Intercom('update', {
      user_hash: user.hash,
      hide_default_launcher: !intercom,
    });
  }, [user.hash, intercom]);

  const prevGroup = useRef<Record<string, unknown>>();
  useEffect(() => {
    const group = org ? accountToSegment(org) : undefined;
    if (!org || !group || dequal(prevGroup.current, group)) return;
    // The `orgId` prop is required for Segment to create Mixpanel groups.
    // @see {@link https://bit.ly/3kWrJPw}
    window.analytics?.group(org.id, { ...group, orgId: group.id });
    prevGroup.current = group;
  }, [org]);

  return null;
}
