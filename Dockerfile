FROM node:12-alpine
RUN apk add libreoffice
ENV NODE_ENV production
RUN mkdir /excel
WORKDIR /excel
COPY client client
COPY server server
WORKDIR client
RUN npm ci
RUN npm run build
WORKDIR ../server
RUN npm ci
CMD node lib/app.js