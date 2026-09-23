
const STUDIES = [
  {
    "file": "same-n.html",
    "study": "01",
    "title": "SAME N",
    "claim": "Same count. Different claims.",
    "frozen": "N = 1,536",
    "free": "generative story",
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
    "question": "What can a shared count promise?",
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
  }
];

const SPECIMENS = {"10": "<img src=\"./assets/specimen-10.svg\" width=\"600\" height=\"360\" loading=\"lazy\" decoding=\"async\" alt=\"Three exact trajectories at step 32 and their distances from the reference\">", "01": "<img src=\"./assets/specimen-01.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Fibonacci sphere and equal-area disk, 1536 sites\">", "02": "<img src=\"./assets/specimen-02.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Occupied depth sections of the three bodies at y equals zero\">", "03": "<img src=\"./assets/specimen-03.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Same spherical disks in Mercator and Equal Earth\">", "04": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 280\" role=\"img\" aria-label=\"Three native nearest-site territory rasters\"><text x=\"10\" y=\"32\" fill=\"#b59bff\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Euclidean</text><image x=\"10\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-234484e861655759.png\" class=\"pixelated\"/><circle cx=\"42.40\" cy=\"196.40\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"74.80\" cy=\"158.60\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"146.80\" cy=\"207.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"168.40\" cy=\"153.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"101.80\" cy=\"138.80\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"35.20\" cy=\"99.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"125.20\" cy=\"84.80\" r=\"2.5\" fill=\"#f6f2ff\"/><text x=\"210\" y=\"32\" fill=\"#67d7c4\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Taxicab</text><image x=\"210\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-8d16cf429fb7cf56.png\" class=\"pixelated\"/><circle cx=\"242.40\" cy=\"196.40\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"274.80\" cy=\"158.60\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"346.80\" cy=\"207.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"368.40\" cy=\"153.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"301.80\" cy=\"138.80\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"235.20\" cy=\"99.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"325.20\" cy=\"84.80\" r=\"2.5\" fill=\"#f6f2ff\"/><text x=\"410\" y=\"32\" fill=\"#f2a65a\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Chebyshev</text><image x=\"410\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-076c376b72bb39e8.png\" class=\"pixelated\"/><circle cx=\"442.40\" cy=\"196.40\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"474.80\" cy=\"158.60\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"546.80\" cy=\"207.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"568.40\" cy=\"153.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"501.80\" cy=\"138.80\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"435.20\" cy=\"99.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"525.20\" cy=\"84.80\" r=\"2.5\" fill=\"#f6f2ff\"/></svg>", "05": "<img src=\"./assets/specimen-05.svg\" width=\"600\" height=\"360\" loading=\"lazy\" decoding=\"async\" alt=\"Three reconstructions above, and response to a unit change at sample five below\">", "06": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 280\" role=\"img\" aria-label=\"Carry Conduct and Share solved density fields and normalized compliance\"><text x=\"12\" y=\"32\" fill=\"#b59bff\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"18\">Carry</text><image x=\"12\" y=\"65\" width=\"176\" height=\"88\" href=\"./assets/specimen-e14c55e48094b7b8.png\" class=\"pixelated\"/><text x=\"12\" y=\"193\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Mech 1.00×</text><text x=\"12\" y=\"216\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Heat 213.90×</text><text x=\"12\" y=\"249\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"13\">ρ mean 0.40000</text><text x=\"212\" y=\"32\" fill=\"#67d7c4\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"18\">Conduct</text><image x=\"212\" y=\"65\" width=\"176\" height=\"88\" href=\"./assets/specimen-e5fdba18568ea88d.png\" class=\"pixelated\"/><text x=\"212\" y=\"193\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Mech 4715.55×</text><text x=\"212\" y=\"216\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Heat 1.00×</text><text x=\"212\" y=\"249\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"13\">ρ mean 0.40000</text><text x=\"412\" y=\"32\" fill=\"#f2a65a\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"18\">Share</text><image x=\"412\" y=\"65\" width=\"176\" height=\"88\" href=\"./assets/specimen-cb90acf4d36b1698.png\" class=\"pixelated\"/><text x=\"412\" y=\"193\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Mech 1.27×</text><text x=\"412\" y=\"216\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Heat 1.59×</text><text x=\"412\" y=\"249\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"13\">ρ mean 0.40001</text></svg>", "07": "<img src=\"./assets/specimen-07.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Three pairings of the same x and y values\">", "08": "<img src=\"./assets/specimen-08.svg\" width=\"600\" height=\"300\" loading=\"lazy\" decoding=\"async\" alt=\"Reversal: A leads pooled sixty to forty percent; B leads within both groups\">", "09": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 280\" role=\"img\" aria-label=\"Source borrowed and scrambled phase fields with a common Fourier magnitude\"><text x=\"10\" y=\"32\" fill=\"#b59bff\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Source</text><image x=\"10\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-20334e17a92ddbd8.png\" class=\"pixelated\"/><text x=\"210\" y=\"32\" fill=\"#67d7c4\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Borrowed</text><image x=\"210\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-d909bb7723c81e39.png\" class=\"pixelated\"/><text x=\"410\" y=\"32\" fill=\"#f2a65a\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Scrambled</text><image x=\"410\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-2c1dead2fafc4952.png\" class=\"pixelated\"/></svg>", "11": "<img src=\"assets/specimen-11.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"All 720 endpoints with given and reversed paths at lambda one\">", "12": "<img src=\"assets/specimen-12.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Quiet Slide and Spin velocity fields with identical source and witness square\">", "13": "<img src=\"./assets/specimen-13.svg\" width=\"900\" height=\"430\" loading=\"lazy\" decoding=\"async\" alt=\"Same degrees: three networks after two hops from A\">", "14": "<img src=\"./assets/specimen-14.svg\" width=\"640\" height=\"360\" loading=\"lazy\" decoding=\"async\" alt=\"Same applied impulse, different oscillator responses\">", "15": "<img src=\"./assets/specimen-15.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same eigenvalues, different transient norms\">", "16": "<img src=\"./assets/specimen-16.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same distances, opposite handedness\">", "17": "<img src=\"./assets/specimen-17.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same residual, different solution error\">", "18": "<img src=\"./assets/specimen-18.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Anscombe’s quartet: matching rounded summaries, different structures\">", "19": "<img src=\"./assets/specimen-19.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same numbers added, different totals\">"};
const CAPTIONS = {"10": "Step 32 · ε = 2⁻⁴⁰ · below: distance from A, logarithmic scale", "01": "Fibonacci shown · low spacing variation is one property, not an overall ranking", "02": "Section at y = 0 · identical occupied x extent · Well’s enclosed cavity is visible", "03": "Same disks · seam clipping · independently fitted map panels", "04": "Same seven sites · Euclidean, Taxicab and Chebyshev · native 360² rasters", "05": "Common axes within each panel · same measured values · different influence", "06": "Target 0.40 · achieved means 0.40000000 / 0.40000000 / 0.40001309 · local SIMP results", "07": "Same x and y lists · fixed pairing permutations · common axes", "08": "Reverse grouping shown · identical pooled rates · exact integer counts", "09": "Three real reconstructions · one magnitude array · common linear grayscale", "11": "All 720 endpoints · Given and Reversed paths · λ = 1 · fixed equal-unit axes", "12": "Shared source and arrow scale · witness flux 1/π² · y increases downward, as in the live exhibit", "13": "Source A, two hops · Spread reaches 8, Narrow 7, Apart 6 · every vertex has degree 3 · identical positions and 18 edges", "14": "Applied impulse 1 N·s in every case · two pulses 1 s apart · exact responses on fixed axes · residual envelope measured at 3 s", "15": "k = 0, 4, 12 · peak / initial norm 1.000×, 1.036×, 3.011× · fixed starting vector (0, 1), units, and Euclidean norm", "16": "The same six distances survive both panels. Left: the global rotation-and-translation minimum retains 1 unit of 3D RMS error. Right: reflection closes the gap. Both use the same projection and scale.", "17": "θ = 45° · relative residual 1.000% · relative error 70.714% · κ₂ = 100 · equal-unit circle and error ellipse", "18": "Anscombe’s quartet · 11 points each · lines round to y = 3.00 + 0.50x · actual fitted coefficients differ · variance y agrees at 1 decimal place", "19": "Shared fixed axis · computed − exact running total · Given −670 × 2⁻²⁰, Ascending +101 × 2⁻²⁰, Descending exact · shaded: Given holds the large value"};
const grid = document.getElementById("grid");
let focusIndex = 0;

