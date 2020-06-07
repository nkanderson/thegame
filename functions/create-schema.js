#!/usr/bin/env node

/* bootstrap database in your FaunaDB account - use with `netlify dev:exec <path-to-this-file>` */
const faunadb = require('faunadb')

const q = faunadb.query

async function createFaunaDB() {
  if (!process.env.FAUNADB_SERVER_SECRET) {
    console.log('No FAUNADB_SERVER_SECRET in environment, skipping DB setup')
  }
  console.log('Create the schema!')
  const client = new faunadb.Client({
    secret: process.env.FAUNADB_SERVER_SECRET
  })

  // Running this via `netlify dev:exec functions/api/create-schema.js` or
  // `netlify dev:exec node functions/api/create-schema.js`
  // seems to hit a cache or data stored somewhere that's not accessible
  // to or visible in the fauna shell or console.
  // Only thing I could find that seemed remotely related: https://community.netlify.com/t/netlify-functions-create-fauna-w-graphql-option-does-not-show-up-in-the-faunadb-dashboard/4439/12
  let collections = null;
  try {
    collections = await client.query(
      q.Paginate(q.Collections())
    )
  } catch(e) {
    console.error(e)
  }
  console.log('Existing collections:', collections.data);
  let indexes = null;
  try {
    indexes = await client.query(
      q.Paginate(q.Indexes())
    )
  } catch(e) {
    console.error(e)
  }
  console.log('Existing indexes:', indexes.data);

  try {
    let phrasesColl = await client.query(q.IsCollection(q.Collection('phrases')))
    if (!phrasesColl) {
      let collection = await client.query(q.CreateCollection({ name: 'phrases' }))
      console.log('Created phrases collection: ', collection)
      await client.query(q.CreateIndex({
        name: 'all_phrases',
        source: q.Ref('classes/phrases'),
        active: true
      }))
    }
  } catch(e) {
    if (e.requestResult.statusCode === 400 && e.message === 'instance not unique') {
      console.log('Duplicate instance in schema')
    }
    console.error(e)
  }

  // TODO: Should create phrases_by_gameID index as well.
  try {
    let gamesColl = await client.query(q.IsCollection(q.Collection('games')))
    if (!gamesColl) {
      let collection = await client.query(q.CreateCollection({ name: 'games' }))
      console.log('Created games collection: ', collection)
      await client.query(q.Create(q.Ref('indexes'), {
          name: 'all_games',
          source: q.Ref('classes/games'),
          active: true
        })
      )
    }
  } catch(e) {
    if (e.requestResult.statusCode === 400 && e.message === 'instance not unique') {
      console.log('Duplicate instance in schema')
    }
    console.error(e)
  }
}

createFaunaDB()
