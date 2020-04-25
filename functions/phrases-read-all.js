/* Import faunaDB sdk */
const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
})

exports.handler = async (event, context) => {
  console.log('Function `read-all` invoked')
  const { round } = event.queryStringParameters
  return client
    // TODO: Add filters for game ID and round
    .query(q.Paginate(q.Match(q.Ref('indexes/all_phrases'))))
    .then(response => {
      const itemRefs = response.data
      // console.log('itemRefs', itemRefs)
      // create new query out of item refs. http://bit.ly/2LG3MLg
      const getAllPhrasesDataQuery = itemRefs.map(ref => {
        return q.Get(ref)
      })
      // then query the refs
      return client.query(getAllPhrasesDataQuery).then(ret => {
        const data = ret.map(item => {
          return {
            id: item.ref.id,
            phrase: item.data.phrase,
            round: item.data.round
          }
        })
        return {
          statusCode: 200,
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
