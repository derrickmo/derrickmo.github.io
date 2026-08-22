// GENERATED from content/lessons/interview-capstone/interview-landscape.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/interview-capstone/interview-landscape/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "interview-landscape": {
    "level": "intro",
    "body": {
      "intuition": [
        "An interview loop is a classifier with a small sample size, a noisy signal and an aggressive threshold. That is not a metaphor - it is the literal structure, and the curriculum you just finished is the right toolkit for reasoning about it. Doing so produces advice that is different from, and better than, the usual list of tips.",
        "The numbers are sobering in both directions. A single 45-minute interview at realistic noise separates people who would succeed in the role from those who would not with an AUC of 0.778 - better than chance, well short of reliable. A four-interview loop gets to 0.899, which is why loops exist. And at a 10% accept rate that loop REJECTS 60.5% of genuinely qualified candidates; at 5%, 77.9%. Rejection is close to uninformative about ability, and the arithmetic is what says so, not consolation.",
        "The module's thesis is what falls out when you ask what a candidate controls. You cannot change the threshold or the loop size. You can change your position in the ranking, and you can change the VARIANCE with which an interviewer reads you. Structure - stated assumptions, an explicit skeleton, named trade-offs - is variance reduction. And it is an amplifier with the sign of your actual level: at the 95th percentile it moves P(offer) from 0.522 to 0.792, and at the 75th it moves it from 0.108 to 0.025."
      ],
      "math": [
        {
          "h": "One interview is a weak classifier; the loop is the fix",
          "paras": [
            "Model the observed score as true ability plus independent noise. Averaging k interviews shrinks the noise by root k, which is exactly why a bad interview is survivable and why loops are four to six people rather than one.",
            "AUC against the outcome that matters - would this person succeed in the role - not against 'did they answer correctly'."
          ],
          "tex": "s_i = a + \\varepsilon_i,\\ \\varepsilon\\sim N(0,\\sigma^2), \\quad \\bar{s}_k = a + N(0,\\sigma^2/k): \\quad \\mathrm{AUC}\\big|_{\\sigma=1.5} = 0.778\\ (k{=}1) \\to 0.899\\ (k{=}4) \\to 0.927\\ (k{=}6)",
          "texNote": "At sigma = 1.0 the same numbers are 0.855, 0.947, 0.963. The returns to loop length are steeply diminishing, which is why nobody runs a twelve-interview loop and why the marginal interview is often replaced by a work sample."
        },
        {
          "h": "★ The base rate makes rejection nearly uninformative",
          "paras": [
            "Precision and false-negative rate move in opposite directions as the bar tightens. A selective process buys precision by discarding most of the qualified pool.",
            "Four-interview loop, sigma = 1.5, 'qualified' defined as the top 20% by true ability."
          ],
          "tex": "\\begin{array}{lrr} \\text{accept rate} & \\text{precision} & \\text{FNR among qualified}\\\\ 30\\% & 0.533 & 0.200\\\\ 10\\% & 0.790 & \\mathbf{0.605}\\\\ 5\\% & 0.885 & \\mathbf{0.779}\\\\ 2\\% & 0.954 & 0.905 \\end{array}",
          "texNote": "At a 5% accept rate roughly four in five qualified candidates are rejected. That is a property of the PROCESS. It also means an offer is strong evidence and a rejection is weak evidence, which is the correct asymmetry to internalize."
        },
        {
          "h": "★ Structure is an amplifier with the sign of your level",
          "paras": [
            "P(offer) for one candidate at a given true percentile, with the company hiring the top 10% in every column. Lower sigma is a more legible candidate.",
            "The crossover sits just below the bar, and that is the honest part of this lesson."
          ],
          "tex": "\\begin{array}{lrrr} \\text{your percentile} & \\sigma{=}1.5 & \\sigma{=}1.0 & \\sigma{=}0.7\\\\ 75\\% & 0.108 & 0.065 & \\mathbf{0.025}\\\\ 85\\% & 0.226 & 0.215 & 0.180\\\\ 90\\% & 0.335 & 0.381 & 0.413\\\\ 95\\% & 0.522 & 0.663 & \\mathbf{0.792}\\\\ 98\\% & 0.725 & 0.892 & \\mathbf{0.976} \\end{array}",
          "texNote": "Below the bar, interviewer noise is a lottery ticket and legibility cashes it in. Above it, noise is what loses loops you should have won. Structure is not a trick that substitutes for substance."
        }
      ],
      "code": [
        {
          "h": "Correlated noise does not average out",
          "paras": [
            "A shared resume, a recruiter's note, a mid-loop debrief - anything the interviewers have in common makes their errors correlated, and the root-k benefit evaporates."
          ],
          "code": "# 4-interview loop, sigma = 1.5, varying the SHARED component of the noise\n#   rho = 0.0  ->  AUC 0.900     (fully independent, the ideal)\n#   rho = 0.2  ->  AUC 0.862\n#   rho = 0.4  ->  AUC 0.833\n#   rho = 0.6  ->  AUC 0.810\n\n# ★ A 4-loop at rho = 0.4 carries roughly the signal of a much shorter\n#   independent one. Companies pay for this with blind resumes, no mid-loop\n#   debriefs, and independent written feedback BEFORE the panel meets.\n\n# For a candidate the implication is the reverse and it is actionable:\n# the shared component is largely set in the first five minutes and by\n# your written materials, so it is worth disproportionate preparation.",
          "caption": "The strongest argument for independent scoring is the same variance argument as ensembling - and it fails for the same reason, shared bias."
        },
        {
          "h": "What the loop is actually sampling",
          "paras": [
            "Each round targets a different dimension, so preparing them as one undifferentiated 'interview prep' misallocates effort."
          ],
          "code": "# ROUND               MEASURES                        FAILS BECAUSE\n# coding              can you write correct code       silent bugs, no tests,\n#                     under mild pressure              narrating nothing\n# ML breadth          have you actually used this      memorized definitions\n#                     or only read about it            with no failure modes\n# ML depth/derivation do you understand WHY            can state it, cannot\n#                                                      derive or perturb it\n# ML system design    can you scope, trade off,        jumps to a model, never\n#                     and own a decision               names a metric or a cost\n# project deep-dive   is your resume load-bearing      cannot say what you\n#                                                      personally decided\n# behavioural         will this go badly               no specifics, no conflict,\n#                                                      no thing you got wrong\n\n# ★ The system design and project rounds have the HIGHEST variance and the\n#   most controllable variance. That is where structure pays.",
          "caption": "Five of these six rounds reward the same behaviour: say what you are doing, say why, and name what you traded away."
        }
      ],
      "useCases": [
        "Deciding how to allocate limited preparation time across rounds, by targeting the ones with the highest controllable variance rather than the ones that feel worst.",
        "Interpreting your own results honestly - a rejection at a 5% accept rate is weak evidence, and a pattern across many loops is the signal worth acting on.",
        "Choosing how many processes to run in parallel, since at the 90th percentile a structured candidate needs about 2.4 loops for a first offer and an unstructured one about 3.0.",
        "Designing an interview loop from the other side, where independence of scoring and a fixed rubric are the two changes with the largest measured effect."
      ],
      "pitfalls": [
        "Reading a rejection as information about your ability. At a 10% accept rate the loop rejects 60.5% of genuinely qualified candidates, and at 5% it rejects 77.9%.",
        "Assuming structure substitutes for substance. Below the bar it actively hurts - at the 75th percentile, halving interviewer noise took P(offer) from 0.108 to 0.025.",
        "Preparing every round the same way. Coding, breadth, depth, design, project and behavioural measure different things and fail for different reasons.",
        "Ignoring the correlated-noise problem. A weak first impression or a thin resume contaminates the whole loop, and shared noise does not average out - rho = 0.4 cost 0.067 of AUC.",
        "Optimizing for the interview rather than the job, which is Goodhart from module 24 and shows up as candidates who can recite a design skeleton and cannot say what they would do when it breaks.",
        "Treating one loop as a measurement. A single loop at the 90th percentile has P(offer) of about 0.34 unstructured, so running one process and drawing a conclusion is a sample size of one.",
        "Believing the process measures ability directly. It measures interview performance, which correlates with ability and is confounded by preparation, familiarity and format - module 23's problem in a suit."
      ],
      "connections": [
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "Precision, recall and the base-rate effect, which is exactly the arithmetic of an accept rate and the reason rejection is weak evidence."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Why loop length has diminishing returns - the same root-n scaling as a minimum detectable effect, and the same reason variance reduction beats more samples."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "The self-assessment version: your confidence in your own level is a probability that should be checked against outcomes, and it usually is not."
        },
        {
          "ref": "interview-capstone/system-design-framework",
          "text": "The round with the highest controllable variance, and the skeleton that reduces it."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Goodhart applied to your own preparation - optimizing the proxy (interview performance) past the point where it tracks the thing you want."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How good a classifier is one interview?",
          "a": "AUC 0.778 at realistic noise (σ=1.5) against 'would succeed in the role'. Better than chance, well short of reliable."
        },
        {
          "q": "What does a 4-interview loop buy?",
          "a": "AUC 0.778 → 0.899; six rounds → 0.927. Averaging k interviews shrinks noise by √k, which is why one bad round is survivable."
        },
        {
          "q": "★ What's the false-negative rate of a selective loop?",
          "a": "At a 10% accept rate, **60.5%** of qualified candidates are rejected. At 5%, **77.9%**."
        },
        {
          "q": "So what does a rejection tell you?",
          "a": "Very little. An offer is strong evidence; a rejection is weak evidence. That asymmetry is a property of the process, not consolation."
        },
        {
          "q": "What two levers does a candidate have?",
          "a": "Position in the ranking (ability), and the VARIANCE with which an interviewer reads you (legibility)."
        },
        {
          "q": "★ Does structure always help?",
          "a": "No — it's an amplifier with the sign of your level. At the 95th percentile σ 1.5→0.7 moves P(offer) 0.522 → **0.792**. At the 75th it moves it 0.108 → **0.025**."
        },
        {
          "q": "Why does it hurt below the bar?",
          "a": "Interviewer noise is a lottery ticket for an underqualified candidate, and being legible cashes it in."
        },
        {
          "q": "What does correlated noise do to a loop?",
          "a": "Destroys the √k benefit. 4-loop AUC 0.900 → 0.862 → 0.833 → 0.810 as ρ goes 0 → 0.2 → 0.4 → 0.6."
        },
        {
          "q": "Where does that correlation come from?",
          "a": "Shared context: the resume, a recruiter note, a mid-loop debrief. Companies counter it with blind materials and independent written feedback before the panel meets."
        },
        {
          "q": "Which rounds have the most controllable variance?",
          "a": "System design and the project deep-dive. That's where structure pays most, and where preparation is most underweighted."
        },
        {
          "q": "How many loops to a first offer?",
          "a": "At the 90th percentile: ~3.0 unstructured, ~2.4 structured. P(≥1 offer in 5 loops): 0.870 vs 0.930."
        },
        {
          "q": "Does the loop measure ability?",
          "a": "It measures interview PERFORMANCE, which correlates with ability and is confounded by preparation, familiarity and format — module 23's problem in a suit."
        }
      ],
      "standard": [
        {
          "q": "Treat an interview loop as a measurement system. What does the analysis say?",
          "a": "IT IS A LOW-N, HIGH-NOISE CLASSIFIER WITH AN AGGRESSIVE THRESHOLD, and modelling it that way produces better advice than the usual tips. Model the observed score as true ability plus independent noise. At realistic noise a SINGLE 45-minute interview separates 'would succeed in the role' from 'would not' with an AUC of 0.778 — real signal, far from reliable. Averaging four rounds shrinks the noise by root k and gets to 0.899; six rounds gets 0.927, and the returns are steeply diminishing, which is why nobody runs a twelve-round loop. THEN THE BASE RATE, which is the part candidates most need. At a 10% accept rate that four-round loop has precision 0.790 and rejects 60.5% of genuinely qualified candidates; at 5% it rejects 77.9%. So the process is deliberately tuned to buy precision with false negatives, and THE ASYMMETRY THAT FOLLOWS IS THE USEFUL CONCLUSION: an offer is strong evidence about you, and a rejection is weak evidence. Not as reassurance — as arithmetic. A candidate drawing conclusions from one rejection is working with a sample size of one on a measurement with an AUC below 0.9.",
          "deepDive": {
            "q": "Which result changes behaviour on both sides of the table?",
            "a": "The correlated-noise result is the one that changes behaviour on both sides of the table. The root-k benefit assumes independent errors, and interviewers share a great deal: the resume, a recruiter's framing, sometimes a mid-loop conversation. Adding a shared noise component takes the four-loop AUC from 0.900 at rho = 0 to 0.833 at rho = 0.4 — a four-round loop delivering roughly the signal of a much shorter independent one. That is exactly the ensembling result from module 24, where averaging removes independent error and leaves shared bias untouched, and it is why serious processes use blind materials, fixed rubrics, and independent written feedback submitted BEFORE the panel meets. For a candidate the implication runs the other way and is actionable: the shared component is largely set by your written materials and the first five minutes, so those deserve disproportionate preparation relative to their duration. It is also the honest explanation for why loops sometimes feel like the decision was made early — sometimes it was, and the remaining rounds were sampling correlated noise."
          }
        },
        {
          "q": "What should a candidate actually optimize, and what is the honest limit of that advice?",
          "a": "TWO LEVERS, AND ONLY ONE IS FAST. You can move up the ranking, which is real learning and slow, or you can reduce the VARIANCE with which an interviewer reads you, which is structure — stating assumptions, laying out a skeleton before diving in, naming what you traded away, narrating while you code. Measured as P(offer) for one candidate against a fixed top-10% bar: raising true ability from the 85th to the 95th percentile takes P(offer) from 0.226 to 0.522, and cutting interviewer noise from sigma 1.5 to 0.7 at the 90th percentile takes it from 0.335 to 0.413. Both work; the second is available this week. THE HONEST LIMIT IS THAT STRUCTURE IS AN AMPLIFIER WITH THE SIGN OF YOUR ACTUAL LEVEL. At the 95th percentile the same noise reduction moves P(offer) from 0.522 to 0.792 and at the 98th from 0.725 to 0.976. At the 75th percentile it moves it from 0.108 to 0.025 — it makes things WORSE, because for a candidate below the bar interviewer noise is a lottery ticket and legibility cashes it in. THE CROSSOVER SITS JUST BELOW THE BAR. So 'be more structured' is good advice conditional on having the goods, and the honest version of the advice includes that condition.",
          "deepDive": {
            "q": "What is the practical corollary of that crossover?",
            "a": "That crossover has a practical corollary worth stating plainly, because the usual advice ignores it. If you are genuinely below the bar for a role, the highest-expected-value strategy is not polish — it is either targeting a level where you are above the bar, or spending the time on substance. Polishing a below-bar candidacy converts a small chance into a smaller one while feeling productive. Conversely, if you are clearly above the bar and losing loops, the diagnosis is almost certainly variance and the fix is legibility, not more knowledge — and that is the case where candidates most often study more because it is the familiar action. A useful self-diagnostic is the shape of your outcomes: failing early rounds consistently suggests a level problem, while passing most rounds and losing at the panel or on inconsistent feedback suggests a variance problem. The two require opposite responses, and the arithmetic here is what distinguishes them. It is also worth noting the model's limits: it assumes a fixed bar and independent loops, and real processes have level-fitting, referrals that shift the prior, and calibration meetings that partly correct noise."
          }
        },
        {
          "q": "How would you allocate preparation time across rounds?",
          "a": "BY CONTROLLABLE VARIANCE, NOT BY DISCOMFORT, and those diverge sharply. Six rounds measure six things. CODING measures whether you write correct code under mild pressure, and it fails on silent bugs, no tests, and narrating nothing. ML BREADTH measures whether you have used a thing or only read about it, and it fails on memorized definitions with no failure modes attached. DEPTH measures whether you understand why, and fails when someone can state a result but not derive or perturb it. SYSTEM DESIGN measures whether you can scope, trade off and own a decision, and fails when a candidate jumps to a model architecture and never names a metric or a cost. THE PROJECT DEEP-DIVE measures whether your resume is load-bearing, and fails when you cannot say what you personally decided. BEHAVIOURAL measures whether this will go badly, and fails on the absence of specifics. SYSTEM DESIGN AND THE PROJECT ROUND HAVE THE HIGHEST VARIANCE AND THE MOST CONTROLLABLE VARIANCE, so that is where structure pays — and they are chronically underprepared relative to coding, which is the round with the most available practice material and the least room for legibility gains.",
          "deepDive": {
            "q": "Which round is the most underprepared?",
            "a": "The project deep-dive is the single most underprepared round in my experience of the format, and it is the one where the fix is most mechanical. The failure is almost never the project being uninteresting; it is that the candidate cannot separate what they did from what the team did, cannot state the alternative they rejected, and cannot say what the result was in a number. Preparing it is a writing exercise: for each project, write the decision you owned, the option you rejected and why, the metric that moved and by how much, and the thing you would do differently. That is four sentences and it converts a high-variance round into a low-variance one. The behavioural round has a similar structure and an additional trap — the request for something that went wrong is a real question, and an answer with no genuine failure in it reads as either dishonest or as never having owned anything. The general shape, which is this module's thesis, is that these rounds are noisy because they invite unstructured narration, and pre-writing the structure removes most of the noise without changing a single fact about you."
          }
        },
        {
          "q": "You have been rejected from four loops. What does that tell you?",
          "a": "MORE THAN ONE REJECTION DOES, AND LESS THAN IT FEELS LIKE — and the arithmetic gives a real answer. At a top-10% bar with unstructured presentation, a candidate at the 90th percentile has P(offer) of about 0.335 per loop, so four rejections has probability 0.44 — entirely unremarkable. At the 95th percentile P(offer) is 0.522 and four rejections has probability 0.05, which is starting to be evidence. At the 85th percentile P(offer) is 0.226 and four rejections has probability 0.36. SO FOUR REJECTIONS IS WEAK EVIDENCE AGAINST BEING WELL ABOVE THE BAR and almost no evidence about anything else. WHAT IS ACTUALLY DIAGNOSTIC IS THE SHAPE. Failing consistently at early technical rounds points to a level or fundamentals problem, and the response is substance. Passing most rounds and losing at the panel, or receiving inconsistent feedback across interviewers, points to a variance problem, and the response is structure. Getting to offer stage and losing on level or compensation is a targeting problem. THOSE THREE REQUIRE OPPOSITE ACTIONS, which is why 'prepare more' is the wrong default — it is the right response to exactly one of them.",
          "deepDive": {
            "q": "What else should you check before drawing a conclusion?",
            "a": "The other thing worth doing is a base-rate check on the roles themselves, because candidates routinely apply into processes with very different accept rates and treat the outcomes as comparable. A 2% accept rate rejects 90.5% of qualified candidates and a 30% accept rate rejects 20%, so four rejections from the first group and four from the second are wildly different evidence. Interview feedback, where it is offered, is also weaker evidence than it appears — it is generated after the decision, is subject to the same correlated-noise problem, and is often written to be defensible rather than accurate. The most useful signal available to a candidate is a mock loop with someone who will give unfiltered specifics, because it decouples the measurement from the decision. And there is a selection effect worth naming: the candidates who conclude 'the process is noise' after two rejections and the ones who conclude 'I am not good enough' after two are both over-updating in opposite directions from the same non-evidence."
          }
        },
        {
          "q": "If you were designing the loop instead, what would you change?",
          "a": "TWO CHANGES DOMINATE, AND BOTH ARE VARIANCE REDUCTIONS RATHER THAN NEW SIGNALS. FIRST, INDEPENDENCE. Correlated noise is the thing that quietly destroys a loop's value — four rounds at rho = 0.4 carry AUC 0.833 against 0.900 at full independence — and it comes from shared context that is easy to remove: blind or minimal materials before the round, no mid-loop debriefs, and independent written feedback submitted before the panel convenes. That last one is nearly free and is skipped constantly. SECOND, A FIXED RUBRIC PER ROUND, which is the sigma reduction: interviewers scoring against stated dimensions produce less variable reads than interviewers forming holistic impressions, and the measured effect of moving sigma from 1.5 to 1.0 at a fixed 10% accept rate is a rise in P(pass | qualified) from 0.399 to 0.455 AND a fall in bad hires among those hired from 0.201 to 0.091 — it improves both error rates at once, which is unusual and is why structured interviewing is the recommendation with the strongest evidence behind it. THIRD, AND LESS POPULAR: measure the process. Track outcomes of hires against interview scores, which is the only way to know whether the loop predicts anything.",
          "deepDive": {
            "q": "Where does the causal material bite hardest here?",
            "a": "That third item is where the causal module bites hardest and where almost every company fails. You only observe job performance for people you HIRED, which is selection on the outcome — a collider — so the correlation between interview score and performance among hires is systematically attenuated and can even invert, which produces the perennial and usually wrong claim that interviews do not predict anything. Correcting it requires either a random-acceptance holdout, which nobody will authorize, or accepting that the estimate is biased and reasoning about the direction. The practical middle ground is to track the range restriction explicitly and to use rejected-then-hired-elsewhere candidates where that information is available. Two further design points: the marginal interview has steeply diminishing value, so replacing a fifth round with a work sample usually buys more independent signal than another conversation; and calibration meetings partly correct noise and partly manufacture correlation, so they should happen after independent scores are recorded, never before."
          }
        },
        {
          "q": "How does this lesson set up the final module?",
          "a": "IT ESTABLISHES THE THESIS THE REST OF THE MODULE SERVES: STRUCTURE IS THE SIGNAL. An interview is a short, noisy, low-bandwidth channel sampling a high-dimensional thing, so what transmits is the SKELETON of your reasoning rather than the depth of any single answer. Every remaining lesson supplies a skeleton — the eight-step design framework, three worked design cases, a coding checklist, a derivation drill, a rapid-fire breadth pass, and a portfolio narrative — and the reason they are skeletons rather than answer keys is that the questions have no answer key. A design question is scored on whether you scoped it, named a metric, chose under a constraint and said what you gave up. AND THE HONEST CONDITION CARRIES THROUGH: structure amplifies with the sign of your level, moving P(offer) from 0.522 to 0.792 at the 95th percentile and from 0.108 to 0.025 at the 75th. So the module is not a shortcut, and the twenty-four modules before it are the substance that structure amplifies. THE TRANSFERABLE FORM is broader than interviewing: in any low-n, high-noise evaluation — a design review, a paper, a promotion packet, a pitch — legibility is a first-class objective and not a presentational afterthought.",
          "deepDive": {
            "q": "How do the last three modules fit together?",
            "a": "It is worth connecting this to the two modules immediately before it, because the three form a sequence. Module 23 said the assumption is the estimate: a number's meaning comes from a claim the data cannot check. Module 24 said every guarantee is true and narrower than its name: the reference class is what determines meaning and is what reporting omits. This module says the same thing about your own communication — an answer is evaluated against a reference class the interviewer holds and you cannot see, so stating your assumptions, your scope and your trade-offs is how you make the reference class explicit rather than leaving the interviewer to supply one. That is the same discipline as reporting the binning with an ECE or the threat model with a robustness claim, applied to a conversation. It is a satisfying place for the curriculum to land, because it means the closing advice is not a separate skill bolted on at the end but the same habit the technical modules were building, pointed at a different audience."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The module's thesis",
        "back": "STRUCTURE IS THE SIGNAL. An interview is a short, noisy, low-bandwidth measurement — your controllable variable is the interviewer's VARIANCE, not the peak quality of any one answer."
      },
      {
        "type": "formula",
        "front": "How good is one interview?",
        "back": "AUC **0.778** at σ=1.5 against 'would succeed in the role'. 4-loop → **0.899**, 6-loop → 0.927. Averaging k rounds shrinks noise by √k — steeply diminishing, which is why loops are 4–6."
      },
      {
        "type": "pitfall",
        "front": "★ The base-rate asymmetry",
        "back": "4-loop at a 10% accept rate: precision 0.790, and **60.5% of QUALIFIED candidates rejected**. At 5%: precision 0.885, **77.9% rejected**. An offer is strong evidence; a rejection is weak evidence."
      },
      {
        "type": "formula",
        "front": "★ Structure amplifies with the SIGN of your level",
        "back": "P(offer), top-10% bar, σ 1.5 → 0.7: 98th pct **0.725 → 0.976** · 95th **0.522 → 0.792** · 90th 0.335 → 0.413 · 75th **0.108 → 0.025**. The crossover sits just below the bar."
      },
      {
        "type": "intuition",
        "front": "Why does legibility HURT below the bar?",
        "back": "Interviewer noise is a lottery ticket for an underqualified candidate, and being legible cashes it in. Polish converts a small chance into a smaller one while feeling productive."
      },
      {
        "type": "pitfall",
        "front": "Correlated noise doesn't average out",
        "back": "4-loop AUC: ρ=0 → 0.900, ρ=0.2 → 0.862, ρ=0.4 → **0.833**, ρ=0.6 → 0.810. Same shape as module 24's ensembling result — averaging removes independent error, not shared bias."
      },
      {
        "type": "intuition",
        "front": "Where does loop correlation come from?",
        "back": "Shared context: the resume, a recruiter note, a mid-loop debrief. For a candidate the implication reverses — the shared component is set by written materials and the first five minutes, so they deserve disproportionate prep."
      },
      {
        "type": "definition",
        "front": "What each round measures",
        "back": "Coding: correct code under pressure. Breadth: used it vs read it. Depth: WHY. Design: scope, trade off, own a decision. Project: is the resume load-bearing. Behavioural: will this go badly."
      },
      {
        "type": "intuition",
        "front": "Where to spend prep time",
        "back": "System design and the project deep-dive — highest variance AND most controllable variance. Coding has the most practice material and the least room for legibility gains, and gets the most attention anyway."
      },
      {
        "type": "pitfall",
        "front": "Diagnosing four rejections",
        "back": "At the 90th pct, P(4 rejections) = 0.44 — unremarkable. The SHAPE is diagnostic: early-round failures → substance; panel losses or inconsistent feedback → variance; offer-stage losses → targeting. Opposite responses."
      },
      {
        "type": "formula",
        "front": "Structured interviewing improves BOTH error rates",
        "back": "σ 1.5 → 1.0 at a fixed 10% accept rate: P(pass | qualified) 0.399 → 0.455 AND bad hires among hired 0.201 → 0.091. Unusual — most trades move one at the expense of the other."
      },
      {
        "type": "pitfall",
        "front": "Why companies think interviews don't predict",
        "back": "You only observe job performance for people you HIRED — selection on the outcome, a COLLIDER (module 23). The score/performance correlation among hires is attenuated and can invert. Range restriction, not a useless signal."
      }
    ],
    "refs": [
      {
        "title": "Schmidt & Hunter (1998), The Validity and Utility of Selection Methods in Personnel Psychology",
        "url": "https://psycnet.apa.org/doi/10.1037/0033-2909.124.2.262"
      },
      {
        "title": "Kahneman, Sibony & Sunstein (2021), Noise: A Flaw in Human Judgment",
        "url": "https://www.hachettebookgroup.com/titles/daniel-kahneman/noise/9780316451383/"
      },
      {
        "title": "Google re:Work, Guide to Structured Interviewing",
        "url": "https://rework.withgoogle.com/en/guides/hiring-use-structured-interviewing"
      },
      {
        "title": "Levy & Ganguli, Machine Learning System Design Interview",
        "url": "https://www.amazon.com/Machine-Learning-System-Design-Interview/dp/1736049127"
      },
      {
        "title": "Huyen (2022), Designing Machine Learning Systems",
        "url": "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"
      }
    ],
    "demos": [
      "classification-metrics",
      "roc",
      "clt",
      "calibration"
    ]
  }
};
