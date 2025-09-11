import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Serve the OpenAPI YAML file
router.get('/openapi.yaml', (req, res) => {
  const yamlPath = path.join(__dirname, '../../docs/api-docs.yaml');
  
  if (fs.existsSync(yamlPath)) {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.sendFile(yamlPath);
  } else {
    res.status(404).json({
      status: 'error',
      message: 'API documentation not found'
    });
  }
});

// Serve basic HTML swagger UI
router.get('/', (req, res) => {
  const swaggerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evently API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api-docs/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add Authorization header if token exists in localStorage
          const token = localStorage.getItem('authToken');
          if (token) {
            request.headers['Authorization'] = 'Bearer ' + token;
          }
          return request;
        }
      });
    };
  </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHTML);
});

export default router;
