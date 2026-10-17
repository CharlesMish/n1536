
const STUDIES = [
  {
    "file": "same-n.html",
    "study": "01",
    "title": "SAME N",
    "claim": "Same count. Different claims.",
    "frozen": "N = 1,536",
    "free": "point placement: Random · Sobol · Fibonacci",
    "domain": "spherical sampling",
    "methods": [
      "Random",
      "Sobol",
      "Fibonacci"
    ],
    "focus": "Fibonacci",
    "version": "v0.2 · hosted",
    "cost": null,
    "plate": "Fig. 03 — lattice print",
    "question": "Can the same point count leave different gaps?",
    "explanation": "Count does not determine coverage, dependence, or suitability for a task. The spacing statistic answers one specific question."
  },
  {
    "file": "same-shadow-2.html",
    "study": "02",
    "title": "SAME SHADOW",
    "claim": "Same projection. Different bodies.",
    "frozen": "one silhouette",
    "free": "the body behind it",
    "domain": "occupancy from a projection",
    "methods": [
      "Prism",
      "Grade",
      "Well"
    ],
    "focus": "Prism",
    "version": "v0.1.2",
    "cost": null,
    "plate": "Fig. 01 — same outline",
    "question": "What did the view discard?",
    "explanation": "A single projection hides occupied depth. Turn the body, then return to the canonical face to recover the invariant."
  },
  {
    "file": "same-earth.html",
    "study": "03",
    "title": "SAME EARTH",
    "claim": "Same planet. Different frames.",
    "frozen": "one sampled surface",
    "free": "projection",
    "domain": "measure vs shape",
    "methods": [
      "Globe",
      "Mercator",
      "Equal Earth"
    ],
    "focus": "Globe",
    "version": "v0.2.1",
    "cost": null,
    "plate": "Fig. 01 — sphere kept · Equal Earth",
    "question": "What did the projection change?",
    "explanation": "The sphere is the reference surface. Its globe view is an orthographic projection too; Mercator and Equal Earth make different local trade-offs."
  },
  {
    "file": "same-sites3.html",
    "study": "04",
    "title": "SAME SITES",
    "claim": "Same generators. Different territory.",
    "frozen": "seven generators",
    "free": "metric",
    "domain": "nearest-site territory",
    "methods": [
      "Euclidean",
      "Taxicab",
      "Chebyshev"
    ],
    "focus": "Euclidean",
    "version": "v0.1.3",
    "cost": null,
    "plate": "Fig. 01 — two circles",
    "question": "Who defined nearest?",
    "explanation": "The generators stay put. Changing the distance rule changes which generator owns each location."
  },
  {
    "file": "same-samples-2.html",
    "study": "05",
    "title": "SAME SAMPLES",
    "claim": "Same samples. Different assumptions.",
    "frozen": "one measured set",
    "free": "interpolating assumptions",
    "domain": "model / influence",
    "methods": [
      "Global",
      "Local",
      "Periodic"
    ],
    "focus": "Global",
    "version": "v0.2.3",
    "cost": null,
    "plate": "Fig. 01 — through the stems",
    "question": "What does one measurement control?",
    "explanation": "Inspect the response to a hypothetical +1 at one sample. The reach of that change reveals the assumption behind each interpolant."
  },
  {
    "file": "same-volume-series-pass.html",
    "study": "06",
    "title": "SAME VOLUME",
    "claim": "Same target budget. Different obligations.",
    "frozen": "target mean density 0.40",
    "free": "obligation",
    "domain": "structure / allocation",
    "methods": [
      "Carry",
      "Conduct",
      "Share"
    ],
    "focus": "Carry",
    "version": "v0.3.2",
    "cost": "slow to form",
    "plate": "Fig. 01 — load path",
    "question": "What does better mean?",
    "explanation": "One target budget serves three objectives. The achieved mean is numerical and shown explicitly; lower compliance means better only for its named objective."
  },
  {
    "file": "same-marginals-2.html",
    "study": "07",
    "title": "SAME MARGINALS",
    "claim": "Same x. Same y. Different pairing.",
    "frozen": "same x, same y",
    "free": "pairing",
    "domain": "coupling",
    "methods": [
      "Align",
      "Oppose",
      "Scramble"
    ],
    "focus": "Align",
    "version": "v0.1.2",
    "cost": null,
    "plate": "Fig. 01 — kept pairing",
    "question": "What did the separate lists lose?",
    "explanation": "The same x values and the same y values permit different pairings. Marginal information does not determine joint behavior."
  },
  {
    "file": "same-average.html",
    "study": "08",
    "title": "SAME AVERAGE",
    "claim": "Same averages. Different groups.",
    "frozen": "400 records · A 60%, B 40%",
    "free": "group membership",
    "domain": "aggregation / weights",
    "methods": [
      "Agree",
      "Disappear",
      "Reverse"
    ],
    "focus": "Agree",
    "version": "v0.1",
    "cost": null,
    "question": "Whose weights made the average?",
    "explanation": "Keep all 400 records and both pooled rates. Change group membership to make the within-group difference agree, disappear, or reverse."
  },
  {
    "file": "same-magnitude-2.html",
    "study": "09",
    "title": "SAME MAGNITUDE",
    "claim": "Same Fourier magnitude. Different structure.",
    "frozen": "one Fourier magnitude",
    "free": "phase",
    "domain": "spectrum vs structure",
    "methods": [
      "Source",
      "Borrowed",
      "Scrambled"
    ],
    "focus": "Source",
    "version": "v0.1.2",
    "cost": null,
    "plate": "Fig. 01 — kept phase",
    "question": "What did magnitude leave out?",
    "explanation": "Phase carries structure that a Fourier magnitude array cannot recover. The three images use one shared grayscale."
  },
  {
    "file": "same-law.html",
    "study": "10",
    "title": "SAME LAW",
    "claim": "Same rule. Different histories.",
    "frozen": "update rule · domain · grid",
    "free": "initial position",
    "domain": "dynamics / prediction",
    "methods": [
      "A",
      "B",
      "C"
    ],
    "focus": "Step 32",
    "version": "v0.1",
    "cost": null,
    "question": "What else does a prediction need?",
    "explanation": "A fixed update rule does not specify an initial state. Three nearby starts follow exactly the same rule into different histories."
  },
  {
    "file": "same-moves.html",
    "study": "11",
    "title": "SAME MOVES",
    "claim": "Same moves. Different place.",
    "frozen": "six rigid motions · λ = 1",
    "free": "composition order",
    "methods": [
      "Given",
      "Reversed",
      "Shuffled"
    ],
    "focus": "Given",
    "version": "v0.1",
    "cost": null,
    "plate": "Computed specimen",
    "domain": "rigid motion / composition",
    "question": "What did order change?",
    "explanation": "Every ordering shares its total rotation and length, but the endpoint depends on composition order. Turn scale λ changes the moves; zero makes them commute."
  },
  {
    "file": "same-divergence.html",
    "study": "12",
    "title": "SAME DIVERGENCE",
    "claim": "Same sources. Different flow.",
    "frozen": "source field ρ · witness flux",
    "free": "divergence-free component",
    "methods": [
      "Quiet",
      "Slide",
      "Spin"
    ],
    "focus": "Quiet",
    "version": "v0.1",
    "cost": null,
    "plate": "Computed specimen",
    "domain": "vector fields / underdetermination",
    "question": "What did the sources leave open?",
    "explanation": "Equal divergence and witness flux do not determine the velocity field. Added divergence-free components change curl, circulation and trajectories."
  },
  {
    "file": "same-degrees.html",
    "study": "13",
    "title": "SAME DEGREES",
    "claim": "Same neighbors counted. Different worlds.",
    "frozen": "12 vertices · degree 3 · 18 edges · positions",
    "free": "who connects to whom",
    "domain": "networks / reachability",
    "methods": [
      "Spread",
      "Narrow",
      "Apart"
    ],
    "focus": "Spread",
    "version": "v0.1",
    "cost": null,
    "question": "Can every local count match while the network comes apart?",
    "explanation": "Send a pulse from one vertex. Three exact cubic graphs keep every degree at three while their routes and connected components change."
  },
  {
    "file": "same-impulse.html",
    "study": "14",
    "title": "SAME IMPULSE",
    "claim": "Same push integrated. Different motion.",
    "frozen": "applied impulse · oscillator · starting rest",
    "free": "force timing",
    "domain": "forced linear dynamics",
    "methods": [
      "Early pulse",
      "Broad push",
      "Two pulses"
    ],
    "focus": "Two pulses · 1 s apart",
    "version": "v0.1",
    "cost": null,
    "question": "How much does the timing of a push matter?",
    "explanation": "Equal applied-force area does not fix a spring–mass–damper’s motion. Time the second pulse and compare peak displacement and the residual vibration at one shared instant.",
    "plate": "Fig. 14 — one impulse, three histories"
  },
  {
    "file": "same-eigenvalues.html",
    "study": "15",
    "title": "SAME EIGENVALUES",
    "claim": "Same eventual stability. Different excursions.",
    "frozen": "eigenvalues −1, −2 · start (0, 1) · units · norm",
    "free": "off-diagonal coupling k",
    "domain": "linear dynamics / transient growth",
    "methods": [
      "k = 0",
      "k = 4",
      "k = 12"
    ],
    "focus": "k = 12",
    "version": "v0.1",
    "cost": null,
    "question": "Does eventual decay mean a disturbance never grows?",
    "explanation": "The eigenvalues stay negative as coupling changes. With one fixed start, coordinate system, and norm, the state can first travel farther from zero before it decays."
  },
  {
    "file": "same-distances.html",
    "study": "16",
    "title": "SAME DISTANCES",
    "claim": "Same distances. Different handedness.",
    "frozen": "six distances; four labels; units",
    "free": "orientation; permission to reflect",
    "domain": "distance geometry",
    "methods": [
      "Rotate",
      "Best proper fit",
      "Reflect"
    ],
    "focus": "Manual rotation",
    "version": "v0.1",
    "cost": null,
    "plate": "Fig. 01 — a gap no turn can close",
    "question": "Can equal distances certify a proper rigid match?",
    "explanation": "A labeled tetrahedron and its mirror share all six edge lengths. Their opposite signed volumes forbid a proper rigid match: the certified best 3D RMS error is 1 unit, while reflection aligns them exactly."
  },
  {
    "file": "same-residual.html",
    "study": "17",
    "title": "SAME RESIDUAL",
    "claim": "Same residual size. Different error.",
    "frozen": "matrix A · right-hand side b · residual norm 1 · units",
    "free": "residual direction θ",
    "domain": "linear algebra / conditioning",
    "methods": [
      "First axis",
      "Diagonal",
      "Second axis"
    ],
    "focus": "45° diagonal",
    "version": "v0.1",
    "cost": null,
    "question": "Does the same residual size promise the same solution error?",
    "explanation": "A unit residual rotates through one fixed linear system. The corresponding error traces a 100-to-1 ellipse; relative amplification varies from 1 to 100 while the condition-number bound stays fixed."
  },
  {
    "file": "same-fit.html",
    "study": "18",
    "title": "SAME FIT",
    "claim": "Same fitted summary. Different structure.",
    "frozen": "11 observations · summary at declared rounding precision · shared axes",
    "free": "arrangement of the observations",
    "domain": "statistics / regression diagnostics",
    "methods": [
      "Quartet I",
      "Quartet II",
      "Quartet III",
      "Quartet IV"
    ],
    "focus": "all four datasets",
    "version": "v0.1",
    "cost": null,
    "question": "What did the fitted summary leave out?",
    "explanation": "Anscombe’s four datasets share rounded means, variances, correlation and fitted coefficients. Their actual computed fits differ slightly, while their point arrangements and residual patterns differ visibly."
  },
  {
    "file": "same-sum.html",
    "study": "19",
    "title": "SAME SUM",
    "claim": "Same numbers added. Different totals.",
    "frozen": "1,536 binary64 values · round to nearest, ties to even · one accumulator",
    "free": "order of addition",
    "domain": "floating point / rounding",
    "methods": [
      "Given",
      "Ascending",
      "Descending"
    ],
    "focus": "Given",
    "version": "v0.1",
    "cost": null,
    "question": "Does a sum remember its order?",
    "explanation": "Real addition forgets order; a binary64 accumulator does not. Each addition rounds to the nearest representable value, whose spacing depends on the result’s magnitude. An exact BigInt ledger records signed corrections, including upward rounding."
  },
  {
    "file": "same-reactions.html",
    "study": "20",
    "title": "SAME REACTIONS",
    "claim": "Same forces at the supports. Different bend.",
    "frozen": "one beam · L, EI, W · load centroid L/2 · reactions W/2 each",
    "free": "spatial distribution of the load",
    "domain": "beam mechanics / equilibrium",
    "methods": [
      "Center",
      "Pair",
      "Uniform"
    ],
    "focus": "Pair",
    "version": "v0.1",
    "cost": null,
    "question": "What can the supports tell you about the span?",
    "explanation": "Every arrangement has the same total load and first moment, so each support reads W/2. The load distribution changes the internal moment and deflection. At the quarter-point setting, the pair and uniform load even share a peak moment, yet their midspan deflections differ by 10%."
  }
];

