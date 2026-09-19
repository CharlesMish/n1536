
const PLATES = [
  {
    "id": "p01",
    "n": "01",
    "file": "same-n.html",
    "title": "SAME N",
    "claim": "Same count. Different claims.",
    "frozen": "N = 1,536",
    "free": [
      "Random",
      "Sobol",
      "Fibonacci"
    ],
    "focus": "Fibonacci",
    "domain": "spherical sampling",
    "cost": null,
    "question": "What can a shared count promise?",
    "explanation": "Count does not determine coverage, dependence, or suitability for a task. The spacing statistic answers one specific question."
  },
  {
    "id": "p02",
    "n": "02",
    "file": "same-shadow-2.html",
    "title": "SAME SHADOW",
    "claim": "Same projection. Different bodies.",
    "frozen": "one silhouette",
    "free": [
      "Prism",
      "Grade",
      "Well"
    ],
    "focus": "Prism",
    "domain": "occupancy from a projection",
    "cost": null,
    "question": "What did the view discard?",
    "explanation": "A single projection hides occupied depth. Turn the body, then return to the canonical face to recover the invariant."
  },
  {
    "id": "p03",
    "n": "03",
    "file": "same-earth.html",
    "title": "SAME EARTH",
    "claim": "Same planet. Different frames.",
    "frozen": "one sampled surface",
    "free": [
      "Globe",
      "Mercator",
      "Equal Earth"
    ],
    "focus": "Globe",
    "domain": "measure vs shape",
    "cost": null,
    "question": "What did the projection change?",
    "explanation": "The sphere is the reference surface. Its globe view is an orthographic projection too; Mercator and Equal Earth make different local trade-offs."
  },
  {
    "id": "p04",
    "n": "04",
    "file": "same-sites3.html",
    "title": "SAME SITES",
    "claim": "Same generators. Different territory.",
    "frozen": "seven generators",
    "free": [
      "Euclidean",
      "Taxicab",
      "Chebyshev"
    ],
    "focus": "Euclidean",
    "domain": "nearest-site territory",
    "cost": null,
    "question": "Who defined nearest?",
    "explanation": "The generators stay put. Changing the distance rule changes which generator owns each location."
  },
  {
    "id": "p05",
    "n": "05",
    "file": "same-samples-2.html",
    "title": "SAME SAMPLES",
    "claim": "Same samples. Different assumptions.",
    "frozen": "one measured set",
    "free": [
      "Global",
      "Local",
      "Periodic"
    ],
    "focus": "Global",
    "domain": "model / influence",
    "cost": null,
    "question": "What does one measurement control?",
    "explanation": "Inspect the response to a hypothetical +1 at one sample. The reach of that change reveals the assumption behind each interpolant."
  },
  {
    "id": "p06",
    "n": "06",
    "file": "same-volume-series-pass.html",
    "title": "SAME VOLUME",
    "claim": "Same target budget. Different obligations.",
    "frozen": "target mean density 0.40",
    "free": [
      "Carry",
      "Conduct",
      "Share"
    ],
    "focus": "Carry",
    "domain": "structure / allocation",
    "cost": "slow to form",
    "question": "What does better mean?",
    "explanation": "One target budget serves three objectives. The achieved mean is numerical and shown explicitly; lower compliance means better only for its named objective."
  },
  {
    "id": "p07",
    "n": "07",
    "file": "same-marginals-2.html",
    "title": "SAME MARGINALS",
    "claim": "Same x. Same y. Different pairing.",
    "frozen": "same x, same y",
    "free": [
      "Align",
      "Oppose",
      "Scramble"
    ],
    "focus": "Align",
    "domain": "coupling",
    "cost": null,
    "question": "What did the separate lists lose?",
    "explanation": "The same x values and the same y values permit different pairings. Marginal information does not determine joint behavior."
  },
  {
    "id": "p08",
    "n": "08",
    "file": "same-average.html",
    "title": "SAME AVERAGE",
    "claim": "Same averages. Different groups.",
    "frozen": "400 records · A 60%, B 40%",
    "free": [
      "Agree",
      "Disappear",
      "Reverse"
    ],
    "focus": "Agree",
    "domain": "aggregation / weights",
    "cost": null,
    "question": "Whose weights made the average?",
    "explanation": "Keep all 400 records and both pooled rates. Change group membership to make the within-group difference agree, disappear, or reverse."
  },
  {
    "id": "p09",
    "n": "09",
    "file": "same-magnitude-2.html",
    "title": "SAME MAGNITUDE",
    "claim": "Same Fourier magnitude. Different structure.",
    "frozen": "one Fourier magnitude",
    "free": [
      "Source",
      "Borrowed",
      "Scrambled"
    ],
    "focus": "Source",
    "domain": "spectrum vs structure",
    "cost": null,
    "question": "What did magnitude leave out?",
    "explanation": "Phase carries structure that a Fourier magnitude array cannot recover. The three images use one shared grayscale."
  },
  {
    "id": "p10",
    "n": "10",
    "file": "same-law.html",
    "title": "SAME LAW",
    "claim": "Same rule. Different histories.",
    "frozen": "update rule · domain · grid",
    "free": [
      "A",
      "B",
      "C"
    ],
    "focus": "Step 32",
    "domain": "dynamics / prediction",
    "cost": null,
    "question": "What else does a prediction need?",
    "explanation": "A fixed update rule does not specify an initial state. Three nearby starts follow exactly the same rule into different histories."
  },
  {
    "id": "p11",
    "n": "11",
    "file": "same-moves.html",
    "title": "SAME MOVES",
    "claim": "Same moves. Different place.",
    "frozen": "six rigid motions · λ = 1",
    "focus": "Given",
    "domain": "rigid motion / composition",
    "cost": null,
    "question": "What did order change?",
    "explanation": "Every ordering shares its total rotation and length, but the endpoint depends on composition order. Turn scale λ changes the moves; zero makes them commute.",
    "free": [
      "Given",
      "Reversed",
      "Shuffled"
    ]
  },
  {
    "id": "p12",
    "n": "12",
    "file": "same-divergence.html",
    "title": "SAME DIVERGENCE",
    "claim": "Same sources. Different flow.",
    "frozen": "source field ρ · witness flux",
    "focus": "Quiet",
    "domain": "vector fields / underdetermination",
    "cost": null,
    "question": "What did the sources leave open?",
    "explanation": "Equal divergence and witness flux do not determine the velocity field. Added divergence-free components change curl, circulation and trajectories.",
    "free": [
      "Quiet",
      "Slide",
      "Spin"
    ]
  },
  {
    "id": "p13",
    "n": "13",
    "file": "same-degrees.html",
    "title": "SAME DEGREES",
    "claim": "Same neighbors counted. Different worlds.",
    "frozen": "12 vertices · degree 3 · 18 edges · positions",
    "focus": "Spread",
    "domain": "networks / reachability",
    "cost": null,
    "question": "Can every local count match while the network comes apart?",
    "explanation": "Send a pulse from one vertex. Three exact cubic graphs keep every degree at three while their routes and connected components change.",
    "free": [
      "Spread",
      "Narrow",
      "Apart"
    ]
  },
  {
    "id": "p14",
    "n": "14",
    "file": "same-impulse.html",
    "title": "SAME IMPULSE",
    "claim": "Same push integrated. Different motion.",
    "frozen": "applied impulse · oscillator · starting rest",
    "focus": "Two pulses · 1 s apart",
    "domain": "forced linear dynamics",
    "cost": null,
    "question": "How much does the timing of a push matter?",
    "explanation": "Equal applied-force area does not fix a spring–mass–damper’s motion. Time the second pulse and compare peak displacement and the residual vibration at one shared instant.",
    "free": [
      "Early pulse",
      "Broad push",
      "Two pulses"
    ]
  },
  {
    "id": "p15",
    "n": "15",
    "file": "same-eigenvalues.html",
    "title": "SAME EIGENVALUES",
    "claim": "Same eventual stability. Different excursions.",
    "frozen": "eigenvalues −1, −2 · start (0, 1) · units · norm",
    "focus": "k = 12",
    "domain": "linear dynamics / transient growth",
    "cost": null,
    "question": "Does eventual decay mean a disturbance never grows?",
    "explanation": "The eigenvalues stay negative as coupling changes. With one fixed start, coordinate system, and norm, the state can first travel farther from zero before it decays.",
    "free": [
      "k = 0",
      "k = 4",
      "k = 12"
    ]
  },
  {
    "id": "p16",
    "n": "16",
    "file": "same-distances.html",
    "title": "SAME DISTANCES",
    "claim": "Same distances. Different handedness.",
    "frozen": "six distances; four labels; units",
    "focus": "Manual rotation",
    "domain": "distance geometry",
    "cost": null,
    "question": "Can equal distances certify a proper rigid match?",
    "explanation": "A labeled tetrahedron and its mirror share all six edge lengths. Their opposite signed volumes forbid a proper rigid match: the certified best 3D RMS error is 1 unit, while reflection aligns them exactly.",
    "free": [
      "Rotate",
      "Best proper fit",
      "Reflect"
    ]
  },
  {
    "id": "p17",
    "n": "17",
    "file": "same-residual.html",
    "title": "SAME RESIDUAL",
    "claim": "Same residual size. Different error.",
    "frozen": "matrix A · right-hand side b · residual norm 1 · units",
    "focus": "45° diagonal",
    "domain": "linear algebra / conditioning",
    "cost": null,
    "question": "Does the same residual size promise the same solution error?",
    "explanation": "A unit residual rotates through one fixed linear system. The corresponding error traces a 100-to-1 ellipse; relative amplification varies from 1 to 100 while the condition-number bound stays fixed.",
    "free": [
      "First axis",
      "Diagonal",
      "Second axis"
    ]
  },
  {
    "id": "p18",
    "n": "18",
    "file": "same-fit.html",
    "title": "SAME FIT",
    "claim": "Same fitted summary. Different structure.",
    "frozen": "11 observations · summary at declared rounding precision · shared axes",
    "focus": "all four datasets",
    "domain": "statistics / regression diagnostics",
    "cost": null,
    "question": "What did the fitted summary leave out?",
    "explanation": "Anscombe’s four datasets share rounded means, variances, correlation and fitted coefficients. Their actual computed fits differ slightly, while their point arrangements and residual patterns differ visibly.",
    "free": [
      "Quartet I",
      "Quartet II",
      "Quartet III",
      "Quartet IV"
    ]
  }
];

