FROM oven/bun:1.3.4-slim@sha256:54dc37bcf06b0915e35f45cd9bbb43172756be405dc95fa5512ce6689fabc4af

COPY ./ ./

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && bun install && apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/entrypoint.sh"]
