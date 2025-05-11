Voici la nouvelle infrastructure et le déplacement des fichiers : 
- Déplacement de dossier : ./config deviens ./src/config

- ./src/delete_redirect devient ./src/links/delete, la commande sur Discord sera links_delete
- ./src/list_redirect devient ./src/inks/list, la commande sur Discord sera links_list
- ./src/redirect devient ./src/inks/index, la commande sur Discord sera links

- ./src/tag_create devient ./src/messages/create, , la commande sur Discord sera messages_create
- ./src/tag_delete devient ./src/messages/delete, la commande sur Discord sera messages_delete
- ./src/tag_list devient ./src/messages/list, la commande sur Discord sera messages_list
- ./src/tag devient ./src/messages/index, la commande sur Discord sera messages

./src/delete devient ./src/upload/delete, la commande sur Discord sera upload_delete
./src/list devient ./src/upload/list, la commande sur Discord sera upload_list
./src/upload devient ./src/upload/index, la commande sur Discord sera upload_index

./src/stop devient ./src/utils/stop, la commande sur Discord sera stop
./src/stop devient ./src/utils/info, la commande sur Discord sera info

Tout les logs sur Discord deviennent des embeds, avec un titre et un émoji, ainsi qu'une couleur approprié (rouge pour les erreurs, vert pour la création de quelque chose, orange pour la suppression de quelque chose, gris pour une commande lambda, bleu pour les logs type démarrage et arrêt
Ajoute beaucoup plus de log, avec les erreurs, par exemple
Tout le bot doit être intégrallement en anglais, que ce soit dans le code et sur Discord