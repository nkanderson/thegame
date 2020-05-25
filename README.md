# the game

Uses Faunadb and Netlify to create a 4-round version of "the game". Current status is playable in single browser.

Next up TODO: allow multi-browser play by creating per-game URLs.

## Deploy

Unbundled js functions in Netlify require [manual deployment](https://docs.netlify.com/cli/get-started/#unbundled-javascript-function-deploys).

First build locally:
```
netlify build
```

Then deploy a preview:
```
netlify deploy
```


Or directly to prod:
```
netlify deploy --prod
```

## Secrets

The `FAUNADB_SERVER_SECRET` for production is set in the Netlify dashboard. For local development, it may be set in `.env` or via the command line.
