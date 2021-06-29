import { useCallback } from 'react';

import { accountToSegment } from 'lib/model/account';
import { useOrg } from 'lib/context/org';

const queue: Record<string, ReturnType<typeof setTimeout>> = {};

type Track = (event: string, props?: unknown, throttle?: number) => void;

export default function useTrack(): Track {
  const { org } = useOrg();

  const track = useCallback(
    (event: string, props?: unknown, throttle = 1000) => {
      if (queue[event]) clearTimeout(queue[event]);
      queue[event] = setTimeout(() => {
        // The `orgId` prop is required to connect events with Mixpanel groups.
        // @see {@link https://bit.ly/36YrRsT}
        const properties = {
          ...(props as object),
          org: org ? accountToSegment(org) : undefined,
          orgId: org?.id,
        };
        window.analytics?.track(event, properties);
      }, throttle);
    },
    [org]
  );

  return track;
}
