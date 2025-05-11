## Init 

```sh
npm init -y
npm install discord.js @discordjs/rest dotenv basic-ftp
npm install -D typescript ts-node @types/node
npx tsc --init
```

## Execute 
```sh
chmod +x *.sh       # Donne les droits d'exécution une seule fois
./install.sh        # Installe et déploie les commandes
./start.sh          # Lance le bot
./build.sh          # Compile le projet
```

```ts
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```