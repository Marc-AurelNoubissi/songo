// ============================================================
// JEU DE SONGO — Version locale
// Modes : Joueur vs Joueur / Joueur vs Ordinateur (5 niveaux)
// ============================================================

let plateau = {
  sud:  [5, 5, 5, 5, 5, 5, 5],
  nord: [5, 5, 5, 5, 5, 5, 5]
};
let scores = { sud: 0, nord: 0 };
let joueurActif = "sud";
let partieTerminee = false;
let enCoursDeDistribution = false;

// ── Mode de jeu ──────────────────────────────────────────
let modeJeu = "pvp";       // "pvp" ou "pvc"
let niveauIA = "moyen";    // facile | moyen | difficile | tres_difficile | maitre
let campJoueurHumain = "sud"; // le joueur humain joue toujours SUD

// ============================================================
// SONS
// ============================================================
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function jouerSon(type) {
  try {
    const ctx = getAudioCtx();
    if (type === "tic") {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    } else if (type === "recolte") {
      [400, 600, 850].forEach(function(freq, i) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
        g.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.28);
        o.start(ctx.currentTime + i * 0.07); o.stop(ctx.currentTime + i * 0.07 + 0.28);
      });
    } else if (type === "victoire") {
      [523, 659, 784, 1047].forEach(function(freq, i) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "square";
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
        g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);
        o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.35);
      });
    } else if (type === "erreur") {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
    } else if (type === "ia") {
      // Son distinct quand l'IA joue
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    }
  } catch(e) {}
}

