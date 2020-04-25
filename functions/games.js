/* eslint-disable */
exports.handler = async (event, context) => {
  const path = event.path.replace(/\.netlify\/functions\/[^\/]+/, '')
  const segments = path.split('/').filter(e => e)

  switch (event.httpMethod) {
    case 'GET':
      // e.g. GET /.netlify/functions/games
      if (segments.length === 0) {
        return require('./games-read-all').handler(event, context)
      }
      // e.g. GET /.netlify/functions/games/123456
      if (segments.length === 1) {
        event.id = segments[0]
        return require('./games-read').handler(event, context)
      } else {
        return {
          statusCode: 500,
          body:
            'too many segments in GET request, must be either /.netlify/functions/games or /.netlify/functions/games/123456'
        }
      }
    case 'POST':
      // e.g. POST /.netlify/functions/games with a body of key value pair objects, NOT strings
      return require('./games-create').handler(event, context)
    case 'PUT':
      // e.g. PUT /.netlify/functions/games/123456 with a body of key value pair objects, NOT strings
      if (segments.length === 1) {
        event.id = segments[0]
        return require('./games-update').handler(event, context)
      } else {
        return {
          statusCode: 500,
          body: 'invalid segments in POST request, must be /.netlify/functions/games/123456'
        }
      }
    case 'DELETE':
      // e.g. DELETE /.netlify/functions/games/123456
      // TODO: Implement delete
      return {
        statusCode: 400,
        body: 'No DELETE method available for /.netlify/functions/games'
      }
      // if (segments.length === 1) {
      //   event.id = segments[0]
      //   return require('./games-delete').handler(event, context)
      // } else {
      //   return {
      //     statusCode: 500,
      //     body: 'invalid segments in DELETE request, must be /.netlify/functions/games/123456'
      //   }
      // }
  }
  return {
    statusCode: 500,
    body: 'unrecognized HTTP Method, must be one of GET/POST/PUT/DELETE'
  }
}
