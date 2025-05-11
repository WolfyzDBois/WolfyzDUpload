## WolfyzDUpload

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