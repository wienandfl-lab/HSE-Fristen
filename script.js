// Fristenrechner Referendariat – Heidelberg School of Education

// ---------------------------------------------------------------------------
// Einstellungen: Hier lassen sich die Fristen anpassen.
// ---------------------------------------------------------------------------
const RP_FRIST_MONAT = 12;       // Einreichung Abschlussdokumente beim RP: 15. Dezember
const RP_FRIST_TAG = 15;
const PRUEF_WOCHEN = 12;         // 6 Wochen Bewertung + 6 Wochen Prüfungsamt
const KULANZ_ENDE_MONAT = 10;    // letzter Tag im gelben Bereich: 1. Oktober
const KULANZ_ENDE_TAG = 1;
const BEARBEITUNG_WOCHEN = 17;   // Bearbeitungszeit der Masterarbeit

// ---------------------------------------------------------------------------
// Datumshelfer. Alle Daten werden um 12 Uhr mittags angelegt, damit die
// Zeitumstellung (Sommer-/Winterzeit) nie einen Tag verschiebt.
// ---------------------------------------------------------------------------
const TAG_MS = 24 * 60 * 60 * 1000;

function datum(jahr, monat, tag) {
  return new Date(jahr, monat - 1, tag, 12);
}

function plusTage(d, tage) {
  return datum(d.getFullYear(), d.getMonth() + 1, d.getDate() + tage);
}

function tageZwischen(spaeter, frueher) {
  return Math.round((spaeter - frueher) / TAG_MS);
}

// Liest das Datum aus dem Eingabefeld. Normal kommt "2026-09-22"; ältere Browser
// ohne Kalenderfeld liefern, was getippt wurde, z. B. "22.09.2026".
function ausEingabe(wert) {
  if (!wert) return null;
  let j, m, t;
  let treffer = wert.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (treffer) {
    [j, m, t] = [treffer[1], treffer[2], treffer[3]].map(Number);
  } else {
    treffer = wert.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!treffer) return null;
    [t, m, j] = [treffer[1], treffer[2], treffer[3]].map(Number);
  }
  // Beim Eintippen des Jahres kommen kurz Werte wie 0002 oder 0202 an: ignorieren.
  if (j < 2000 || j > 2100) return null;
  const d = datum(j, m, t);
  // Ungültige Daten wie 31.02. abfangen
  if (d.getMonth() !== m - 1 || d.getDate() !== t) return null;
  return d;
}

