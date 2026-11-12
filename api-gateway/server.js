const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const REGISTRATION_URL = process.env.REGISTRATION_URL || 'http://127.0.0.1:3001';
const UPDATE_URL = process.env.UPDATE_URL || 'http://127.0.0.1:3002';

// Route by method + path: PUT -> update service, everything else -> registration
app.use('/api', createProxyMiddleware({
  target: REGISTRATION_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  router: (req) => (req.method === 'PUT' ? UPDATE_URL : REGISTRATION_URL),
}));

app.get('/health', (req, res) => res.json({ status: 'API Gateway running' }));

app.listen(3000, () => console.log('API Gateway listening on port 3000'));