# SkyRoute — agence de voyages en ligne

Application complète de réservation de vols internationaux : recherche, comparaison, réservation
multi-passagers, paiement, billet électronique, annulation avec remboursement, et une zone
d'administration couvrant l'ensemble du référentiel.

Tout fonctionne réellement : les données vivent dans une base MongoDB, les places sont
décomptées à la réservation et rendues à l'annulation, les prix sont calculés et les règles métier
(âges, passeports, capacité des appareils, quota d'administrateurs) sont appliquées côté serveur.

## Démarrage

Il faut un serveur MongoDB accessible : une installation locale (`mongodb://127.0.0.1:27017`,
la valeur par défaut) ou un cluster MongoDB Atlas.

```bash
npm install
npm run setup     # crée .env.local avec un SESSION_SECRET aléatoire
npm run dev       # http://localhost:3000
```

Pour viser un autre serveur, renseignez `MONGODB_URI` (et éventuellement `MONGODB_DB`) dans
`.env.local` :

```
MONGODB_URI=mongodb+srv://<utilisateur>:<motdepasse>@<cluster>.mongodb.net
MONGODB_DB=skyroute
```

Au premier démarrage, la base `skyroute` est créée, indexée et peuplée automatiquement : 35 pays,
55 aéroports, 27 compagnies, 10 types d'appareils et environ 53 000 vols répartis sur les 28 jours
à venir, plus deux comptes de démonstration.

### Comptes de démonstration

| Rôle | Identifiant | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@skyroute.fr` | `Admin@2026` |
| Client | `client@skyroute.fr` | `Client@2026` |

### Connexion avec Google (facultatif)

Le bouton « Continuer avec Google » n'apparaît sur `/connexion` et `/inscription` que si un client
OAuth est configuré :

1. Dans la [console Google Cloud](https://console.cloud.google.com/apis/credentials), renseigner
   l'écran de consentement OAuth, puis créer un **ID client OAuth** de type « Application Web ».
2. Ajouter l'URI de redirection autorisé, qui doit correspondre exactement à `APP_URL` :
   `http://localhost:3000/api/auth/google/callback`.
3. Compléter `.env.local` :

```bash
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
APP_URL=http://localhost:3000
```

Le flux utilise le code d'autorisation avec PKCE ; l'`id_token` renvoyé est vérifié contre les clés
publiques de Google. Si l'adresse Google correspond à un compte existant, le compte est simplement
lié ; sinon un compte est créé sans mot de passe et la section « Sécurité » du profil l'indique.

### Email de confirmation (SMTP)

L'email part dès qu'une réservation est payée. Il faut pour cela un compte SMTP ; avec Gmail :

1. Activer la validation en deux étapes sur le compte Google.
2. Créer un **mot de passe d'application** sur <https://myaccount.google.com/apppasswords> (le mot
   de passe habituel du compte est refusé par le serveur SMTP).
3. Compléter `.env.local` :

```bash
SMTP_USER=votre.adresse@gmail.com
SMTP_PASS=les16caracteres
MAIL_FROM=SkyRoute <votre.adresse@gmail.com>
APP_URL=http://localhost:3000
```

Sans ces variables, la réservation aboutit normalement et un avertissement est écrit dans la
console à la place de l'envoi. Le gabarit se relit dans un navigateur, sans rien envoyer, sur
`/api/emails/reservation/<REFERENCE>` (réservé au titulaire du dossier et aux administrateurs).

## Fonctionnalités

### Espace public

- **Recherche de vols** par aéroport de départ et d'arrivée (autocomplétion sur la ville, le nom ou
  le code IATA), date, classe et composition du groupe (adultes, enfants, bébés).
- **Aller simple ou aller-retour** : en aller-retour, l'aller puis le retour se choisissent
  séparément et un récapitulatif affiche le total avant de continuer.
- **Filtres et tri** par compagnie, prix maximum, prix croissant, durée ou heure de départ.
- **Calendrier de prix** sur ±3 jours pour repérer une date moins chère.
- **Fiches destinations** par pays : aéroports desservis, monnaie, indicatif, fuseau horaire,
  formalités d'entrée et meilleurs tarifs au départ de Paris.
- **Aide, franchises bagages et conditions générales de vente.**

### Réservation

- Saisie d'un passager par siège, avec type (adulte / enfant / bébé), état civil, nationalité et
  passeport. Les âges sont vérifiés contre le type déclaré et les passeports expirés sont refusés.
- Tarification : plein tarif adulte, −25 % enfant, 10 % bébé, puis 12 % de taxes et 22 € de
  redevances par passager et par segment. Le détail est affiché avant paiement.
