/* eslint-disable no-undef */
const httpProxyMiddleware = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        '/uploads',
        httpProxyMiddleware.createProxyMiddleware({
          target: 'http://localhost:8080',
          changeOrigin: true,
        })
      );
};