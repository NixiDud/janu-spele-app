JĀŅU SPĒĻU APP - FIXED BUILD

Kas ir iekšā šajā versijā:
- Vārda ievade
- Admin PIN logs (1234)
- 5 spēļu augšējās ikonas
- 1. spēle: orientēšanās ar 11 punktiem, burtu ievade, pārbaude, laiks
- 1. spēles 2. daļa: teikuma minēšana ar lock funkciju
- 2. spēle: disku golfs ar 3 groziem, PAR aprēķins, rezultātu saraksts
- 3., 4., 5. spēlei ir tukšas lapas

Labojumi šajā buildā:
- Noņemta agresīvā touch/mousedown preventDefault loģika, kas varēja traucēt pogu nospiešanu telefonā
- Disku golfa score ievadē vairs netiek pārzīmēts viss ekrāns pie katra cipara
- Pievienota assets mape ar bildēm, lai projekts būtu pilns un uzreiz palaižams

Svarīgi:
- Šī versija glabā datus TIKAI konkrētajā ierīcē (localStorage).
- Tāpēc kopīgs leaderboard visiem telefoniem šeit vēl nav.

Kā palaist ļoti vienkārši:
1) Atver šo mapi VS Code.
2) Uzinstalē paplašinājumu "Live Server" VAI augšupielādē failus uz Vercel / Netlify.
3) Atver index.html ar Live Server.

Ko vari ātri mainīt pati:
- Admin PIN: app.js sākumā -> const ADMIN_PIN = '1234';
- Teikums: const PHRASE = 'KUR UGUNS, TUR JĀŅI.';
- Burti 1-11: const ORIENTATION_TARGET = { ... }

Ieteicamais nākamais solis:
- pielikt kopīgu online datubāzi leaderboardam un admin vadībai
- pievienot 3., 4. un 5. spēles saturu
