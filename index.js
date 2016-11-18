var methodToOpVerb = {
  get: 'get',
  post: 'create',
  put: 'update',
  delete: 'delete'
}

function pathToOperationID (path, method) {
  var resourceName = path.replace(':', '').split('/').filter(Boolean).map(w => `${w.charAt(0).toUpperCase()}${w.substr(1)}`).join('')
  if (path === '/') {
    resourceName = 'Index'
  }
  var verb = methodToOpVerb[method]
  return verb + resourceName
}

function layerToPath (layer) {
  var parameters = []
  for (var i = 0; i < layer.keys.length; i++) {
    var key = layer.keys[i]
    parameters.push({
      name: key.name,
      required: !key.optional,
      type: 'string',
      in: 'query'
    })
  }

  var ops = {}
  for (var method in layer.route.methods) {
    ops[method] = {
      operationId: pathToOperationID(layer.route.path, method),
      responses: {
        200: {
          description: 'sehr gut'
        },
        400: {
          description: 'not my fault'
        },
        500: {
          description: 'nicht sehr gut'
        }
      },
      parameters: parameters
    }
  }

  return ops
}

function spec (app, name, version, host) {
  var layers = []
  for (var i = 0; i < app._router.stack.length; i++) {
    var layer = app._router.stack[i]
    if (layer.route) {
      layers.push(layer)
    }
  }

  var paths = {}
  for (i = 0; i < layers.length; i++) {
    layer = layers[i]
    // Convert the /foo/:bar syntax to /foo/{bar}
    var path = layer.route.path.replace(/:([^\/]+)(\/|$)/, '{$1}/')
    paths[path] = layerToPath(layer)
  }

  return {
    swagger: '2.0',
    info: {
      title: name,
      version: version
    },
    host: host,
    consumes: ['application/json'],
    produces: ['application/json'],
    schemes: ['https'],
    paths: paths
  }
}

function handleJSON (name, version, host) {
  return function (req, res) {
    try {
      var swaggerSpec = spec(req.app, name, version, host)
      res.status(200)
        .json(swaggerSpec)
        .end()
    } catch (e) {
      res.status(500)
        .json({
          message: 'could not make swagger spec',
          err: e
        })
    }
  }
}

module.exports = {
  spec: spec,
  json: handleJSON
}
