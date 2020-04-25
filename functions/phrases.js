/* eslint-disable */
exports.handler = async (event, context) => {
  const path = event.path.replace(/\.netlify\/functions\/[^\/]+/, '')
  const segments = path.split('/').filter(e => e)

  // To add filters, get params from event.queryStringParameters, e.g.
  // const qs = event.queryStringParameters
  // or with destructuring
  // const { round } = event.queryStringParameters

  switch (event.httpMethod) {
    case 'GET':
      // e.g. GET /.netlify/functions/phrases
      if (segments.length === 0) {
        return require('./phrases-read-all').handler(event, context)
      }
      // e.g. GET /.netlify/functions/phrases/123456
      if (segments.length === 1) {
        event.id = segments[0]
        return require('./phrases-read').handler(event, context)
      } else {
        return {
          statusCode: 500,
          body:
            'too many segments in GET request, must be either /.netlify/functions/phrases or /.netlify/functions/phrases/123456'
        }
      }
    // TODO: request validator helper?
    case 'POST':
      // e.g. POST /.netlify/functions/phrases with a body of key value pair objects, NOT strings
      if (event.body === '{}') {
        return {
          statusCode: 400,
          body: 'Request to create new phrase resource must contain body'
        }
      }
      return require('./phrases-create').handler(event, context)
    case 'PUT':
      // e.g. PUT /.netlify/functions/phrases/123456 with a body of key value pair objects, NOT strings
      if (segments.length === 1) {
        event.id = segments[0]
        return require('./phrases-update').handler(event, context)
      } else {
        return {
          statusCode: 500,
          body: 'invalid segments in POST request, must be /.netlify/functions/phrases/123456'
        }
      }
    case 'DELETE':
      // e.g. DELETE /.netlify/functions/phrases/123456
      if (segments.length === 1) {
        event.id = segments[0]
        return require('./phrases-delete').handler(event, context)
      } else {
        return {
          statusCode: 500,
          body: 'invalid segments in DELETE request, must be /.netlify/functions/phrases/123456'
        }
      }
  }
  return {
    statusCode: 500,
    body: 'unrecognized HTTP Method, must be one of GET/POST/PUT/DELETE'
  }
}
