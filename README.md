## WolfyzDUpload

### Commands

/upload with file, or link, and name

### Deploy with Docker

```sh
git clone git@github.com:WolfyzDBois/WolfyzDUpload.git
cd WolfyzDUpload/script
chmod +x deploy.sh stop.sh restart.sh
mv .env.example .env
nano .env # configure the environment
# To edit the list of allowed users: nano user.json
./deploy.sh
```

You can use `restart.sh` and `stop.sh` to restart or stop the bot.

---

### Manual Deployment (without Docker)

1. Clone the repository or download the archive

2. Install dependencies:

```sh
npm install
```

3. Configure the environment

Copy `.env.example` to `.env`, then edit it.
You can also edit `user.json` to configure allowed user IDs.

4. Build the project (if not already built):

```sh
npx tsc
```

5. Deploy commands (once, or when modifying commands):

```sh
node dist/deploy-command.js
```

6. Start the bot:

```sh
node dist/index.js
```

---

## Development

Source code is located in the `src/` folder.

To run the bot without building (using TypeScript directly):

```sh
npx ts-node src/index.ts
```

To build the bot into the `dist/` folder:

```sh
npx tsc
```