# `scripts/backups` 

**This is deprecated. I will be replacing these with SQL utilities to backup our
Supabase PostgreSQL database eventually.**

Included in this directory are locally stored (not backed up to GitHub for
obvious privacy reasons) Firestore backup JSON files created with [this command
line tool](https://www.npmjs.com/package/node-firestore-import-export).

Filenames indicate the start time of the backup and are as follows:

```
MM-DD-YYYY-HR:MIN-AM/PM.json
```

First, install the necessary dependencies to backup your Firestore database:

```commandline
$ npm i
```

To take a snapshot of the data in the default GCP project's database and save it
in JSON format run the following from this directory:

```commandline
$ npx firestore-export -a ../admin-cred.json -b MM-DD-YYYY-HR:MIN-AM/PM.json -p
```

To upload a JSON snapshot and overwrite the data in the default GCP project's
database (again, this must be run in the `utils/firestore` directory):

```commandline
$ npx firestore-import -a ../admin-cred.json -b MM-DD-YYYY-HR:MIN-AM/PM.json
```
