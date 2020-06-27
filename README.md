# the game

Uses Faunadb and Netlify to create a 4-round version of "the game". Current status is playable using multiple clients.

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

## Playing `the game`

This is a multi-player, multi-round game, where each player begins by submitting 3 phrases. Players then rotate through, taking 45-second turns where they attempt to get the other players to guess each phrase they are randomly presented with. A round ends when all phrases have been successfully guessed.

During the first round, a player attempts to get others to guess phrases by describing them using any words that are not contained in the phrase, similar to the game Taboo. Using "rhymes with" or saying a forbidden word in another language is discouraged, but house rules may apply.

In the second round, players act out each phrase they are presented with, similar to the game Charades. Sounds and gestures are allowed, words are discouraged.

In the third and final round, players choose a single word to describe each phrase. Because all of the phrases have been guessed during each of the previous two rounds, players should be relatively familiar with the phrases, making it easier to guess as the clues become more difficult or obscure.

An optional fourth round is often played, through this hasn't been implemented yet in this online version. This round often varies, but clues usually involves something ridiculous, like a facial expression or a sound.