function pause(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ============================================================
// ÉCRAN DE SÉLECTION DU MODE
// ============================================================
function afficherMenuMode() {
  document.getElementById("menu-mode").style.display = "flex";
  document.getElementById("zone-jeu-principale").style.display = "none";
}

function choisirPvP() {
  modeJeu = "pvp";
  document.getElementById("menu-mode").style.display = "none";
  document.getElementById("menu-niveau").style.display = "none";
  document.getElementById("zone-jeu-principale").style.display = "flex";
  document.getElementById("info-mode").textContent = "Mode : Joueur vs Joueur";
  initialiserJeu();
}

function choisirPvC() {
  modeJeu = "pvc";
  document.getElementById("menu-mode").style.display = "none";
  document.getElementById("menu-niveau").style.display = "flex";
}

function choisirNiveau(niveau) {
  niveauIA = niveau;
  const noms = {
    facile: "Facile", moyen: "Moyen",
    difficile: "Difficile", tres_difficile: "Très Difficile", maitre: "Maître"
  };
  document.getElementById("menu-niveau").style.display = "none";
  document.getElementById("zone-jeu-principale").style.display = "flex";
  document.getElementById("info-mode").textContent =
    "Mode : Joueur vs IA — Niveau : " + noms[niveau];
  initialiserJeu();
}

// ============================================================
// CONSTRUIRE LE CHEMIN
// ============================================================
function construireChemin(campJoueur, indexDepart) {
  let chemin = [];
  if (campJoueur === "sud") {
    for (let j = indexDepart - 1; j >= 0; j--)
      chemin.push({ camp: "sud", index: j });
    for (let cycle = 0; cycle < 10; cycle++) {
      for (let j = 0; j <= 6; j++) chemin.push({ camp: "nord", index: j });
      for (let j = 6; j >= 0; j--) chemin.push({ camp: "sud",  index: j });
    }
  } else {
    for (let j = indexDepart + 1; j <= 6; j++)
      chemin.push({ camp: "nord", index: j });
    for (let cycle = 0; cycle < 10; cycle++) {
      for (let j = 6; j >= 0; j--) chemin.push({ camp: "sud",  index: j });
      for (let j = 0; j <= 6; j++) chemin.push({ camp: "nord", index: j });
    }
  }
  return chemin;
}

// ============================================================
// DISTRIBUER
// ============================================================
async function distribuer(campJoueur, indexDepart, grainesEnMain) {
  let chemin = construireChemin(campJoueur, indexDepart);
  let sauterDepart = (grainesEnMain > 13);
  let compte = 0, dernierePos = null, i = 0;

  while (compte < grainesEnMain && i < chemin.length) {
    let pos = chemin[i];
    if (sauterDepart && pos.camp === campJoueur && pos.index === indexDepart) {
      i++; continue;
    }
    plateau[pos.camp][pos.index]++;
    dernierePos = pos;
    compte++; i++;
    mettreAJourCase(pos.camp, pos.index);
    jouerSon("tic");
    await pause(300);
  }

  if (dernierePos !== null) effectuerRecoltes(campJoueur, dernierePos);
  else passerTour();
}

function mettreAJourCase(camp, index) {
  const caseDiv = document.getElementById("case-" + camp + "-" + index);
  if (!caseDiv) return;
  const nb = plateau[camp][index];
  const pionsContainer = caseDiv.querySelector(".pions-container");
  if (pionsContainer) {
    pionsContainer.innerHTML = "";
    for (let p = 0; p < Math.min(nb, 9); p++) {
      const pion = document.createElement("div");
      pion.classList.add("pion");
      pionsContainer.appendChild(pion);
    }
  }
  let compteur = caseDiv.querySelector(".compteur");
  if (nb > 0) {
    if (!compteur) {
      compteur = document.createElement("span");
      compteur.classList.add("compteur");
      caseDiv.appendChild(compteur);
    }
    compteur.textContent = nb;
  } else if (compteur) { compteur.remove(); }
  caseDiv.classList.add("highlight");
  setTimeout(function() { caseDiv.classList.remove("highlight"); }, 250);
}

// ============================================================
// RÉCOLTES
// ============================================================
function effectuerRecoltes(campJoueur, dernierePos) {
  let adversaire = (campJoueur === "sud") ? "nord" : "sud";
  if (dernierePos.camp !== adversaire) { passerTour(); return; }
  let idx = dernierePos.index;
  let nb  = plateau[adversaire][idx];
  if (nb < 2 || nb > 4) { passerTour(); return; }
  if (idx === 0)         { passerTour(); return; }

  let casesARecolter = [];
  if (campJoueur === "sud") {
    let j = idx;
    while (j >= 0) {
      let n = plateau[adversaire][j];
      if (n >= 2 && n <= 4) casesARecolter.push({ camp: adversaire, index: j });
      else break;
      j--;
    }
  } else {
    let j = idx;
    while (j <= 6) {
      let n = plateau[adversaire][j];
      if (n >= 2 && n <= 4) casesARecolter.push({ camp: adversaire, index: j });
      else break;
      j++;
    }
  }

  if (casesARecolter.length === 0) { passerTour(); return; }

  let totalAdverse    = plateau[adversaire].reduce((a, b) => a + b, 0);
  let grainesRecoltees = casesARecolter.reduce((s, p) => s + plateau[p.camp][p.index], 0);

  if (grainesRecoltees >= totalAdverse) {
    setInfo("Prise interdite : impossible de vider le camp adverse !");
    passerTour(); return;
  }

  let total = 0;
  casesARecolter.forEach(function(pos) {
    total += plateau[pos.camp][pos.index];
    scores[campJoueur] += plateau[pos.camp][pos.index];
    plateau[pos.camp][pos.index] = 0;
  });

  jouerSon("recolte");
  setInfo("✦ " + campJoueur.toUpperCase() + " récolte " + total + " graine(s) !");
  afficherPlateau();
  mettreAJourScores();
  if (verifierFinPartie()) return;
  passerTour();
}

// ============================================================
// JOUER UN COUP (humain)
// ============================================================
function jouerCoup(camp, index) {
  if (partieTerminee) return;
  if (camp !== joueurActif) return;
  if (modeJeu === "pvc" && camp !== campJoueurHumain) return;
  if (enCoursDeDistribution) { setInfo("Distribution en cours..."); return; }

  if (plateau[camp][index] === 0) {
    jouerSon("erreur"); setInfo("Case vide ! Choisis une autre case."); return;
  }
  if (index === 6 && plateau[camp][index] <= 2) {
    jouerSon("erreur"); setInfo("Interdit : case 7 avec 1 ou 2 graines !"); return;
  }

  let adversaire = (camp === "sud") ? "nord" : "sud";
  let grainesAdverse = plateau[adversaire].reduce((a, b) => a + b, 0);
  if (grainesAdverse === 0) {
    let envoye = compterGrainesChezAdversaire(camp, index);
    let meilleur = meilleurEnvoi(camp);
    if (meilleur >= 7 && envoye < 7) {
      jouerSon("erreur");
      setInfo("Solidarité : envoie au moins 7 graines chez l'adversaire !");
      return;
    }
  }

  setInfo("");
  lancerCoup(camp, index);
}

function lancerCoup(camp, index) {
  enCoursDeDistribution = true;
  afficherPlateau();
  let grainesEnMain = plateau[camp][index];
  plateau[camp][index] = 0;
  mettreAJourCase(camp, index);
  distribuer(camp, index, grainesEnMain).then(function() {
    enCoursDeDistribution = false;
    afficherPlateau();
    // Si mode PvC et c'est au tour de l'IA après
    if (modeJeu === "pvc" && joueurActif !== campJoueurHumain && !partieTerminee) {
      setTimeout(jouerCoupIA, 800);
    }
  });
}

// ============================================================
// INTELLIGENCE ARTIFICIELLE — 5 niveaux
// ============================================================

// Évaluer un coup : retourne un score (plus c'est élevé, mieux c'est)
function evaluerCoup(camp, index) {
  let adversaire = (camp === "sud") ? "nord" : "sud";

  // Simulation rapide du coup
  let plateauSim = {
    sud:  plateau.sud.slice(),
    nord: plateau.nord.slice()
  };
  let scoresSim = { sud: scores.sud, nord: scores.nord };

  let chemin = construireChemin(camp, index);
  let graines = plateauSim[camp][index];
  plateauSim[camp][index] = 0;
  let sauterDepart = (graines > 13);
  let compte = 0, dernierePos = null, i = 0;

  while (compte < graines && i < chemin.length) {
    let pos = chemin[i];
    if (sauterDepart && pos.camp === camp && pos.index === index) { i++; continue; }
    plateauSim[pos.camp][pos.index]++;
    dernierePos = pos; compte++; i++;
  }

  let scoreRecolte = 0;
  if (dernierePos && dernierePos.camp === adversaire) {
    let idx = dernierePos.index;
    let nb  = plateauSim[adversaire][idx];
    if (nb >= 2 && nb <= 4 && idx !== 0) {
      let total = plateauSim[adversaire].reduce((a, b) => a + b, 0);
      let casesChaine = [];
      if (camp === "sud") {
        for (let j = idx; j >= 0; j--) {
          let n = plateauSim[adversaire][j];
          if (n >= 2 && n <= 4) casesChaine.push(j); else break;
        }
      } else {
        for (let j = idx; j <= 6; j++) {
          let n = plateauSim[adversaire][j];
          if (n >= 2 && n <= 4) casesChaine.push(j); else break;
        }
      }
      let recolteSim = casesChaine.reduce((s, j) => s + plateauSim[adversaire][j], 0);
      if (recolteSim < total) scoreRecolte = recolteSim;
    }
  }

  // Score positionnel : préférer les cases avec beaucoup de graines
  let scorePositionnel = plateauSim[camp].reduce((a, b) => a + b, 0);

  return { recolte: scoreRecolte, positionnel: scorePositionnel, dernierePos };
}

// Obtenir les coups valides pour un camp
function getCoupsValides(camp) {
  let adversaire = (camp === "sud") ? "nord" : "sud";
  let grainesAdverse = plateau[adversaire].reduce((a, b) => a + b, 0);
  let coups = [];

  for (let i = 0; i < 7; i++) {
    if (plateau[camp][i] === 0) continue;
    if (i === 6 && plateau[camp][i] <= 2) continue;

    // Vérification solidarité
    if (grainesAdverse === 0) {
      let envoye = compterGrainesChezAdversaire(camp, i);
      let meilleur = meilleurEnvoi(camp);
      if (meilleur >= 7 && envoye < 7) continue;
    }
    coups.push(i);
  }
  return coups;
}

function meilleurEnvoi(camp) {
  let max = 0;
  for (let ci = 0; ci < 7; ci++) {
    if (plateau[camp][ci] === 0) continue;
    let e = compterGrainesChezAdversaire(camp, ci);
    if (e > max) max = e;
  }
  return max;
}

// ── Niveau FACILE : coup aléatoire ───────────────────────
function iaFacile(camp) {
  let coups = getCoupsValides(camp);
  if (coups.length === 0) return -1;
  return coups[Math.floor(Math.random() * coups.length)];
}

// ── Niveau MOYEN : joue un coup qui récolte si possible, sinon aléatoire ──
function iaMoyen(camp) {
  let coups = getCoupsValides(camp);
  if (coups.length === 0) return -1;

  // Chercher un coup qui récolte
  let coupsAvecRecolte = coups.filter(i => evaluerCoup(camp, i).recolte > 0);
  if (coupsAvecRecolte.length > 0) {
    return coupsAvecRecolte[Math.floor(Math.random() * coupsAvecRecolte.length)];
  }
  return coups[Math.floor(Math.random() * coups.length)];
}

// ── Niveau DIFFICILE : maximise la récolte immédiate ─────
function iaDifficile(camp) {
  let coups = getCoupsValides(camp);
  if (coups.length === 0) return -1;

  let meilleur = -1, maxRecolte = -1;
  coups.forEach(function(i) {
    let eval_ = evaluerCoup(camp, i);
    if (eval_.recolte > maxRecolte) {
      maxRecolte = eval_.recolte;
      meilleur = i;
    }
  });
  return meilleur;
}

// ── Niveau TRÈS DIFFICILE : récolte max + évite de donner des prises ──
function iaTresDifficile(camp) {
  let adversaire = (camp === "sud") ? "nord" : "sud";
  let coups = getCoupsValides(camp);
  if (coups.length === 0) return -1;

  let meilleur = -1, maxScore = -Infinity;
  coups.forEach(function(i) {
    let eval_ = evaluerCoup(camp, i);

    // Pénaliser les coups qui laissent des cases adverses à 1-3 graines
    let risque = 0;
    plateau[adversaire].forEach(function(nb) {
      if (nb >= 1 && nb <= 3) risque++;
    });

    let score = eval_.recolte * 10 - risque * 2 + eval_.positionnel * 0.1;
    if (score > maxScore) { maxScore = score; meilleur = i; }
  });
  return meilleur;
}

// ── Niveau MAÎTRE : minimax 2 niveaux ────────────────────
function iaMaitre(camp) {
  let coups = getCoupsValides(camp);
  if (coups.length === 0) return -1;

  let adversaire = (camp === "sud") ? "nord" : "sud";
  let meilleur = -1, maxScore = -Infinity;

  coups.forEach(function(indexCoup) {
    // Simuler ce coup
    let plateauSauvegarde = {
      sud:  plateau.sud.slice(),
      nord: plateau.nord.slice()
    };
    let scoresSauvegarde = { sud: scores.sud, nord: scores.nord };

    // Appliquer le coup (simulation simplifiée)
    let eval1 = evaluerCoup(camp, indexCoup);
    let scoreImmediat = eval1.recolte;

    // Simuler la meilleure réponse adverse
    let reponsePire = 0;
    let coupsAdverse = getCoupsValides(adversaire);
    coupsAdverse.forEach(function(indexAdverse) {
      let eval2 = evaluerCoup(adversaire, indexAdverse);
      if (eval2.recolte > reponsePire) reponsePire = eval2.recolte;
    });

    // Score = ce que je gagne - ce que l'adversaire peut gagner
    let scoreTotal = scoreImmediat * 10 - reponsePire * 8 + eval1.positionnel * 0.1;

    if (scoreTotal > maxScore) {
      maxScore = scoreTotal;
      meilleur = indexCoup;
    }

    // Restaurer (pas nécessaire car evaluerCoup ne modifie pas plateau)
  });

  return meilleur;
}

// ── Dispatcher IA ─────────────────────────────────────────
function choisirCoupIA(camp) {
  switch (niveauIA) {
    case "facile":        return iaFacile(camp);
    case "moyen":         return iaMoyen(camp);
    case "difficile":     return iaDifficile(camp);
    case "tres_difficile":return iaTresDifficile(camp);
    case "maitre":        return iaMaitre(camp);
    default:              return iaFacile(camp);
  }
}

async function jouerCoupIA() {
  if (partieTerminee || enCoursDeDistribution) return;

  let campIA = (campJoueurHumain === "sud") ? "nord" : "sud";
  setInfo("🤖 L'ordinateur réfléchit...");

  // Délai de "réflexion" selon le niveau
  let delaiReflexion = {
    facile: 600, moyen: 900, difficile: 1200, tres_difficile: 1500, maitre: 2000
  };
  await pause(delaiReflexion[niveauIA] || 800);

  let index = choisirCoupIA(campIA);
  if (index === -1) { passerTour(); return; }

  setInfo("🤖 L'ordinateur joue la case " + (campIA === "nord" ? "N" : "S") + (index + 1));
  jouerSon("ia");
  lancerCoup(campIA, index);
}

// ============================================================
// COMPTEUR GRAINES CHEZ ADVERSAIRE
// ============================================================
function compterGrainesChezAdversaire(camp, index) {
  let adversaire = (camp === "sud") ? "nord" : "sud";
  let chemin = construireChemin(camp, index);
  let grainesEnMain = plateau[camp][index];
  let sauterDepart  = (grainesEnMain > 13);
  let count = 0, chezAdv = 0, i = 0;
  while (count < grainesEnMain && i < chemin.length) {
    let pos = chemin[i];
    if (sauterDepart && pos.camp === camp && pos.index === index) { i++; continue; }
    if (pos.camp === adversaire) chezAdv++;
    count++; i++;
  }
  return chezAdv;
}

// ============================================================
// PASSER AU JOUEUR SUIVANT
// ============================================================
function passerTour() {
  joueurActif = (joueurActif === "sud") ? "nord" : "sud";
  afficherPlateau();
  mettreAJourTour();
  verifierSolidarite();
}

// ============================================================
// SOLIDARITÉ
// ============================================================
function verifierSolidarite() {
  let adversaire = (joueurActif === "sud") ? "nord" : "sud";
  let grainesAdverse = plateau[adversaire].reduce((a, b) => a + b, 0);
  if (grainesAdverse > 0) return;

  let totalActif = plateau[joueurActif].reduce((a, b) => a + b, 0);
  if (totalActif === 0) { terminerPartie(null); return; }

  let meilleur = meilleurEnvoi(joueurActif);

  if (meilleur === 0) {
    for (let i = 0; i < 7; i++) {
      scores[joueurActif] += plateau[joueurActif][i];
      plateau[joueurActif][i] = 0;
    }
    mettreAJourScores();
    let gagnant = scores.sud > scores.nord ? "SUD" : scores.nord > scores.sud ? "NORD" : null;
    terminerPartie(gagnant);
  } else if (meilleur < 7) {
    setInfo("⚠ Solidarité : " + joueurActif.toUpperCase() +
            " doit envoyer le maximum (" + meilleur + " graines).");
  } else {
    setInfo("⚠ Solidarité ! " + joueurActif.toUpperCase() +
            " doit envoyer au moins 7 graines chez l'adversaire.");
  }

  // Si c'est à l'IA de jouer la solidarité
  if (modeJeu === "pvc" && joueurActif !== campJoueurHumain && !partieTerminee) {
    setTimeout(jouerCoupIA, 800);
  }
}

// ============================================================
// FIN DE PARTIE
// ============================================================
function verifierFinPartie() {
  if (scores.sud  >= 40) { terminerPartie("SUD");  return true; }
  if (scores.nord >= 40) { terminerPartie("NORD"); return true; }
  let totalEnJeu = plateau.sud.reduce((a,b)=>a+b,0) + plateau.nord.reduce((a,b)=>a+b,0);
  if (totalEnJeu < 10) {
    for (let i = 0; i < 7; i++) {
      scores.sud  += plateau.sud[i];
      scores.nord += plateau.nord[i];
      plateau.sud[i] = plateau.nord[i] = 0;
    }
    mettreAJourScores();
    let gagnant = scores.sud > scores.nord ? "SUD" : scores.nord > scores.sud ? "NORD" : null;
    terminerPartie(gagnant);
    return true;
  }
  return false;
}

function terminerPartie(gagnant) {
  partieTerminee = true;
  afficherPlateau();
  mettreAJourScores();
  jouerSon("victoire");
  const msg = document.getElementById("message");
  msg.style.display = "block";

  let texte = "";
  if (!gagnant) {
    texte = "🤝 Match nul ! — SUD : " + scores.sud + " / NORD : " + scores.nord;
  } else if (modeJeu === "pvc") {
    texte = gagnant === campJoueurHumain.toUpperCase()
      ? "🏆 Bravo ! Tu as battu l'ordinateur avec " + scores[gagnant.toLowerCase()] + " graines !"
      : "🤖 L'ordinateur gagne avec " + scores[gagnant.toLowerCase()] + " graines. Réessaie !";
  } else {
    texte = "🏆 " + gagnant + " remporte la partie avec " + scores[gagnant.toLowerCase()] + " graines !";
  }
  msg.textContent = texte;
}

// ============================================================
// INITIALISER
// ============================================================
function initialiserJeu() {
  plateau = { sud: [5,5,5,5,5,5,5], nord: [5,5,5,5,5,5,5] };
  scores = { sud: 0, nord: 0 };
  joueurActif = "sud";
  partieTerminee = false;
  enCoursDeDistribution = false;
  document.getElementById("message").style.display = "none";
  document.getElementById("message").textContent   = "";
  document.getElementById("info-coup").textContent = "";
  afficherPlateau();
  mettreAJourScores();
  mettreAJourTour();

  // Si mode PvC et c'est à l'IA de commencer (IA = NORD, humain = SUD)
  // L'humain commence toujours
}

function retourMenu() {
  enCoursDeDistribution = false;
  partieTerminee = false;
  document.getElementById("zone-jeu-principale").style.display = "none";
  document.getElementById("menu-niveau").style.display = "none";
  document.getElementById("menu-mode").style.display = "flex";
}

// ============================================================
// AFFICHAGE
// ============================================================
function afficherPlateau() {
  afficherRangee("nord");
  afficherRangee("sud");
}

function afficherRangee(camp) {
  const rangee = document.getElementById("rangee-" + camp);
  rangee.innerHTML = "";

  let estMonTour = (camp === joueurActif) && !partieTerminee && !enCoursDeDistribution;
  // En mode PvC, le camp IA n'est jamais cliquable
  if (modeJeu === "pvc" && camp !== campJoueurHumain) estMonTour = false;

  [0,1,2,3,4,5,6].forEach(function(i) {
    const nb = plateau[camp][i];
    const caseDiv = document.createElement("div");
    caseDiv.classList.add("case");
    caseDiv.id = "case-" + camp + "-" + i;

    if (!estMonTour) {
      caseDiv.classList.add("disabled");
    } else if (nb === 0) {
      caseDiv.classList.add("vide");
    } else {
      caseDiv.classList.add("jouable");
    }

    const numSpan = document.createElement("span");
    numSpan.classList.add("numero");
    numSpan.textContent = (camp === "nord" ? "N" : "S") + (i + 1);
    caseDiv.appendChild(numSpan);

    const pionsContainer = document.createElement("div");
    pionsContainer.classList.add("pions-container");
    for (let p = 0; p < Math.min(nb, 9); p++) {
      const pion = document.createElement("div");
      pion.classList.add("pion");
      pionsContainer.appendChild(pion);
    }
    caseDiv.appendChild(pionsContainer);

    if (nb > 0) {
      const compteur = document.createElement("span");
      compteur.classList.add("compteur");
      compteur.textContent = nb;
      caseDiv.appendChild(compteur);
    }

    caseDiv.addEventListener("click", function() { jouerCoup(camp, i); });
    rangee.appendChild(caseDiv);
  });
}

function mettreAJourScores() {
  document.getElementById("pts-nord").textContent = scores.nord;
  document.getElementById("pts-sud").textContent  = scores.sud;
}
function mettreAJourTour() {
  document.getElementById("joueur-actif").textContent = joueurActif.toUpperCase();
}
function setInfo(texte) {
  document.getElementById("info-coup").textContent = texte;
}

window.onload = function() { afficherMenuMode(); };
