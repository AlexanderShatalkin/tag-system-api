# Tagging system
- **Runtime:** Bun
- **Web framework:** Elysia
- **ORM:** Prisma
- **DB:** PostgreSQL
# Install
## Bun
macOS | Linux 
```
curl -fsSL https://bun.com/install | bash
```
windows
```
powershell -c "irm bun.sh/install.ps1|iex"
```
  npm
  ```
  npm install -g bun
  ```

Check that Bun was installed successfully
```
bun --version
# Output: 1.x.y
```
## Getting Started
Install dependencies 
```
bun install
```

Create PostgreSQL database
```
createdb -U <user> <dbname>
#or
psql -U <user> -c "CREATE DATABASE dbname"
```

**optional** (restoring db from dump)
```
pg_restore -U <user> -d <dbname> dump.sql
```

Create .env file in the project root

| Name         | Description                  | Example                                          |
| ------------ | ---------------------------- | ------------------------------------------------ |
| DATABASE_URL | PostgreSQL connection string | postgresql://user:password@localhost:5432/dbname |
| GROQ_API_KEY | API key to LLM               |                                                  |
| PORT         | API port                     | 3000                                             |




import prisma db from scheme
```
bunx prisma migrate dev
#or
bunx prisma migrate deploy
```

Start server
```
bun run ./src/index.ts
```


## Development

To start the development server run:

```bash

bun run dev

```

  
Open http://localhost:3000/ with your browser to see the result.