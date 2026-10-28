# Sticker Machine

Turn ten dials to make a sticker, then stick it on a wall that everyone who visits the site shares.

Every sticker is built from ten variables:

| Dial | Options |
| --- | --- |
| Shape | 6 (circle, square, star, flower, heart, burst) |
| Points | 10 |
| Spiky | 11 |
| Tilt | 24 (every 15°) |
| Color | 10 |
| Pattern | 4 |
| Outline color | 5 |
| Line thickness | 4 |
| Eyes | 6 |
| Mouth | 6 |

6 × 10 × 11 × 24 × 10 × 4 × 5 × 4 × 6 × 6 = **456,192,000** possible stickers, not counting the optional word. Each combination gets its own sticker number, and the wall shows what percent of all of them people have made so far.

Drawn with [p5.js](https://p5js.org). Saved stickers are stored in Firebase Firestore as their ten numbers plus the word, and redrawn on the wall.

## Files

- `index.html`: the page
- `style.css`: how it looks
- `sticker.js`: the dials and `drawSticker()`, which draws a sticker with p5
- `app.js`: the controls, the live sticker, and the shared wall
- `firebase-config.js`: where your Firebase keys go
- `firestore.rules`: database rules (anyone can view and add; nobody can edit or delete from the site)

## Put it online

### 1. Turn on GitHub Pages

Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → **Save**. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

The site works right away. Until step 2 is done, the wall only shows stickers saved on that device.

### 2. Connect Firebase so everyone shares one wall (free, about 10 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Create a project**. Analytics can be off.
2. In the project, open **Build → Firestore Database → Create database**. Pick a location near you and start in **production mode**.
3. Open the **Rules** tab, delete what's there, paste in everything from `firestore.rules`, and click **Publish**.
4. Go to **Project settings** (gear icon) → **Your apps** → click the **Web** icon (`</>`). Give it any nickname and register it. You don't need Firebase Hosting.
5. Firebase shows a `firebaseConfig` object. Copy its values into `firebase-config.js`, so the file says `export const FIREBASE_CONFIG = { apiKey: "...", ... };` instead of `null`.
6. Commit and push. Refresh the site, and the note under the wall disappears. Now every saved sticker shows up for everyone.

The Firebase web config is meant to be public, so it's fine in a public repo. The rules in `firestore.rules` are what protect the database: they only allow adding valid stickers, never editing or deleting them.

To remove a sticker someone posted, delete it in the Firebase console under **Firestore Database → stickers**.

## Change the dials

Everything comes from the lists at the top of `sticker.js`. Add a color to `COLORS` or a name to `EYES` (and draw it in `drawFace()`), and the controls and the total update by themselves. If you change how many options a dial has, update the matching number in `firestore.rules` too.
