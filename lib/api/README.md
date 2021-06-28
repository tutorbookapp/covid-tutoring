# API Implementation

These directories contain the core of our back-end API implementation:

1. The actual API route definitions are housed in the `routes/` directory.
2. All API route logic is packaged neatly into reusable "component" functions
   which are organized into the `update/`, `create/`, `verify/`, or `get/`
   directories (depending on the component type; see below for more info).

## API Route Definitions

The actual API route definitions merely import and call a series of "component"
functions in a certain order.

For example, this could be the definition of the `POST /api/users` endpoint:

```typescript
export type CreateUserRes = UserJSON;

export default async function createUser(
  req: Req,
  res: Res<CreateUserRes>
): Promise<void> {
  try {
    const body = verifyBody<User, UserJSON>(req.body, isUserJSON, User);
    const user = await createUserDoc(await createAuthUser(body));
    await createUserNotification(user);
    res.status(201).json(user);
  } catch (e) {
    handle(e, res);
  }
}
```

There are a couple of things to break down here:

### `verify`

These are high-level route components that perform checks on the API requests
and the data that those requests will create, fetch, or modify.

Typically, these will return `void` or throw an `APIError` when the request is
invalid.

### `get`

These route components are rather heterogeneous and can perform a variety of
different reusable actions:

1. Fetch data from our database or other external sources.
2. Filter or other manipulate given data (e.g. `getPeople` from a `Match`).

Again, like all API route components, these will throw an `APIError` if anything
invalid is detected.

### `update`

These route components update (modify) existing resources (e.g. a user's
database document and Algolia search index object).

### `create`

These route components create resources or enact other side-effects (e.g.
sending notification emails like the example included above).

**Note:** These are the only route components (along with the `update` route
components) that should create lasting side-effects (e.g. storing data or
sending emails).