const FIGS = {"p01": "<img src=\"./assets/specimen-01.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Fibonacci sphere and equal-area disk, 1536 sites\">", "p02": "<img src=\"./assets/specimen-02.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Occupied depth sections of the three bodies at y equals zero\">", "p03": "<img src=\"./assets/specimen-03.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Same spherical disks in Mercator and Equal Earth\">", "p04": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 280\" role=\"img\" aria-label=\"Three native nearest-site territory rasters\"><text x=\"10\" y=\"32\" fill=\"#b59bff\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Euclidean</text><image x=\"10\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-234484e861655759.png\" class=\"pixelated\"/><circle cx=\"42.40\" cy=\"196.40\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"74.80\" cy=\"158.60\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"146.80\" cy=\"207.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"168.40\" cy=\"153.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"101.80\" cy=\"138.80\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"35.20\" cy=\"99.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"125.20\" cy=\"84.80\" r=\"2.5\" fill=\"#f6f2ff\"/><text x=\"210\" y=\"32\" fill=\"#67d7c4\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Taxicab</text><image x=\"210\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-8d16cf429fb7cf56.png\" class=\"pixelated\"/><circle cx=\"242.40\" cy=\"196.40\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"274.80\" cy=\"158.60\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"346.80\" cy=\"207.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"368.40\" cy=\"153.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"301.80\" cy=\"138.80\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"235.20\" cy=\"99.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"325.20\" cy=\"84.80\" r=\"2.5\" fill=\"#f6f2ff\"/><text x=\"410\" y=\"32\" fill=\"#f2a65a\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Chebyshev</text><image x=\"410\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-076c376b72bb39e8.png\" class=\"pixelated\"/><circle cx=\"442.40\" cy=\"196.40\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"474.80\" cy=\"158.60\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"546.80\" cy=\"207.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"568.40\" cy=\"153.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"501.80\" cy=\"138.80\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"435.20\" cy=\"99.20\" r=\"2.5\" fill=\"#f6f2ff\"/><circle cx=\"525.20\" cy=\"84.80\" r=\"2.5\" fill=\"#f6f2ff\"/></svg>", "p05": "<img src=\"./assets/specimen-05.svg\" width=\"600\" height=\"360\" loading=\"lazy\" decoding=\"async\" alt=\"Three reconstructions above, and response to a unit change at sample five below\">", "p06": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 280\" role=\"img\" aria-label=\"Carry Conduct and Share solved density fields and normalized compliance\"><text x=\"12\" y=\"32\" fill=\"#b59bff\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"18\">Carry</text><image x=\"12\" y=\"65\" width=\"176\" height=\"88\" href=\"./assets/specimen-e14c55e48094b7b8.png\" class=\"pixelated\"/><text x=\"12\" y=\"193\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Mech 1.00×</text><text x=\"12\" y=\"216\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Heat 213.90×</text><text x=\"12\" y=\"249\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"13\">ρ mean 0.40000</text><text x=\"212\" y=\"32\" fill=\"#67d7c4\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"18\">Conduct</text><image x=\"212\" y=\"65\" width=\"176\" height=\"88\" href=\"./assets/specimen-e5fdba18568ea88d.png\" class=\"pixelated\"/><text x=\"212\" y=\"193\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Mech 4715.55×</text><text x=\"212\" y=\"216\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Heat 1.00×</text><text x=\"212\" y=\"249\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"13\">ρ mean 0.40000</text><text x=\"412\" y=\"32\" fill=\"#f2a65a\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"18\">Share</text><image x=\"412\" y=\"65\" width=\"176\" height=\"88\" href=\"./assets/specimen-cb90acf4d36b1698.png\" class=\"pixelated\"/><text x=\"412\" y=\"193\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Mech 1.27×</text><text x=\"412\" y=\"216\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"14\">Heat 1.59×</text><text x=\"412\" y=\"249\" fill=\"#c9c0e5\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"13\">ρ mean 0.40001</text></svg>", "p07": "<img src=\"./assets/specimen-07.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Three pairings of the same x and y values\">", "p08": "<img src=\"./assets/specimen-08.svg\" width=\"600\" height=\"300\" loading=\"lazy\" decoding=\"async\" alt=\"Reversal: A leads pooled sixty to forty percent; B leads within both groups\">", "p09": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 280\" role=\"img\" aria-label=\"Source borrowed and scrambled phase fields with a common Fourier magnitude\"><text x=\"10\" y=\"32\" fill=\"#b59bff\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Source</text><image x=\"10\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-20334e17a92ddbd8.png\" class=\"pixelated\"/><text x=\"210\" y=\"32\" fill=\"#67d7c4\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Borrowed</text><image x=\"210\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-d909bb7723c81e39.png\" class=\"pixelated\"/><text x=\"410\" y=\"32\" fill=\"#f2a65a\" font-family=\"Helvetica,Arial,sans-serif\" font-size=\"17\">Scrambled</text><image x=\"410\" y=\"56\" width=\"180\" height=\"180\" href=\"./assets/specimen-2c1dead2fafc4952.png\" class=\"pixelated\"/></svg>", "p10": "<img src=\"./assets/specimen-10.svg\" width=\"600\" height=\"360\" loading=\"lazy\" decoding=\"async\" alt=\"Three exact trajectories at step 32 and their distances from the reference\">", "p11": "<img src=\"assets/specimen-11.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"All 720 endpoints with given and reversed paths at lambda one\">", "p12": "<img src=\"assets/specimen-12.svg\" width=\"600\" height=\"280\" loading=\"lazy\" decoding=\"async\" alt=\"Quiet Slide and Spin velocity fields with identical source and witness square\">", "p13": "<img src=\"./assets/specimen-13.svg\" width=\"900\" height=\"430\" loading=\"lazy\" decoding=\"async\" alt=\"Same degrees: three networks after two hops from A\">", "p14": "<img src=\"./assets/specimen-14.svg\" width=\"640\" height=\"360\" loading=\"lazy\" decoding=\"async\" alt=\"Same applied impulse, different oscillator responses\">", "p15": "<img src=\"./assets/specimen-15.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same eigenvalues, different transient norms\">", "p16": "<img src=\"./assets/specimen-16.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same distances, opposite handedness\">", "p17": "<img src=\"./assets/specimen-17.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Same residual, different solution error\">", "p18": "<img src=\"./assets/specimen-18.svg\" width=\"560\" height=\"330\" loading=\"lazy\" decoding=\"async\" alt=\"Anscombe’s quartet: matching rounded summaries, different structures\">"};
const CAPTIONS = {"10": "Step 32 · ε = 2⁻⁴⁰ · below: distance from A, logarithmic scale", "01": "Fibonacci shown · low spacing variation is one property, not an overall ranking", "02": "Section at y = 0 · identical occupied x extent · Well’s enclosed cavity is visible", "03": "Same disks · seam clipping · independently fitted map panels", "04": "Same seven sites · Euclidean, Taxicab and Chebyshev · native 360² rasters", "05": "Common axes within each panel · same measured values · different influence", "06": "Target 0.40 · achieved means 0.40000000 / 0.40000000 / 0.40001309 · local SIMP results", "07": "Same x and y lists · fixed pairing permutations · common axes", "08": "Reverse grouping shown · identical pooled rates · exact integer counts", "09": "Three real reconstructions · one magnitude array · common linear grayscale", "11": "All 720 endpoints · Given and Reversed paths · λ = 1 · fixed equal-unit axes", "12": "Shared source and arrow scale · witness flux 1/π² · y increases downward, as in the live exhibit", "13": "Source A, two hops · Spread reaches 8, Narrow 7, Apart 6 · every vertex has degree 3 · identical positions and 18 edges", "14": "Applied impulse 1 N·s in every case · two pulses 1 s apart · exact responses on fixed axes · residual envelope measured at 3 s", "15": "k = 0, 4, 12 · peak / initial norm 1.000×, 1.036×, 3.011× · fixed starting vector (0, 1), units, and Euclidean norm", "16": "The same six distances survive both panels. Left: the global rotation-and-translation minimum retains 1 unit of 3D RMS error. Right: reflection closes the gap. Both use the same projection and scale.", "17": "θ = 45° · relative residual 1.000% · relative error 70.714% · κ₂ = 100 · equal-unit circle and error ellipse", "18": "Anscombe’s quartet · 11 points each · lines round to y = 3.00 + 0.50x · actual fitted coefficients differ · variance y agrees at 1 decimal place"};