function render() {
  if (!grid.querySelector(".card")) grid.innerHTML = STUDIES.map((s, i) => {
    const specimen = SPECIMENS[s.study];
    return `
    <a class="card" href="${s.file}" data-index="${i}" data-file="${s.file}">
      <div class="card-top">
        <span class="study-no">Field study ${s.study}</span>
        <span class="version">${s.version}</span>
      </div>
      <h2>${s.title}</h2>
      <p class="claim">${s.claim}</p><p class="question">${s.question}</p>
      <dl class="invariant">
        <div><dt>Frozen</dt><dd>${s.frozen}</dd></div>
        <div><dt>Free</dt><dd>${s.free}</dd></div>
      </dl>
      <div class="tags">
        <span class="domain">${s.domain}</span>
        ${s.methods.map(m => `<span class="${m===s.focus?"is-on":""}">${m}</span>`).join("")}
      </div>
      ${s.cost ? `<div class="cost">${s.cost}</div>` : ""}
      <div class="specimen">${specimen}</div>
      <div class="plate-cap">${CAPTIONS[s.study]}</div>
      <div class="card-foot">
        <span>${s.focus} opens first</span>
        <span class="go">Open →</span>
      </div>
    </a>`;
  }).join("");
  focusIndex = 0;
  updateFocus();
}

function updateFocus() {
  const cards = [...grid.querySelectorAll(".card")];
  cards.forEach((c, i) => {
    c.classList.toggle("is-selected", i === focusIndex);
  });
}

function openAt(i, newTab) {
  const cards = [...grid.querySelectorAll(".card")];
  const card = cards[i];
  if (!card) return;
  const href = card.getAttribute("href");
  if (newTab) window.open(href, "_blank", "noopener");
  else location.assign(href);
}

grid.addEventListener("focusin", e => {
  const card=e.target.closest("a.card");
  if(card){focusIndex=Number(card.dataset.index);updateFocus();}
});
document.addEventListener("keydown", e => {
  if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest("input,textarea,select,[contenteditable]"))return;
  const cards=[...grid.querySelectorAll(".card")];
  if(!cards.length)return;
  const focused=e.target.closest("a.card");
  if(e.target.closest("a,button")&&!focused)return;
  const columns=getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[e.key];
  if(delta){e.preventDefault();focusIndex=Math.max(0,Math.min(cards.length-1,focusIndex+delta));cards[focusIndex].focus();}
  else if(e.key>="1"&&e.key<="9"){e.preventDefault();openAt(Number(e.key)-1,false);}
  else if(e.key==="0"){e.preventDefault();openAt(9,false);}
  else if(e.key.toLowerCase()==="n"){e.preventDefault();openAt(focusIndex,true);}
});

render();
  