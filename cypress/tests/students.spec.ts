import volunteer from 'cypress/fixtures/users/volunteer.json';

import { onlyFirstNameAndLastInitial } from 'lib/api/get/truncated-user';

describe('Student landing page', () => {
  beforeEach(() => {
    cy.setup();
    cy.logout();
    cy.visit('/students');
  });

  it('has results carousel and search CTA', () => {
    cy.wait('@list-users');
    cy.getBySel('carousel')
      .first()
      .find('[data-cy=user-card]')
      .should('have.length', 2)
      .first()
      .as('card');

    cy.get('@card')
      .find('[data-cy=name]')
      .should('have.text', onlyFirstNameAndLastInitial(volunteer.name));
    cy.get('@card').find('[data-cy=bio]').should('have.text', volunteer.bio);
    cy.get('@card').find('img').should('have.img', volunteer.photo, 160);

    // TODO: Remove this `click()` workaround b/c that's a bug in our front-end.
    // cy.get('@carousel').find('button:visible').click();
    // cy.get('@carousel').find('button').should('not.be.visible');

    cy.getBySel('hero').first().as('hero');
    cy.get('@hero')
      .find('[data-cy=title]')
      .should('have.text', 'Learn from and work with an expert.');
    cy.get('@hero').find('form > button').should('have.text', 'Search mentors');

    cy.get('header').contains('button', 'Tutors').click();

    cy.get('@hero')
      .find('[data-cy=title]')
      .should('have.text', 'Free tutoring amidst COVID-19.');
    cy.get('@hero').find('form > button').should('have.text', 'Search tutors');

    cy.contains('What would you like to learn?').type('Computer');
    cy.contains('Computer Science').click({ force: true });
    cy.get('@hero').find('form > button').click();

    // TODO: Find way to make Cypress wait for Next.js to emit the "client-side
    // page transition complete" signal (e.g. when the nprogress bar is hidden).
    cy.url({ timeout: 60000 }).should('contain', '/default/search');

    cy.get('header')
      .contains('button', 'Tutors')
      .should('have.attr', 'aria-selected', 'true');
    cy.get('header').contains('button', 'Computer Science');
  });
});
