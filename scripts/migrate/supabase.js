// Copies our Firebase data to Supabase (both authentication and PostgreSQL).

const fs = require('fs');
const path = require('path');
const phone = require('phone');
const { default: to } = require('await-to-js');
const { v4: uuid } = require('uuid');
const { nanoid } = require('nanoid');
const supabase = require('../lib/supabase');
const firebase = require('../lib/firebase');
const logger = require('../lib/logger');

function social({ type, url }) {
  if (/^https?:\/\/\S+$/.test(url)) return url;
  switch (type) {
    case 'website':
      return `https://${url}`;
    case 'linkedin':
      return `https://linkedin.com/in/${url}`;
    case 'twitter':
      return `https://twitter.com/${url}`;
    case 'facebook':
      return `https://facebook.com/${url}`;
    case 'instagram':
      return `https://instagram.com/${url}`;
    case 'github':
      return `https://github.com/${url}`;
    case 'indiehackers':
      return `https://indiehackers.com/${url}`;
    default:
      return `https://${url}`;
  }
}

async function fetch(table, convertToRow) {
  const rowsPath = path.resolve(__dirname, `./${table}.json`);
  const origPath = path.resolve(__dirname, `./orig-${table}.json`);
  logger.info(`Fetching ${table}...`);
  const { docs } = await firebase.db.collection(table).get();
  const orig = docs.map((d) => ({ id: d.id, ...d.data() }));
  logger.info(`Saving original data to ${origPath}...`);
  fs.writeFileSync(origPath, JSON.stringify(orig, null, 2));
  logger.info(`Parsing ${docs.length} ${table}...`);
  const rows = docs.map((d) => ({ orig: d.id, ...convertToRow(d.data()) }));
  logger.info(`Saving parsed data to ${rowsPath}...`);
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
}

async function fetchOrgs() {
  await fetch('orgs', (d) => ({
    id: d.id,
    name: d.name,
    photo: d.photo || null,
    email: d.email || null,
    phone: phone(d.phone)[0] || null,
    bio: d.bio,
    background: d.background || null,
    venue: d.venue ? d.venue.trim() : null,
    socials: (d.socials || []).map((s) => ({
      type: s.type,
      url: social(s).trim().split(' ').join('%20'),
    })),
    aspects: d.aspects,
    domains: (d.domains || []).length ? d.domains : null,
    profiles: d.profiles,
    subjects: (d.subjects || []).length ? d.subjects : null,
    signup: d.signup,
    home: d.home,
    booking: d.booking,
    matchURL: d.matchURL || null,
  }));
}

async function fetchUsers() {
  await fetch('users', (d) => ({
    name: d.name,
    photo: d.photo || null,
    email: d.email || null,
    phone: phone(d.phone)[0] || null,
    bio: d.bio,
    background: d.background || null,
    venue: d.venue ? d.venue.trim() : null,
    socials: (d.socials || []).map((s) => ({
      type: s.type,
      url: social(s).trim().split(' ').join('%20'),
    })),
    availability: d.availability.map((t) => ({
      id: t.id || nanoid(),
      from: t.from.toDate(),
      to: t.to.toDate(),
      exdates: (t.exdates || []).map((d) => d.toDate()),
      recur: t.recur || null,
      last: t.last ? t.last.toDate() : null,
    })),
    mentoring: d.mentoring,
    tutoring: d.tutoring,
    langs: d.langs.length ? d.langs : ['en'],
    visible: d.visible || false,
    featured: d.featured || [],
    tags: d.tags || [],
    reference: d.reference || '',
    timezone: d.timezone || null,
    age: d.age ? Math.floor(d.age) : null,
  }));
}

async function fetchMatches() {
  const userIds = require(path.resolve(__dirname, './ids-users.json'));
  await fetch('matches', (d) => ({
    org: d.org || 'default',
    creator: userIds[d.creator.id],
    subjects: d.subjects,
    message: d.message,
    tags: d.tags || [],
  }));
}

function buildRelationPeople() {
  const matchIds = require(path.resolve(__dirname, './ids-matches.json'));
  const userIds = require(path.resolve(__dirname, './ids-users.json'));
  const matches = require(path.resolve(__dirname, './orig-matches.json'));
  logger.info(`Parsing ${matches.length} people relations...`);
  const people = matches.map((m) => m.people.map((p) => {
    if (!userIds[p.id]) {
      logger.error(`No user (${m.id}): ${JSON.stringify(p, null, 2)}`);
      debugger;
    }
    if (!matchIds[m.id]) {
      logger.error(`No match (${m.id}): ${JSON.stringify(m, null, 2)}`);
      debugger;
    }
    if (!p.roles.length) {
      logger.error(`No roles (${m.id}): ${JSON.stringify(p, null, 2)}`);
      debugger;
    }
    return {
      user: userIds[p.id],
      meeting: null,
      match: matchIds[m.id],
      roles: p.roles,
    };
  })).flat();
  const peoplePath = path.resolve(__dirname, './relation_people.json');
  logger.info(`Saving parsed people relations to ${peoplePath}...`);
  fs.writeFileSync(peoplePath, JSON.stringify(people, null, 2));
}

