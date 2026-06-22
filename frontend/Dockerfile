# Stage 1: build React static assets (REACT_APP_* must be set at build time)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY public ./public
COPY src ./src
COPY tailwind.config.js postcss.config.js ./

ARG REACT_APP_API_BASE_URL
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_FACEBOOK_APP_ID
ARG REACT_APP_RECAPTCHA_SITE_KEY
ARG REACT_APP_RECAPTCHA_VERIFY_ENABLED=true
ARG REACT_APP_ADMIN_EMAILS

ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL \
    REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID \
    REACT_APP_FACEBOOK_APP_ID=$REACT_APP_FACEBOOK_APP_ID \
    REACT_APP_RECAPTCHA_SITE_KEY=$REACT_APP_RECAPTCHA_SITE_KEY \
    REACT_APP_RECAPTCHA_VERIFY_ENABLED=$REACT_APP_RECAPTCHA_VERIFY_ENABLED \
    REACT_APP_ADMIN_EMAILS=$REACT_APP_ADMIN_EMAILS \
    CI=true

RUN npm run build

# Stage 2: serve SPA with Nginx
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
