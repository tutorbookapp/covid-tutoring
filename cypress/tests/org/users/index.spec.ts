import { Aspect } from 'lib/model/aspect';

import admin from 'cypress/fixtures/users/admin.json';
import school from 'cypress/fixtures/orgs/school.json';
import student from 'cypress/fixtures/users/student.json';
import volunteer from 'cypress/fixtures/users/volunteer.json';

function filterSheetIsOpen(open: boolean = true): void {
  // TODO: Because this filter sheet wrapper has a 1px left border, the width
  // will never actually be 0px which also prevents Cypress from determining
  // if the child `<form>` element is visible or not (https://bit.ly/2NqKaRI).
  cy.getBySel('filters-sheet', { timeout: 60000 })
    .should('have.css', 'width', open ? '300px' : '1px')
    .find('.mdc-text-field')
    .should(open ? 'be.visible' : 'not.be.visible');
}

function snackbarIsOpen(label: string = 'Link copied to clipboard.'): void {
  cy.get('.mdc-snackbar__surface')
    .as('snackbar')
    .should('be.visible')
    .find('.mdc-snackbar__label')
    .should('have.text', label);

  // TODO: Restore this once we can use SVGs for the snackbar dismiss button.
  // @see {@link https://github.com/jamesmfriedman/rmwc/pull/727}
  // cy.get('@snackbar').find('button').click();
  // cy.get('@snackbar').should('not.exist');
}

