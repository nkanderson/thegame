const faunadb = require('faunadb')

/* configure faunaDB Client with our secret */
const q = faunadb.query
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
})

/* export our lambda function as named "handler" export */
exports.handler = async (event, context) => {
  /* parse the string body into a useable JS object */
  const data = JSON.parse(event.body)
  console.log('Function `create` invoked', data)
  // TODO: May want to modify so gameID is validated and stored
  // as a reference to game, rather than just the string
  const item = {
    data: data
  }
  /* construct the fauna query */
  return client
    .query(q.Create(q.Ref('classes/phrases'), item))
    .then(response => {
      console.log('success', response)
      /* Success! return the response with statusCode 200 */
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
      /* Error! return the error with statusCode 400 */
      return {
        statusCode: 400,
        body: JSON.stringify(error)
      }
    })
}
