# Versione Pro (acquisti in-app) — con RevenueCat

Il codice (`billing.js`) è pronto: gestisce **acquisto**, **ripristino** ed **entitlement**.
Manca solo la configurazione con i tuoi account. Uso **RevenueCat** perché è il modo più
semplice e affidabile per Play Billing.

## Cosa fa già l'app
- Sezione **Pro** in Impostazioni (visibile solo nell'app nativa): "Passa a Pro",
  "Ripristina acquisti", "Sblocca dettaglio max (video)".
- Se Pro è attivo → **niente pubblicità** e **dettaglio massimo** sbloccato.
- Funzione premium: la riduzione oltre l'88% (slider sotto il 12%) nell'app è **premium**;
  si sblocca con un **video premiato** o con **Pro**. Sul web resta tutto libero.

## Setup (una volta)
1. **Play Console** → Monetizza → Prodotti → **Prodotto in-app**:
   - ID prodotto: `pro_no_ads`
   - Tipo: **non consumabile** (acquisto una tantum)
   - Prezzo: es. 2,99 € · attivalo.
2. **RevenueCat** (gratis fino a una certa soglia): crea progetto Android, collega
   la Play Console (Service Account), poi:
   - crea un **Entitlement** chiamato `pro`
   - crea un **Offering** con un package che contiene `pro_no_ads`
   - copia la **Public SDK Key (Android)**.
3. Nel progetto Capacitor:
   ```bash
   cd 3d-reducer
   npm install @revenuecat/purchases-capacitor
   npx cap sync android
   ```
4. In **`billing.js`** imposta:
   ```js
   const REVENUECAT_API_KEY = 'goog_LA_TUA_KEY';
   const ENTITLEMENT = 'pro';
   ```
5. Ricompila l'AAB (`bash build-aab.sh`) e prova l'acquisto con un **account tester
   di licenza** (Play Console → Impostazioni → Test delle licenze), così non paghi davvero.

## Note
- Il pulsante "Passa a Pro" chiama `buyPro()`; alla conferma dell'acquisto viene attivato
  `pr3d-pro` e spariscono le pubblicità.
- "Ripristina acquisti" serve dopo un cambio telefono / reinstallazione.
- Su un dispositivo senza il plugin o senza API key, i pulsanti mostrano semplicemente
  "Acquisti non disponibili" (nessun blocco).

## Alternativa senza RevenueCat
Puoi usare direttamente Play Billing (es. plugin `@capgo/capacitor-purchases` o simili),
adattando le 3 chiamate in `billing.js` (`getOfferings`/`purchasePackage`/`restorePurchases`).
Dimmelo e lo converto.