// TODO: Add `cy.percySnapshot` calls to add visual snapshot testing.
describe('Users page', () => {
  beforeEach(() => {
    // TODO: Update our fixtures so we can accurately test that the aspect chips
    // only appear when the aspect is within the given org.
    const aspects: Aspect[] = ['tutoring', 'mentoring'];
    cy.setup({ school: { aspects }, match: null, meeting: null });
  });

  it('redirects to login page when logged out', () => {
    cy.logout();
    cy.visit(`/${school.id}/users`);
    cy.wait('@get-account');

    // TODO: Refactor these assertions into reusable functions as they're used
    // on every single "login required" page. Or, just test them once and assume
    // that they work on every page.
    const url = `/login?href=${encodeURIComponent(`/${school.id}/users`)}`;

    cy.url({ timeout: 60000 }).should('contain', url);
  });

  it('falls back to invisible textarea copy-paste', () => {
    cy.login(admin.id);
    cy.visit(`/${school.id}/users`, {
      onBeforeLoad(win: Window): void {
        cy.stub(win.navigator.clipboard, 'writeText').as('copy');
      },
    });

    // TODO: Assert about the content of the user's clipboard (i.e. to see if
    // the textarea clipboard workaround works properly).
    // @see {@link https://github.com/cypress-io/cypress/issues/2752}
    cy.contains('button', 'Share signup link').click();
    cy.get('@copy').should('be.calledOnce');
  });

  it('copies org links and filters users', () => {
    cy.login(admin.id);
    cy.visit(`/${school.id}/users`, {
      onBeforeLoad(win: Window): void {
        cy.spy(win.navigator.clipboard, 'writeText').as('copy');
      },
    });
    cy.wait('@get-account');

    cy.getBySel('title').should('have.text', 'Users');
    cy.getBySel('subtitle').should(
      'have.text',
      `Create, edit, and match ${school.name}'s users`
    );

    cy.contains('button', 'Share signup link').click();
    cy.get('@copy').should(
      'be.calledWithExactly',
      `http://localhost:3000/${school.id}/signup`
    );
    snackbarIsOpen();
    cy.contains('button', 'Share search link').click();
    cy.get('@copy').should(
      'be.calledWithExactly',
      `http://localhost:3000/${school.id}/search`
    );
    snackbarIsOpen();

    // TODO: Right now, we can't test the Intercom integration due to
    // `localhost` not being whitelisted. We'll have to change the development
    // server hostname to something like `127.0.0.1` or `0.0.0.0` to be able to
    // access Intercom locally. But do we really need to test Intercom?
    cy.contains('button', 'Import data').click();

    // Showing featured tutors first.
    cy.wait('@list-users');
    cy.getBySel('result')
      .should('not.have.css', 'cursor', 'wait')
      .as('results')
      .should('have.length', 3)
      .first()
      .find('a')
      .should('contain', volunteer.name)
      .and('have.attr', 'href', `/${school.id}/users/${volunteer.id}`)
      .and('have.attr', 'target', '_blank');

    // Showing featured tutors first; users must be hidden from search.
    cy.contains('.mdc-chip', 'Hidden from search')
      .as('hidden-chip')
      .click()
      .should('have.class', 'mdc-chip--selected');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 1)
      .first()
      .find('a')
      .should('contain', student.name)
      .and('have.attr', 'href', `/${school.id}/users/${student.id}`)
      .and('have.attr', 'target', '_blank');

    // Showing featured tutors first; users must be visible in search.
    cy.contains('.mdc-chip', 'Visible in search')
      .as('visible-chip')
      .click()
      .should('have.class', 'mdc-chip--selected');
    cy.get('@hidden-chip').should('not.have.class', 'mdc-chip--selected');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 2)
      .first()
      .should('contain', volunteer.name);
    cy.get('@results').last().should('contain', admin.name);

    // Showing featured mentors first; users must be visible in search.
    cy.contains('.mdc-chip', 'Tutoring')
      .as('tutors-chip')
      .should('have.class', 'mdc-chip--selected');
    cy.contains('.mdc-chip', 'Mentoring')
      .as('mentors-chip')
      .click()
      .should('have.class', 'mdc-chip--selected');
    cy.get('@tutors-chip').should('not.have.class', 'mdc-chip--selected');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 2)
      .first()
      .should('contain', admin.name);
    cy.get('@results').last().should('contain', volunteer.name);

    // Showing featured mentors first; users must be visible in search AND speak
    // Spanish.
    cy.getBySel('filters-button').click();
    filterSheetIsOpen();
    cy.contains('Languages').as('langs-input').type('spanish');

    // TODO: Why doesn't a regular `cy.click()` command work here? Why do I have
    // to call `cy.trigger()` instead? What is wrong with the event listener?
    cy.get('#portal')
      .as('portal')
      .contains('li:visible', 'Spanish')
      .trigger('click')
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.get('@langs-input')
      .children('.mdc-chip')
      .should('have.length', 1)
      .first()
      .as('spanish-chip')
      .should('contain', 'Spanish');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 1)
      .first()
      .should('contain', volunteer.name);
    cy.get('@spanish-chip').find('[role="button"]').last().click();
    cy.get('@langs-input').children('.mdc-chip').should('have.length', 0);

    // Showing featured mentors first; users must be visible in search AND not
    // yet vetted.
    cy.contains('Tags').as('tags-input').type('vetted');
    cy.get('@portal')
      .contains('li:visible', 'Not vetted')
      .trigger('click')
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.get('@tags-input')
      .children('.mdc-chip')
      .should('have.length', 1)
      .first()
      .as('not-vetted-chip')
      .should('contain', 'Not vetted');

    cy.wait('@list-users');

    cy.get('@results')
      .should('have.length', 1)
      .first()
      .should('contain', volunteer.name);
    cy.getBySel('filters-button').click();
    filterSheetIsOpen(false);

    // Showing featured tutors first; users must not yet be vetted.
    cy.get('@tutors-chip').click().should('have.class', 'mdc-chip--selected');
    cy.get('@mentors-chip').should('not.have.class', 'mdc-chip--selected');
    cy.get('@visible-chip')
      .click()
      .should('not.have.class', 'mdc-chip--selected');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 2)
      .first()
      .should('contain', volunteer.name);
    cy.get('@results').last().should('contain', student.name);

    // Showing featured tutors first; users must not yet be vetted AND must
    // tutor Computer Science.
    cy.getBySel('filters-button').click();
    filterSheetIsOpen();
    cy.contains('Subjects').as('subjects-input').type('computer');
    cy.get('@portal')
      .contains('li:visible', 'Computer Science')
      .trigger('click')
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.get('@subjects-input')
      .children('.mdc-chip')
      .should('have.length', 1)
      .first()
      .as('cs-chip')
      .should('contain', 'Computer Science');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 1)
      .first()
      .should('contain', volunteer.name);
    cy.get('@cs-chip').find('[role="button"]').last().click();
    cy.get('@subjects-input').children('.mdc-chip').should('have.length', 0);
    cy.getBySel('filters-button').click();
    filterSheetIsOpen(false);

    // Search by text (using 'Erik' name).
    cy.get('[placeholder="Search users"]').as('query-input').type('Erik');
    cy.wait('@list-users');
    cy.get('@results')
      .should('have.length', 1)
      .first()
      .should('contain', student.name);

    // Search by text (using 'Nicholas' name).
    cy.get('@query-input').clear().type('Nicholas');
    cy.wait('@list-users');
    cy.getBySel('result').should('not.exist');
    cy.contains('NO USERS TO SHOW').should('be.visible');
    cy.percySnapshot('Users Page with No Results');
  });
});
