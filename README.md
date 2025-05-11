## WolfyzDUpload

### Commands

/upload with file, or link, and name

### Deploy with Workflows


1. Fork the repository

Click the **"Fork"** button on GitHub.



2. Set up your VPS

Make sure your server has:

- Docker installed
- SSH access enabled
- A directory ready to host the bot (e.g. `~/wolfyzupload`)

3. Generate an SSH key

Run this locally:

```bash
ssh-keygen -t rsa -b 4096 -C "github-deploy"
```

Then:

* Add **`~/.ssh/id_rsa.pub`** to `~/.ssh/authorized_keys` on your VPS
* Add **`~/.ssh/id_rsa`** as a **GitHub Action Secret** named `VPS_SSH_KEY`



4. Add GitHub secrets

In your forked repo, go to:

**Settings → Secrets and Variables → Actions → New repository secret**

Add:

| Name          | Value                |
| ------------- | -------------------- |
| `VPS_HOST`    | Your VPS IP          |
| `VPS_USER`    | SSH user (e.g. root) |
| `VPS_SSH_KEY` | Your SSH private key |

---

5. Push your changes

```bash
git add .
git commit -m "Update something"
git push origin main
```

GitHub will trigger the deploy workflow automatically.

---

## Deployment flow

1. Copy your bot files via `scp`
2. SSH into the VPS
3. Run `docker compose down && docker compose build && docker compose up -d`


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