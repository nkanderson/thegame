/* Import faunaDB sdk */
const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
})

exports.handler = async (event, context) => {
  console.log('Function `read-all` invoked for game resource')
  // For now, we're just returning the first game.
  // Eventually this will return all games again, but that will
  // be later, once we've set up unique game URLs.
  return client
    .query(q.Paginate(q.Match(q.Ref('indexes/all_games'))))
    .then(response => {
      const itemRefs = response.data
      // create new query out of item refs. http://bit.ly/2LG3MLg
      const getAllGamesDataQuery = itemRefs.map(ref => {
        return q.Get(ref)
      })
      // then query the refs
      return client.query(getAllGamesDataQuery).then(ret => {
        console.log(ret)
        // const data = {
        //   // id: ret[0].ref['@ref'].id,
        //   maxPhrases: ret[0].data.maxPhrases,
        //   round: ret[0].data.round,
        // }
        const data = ret.map(game => {
          return {
            id: game.ref.id,
            maxPhrases: game.data.maxPhrases,
            round: game.data.round,
          }
        })
        console.log(data)
        return {
          statusCode: 200,
          // body: JSON.stringify(ret)
          body: JSON.stringify(data)
        }
      })
    })
    .catch(error => {
      console.log('error', error)
      return {
        statusCode: 400,
        body: JSON.stringify(error)
      }
    })
}