- Paiement par carte (validation de Luhn, date d'expiration et cryptogramme), PayPal ou virement.
- Attribution automatique d'un siège par passager selon la cabine ; les bébés voyagent sur les
  genoux et n'occupent pas de place.
- Billet électronique imprimable avec référence de dossier à six caractères, sièges, horaires,
  franchise bagages et historique des transactions.
- **Email de confirmation** envoyé automatiquement à l'adresse de contact dès la réservation payée :
  référence, vols aller et retour, passagers, sièges, détail du prix et lien vers le dossier.
- Annulation en ligne : remboursement intégral à plus de 7 jours du départ, 50 % entre 7 jours et
  24 heures, aucun ensuite. Les sièges libérés repartent immédiatement à la vente.

### Espace client

- Profil modifiable et changement de mot de passe.
- Voyages à venir et historique, avec accès direct à chaque billet.

### Administration

- **Tableau de bord** : chiffre d'affaires par mois, lignes les plus réservées, panier moyen,
  passagers transportés, dernières réservations et dernières opérations.
- **Vols** : création, modification, changement de statut, suppression, recherche et filtres
  (compagnie, statut, période), pagination. La distance, la durée et l'heure d'arrivée locale sont
  calculées automatiquement à partir des aéroports et de l'appareil.
- **Réservations** : recherche, filtre par statut, changement de statut et annulation avec
  remboursement.
- **Utilisateurs** : création, modification, changement de rôle, suspension, suppression. Le dernier
  administrateur actif ne peut être ni suspendu ni supprimé ni rétrogradé.
- **Référentiel** : pays, aéroports, compagnies et flotte, avec garde-fous d'intégrité (un élément
  encore référencé ne peut pas être supprimé).
- **Journal** des opérations (connexions, réservations, modifications, suppressions).

## Architecture

```
app/          routes (App Router) — pages publiques, espace client, administration, API
actions/      Server Actions : authentification, réservation, administration
components/   composants d'interface, serveur et client
lib/          connexion MongoDB, session, règles métier
lib/mongodb.ts  client, collections, séquences d'identifiants, index, transactions
lib/queries/  accès aux données par domaine
lib/emails/   gabarits HTML et texte des emails transactionnels
scripts/      utilitaires de développement
```

- **Next.js 16 (App Router)** avec React Server Components et Server Actions ; toutes les mutations
  passent par une action serveur qui revalide sa session avant d'agir.
- **MongoDB via le pilote officiel `mongodb`**. Une collection par entité, et les contraintes que
  le schéma SQL exprimait en `UNIQUE` sont des index uniques créés au démarrage
  (`lib/mongodb.ts`). Les documents gardent une clé numérique (`_id`) distribuée par une
  collection `counters`, l'équivalent d'un `AUTOINCREMENT`.
- **Intégrité des réservations** : sur un replica set, la réservation et l'annulation s'exécutent
  dans une transaction. Sur un `mongod` autonome, qui ne les propose pas, chaque écriture
  enregistre son annulation et une erreur les rejoue à l'envers. Dans les deux cas le décompte des
  places est un `$inc` conditionné par `$gte` : une place ne peut pas être vendue deux fois.
  MongoDB n'ayant pas de clés étrangères, les cascades et les suppressions interdites du schéma
  SQL sont appliquées dans `lib/queries/` (voir `deleteUser` et les fonctions `*Usage`).
- **Sessions** signées en JWT (`jose`) dans un cookie `httpOnly`, `sameSite=lax`, `secure` en
  production. `proxy.ts` effectue un filtrage optimiste des routes, mais l'autorisation réelle est
  vérifiée à chaque page et à chaque action via la couche d'accès aux données (`lib/dal.ts`), qui
  relit le compte en base — un compte suspendu perd l'accès immédiatement.
- **Mots de passe** hachés avec `scrypt` et un sel aléatoire par utilisateur, comparés en temps
  constant.
- **Validation** des formulaires avec Zod, côté serveur, avec messages d'erreur par champ.
- **Tailwind CSS 4** avec thème clair/sombre (préférence système ou choix manuel mémorisé).

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm start` | serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm run setup` | génère `.env.local` |
| `npm run db:reset` | supprime la base MongoDB ; elle est recréée et repeuplée au démarrage suivant |

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `MONGODB_URI` | chaîne de connexion MongoDB (défaut : `mongodb://127.0.0.1:27017`) |
| `MONGODB_DB` | nom de la base (défaut : `skyroute`) |
| `SESSION_SECRET` | clé de signature des sessions, 32 caractères minimum (obligatoire) |
| `GOOGLE_CLIENT_ID` | identifiant client OAuth Google (facultatif : active le bouton « Continuer avec Google ») |
| `GOOGLE_CLIENT_SECRET` | secret client OAuth Google |
| `SEED_DAYS` | nombre de jours de vols générés au premier démarrage (28 par défaut) |
| `SMTP_USER` | compte SMTP expéditeur, par exemple une adresse Gmail |
| `SMTP_PASS` | mot de passe d'application du compte SMTP |
| `SMTP_HOST` | serveur SMTP (`smtp.gmail.com` par défaut) |
| `SMTP_PORT` | port SMTP (`465` par défaut, TLS implicite ; `587` pour STARTTLS) |
| `SMTP_SECURE` | force le TLS implicite (`true` / `false`) ; déduit du port sinon |
| `MAIL_FROM` | expéditeur affiché (`SkyRoute <adresse>` par défaut) |
| `APP_URL` | base des liens des emails et origine de l'URI de redirection Google (`http://localhost:3000` par défaut) |

`.env.example` regroupe ces variables prêtes à compléter.

## Notes

Il s'agit d'un projet de démonstration : aucun paiement réel n'est effectué. Les transactions,
remboursements et billets sont enregistrés dans la base locale. Seul l'email de confirmation part
réellement, et uniquement si un compte SMTP est configuré.