const book = document.getElementById("book");
const toc = document.getElementById("toc");
if (!toc.querySelector("a")) toc.innerHTML = `<a href="#title">Title</a>` + PLATES.map(p => `<a href="#${p.id}" aria-label="Plate ${p.n}: ${p.title}">${p.n}</a>`).join("");

if (!book.querySelector(".spread")) book.innerHTML = PLATES.map((p, i) => {
  const prev = i === 0 ? {href:"#title", label:"Title"} : {href:"#"+PLATES[i-1].id, label:PLATES[i-1].n};
  const next = i === PLATES.length-1 ? {href:"#title", label:"Title"} : {href:"#"+PLATES[i+1].id, label:PLATES[i+1].n};
  return `
  <article class="spread" id="${p.id}">
    <a class="prev" href="${prev.href}">${prev.label} ←</a>
    <a class="next" href="${next.href}">→ ${next.label}</a>
    <div class="copy">
      <div class="num">${p.n}</div>
      <h2>${p.title}</h2>
      <p class="claim">${p.claim}</p>
      <dl class="inv">
        <div><dt>Frozen</dt><dd>${p.frozen}</dd></div>
        <div><dt>Free</dt><dd>${p.free.map(m => m===p.focus ? `<span class="on">${m}</span>` : m).join(" · ")}</dd></div>
      </dl>
      <p class="domain">${p.domain}</p><h3 class="question">${p.question}</h3><p class="explanation">${p.explanation}</p>
      ${p.cost ? `<div class="cost">${p.cost}</div>` : ""}
      <a class="enter" href="${p.file}">Enter live exhibit →</a>
    </div>
    <figure class="plate">
      <span class="tick-ne"></span><span class="tick-sw"></span>
      <div class="plate-stage">${FIGS[p.id]}</div>
      <figcaption class="caption">${CAPTIONS[p.n]}</figcaption>
    </figure>
  </article>`;
}).join("");

