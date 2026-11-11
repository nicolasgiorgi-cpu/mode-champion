// (v77) « Défi » réservé au défi d'équipe (revue de l'interface enfant du 09/11, « un seul mot Record ») : aucun texte de
// l'appli ne parle d'un autre défi (les badges se tentent, les records du jour sont des tentatives, les Skills ont une
// « prochaine étoile »). Lus : les chaînes de js/*.js (hors commentaires ; js/v-equipe.js est l'écran du défi d'équipe),
// le texte de index.html et des pages de guide-parents/. Seul « défi d'équipe » est permis, occurrence par occurrence.
// Lancer : node tests/test_un_seul_mot.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const racine = path.join(__dirname, '..'), bad = [];
// l'accent est exigé (« DÉFI », « défi ») : les identifiants du code (bilan:'defi', #/defi/:id, data-defi) ne comptent pas
const AUTRE = /[dD][éÉ][fF][iI][sS]?\b(?! d\\?['’]équipe)/;
// une ligne sans son commentaire de fin : on coupe au premier « // » rencontré hors d'une chaîne
function sansCommentaire(l) {
  if (/^\s*(\/\/|\/\*|\*)/.test(l)) return '';
  let q = null;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; }
    else if (c === '\'' || c === '"' || c === '`') q = c;
    else if (c === '/' && l[i + 1] === '/') return l.slice(0, i);
  }
  return l;
}
fs.readdirSync(path.join(racine, 'js')).filter(f => /\.js$/.test(f) && f !== 'v-equipe.js').forEach(f => {
  fs.readFileSync(path.join(racine, 'js', f), 'utf8').split('\n').forEach((l, i) => {
    (sansCommentaire(l).match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g) || []).forEach(s => { if (AUTRE.test(s)) bad.push('js/' + f + ':' + (i + 1) + ' ' + s); });
  });
});
const pages = ['index.html'].concat(fs.existsSync(path.join(racine, 'guide-parents')) ? fs.readdirSync(path.join(racine, 'guide-parents')).filter(f => /\.html$/.test(f)).map(f => 'guide-parents/' + f) : []);
pages.forEach(p => {
  const texte = fs.readFileSync(path.join(racine, p), 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&eacute;/g, 'é').replace(/&rsquo;/g, '’');
  const m = texte.match(new RegExp(AUTRE.source, 'g'));
  if (m) bad.push(p + ' ' + m.join(', '));
});
// le test lui-même : il attrape bien les cas difficiles
assert.ok(AUTRE.test('Tenter le DÉFI') && AUTRE.test('Le défi') && AUTRE.test('Les défis') && !AUTRE.test('le défi d\\\'équipe') && !AUTRE.test('le défi d’équipe') && !AUTRE.test('défilement') && !AUTRE.test("bilan: 'defi'") && AUTRE.test('le défi d\\\'équipe ou un défi'));
assert.strictEqual(sansCommentaire("x = 'a // b défi'; // commentaire défi"), "x = 'a // b défi'; ");
assert.deepStrictEqual(bad, [], 'des textes parlent encore de « défi » :\n' + bad.join('\n'));
console.log('test_un_seul_mot : OK (' + pages.length + ' pages lues)');
