/* Import faunaDB sdk */
const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
})

exports.handler = async (event, context) => {
  const id = event.id
  console.log(`Function 'read' invoked for game resource. Read id: ${id}`)
  return client
    .query(q.Get(q.Ref(`classes/games/${id}`)))
    .then(response => {
      console.log('success', response)
      const data = {
        id: response.ref.id,
        maxPhrases: response.data.maxPhrases,
        round: response.data.round,
      }
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      }
    })
    .catch(error => {
      console.log('error', error)
      return {
        statusCode: 400,
        body: JSON.stringify(error)
      }
    })
}
