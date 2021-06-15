import { TimeslotJSON } from 'lib/model/timeslot';

import volunteer from 'cypress/fixtures/users/volunteer.json';

describe('Profile page', () => {
  beforeEach(() => {
    cy.setup({ student: null, match: null, meeting: null });
  });

  it('redirects to login page when logged out', () => {
    cy.logout();
    cy.visit('/profile');
    cy.wait('@get-account');

    cy.url({ timeout: 60000 }).should('contain', '/login?href=%2Fprofile');
    cy.loading(false).percySnapshot('Login Page');
  });

  it('retries failed update requests', () => {
    cy.intercept('PUT', '/api/users/*', {
      delay: 1000,
      statusCode: 400,
      body: { message: 'You must provide a request body.' },
    }).as('update-user');

    cy.login(volunteer.id);
    cy.visit('/profile');
    cy.percySnapshot('Profile Page in Loading State');

    cy.wait('@get-account');
    cy.percySnapshot('Profile Page');

    cy.contains('Your name').find('input').clear().type('John');
    cy.percySnapshot('Profile Page with Updated Name');

    cy.get('.mdc-snackbar__surface')
      .should('be.visible')
      .children('.mdc-snackbar__label')
      .should('have.text', 'Updating profile...');

    cy.wait(1000);
    cy.wait('@update-user');

    cy.percySnapshot('Profile Page with Update Error');
    cy.get('.mdc-snackbar__label')
      .should('contain', 'Could not update profile.')
      .invoke('text')
      .then((text1: string) => {
        const waitRegex = /Retry in (\d+) seconds./;
        const wait1 = Number((waitRegex.exec(text1) as string[])[1]);

        cy.wait(wait1 * 1000);
        cy.get('.mdc-snackbar__label')
          .should('be.visible')
          .and('have.text', 'Updating profile...');
        cy.wait('@update-user');

        cy.get('.mdc-snackbar__label')
          .should('contain', 'Could not update profile.')
          .invoke('text')
          .then((text2: string) => {
            const wait2 = Number((waitRegex.exec(text2) as string[])[1]);
            expect(wait2).to.be.at.least(wait1);

            cy.get('.mdc-snackbar__surface')
              .should('be.visible')
              .contains('button', 'Retry')
              .click();

            cy.get('.mdc-snackbar__label')
              .should('be.visible')
              .and('have.text', 'Updating profile...');
            cy.wait('@update-user');

            cy.get('.mdc-snackbar__label')
              .should('contain', 'Could not update profile.')
              .invoke('text')
              .then((text3: string) => {
                const wait3 = Number((waitRegex.exec(text3) as string[])[1]);
                expect(wait3).to.be.at.least(wait2);
              });
          });
      });
  });

  it('updates volunteer profiles', () => {
    cy.intercept('POST', 'https://firebasestorage.googleapis.com/**', {
      fixture: 'users/volunteer.jpg.json',
    }).as('upload-photo');
    cy.intercept('GET', 'https://firebasestorage.googleapis.com/**', {
      fixture: 'users/volunteer.jpg.json',
    }).as('get-photo');

    cy.login(volunteer.id);
    cy.visit('/profile');
    cy.wait('@get-account');

    cy.getBySel('title').should('have.text', 'Profile');
    cy.getBySel('subtitle').should('have.text', 'Update your profile');
    cy.percySnapshot('Profile Page');

    cy.contains('a', 'View profile').should(
      'have.attr',
      'href',
      `/default/users/${volunteer.id}`
    );

    // TODO: Why does SWR fetch '/api/account' a second time sometimes? When it
    // does, the 'useContinuous' hook resets all of our changes (b/c of that
    // 500ms local update throttle, which we definitely want to keep). I'm
    // guessing that the window was refocused so it tries to revalidate.
    cy.contains('Your name')
      .find('input')
      .clear()
      .type('John')
      .should('have.value', 'John')
      .and('have.attr', 'required');

    cy.wait(500); // Wait for the 500ms throttle on local updates to trigger.

    cy.get('#open-nav').click();
    cy.getBySel('account-header').should('have.length', 1).as('account-header');
    cy.get('@account-header').find('span').should('have.text', 'John');
    cy.get('@account-header')
      .find('img')
      .as('profile-img')
      .should('have.img', volunteer.photo, 24);
    cy.percySnapshot('Profile Page with Navigation Open');

    cy.contains('Your email address')
      .children('input')
      .should('be.disabled')
      .and('have.attr', 'type', 'email');

    cy.contains('Your phone number')
      .children('input')
      .click()
      .should('be.focused')
      .and('have.attr', 'type', 'tel');

    cy.contains('Your profile photo')
      .as('photo-input')
      .children('input')
      .should('have.attr', 'type', 'file')
      .attachFile('users/student.jpg');
    cy.get('@photo-input')
      .next()
      .as('photo-input-label')
      .should('have.text', 'Uploading student.jpg...');
    cy.percySnapshot('Profile Page with Photo Uploading');

    cy.wait('@upload-photo');
    cy.wait('@get-photo');
    cy.wait(500); // Wait for the 500ms throttle on local updates to trigger.

    cy.get('@photo-input-label').should('have.text', 'Uploaded student.jpg.');
    cy.get('@profile-img').should('not.have.img', volunteer.photo, 24);
    cy.percySnapshot('Profile Page with Photo Uploaded');

    cy.contains('What can you tutor?')
      .children('.mdc-chip')
      .should('have.length', volunteer.tutoring.subjects.length)
      .as('tutoring-subjects');
    volunteer.tutoring.subjects.forEach((subject: string, idx: number) => {
      cy.get('@tutoring-subjects').eq(idx).should('contain', subject);
    });

    cy.contains('What are your fields of expertise?')
      .children('.mdc-chip')
      .should('have.length', volunteer.mentoring.subjects.length)
      .as('mentoring-subjects');
    volunteer.mentoring.subjects.forEach((subject: string, idx: number) => {
      cy.get('@mentoring-subjects').eq(idx).should('contain', subject);
    });

    const langs: Record<string, string> = { en: 'English', es: 'Spanish' };
    cy.contains('What languages do you speak?')
      .children('.mdc-chip')
      .should('have.length', volunteer.langs.length)
      .as('langs');
    volunteer.langs.forEach((lang: string, idx: number) => {
      cy.get('@langs').eq(idx).should('contain', langs[lang]);
    });

    // TODO: For some reason, the `Availability` object is always replaced with
    // a regular array when it is compiled by Cypress's test runner.

    const availabilityString = volunteer.availability
      .map((timeslot: TimeslotJSON) => {
        const from = new Date(timeslot.from);
        const to = new Date(timeslot.to);

        const hideAMPM =
          (from.getHours() >= 12 && to.getHours() >= 12) ||
          (from.getHours() < 12 && to.getHours() < 12);
        const showSecondDate =
          from.getDate() !== to.getDate() ||
          from.getMonth() !== to.getMonth() ||
          from.getFullYear() !== to.getFullYear();

        // We follow Google's Material Design guidelines while formatting these
        // durations. We use an en dash without spaces between the time range.
        // @see {@link https://material.io/design/communication/data-formats.html}
        return `${from
          .toLocaleString('en', {
            weekday: 'long',
            hour: 'numeric',
            minute: 'numeric',
          })
          .replace(hideAMPM && !showSecondDate ? ' AM' : '', '')
          .replace(
            hideAMPM && !showSecondDate ? ' PM' : '',
            ''
          )}–${to.toLocaleString('en', {
          weekday: showSecondDate ? 'long' : undefined,
          hour: 'numeric',
          minute: 'numeric',
        })}`;
      })
      .join(', ');

    cy.contains('What is your weekly availability?')
      .children('input')
      .should('have.value', availabilityString)
      .focus();
    cy.getBySel('availability-select-surface').should('be.visible');
    cy.getBySel('timeslot-rnd')
      .should('have.length', volunteer.availability.length)
      .and('be.visible')
      .as('timeslots');
    cy.percySnapshot('Profile Page with Availability Select Open');

    // Drag-and-drop the timeslots and assert that their content changes.
    // @see {@link https://bit.ly/2TIuE3i}
    volunteer.availability.forEach((timeslot: TimeslotJSON, idx: number) => {
      const config = { hour: 'numeric', minute: 'numeric' };
      cy.get('@timeslots')
        .eq(idx)
        .should('contain', new Date(timeslot.from).toLocaleString('en', config))
        .and('contain', new Date(timeslot.to).toLocaleString('en', config))
        .then((timeslotEl: JQuery<HTMLElement>) => {
          // TODO: Make sure these drag-and-drop tests actually work.
          const { x, y } = timeslotEl[0].getBoundingClientRect();
          timeslotEl
            .trigger('mousedown', { which: 1 })
            .trigger('mousemove', { clientX: x, clientY: y + 200 })
            .trigger('mouseup', { force: true });
        });
    });

    // TODO: Test that typing {tab} while the AvailabilitySelect is focused
    // moves the focus to the bio textarea.
    // @see {@link https://github.com/cypress-io/cypress/issues/299}
    // @see {@link https://github.com/dmtrKovalenko/cypress-real-events}
    cy.contains('Qualifications? Interests?')
      .children('textarea')
      .should('have.value', volunteer.bio)
      .focus();

    cy.wait(1000);
    cy.wait('@update-user');

    cy.get('.mdc-snackbar__surface')
      .should('be.visible')
      .and('have.length', 1)
      .children('.mdc-snackbar__label')
      .should('have.text', 'Updated profile.');

    // Wait for MDC snackbar's default 5 second closing timeout.
    // @see {@link https://material.io/components/snackbars/web#javascript-api}
    cy.wait(5000);
    cy.get('.mdc-snackbar__surface').should('not.be.visible');
  });
});
