# syntax=docker/dockerfile:1

# 1단계: 정적 파일 빌드
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
# MSW 워커는 개발 모드 전용이라 이미지에 넣지 않는다
RUN pnpm build && rm -f dist/mockServiceWorker.js

# 2단계: nginx가 dist를 서빙하고 /api를 백엔드로 프록시
FROM nginxinc/nginx-unprivileged:1.29-alpine
# 시작 시 envsubst로 템플릿의 ${BACKEND_URL}을 채운다
ENV BACKEND_URL=http://simple-cal-backend:8080
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