const grid = document.getElementById("grid");
let focusIndex = 0;

// The authored HTML is also the complete, usable no-JavaScript collection.
const starters = new Set(['01', '02', '04', '13', '18', '20']);
const cards = [...grid.querySelectorAll('.card')];
const moreStudies = document.getElementById('more-studies');
const collectionKey = 'same-series-collection';
function requestedCollection() {
  if (location.hash === '#all') return 'all';
  if (location.hash === '#start') return 'start';
  try { return sessionStorage.getItem(collectionKey) === 'all' ? 'all' : 'start'; }
  catch { return 'start'; }
}
function visibleCards() { return cards.filter(card => !card.hidden); }
function chooseCollection(mode) {
  try { sessionStorage.setItem(collectionKey, mode); } catch { /* Browsing works without storage. */ }
  cards.forEach((card, index) => { card.hidden = mode === 'start' && !starters.has(STUDIES[index].study); });
  document.querySelectorAll('.collection-choices [data-collection]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.collection === mode)));
  moreStudies.hidden = mode === 'all';
  document.getElementById('collection-note').textContent = mode === 'start'
    ? 'Six ways in: place points, turn a body, change a distance rule, trace a network, compare datasets, or load a beam. Then explore all twenty.'
    : 'All twenty studies, in their original order. The book of plates keeps the longer explanations.';
  focusIndex = 0;
  updateFocus();
}
document.querySelector('.collection-choices').hidden = false;
document.querySelectorAll('[data-collection]').forEach(button => button.addEventListener('click', () => {
  chooseCollection(button.dataset.collection);
  history.replaceState(null, '', button.dataset.collection === 'all' ? '#all' : '#start');
  if (button === moreStudies) {
    // Continue with the first study newly revealed by this action.
    cards.find((card, index) => !starters.has(STUDIES[index].study)).focus();
  }
}));
window.addEventListener('hashchange', () => chooseCollection(requestedCollection()));

function updateFocus() {
  const cards = visibleCards();
  cards.forEach((c, i) => {
    c.classList.toggle("is-selected", i === focusIndex);
  });
}

function openAt(i, newTab) {
  const cards = visibleCards();
  const card = cards[i];
  if (!card) return;
  const href = card.getAttribute("href");
  if (newTab) window.open(href, "_blank", "noopener");
  else location.assign(href);
}

grid.addEventListener("focusin", e => {
  const card=e.target.closest("a.card");
  if(card){focusIndex=visibleCards().indexOf(card);updateFocus();}
});
document.addEventListener("keydown", e => {
  if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest("input,textarea,select,[contenteditable]"))return;
  const cards=visibleCards();
  if(!cards.length)return;
  const focused=e.target.closest("a.card");
  if(e.target.closest("a,button")&&!focused)return;
  const columns=getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[e.key];
  if(delta){e.preventDefault();focusIndex=Math.max(0,Math.min(cards.length-1,focusIndex+delta));cards[focusIndex].focus();}
  else if(e.key>="1"&&e.key<="9"){e.preventDefault();openAt(Number(e.key)-1);}
  else if(e.key==="0"){e.preventDefault();openAt(9);}
  else if(e.key.toLowerCase()==="n"){e.preventDefault();openAt(focusIndex,true);}
});

chooseCollection(requestedCollection());
