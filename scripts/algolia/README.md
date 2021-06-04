# `scripts/algolia` 

These are utilities to update our `subjects` Algolia search index. This is the
index that stores all of the subjects that users can select via the
`SubjectSelect`.

To update the `subjects` search index:

1. Modify `subjects.csv` with your updated subjects.
2. Clear the search index using Algolia's search console UI.
3. Ensure that you have the proper API keys in the repository level `.env` file.
4. And then run the following to push the content of `subjects.csv` to the
   search index:

```
$ node create-algolia-index.js
```