const now = document.getElementById("now");
const jumps = ["title", ...PLATES.map(p => p.id)];
const rail = document.querySelector(".rail");
let currentPlate = "title";
function updateRail() {
  document.documentElement.style.setProperty("--rail-height", `${rail.offsetHeight + 16}px`);
  mark();
}
if (typeof ResizeObserver !== "undefined") new ResizeObserver(updateRail).observe(rail);
else window.addEventListener("resize", updateRail);
function mark() {
  const y = window.scrollY + rail.offsetHeight + 16;
  let cur = "Title";
  let on = "title";
  if (window.scrollY < 40) { cur = "Title"; on = "title"; }
  else {
    for (const p of PLATES) {
      const el = document.getElementById(p.id);
      if (el && el.offsetTop <= y) { cur = `${p.n} ${p.title}`; on = p.id; }
    }
  }
  currentPlate = on;
  now.textContent = cur;
  toc.querySelectorAll("a").forEach(a => a.classList.toggle("is-on", a.getAttribute("href") === "#"+on));
}
document.addEventListener("scroll", mark, {passive:true});
updateRail();

document.addEventListener("keydown", (e) => {
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest('input,textarea,select,button,a,[contenteditable]'))return;
 if(/^[0-9]$/.test(e.key)){e.preventDefault();location.hash=PLATES[e.key==='0'?9:Number(e.key)-1].id;}
 else if(['j','k','ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){
  e.preventDefault();const i=jumps.indexOf(currentPlate);
  const d=['j','ArrowDown','ArrowRight'].includes(e.key)?1:-1;
  location.hash=jumps[Math.max(0,Math.min(jumps.length-1,Math.max(0,i)+d))];
 }
});
