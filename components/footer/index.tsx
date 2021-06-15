import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import { OrgJSON } from 'lib/model';
import { useUser } from 'lib/context/user';

import Group from './group';
import Link from './link';
import styles from './footer.module.scss';

export interface FooterProps {
  formWidth?: boolean;
  orgs?: OrgJSON[];
}

export default function Footer({ formWidth, orgs }: FooterProps): JSX.Element {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <footer className={cn(styles.footer, { [styles.formWidth]: formWidth })}>
      <nav role='navigation'>
        <Group label={t('common:footer-useful-links')}>
          <Link href={`/${user.orgs[0] || 'default'}/signup`}>
            {t('common:footer-signup')}
          </Link>
          <Link href={`/${user.orgs[0] || 'default'}/search`}>
            {t('common:footer-search')}
          </Link>
          <Link href='https://github.com/tutorbookapp/tutorbook/issues/new/choose'>
            {t('common:footer-issue')}
          </Link>
        </Group>
        <Group label={t('common:footer-orgs')}>
          {(orgs || []).map((org) => (
            <Link key={org.id} href={`/${org.id}`}>
              {org.name}
            </Link>
          ))}
        </Group>
        <Group label={t('common:footer-socials')}>
          <Link href='https://facebook.com/tutorbookapp'>
            {t('common:facebook')}
          </Link>
          <Link href='https://instagram.com/tutorbookapp'>
            {t('common:instagram')}
          </Link>
          <Link href='https://twitter.com/tutorbookapp'>
            {t('common:twitter')}
          </Link>
          <Link href='https://github.com/orgs/tutorbookapp'>
            {t('common:github')}
          </Link>
          <Link href='https://helpwithcovid.com/projects/782-tutorbook'>
            {t('common:helpwithcovid')}
          </Link>
          <Link href='https://www.indiehackers.com/product/tutorbook'>
            {t('common:indiehackers')}
          </Link>
        </Group>
        <Group label={t('common:footer-team')}>
          <Link href='https://github.com/orgs/tutorbookapp'>
            {t('common:footer-open-source')}
          </Link>
          <Link href='https://github.com/tutorbookapp/tutorbook#readme'>
            {t('common:footer-docs')}
          </Link>
          <Link href='https://join.slack.com/t/tutorbookapp/shared_invite/zt-ekmpvd9t-uzH_HuS6KbwVg480TAMa5g'>
            {t('common:footer-team-slack')}
          </Link>
          <Link href='https://helpwithcovid.com/projects/782-tutorbook'>
            {t('common:footer-team-join')}
          </Link>
          <Link href='mailto:team@tutorbook.org'>
            {t('common:footer-contact')}
          </Link>
        </Group>
      </nav>
      <section>
        <span>Copyright &copy; 2021 Tutorbook. All rights reserved.</span>
      </section>
    </footer>
  );
}
