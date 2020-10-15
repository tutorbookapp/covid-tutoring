import admin from 'cypress/fixtures/users/admin.json';
import student from 'cypress/fixtures/users/student.json';
import org from 'cypress/fixtures/orgs/default.json';

describe('Org settings page', () => {
  beforeEach(() => {
    cy.setup();
  });

  it('redirects to login page when logged out', () => {
    cy.logout();
    cy.visit(`/${org.id}/settings`);
    cy.wait('@get-account');

    const href = encodeURIComponent('/[org]/settings');
    const as = encodeURIComponent(`/${org.id}/settings`);
    const url = `/login?href=${href}&as=${as}`;

    cy.url({ timeout: 60000 }).should('contain', url);
  });

  it('shows error when not member of org', () => {
    cy.login(student.id);
    cy.visit(`/${org.id}/settings`);
    cy.wait('@get-account');

    cy.get('h1').should('have.text', '401');
    cy.get('h2').should(
      'have.text',
      'You are not a member of this organization.'
    );
  });

  it('displays and updates org settings', () => {
    cy.login(admin.id);
    cy.visit(`/${org.id}/settings`);
    cy.wait('@get-account');

    cy.getBySel('title').should('have.text', 'Settings');
    cy.getBySel('subtitle')
      .should('have.text', `Configure ${org.name}'s settings`)
      .as('subtitle');

    cy.contains('a', 'General').should(
      'have.attr',
      'href',
      `/${org.id}/settings`
    );
    cy.contains('a', 'Home Page').should(
      'have.attr',
      'href',
      `/${org.id}/settings/home`
    );
    cy.contains('a', 'Signup Page').should(
      'have.attr',
      'href',
      `/${org.id}/settings/signup`
    );

    cy.contains('Organization name')
      .find('input')
      .should('have.value', 'Tutorbook')
      .type('{selectall}{del}TB');
    cy.get('@subtitle').should('have.text', `Configure TB's settings`);
    cy.getBySel('switcher-btn').should('have.text', 'TB');

    cy.contains('Organization email address')
      .as('email-input')
      .find('input')
      .should('have.value', 'team@tutorbook.org')
      .type('{selectall}{del}team');
    cy.contains('Organization phone number').find('input').focus();
    cy.get('@email-input').should('have.class', 'mdc-text-field--invalid');
  });
});
