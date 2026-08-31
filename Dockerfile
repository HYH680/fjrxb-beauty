### Next.js (output: "standalone") - ai-supermarket
FROM node:22-slim AS builder

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# 运行时确保 sqlite schema 已创建（需要 DATABASE_URL）
CMD ["sh", "-c", "npx prisma db push && node server.js"]

