/* Import faunaDB sdk */
const faunadb = require('faunadb')

const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
})

exports.handler = async (event, context) => {
  const data = JSON.parse(event.body)
  const id = event.id
  console.log(`Function 'update' invoked. update id: ${id}`)
  return client
    .query(q.Update(q.Ref(`classes/phrases/${id}`), { data }))
    .then(response => {
      console.log('success', response)
      const data = {
        id: response.ref.id,
        phrase: response.data.phrase,
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
