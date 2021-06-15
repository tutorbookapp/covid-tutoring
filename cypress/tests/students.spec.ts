import { UserJSON } from 'lib/model/user';
import { onlyFirstNameAndLastInitial } from 'lib/api/get/truncated-user';

import admin from 'cypress/fixtures/users/admin.json';
import volunteer from 'cypress/fixtures/users/volunteer.json';

function selectSubject(): void {
  cy.contains('What would you like to learn?')
    .find('textarea')
    .as('subjects-input')
    .focus();
  cy.percySnapshot('Students Landing Page with Hero Focused');

  // TODO: Why can't we just use a normal `cy.click()` command here?
  cy.get('@subjects-input').type('Computer');
  cy.contains('li', 'Computer Science')
    .trigger('click')
    .find('input[type="checkbox"]')
    .should('be.checked');
  cy.percySnapshot('Students Landing Page with Subject Selected');
}

describe('Student landing page', () => {
  beforeEach(() => {
    cy.setup({ student: null, meeting: null, match: null });
    cy.logout();
    cy.visit('/students');
  });

  it('selects subjects and searches mentors', () => {
    selectSubject();
    cy.contains('button', 'Search mentors').click();

    cy.url({ timeout: 60000 }).should('contain', '/default/search');

    cy.get('header')
      .contains('button', 'Mentors')
      .should('have.attr', 'aria-selected', 'true');
    cy.get('header').contains('button', 'Computer Science');
  });

  it('has results carousel and searches tutors', () => {
    cy.wait('@list-users');
    cy.getBySel('user-card').should('have.length', 2).as('cards');

    function isValidCard(idx: number, user: UserJSON): void {
      cy.get('@cards')
        .eq(idx)
        .should('have.attr', 'href', `/default/users/${user.id}`)
        .and('have.attr', 'target', '_blank')
        .within(() => {
          cy.getBySel('name').should(
            'have.text',
            onlyFirstNameAndLastInitial(user.name)
          );
          cy.getBySel('bio').should('have.text', user.bio);
          cy.get('img').should('have.img', user.photo, 160);
        });
    }

    isValidCard(0, admin as UserJSON);
    isValidCard(1, volunteer as UserJSON);

    // TODO: Remove this `click()` workaround b/c that's a bug in our front-end.
    // Instead, seed more user data so that we can actually click around and
    // test the vertical scroll buttons.
    // cy.get('@carousel').find('button:visible').click();
    // cy.get('@carousel').find('button').should('not.be.visible');

    cy.getBySel('title').should(
      'have.text',
      'Find your perfect volunteer tutor or mentor'
    );
    cy.getBySel('search-form')
      .children('button')
      .should('have.length', 2)
      .as('buttons');
    cy.get('@buttons').first().should('have.text', 'Search mentors');
    cy.get('@buttons').last().should('have.text', 'Search tutors');
    cy.percySnapshot('Students Landing Page');

    selectSubject();

    cy.get('@buttons').last().click();

    cy.url({ timeout: 60000 }).should('contain', '/default/search');

    cy.get('header')
      .contains('button', 'Tutors')
      .should('have.attr', 'aria-selected', 'true');
    cy.get('header').contains('button', 'Computer Science');
  });
});