function lang(d) {
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function kurz(d) {
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
}

function dauer(tage) {
  const w = Math.floor(tage / 7);
  const t = tage % 7;
  const text = `${tage} ${tage === 1 ? 'Tag' : 'Tage'}`;
  if (w === 0) return text;
  const teile = [`${w} ${w === 1 ? 'Woche' : 'Wochen'}`];
  if (t > 0) teile.push(`${t} ${t === 1 ? 'Tag' : 'Tage'}`);
  return `${text} (${teile.join(' und ')})`;
}

// ---------------------------------------------------------------------------
// Fristen für ein Jahr ausrechnen
// ---------------------------------------------------------------------------
function fristen(jahr) {
  const rp = datum(jahr, RP_FRIST_MONAT, RP_FRIST_TAG);
  const abgabeGruen = plusTage(rp, -7 * PRUEF_WOCHEN);                // 22.9.
  const abgabeGelb = datum(jahr, KULANZ_ENDE_MONAT, KULANZ_ENDE_TAG); // 1.10.
  return {
    jahr,
    rp,
    abgabeGruen,
    abgabeGelb,
    anmeldungGruen: plusTage(abgabeGruen, -7 * BEARBEITUNG_WOCHEN),  // 26.5.
    anmeldungGelb: plusTage(abgabeGelb, -7 * BEARBEITUNG_WOCHEN),    // 4.6.
  };
}

// Welcher Ref-Start ist mit diesem Abgabedatum gemeint? Der nächste 15.12. ab der Abgabe.
// Wer z. B. am 20.12.2026 abgibt, kann regulär erst im Januar 2028 starten.
function fristenFuerAbgabe(abgabe) {
  const f = fristen(abgabe.getFullYear());
  return abgabe > f.rp ? fristen(f.jahr + 1) : f;
}

function ampel(abgabe, f) {
  if (abgabe <= f.abgabeGruen) return 'gruen';
  if (abgabe <= f.abgabeGelb) return 'gelb';
  return 'rot';
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------
function texteAbgabe(abgabe, f) {
  const rp = kurz(f.rp);
  const farbe = ampel(abgabe, f);
  if (farbe === 'gruen') {
    return [farbe, [`Bis ${rp} erhältst Du Deine Abschlussdokumente.`]];
  }
  if (farbe === 'gelb') {
    return [farbe, [
      `Bis ${rp} kannst Du eine kostenpflichtige Bestehensbescheinigung erhalten.`,
      `Gib Deine Masterarbeit besser früher ab (spätestens am ${lang(f.abgabeGruen)}), um bis ${rp} bereits Deine Abschlussdokumente zu erhalten.`,
    ]];
  }
  return [farbe, [
    `Wir können leider nicht garantieren, dass bis ${rp} Dein Abschluss über eine kostenpflichtige Bestehensbescheinigung bestätigt werden kann.`,
    `Bitte gib Deine Masterarbeit früher ab: spätestens am ${lang(f.abgabeGruen)} für Deine Abschlussdokumente, spätestens am ${lang(f.abgabeGelb)} für eine Bestehensbescheinigung.`,
  ]];
}

function texteAnmeldung(anmeldung, f) {
  const rp = kurz(f.rp);
  const abgabe = plusTage(anmeldung, 7 * BEARBEITUNG_WOCHEN);
  const farbe = ampel(abgabe, f);
  const verkuerzen = `Wenn Du Deine Abschlussdokumente bis ${rp} erhalten möchtest, verkürze Deine Bearbeitungszeit um ${dauer(tageZwischen(abgabe, f.abgabeGruen))} und gib spätestens am ${lang(f.abgabeGruen)} ab.`;
  const gast = 'Checke zudem die Option „Als Gasthörer:in ins Ref starten“.';
  const voll = `Wenn Du Deine vollen ${BEARBEITUNG_WOCHEN} Wochen Bearbeitungszeit nutzen möchtest, ist Dein Abgabedatum der <strong>${lang(abgabe)}</strong>.`;

  if (farbe === 'gruen') {
    return [farbe, [`Du hast noch volle ${BEARBEITUNG_WOCHEN} Wochen Bearbeitungszeit für Deine Masterarbeit. Du musst die Masterarbeit spätestens am <strong>${lang(abgabe)}</strong> abgeben.`]];
  }
  if (farbe === 'gelb') {
    return [farbe, [
      `${voll} Bis ${rp} kannst Du dann eine kostenpflichtige Bestehensbescheinigung erhalten.`,
      verkuerzen,
      gast,
    ]];
  }
  return [farbe, [
    voll,
    `<strong>Achtung:</strong> Bei diesem Abgabedatum können wir leider nicht garantieren, dass Du bis ${rp} eine kostenpflichtige Bestehensbescheinigung erhältst und ab Januar regulär ins Ref kannst.`,
    verkuerzen,
    gast,
  ]];
}

// ---------------------------------------------------------------------------
// Seite aktualisieren
// ---------------------------------------------------------------------------
const AMPEL_NAME = { gruen: 'Grüner Bereich', gelb: 'Gelber Bereich', rot: 'Roter Bereich' };

const el = {
  option: document.getElementById('option'),
  bereichRegulaer: document.getElementById('bereich-regulaer'),
  bereichGasthoerer: document.getElementById('bereich-gasthoerer'),
  datum: document.getElementById('datum'),
  datumLabel: document.getElementById('datum-label'),
  ergebnis: document.getElementById('ergebnis'),
};

function gewaehlteArt() {
  return document.querySelector('input[name="art"]:checked').value;
}

function zeigeUebersicht() {
  // Ist die gelbe Abgabefrist in diesem Jahr schon vorbei, zeigen wir die Fristen fürs nächste Jahr.
  const heute = new Date();
  let f = fristen(heute.getFullYear());
  if (heute > f.abgabeGelb) f = fristen(f.jahr + 1);
  document.getElementById('ref-jahr').textContent = f.jahr + 1;
  document.getElementById('frist-anmeldung').textContent = lang(f.anmeldungGruen);
  document.getElementById('frist-abgabe').textContent = lang(f.abgabeGruen);
  document.getElementById('frist-rp').textContent = lang(f.rp);
}

function berechne() {
  const art = gewaehlteArt();
  el.datumLabel.textContent = art === 'anmeldung'
    ? 'Wann meldest Du Deine Masterarbeit an?'
    : 'Wann gibst Du Deine Masterarbeit ab?';

  const eingabe = ausEingabe(el.datum.value);
  if (!eingabe) {
    el.ergebnis.hidden = true;
    return;
  }

  const abgabe = art === 'anmeldung' ? plusTage(eingabe, 7 * BEARBEITUNG_WOCHEN) : eingabe;
  const f = fristenFuerAbgabe(abgabe);
  const [farbe, absaetze] = art === 'anmeldung' ? texteAnmeldung(eingabe, f) : texteAbgabe(eingabe, f);

  el.ergebnis.className = farbe;
  el.ergebnis.innerHTML = `<p class="ampel">${AMPEL_NAME[farbe]} · Ref-Start Januar ${f.jahr + 1}</p>`
    + absaetze.map(a => `<p>${a}</p>`).join('');
  el.ergebnis.hidden = false;
}

function zeigeOption() {
  const regulaer = el.option.value === 'regulaer';
  el.bereichRegulaer.hidden = !regulaer;
  el.bereichGasthoerer.hidden = regulaer;
}

el.option.addEventListener('change', zeigeOption);
el.datum.addEventListener('input', berechne);
el.datum.addEventListener('change', berechne);
// Beim Wechsel zwischen Anmeldung und Abgabe das Datum leeren, damit es nicht falsch gedeutet wird.
document.querySelectorAll('input[name="art"]').forEach(r => r.addEventListener('change', () => {
  el.datum.value = '';
  berechne();
}));

zeigeUebersicht();
zeigeOption();
berechne();
