import { useState } from 'react';

import { AspectHeader } from 'components/navigation';
import Banner from 'components/banner';
import Hero from 'components/hero';
import About from 'components/about';
import Page from 'components/page';

import { Aspect } from 'lib/model';
import { withI18n } from 'lib/intl';

import match3rd from 'locales/en/match3rd.json';
import query3rd from 'locales/en/query3rd.json';
import banner from 'locales/en/banner.json';
import about from 'locales/en/about.json';
import common from 'locales/en/common.json';

function IndexPage(): JSX.Element {
  const [aspect, setAspect] = useState<Aspect>('mentoring');
  return (
    <Page title='Support at scale - Tutorbook'>
      <Banner />
      <AspectHeader
        aspect={aspect}
        onChange={(newAspect: Aspect) => setAspect(newAspect)}
      />
      <Hero aspect={aspect} />
      <About />
      <div style={{ marginBottom: '60px' }}>
        <Hero aspect={aspect} />
      </div>
    </Page>
  );
}

export default withI18n(IndexPage, {
  common,
  about,
  banner,
  query3rd,
  match3rd,
});
