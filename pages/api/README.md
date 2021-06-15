# API

We use [serverless Next.js API
functions](https://nextjs.org/docs/api-routes/introduction) deployed on
[Vercel](https://vercel.com) to power most of our back-end work:

1. Creating new user accounts and updating existing user accounts when the
   [for students1](https://tutorbook.org/pupils) or [for
   volunteers](https://tutorbook.org/tutors) are submitted.
2. Signing users in via [custom Firebase Authentication
   tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
   (also when a user fills out a sign-up form).
3. Scheduling tutoring appointments (e.g. creating lesson requests, sending an
   approval email to get parental consent, creating Bramble rooms, sending the
   appointment emails, and creating Firestore NoSQL Database records).

Each of these API functions catches all known errors and sends them back to the
client in plain English (i.e. you can display `res.data` to the user when you
receive a `400` or `500` HTTP error code).

## Data Model

All data model references can be found in [this
README](https://github.com/tutorbookapp/tutorbook/tree/develop/src/model#readme)
and are defined in [the `src/model`
directory](https://github.com/tutorbookapp/tutorbook/tree/develop/src/model).

## REST API

Included below are the specifications of our REST API (which strive to follow
the guidelines [outlined here](https://hackernoon.com/restful-api-designing-guidelines-the-best-practices-60e1d954e7c9))
endpoints (accessible from `https://tutorbook.org/api/{functionName}`).

The Firebase Authentication JWT (JSON Web Tokens) referred to below can be
retrieved via the client-side [Firebase Authentication JavaScript
SDK](https://firebase.google.com/docs/auth/web/start) like so:

```typescript
const token: string = await firebase.auth.currentUser.getIdToken();
const { data } = await axios({
  method: 'get',
  url: `/api/users/${firebase.auth.currentUser.uid}`,
  headers: { Authorization: `Bearer ${token}` },
});
const user: User = User.parse(data);
```

### `/api/users`

#### `GET`

Lists all of Tutorbook's users (to a certain extent; and typically with
truncated data).

##### Authentication

You may optionally pass a JWT that gives full access to some data (i.e. the data
will not be truncated and will include contact information). If given a JWT, we
will un-truncate data belonging to the owner of the JWT and any of the
organizations that owner is a part of.

Note that passing a JWT **does not** apply any filters to the data; they are
still filtered as before and thus can be a mix of both truncated and
un-truncated data. Thus, it is recommended that you filter by `orgs` using the
parameters described below to ensure that you're receiving un-truncated data.

##### Parameters

We support all of the `Query` fields as URL query parameters. These parameters
are entirely optional and only serve to further filter the data.

#### `POST`

Creates a new user's profile document and Firebase Authentication account.

**Note:** This will fail if a user with the given email address already exists
(in which case, one should use a `PUT` request to the `/api/users/[user]`
endpoint instead).

##### Authentication

No authentication is required to create a new user. This request will fail
however, if a user with the same email address already exists (in which case,
one should use the `/api/user/update` endpoint to update an existing profile).

##### Data

The following data fields should be sent in the HTTP request body.

| Field     | Type     | Description                                                                        |
| --------- | -------- | ---------------------------------------------------------------------------------- |
| `user`    | `User`   | The user to create (i.e. output of one of the two sign-up forms).                  |
| `parents` | `User[]` | The user's parents (i.e. output of the "parent" fields in the pupil sign-up form). |

##### Actions

Upon request, the `/api/user` serverless API function:

1. Creates and signs-in a new Firebase Authentication user.
2. (Optional) Creates a new Firesbase Authentication user for the parents.
3. (Optional) Creates a new Firestore profile document for the parents.
4. Creates a new Firestore profile document for the given user.
5. Sends an email verification link to the new user (and his/her parents).

##### Response

Responds with the created `User` document in JSON form (i.e. `UserJSON` that
exactly matches what is now in our Firestore document-based NoSQL database).

### `/api/users/[id]`

#### `GET`

Fetches the user's profile document.

##### Authentication

Requires a JWT that belongs to either:

1. The user whose profile document we're retrieving.
2. A member of an organization who owns the profile document we're retrieving
   (i.e. the organization's ID is listed in the profile's `orgs` field).

##### Response

Responds with a `User` object in JSON form (i.e. `UserJSON`).

#### `PUT`

Updates the user's profile document.

##### Authentication

As usual, this requires a JWT that belongs to either:

1. The user whose profile document we're retrieving.
2. A member of an organization who owns the profile document we're retrieving
   (i.e. the organization's ID is listed in the profile's `orgs` field).

##### Data

Accepts a `User` object (in the form of JSON) in the request body.

**Note:** That `User` object must contain certain fields or the request will
fail:

- A valid email address; one cannot remove the account's associated email
  address.
- A valid `id` (i.e the unique Firebase Authentication uID assigned during
  account creation).

#### `DELETE`

Deletes the user's profile document and it's associated Firebase Authentication
account.

##### Authentication

As usual, this requires a JWT that belongs to either:

1. The user whose profile document we're retrieving.
2. A member of an organization who owns the profile document we're retrieving
   (i.e. the organization's ID is listed in the profile's `orgs` field).

### `/api/users/[id]/parents`

#### `POST`

Creates a new parent profile and adds it to the user's `parents` field.

If the parent profile already exists, this merely ensures that it is included in
the user's `parents` field.

##### Authentication

As usual, this requires a JWT that belongs to either:

1. The user whose parents we're creating (or updating).
2. A member of an organization who owns the user whose parents we're creating or
   updating (i.e. the organization's ID is listed in the user's `orgs` field).

##### Data

Accepts the same `User` object that the `/api/users` POST endpoint accepts
(because this endpoint essentially just relays to that endpoint).

##### Response

Responds with the parent's profile data.

### `/api/requests`

#### `POST`

The `/api/request` endpoint creates a new lesson request that is awaiting
parental approval (each time a pupil sends a lesson request, the parent must
first approve of the requested tutor before the appointment emails (with a link
to the Bramble room) are sent).

##### Data

The following data fields should be sent in the HTTP request body.

| Field   | Type     | Description                                               |
| ------- | -------- | --------------------------------------------------------- |
| `match` | `Match`  | The tutoring appointment to create a pending request for. |
| `token` | `string` | The logged in user's Firebase Authentication `idToken`.   |

##### Actions

Upon request, the `/api/request` serverless API function:

1. Performs the following verifications (sends a `400` error code and an
   accompanying human-readable error message if any of them fail):
   - Verifies the correct request body was sent (e.g. all parameters are there
     and are all of the correct types).
   - Verifies that the `people` all have user IDs and profile documents.
   - Verifies that the appointment creator (the owner of the given `token` JWT)
     is an `person`.
   - Verifies that the requested `Timeslot` is within all of the `person`'s
     availability (by reading each `person`'s Firestore profile document).
   - Verifies that the requested `subjects` are included in each of the tutors'
     Firestore profile documents (where a tutor is defined as an `person` whose
     `roles` include `tutor`).
   - Verifies that the given `token` belongs to one of the `match`'s `people`.
2. Creates [the Bramble tutoring lesson room](https://about.bramble.io/api.html)
   (so that the parent can preview the venue that their child will be using to
   connect with their tutor).
3. Creates a new `request` document containing the given `match`'s data in the
   pupil's (the owner of the given JWT `token`) Firestore sub-collections.
4. Sends an email to the pupil's parent(s) asking for parental approval of the
   tutoring match.
5. Sends an email to the pupil (the sender of the lesson request) telling them
   that we're awaiting parental approval.

##### Response

The created request object (that includes the ID of it's Firestore document).

### `/api/matches`

#### `POST`

The `/api/match` endpoint approves a pending lesson request and creates a
tutoring appointment.

##### Data

The following parameters should be sent in the HTTP request body.

| Field     | Type     | Description                                                                                                                                        |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request` | `string` | The path of the pending tutoring lesson's Firestore document to approve (e.g. `users/MKroB319GCfMdVZ2QQFBle8GtCZ2/requests/CEt4uGqTtRg17rZamCLC`). |
| `id`      | `string` | The user ID of the parent approving the lesson request (e.g. `MKroB319GCfMdVZ2QQFBle8GtCZ2`).                                                      |

##### Actions

Upon request, the `/api/match` serverless API function:

1. Verifies the correct request body was sent (e.g. all parameters are there and
   are all of the correct types).
2. Fetches the given pending request's data from our Firestore database.
3. Performs the following verifications (some of which are also included in the
   original `/api/request` endpoint):
   - Verifies that the `people` all have user IDs and profile documents.
   - Verifies that the pupil (the user whose profile document was referenced in
     the given `request` Firestore document path) is within the `people`.
   - Verifies that the parent (the owner of the given `id`) is actually the
     pupil's parent (i.e. the `person` whose profile document was referenced
     in the given `request` Firestore document path has the given `id` in their
     profile's `parents` field).
   - Verifies that the requested `Timeslot` is within all of the `person`'s
     availability (by reading each `person`'s Firestore profile document).
   - Verifies that the requested `subjects` are included in each of the tutors'
     Firestore profile documents (where a tutor is defined as an `person` whose
     `roles` include `tutor`).
4. Deletes the old `request` documents.
5. Creates a new `match` document containing the request body in each of the
   `person`'s Firestore `matches` subcollection.
6. Updates each `person`'s availability (in their Firestore profile document)
   to reflect this appointment (i.e. remove the appointment's `time` from their
   availability).
7. Sends each of the `match`'s `person`'s an email containing instructions for
   how to access their Bramble virtual-tutoring room.

##### Response

The created appointment object (that includes the ID of the Firestore
documents).