function buildRelationOrgs() {
  const userIds = require(path.resolve(__dirname, './ids-users.json'));
  const orgIds = require(path.resolve(__dirname, './ids-orgs.json'));
  const users = require(path.resolve(__dirname, './orig-users.json'));
  logger.info(`Parsing ${users.length} org relations...`);
  const orgs = users.map((u) => u.orgs.map((orgId) => {
    if (!userIds[u.id]) {
      logger.error(`No user (${u.id}): ${JSON.stringify(u, null, 2)}`);
      debugger;
    }
    if (!orgIds[orgId]) {
      logger.error(`No org (${u.id}): (${orgId})`);
      debugger;
    }
    return {
      user: userIds[u.id],
      org: orgIds[orgId],
    };
  })).flat();
  const orgsPath = path.resolve(__dirname, './relation_orgs.json');
  logger.info(`Saving parsed org relations to ${orgsPath}...`);
  fs.writeFileSync(orgsPath, JSON.stringify(orgs, null, 2));
}

function buildRelationMembers() {
  const userIds = require(path.resolve(__dirname, './ids-users.json'));
  const orgIds = require(path.resolve(__dirname, './ids-orgs.json'));
  const orgs = require(path.resolve(__dirname, './orig-orgs.json'));
  logger.info(`Parsing ${orgs.length} member relations...`);
  const members = orgs.map((o) => o.members.map((id) => {
    if (!userIds[id]) {
      logger.error(`No user (${o.id}): (${id})`);
      debugger;
    }
    if (!orgIds[o.id]) {
      logger.error(`No org (${o.id}): ${JSON.stringify(o, null, 2)}`);
      debugger;
    }
    return {
      user: userIds[id],
      org: orgIds[o.id],
    };
  })).flat();
  const membersPath = path.resolve(__dirname, './relation_members.json');
  logger.info(`Saving parsed member relations to ${membersPath}...`);
  fs.writeFileSync(membersPath, JSON.stringify(members, null, 2));
}

function buildRelationParents() {
  const userIds = require(path.resolve(__dirname, './ids-users.json'));
  const users = require(path.resolve(__dirname, './orig-users.json'));
  logger.info(`Parsing ${users.length} parent relations...`);
  const parents = users.map((u) => u.parents.map((id) => {
    if (!userIds[u.id]) {
      logger.error(`No user (${u.id}): ${JSON.stringify(u, null, 2)}`);
      debugger;
    }
    if (!userIds[id]) {
      logger.error(`No parent (${u.id}): (${id})`);
      debugger;
    }
    return {
      user: userIds[u.id],
      parent: userIds[id],
    };
  })).flat();
  const parentsPath = path.resolve(__dirname, './relation_parents.json');
  logger.info(`Saving parsed parent relations to ${parentsPath}...`);
  fs.writeFileSync(parentsPath, JSON.stringify(parents, null, 2));
}

async function insert(table) {
  const rowsPath = path.resolve(__dirname, `./${table}.json`);
  const rowIdsPath = path.resolve(__dirname, `./ids-${table}.json`);
  logger.info(`Fetching parsed data from ${rowsPath}...`);
  const rows = require(rowsPath);
  const rowIds = {};
  const origIds = rows.map((row) => {
    const origId = row.orig;
    delete row.orig;
    return origId;
  });
  logger.info(`Inserting ${rows.length} rows into ${table}...`);
  const { data, error } = await supabase.from(table).insert(rows);
  if (error) {
    logger.error(`Error inserting rows: ${JSON.stringify(error, null, 2)}`);
    debugger;
    throw new Error(`Error inserting rows: ${error.message}`);
  } else {
    origIds.forEach((origId, idx) => {
      logger.debug(`Mapping ${table} (${origId}) to (${data[idx].id})...`);
      rowIds[origId] = data[idx].id;
    });
  }
  fs.writeFileSync(rowIdsPath, JSON.stringify(rowIds, null, 2));
  debugger;
}

async function migrate() {
  await fetchUsers();
  await insert('users');
  buildRelationParents();
  await insert('relation_parents');

  await fetchOrgs();
  await insert('orgs');
  buildRelationMembers();
  await insert('relation_members');
  buildRelationOrgs();
  await insert('relation_orgs');

  await fetchMatches();
  await insert('matches');
  buildRelationPeople();
  await insert('relation_people');
}

if (require.main === module) migrate();
