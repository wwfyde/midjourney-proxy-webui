FROM node:18  AS builder

ENV TZ=Asia/Shanghai

WORKDIR /app

COPY . .
RUN npm config set registry https://registry.npmmirror.com

RUN corepack enable && corepack prepare yarn@4 --activate && yarn config set nodeLinker node-modules && yarn install

RUN yarn build



FROM nginx
ENV TZ=Asia/Shanghai

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8001
EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]



