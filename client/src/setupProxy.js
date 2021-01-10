/* eslint-disable no-undef */
const httpProxyMiddleware = require('http-proxy-middleware');
const port = process.env.APP_PORT || process.env.PORT || 8080

module.exports = function(app) {
    app.use(
        '/uploads',
        httpProxyMiddleware.createProxyMiddleware({
          target: `http://localhost:${ port }`,
          changeOrigin: true,
        })
      );
};