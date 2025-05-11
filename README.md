## WolfyzDUpload

### Deploy with Docker

```sh
git clone git@github.com:WolfyzDBois/WolfyzDUpload.git
cd WolfyzDUpload/script
chmod +x deploy.sh stop.sh restart.sh
./deploy.sh
```

You can use restart and stop to start and stop the bot. 

1. Clone this repositorie or download archive

2. Install dependecies

```sh
npm install
```

3. Change configuration (with .env.example file)

You can find user.json for the configuration of allowed people to use the bot. 


4. Start the bot 

You need to deploy command the first thing (and if you add option in the command or new commands)

```sh
node dist/deploy-command.js
```

```sh
node dist/index.js
```

## Dev

You can find the code in `src/` folder.

To execute the bot without build (in TS) : 

For build : 

```sh
npx tsc
```