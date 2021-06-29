# `scripts/lib`

Modules that are not to be run by themselves but are reused across many of our
utility scripts (e.g. the Firebase Admin SDK is initialized once in
`scripts/lib/firebase.js` and then imported in many different places).
