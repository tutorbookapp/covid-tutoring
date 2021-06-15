import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import Analytics from 'analytics-node';
import { renderToStaticMarkup } from 'react-dom/server';

import { User } from 'lib/model/user';
import send from 'lib/mail/send';
import supabase from 'lib/api/supabase';

import QuaranTunesTemplate from './template';

export default async function quarantunes(req: Req, res: Res): Promise<void> {
  const { data } = await supabase.from('relation_orgs').select('user:(*)').eq('org', 'quarantunes');
  const users = (data || []).map((d) => User.parse(d));
  const analytics = new Analytics(process.env.SEGMENT_WRITE_KEY as string);
  const baseURL = 'https://tutorbook.org';
  await Promise.all(
    users.map(async (user: User) => {
      analytics.identify({ userId: user.id, traits: user.toSegment() });
      analytics.track({ userId: user.id, event: 'QuaranTunes Email II Sent' });
      const link =
        `${baseURL}/profile?` +
        `ajs_uid=${encodeURIComponent(user.id)}&` +
        `ajs_event=${encodeURIComponent('QuaranTunes Email II Link Clicked')}`;
      const pixelJSON = JSON.stringify({
        writeKey: process.env.SEGMENT_PIXEL_KEY as string,
        event: 'QuaranTunes Email II Opened',
        userId: user.id,
      });
      const pixelData = Buffer.from(pixelJSON, 'utf-8').toString('base64');
      const pixel = `https://api.segment.io/v1/pixel/track?data=${pixelData}`;
      const firstName = user.name.split(' ')[0] || user.name;
      return send({
        from: { name: 'Julia Segal', email: 'team@tutorbook.org' },
        bcc: { name: 'Tutorbook', email: 'team@tutorbook.org' },
        replyTo: { name: 'Julia Segal', email: 'quarantunes.info@gmail.com' },
        to: [{ name: user.name, email: user.email }],
        subject: `Hi ${firstName}! Could you modify your QuaranTunes profile?`,
        html: renderToStaticMarkup(
          <QuaranTunesTemplate
            name={firstName}
            email={user.email}
            pixel={pixel}
            link={link}
          />
        ),
      });
    })
  );
  res.status(201).end('QuaranTunes Emails Sent');
}
