// GENERATED from content/lessons/interview-capstone/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "interview-capstone". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
          "deepDive": "The correlated-noise result is the one that changes behaviour on both sides of the table. The root-k benefit assumes independent errors, and interviewers share a great deal: the resume, a recruiter's framing, sometimes a mid-loop conversation. Adding a shared noise component takes the four-loop AUC from 0.900 at rho = 0 to 0.833 at rho = 0.4 — a four-round loop delivering roughly the signal of a much shorter independent one. That is exactly the ensembling result from module 24, where averaging removes independent error and leaves shared bias untouched, and it is why serious processes use blind materials, fixed rubrics, and independent written feedback submitted BEFORE the panel meets. For a candidate the implication runs the other way and is actionable: the shared component is largely set by your written materials and the first five minutes, so those deserve disproportionate preparation relative to their duration. It is also the honest explanation for why loops sometimes feel like the decision was made early — sometimes it was, and the remaining rounds were sampling correlated noise."
        },
        {
          "q": "What should a candidate actually optimize, and what is the honest limit of that advice?",
          "a": "TWO LEVERS, AND ONLY ONE IS FAST. You can move up the ranking, which is real learning and slow, or you can reduce the VARIANCE with which an interviewer reads you, which is structure — stating assumptions, laying out a skeleton before diving in, naming what you traded away, narrating while you code. Measured as P(offer) for one candidate against a fixed top-10% bar: raising true ability from the 85th to the 95th percentile takes P(offer) from 0.226 to 0.522, and cutting interviewer noise from sigma 1.5 to 0.7 at the 90th percentile takes it from 0.335 to 0.413. Both work; the second is available this week. THE HONEST LIMIT IS THAT STRUCTURE IS AN AMPLIFIER WITH THE SIGN OF YOUR ACTUAL LEVEL. At the 95th percentile the same noise reduction moves P(offer) from 0.522 to 0.792 and at the 98th from 0.725 to 0.976. At the 75th percentile it moves it from 0.108 to 0.025 — it makes things WORSE, because for a candidate below the bar interviewer noise is a lottery ticket and legibility cashes it in. THE CROSSOVER SITS JUST BELOW THE BAR. So 'be more structured' is good advice conditional on having the goods, and the honest version of the advice includes that condition.",
          "deepDive": "That crossover has a practical corollary worth stating plainly, because the usual advice ignores it. If you are genuinely below the bar for a role, the highest-expected-value strategy is not polish — it is either targeting a level where you are above the bar, or spending the time on substance. Polishing a below-bar candidacy converts a small chance into a smaller one while feeling productive. Conversely, if you are clearly above the bar and losing loops, the diagnosis is almost certainly variance and the fix is legibility, not more knowledge — and that is the case where candidates most often study more because it is the familiar action. A useful self-diagnostic is the shape of your outcomes: failing early rounds consistently suggests a level problem, while passing most rounds and losing at the panel or on inconsistent feedback suggests a variance problem. The two require opposite responses, and the arithmetic here is what distinguishes them. It is also worth noting the model's limits: it assumes a fixed bar and independent loops, and real processes have level-fitting, referrals that shift the prior, and calibration meetings that partly correct noise."
        },
        {
          "q": "How would you allocate preparation time across rounds?",
          "a": "BY CONTROLLABLE VARIANCE, NOT BY DISCOMFORT, and those diverge sharply. Six rounds measure six things. CODING measures whether you write correct code under mild pressure, and it fails on silent bugs, no tests, and narrating nothing. ML BREADTH measures whether you have used a thing or only read about it, and it fails on memorized definitions with no failure modes attached. DEPTH measures whether you understand why, and fails when someone can state a result but not derive or perturb it. SYSTEM DESIGN measures whether you can scope, trade off and own a decision, and fails when a candidate jumps to a model architecture and never names a metric or a cost. THE PROJECT DEEP-DIVE measures whether your resume is load-bearing, and fails when you cannot say what you personally decided. BEHAVIOURAL measures whether this will go badly, and fails on the absence of specifics. SYSTEM DESIGN AND THE PROJECT ROUND HAVE THE HIGHEST VARIANCE AND THE MOST CONTROLLABLE VARIANCE, so that is where structure pays — and they are chronically underprepared relative to coding, which is the round with the most available practice material and the least room for legibility gains.",
          "deepDive": "The project deep-dive is the single most underprepared round in my experience of the format, and it is the one where the fix is most mechanical. The failure is almost never the project being uninteresting; it is that the candidate cannot separate what they did from what the team did, cannot state the alternative they rejected, and cannot say what the result was in a number. Preparing it is a writing exercise: for each project, write the decision you owned, the option you rejected and why, the metric that moved and by how much, and the thing you would do differently. That is four sentences and it converts a high-variance round into a low-variance one. The behavioural round has a similar structure and an additional trap — the request for something that went wrong is a real question, and an answer with no genuine failure in it reads as either dishonest or as never having owned anything. The general shape, which is this module's thesis, is that these rounds are noisy because they invite unstructured narration, and pre-writing the structure removes most of the noise without changing a single fact about you."
        },
        {
          "q": "You have been rejected from four loops. What does that tell you?",
          "a": "MORE THAN ONE REJECTION DOES, AND LESS THAN IT FEELS LIKE — and the arithmetic gives a real answer. At a top-10% bar with unstructured presentation, a candidate at the 90th percentile has P(offer) of about 0.335 per loop, so four rejections has probability 0.44 — entirely unremarkable. At the 95th percentile P(offer) is 0.522 and four rejections has probability 0.05, which is starting to be evidence. At the 85th percentile P(offer) is 0.226 and four rejections has probability 0.36. SO FOUR REJECTIONS IS WEAK EVIDENCE AGAINST BEING WELL ABOVE THE BAR and almost no evidence about anything else. WHAT IS ACTUALLY DIAGNOSTIC IS THE SHAPE. Failing consistently at early technical rounds points to a level or fundamentals problem, and the response is substance. Passing most rounds and losing at the panel, or receiving inconsistent feedback across interviewers, points to a variance problem, and the response is structure. Getting to offer stage and losing on level or compensation is a targeting problem. THOSE THREE REQUIRE OPPOSITE ACTIONS, which is why 'prepare more' is the wrong default — it is the right response to exactly one of them.",
          "deepDive": "The other thing worth doing is a base-rate check on the roles themselves, because candidates routinely apply into processes with very different accept rates and treat the outcomes as comparable. A 2% accept rate rejects 90.5% of qualified candidates and a 30% accept rate rejects 20%, so four rejections from the first group and four from the second are wildly different evidence. Interview feedback, where it is offered, is also weaker evidence than it appears — it is generated after the decision, is subject to the same correlated-noise problem, and is often written to be defensible rather than accurate. The most useful signal available to a candidate is a mock loop with someone who will give unfiltered specifics, because it decouples the measurement from the decision. And there is a selection effect worth naming: the candidates who conclude 'the process is noise' after two rejections and the ones who conclude 'I am not good enough' after two are both over-updating in opposite directions from the same non-evidence."
        },
        {
          "q": "If you were designing the loop instead, what would you change?",
          "a": "TWO CHANGES DOMINATE, AND BOTH ARE VARIANCE REDUCTIONS RATHER THAN NEW SIGNALS. FIRST, INDEPENDENCE. Correlated noise is the thing that quietly destroys a loop's value — four rounds at rho = 0.4 carry AUC 0.833 against 0.900 at full independence — and it comes from shared context that is easy to remove: blind or minimal materials before the round, no mid-loop debriefs, and independent written feedback submitted before the panel convenes. That last one is nearly free and is skipped constantly. SECOND, A FIXED RUBRIC PER ROUND, which is the sigma reduction: interviewers scoring against stated dimensions produce less variable reads than interviewers forming holistic impressions, and the measured effect of moving sigma from 1.5 to 1.0 at a fixed 10% accept rate is a rise in P(pass | qualified) from 0.399 to 0.455 AND a fall in bad hires among those hired from 0.201 to 0.091 — it improves both error rates at once, which is unusual and is why structured interviewing is the recommendation with the strongest evidence behind it. THIRD, AND LESS POPULAR: measure the process. Track outcomes of hires against interview scores, which is the only way to know whether the loop predicts anything.",
          "deepDive": "That third item is where the causal module bites hardest and where almost every company fails. You only observe job performance for people you HIRED, which is selection on the outcome — a collider — so the correlation between interview score and performance among hires is systematically attenuated and can even invert, which produces the perennial and usually wrong claim that interviews do not predict anything. Correcting it requires either a random-acceptance holdout, which nobody will authorize, or accepting that the estimate is biased and reasoning about the direction. The practical middle ground is to track the range restriction explicitly and to use rejected-then-hired-elsewhere candidates where that information is available. Two further design points: the marginal interview has steeply diminishing value, so replacing a fifth round with a work sample usually buys more independent signal than another conversation; and calibration meetings partly correct noise and partly manufacture correlation, so they should happen after independent scores are recorded, never before."
        },
        {
          "q": "How does this lesson set up the final module?",
          "a": "IT ESTABLISHES THE THESIS THE REST OF THE MODULE SERVES: STRUCTURE IS THE SIGNAL. An interview is a short, noisy, low-bandwidth channel sampling a high-dimensional thing, so what transmits is the SKELETON of your reasoning rather than the depth of any single answer. Every remaining lesson supplies a skeleton — the eight-step design framework, three worked design cases, a coding checklist, a derivation drill, a rapid-fire breadth pass, and a portfolio narrative — and the reason they are skeletons rather than answer keys is that the questions have no answer key. A design question is scored on whether you scoped it, named a metric, chose under a constraint and said what you gave up. AND THE HONEST CONDITION CARRIES THROUGH: structure amplifies with the sign of your level, moving P(offer) from 0.522 to 0.792 at the 95th percentile and from 0.108 to 0.025 at the 75th. So the module is not a shortcut, and the twenty-four modules before it are the substance that structure amplifies. THE TRANSFERABLE FORM is broader than interviewing: in any low-n, high-noise evaluation — a design review, a paper, a promotion packet, a pitch — legibility is a first-class objective and not a presentational afterthought.",
          "deepDive": "It is worth connecting this to the two modules immediately before it, because the three form a sequence. Module 23 said the assumption is the estimate: a number's meaning comes from a claim the data cannot check. Module 24 said every guarantee is true and narrower than its name: the reference class is what determines meaning and is what reporting omits. This module says the same thing about your own communication — an answer is evaluated against a reference class the interviewer holds and you cannot see, so stating your assumptions, your scope and your trade-offs is how you make the reference class explicit rather than leaving the interviewer to supply one. That is the same discipline as reporting the binning with an ECE or the threat model with a robustness claim, applied to a conversation. It is a satisfying place for the curriculum to land, because it means the closing advice is not a separate skill bolted on at the end but the same habit the technical modules were building, pointed at a different audience."
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
  },
  "system-design-framework": {
    "level": "core",
    "body": {
      "intuition": [
        "A design question has no answer key, so it is scored on whether you scoped it, named a metric, chose under a constraint, and said what you gave up. The skeleton exists because it makes those four things visible in 40 minutes to someone who cannot read your mind - which is the previous lesson's variance reduction, applied to the round with the most variance to reduce.",
        "The single most useful thing to internalize is that MOST OF THE DESIGN IS SETTLED BY ARITHMETIC BEFORE ANY MODEL IS CHOSEN. With a 200 ms p99 budget and 85 ms of fixed costs, the ranker has 115 ms. That budget scores about 57,500 items with a GBDT, 19,000 with a small MLP, 128 with a cross-encoder and 10 with a 7B LLM. THE RETRIEVE-RANK-RERANK FUNNEL IS FORCED, not chosen for elegance.",
        "And the number candidates almost never say out loud is cost. At 69,444 peak QPS, a 3 ms GBDT ranker needs about 174 hosts and a 45 ms cross-encoder about 3,157 - a difference of roughly 39 million dollars a year at $1.50 per host-hour. Naming that converts an architecture preference into a decision, which is exactly what the round is testing."
      ],
      "math": [
        {
          "h": "The eight-step skeleton",
          "paras": [
            "The order matters more than the content. Each step constrains the next, and the common failure is jumping from step 1 to step 5.",
            "Say the step names out loud. The interviewer is scoring whether the structure exists, and structure they cannot hear does not count."
          ],
          "tex": "\\text{clarify} \\to \\text{frame as ML} \\to \\text{data \\& labels} \\to \\text{features} \\to \\text{model} \\to \\text{serving} \\to \\text{metrics} \\to \\text{iterate}",
          "texNote": "Steps 1-3 are where the interview is won and where candidates spend the least time. If you cannot say what a positive label IS, everything downstream is decoration."
        },
        {
          "h": "★ The latency budget collapses the architecture space",
          "paras": [
            "Fix the p99 budget, subtract the fixed costs, and the remaining time determines how many items each model class can score. That single calculation eliminates most designs before you discuss them."
          ],
          "tex": "\\begin{array}{lrr} \\text{ranker} & \\text{ms}/1000\\ \\text{items} & \\text{items in }115\\ \\text{ms}\\\\ \\text{two-tower dot product} & 0.5 & 230{,}000\\\\ \\text{GBDT, 50 features} & 2 & 57{,}500\\\\ \\text{2-layer MLP} & 6 & 19{,}167\\\\ \\text{cross-encoder} & 900 & \\mathbf{128}\\\\ \\text{7B LLM re-rank} & 12{,}000 & \\mathbf{10} \\end{array}",
          "texNote": "200 ms budget minus 85 ms of network, feature fetch, retrieval, filtering and serialization. The four-order-of-magnitude spread across model classes is why the funnel has the shape it has everywhere."
        },
        {
          "h": "A well-sized funnel has roughly constant cost per stage",
          "paras": [
            "Each stage cuts the candidate set by one to two orders of magnitude and costs one to two orders more per item. If one stage dominates the budget, it is mis-sized."
          ],
          "tex": "500{,}000{,}000 \\xrightarrow{\\text{ANN, 1 ms}} 1000 \\xrightarrow{\\text{rules}} 500 \\xrightarrow{\\text{GBDT, 3 ms}} 500 \\xrightarrow{\\text{cross-enc, 45 ms}} 50 \\to 10",
          "texNote": "The diagnostic to state in an interview: if any stage is more than about half the latency budget, either shrink its input or move work to an earlier, cheaper stage. That sentence is worth more than naming a model."
        }
      ],
      "code": [
        {
          "h": "The numbers to have memorized",
          "paras": [
            "Not because the exact values matter, but because being able to produce them in ten seconds is what lets you reason instead of speculate."
          ],
          "code": "# TRAFFIC\n#   100M DAU x 20 req/day = 23,000 QPS average, ~69,000 peak (3x diurnal)\n#   peak/average is 2-4x for consumer, 5-10x for anything with a daily batch\n\n# STORAGE\n#   500M items x 256-d fp32 = 0.51 TB   (fp16 0.26 TB, int8 0.13 TB)\n#   -> too big for a typical 64-256 GB serving host: SHARD or QUANTIZE.\n#      That conclusion is arithmetic, not preference.\n\n# LATENCY (order of magnitude, per request)\n#   in-memory lookup      <1 us      network round trip, same DC   ~0.5 ms\n#   Redis / KV fetch       1-5 ms    ANN search over 500M           5-20 ms\n#   GBDT, 50 features      1-3 ms    cross-encoder BERT-base       40-60 ms\n#   two-tower dot product  <1 ms     7B LLM, batched, short out   300-800 ms\n\n# COST at 69,000 peak QPS, ~$1.5/host/hour\n#   GBDT ranker     3 ms   ~400 req/s/host  ->    174 hosts\n#   MLP ranker      8 ms   ~150 req/s/host  ->    463 hosts\n#   cross-encoder  45 ms   ~ 22 req/s/host  ->  3,157 hosts   ~ +$39M/year",
          "caption": "Ten seconds of arithmetic eliminates more candidate designs than ten minutes of discussion, and doing it out loud is the highest-signal thing in the round."
        },
        {
          "h": "What the skeleton actually asks at each step",
          "paras": [
            "The questions, not the answers - because the answers are case-specific and the questions are not."
          ],
          "code": "# 1 CLARIFY     who is the user, what action, what scale, what latency,\n#               what is explicitly OUT of scope?\n# 2 FRAME       what is the prediction target, and what is ONE row?\n#               ranking / classification / regression / generation?\n# 3 DATA        where does a LABEL come from? how delayed? how biased?\n#               ★ the hardest and most-skipped question in the round\n# 4 FEATURES    what is available AT SERVING TIME? (train/serve skew lives here)\n# 5 MODEL       simplest thing that could work, then what would justify more\n# 6 SERVING     online/offline split, funnel sizing, caching, fallback\n# 7 METRICS     ONE primary + guardrails + the online/offline gap\n# 8 ITERATE     what ships first, what you measure, what would make you revert\n\n# ★ Say 'I'm going to assume X, tell me if that's wrong' and move. An\n#   unresolved ambiguity costs you the whole round; a stated assumption\n#   costs you nothing and demonstrates the thing being scored.",
          "caption": "Steps 3 and 7 are where strong candidates separate. Everyone can name a model; far fewer can say where a label comes from and how delayed it is."
        }
      ],
      "useCases": [
        "Any ML system design round, where the skeleton converts a 40-minute open-ended conversation into a sequence of decisions with stated trade-offs.",
        "Writing a design doc at work, where the same eight steps in the same order produce a document reviewers can argue with rather than admire.",
        "Scoping a new project, where steps 1-3 done honestly will kill a meaningful fraction of proposals before any engineering is spent.",
        "Reviewing someone else's design, where asking 'where does the label come from' and 'what is the p99 budget' finds most problems in two questions."
      ],
      "pitfalls": [
        "Jumping from clarify to model. It is the most common failure in the round and it forfeits the three steps where candidates differentiate.",
        "Never naming a number. A 200 ms budget minus 85 ms fixed leaves 115 ms, which permits 128 cross-encoder items and 10 LLM items - state that and the architecture follows.",
        "Not saying where labels come from. Implicit feedback is delayed, biased by what was shown, and often absent for the cases you care about most.",
        "Ignoring cost. A cross-encoder ranker at 69,000 peak QPS is ~3,157 hosts against 174 for a GBDT, roughly $39M a year, and no interviewer minds you saying so.",
        "Proposing features unavailable at serving time. Train/serve skew starts here, and 'I'd use the user's next-session behaviour' ends the round.",
        "Listing ten metrics. One primary, a small set of guardrails tested for NO harm, and an explicit statement of the online/offline gap - module 24's tiering, applied.",
        "Treating the skeleton as a script to recite. It is a checklist to make your reasoning audible; a candidate who recites it without adapting to the case is visibly doing so."
      ],
      "connections": [
        {
          "ref": "mlops/system-design",
          "text": "The production version of the same material, where the funnel, the feature store and the serving path are engineering rather than a whiteboard."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Why the storage arithmetic has a lever: int8 embeddings cut 0.51 TB to 0.13 TB and change a sharding decision into a single-host one."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Step 7 done properly - one primary metric, guardrails with the burden of proof reversed, and the peeking discipline that makes the readout mean anything."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "Step 8's monitoring, and the honest version: input monitoring catches pipeline breaks, and only labels catch the failure that matters."
        },
        {
          "ref": "interview-capstone/design-recommender",
          "text": "The first worked case, where this skeleton meets a concrete problem and the label question turns out to be the hard one."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the eight steps.",
          "a": "Clarify → frame as ML → data & labels → features → model → serving → metrics → iterate. The ORDER is the content; each step constrains the next."
        },
        {
          "q": "What is the most common failure in a design round?",
          "a": "Jumping from clarify straight to model, forfeiting steps 2–4 where candidates actually differentiate."
        },
        {
          "q": "★ How does a latency budget decide the architecture?",
          "a": "200 ms p99 − 85 ms fixed = 115 ms for the ranker. That scores ~57,500 GBDT items, 19,167 MLP, **128 cross-encoder**, **10 LLM**. The funnel is forced."
        },
        {
          "q": "What makes a well-sized funnel?",
          "a": "Roughly constant cost per stage: each cuts the candidate set 10–100× and costs 10–100× more per item. If one stage exceeds ~half the budget, it's mis-sized."
        },
        {
          "q": "Give the traffic arithmetic.",
          "a": "100M DAU × 20 req/day = 23,000 QPS average, ~69,000 peak at 3× diurnal. Peak/average is 2–4× consumer, 5–10× with a daily batch."
        },
        {
          "q": "Give the storage arithmetic.",
          "a": "500M items × 256-d fp32 = 0.51 TB (fp16 0.26, int8 0.13). Too big for a typical 64–256 GB serving host → shard or quantize. Arithmetic, not preference."
        },
        {
          "q": "★ Why name cost?",
          "a": "At 69,000 peak QPS: GBDT ~174 hosts, cross-encoder ~3,157 — roughly **$39M/year** apart at $1.5/host-hour. It converts an architecture preference into a decision."
        },
        {
          "q": "Which step do candidates skip most?",
          "a": "Step 3 — where a label comes from, how delayed it is, and how biased. Everything downstream is decoration without it."
        },
        {
          "q": "What's the trap in step 4?",
          "a": "Proposing features unavailable AT SERVING TIME. Train/serve skew starts there, and 'I'd use next-session behaviour' ends the round."
        },
        {
          "q": "How many metrics in step 7?",
          "a": "One primary, a few guardrails tested for NO harm (burden of proof reversed), plus an explicit statement of the online/offline gap."
        },
        {
          "q": "What do you do with an ambiguity?",
          "a": "State an assumption and move: \"I'll assume X, tell me if that's wrong.\" An unresolved ambiguity costs the round; a stated one costs nothing."
        },
        {
          "q": "Is the skeleton a script?",
          "a": "No — a checklist to make reasoning audible. A candidate reciting it without adapting to the case is visibly reciting it."
        }
      ],
      "standard": [
        {
          "q": "Walk me through your framework for an ML system design question.",
          "a": "EIGHT STEPS, AND THE ORDER IS THE CONTENT because each constrains the next. CLARIFY: who the user is, what action we are driving, the scale, the latency budget, and what is explicitly out of scope. FRAME: what exactly is being predicted and what one row of training data is — ranking, classification, regression or generation, because that choice determines everything after. DATA AND LABELS: where a label comes from, how delayed it is, and how biased, which is the hardest question in the round and the most skipped. FEATURES: what is available AT SERVING TIME, which is where train/serve skew is born. MODEL: the simplest thing that could work, then what evidence would justify more. SERVING: the online/offline split, funnel sizing, caching and fallback. METRICS: one primary, guardrails, and the online/offline gap. ITERATE: what ships first and what would make you revert. I SAY THE STEP NAMES OUT LOUD, because the round is scored on whether the structure exists and structure the interviewer cannot hear does not count. AND WHEN SOMETHING IS AMBIGUOUS I state an assumption and move — 'I'll assume 200 ms p99 and a consumer traffic shape, tell me if that's wrong' — since an unresolved ambiguity costs the whole round and a stated assumption costs nothing.",
          "deepDive": "The step worth expanding is data and labels, because it is where strong candidates separate and where real projects die. For a recommender the label is usually implicit feedback — a click, a watch, a purchase — and each has a different delay, a different bias, and a different relationship to the thing you actually want. Clicks arrive in seconds and are biased by position and by what the previous model chose to show; purchases arrive in days and are sparse; satisfaction is not logged at all. Saying that out loud demonstrates you have shipped something. The second-order point is that the label choice determines the feedback loop: training on clicks from a system that ranked by predicted clicks is training on data your own policy generated, which is module 23's confounding, and the mitigation — logged propensities and a small random holdout — is a design decision that has to be made at step 3, not retrofitted. Candidates who raise that unprompted are doing something genuinely rare, and it costs one sentence."
        },
        {
          "q": "How do you decide the architecture before choosing a model?",
          "a": "WITH ARITHMETIC, AND IT ELIMINATES MOST DESIGNS IN TEN SECONDS. Fix the p99 budget — say 200 ms — and subtract the fixed costs: network in and out, feature fetch, ANN retrieval, filtering, serialization, roughly 85 ms. That leaves 115 ms for the ranker. NOW COUNT WHAT FITS. A two-tower dot product costs about 0.5 ms per thousand items, so 230,000 items. A GBDT on 50 features costs about 2 ms per thousand, so 57,500. A small MLP, 19,167. A cross-encoder, 900 ms per thousand — 128 items. A 7B LLM re-rank, 12,000 ms per thousand — 10 items. FOUR ORDERS OF MAGNITUDE ACROSS MODEL CLASSES, and that spread is why every production system in this shape is retrieve, rank, re-rank: the funnel is FORCED by the latency budget, not chosen for elegance. A well-sized funnel then has roughly constant cost per stage, each cutting the candidate set by one to two orders and costing one to two orders more per item, and the diagnostic worth stating is that if any stage exceeds about half the budget it is mis-sized — either shrink its input or move work earlier and cheaper.",
          "deepDive": "Two refinements that come up if the interviewer pushes. First, these numbers are per-request under batching assumptions, and batching changes them a lot: a cross-encoder that is hopeless at batch size 1 becomes viable at batch 32 if you can accumulate requests, which trades latency for throughput and only works if your traffic is dense enough that the batch fills quickly — at 69,000 QPS it fills in under a millisecond, at 100 QPS it does not. Second, the budget is p99, not mean, so the tail is what you must fit, and anything with variable cost per item — an LLM whose output length varies, an ANN whose probe count adapts — needs a hard cap rather than an average. The related trap is fan-out: a request that hits ten shards has a p99 set by the slowest shard, so shard-level p99 must be much tighter than the end-to-end budget, and hedged requests or a fixed timeout with partial results are the standard mitigations. Saying 'p99 with fan-out is the slowest of ten, so I need shard p99 near p99.9' is a strong signal."
        },
        {
          "q": "Why does cost belong in a design interview answer?",
          "a": "BECAUSE IT CONVERTS AN ARCHITECTURE PREFERENCE INTO A DECISION, WHICH IS WHAT THE ROUND MEASURES. At 69,000 peak QPS: a 3 ms GBDT ranker serves roughly 400 requests per second per host and needs about 174 hosts; a 45 ms cross-encoder serves about 22 per second per host and needs about 3,157. At $1.50 per host-hour that gap is roughly $39 million a year. Nobody has to accept my exact numbers — the point is that a two-sentence calculation reframes 'should we use a cross-encoder' from a taste question into a question about whether the quality gain is worth $39M, which is a question a business can answer and an architecture debate is not. IT ALSO DEMONSTRATES SOMETHING THE ROUND IS ACTUALLY TESTING: that you have owned a system rather than designed one on a whiteboard. Candidates who have run things reach for cost naturally, because they have been in the meeting where it mattered. AND IT USUALLY IMPROVES THE DESIGN, since it pushes you toward the funnel — apply the expensive model to 50 items rather than 500 — which is both cheaper and, because you can then afford a better expensive model, often better.",
          "deepDive": "The related move that impresses more and is rarer is to name the cost per unit of business value rather than in the abstract. Cost per thousand requests, or per incremental conversion, makes the trade legible to a product owner and connects to the uplift material from module 23: the relevant question is not what the ranker costs but what the incremental revenue per dollar of ranker is, and that requires an experiment. It also surfaces the case where the expensive model is obviously worth it — for high-value queries, a $39M ranker cost against a much larger revenue base is trivially justified — which is why segment-dependent architectures exist, applying the cross-encoder only to the top decile of query value. Proposing that unprompted is a strong signal, because it shows you are optimizing the system rather than the model. The general habit is to end every architecture claim with a number and a unit, and to notice when you cannot produce one, because that is usually where you have not thought it through."
        },
        {
          "q": "What separates a strong design answer from an adequate one?",
          "a": "FOUR THINGS, AND NONE OF THEM IS KNOWING A BETTER MODEL. FIRST, THE LABEL QUESTION ANSWERED HONESTLY: where the label comes from, its delay, its bias, and what it is a proxy FOR. Most candidates say 'clicks' and stop; a strong answer says clicks arrive in seconds and are position-biased and generated by the previous model's choices, purchases arrive in days and are sparse, and satisfaction is not logged — and then picks one and says why. SECOND, NUMBERS ATTACHED TO CHOICES: the p99 budget, the funnel sizes, the host count, the cost. Not because precision matters but because a design without numbers is a preference. THIRD, EXPLICIT TRADE-OFFS — 'I'm choosing a GBDT over a cross-encoder here, giving up maybe two points of NDCG to save roughly 3,000 hosts, and I'd revisit for the top decile of query value.' That single sentence contains a decision, a cost, a quantity and a condition for changing your mind. FOURTH, FAILURE MODES: what breaks, what the fallback is, what you monitor, and what would make you revert. Candidates who describe a happy path have designed a demo.",
          "deepDive": "The fourth item is the one most reliably missing and the cheapest to add. Every stage of the funnel needs a stated failure behaviour: if the feature store times out, do you serve with defaults or fail the request; if the ANN index is stale, how stale is acceptable; if the ranker is down, do you fall back to popularity or to the previous model's cached scores. Those answers are usually obvious once asked, and volunteering them signals operational experience more efficiently than anything else in the round. The related habit is to state what you would monitor and — from module 24 — to be honest that input monitoring catches pipeline breaks while only labels catch the failure that matters, so a labelled sample is part of the design rather than an afterthought. Finally, saying what would make you revert is the strongest single sentence available, because it demonstrates that you treat your own design as a hypothesis, which is the disposition the whole curriculum has been building toward."
        },
        {
          "q": "How do you handle a design question in a domain you do not know?",
          "a": "THE SKELETON IS DOMAIN-INDEPENDENT, WHICH IS THE POINT OF HAVING ONE. I would clarify harder than usual, because my domain priors are weak and the interviewer's answers are now doing more work: who the user is, what action we drive, what a good outcome looks like, and what the scale and latency are. I WOULD BE EXPLICIT ABOUT NOT KNOWING THE DOMAIN and ask the two or three questions whose answers would change the design — that reads as competence rather than weakness, and an interviewer who has to correct a confident wrong assumption forms a much worse impression than one who answers a good question. THEN THE ARITHMETIC STILL WORKS: traffic, storage, latency budget and funnel sizing do not care what the items are, and they will eliminate most designs regardless. THE LABEL QUESTION STILL WORKS, and in an unfamiliar domain it is where I would spend the most time, because the answer usually reveals the actual difficulty — a domain where labels are expensive and delayed is a fundamentally different problem from one with abundant implicit feedback, and that distinction is more consequential than any domain knowledge I am missing. WHAT I WOULD NOT DO is bluff domain specifics, which is the failure mode that turns a survivable gap into a disqualifying one.",
          "deepDive": "There is a useful move for genuinely unfamiliar domains: reason by analogy to a structure you do know, out loud and labelled as an analogy. 'This looks structurally like a retrieval problem with an expensive verification step, which is the same shape as retrieval-augmented generation — the corpus is different but the funnel arithmetic transfers.' That demonstrates transfer, which is what the round is really testing, and it invites correction if the analogy is wrong. It also connects to module 22's thesis: the mechanisms transfer even when the surface does not, so a candidate who has learned mechanisms rather than domains is genuinely more portable and can say so with evidence. The honest limit is that some rounds are testing domain knowledge specifically — an ads role asking about auction mechanics, say — and no framework substitutes for knowing what a second-price auction is. Recognizing which kind of question you are in, and saying 'I don't know the auction mechanics, here's how I'd reason about the rest', is better than either bluffing or freezing."
        },
        {
          "q": "How does this framework relate to the rest of the curriculum?",
          "a": "IT IS THE CURRICULUM'S CONTENT ARRANGED FOR A DIFFERENT AUDIENCE. Step 3, data and labels, is module 23: where a label comes from is a question about the process that generated it, and training on logs your own policy produced is confounding. Step 5, model choice, is the supervised and deep-learning modules, and the honest answer is usually 'the simplest thing that could work' because that is what the bias-variance and scaling material actually supports. Step 6, serving, is the LLM-systems and MLOps arithmetic — the funnel exists because of the memory-bandwidth and latency facts from module 17. Step 7, metrics, is module 24: one primary metric with a stated reference class, guardrails with the burden of proof reversed, and honesty about the online-offline gap. Step 8, iterate, is module 23's experimentation discipline and module 24's monitoring limits. SO THE FRAMEWORK IS NOT A NEW SKILL BOLTED ON AT THE END; it is a retrieval structure over material you already have, which is exactly why it reduces variance — you are not inventing answers under pressure, you are indexing them.",
          "deepDive": "That framing has a practical consequence for preparation. If the framework is an index, then practising it means practising the RETRIEVAL, not re-learning the content — running through cases out loud, on a timer, with someone listening, until the step transitions are automatic and you can spend your attention on the case rather than on what comes next. That is a different activity from reading, and it is the one that actually moves the variance. It also predicts the specific failure of under-practised candidates: they know every piece of the content and produce it in an order the interviewer cannot follow, which is exactly the high-variance presentation from the previous lesson, and it is why strong engineers sometimes interview badly. The fix is mechanical and fast — three or four timed mock cases with feedback on structure rather than on content — which is a much better use of a week than another pass through a textbook whose material you already know."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ The eight-step skeleton",
        "back": "clarify → frame as ML → data & labels → features → model → serving → metrics → iterate. The ORDER is the content. Say the step names OUT LOUD — structure the interviewer can't hear doesn't count."
      },
      {
        "type": "formula",
        "front": "★ The latency budget forces the funnel",
        "back": "200 ms p99 − 85 ms fixed = 115 ms for the ranker. Items scorable: two-tower 230,000 · GBDT 57,500 · MLP 19,167 · cross-encoder **128** · 7B LLM **10**. Four orders of magnitude."
      },
      {
        "type": "intuition",
        "front": "A well-sized funnel",
        "back": "500M → 1,000 (ANN) → 500 (rules) → 500 (GBDT) → 50 (cross-encoder) → 10. Each stage cuts 10–100× and costs 10–100× more per item. **Roughly constant cost per stage.** If one exceeds half the budget, it's mis-sized."
      },
      {
        "type": "formula",
        "front": "Traffic and storage arithmetic",
        "back": "100M DAU × 20/day = 23,000 QPS avg, ~69,000 peak (3× diurnal). 500M × 256-d fp32 = 0.51 TB (int8: 0.13 TB) → too big for a 64–256 GB host, so shard or quantize."
      },
      {
        "type": "formula",
        "front": "★ Name the cost",
        "back": "At 69,000 peak QPS: GBDT (3 ms, ~400 rps/host) → **174 hosts**. Cross-encoder (45 ms, ~22 rps/host) → **3,157 hosts**. ≈ **$39M/year** apart. Converts a preference into a decision."
      },
      {
        "type": "pitfall",
        "front": "The most common failure",
        "back": "Jumping from clarify straight to MODEL, forfeiting steps 2–4 — frame, labels, features — which is exactly where candidates differentiate."
      },
      {
        "type": "intuition",
        "front": "★ Step 3 is where the round is won",
        "back": "Where does a label come from, how delayed, how biased, and what is it a proxy FOR? Clicks: seconds, position-biased, generated by the PREVIOUS model. Purchases: days, sparse. Satisfaction: not logged."
      },
      {
        "type": "pitfall",
        "front": "The step-4 trap",
        "back": "Proposing features unavailable AT SERVING TIME. Train/serve skew is born there, and \"I'd use the user's next-session behaviour\" ends the round."
      },
      {
        "type": "intuition",
        "front": "Handling ambiguity",
        "back": "\"I'll assume 200 ms p99 and consumer traffic — tell me if that's wrong,\" then move. An unresolved ambiguity costs the round; a stated assumption costs nothing and demonstrates the thing being scored."
      },
      {
        "type": "intuition",
        "front": "p99 with fan-out",
        "back": "A request hitting 10 shards has p99 set by the SLOWEST shard, so shard p99 must sit near end-to-end p99.9. Mitigations: hedged requests, hard timeout with partial results, hard caps on variable-cost stages."
      },
      {
        "type": "pitfall",
        "front": "The missing fourth thing",
        "back": "FAILURE MODES. Feature store times out → defaults or fail? Index stale → how stale is OK? Ranker down → popularity or cached scores? A happy-path design is a demo. And: what would make you revert?"
      },
      {
        "type": "intuition",
        "front": "★ The framework is an INDEX, not new content",
        "back": "Step 3 = module 23 (labels, confounded logs). Step 6 = module 17 (funnel arithmetic). Step 7 = module 24 (one primary, reference classes). So practise RETRIEVAL — timed mock cases out loud — not re-reading."
      }
    ],
    "refs": [
      {
        "title": "Huyen (2022), Designing Machine Learning Systems",
        "url": "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"
      },
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      },
      {
        "title": "Dean & Barroso (2013), The Tail at Scale",
        "url": "https://research.google/pubs/pub40801/"
      },
      {
        "title": "Google, Rules of Machine Learning: Best Practices for ML Engineering",
        "url": "https://developers.google.com/machine-learning/guides/rules-of-ml"
      },
      {
        "title": "Breck, Cai, Nielsen, Salib & Sculley (2017), The ML Test Score",
        "url": "https://research.google/pubs/pub46555/"
      }
    ],
    "demos": [
      "model-cascade",
      "autoscaling",
      "canary-rollout",
      "batching"
    ]
  },
  "design-recommender": {
    "level": "core",
    "body": {
      "intuition": [
        "The first worked case, and the one where the skeleton's step 3 - where does a label come from - turns out to be the entire problem. Candidates spend the round on the ranker. The ranker is almost never the ceiling.",
        "TWO ARITHMETIC FACTS DECIDE THE DESIGN. First, a ranker cannot rank what retrieval never returned: if recall@1000 is 0.70, a PERFECT ranker tops out at 0.70, so the ceiling lives in candidate generation. Second, clicks measure placement rather than preference - with a realistic examination curve, P(click) at rank 1 was 0.4991 and at rank 10 was 0.0989, a 5.0x gap, while the TRUE relevance at those ranks was 0.5000 and 0.4994, identical by construction.",
        "That second fact is module 23 arriving in a product setting. Train on raw clicks and you teach the model to reproduce the previous ranker's placement. Inverse-propensity weighting recovered the truth almost exactly - naive CTR 0.1986 against an IPS estimate of 0.4999 for a true 0.5005 - and it requires the propensities to have been LOGGED, which is a step-3 design decision and cannot be retrofitted."
      ],
      "math": [
        {
          "h": "★ The retrieval recall ceiling",
          "paras": [
            "Everything downstream of candidate generation is a re-ordering of what it returned. Recall at the retrieval stage is a hard upper bound on the whole system's recall.",
            "This single observation redirects most design rounds productively, because it identifies where the marginal effort should go."
          ],
          "tex": "\\text{recall@}k_{\\text{system}} \\leq \\text{recall@}N_{\\text{retrieval}}: \\quad 0.70 \\Rightarrow \\text{a perfect ranker still achieves } 0.70",
          "texNote": "The practical consequence: measure retrieval recall separately and early. A two-point NDCG gain from a better ranker is worthless if retrieval is losing 30% of the relevant items before the ranker sees them."
        },
        {
          "h": "★ Position bias, measured",
          "paras": [
            "Model the click as relevance times an examination probability that decays with rank. The observed click rate then reflects both, and the rank effect dominates.",
            "True relevance is identical across ranks by construction here, so every difference in the click rate is bias."
          ],
          "tex": "P(\\text{click}) = P(\\text{relevant})\\cdot P(\\text{examined}\\mid \\text{rank}): \\quad 0.4991\\ (\\text{rank }1)\\ \\text{vs}\\ 0.0989\\ (\\text{rank }10),\\ \\text{true relevance } 0.5000\\ \\text{vs}\\ 0.4994",
          "texNote": "A 5.0x difference in clicks from a 0.001 difference in relevance. Any model trained on raw clicks learns the examination curve, which is the previous system's behaviour, not the user's preference."
        },
        {
          "h": "The correction, and what it costs you at design time",
          "paras": [
            "Reweight each observed click by the inverse probability that its position was examined. This is the same inverse-propensity machinery as module 23's IPW, with rank as the treatment."
          ],
          "tex": "\\hat{r} = \\mathbb{E}\\Big[\\frac{c_i}{P(\\text{examined}\\mid \\text{rank}_i)}\\Big] = 0.4999 \\quad\\text{vs naive } 0.1986 \\quad (\\text{true } 0.5005)",
          "texNote": "It recovers the truth to three decimals - and it needs the propensity, which means either an examination model or, far better, deliberate randomization logged at serving time. Retrofitting this onto existing logs is the expensive path."
        }
      ],
      "code": [
        {
          "h": "The case, walked with the skeleton",
          "paras": [
            "Answers are illustrative; the point is which questions get asked and in what order."
          ],
          "code": "# 1 CLARIFY   home feed, 100M DAU, 20 sessions/day, p99 200 ms,\n#             optimize long-term engagement; out of scope: ads, notifications\n# 2 FRAME     rank a candidate set per request. NOT a global CTR classifier.\n# 3 LABELS    ★ implicit only. click (seconds, position-biased), dwell>30s\n#             (minutes, closer to value), like (sparse, biased to extremes),\n#             next-day return (1 day, the thing we want, too delayed to train on)\n#             -> train on a WEIGHTED blend, validate against next-day return\n# 4 FEATURES  user history embedding, item embedding, context (time, device),\n#             cross features. ALL must exist at serving time.\n# 5 MODEL     two-tower for retrieval; GBDT or MLP for ranking; cross-encoder\n#             re-rank on the top ~50 only\n# 6 SERVING   500M -> 1000 (ANN) -> 500 (rules) -> 500 (rank) -> 50 (re-rank) -> 10\n# 7 METRICS   primary: next-day return. guardrails: diversity, creator\n#             coverage, time-to-first-interaction. offline: NDCG on a\n#             randomized slice, not on logged impressions\n# 8 ITERATE   ship retrieval first (the ceiling), then ranking",
          "caption": "Step 3 takes the longest and is the answer to why this is a hard problem. Step 5 takes ninety seconds and is where most candidates spend the round."
        },
        {
          "h": "The feedback loop, and the cheap insurance against it",
          "paras": [
            "The model chooses what is shown; what is shown determines what is logged; the logs train the next model. That is a closed loop with no external correction."
          ],
          "code": "# THE LOOP\n#   model -> impressions -> clicks -> training data -> model\n# Nothing in it observes items the model never showed, so the system\n# converges on a narrowing slice and reports improving offline metrics\n# the whole way.\n\n# SYMPTOMS\n#   * popularity concentration rising over time\n#   * new items never accumulating impressions (cold start becomes permanent)\n#   * offline NDCG improving while online engagement is flat\n\n# THE INSURANCE, decided at step 3 and cheap only if done early\n#   * LOG THE PROPENSITY with every impression\n#   * keep a small epsilon-random exploration slice permanently\n#   * keep a holdout that never sees the personalized feed\n# ★ These cost a little engagement now and are the only way to answer\n#   counterfactual questions later. They cannot be added retroactively.",
          "caption": "This is module 23's logged-propensity argument arriving as a product decision, and it is the highest-leverage thing a candidate can raise unprompted."
        }
      ],
      "useCases": [
        "The most common ML design prompt after search - feed, home page, 'people you may know', related items, and any personalized surface.",
        "Diagnosing a real recommender whose offline metrics improve while online engagement is flat, where position bias and the feedback loop are the first two hypotheses.",
        "Deciding where to spend engineering effort, since measuring retrieval recall separately usually reveals the ceiling is upstream of the ranker.",
        "Arguing for exploration budget and propensity logging with a concrete number rather than a principle."
      ],
      "pitfalls": [
        "Optimizing the ranker when retrieval is the ceiling. At recall@1000 of 0.70 a perfect ranker still achieves 0.70, and no ranking work changes that.",
        "Training on raw clicks. Rank 1 versus rank 10 gave a 5.0x click difference on identical true relevance, so the model learns the previous system's placement.",
        "Assuming the propensities will be available later. IPS recovered 0.4999 against a true 0.5005, and it needs the propensity logged at serving time - retrofitting is the expensive path.",
        "Choosing clicks as the training target without saying what they are a proxy for. Dwell, like and next-day return have different delays and different biases, and the blend is the actual design decision.",
        "Ignoring the feedback loop. Popularity concentration rises, new items never accumulate impressions, and offline metrics improve throughout.",
        "Evaluating offline on logged impressions. The logs were generated by the incumbent policy, so the evaluation is confounded in the model's favour - use a randomized slice.",
        "Proposing a cross-encoder over the full candidate set. It scores about 128 items in a 115 ms budget, which is why it belongs on the top 50 and nowhere earlier."
      ],
      "connections": [
        {
          "ref": "ml-applications/recommenders-cf",
          "text": "The modelling substance - matrix factorization, two-tower retrieval, implicit feedback - that this case arranges into a design."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Why logged clicks are confounded: the previous policy chose what was shown, so the observed outcome and the counterfactual differ systematically."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "Randomized ranking perturbations as an instrument for exposure, which is how the propensity logging pays off later."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The exploration budget argued for at step 3, and why a permanent epsilon-random slice is infrastructure rather than an experiment."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "Why the offline-online gap persists: the training distribution is generated by the deployed policy and moves whenever the policy does."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What caps a recommender's recall?",
          "a": "Retrieval. A ranker cannot rank what candidate generation never returned — at recall@1000 of 0.70, a PERFECT ranker still achieves 0.70."
        },
        {
          "q": "Give the position-bias numbers.",
          "a": "P(click) 0.4991 at rank 1 vs 0.0989 at rank 10 — a 5.0× gap — while true relevance was 0.5000 vs 0.4994, identical by construction."
        },
        {
          "q": "What does a model trained on raw clicks learn?",
          "a": "The previous ranker's examination curve — placement, not preference. It reproduces the incumbent policy."
        },
        {
          "q": "How do you correct it?",
          "a": "Inverse-propensity weighting by examination probability. Naive CTR 0.1986 → IPS estimate 0.4999 against a true 0.5005."
        },
        {
          "q": "What does IPS require?",
          "a": "The propensity LOGGED at serving time (or a randomized slice). A step-3 design decision that cannot be retrofitted cheaply."
        },
        {
          "q": "Name four candidate labels and their delays.",
          "a": "Click (seconds, position-biased), dwell >30s (minutes, closer to value), like (sparse, extreme-biased), next-day return (1 day, what you want, too delayed to train on)."
        },
        {
          "q": "So what do you train on?",
          "a": "A weighted blend of fast proxies, VALIDATED against the delayed thing you actually want. Saying that is the answer to step 3."
        },
        {
          "q": "Describe the feedback loop.",
          "a": "model → impressions → clicks → training data → model. Nothing observes items never shown, so the system narrows while offline metrics improve."
        },
        {
          "q": "Its three symptoms?",
          "a": "Rising popularity concentration; new items never accumulating impressions (permanent cold start); offline NDCG up while online engagement is flat."
        },
        {
          "q": "The insurance against it?",
          "a": "Log propensities with every impression, keep a permanent ε-random exploration slice, and keep a holdout that never sees the personalized feed."
        },
        {
          "q": "Why not offline-evaluate on logged impressions?",
          "a": "The logs were generated by the incumbent policy, so the evaluation is confounded in its favour. Evaluate on a randomized slice."
        },
        {
          "q": "Where does a cross-encoder go?",
          "a": "The top ~50 only — it scores about 128 items in a 115 ms budget, so anywhere earlier in the funnel is arithmetically impossible."
        }
      ],
      "standard": [
        {
          "q": "Design the ranking system for a home feed.",
          "a": "I'D WALK THE SKELETON AND SPEND MOST OF IT ON LABELS. CLARIFY: 100M DAU, 20 sessions a day, p99 of 200 ms, optimizing long-term engagement; ads and notifications out of scope. FRAME: rank a candidate set per request, not a global CTR classifier — a distinction that matters because the training data is per-impression and the metric is per-session. LABELS, WHERE THE PROBLEM ACTUALLY IS: everything available is implicit. A click arrives in seconds and is heavily position-biased. Dwell over 30 seconds arrives in minutes and is closer to value. A like is sparse and biased toward extremes. Next-day return is the thing we want and is far too delayed to train on. So I'd train on a weighted blend of the fast proxies and VALIDATE against next-day return, and say that explicitly, because the gap between the training target and the goal is the design's central compromise. FEATURES: user history embedding, item embedding, context, cross features — all constrained to what exists at serving time. MODEL: two-tower retrieval, GBDT or MLP ranking, cross-encoder re-rank on the top 50 only. SERVING: 500M → 1,000 → 500 → 500 → 50 → 10. METRICS: next-day return primary, with diversity and creator coverage as guardrails. ITERATE: ship retrieval first, because that is the ceiling.",
          "deepDive": "The reason to ship retrieval first is worth defending with the arithmetic, because it is the highest-value thing in the answer. Everything downstream of candidate generation is a re-ordering of what it returned, so system recall is bounded by retrieval recall: at recall@1000 of 0.70, a perfect ranker still achieves 0.70. Candidates almost always spend the round on the ranker, and in real systems the ceiling is upstream far more often. The diagnostic is cheap — measure retrieval recall against a held-out set of known-relevant items, separately from end-to-end metrics — and it usually reallocates the roadmap. The second thing I'd raise unprompted is the guardrail set, because a feed optimized purely for engagement has well-known failure modes that a single metric cannot see: concentration on a shrinking set of creators, a permanent cold-start trap for new items, and drift toward whatever content maximizes short-run attention. Those are module 24's subgroup problem in a product costume — the aggregate metric improves while a segment collapses — and naming them shows you have watched a feed in production rather than only built one."
        },
        {
          "q": "You are training on clicks. What is wrong with that, and what would you do?",
          "a": "CLICKS MEASURE PLACEMENT AT LEAST AS MUCH AS PREFERENCE. Modelling the click as relevance times an examination probability that decays with rank, and holding true relevance IDENTICAL across ranks by construction, P(click) came out at 0.4991 at rank 1 and 0.0989 at rank 10 — a 5.0× difference generated entirely by position. Any model trained on raw clicks learns that examination curve, which is a description of the PREVIOUS ranker's behaviour rather than of the user's preference, and it will therefore recommend what the incumbent already recommended. THE STANDARD FIX IS INVERSE-PROPENSITY WEIGHTING: reweight each click by the inverse probability that its position was examined. Measured, that recovered the truth almost exactly — naive CTR 0.1986 against an IPS estimate of 0.4999 for a true 0.5005. IT IS THE SAME MACHINERY AS MODULE 23'S IPW with rank as the treatment, and it inherits the same requirement: you need the propensity. The cheap and reliable way to get it is to log the assignment probability with every impression and to keep a small permanently-randomized slice, which makes the propensity KNOWN rather than estimated. That is a step-3 decision, and retrofitting it onto historical logs is the expensive path.",
          "deepDive": "Two refinements worth having. First, IPW's variance problem transfers directly: items shown only at low-examination positions get large weights and a handful of observations can dominate, so the effective sample size is the honest diagnostic — exactly as it was for propensity matching. Clipping the weights trades bias for variance and, as in module 23, quietly changes the estimand. Second, position is not the only bias in the logs: there is selection bias in what was eligible for retrieval at all, presentation bias from thumbnails and titles, and trust bias where users click top results because they are top rather than because they were examined more. The examination model captures one of these and papers over the rest, which is why a randomized slice is worth more than a better propensity model — it dissolves all of them at once for the slice it covers. The cost is real and quantifiable: an ε of one percent on a feed is one percent of impressions served suboptimally, and that number is what you take to a product owner alongside the counterfactual questions it makes answerable."
        },
        {
          "q": "Your offline NDCG improved 3% and online engagement did not move. What happened?",
          "a": "THE MOST LIKELY EXPLANATION IS THAT THE OFFLINE EVALUATION IS CONFOUNDED IN THE INCUMBENT'S FAVOUR, and it has three common forms. FIRST, EVALUATING ON LOGGED IMPRESSIONS: those impressions were chosen by the current model, so a new model is scored on its ability to reproduce the current model's choices, and NDCG on that set rewards agreement rather than quality. Evaluate on a randomized slice instead, where the impressions were not chosen by any model. SECOND, POSITION BIAS UNCORRECTED, which is the same problem in another form — the labels encode the incumbent's ranking, so matching them looks like winning. THIRD, A METRIC MISMATCH: NDCG measures ranking quality on a session's candidate set, and engagement is a longer-horizon, session-count quantity, so a ranking improvement can be real and still not move the thing you report. THE DIAGNOSTIC ORDER I'D USE: check whether the offline set is randomized; check whether retrieval changed at all, since a ranking gain on a fixed candidate set cannot exceed the retrieval ceiling of 0.70; and check the guardrails, because a diversity collapse can offset a relevance gain in aggregate engagement while both metrics move as designed.",
          "deepDive": "There is a fourth possibility that is less discussed and quite common: the improvement is real and the experiment is underpowered. Engagement metrics are noisy and session-level effects are small, so a 3% NDCG gain might correspond to a 0.2% engagement change that a two-week test cannot detect — which is module 23's MDE arithmetic, and the honest report is 'we could not have detected anything below X' rather than 'no effect'. Variance reduction with a pre-period covariate is the highest-value response, since CUPED-style adjustment bought roughly a 1.65× sample multiplier in that module for free. The other thing worth checking is novelty: a new ranker often produces a short-lived engagement bump from unfamiliar content that decays, so a one-week read of a permanent change measures a different quantity than a four-week read. Reporting the offline-online gap as a standing number — how much of an offline gain has historically translated — is the single most useful artifact a recommender team can maintain, and almost nobody does, which means every new model's projection is a guess."
        },
        {
          "q": "How would you handle cold start for new items?",
          "a": "BY TREATING IT AS AN EXPLORATION PROBLEM RATHER THAN A FEATURE PROBLEM, because the feedback loop makes it self-reinforcing. A new item has no interaction history, so the model ranks it low, so it gets no impressions, so it never accumulates history — and the loop closes permanently. Content features help and do not break the loop: an item embedding from text, image or metadata gives the two-tower model something to work with and places the item near similar items, which is necessary and not sufficient, because the ranker will still prefer items with proven engagement. THE MECHANISM THAT BREAKS THE LOOP IS FORCED EXPOSURE with a budget: reserve a small fraction of impressions for under-explored items, which is exactly a bandit's exploration term and is best implemented as a permanent slice rather than a campaign. That converts cold start from a trap into a bounded cost you can state — one percent of impressions, say — and it produces the propensity-logged data that makes everything else measurable. I'D ALSO SET AN EXPLICIT GRADUATION CRITERION: how many impressions an item needs before its estimate is trusted, which is a confidence-interval question rather than a round number.",
          "deepDive": "The guardrail worth adding is creator or supplier coverage, because cold start is usually not a per-item problem but a marketplace-health problem. A feed that never surfaces new creators loses supply over time, and that damage shows up in engagement much later than in the coverage metric, which is why coverage belongs in the guardrail tier from module 24 with the burden of proof reversed — you need evidence of NO harm rather than evidence of harm. There is also a measurement subtlety: exploration impressions are worth more than their engagement suggests, because their value is the information they produce, and evaluating the exploration slice on the same engagement metric as the exploit slice will always make exploration look like a loss. The honest framing is that the ε cost is an information purchase with a measurable return — the improvement in the model trained on the resulting data — and teams that never make that argument tend to have their exploration budget cut in the first efficiency review."
        },
        {
          "q": "What would you monitor once this ships?",
          "a": "FOUR TIERS, AND THE FIRST IS THE ONE MOST TEAMS SKIP. LABELLED PERFORMANCE: a small continuously-labelled random sample, because module 24's result is that no unlabelled statistic detects concept shift — every input monitor stayed at control values while accuracy fell to 0.3375 there. For a feed, the equivalent is a randomized holdout whose engagement is measured continuously, which also gives an unbiased baseline for every future experiment. PIPELINE INTEGRITY: feature null rates, embedding freshness, index staleness, and schema invariants, which catch the failures that do the most damage fastest and are written as invariants rather than statistical tests. FUNNEL HEALTH: retrieval recall on a held-out set, candidate counts at each stage, and per-stage latency against the budget, since a silent retrieval regression is invisible in end-to-end engagement until it is large. GUARDRAILS: diversity, creator coverage, and the popularity concentration curve, which is the feedback loop's early symptom and moves long before engagement does.",
          "deepDive": "The one I would argue hardest for is the permanent randomized holdout, because it does triple duty and is nearly impossible to add later. It gives an unbiased engagement baseline, so every experiment has a stable reference rather than a moving one; it gives unconfounded training data, which is the only clean source for evaluating a new ranker offline; and it gives the counterfactual for measuring the system's cumulative value, which is the number leadership eventually asks for and which no team without a holdout can answer. Its cost is precisely quantifiable — the engagement gap between holdout and treated users times the holdout fraction — and stating that cost up front is what gets it approved. The related monitoring habit from module 24 is to report per-segment rather than aggregate, since a feed can improve on average while degrading for a cohort, and the aggregate is a weighted average that hides exactly the reversal you most need to see."
        },
        {
          "q": "What makes this case hard, in one sentence, and what does that generalize to?",
          "a": "THE LABEL YOU CAN MEASURE IS NOT THE OUTCOME YOU WANT, AND THE DATA YOU TRAIN ON WAS GENERATED BY THE SYSTEM YOU ARE TRYING TO IMPROVE. Both halves are step 3, and both are the causal module in a product setting. The first half is a proxy problem: clicks are fast and biased, next-day return is what matters and is too delayed to train on, so the design's central compromise is a weighted blend validated against the delayed target — and that compromise should be said out loud, because it is the honest answer to why this is hard. The second half is a confounding problem: impressions were chosen by the incumbent policy, so the logs describe that policy as much as they describe users, and a model trained on them converges toward reproducing it while offline metrics improve throughout. THE GENERALIZATION IS THE PATTERN TO CARRY INTO EVERY OTHER DESIGN CASE: ask what the label is a proxy for and how delayed it is, and ask which policy generated the data you are about to train on. Those two questions find the hard part of almost every applied ML system, and they take fifteen seconds.",
          "deepDive": "It is worth naming the third member of that family, which shows up in the remaining cases: the metric you optimize is not the metric you are judged on, and the gap between them is where Goodhart lives. In a feed, engagement is a proxy for value and optimizing it hard produces the well-documented pathologies; in ads, revenue per auction is a proxy for advertiser and user welfare; in fraud, caught-fraud is a proxy for loss prevented net of friction. Module 24's measurement showed the shape: a proxy tracking truth across the range where it was fitted and inverting outside it, with true quality at −49.319 where the proxy was maximized. The design-level defence is the same as the alignment-level one — bound the optimization pressure, keep a held-out measurement of the thing you actually want, and put guardrails on the failure directions you can name in advance. Saying that in a design round, briefly and with a number, is unusual and lands well, because it is the difference between designing a system and designing a system you would be willing to own."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The retrieval recall ceiling",
        "back": "recall@k_system ≤ recall@N_retrieval. At recall@1000 = 0.70, a PERFECT ranker still achieves 0.70. Candidates spend the round on the ranker; the ceiling is almost always upstream."
      },
      {
        "type": "formula",
        "front": "★ Position bias, measured",
        "back": "P(click) = P(relevant)·P(examined | rank). Rank 1: **0.4991**. Rank 10: **0.0989** — a 5.0× gap — while true relevance was 0.5000 vs 0.4994, identical by construction."
      },
      {
        "type": "intuition",
        "front": "What does training on raw clicks teach?",
        "back": "The previous ranker's EXAMINATION CURVE — placement, not preference. The model learns to reproduce the incumbent policy, and offline metrics reward it for doing so."
      },
      {
        "type": "formula",
        "front": "The IPS correction",
        "back": "r̂ = E[ c_i / P(examined | rank_i) ]. Naive CTR **0.1986** → IPS **0.4999** (true 0.5005). Same machinery as module 23's IPW, with RANK as the treatment."
      },
      {
        "type": "pitfall",
        "front": "What IPS requires",
        "back": "The propensity LOGGED at serving time, or a permanently randomized slice (which makes it KNOWN rather than estimated). A step-3 decision — retrofitting onto historical logs is the expensive path."
      },
      {
        "type": "definition",
        "front": "Four labels, four delays",
        "back": "Click (seconds, position-biased) · dwell >30s (minutes, closer to value) · like (sparse, extreme-biased) · next-day return (1 day, WHAT YOU WANT, too delayed to train on). Train on a blend; VALIDATE on the delayed one."
      },
      {
        "type": "pitfall",
        "front": "★ The feedback loop",
        "back": "model → impressions → clicks → training data → model. Nothing observes items never shown. Symptoms: rising popularity concentration, permanent cold start, offline NDCG up while online engagement is flat."
      },
      {
        "type": "intuition",
        "front": "The three-part insurance",
        "back": "Log propensities with every impression · a permanent ε-random exploration slice · a holdout that never sees the personalized feed. Costs a little engagement now; cannot be added retroactively."
      },
      {
        "type": "pitfall",
        "front": "Why offline NDCG improves and engagement doesn't",
        "back": "Evaluating on LOGGED impressions scores a model on reproducing the incumbent's choices. Also: uncorrected position bias, a metric-horizon mismatch, or an underpowered test (module 23's MDE arithmetic)."
      },
      {
        "type": "intuition",
        "front": "Cold start is an exploration problem",
        "back": "No history → ranked low → no impressions → no history. Content features help and DON'T break the loop. Forced exposure with a stated budget does — plus an explicit graduation criterion (a CI question, not a round number)."
      },
      {
        "type": "intuition",
        "front": "Why the permanent holdout does triple duty",
        "back": "Unbiased engagement baseline · unconfounded training/eval data · the counterfactual for cumulative system value. Cost is exactly quantifiable, which is what gets it approved. Nearly impossible to add later."
      },
      {
        "type": "intuition",
        "front": "★ What makes this case hard (and generalizes)",
        "back": "The label you can measure isn't the outcome you want, AND the data you train on was generated by the system you're improving. Ask both of every design case — it takes fifteen seconds and finds the hard part."
      }
    ],
    "refs": [
      {
        "title": "Covington, Adams & Sargin (2016), Deep Neural Networks for YouTube Recommendations",
        "url": "https://research.google/pubs/pub45530/"
      },
      {
        "title": "Joachims, Swaminathan & Schnabel (2017), Unbiased Learning-to-Rank with Biased Feedback",
        "url": "https://arxiv.org/abs/1608.04468"
      },
      {
        "title": "Yi et al. (2019), Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations",
        "url": "https://dl.acm.org/doi/10.1145/3298689.3346996"
      },
      {
        "title": "Chaney, Stewart & Engelhardt (2018), How Algorithmic Confounding in Recommendation Systems Increases Homogeneity",
        "url": "https://arxiv.org/abs/1710.11214"
      },
      {
        "title": "Bottou et al. (2013), Counterfactual Reasoning and Learning Systems",
        "url": "https://arxiv.org/abs/1209.2355"
      }
    ],
    "demos": [
      "embeddings",
      "vector-search",
      "bandit",
      "roc"
    ]
  },
  "design-search-ads": {
    "level": "core",
    "body": {
      "intuition": [
        "Search and ads share a funnel with the recommender and differ in one structural way that decides the whole design: IN A FEED ONLY THE ORDER MATTERS, AND IN AN AUCTION THE PROBABILITY IS A PRICE. That single sentence is the case, and knowing which camp you are in changes the loss function, the metric, and what counts as a bug.",
        "The surprising half is that the naive version of 'ads need calibration' is wrong, and the arithmetic says so. In a second-price auction ranked by eCPM = bid x pCTR, the price charged is the runner-up's eCPM divided by the winner's pCTR - so a UNIFORM scale error cancels in both the ranking and the price. Measured across pCTR multipliers of 0.5x to 2.0x, revenue moved by at most 0.1%.",
        "The expensive error is HETEROGENEOUS. A per-ad log-normal pCTR error with sd 0.25 cost 4.7% of revenue, sd 0.50 cost 14.8%, and sd 1.00 cost 36.9% - because a per-ad error reorders the auction and puts the wrong ad first. So the requirement is not 'calibrated' but CALIBRATED CONDITIONAL ON THE AD, which is module 24's reference-class thesis arriving as a revenue number."
      ],
      "math": [
        {
          "h": "The auction, and why uniform error cancels",
          "paras": [
            "Rank by expected value per impression; charge the minimum bid that would have retained the position. Both the ranking statistic and the price contain pCTR, and a uniform scale factor appears in both.",
            "This is why a systematically overconfident pCTR model can run for years without anyone noticing in revenue."
          ],
          "tex": "\\text{rank by } e_i = b_i\\hat{p}_i, \\qquad \\text{price}_{(1)} = \\frac{e_{(2)}}{\\hat{p}_{(1)}} = \\frac{b_{(2)}\\hat{p}_{(2)}}{\\hat{p}_{(1)}}: \\quad \\hat{p}\\to c\\hat{p} \\Rightarrow \\text{order fixed, price fixed}",
          "texNote": "Measured revenue change for uniform multipliers 0.5x, 0.8x, 1.25x and 2.0x: -0.1%, +0.0%, -0.0%, -0.0%. The cancellation is exact up to the reserve price."
        },
        {
          "h": "★ Heterogeneous error is expensive because it reorders",
          "paras": [
            "A per-ad multiplicative error does not cancel: it changes which ad wins and derives the price from a wrong estimate.",
            "Log-normal per-ad error of the stated standard deviation, eight bidders per auction, second price with a reserve."
          ],
          "tex": "\\begin{array}{lr} \\text{per-ad error sd} & \\text{revenue vs calibrated}\\\\ 0.00 & +0.0\\%\\\\ 0.25 & -4.7\\%\\\\ 0.50 & -14.8\\%\\\\ 1.00 & \\mathbf{-36.9\\%} \\end{array}",
          "texNote": "So the ads-specific requirement is calibration CONDITIONAL on the ad, the advertiser, the slot and the query segment - a per-slice property, not an aggregate one. Aggregate ECE can be excellent while per-segment calibration is destroying a third of revenue."
        },
        {
          "h": "Where uniform calibration does bite: eligibility",
          "paras": [
            "A reserve price is a threshold on eCPM, and a uniform scale error moves every eCPM across it together. Pricing is invariant; eligibility is not."
          ],
          "tex": "\\text{show iff } b\\hat{p} \\geq \\text{floor}: \\quad \\hat{p}\\times 0.5 \\Rightarrow \\text{fill } 0.999 \\to 0.960, \\qquad \\hat{p}\\times 2.0 \\Rightarrow \\text{fill } \\to 1.000",
          "texNote": "The honest summary to give in an interview: a uniform scale error is free for PRICING and not for ELIGIBILITY; a per-ad error is expensive for both. Saying which one you mean is the differentiator."
        }
      ],
      "code": [
        {
          "h": "The case, walked",
          "paras": [
            "Sponsored results on a search page. The organic and sponsored sides have different objectives and share a latency budget."
          ],
          "code": "# 1 CLARIFY  sponsored results on a search page, 50k QPS peak, p99 150 ms\n#            (tighter than a feed - the page blocks on it), objective is\n#            long-run revenue subject to a relevance floor\n# 2 FRAME    per-query auction over eligible ads. TWO models: pCTR (must be\n#            calibrated per-ad) and relevance (only needs to rank)\n# 3 LABELS   click (position-biased, as in 25-03), conversion (delayed days,\n#            sparse, and the thing advertisers pay for), advertiser-reported\n#            conversions (biased and self-reported)\n# 4 FEATURES query-ad match, historical ad CTR (★ cold-start trap), advertiser\n#            quality, slot position, user context. Serving-time only.\n# 5 MODEL    retrieval by query-ad match -> pCTR + relevance -> auction\n# 6 SERVING  eligible ads (~1000) -> filter (policy, budget) -> score -> auction\n# 7 METRICS  revenue/1000 queries PRIMARY; guardrails: relevance, ad load,\n#            advertiser ROI, long-run query abandonment\n# 8 ITERATE  ship calibration monitoring per segment BEFORE any model change\n\n# ★ The ad-load guardrail is the one with real teeth: more ads is always more\n#   revenue today and fewer searches next quarter. It is the clearest Goodhart\n#   case in a design round.",
          "caption": "The organic and sponsored sides differ in exactly the way this lesson is about: organic needs a ranking, sponsored needs a price."
        },
        {
          "h": "Search-specific: relevance is a ranking problem again",
          "paras": [
            "The organic side is the recommender case with an explicit query, which changes retrieval and leaves the label problem intact."
          ],
          "code": "# RETRIEVAL     lexical (BM25) UNION dense (two-tower) - hybrid beats either,\n#               because they fail on different queries: lexical on synonyms,\n#               dense on rare exact terms, IDs and typos\n# RANKING       GBDT on match features + behavioural signals\n# RE-RANK       cross-encoder on the top ~50 (128 items fit a 115 ms budget)\n\n# LABELS - the same proxy ladder as the feed, one rung better\n#   click            seconds, position-biased\n#   long dwell       minutes, closer to satisfaction\n#   no reformulation ★ the strongest cheap signal in search: the user did\n#                      not have to ask again\n#   explicit rating  rare, expensive, and the only unbiased one\n\n# ★ 'No reformulation' is the answer that marks someone who has worked on\n#   search, because it is a session-level label rather than an impression-level\n#   one, and it aligns with the goal far better than a click does.",
          "caption": "Hybrid retrieval is worth stating with the reason: the two methods fail on disjoint query types, which is why the union beats tuning either."
        }
      ],
      "useCases": [
        "Any search, ads, or marketplace-ranking design round, and the class of systems where a predicted probability is used as a price rather than as an ordering.",
        "Diagnosing revenue loss in an auction, where per-segment calibration is the first thing to check and aggregate calibration is close to uninformative.",
        "Deciding whether a model needs calibration at all, by asking whether anything downstream consumes the probability rather than the order.",
        "Setting reserve prices and ad load, where the trade is short-run revenue against long-run user retention and the guardrail is the whole decision."
      ],
      "pitfalls": [
        "Saying 'ads need a calibrated model' without qualification. Uniform miscalibration from 0.5x to 2.0x moved revenue by at most 0.1%, because the scale cancels in second-price pricing.",
        "Reporting aggregate calibration for an auction. The costly error is per-ad: sd 0.25 cost 4.7% of revenue, sd 0.50 cost 14.8%, sd 1.00 cost 36.9%.",
        "Forgetting the reserve price. Uniform scale is free for pricing and not for eligibility - a 0.5x error moved fill rate from 0.999 to 0.960.",
        "Using historical ad CTR as a feature without handling cold start. New ads have no history, rank low, get no impressions, and never accumulate history - the feedback loop from the recommender case with money attached.",
        "Optimizing revenue per query with no ad-load guardrail. More ads is always more revenue today and fewer searches next quarter, which is the cleanest Goodhart case available.",
        "Treating search relevance and ad ranking as the same problem. One needs an ordering and the other needs a price, and the loss function should differ accordingly.",
        "Choosing dense retrieval over lexical rather than alongside it. They fail on disjoint query types - synonyms versus rare exact terms, IDs and typos - so the union is the design."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/calibration",
          "text": "The property this case turns into revenue, and the reason the aggregate number is the wrong one - per-segment calibration is what the auction consumes."
        },
        {
          "ref": "interview-capstone/design-recommender",
          "text": "The shared funnel, the shared position-bias problem, and the shared feedback loop - here with advertiser money making the cold-start trap more expensive."
        },
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "Hybrid lexical-plus-dense retrieval and why the union wins, which is the same argument in a different application."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Ad load as the design round's clearest Goodhart case: the proxy rises monotonically while the thing you want turns over."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "Why the primary metric here is revenue per thousand queries rather than CTR, and what the guardrail tier has to contain for that to be safe."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What is the structural difference between a feed and an auction?",
          "a": "In a feed only the ORDER matters. In an auction the probability is a PRICE. That decides the loss, the metric, and what counts as a bug."
        },
        {
          "q": "Give the second-price formula.",
          "a": "Rank by eᵢ = bᵢ·p̂ᵢ; the winner pays e₍₂₎/p̂₍₁₎ = b₍₂₎p̂₍₂₎/p̂₍₁₎."
        },
        {
          "q": "★ What does UNIFORM pCTR miscalibration cost?",
          "a": "Essentially nothing for pricing: −0.1% to +0.0% across multipliers 0.5× to 2.0×. The scale appears in both the ranking and the price, so it cancels."
        },
        {
          "q": "What does HETEROGENEOUS miscalibration cost?",
          "a": "Per-ad log-normal error: sd 0.25 → **−4.7%**, sd 0.50 → **−14.8%**, sd 1.00 → **−36.9%**. It reorders the auction and prices off a wrong estimate."
        },
        {
          "q": "So what is the real requirement?",
          "a": "Calibrated CONDITIONAL ON THE AD (and advertiser, slot, query segment) — a per-slice property. Module 24's reference class, as a revenue number."
        },
        {
          "q": "Where does uniform calibration bite?",
          "a": "Eligibility. A reserve price is a threshold on eCPM, so a 0.5× scale moved fill rate 0.999 → 0.960. Free for pricing, not for eligibility."
        },
        {
          "q": "Why hybrid retrieval in search?",
          "a": "Lexical and dense fail on DISJOINT query types — lexical on synonyms, dense on rare exact terms, IDs and typos. The union beats tuning either."
        },
        {
          "q": "Name the strongest cheap label in search.",
          "a": "No reformulation — the user didn't have to ask again. A session-level label that aligns with the goal far better than an impression-level click."
        },
        {
          "q": "What is the ad cold-start trap?",
          "a": "Historical ad CTR as a feature: new ads have no history → rank low → no impressions → no history. The recommender's feedback loop with money attached."
        },
        {
          "q": "What guardrail has the most teeth here?",
          "a": "Ad load. More ads is always more revenue today and fewer searches next quarter — the cleanest Goodhart case in any design round."
        },
        {
          "q": "Which labels does the ads side have?",
          "a": "Click (position-biased), conversion (delayed days, sparse, what advertisers pay for), advertiser-reported conversions (biased, self-reported)."
        },
        {
          "q": "Does the relevance model need calibration?",
          "a": "No — it only feeds an ordering. Only the model whose output is consumed as a probability does. Ask what consumes the number."
        }
      ],
      "standard": [
        {
          "q": "Design the sponsored results for a search page.",
          "a": "CLARIFY: sponsored slots on a search results page, 50k peak QPS, p99 of 150 ms — tighter than a feed because the page blocks on it — optimizing long-run revenue subject to a relevance floor. FRAME: a per-query auction over eligible ads, and critically TWO models with different requirements. The pCTR model's output is consumed as a probability and must be calibrated; the relevance model's output only feeds an ordering and need not be. LABELS: clicks arrive in seconds and are position-biased exactly as in the feed case; conversions arrive in days, are sparse, and are what advertisers actually pay for; advertiser-reported conversions are available and self-reported, so biased. FEATURES: query-ad match, historical ad CTR — which is a cold-start trap — advertiser quality, slot, user context, all serving-time only. SERVING: about a thousand eligible ads, filtered by policy and budget, scored, then auctioned. METRICS: revenue per thousand queries as primary, with relevance, ad load, advertiser ROI and query abandonment as guardrails. AND I'D SHIP PER-SEGMENT CALIBRATION MONITORING BEFORE ANY MODEL CHANGE, because as the next answer shows, the aggregate number is close to uninformative here.",
          "deepDive": "The ad-load guardrail deserves to be argued rather than listed, because it is the clearest Goodhart case available in a design round and it maps directly onto module 24's measurement. Showing more ads raises revenue per query monotonically and reduces the number of queries, with the second effect arriving quarters later — so the proxy rises the whole way while the quantity you want turns over, exactly the shape where true quality peaked at 2.536 and the proxy kept climbing to a true value of −49.319. The defence is the same as the alignment one: bound the optimization pressure with an explicit ad-load cap chosen on a long-horizon holdout rather than on the revenue curve, and treat that cap as a governance decision with an owner rather than a tunable. Saying that in a round, briefly, with the mechanism named, is unusual and it demonstrates the thing the round is testing — that you would be willing to own the system rather than only ship it."
        },
        {
          "q": "Does the pCTR model need to be calibrated? Be precise.",
          "a": "THE NAIVE ANSWER IS YES AND IT IS WRONG IN AN INSTRUCTIVE WAY. In a second-price auction ranked by eCPM = bid × pCTR, the winner pays the runner-up's eCPM divided by the winner's pCTR. A UNIFORM scale error appears in both the ranking statistic and the price, so it cancels: measured across multipliers of 0.5×, 0.8×, 1.25× and 2.0×, revenue moved by at most 0.1%. A systematically overconfident pCTR model can run for years without showing up in revenue at all. THE EXPENSIVE ERROR IS HETEROGENEOUS, because a per-ad error does not cancel — it reorders the auction, putting the wrong ad first, and then derives the price from a wrong estimate. Measured with per-ad log-normal error: sd 0.25 cost 4.7% of revenue, sd 0.50 cost 14.8%, and sd 1.00 cost 36.9%. SO THE REQUIREMENT IS NOT 'CALIBRATED' BUT CALIBRATED CONDITIONAL ON THE AD — and by extension on the advertiser, the slot and the query segment. AND THERE IS A THIRD PIECE: uniform scale is free for pricing and NOT for eligibility, because a reserve price is a threshold on eCPM, so a 0.5× error moved the fill rate from 0.999 to 0.960.",
          "deepDive": "That decomposition — free for pricing, costly for eligibility, and per-slice error costly for both — is the precise answer, and it is a direct instance of module 24's thesis: an aggregate ECE is a true number about a population you chose, and the auction consumes a per-slice property that the aggregate can hide entirely. A pCTR model with excellent overall calibration and systematic per-vertical bias is losing a double-digit percentage of revenue while every dashboard is green. The practical consequence is that calibration monitoring for ads must be sliced by whatever the auction conditions on, and the slices are numerous — advertiser, vertical, slot, device, query intent class — which makes it a real engineering commitment rather than a metric. Two more wrinkles worth knowing: first-price auctions, which much of the display market moved to, change this analysis because the price no longer contains pCTR, so uniform calibration stops being free; and budget pacing introduces a feedback loop where a miscalibrated pCTR causes budgets to exhaust at the wrong time of day, which shows up as a revenue loss with no obvious calibration symptom."
        },
        {
          "q": "How does the search side differ from the recommender case?",
          "a": "THE QUERY CHANGES RETRIEVAL AND LEAVES THE LABEL PROBLEM ALMOST INTACT. Retrieval becomes hybrid: lexical scoring such as BM25 UNIONED with dense two-tower retrieval, and the reason to say union rather than 'dense is better' is that they fail on disjoint query types — lexical misses synonyms and paraphrases, dense misses rare exact terms, product IDs, model numbers and typos. Tuning either alone leaves the other's failure class unaddressed, which is why every serious search stack runs both. Ranking and re-ranking are then the same funnel as the feed, with a cross-encoder on the top 50 because 128 items is what a 115 ms budget permits. THE LABELS ARE THE SAME LADDER WITH ONE BETTER RUNG. Clicks are position-biased identically. Long dwell is closer to satisfaction. And search has NO REFORMULATION — the user did not have to ask again — which is the strongest cheap signal available, because it is session-level rather than impression-level and aligns with the actual goal far better than a click does. Explicit ratings are unbiased and too rare to train on. THE OTHER DIFFERENCE IS INTENT VARIANCE: navigational, informational and transactional queries want different things, so a single ranker optimizing one metric across all of them is averaging over incompatible objectives.",
          "deepDive": "The intent point is worth developing because it is where search-specific judgment shows. A navigational query has essentially one correct answer and the metric that matters is whether it is at rank one; an informational query wants coverage and diversity; a transactional query wants freshness and availability. Optimizing aggregate NDCG across all three produces a ranker that is mediocre at each, and the standard fix is either an intent classifier routing to different rankers or intent features letting one model condition. That is the same subgroup-aggregation problem module 24 kept surfacing — the aggregate metric hides per-segment behaviour — appearing here as a product decision. The second search-specific issue is freshness: for some query classes the right answer changes hourly, so index update latency is a first-class design parameter rather than an implementation detail, and it interacts with the funnel because a stale ANN index silently drops new documents from retrieval, which is invisible in end-to-end metrics until it is large. Monitoring retrieval recall on a fresh-document holdout is the cheap catch."
        },
        {
          "q": "How would you handle ad cold start?",
          "a": "IT IS THE RECOMMENDER'S FEEDBACK LOOP WITH MONEY ATTACHED, AND THE MONEY MAKES IT WORSE IN BOTH DIRECTIONS. A new ad has no historical CTR, so the pCTR model predicts low, so its eCPM is low, so it loses auctions, so it accumulates no history — and the advertiser, who is paying, sees zero delivery. Content features help and do not break the loop: ad text, landing page, advertiser history and vertical give the model a prior, which is necessary and not sufficient because proven ads still win. THE MECHANISM THAT BREAKS IT is an explicit exploration allocation — an optimistic prior on new ads, or a reserved fraction of impressions, which is a bandit's exploration term with a budget you can state. Thompson sampling over the pCTR posterior is the principled version and is genuinely used, because it allocates exploration in proportion to uncertainty rather than uniformly. THE COMPLICATION ADS ADD is that exploration spends someone else's money: showing an unproven ad costs the auction its expected revenue AND may charge an advertiser for a poorly-targeted impression. So the exploration budget is a commercial decision, not only a statistical one, and stating that is what distinguishes an answer that has met an advertiser from one that has not.",
          "deepDive": "The related trap is the pCTR model's own feedback loop, which is subtler than the recommender's because the auction amplifies it. The model's predictions determine which ads are shown, which determines the training data, so an ad the model underestimates never generates the evidence that would correct the underestimate — and because eCPM ranking is a hard cutoff rather than a soft one, the censoring is severe. That makes propensity logging even more valuable here than in the feed case, and the same module 23 argument applies: log the probability with which each ad was selected, keep a small randomized slice, and you can do off-policy evaluation for years. Without it, every counterfactual question about the auction — would this ad have converted, what would a different ranker have earned — becomes an observational estimate on logs the incumbent generated. The honest framing for a stakeholder is that the exploration slice is the price of being able to answer those questions at all, and its cost is exactly measurable while its value is not, which is why it needs a defender."
        },
        {
          "q": "What metrics would you use, and what would you refuse to optimize?",
          "a": "PRIMARY: REVENUE PER THOUSAND QUERIES, because it captures the auction's actual output and is not gameable by simply showing more ads within a fixed page. GUARDRAILS, ALL WITH THE BURDEN OF PROOF REVERSED — I need evidence of no harm, not absence of evidence of harm: relevance of shown ads, ad load, advertiser ROI, and long-run query abandonment. WHAT I WOULD REFUSE TO OPTIMIZE IS CTR, and the reason is worth stating: CTR rises when you show fewer, safer ads and when you show more clickbait, so it is compatible with both a conservative and a degenerate strategy and distinguishes neither. It is a diagnostic, not an objective. I WOULD ALSO REFUSE SHORT-HORIZON REVENUE AS THE SOLE TARGET, because ad load is the clean Goodhart case: more ads raises revenue per query today and reduces queries next quarter, so a system optimized on the short-horizon proxy walks off the end of the range where the proxy tracks value. THE DEFENCE IS THE ONE FROM MODULE 24 — bound the optimization pressure with an ad-load cap selected on a long-horizon holdout, and treat the cap as an owned governance decision rather than a hyperparameter someone can tune in a config file.",
          "deepDive": "Advertiser ROI deserves particular emphasis because it is the guardrail teams most often omit and the one whose failure is slowest and most damaging. An auction that extracts maximum revenue per impression in the short run degrades advertiser returns, and advertisers respond by reducing budgets — an effect with a lag of quarters that no impression-level metric can see. It is a two-sided marketplace, so the health of the supply side is part of the objective even though it appears in none of the model's losses. That is the same structure as creator coverage in the feed case, and both are instances of the general point that a system with two populations needs guardrails for the one that is not the direct user. On measurement: the long-horizon effects here are exactly where module 23's methods earn their keep, since you cannot run a two-year experiment on ad load, and the practical answers are geo-level long-running holdouts and synthetic control on markets — with the honest caveat that the parallel-trends assumption is doing real work and its pre-trend test catches a 12% bias only 18.5% of the time."
        },
        {
          "q": "What is the one thing you would want the interviewer to remember from this case?",
          "a": "ASK WHAT CONSUMES THE NUMBER. That question decides more of this design than any modelling choice, and it generalizes past ads. If a downstream system consumes only the ORDER — a feed, an organic search ranking, a recommendation list — then calibration is optional and any monotone transform is free, which is why temperature scaling is a no-op for those systems. If something consumes the PROBABILITY — an auction price, a cost-based threshold, an expected-value calculation, a cascade decision, an abstention rule — then the probability must be right, and 'right' means right conditional on whatever the consumer conditions on. THE MEASUREMENTS MAKE THE STAKES CONCRETE: uniform pCTR error cost at most 0.1% of revenue because second-price pricing cancels it, and per-ad error cost 4.7%, 14.8% and 36.9% at increasing spread because it reorders the auction. Same model, same aggregate calibration, two completely different consequences depending on the structure of the error and what reads it. THAT IS MODULE 24'S THESIS ARRIVING AS A REVENUE NUMBER: the guarantee 'this model is calibrated' is true over a reference class, and the consumer's reference class is the one that decides whether it matters.",
          "deepDive": "The generalization is worth carrying into every remaining case and into real work. Most systems drift from consuming an order to consuming a probability without anyone re-examining the model — someone wires a threshold to a score, or a downstream service starts multiplying two models' outputs, or a cost calculation appears in a config — and at that moment a model that was fine becomes wrong in a way nothing alerts on. The cheap defence is a written contract for every model output: what it means, what consumes it, and whether it is an ordering or a probability, checked when consumers change. That sounds bureaucratic and is about ten lines in a model card; the alternative is discovering it through a revenue investigation. It is also the reason this lesson sits after the calibration lesson rather than before it — the property was defined there, and here it acquires a price, which is usually what makes an engineering organization act on something."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Feed vs auction, in one line",
        "back": "In a feed only the ORDER matters. In an auction the probability is a PRICE. That single distinction decides the loss function, the metric, and what counts as a bug."
      },
      {
        "type": "formula",
        "front": "Second-price auction",
        "back": "Rank by eᵢ = bᵢ·p̂ᵢ (eCPM); winner pays e₍₂₎/p̂₍₁₎ = b₍₂₎p̂₍₂₎/p̂₍₁₎. The winner's pCTR appears in BOTH the ranking and the price."
      },
      {
        "type": "formula",
        "front": "★ Uniform miscalibration is FREE for pricing",
        "back": "Multipliers 0.5× / 0.8× / 1.25× / 2.0× moved revenue **−0.1% / +0.0% / −0.0% / −0.0%**. The scale cancels in both the ranking and the price. An overconfident pCTR model can run for years unnoticed."
      },
      {
        "type": "formula",
        "front": "★ Heterogeneous miscalibration is not",
        "back": "Per-ad log-normal error: sd 0.25 → **−4.7%**, sd 0.50 → **−14.8%**, sd 1.00 → **−36.9%**. It REORDERS the auction and prices off a wrong estimate."
      },
      {
        "type": "intuition",
        "front": "So what is the ads requirement?",
        "back": "Not \"calibrated\" — **calibrated CONDITIONAL ON THE AD** (advertiser, slot, query segment). A per-slice property. Module 24's reference class, priced."
      },
      {
        "type": "pitfall",
        "front": "Where uniform calibration DOES bite",
        "back": "Eligibility. A reserve price is a threshold on eCPM, so every eCPM moves across it together: 0.5× took fill rate **0.999 → 0.960**. Free for pricing, not for eligibility."
      },
      {
        "type": "intuition",
        "front": "Why hybrid retrieval",
        "back": "Lexical and dense fail on DISJOINT query types — lexical on synonyms/paraphrase, dense on rare exact terms, product IDs, model numbers, typos. The union beats tuning either."
      },
      {
        "type": "definition",
        "front": "The strongest cheap search label",
        "back": "NO REFORMULATION — the user didn't have to ask again. Session-level rather than impression-level, and far better aligned with the goal than a click."
      },
      {
        "type": "pitfall",
        "front": "Query intent variance",
        "back": "Navigational (one right answer at rank 1), informational (coverage/diversity), transactional (freshness/availability). One ranker on aggregate NDCG averages incompatible objectives — route or condition."
      },
      {
        "type": "pitfall",
        "front": "Ad cold start",
        "back": "No history → low pCTR → low eCPM → loses auctions → no history, and the advertiser sees zero delivery. Content features give a prior but don't break the loop. Thompson sampling over the pCTR posterior does."
      },
      {
        "type": "pitfall",
        "front": "★ Why not optimize CTR?",
        "back": "CTR rises both when you show fewer safer ads AND when you show clickbait — it's compatible with a conservative and a degenerate strategy and distinguishes neither. A diagnostic, not an objective."
      },
      {
        "type": "intuition",
        "front": "★ The question that generalizes",
        "back": "ASK WHAT CONSUMES THE NUMBER. Order-only → calibration optional, any monotone transform is free. Probability consumed (price, cost threshold, expected value, cascade, abstention) → it must be right, conditional on what the consumer conditions on."
      }
    ],
    "refs": [
      {
        "title": "McMahan et al. (2013), Ad Click Prediction: a View from the Trenches",
        "url": "https://research.google/pubs/pub41159/"
      },
      {
        "title": "Edelman, Ostrovsky & Schwarz (2007), Internet Advertising and the Generalized Second-Price Auction",
        "url": "https://www.aeaweb.org/articles?id=10.1257/aer.97.1.242"
      },
      {
        "title": "He et al. (2014), Practical Lessons from Predicting Clicks on Ads at Facebook",
        "url": "https://research.facebook.com/publications/practical-lessons-from-predicting-clicks-on-ads-at-facebook/"
      },
      {
        "title": "Karpukhin et al. (2020), Dense Passage Retrieval for Open-Domain Question Answering",
        "url": "https://arxiv.org/abs/2004.04906"
      },
      {
        "title": "Hofmann, Li & Radlinski (2016), Online Evaluation for Information Retrieval",
        "url": "https://www.nowpublishers.com/article/Details/INR-051"
      }
    ],
    "demos": [
      "pagerank",
      "vector-search",
      "calibration",
      "rag-reranker"
    ]
  },
  "design-fraud-llm": {
    "level": "core",
    "body": {
      "intuition": [
        "Two cases in one lesson because they share a structure the previous two do not: THE OPERATING POINT IS SET BY A COST, NOT BY A METRIC. Fraud has an explicit cost asymmetry and a human review queue with finite capacity. An LLM product has a per-request price and a latency budget you can compute. In both, the design question is 'what threshold' and 'what does it cost', and the model is downstream of that.",
        "The fraud arithmetic is brutal and it is the whole case. At a 0.1% base rate, a model at 90% TPR and 1% FPR gives a precision of 0.083 - 92 of every 100 alerts are false, and you generate 10,890 alerts per million transactions to catch 900 frauds. Push FPR to 0.1% and precision reaches 0.445 at 1,799 alerts; push to 0.01% and precision is 0.857 at 700 alerts but you now catch only 600 of the 900. REVIEW CAPACITY, NOT AUC, SETS THE OPERATING POINT.",
        "And the threshold follows from the costs rather than from convention. With a missed fraud costing $500 and a false alert costing $5, you act when the probability exceeds 5/(5+500) = 0.0099, not 0.5. That requires a CALIBRATED probability - so fraud is in the ads camp from the previous lesson, not the feed camp, and asking which camp you are in is the first question."
      ],
      "math": [
        {
          "h": "★ Extreme imbalance makes precision the binding constraint",
          "paras": [
            "At a low base rate, false positives are drawn from a vastly larger pool than true positives, so a small FPR still swamps the alert queue.",
            "Base rate 0.1%. The alert count is what a review team experiences; the AUC is what the model card reports."
          ],
          "tex": "\\begin{array}{rrrrr} \\mathrm{TPR} & \\mathrm{FPR} & \\text{precision} & \\text{alerts/1M} & \\text{frauds caught}\\\\ 0.90 & 0.10 & 0.009 & 100{,}800 & 900\\\\ 0.90 & 0.01 & 0.083 & 10{,}890 & 900\\\\ 0.80 & 0.001 & 0.445 & 1{,}799 & 800\\\\ 0.60 & 0.0001 & \\mathbf{0.857} & \\mathbf{700} & 600 \\end{array}",
          "texNote": "The last row catches two thirds of the frauds of the first row with 0.7% of the alerts. Which row is right is a question about review capacity and the cost of a missed fraud, and it cannot be answered by the model."
        },
        {
          "h": "The threshold is a cost ratio, not a convention",
          "paras": [
            "Act when the expected cost of acting is below the expected cost of not acting. The result depends only on the ratio of the two error costs.",
            "This is the calculation that makes a probability necessary rather than an ordering sufficient."
          ],
          "tex": "\\text{act iff } p\\cdot C_{FN} > (1-p)\\cdot C_{FP} \\iff p > \\frac{C_{FP}}{C_{FP}+C_{FN}} = \\frac{5}{5+500} = 0.0099",
          "texNote": "Not 0.5. And because the rule consumes p as a probability, the model must be calibrated - conditional on whatever the decision conditions on, which for fraud means by merchant, geography, channel and amount band."
        },
        {
          "h": "LLM products: output tokens dominate everything",
          "paras": [
            "Cost is roughly linear in tokens with output priced several times input; latency is dominated by decode, since prefill is parallel and decode is sequential.",
            "At 40 tokens per second of decode, the arithmetic is unforgiving."
          ],
          "tex": "\\text{cost} = \\frac{1200\\cdot\\$3 + 300\\cdot\\$15}{10^6} = \\$0.0081/\\text{req} \\Rightarrow \\$127.7\\text{M/yr at }500\\ \\text{QPS}, \\qquad t_{\\text{decode}} = \\frac{300}{40} = 7.5\\ \\text{s vs prefill } 0.1\\ \\text{s}",
          "texNote": "'Make it faster' means 'make the OUTPUT shorter', not the prompt. Streaming changes perceived latency and not total, which is why time-to-first-token is the metric users feel and the one worth optimizing separately."
        }
      ],
      "code": [
        {
          "h": "The three cost levers, stacked",
          "paras": [
            "Each is independent and multiplicative, and the combination is the difference between a viable product and one that is not."
          ],
          "code": "# baseline: 1200 in + 300 out @ $3/$15 per Mtok, 500 QPS\n#   $0.00810/request  ->  $127.7M/year\n\n#   semantic cache, 40% hit rate        $0.00486   (-40%)\n#   input 1200 -> 400 tok (RETRIEVE,    $0.00570   (-30%)\n#     don't dump the whole document)\n#   + route 80% to a 10x cheaper model  $0.00160   (-80%)\n#   ------------------------------------------------------\n#   stacked                             $127.7M -> $25.2M/year\n\n# ★ Routing is the biggest single lever and the most commonly omitted in a\n#   design round: most requests in most products are easy, and a cascade with\n#   an escalation rule captures that. It is the model-cascade pattern from\n#   the serving material, applied to model SIZE rather than to funnel depth.",
          "caption": "None of these levers is a model change. That is the point - the LLM design round is mostly a systems round wearing a model's clothes."
        },
        {
          "h": "Fraud: what makes it different from every other classifier",
          "paras": [
            "The adversary adapts, which breaks the assumption every other case in this module relies on."
          ],
          "code": "# 1 THE LABEL IS DELAYED AND CENSORED\n#   chargebacks arrive in 30-90 days; blocked transactions have NO label\n#   (you never learn if they were fraud) -> selection on the outcome,\n#   which is module 23's collider. Keep a small RANDOM allow-through slice\n#   or your labels only describe transactions you approved.\n\n# 2 THE ADVERSARY ADAPTS\n#   concept shift is DELIBERATE and continuous. Module 24's result applies:\n#   no unlabelled monitor sees it - accuracy fell to 0.3375 there with every\n#   input statistic at control. A labelled sample is the only detector.\n\n# 3 THE COSTS ARE ASYMMETRIC AND KNOWN\n#   which is unusual and good: it means the threshold is DERIVABLE\n#   ($5 vs $500 -> act above 0.0099) rather than chosen.\n\n# 4 REVIEW CAPACITY IS A HARD CONSTRAINT\n#   the operating point is 'how many alerts can 40 analysts clear per day',\n#   and the model's job is to maximise caught fraud within that budget.",
          "caption": "Item 1 is the one candidates miss: blocking a transaction destroys the label, so an aggressive model degrades its own training data over time."
        }
      ],
      "useCases": [
        "Fraud, abuse, spam, AML and content-policy enforcement - any rare-event detection with a human review queue and an adapting adversary.",
        "Any classifier whose output feeds a cost-based decision, where the threshold is derivable from two numbers and is almost never 0.5.",
        "LLM product design rounds, where the differentiating content is cost, latency, routing and evaluation rather than prompt engineering.",
        "Capacity planning for a review or moderation team, where the alert volume implied by an operating point is the number that decides headcount."
      ],
      "pitfalls": [
        "Reporting AUC for a rare-event problem. At a 0.1% base rate, a 1% FPR gives precision 0.083 - 92 of every 100 alerts are false, and the AUC can look excellent throughout.",
        "Using 0.5 as a threshold. With $500 and $5 error costs the correct threshold is 0.0099, and the difference is two orders of magnitude.",
        "Forgetting that a cost-based threshold needs a calibrated probability, conditional on whatever the decision conditions on - merchant, geography, channel, amount band.",
        "Ignoring label censoring. Blocked transactions never get a label, so an aggressive model degrades its own training data - selection on the outcome, the collider from module 23.",
        "Assuming drift detection will catch an adapting adversary. Concept shift is invisible to every unlabelled monitor, and in module 24's measurement accuracy fell to 0.3375 with all input statistics at control.",
        "Designing an LLM product without the cost arithmetic. At 500 QPS a 1200-in, 300-out request is $127.7M a year, and routing alone takes it to a fifth of that.",
        "Optimizing prompt length for latency. Decode dominates - 300 output tokens is 7.5 s against 0.1 s of prefill - so 'make it faster' means 'make the output shorter'."
      ],
      "connections": [
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "The modelling substance under the fraud half - resampling, class weights, and why the metric choice matters more than any of them at a 0.1% base rate."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "Why an adapting adversary is the worst case: concept shift with the input distribution unchanged, which no unlabelled monitor detects."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "An alternative to a threshold - route to review when the prediction set is not a singleton, which turns the coverage parameter into a queue-volume decision."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "The evaluation half of the LLM case, and why the scorer is the eval - the number you report is a property of the judge as much as of the model."
        },
        {
          "ref": "rag-agents/guardrails",
          "text": "The safety layer for an LLM product, and the reason its own false-negative rate is the number that decides whether it is doing anything."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ At a 0.1% base rate, what does a 1% FPR give you?",
          "a": "Precision **0.083** — 92 of every 100 alerts are false. 10,890 alerts per million to catch 900 frauds."
        },
        {
          "q": "What sets the operating point?",
          "a": "Review capacity, not AUC. 'How many alerts can 40 analysts clear per day' is the constraint the model works within."
        },
        {
          "q": "Give the precision/volume trade.",
          "a": "TPR 0.90/FPR 0.01 → 0.083 precision, 10,890 alerts, 900 caught. TPR 0.60/FPR 0.0001 → **0.857** precision, **700** alerts, 600 caught."
        },
        {
          "q": "★ Derive the decision threshold.",
          "a": "Act iff p·C_FN > (1−p)·C_FP, i.e. p > C_FP/(C_FP+C_FN). At $5 vs $500: **p > 0.0099**, not 0.5."
        },
        {
          "q": "What does that require of the model?",
          "a": "A CALIBRATED probability, conditional on whatever the decision conditions on — merchant, geography, channel, amount band. Fraud is in the ads camp, not the feed camp."
        },
        {
          "q": "What is the label problem in fraud?",
          "a": "Delayed (chargebacks 30–90 days) AND censored: blocked transactions never get a label. Selection on the outcome — module 23's collider."
        },
        {
          "q": "So what do you do about censoring?",
          "a": "Keep a small RANDOM allow-through slice. Otherwise your labels only describe transactions you approved, and an aggressive model degrades its own training data."
        },
        {
          "q": "Why is an adapting adversary the worst case?",
          "a": "Concept shift is deliberate and continuous, and module 24 showed no unlabelled monitor sees it — accuracy fell to 0.3375 with every input statistic at control."
        },
        {
          "q": "Give the LLM cost arithmetic.",
          "a": "1200 in + 300 out at $3/$15 per Mtok = **$0.0081/request** → **$127.7M/year** at 500 QPS."
        },
        {
          "q": "The three cost levers?",
          "a": "Semantic cache at 40% hit (−40%), input 1200→400 tokens by retrieving rather than dumping (−30%), routing 80% to a 10× cheaper model (−80%). Stacked: $127.7M → **$25.2M**."
        },
        {
          "q": "What dominates LLM latency?",
          "a": "Decode. 300 output tokens at ~40 tok/s = **7.5 s**, against ~0.1 s of prefill for 1200 input tokens."
        },
        {
          "q": "So how do you make it faster?",
          "a": "Make the OUTPUT shorter — not the prompt. Streaming changes perceived latency, not total, so TTFT is the metric users feel."
        }
      ],
      "standard": [
        {
          "q": "Design a fraud detection system.",
          "a": "CLARIFY FIRST, AND THE CLARIFYING QUESTIONS ARE THE DESIGN: what is the base rate, what does a missed fraud cost, what does a false alert cost, and how many alerts can the review team clear per day. Those four numbers determine the operating point before any model exists. FRAME: a per-transaction probability feeding a cost-based decision — block, review, or allow — which means this is a calibrated-probability problem, not a ranking problem. THE ARITHMETIC IS THE CASE. At a 0.1% base rate, a model at 90% TPR and 1% FPR has precision 0.083: 10,890 alerts per million transactions to catch 900 frauds, so 92 of every 100 alerts are false. Tightening to 0.1% FPR gives precision 0.445 at 1,799 alerts and 800 caught; to 0.01% FPR gives precision 0.857 at 700 alerts and 600 caught. THE LAST ROW CATCHES TWO THIRDS OF THE FRAUD OF THE FIRST WITH 0.7% OF THE ALERTS, and which row is right is a capacity and cost question the model cannot answer. THE THRESHOLD IS THEN DERIVED, not chosen: act when p exceeds C_FP/(C_FP + C_FN), which at $5 and $500 is 0.0099 rather than 0.5. LABELS: chargebacks arrive in 30 to 90 days, and blocked transactions never get one at all.",
          "deepDive": "That last point is the one candidates miss and it is the most interesting part of the case. Blocking a transaction destroys its label — you never learn whether it was fraud — so the training data describes only transactions you approved, which is selection on the outcome and precisely module 23's collider. An aggressive model therefore degrades its own training data over time, and the degradation is invisible because the metrics computed on approved transactions look fine. The fix is a small random allow-through slice: deliberately approve a tiny fraction of transactions the model would have blocked, accept the fraud loss, and get unbiased labels. That is expensive in a way you can quantify — the slice's fraud rate times its volume times the average loss — and it is the only source of unbiased data about the region the model is most confident about. It is the same argument as the recommender's exploration slice and the experimentation module's permanent holdout, arriving for the third time, which is a good sign it is a general principle rather than a domain quirk."
        },
        {
          "q": "How do you choose the operating point, and how would you explain it to a non-technical stakeholder?",
          "a": "I WOULD NOT PRESENT A THRESHOLD — I WOULD PRESENT A TABLE WITH THREE COLUMNS THEY CARE ABOUT: alerts per day, frauds caught, and dollars. At a 0.1% base rate and a million transactions, the options run from 10,890 alerts catching 900 frauds, to 1,799 alerts catching 800, to 700 alerts catching 600. Multiply by the cost of a missed fraud and by the cost of an analyst-hour and each row becomes a net dollar figure, and the decision becomes obvious to someone with no interest in precision or recall. THE THRESHOLD ITSELF IS DERIVABLE once the two costs are stated: act when p exceeds C_FP/(C_FP + C_FN), which is 0.0099 at $5 and $500 — and showing that it is not 0.5 is usually the moment the conversation becomes productive, because it reveals that the default was arbitrary. I WOULD ALSO SEPARATE THE THREE ACTIONS. Block, review and allow are different decisions with different costs, so there are two thresholds rather than one, and the review band exists precisely because its cost is intermediate. Sizing that band to the review team's capacity is the actual design decision, and conformal prediction is a clean way to do it — route to review when the prediction set is not a singleton, which turns the coverage parameter directly into a queue volume.",
          "deepDive": "The stakeholder conversation has a predictable failure worth pre-empting: they will ask for both fewer false alerts and more fraud caught, and the honest answer is that those trade against each other along a curve you can show them, and the only way to move the curve rather than slide along it is a better model or better features. Having the curve in the room converts an argument into a choice. The second thing worth raising unprompted is that the costs themselves are estimates and usually contested — the cost of a false alert includes analyst time and customer friction, and the friction cost is real, hard to measure and frequently much larger than the analyst cost. Doing sensitivity analysis on the threshold with respect to that number, in the module 23 style, is cheap and it shows where the recommendation is fragile. If the optimal threshold barely moves as the friction cost ranges over an order of magnitude, the recommendation is robust and you can say so; if it moves a lot, then measuring friction is the highest-value next piece of work, which is a much better output than a threshold nobody trusts."
        },
        {
          "q": "What makes fraud different from the other design cases?",
          "a": "THE ADVERSARY ADAPTS, WHICH BREAKS THE ASSUMPTION EVERY OTHER CASE RELIES ON. A recommender's users do not change their preferences to defeat the ranker; fraudsters change their behaviour specifically because the model exists, so concept shift is deliberate, continuous and targeted at whatever the model currently uses. THAT IS THE WORST CASE FROM MODULE 24: P(y|x) moves while P(x) can stay put, and no unlabelled monitor detects it — in that measurement accuracy fell to 0.3375 while mean confidence, prediction rate, the score distribution and a domain classifier all sat at control values. So the only detector is labels, and labels are delayed by 30 to 90 days, which means you learn about an attack after it has run for a quarter. THE DESIGN CONSEQUENCES ARE CONCRETE. Retrain frequently and automatically, because the half-life of a feature's usefulness is short. Prefer features that are expensive for the adversary to change — device fingerprints, account age, network structure — over features that are cheap to change, because a model leaning on cheap features is defeated by editing a field. Keep an ensemble of diverse models so the adversary must defeat several mechanisms. And instrument for fast detection: a small fast-label channel, such as customer-reported fraud, beats waiting for chargebacks.",
          "deepDive": "The feature-cost point is the one with the most practical bite and it generalizes to abuse and spam. Every feature has an adversarial cost — how much effort it takes to change — and a model's robustness is roughly the cost of the cheapest sufficient path to a false negative, which is the same logic as the threat-model discussion in module 24 with money instead of a norm ball. That reframes feature engineering: a feature that adds two points of AUC and costs the attacker nothing is worse than one that adds one point and costs them a new device. It also argues against interpretable-by-default models in this specific domain, since an adversary who learns the rule defeats it, which is an uncomfortable exception to the usual preference and worth naming honestly rather than eliding. The other structural point is that fraud is a two-sided cost problem — blocking a legitimate customer has a churn cost that is much larger and slower than the analyst cost — so the guardrail tier needs a false-positive-driven churn metric measured on a holdout, and that metric is the one that gets ignored until it is large."
        },
        {
          "q": "Design an LLM-powered product feature. What actually matters?",
          "a": "THE ROUND IS MOSTLY A SYSTEMS ROUND, AND THE DIFFERENTIATING CONTENT IS COST, LATENCY, ROUTING AND EVALUATION — not prompting. START WITH THE ARITHMETIC. A request with 1,200 input and 300 output tokens at $3 and $15 per million costs $0.0081, which at 500 QPS is $127.7 million a year. That number changes the conversation immediately, and the levers are all systems levers: a semantic cache at a 40% hit rate takes it down 40%; cutting input from 1,200 to 400 tokens by retrieving rather than dumping the whole document takes 30%; and routing 80% of traffic to a model ten times cheaper takes 80%. Stacked, $127.7M becomes $25.2M. ROUTING IS THE BIGGEST SINGLE LEVER and the most commonly omitted, because most requests in most products are easy and a cascade with an explicit escalation rule captures that. THEN LATENCY, where the key fact is that decode dominates: 300 output tokens at 40 tokens per second is 7.5 seconds against roughly 0.1 seconds of prefill for 1,200 input tokens. So 'make it faster' means 'make the OUTPUT shorter', and streaming changes perceived latency rather than total, which makes time-to-first-token a separate metric worth optimizing on its own.",
          "deepDive": "Evaluation is where I would spend the remaining time, because it is the part most likely to be missing and the part that determines whether you can ship a second version. The LLM-systems material's result applies directly: the scorer is the eval, and identical outputs scored by different rubrics produced wildly different numbers, so the eval design is a bigger decision than the model choice. Practically that means a fixed rubric written before the model exists, a held-out set the optimizer never sees, and measurement of the judge's own agreement with humans on a sample — because a model judge inherits length and position biases that swap-averaging partially corrects. The guardrail layer needs the same treatment: a guardrail's own false-negative rate is the number that decides whether it does anything, and it is routinely unmeasured. And the module 24 framing applies to the whole product — a red-team pass produces a findings list whose value depends on coverage, and 'we tested it' is a statement about the attacks you ran. Saying that in a design round is rare and it is the difference between someone who has shipped an LLM feature and someone who has prototyped one."
        },
        {
          "q": "How would you evaluate and monitor an LLM feature in production?",
          "a": "THREE LAYERS, AND THE FIRST IS THE ONE THAT DECIDES EVERYTHING. OFFLINE: a fixed rubric written before the model exists, a held-out set the optimizer never sees, and a measured agreement rate between the judge and humans on a sample — because the scorer is the eval, and a number produced by an unvalidated judge is a property of the judge. I would also rotate the held-out set, since running it after every checkpoint and selecting on it is selection even without training on it. ONLINE: the metrics users generate for free — edit rate, regeneration rate, abandonment, escalation to a human, thumbs-down — which are weak labels arriving continuously and are usually the earliest real signal of degradation. Plus explicit cost and latency SLOs, since both drift as prompts grow and models change under you. SAFETY: a guardrail layer with its OWN measured false-negative rate, plus continuous red-teaming reported with a coverage estimate rather than a findings list. AND A LABELLED SAMPLE, because module 24's result stands here too — no unlabelled monitor detects a quality regression that leaves the input distribution unchanged, and provider model updates do exactly that.",
          "deepDive": "That last point deserves emphasis because it is specific to building on someone else's model and it surprises teams. A provider silently updating a model version is a concept shift with the input distribution completely unchanged — your prompts are identical, your traffic is identical, and P(output | input) has moved. Every unlabelled monitor stays green by construction, and the first signal is usually a user complaint. The defences are pinning to a versioned model where the provider offers it, keeping a small golden set evaluated on a schedule regardless of whether anything changed, and treating any provider version bump as a deploy requiring the same evaluation as your own change. The cost of the golden set is small and it is the only thing that catches this class of failure early. The broader habit, which is the whole of module 24 compressed: decide in advance which failures you could detect with the monitoring you have, notice which ones you could not, and either buy the information or write down that you have accepted the exposure."
        },
        {
          "q": "What do these two cases have in common that the earlier ones do not?",
          "a": "THE OPERATING POINT IS SET BY A COST RATHER THAN BY A METRIC, AND IN BOTH THE COST IS COMPUTABLE. In the feed and search cases the design question was 'what should be ranked first', and the metric was a proxy for value with a long and uncertain path to money. Here the path is short: a missed fraud costs $500 and an alert costs $5, so the threshold is 0.0099; an LLM request costs $0.0081 and 500 QPS is $127.7 million a year, so routing is not an optimization but the product's viability. THAT CHANGES WHAT A GOOD ANSWER LOOKS LIKE — it should contain a number with a dollar sign early, and the model choice should be visibly downstream of it. BOTH ALSO CONSUME A PROBABILITY RATHER THAN AN ORDERING, which puts them in the ads camp from the previous lesson: fraud's threshold is a cost ratio and an LLM cascade's escalation rule is a confidence threshold, so both need calibration conditional on whatever the decision conditions on. AND BOTH HAVE AN ADVERSARIAL OR SHIFTING COMPONENT that the earlier cases lack, which is why both need a labelled monitoring channel rather than an input-distribution dashboard.",
          "deepDive": "The generalization worth carrying is a three-question triage that covers every design case in this module. First: does anything consume the probability, or only the order? That decides whether calibration is a requirement or an optional nicety, and it was worth 4.7% to 36.9% of revenue in the ads case. Second: where does the label come from, how delayed is it, and is it censored by the system's own actions? That was the feed's position bias, the ads cold-start trap, and fraud's blocked-transaction problem — the same structure three times, and each time the answer was a randomized slice logged at serving time. Third: what does an error cost, in each direction? That gives you the threshold, the guardrails and the stakeholder conversation, and in fraud it moved the threshold by two orders of magnitude from the default. Those three questions take under a minute and they locate the hard part of essentially any applied ML system, which is the most portable thing in this module."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Rare-event arithmetic (base rate 0.1%)",
        "back": "TPR 0.90/FPR 0.01 → precision **0.083**, 10,890 alerts/1M, 900 caught. TPR 0.60/FPR 0.0001 → precision **0.857**, **700** alerts, 600 caught. Two-thirds the fraud for 0.7% of the alerts."
      },
      {
        "type": "intuition",
        "front": "What sets the operating point?",
        "back": "Review capacity and the cost asymmetry — not AUC. \"How many alerts can 40 analysts clear per day\" is the constraint; the model maximizes caught fraud within it."
      },
      {
        "type": "formula",
        "front": "★ The threshold is a cost ratio",
        "back": "Act iff p·C_FN > (1−p)·C_FP ⟺ p > C_FP/(C_FP+C_FN). At $5 vs $500: **p > 0.0099**, not 0.5. Two orders of magnitude from the default."
      },
      {
        "type": "pitfall",
        "front": "★ Fraud's label is delayed AND censored",
        "back": "Chargebacks take 30–90 days, and BLOCKED transactions never get a label at all. Selection on the outcome — module 23's collider — so an aggressive model degrades its own training data invisibly."
      },
      {
        "type": "intuition",
        "front": "The fix for censoring",
        "back": "A small RANDOM allow-through slice: deliberately approve a tiny fraction the model would block, accept the loss, get unbiased labels. Third appearance of the randomized-slice argument in this module."
      },
      {
        "type": "pitfall",
        "front": "Why an adapting adversary is the worst case",
        "back": "Concept shift, deliberate and continuous, aimed at whatever the model currently uses. Module 24: no unlabelled monitor sees it (accuracy 0.3375, every input statistic at control). Labels are the only detector — and they're 30–90 days late."
      },
      {
        "type": "intuition",
        "front": "Feature choice under an adversary",
        "back": "Every feature has an ADVERSARIAL COST. Robustness ≈ the cost of the cheapest sufficient path to a false negative. A +2 AUC feature that's free to change is worse than a +1 that costs them a new device."
      },
      {
        "type": "formula",
        "front": "★ LLM product cost",
        "back": "1200 in + 300 out at $3/$15 per Mtok = **$0.0081/request** → **$127.7M/year** at 500 QPS. Put a dollar sign in the answer early; the model choice is downstream of it."
      },
      {
        "type": "formula",
        "front": "The three cost levers, stacked",
        "back": "Semantic cache @40% hit (−40%) · input 1200→400 tok by RETRIEVING not dumping (−30%) · route 80% to a 10× cheaper model (−80%). $127.7M → **$25.2M**. Routing is the biggest and most often omitted."
      },
      {
        "type": "intuition",
        "front": "★ What dominates LLM latency",
        "back": "DECODE. 300 output tokens at ~40 tok/s = **7.5 s**; prefill of 1200 input tokens ≈ **0.1 s**. \"Make it faster\" = make the OUTPUT shorter. Streaming moves perceived latency only — TTFT is what users feel."
      },
      {
        "type": "pitfall",
        "front": "The silent provider update",
        "back": "A provider changing model versions is concept shift with your inputs IDENTICAL. Every unlabelled monitor stays green by construction. Defences: pin versions, a golden set on a schedule, treat a version bump as a deploy."
      },
      {
        "type": "intuition",
        "front": "★ The three-question triage for any design case",
        "back": "(1) Does anything consume the PROBABILITY or only the order? (2) Where does the label come from, how delayed, and is it CENSORED by the system's own actions? (3) What does an error cost in each direction? Under a minute; finds the hard part every time."
      }
    ],
    "refs": [
      {
        "title": "Dal Pozzolo, Caelen, Le Borgne, Waterschoot & Bontempi (2014), Learned Lessons in Credit Card Fraud Detection",
        "url": "https://www.sciencedirect.com/science/article/abs/pii/S0957417414002619"
      },
      {
        "title": "Elkan (2001), The Foundations of Cost-Sensitive Learning",
        "url": "https://cseweb.ucsd.edu/~elkan/rescale.pdf"
      },
      {
        "title": "Saito & Rehmsmeier (2015), The Precision-Recall Plot Is More Informative than the ROC Plot on Imbalanced Datasets",
        "url": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0118432"
      },
      {
        "title": "Chen et al. (2023), FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance",
        "url": "https://arxiv.org/abs/2305.05176"
      },
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for Large Language Model Serving with PagedAttention",
        "url": "https://arxiv.org/abs/2309.06180"
      }
    ],
    "demos": [
      "classification-metrics",
      "roc",
      "conformal",
      "guardrails"
    ]
  },
  "coding-patterns": {
    "level": "core",
    "body": {
      "intuition": [
        "The ML coding round is not a LeetCode round with a numpy accent. It asks whether you can implement a small piece of ML correctly, reason about its cost, and notice when the obvious implementation will not fit in memory. The recurring test is whether you know the difference between a slow implementation and an IMPOSSIBLE one.",
        "The canonical example is pairwise distances. The broadcast form, subtracting an (N,1,D) from a (1,M,D), is the one everybody writes first and it allocates an intermediate of N x M x D - for 2,000 by 2,000 by 64 that is 2.05 GB. The Gram-matrix form computes the same thing in 32 MB, sixty-four times less, and ran 42.6x faster. THE FLOP COUNT IS IDENTICAL; the win is entirely memory, and saying that is the answer the question is looking for.",
        "The rest of the round rewards the same instinct. Vectorizing an elementwise product was 43x a Python loop. Taking the top 10 of a million values with argpartition rather than a full argsort was 7.3x, because it is O(n) rather than O(n log n). None of this is clever - it is knowing three or four patterns well enough to reach for them without thinking, which is exactly the variance reduction this module keeps arguing for."
      ],
      "math": [
        {
          "h": "★ The Gram-matrix identity",
          "paras": [
            "Expanding the squared norm turns a three-dimensional broadcast into two vector norms and one matrix product, which BLAS executes at full speed with no large intermediate.",
            "Know this one cold. It underlies k-NN, k-means, kernel methods, and every retrieval implementation."
          ],
          "tex": "\\|x_i-y_j\\|^2 = \\|x_i\\|^2 + \\|y_j\\|^2 - 2\\,x_i^\\top y_j \\;\\Rightarrow\\; D = \\mathbf{1}\\|X\\|^2_{\\text{row}} + \\|Y\\|^2_{\\text{row}}\\mathbf{1}^\\top - 2XY^\\top",
          "texNote": "Measured at N=M=2000, D=64: broadcast 1,162 ms and 2.05 GB of intermediate; Gram form 27 ms and 32 MB. Same FLOPs, 64x less memory, 42.6x faster because it is one GEMM instead of a strided reduction over a huge array."
        },
        {
          "h": "Selection beats sorting when you only need the top k",
          "paras": [
            "A full sort orders everything; you need the boundary. Introselect gives the k largest in linear expected time.",
            "The same distinction recurs as heap-based top-k in a streaming setting."
          ],
          "tex": "\\text{argsort}: O(n\\log n) \\quad\\text{vs}\\quad \\text{argpartition}: O(n) \\;\\Rightarrow\\; 67.4\\ \\text{ms} \\to 9.3\\ \\text{ms}\\ (7.3\\times)\\ \\text{at } n=10^6,\\ k=10",
          "texNote": "Note argpartition does not order the k it returns, so if you need them sorted you sort k elements afterwards - which is O(k log k) and free at k = 10."
        },
        {
          "h": "Why complexity answers need the n",
          "paras": [
            "The gap between n log n and n squared is not a constant factor, and the size of the gap is the thing to quote."
          ],
          "tex": "\\begin{array}{lrr} n & n\\log_2 n & n^2/(n\\log_2 n)\\\\ 10^3 & 9{,}966 & 100\\times\\\\ 10^4 & 132{,}877 & 753\\times\\\\ 10^6 & 19{,}931{,}569 & \\mathbf{50{,}172\\times} \\end{array}",
          "texNote": "'It is quadratic but n is small' is a valid argument that requires you to state n. At n = 1,000 the penalty is 100x and often survivable; at a million it is fifty thousand and never is."
        }
      ],
      "code": [
        {
          "h": "The patterns worth having automatic",
          "paras": [
            "Not an exhaustive list - the four or five that come up repeatedly and that separate a fluent answer from a laboured one."
          ],
          "code": "# 1 PAIRWISE DISTANCES via the Gram trick  (2.05 GB -> 32 MB)\nD2 = (X**2).sum(1)[:,None] + (Y**2).sum(1)[None,:] - 2*X@Y.T\n\n# 2 TOP-K without sorting                  (67 ms -> 9 ms at n=1e6)\nidx = np.argpartition(-v, k)[:k]; idx = idx[np.argsort(-v[idx])]\n\n# 3 STABLE SOFTMAX / LOGSUMEXP - subtract the max, always\nE = np.exp(Z - Z.max(1, keepdims=True)); P = E / E.sum(1, keepdims=True)\n\n# 4 GROUPED AGGREGATION without a Python loop\nsums = np.bincount(group_id, weights=values, minlength=G)\ncounts = np.bincount(group_id, minlength=G)\nmeans = sums / np.maximum(counts, 1)\n\n# 5 ONE-PASS STREAMING STATS (Welford) - when the data does not fit\n#   n += 1; d = x - mean; mean += d/n; M2 += d*(x - mean)\n\n# ★ In all five the question behind the question is: what does this\n#   ALLOCATE, and does it fit?",
          "caption": "Write the obvious version, say what it allocates, then improve it. Doing that out loud is worth more than producing the fast version silently."
        },
        {
          "h": "How to behave in the round",
          "paras": [
            "The behaviours are worth more than the algorithms, because they are what the interviewer can actually score."
          ],
          "code": "# STATE THE SIGNATURE AND THE COMPLEXITY BEFORE WRITING\n#   'this is O(nd) time and O(n) extra space' - if it is wrong you find\n#   out in ten seconds instead of ten minutes\n\n# TEST ON A CASE YOU CAN VERIFY BY HAND, out loud, before being asked\n#   n=1, empty input, all-equal values, a 2x2 you can compute mentally\n\n# NARRATE THE TRADE, don't just take it\n#   'I'll use a dict for O(1) lookup, costing O(n) memory - fine at this n'\n\n# SAY THE NUMERICAL ISSUE WHEN IT EXISTS\n#   exp overflow, log(0), catastrophic cancellation in a naive variance,\n#   division by a count that can be zero\n\n# ★ THE MOST COMMON FAILURE IS SILENCE. A correct solution produced\n#   without narration is a low-signal answer, which is exactly the\n#   high-variance presentation from lesson 25-01.",
          "caption": "Every one of these is legibility rather than skill, which is why practising them changes outcomes faster than more problems does."
        }
      ],
      "useCases": [
        "The ML coding round itself, where implementing k-NN, k-means, a softmax, an attention head or a metric from scratch is the standard prompt.",
        "Real work, where the difference between a 2 GB intermediate and a 32 MB one is the difference between a job that runs and one that is killed.",
        "Reviewing someone else's numerical code, where 'what does this allocate' finds most of the problems in one question.",
        "Take-home exercises, where the same patterns plus a test file and a README are most of what distinguishes a strong submission."
      ],
      "pitfalls": [
        "Writing the broadcast form of pairwise distances at scale. It allocated 2.05 GB against 32 MB for the Gram form - the FLOPs are identical and the memory is not.",
        "Full-sorting to get a top-k. argpartition was 7.3x faster at n = 1e6 and the difference is asymptotic, not constant.",
        "Computing a softmax without subtracting the max. It overflows for logits above about 710 in float64 and about 88 in float32, and it is the single most common numerical bug in an ML coding round.",
        "Quoting a complexity without the n. The n log n versus n squared gap is 100x at a thousand and 50,172x at a million, so 'quadratic but small' needs the number.",
        "Looping in Python over rows of an array. The elementwise product alone was 43x slower, and the gap widens with the work done per element.",
        "Coding in silence. A correct answer with no narration is a low-signal answer, and this round is scored on reasoning you make audible.",
        "Not testing the edge cases unprompted. n = 1, empty input and all-equal values catch most implementation bugs and take fifteen seconds each."
      ],
      "connections": [
        {
          "ref": "foundations/advanced-numpy-pytorch",
          "text": "The substance underneath - broadcasting rules, strides, views versus copies - which is what makes the memory question answerable."
        },
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "Where the 43x and the memory-layout effects come from, and why a strided reduction loses to a GEMM even at equal FLOPs."
        },
        {
          "ref": "interview-capstone/cs-algorithms",
          "text": "The other coding round, where the data structures rather than the array operations are the subject."
        },
        {
          "ref": "unsupervised-learning/kmeans",
          "text": "The most common from-scratch prompt, and the one where the Gram trick is the difference between a toy and something that runs."
        },
        {
          "ref": "interview-capstone/interview-landscape",
          "text": "Why narration matters here specifically: this is a round whose variance is reduced almost entirely by making your reasoning audible."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ Write pairwise squared distances without a big intermediate.",
          "a": "‖x−y‖² = ‖x‖² + ‖y‖² − 2xᵀy → D = (X²).sum(1)[:,None] + (Y²).sum(1)[None,:] − 2X@Yᵀ."
        },
        {
          "q": "Why is that better?",
          "a": "MEMORY, not FLOPs. At N=M=2000, D=64: broadcast allocates **2.05 GB**, the Gram form **32 MB** — 64× less — and ran **42.6× faster** (one GEMM vs a strided reduction)."
        },
        {
          "q": "Top-10 of a million values?",
          "a": "np.argpartition(−v, k)[:k], then sort those k. O(n) vs O(n log n) — **67.4 ms → 9.3 ms**, 7.3×."
        },
        {
          "q": "Why sort afterwards?",
          "a": "argpartition doesn't order the k it returns. Sorting k elements is O(k log k) — free at k=10."
        },
        {
          "q": "Stable softmax?",
          "a": "Subtract the row max before exponentiating: E = exp(Z − Z.max(1, keepdims=True)); P = E/E.sum(1, keepdims=True)."
        },
        {
          "q": "Where does the naive version break?",
          "a": "exp overflows above ~710 in float64 and ~88 in float32. The most common numerical bug in an ML coding round."
        },
        {
          "q": "Grouped aggregation without a loop?",
          "a": "np.bincount(group_id, weights=values, minlength=G) over np.bincount(group_id, minlength=G), guarding the zero counts."
        },
        {
          "q": "Streaming mean and variance?",
          "a": "Welford: n += 1; d = x − mean; mean += d/n; M2 += d·(x − mean). One pass, numerically stable, no catastrophic cancellation."
        },
        {
          "q": "How much does vectorizing buy?",
          "a": "43× for a bare elementwise product over 200k elements — and the gap widens with the work done per element."
        },
        {
          "q": "Quote the n log n vs n² gap.",
          "a": "100× at n=10³, 753× at 10⁴, **50,172× at 10⁶**. \"Quadratic but n is small\" is valid and requires you to state n."
        },
        {
          "q": "What should you say before writing any code?",
          "a": "The signature and the complexity. If it's wrong you find out in ten seconds rather than ten minutes."
        },
        {
          "q": "★ What's the most common failure in this round?",
          "a": "Silence. A correct solution produced without narration is a low-signal answer — lesson 25-01's high-variance presentation."
        }
      ],
      "standard": [
        {
          "q": "Implement k-nearest-neighbours efficiently and talk me through the choices.",
          "a": "I'D STATE THE SIGNATURE AND COMPLEXITY FIRST — given a query matrix X of shape (N, D) and a reference set Y of shape (M, D), returning the k nearest for each query is O(NMD) time and the memory depends entirely on how I compute the distances. THEN THE DISTANCE MATRIX, which is the whole question. The obvious form subtracts an (N,1,D) array from a (1,M,D) array and reduces over the last axis, which allocates an N×M×D intermediate — at N=M=2000 and D=64 that is 2.05 GB, and it will be killed on most machines. The Gram form uses ‖x−y‖² = ‖x‖² + ‖y‖² − 2xᵀy, so it is two row-norm vectors plus one matrix product, allocating only the N×M output at 32 MB. Sixty-four times less memory, and 42.6× faster in wall clock, because one GEMM runs at BLAS speed while a strided reduction over a huge array is memory-bound. THE FLOP COUNTS ARE IDENTICAL, which is the point worth saying out loud. THEN THE SELECTION: I want the k smallest per row, so argpartition rather than a full sort — O(n) versus O(n log n), measured at 7.3× for k=10 over a million — then sort the k returned indices, which is free.",
          "deepDive": "Two caveats I'd volunteer. First, the Gram form is less numerically stable: it computes a difference of large similar numbers, so for high-dimensional or large-magnitude data the result can be slightly negative where it should be zero, and clipping at zero before any square root is standard practice. That is a real trade and worth naming rather than presenting the trick as free. Second, at genuinely large M the exact computation is the wrong algorithm entirely and the answer is approximate nearest neighbours — HNSW or IVF-PQ — which trades a small recall loss for orders of magnitude in latency, and which connects to the retrieval ceiling from the recommender case: your system's recall is bounded by the ANN's recall, so that parameter is a system-level decision rather than a library default. Mentioning both shows the difference between someone who has implemented k-NN and someone who has deployed retrieval, and it costs two sentences."
        },
        {
          "q": "What distinguishes a strong ML coding round from an adequate one?",
          "a": "FOUR BEHAVIOURS, AND NONE OF THEM IS KNOWING A CLEVERER ALGORITHM. FIRST, STATING THE SIGNATURE AND COMPLEXITY BEFORE WRITING — it takes ten seconds, it surfaces a misunderstanding immediately, and it gives the interviewer something to score early. SECOND, NAMING WHAT THE CODE ALLOCATES. The question behind most ML coding prompts is whether you can tell a slow implementation from an impossible one, and 2.05 GB versus 32 MB for the same FLOPs is the canonical instance. THIRD, TESTING UNPROMPTED on cases you can verify by hand: n=1, empty input, all-equal values, a 2×2 you can compute mentally. Most implementation bugs die there and it takes fifteen seconds each. FOURTH, SAYING THE NUMERICAL ISSUE WHERE ONE EXISTS — exp overflow above roughly 88 in float32, log of zero, catastrophic cancellation in a naive variance, division by a count that can be zero. AND UNDERPINNING ALL FOUR, NARRATION. This round's variance is reduced almost entirely by making reasoning audible, and a correct solution produced in silence is a low-signal answer, which is exactly the failure mode lesson 25-01 measured.",
          "deepDive": "It is worth being explicit about the sequencing that works best under time pressure: write the obvious correct version first, say what is wrong with it, then improve it. Candidates who try to produce the optimized version immediately often produce neither, and they lose the chance to demonstrate that they knew the trade-off existed. Saying 'here's the readable version, it allocates N×M×D which is 2 GB at this scale, let me rewrite it with the Gram identity' is strictly better than silently writing the Gram version, because the interviewer cannot see reasoning you did not perform out loud — and it protects you if the optimization has a bug, since the working version is already on the board. The same sequencing applies to tests: writing one before optimizing means the optimization is checked, which is both good practice and visible good practice. This is the same principle as the design round's skeleton, and it is the module's thesis in yet another costume: the interviewer is a low-bandwidth channel and your job is to transmit structure."
        },
        {
          "q": "When is a Python loop acceptable, and when is it a bug?",
          "a": "IT IS ACCEPTABLE WHEN THE LOOP COUNT IS SMALL AND THE WORK PER ITERATION IS LARGE, and it is a bug when either is reversed. A bare elementwise product over 200,000 elements was 43× slower as a Python loop than in numpy, and that gap comes almost entirely from interpreter overhead per element — so the more trivial the per-element work, the worse the loop is. Conversely, a loop over ten shards each doing a large matrix multiply costs nothing, because the overhead is amortized over real work. THE PRACTICAL RULE I'D STATE is to loop over the SMALL axis and vectorize the large one — over epochs, over batches, over folds, over shards — and never over rows of a data matrix. THE OTHER LEGITIMATE USE is when vectorizing would blow up memory, which is precisely the pairwise-distance case in reverse: if the vectorized form allocates an intermediate that does not fit, then chunking with a loop over blocks is the correct answer, and it is a deliberate trade rather than a failure to vectorize. Saying 'I'll chunk this to bound peak memory at X' is a strong signal, because it shows you are optimizing the constraint that actually binds.",
          "deepDive": "The chunking pattern is worth knowing concretely because it comes up constantly in real work and occasionally in interviews: process the query set in blocks of B rows, compute the B×M distance block, take the top-k within the block, and merge. Peak memory becomes B×M rather than N×M, which turns an impossible computation into a tunable one, and B becomes a knob trading memory for loop overhead. That is the same structure as batching in the serving arithmetic from the design lessons — trade latency or overhead for a memory bound — and recognizing it as the same pattern is the kind of transfer these rounds reward. There is one more case where a loop is right and it is easy to forget: when the operation is genuinely sequential, such as a recurrence or an iterative solver, vectorizing across the sequential axis is not possible and the honest answer is to say so rather than to contort the code. Knowing which axis is parallel is most of numerical programming."
        },
        {
          "q": "What would you do differently for a take-home rather than a live round?",
          "a": "THE CONSTRAINT CHANGES FROM TIME TO SIGNAL, so the deliverable changes. In a live round the interviewer sees your reasoning, so the code can be sparse and the narration carries it. In a take-home nobody watches, so THE WRITING IS THE ONLY CHANNEL and the code alone is a low-signal artifact. What I'd add: a short README stating the problem as I understood it, the assumptions I made, what I would do with more time, and the results with numbers. A test file, even a small one, because it demonstrates the habit and it is the most commonly missing item. Clean structure — separate data loading, modelling and evaluation — because a single notebook is hard to review. And a HONEST LIMITATIONS SECTION, which is the highest-signal paragraph in most submissions and is almost always absent. WHAT I'D AVOID is over-engineering. A take-home graded on a two-hour brief and submitted with a Docker setup, a config framework and three model classes reads as poor judgement about scope, not as thoroughness. The strongest submissions are usually a simple baseline done carefully with the evaluation taken seriously.",
          "deepDive": "The evaluation section is where take-homes are actually won and lost, and it maps directly onto the curriculum. A submission that reports a single accuracy number is weaker than one that reports a metric chosen for a stated reason, a confidence interval or at least a variance estimate across folds, a baseline to compare against, and a per-segment breakdown. That is module 24's reference-class discipline applied to a two-hour exercise, and it costs almost nothing extra. The corresponding trap is data leakage, which is the most common silent failure in take-homes: scaling or imputing before the split, using future information in a time-series feature, or tuning on the test set. Stating explicitly how you avoided leakage is worth a paragraph, because a reviewer's first suspicion of a surprisingly good number is that it leaked. And if the result is unimpressive, say so plainly with the diagnosis — a submission that reports a modest number honestly and explains why beats one that reports a suspiciously good one with no interrogation."
        },
        {
          "q": "Which from-scratch implementations should you be able to write cold?",
          "a": "A SHORT LIST, AND IT IS SHORTER THAN PEOPLE EXPECT. K-MEANS, because it exercises the Gram trick, argmin over a distance matrix, and grouped aggregation via bincount — three of the five core patterns in one problem. K-NN for the same reason plus top-k selection. A SOFTMAX AND CROSS-ENTROPY with the max subtraction, because the numerical issue is the point of asking. LINEAR AND LOGISTIC REGRESSION WITH GRADIENT DESCENT, which is the derivation lesson made executable and where the analytic gradient Xᵀ(prediction − target)/n should be automatic. A SINGLE ATTENTION HEAD, which is scaled dot product, a mask, a stable softmax and one more matmul — and is now as common a prompt as k-means. AND THE METRICS: precision, recall, AUC by rank, and a calibration binning, because candidates who use library functions daily are frequently unable to write them, and being asked is a deliberate probe. THE COMMON THREAD is that each is short enough to finish under pressure and long enough to expose whether you understand what you normally import.",
          "deepDive": "The metric implementations deserve emphasis because they are the most under-practised and the most revealing. Writing AUC from scratch forces you to state what it means — the probability a random positive outranks a random negative — and the rank-based implementation follows immediately from that, which is a much better answer than a Riemann sum over an ROC curve. Similarly, writing an ECE binning forces you to confront the free bin-count parameter that module 24 measured moving the number from 0.0091 to 0.0183, which turns a rote exercise into a place to demonstrate judgement. The general point is that these prompts are not testing whether you can produce twenty lines of numpy; they are testing whether the definition is in your head or only the import. Preparing them is fast — an afternoon covers the whole list — and it is unusually high-return because the same definitions are what the breadth and depth rounds probe from a different direction."
        },
        {
          "q": "How does this round fit the module's thesis?",
          "a": "IT IS THE ROUND WHERE THE THESIS IS EASIEST TO ACT ON AND MOST OFTEN IGNORED. The measurable content is small — five patterns, a handful of numbers like 43×, 7.3×, 2.05 GB versus 32 MB — and it can be made automatic in a few sessions. What actually decides the round is whether the interviewer can HEAR the reasoning: the signature and complexity stated first, the allocation named, the edge cases tested unprompted, the numerical issue flagged. Those are pure variance reduction, exactly as lesson 25-01 modelled it, and they are worth more than another twenty practice problems for anyone already competent. AND THE HONEST CONDITION FROM THAT LESSON CARRIES HERE TOO: narration amplifies with the sign of your level. Narrating a wrong approach clearly makes the wrongness clearer, which is why the patterns have to be genuinely automatic before the legibility work pays. THE ORDER IS THEREFORE: get the five patterns cold, then practise saying them out loud on a timer, and not the reverse.",
          "deepDive": "There is a specific and common failure this framing explains. Strong engineers sometimes interview badly in coding rounds not because they cannot solve the problem but because they solve it in their heads and then type the answer, which transmits almost nothing and reads as either luck or memorization. The fix is mechanical and slightly uncomfortable: practise with someone listening, or record yourself, and check whether a listener could follow the reasoning without seeing the screen. That is a different exercise from solving more problems, and it is the one that moves the outcome for candidates who are already competent — which is the same conclusion the design-round lesson reached, arrived at from a different direction. It is also the reason mock interviews outperform solo practice by more than their content justifies: what they are really training is the transmission, and transmission is the part that the measurement in lesson 25-01 says decides loops you should have won."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The Gram-matrix identity",
        "back": "‖x−y‖² = ‖x‖² + ‖y‖² − 2xᵀy → D = (X²).sum(1)[:,None] + (Y²).sum(1)[None,:] − 2X@Yᵀ. Underlies k-NN, k-means, kernels and every retrieval implementation."
      },
      {
        "type": "intuition",
        "front": "★ Why the Gram trick wins",
        "back": "MEMORY, not FLOPs — the FLOP counts are identical. At N=M=2000, D=64: broadcast **2.05 GB** vs **32 MB** (64× less), and **42.6× faster** because one GEMM beats a strided reduction over a huge array."
      },
      {
        "type": "pitfall",
        "front": "The Gram trick's cost",
        "back": "Less numerically stable — a difference of large similar numbers, so results can come out slightly NEGATIVE where they should be zero. Clip at zero before any square root."
      },
      {
        "type": "formula",
        "front": "Top-k without sorting",
        "back": "np.argpartition(−v, k)[:k], then sort those k. O(n) vs O(n log n): **67.4 ms → 9.3 ms** (7.3×) at n=10⁶. argpartition doesn't order its k — sorting k is O(k log k), free."
      },
      {
        "type": "pitfall",
        "front": "Stable softmax",
        "back": "Subtract the row max BEFORE exponentiating. Naive exp overflows above ~710 (float64) and ~**88** (float32) — the single most common numerical bug in an ML coding round."
      },
      {
        "type": "formula",
        "front": "Grouped aggregation, no loop",
        "back": "sums = bincount(gid, weights=vals, minlength=G); counts = bincount(gid, minlength=G); means = sums/max(counts,1). Guard the zero counts."
      },
      {
        "type": "formula",
        "front": "Welford streaming stats",
        "back": "n += 1; d = x − mean; mean += d/n; M2 += d·(x − mean). One pass, stable, no catastrophic cancellation from the naive E[x²]−E[x]² form."
      },
      {
        "type": "intuition",
        "front": "When is a Python loop acceptable?",
        "back": "Small loop count, large work per iteration. Loop over epochs/batches/folds/shards; NEVER over rows of a data matrix (43× penalty on a bare product). Also fine when vectorizing would blow memory — then CHUNK deliberately."
      },
      {
        "type": "formula",
        "front": "Quote the complexity gap",
        "back": "n² / (n log₂ n): **100×** at n=10³, 753× at 10⁴, **50,172×** at 10⁶. \"Quadratic but n is small\" is a valid argument that requires you to state n."
      },
      {
        "type": "intuition",
        "front": "The four behaviours that decide the round",
        "back": "State signature + complexity BEFORE writing · name what it ALLOCATES · test n=1/empty/all-equal unprompted · flag the numerical issue. All legibility, not skill."
      },
      {
        "type": "intuition",
        "front": "The sequencing that works under pressure",
        "back": "Write the obvious correct version → say what's wrong with it → improve it. Silently writing the optimized version transmits nothing and leaves you with no working code if it breaks."
      },
      {
        "type": "intuition",
        "front": "★ The from-scratch list",
        "back": "k-means · k-NN · softmax+cross-entropy · linear/logistic with GD · one attention head · the METRICS (precision, recall, AUC by rank, ECE binning). An afternoon covers it — and the metrics are the most revealing."
      }
    ],
    "refs": [
      {
        "title": "NumPy Documentation, Broadcasting",
        "url": "https://numpy.org/doc/stable/user/basics.broadcasting.html"
      },
      {
        "title": "Welford (1962), Note on a Method for Calculating Corrected Sums of Squares and Products",
        "url": "https://www.tandfonline.com/doi/abs/10.1080/00401706.1962.10490022"
      },
      {
        "title": "Goldberg (1991), What Every Computer Scientist Should Know About Floating-Point Arithmetic",
        "url": "https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html"
      },
      {
        "title": "Malkov & Yashunin (2018), Efficient and Robust Approximate Nearest Neighbor Search Using HNSW",
        "url": "https://arxiv.org/abs/1603.09320"
      },
      {
        "title": "VanderPlas, Python Data Science Handbook - Computation on NumPy Arrays",
        "url": "https://jakevdp.github.io/PythonDataScienceHandbook/02.03-computation-on-arrays-ufuncs.html"
      }
    ],
    "demos": [
      "reservoir-sampling",
      "count-min-sketch",
      "bloom-filter",
      "knn"
    ]
  },
  "cs-algorithms": {
    "level": "core",
    "body": {
      "intuition": [
        "ML roles still ask classical algorithms, and the set that actually appears is small - perhaps eight patterns. The useful reframing is that most of them show up INSIDE ML systems, so learning them as interview trivia wastes the transfer: a beam search is a heap, a tokenizer is a trie or a greedy longest-match, an ANN index is a graph search, and a training data dedupe is a hash set with a similarity twist.",
        "The quantitative point is why complexity answers need the n attached. The ratio of n squared to n log n is 100x at a thousand, 753x at ten thousand, and 50,172x at a million. 'It is quadratic but n is small' is a legitimate argument and it is only legitimate once you say what n is - which is the same discipline as naming the reference class in module 24, applied to a runtime claim.",
        "The behaviour that decides this round is the same as the last: state the approach and its complexity BEFORE writing, test on a case you can verify by hand, and say the trade you are taking. A correct solution produced in silence is a low-signal answer, and this is the round where silence is most tempting because the problems feel like puzzles with a right answer."
      ],
      "math": [
        {
          "h": "★ Why the n matters more than the exponent",
          "paras": [
            "The gap between quadratic and linearithmic is not a constant factor you can engineer away; it grows without bound and it grows fast.",
            "Quote the ratio, not the symbol - it converts an abstract objection into a decision."
          ],
          "tex": "\\begin{array}{lrrr} n & n\\log_2 n & n^2 & \\text{ratio}\\\\ 10^3 & 9{,}966 & 10^6 & 100\\times\\\\ 10^4 & 132{,}877 & 10^8 & 753\\times\\\\ 10^5 & 1{,}660{,}964 & 10^{10} & 6{,}021\\times\\\\ 10^6 & 19{,}931{,}569 & 10^{12} & \\mathbf{50{,}172\\times} \\end{array}",
          "texNote": "At a thousand, a quadratic algorithm is often the right engineering call - simpler, fewer bugs, 100x of nothing is still nothing. At a million it is never the right call, and the number is what makes the distinction sayable."
        },
        {
          "h": "The complexities worth having automatic",
          "paras": [
            "Not to recite, but so that you can state a bound in ten seconds and be right, which is the behaviour being scored."
          ],
          "tex": "\\text{hash } O(1)^* \\ \\cdot\\ \\text{heap push/pop } O(\\log n) \\ \\cdot\\ \\text{sort } O(n\\log n) \\ \\cdot\\ \\text{BFS/DFS } O(V{+}E) \\ \\cdot\\ \\text{Dijkstra } O(E\\log V) \\ \\cdot\\ \\text{edit distance } O(nm)",
          "texNote": "The asterisk on hash matters: O(1) is amortized and expected, and the worst case is O(n) under adversarial keys - which is a real consideration in any system where an attacker controls the input, and is worth a sentence when it applies."
        },
        {
          "h": "The eight patterns that cover most prompts",
          "paras": [
            "Grouped by the recognition cue rather than by the data structure, because recognizing which one applies is the hard part under time pressure."
          ],
          "tex": "\\text{hashing} \\cdot \\text{two pointers / sliding window} \\cdot \\text{heap for top-}k \\cdot \\text{binary search on the ANSWER} \\cdot \\text{BFS/DFS} \\cdot \\text{Dijkstra/A*} \\cdot \\text{DP on a grid} \\cdot \\text{intervals via sorting}",
          "texNote": "Binary search on the answer is the least obvious and the most reusable: when a feasibility check is cheap and monotone in a parameter, search the parameter rather than the data. It turns many optimization prompts into O(n log range)."
        }
      ],
      "code": [
        {
          "h": "★ Where each one lives inside an ML system",
          "paras": [
            "Learning them with the ML use attached both fixes them in memory and gives you a better answer when asked."
          ],
          "code": "# HASH SET / MAP        exact dedupe of training data; vocabulary lookup;\n#                       feature hashing (the trick, not the structure)\n# HEAP                  top-k retrieval; BEAM SEARCH is a heap per step;\n#                       streaming top-k over a firehose\n# TRIE / longest-match  tokenizers - WordPiece is greedy longest-match over\n#                       a vocabulary; prefix autocomplete\n# BFS / DFS             graph feature extraction; connected components for\n#                       entity resolution; dependency order in a pipeline DAG\n# DIJKSTRA / A*         routing; ★ HNSW's search is a greedy best-first walk\n#                       over a proximity graph - an ANN index IS graph search\n# DP ON A GRID          edit distance for fuzzy matching and dedupe; DTW for\n#                       time series; Viterbi is DP over a trellis\n# SORTING + INTERVALS   session windowing; NMS in detection is sort-by-score\n#                       then greedy suppression\n# BINARY SEARCH ON THE  finding a threshold that hits a target alert volume;\n#   ANSWER              quantile-based capacity planning\n\n# ★ 'This is the same search HNSW does' is a better answer than a correct\n#   implementation with no context, and it costs one sentence.",
          "caption": "Every row is a real ML use, which is why this round is less disconnected from the job than it feels."
        },
        {
          "h": "The recognition cues",
          "paras": [
            "Under time pressure the bottleneck is identifying the pattern, not implementing it. These are the tells."
          ],
          "code": "# 'find a pair/triple summing to X'      -> hash set, or sort + two pointers\n# 'longest/shortest contiguous ...'      -> sliding window\n# 'k largest / k closest / merge k ...'  -> heap\n# 'minimum X such that P(X) holds'       -> binary search on the answer\n#   (works iff P is MONOTONE in X - say that out loud)\n# 'shortest path, unweighted'            -> BFS   (weighted -> Dijkstra)\n# 'count ways / min cost over a grid'    -> DP, and state the recurrence\n#   before writing any code\n# 'overlapping ranges / scheduling'      -> sort by start or end, sweep\n\n# ★ SAY THE CUE. 'The phrase minimum-such-that with a monotone check means\n#   binary search on the answer' is worth more than silently doing it,\n#   because it shows a transferable rule rather than a memorized solution.",
          "caption": "Naming the cue is what converts a solved problem into evidence that you will solve the next one."
        }
      ],
      "useCases": [
        "The algorithms round in an ML interview loop, which is common at large companies and where the set of prompts is narrow.",
        "Recognizing that an ML component is a classical algorithm - beam search as a heap, HNSW as graph search, NMS as sort-and-sweep - which makes both easier to reason about.",
        "Capacity and threshold problems in real systems, where binary search on the answer turns 'what threshold gives 700 alerts a day' into three lines.",
        "Reviewing a pipeline for accidental quadratic behaviour, where the ratio table is what turns a code-review comment into an argument."
      ],
      "pitfalls": [
        "Quoting a complexity without the n. The quadratic-to-linearithmic ratio is 100x at a thousand and 50,172x at a million, so the same objection is minor or fatal depending on a number you must state.",
        "Treating hash operations as unconditionally O(1). It is amortized and expected, with an O(n) adversarial worst case, which matters wherever an attacker controls the keys.",
        "Optimizing before a correct solution exists. In a timed round a working quadratic answer with a stated improvement beats an unfinished optimal one.",
        "Writing DP code before stating the recurrence. The recurrence is the answer; the code is transcription, and getting them in the wrong order produces most DP failures.",
        "Missing that binary search applies. The cue is 'minimum X such that P(X)' with P monotone, and it is the least recognized of the eight patterns.",
        "Learning these as interview trivia. Most appear inside ML systems, and the transfer is lost if you never connect beam search to a heap or an ANN index to graph search.",
        "Solving in silence. This is the round where silence is most tempting because the problems feel like puzzles, and it is where a correct answer transmits the least."
      ],
      "connections": [
        {
          "ref": "foundations/complexity",
          "text": "The substance - asymptotic analysis, amortization, and why the constant factors sometimes dominate at realistic n."
        },
        {
          "ref": "interview-capstone/coding-patterns",
          "text": "The numerical sibling of this round, where the constraint is memory and vectorization rather than data structures."
        },
        {
          "ref": "rag-agents/embeddings-vector-stores",
          "text": "HNSW as a greedy best-first walk over a proximity graph, which is the clearest case of a classical algorithm living inside an ML system."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "Beam search as a heap per decoding step, and the memory arithmetic that decides how wide a beam you can afford."
        },
        {
          "ref": "rnn-nlp/tokenization",
          "text": "Greedy longest-match over a vocabulary, which is a trie problem wearing an NLP label."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ Why must a complexity answer include n?",
          "a": "n²/(n log₂ n) is **100×** at 10³, 753× at 10⁴, 6,021× at 10⁵ and **50,172×** at 10⁶. \"Quadratic but small\" is valid only once you state the number."
        },
        {
          "q": "Is a hash lookup O(1)?",
          "a": "Amortized and expected. Worst case is O(n) under adversarial keys — which matters wherever an attacker controls the input."
        },
        {
          "q": "Name the eight patterns.",
          "a": "Hashing · two pointers/sliding window · heap for top-k · binary search on the ANSWER · BFS/DFS · Dijkstra/A* · DP on a grid · intervals via sorting."
        },
        {
          "q": "Which is least recognized?",
          "a": "Binary search on the answer. Cue: \"minimum X such that P(X)\" with P monotone in X. Turns many optimization prompts into O(n log range)."
        },
        {
          "q": "Cue for a sliding window?",
          "a": "\"Longest/shortest contiguous …\" — a contiguous subarray or substring with a constraint."
        },
        {
          "q": "Cue for a heap?",
          "a": "\"k largest / k closest / merge k sorted …\". In ML: top-k retrieval and beam search, which is a heap per decoding step."
        },
        {
          "q": "Where does graph search live in ML?",
          "a": "HNSW — an ANN index search IS a greedy best-first walk over a proximity graph. Saying so is a better answer than a correct implementation with no context."
        },
        {
          "q": "Where does DP on a grid live in ML?",
          "a": "Edit distance for fuzzy matching and dedupe; DTW for time series; Viterbi as DP over a trellis."
        },
        {
          "q": "Where does sort-and-sweep live in ML?",
          "a": "Non-maximum suppression in detection — sort by score, then greedily suppress overlaps. Also session windowing."
        },
        {
          "q": "What do you do before writing DP code?",
          "a": "State the recurrence. The recurrence IS the answer; the code is transcription, and reversing the order produces most DP failures."
        },
        {
          "q": "Optimal or finished?",
          "a": "Finished. In a timed round a working quadratic solution with a stated improvement beats an unfinished optimal one."
        },
        {
          "q": "What's the round's characteristic failure?",
          "a": "Silence — most tempting here because the problems feel like puzzles with a right answer, and most costly because a correct answer alone transmits little."
        }
      ],
      "standard": [
        {
          "q": "How would you prepare for the algorithms round as an ML candidate?",
          "a": "BY LEARNING A SMALL SET WITH THE ML USE ATTACHED, because that both fixes them in memory and produces a better answer. The set is about eight patterns: hashing, two pointers and sliding window, a heap for top-k, binary search on the answer, BFS and DFS, Dijkstra and A*, DP on a grid, and intervals via sorting. THE ML MAPPING IS REAL AND WORTH KNOWING: a hash set is training-data dedupe and vocabulary lookup; a heap is top-k retrieval and beam search, which is literally a heap per decoding step; a trie with greedy longest-match is what WordPiece tokenization does; BFS and DFS are connected components for entity resolution and dependency order in a pipeline DAG; HNSW's search is a greedy best-first walk over a proximity graph, so an ANN index IS graph search; edit distance is fuzzy matching and dedupe, and Viterbi is DP over a trellis; non-maximum suppression is sort by score then sweep. SAYING THE CONNECTION IS WORTH MORE THAN THE IMPLEMENTATION — 'this is the same search HNSW does' costs one sentence and demonstrates transfer, which is what the round is actually probing. AND I'D PRACTISE THE RECOGNITION rather than the coding, because under time pressure identifying the pattern is the bottleneck, not typing it.",
          "deepDive": "The recognition cues are worth memorizing as phrases because they are what fires under pressure: 'find a pair summing to X' means a hash set or sort-plus-two-pointers; 'longest contiguous' means sliding window; 'k largest or merge k' means a heap; 'minimum X such that P(X)' with monotone P means binary search on the answer; 'shortest path unweighted' means BFS and weighted means Dijkstra; 'count ways or minimum cost over a grid' means DP and you state the recurrence first; 'overlapping ranges' means sort and sweep. Saying the cue out loud — 'the phrase minimum-such-that with a monotone check means I should binary search the answer' — is strictly better than silently applying it, because it demonstrates a transferable rule rather than a memorized solution, and it gives the interviewer something to score in the first thirty seconds. That is lesson 25-01's variance argument again: the fastest thing you can do in any round is make your reasoning audible early, and a named cue is the cheapest way to do it."
        },
        {
          "q": "When is a quadratic algorithm the right answer?",
          "a": "WHEN THE n IS SMALL AND YOU CAN SAY WHAT IT IS. The ratio of n squared to n log n is 100× at a thousand, 753× at ten thousand, 6,021× at a hundred thousand and 50,172× at a million. At a thousand, a quadratic solution is frequently the correct engineering call: it is simpler, has fewer edge cases, is easier to review, and a hundred times a negligible number is still negligible. At a million it is never right. SO THE ANSWER 'IT IS QUADRATIC BUT n IS SMALL' IS LEGITIMATE AND INCOMPLETE UNTIL YOU STATE n, which is the same discipline as naming a reference class in module 24 — a claim about performance is meaningless without the population it applies to. IN AN INTERVIEW I'd give the quadratic solution when it is what I can complete correctly, state its complexity and the improvement I would make, and let the interviewer decide whether to spend the time. A finished correct answer with a stated path to better beats an unfinished optimal one in almost every case, and the exceptions are rounds explicitly framed as optimization problems. THE THING THAT LOSES THE ROUND is producing a quadratic solution without noticing, because that is a claim about your judgement rather than about your time budget.",
          "deepDive": "There is a real-systems version of this that comes up in review and is worth having: accidental quadratic behaviour hidden inside library calls. A loop doing a list membership test is quadratic; repeated string concatenation in a loop is quadratic; a pandas apply that does a lookup against another frame per row is quadratic; and each looks linear on the page. The tell is a nested cost where only one loop is visible, and the diagnostic is to ask what the inner operation costs rather than counting visible loops. At the n these pipelines run at — often a million rows — the 50,172× figure is what turns a five-second job into a week, which is why 'it worked on the sample' is such a reliable precursor to an incident. Quoting the ratio in a code review converts a stylistic objection into an argument with a number, and that is usually what makes it actionable. It is the same move as naming the cost in a design round: the number is what turns a preference into a decision."
        },
        {
          "q": "Explain binary search on the answer and why it is underused.",
          "a": "IT APPLIES WHEN YOU WANT THE SMALLEST OR LARGEST PARAMETER SATISFYING A CONDITION, THE CONDITION IS CHEAP TO CHECK, AND IT IS MONOTONE IN THE PARAMETER. Instead of searching the data you search the PARAMETER SPACE: pick a candidate value, run the feasibility check, and halve the range. The cost becomes O(check × log range), which is usually a large improvement over anything that enumerates. IT IS UNDERUSED BECAUSE THE CUE IS SUBTLE — the problem does not look like a search problem, it looks like an optimization problem, and the phrase to listen for is 'minimum X such that' or 'maximum X such that'. MONOTONICITY IS THE CONDITION TO STATE OUT LOUD, because it is what makes the method valid and it is where the approach fails: if the feasibility check is not monotone in the parameter, halving is unjustified and you will confidently return a wrong answer. THE ML USES ARE COMMON AND CONCRETE: finding the score threshold that yields a target alert volume, which is exactly the fraud case's capacity constraint; finding the k for a quantile under a memory budget; and calibrating any cutoff to hit a target rate when the rate is monotone in the cutoff.",
          "deepDive": "The alert-threshold use is worth walking because it connects two lessons. In the fraud design case the operating point was set by review capacity — 'how many alerts can 40 analysts clear per day' — and the model produces a score, so the question is which threshold yields that volume. Alert volume is monotone decreasing in the threshold, so binary search over the threshold with a feasibility check that counts alerts on a held-out sample solves it in about twenty iterations regardless of data size, and it generalizes immediately to 'what threshold hits this precision' or 'this recall'. That is a three-line function that replaces a manual sweep, and it is the kind of thing that comes up in real work far more often than in interviews. The general habit worth extracting is to notice when a problem has a monotone knob, because a monotone knob is always searchable and often the entire solution — the same structure appears in the alpha-spending boundaries from module 23 and the coverage parameter in conformal prediction, where you are choosing a parameter to hit a target rate."
        },
        {
          "q": "You are asked a problem you do not recognize. What do you do?",
          "a": "WORK THE EXAMPLE BY HAND FIRST, OUT LOUD, BEFORE TRYING TO CLASSIFY IT. Take a small concrete input, produce the correct output manually, and narrate what you did — because whatever procedure you used by hand is usually a sketch of the algorithm, and it gives the interviewer something to follow while you think. THEN STATE THE BRUTE FORCE and its complexity, which guarantees you have a correct answer on the board and establishes the baseline any improvement is measured against. THEN LOOK FOR THE CUE among the eight patterns: is there a monotone parameter, is there a contiguous-subarray structure, is there repeated work between overlapping subproblems, is there a graph hiding in the relations. THEN NAME THE CONSTRAINT that makes the brute force too slow, because the improvement almost always attacks a specific redundancy — recomputing a window sum, re-sorting, re-exploring a state. WHAT I WOULD NOT DO is sit silently pattern-matching, which is the failure this module keeps returning to: it produces no signal for the interviewer, and it feels much longer to them than to you.",
          "deepDive": "The by-hand step is more useful than it sounds and it is worth being deliberate about. When you compute a small case manually you naturally exploit structure — you skip states you know are dominated, you reuse a partial sum, you notice the answer only depends on the last two values — and each of those is the seed of the optimization. Saying 'when I did this by hand I never needed to look further back than two steps' is how a DP recurrence gets discovered in an interview, and it is a much more convincing answer than producing the recurrence from memory, because it demonstrates the derivation rather than the recall. It also handles the genuinely novel problem, which memorization cannot. The related habit is to ask a clarifying question about the input size early, because the target complexity is usually implied by it: n up to a million rules out anything quadratic and points at sorting or hashing, while n up to a few hundred permits DP over pairs. Reading the constraint as a hint is standard practice and candidates often ignore the number entirely."
        },
        {
          "q": "How much should an ML candidate invest in this round?",
          "a": "ENOUGH TO BE RELIABLE, AND LESS THAN MOST CANDIDATES DO — because it is the round with the most available practice material and the least room for differentiation. The set is eight patterns; the prompts at ML roles are usually easier than at pure software roles; and the marginal return falls off quickly once you can recognize the cues and implement them without fumbling. FROM LESSON 25-01, THE ALLOCATION SHOULD FOLLOW CONTROLLABLE VARIANCE, and this round has less of it than system design or the project deep-dive, both of which are chronically underprepared. So my ordering would be: get to reliable here, then spend the remaining time on design cases and on writing up your projects, which is where the same hours move the outcome more. THE EXCEPTION IS IF THIS ROUND IS WHERE YOU ARE FAILING, which is diagnosable from the shape of your outcomes — consistent early-round rejections point at fundamentals rather than at presentation. And the honest condition from 25-01 applies here as everywhere: none of this substitutes for being able to do the work, it just stops you losing loops you should have won.",
          "deepDive": "There is a specific efficiency worth naming. Because the eight patterns map onto ML components — heap to beam search, graph search to HNSW, DP to Viterbi and edit distance, sort-and-sweep to NMS — you can prepare this round and the breadth round with the same hours by learning each pattern together with where it lives in a system. That halves the cost of both and produces better answers in each, since the algorithm answer gains context and the ML answer gains mechanism. It is the same argument module 22 made about learning mechanisms rather than APIs: the durable unit is the pattern, and the surface it appears on is incidental. Practically, an afternoon per pattern with one implementation and one ML connection covers the whole set in about a week of evenings, which is a bounded and finishable plan — and finishable matters, because the failure mode in preparation is an unbounded problem list that never converges and crowds out the rounds with more variance to reduce."
        },
        {
          "q": "What is the honest role of this round in an ML loop?",
          "a": "IT IS A FLOOR CHECK, NOT A DIFFERENTIATOR, AND TREATING IT AS EITHER EXTREME IS A MISTAKE. It exists because writing correct code under mild pressure is genuinely necessary for the job, and because it is the cheapest reliable filter a company has — the prompts are standardized, the scoring is comparatively objective, and the inter-interviewer variance is lower than for design rounds, which is exactly why loops keep it. THAT LOW VARIANCE IS ALSO WHY IT DIFFERENTIATES LESS: from lesson 25-01, the rounds where structure pays are the high-variance ones, and this is the round where a correct answer looks the same from most interviewers. SO THE STRATEGY IS ASYMMETRIC — failing it is disqualifying and excelling at it buys little, which means the right target is reliable rather than exceptional. THE COMMON MISTAKE IN BOTH DIRECTIONS is dismissing it as irrelevant to ML work, which is wrong on the merits since these patterns are inside the systems, or over-investing hundreds of hours in it while never rehearsing a design case aloud. The second is more common among strong ML candidates and is the more expensive error.",
          "deepDive": "It is worth noting what the round genuinely fails to measure, since that is the fair version of the criticism. It does not measure whether you can scope an ambiguous problem, choose a metric, own a decision under uncertainty, or notice that a label is confounded — all of which are larger parts of the job and are what the design and project rounds exist for. It also has a known adverse-selection problem: it rewards recent practice, so it systematically favours candidates who have interviewed lately over those who have been shipping, which is a real bias rather than a signal. Knowing that is useful for interpreting your own results — a rejection at this round after two years of production work is weak evidence about your engineering and strong evidence that you did not practise. The remedy is bounded and known, which makes it one of the few interview problems with a clean solution, and that is the most useful thing to take from the round: it is the part of the process most responsive to a week of deliberate preparation."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Why a complexity claim needs n",
        "back": "n²/(n log₂ n): **100×** at 10³ · 753× at 10⁴ · 6,021× at 10⁵ · **50,172×** at 10⁶. Quadratic is often right at a thousand and never right at a million."
      },
      {
        "type": "definition",
        "front": "The eight patterns",
        "back": "Hashing · two pointers/sliding window · heap for top-k · **binary search on the ANSWER** · BFS/DFS · Dijkstra/A* · DP on a grid · intervals via sorting."
      },
      {
        "type": "intuition",
        "front": "★ Where each lives inside ML",
        "back": "Heap → beam search (a heap per step) · trie/longest-match → WordPiece · graph search → **HNSW is greedy best-first over a proximity graph** · DP → edit distance, DTW, Viterbi · sort+sweep → NMS."
      },
      {
        "type": "definition",
        "front": "Binary search on the answer",
        "back": "Smallest/largest parameter satisfying a cheap, MONOTONE feasibility check. Search the PARAMETER, not the data: O(check × log range). State the monotonicity out loud — it's what makes it valid."
      },
      {
        "type": "intuition",
        "front": "Its best ML use",
        "back": "Find the score threshold hitting a target alert volume (the fraud case's capacity constraint) — volume is monotone in threshold, so ~20 iterations regardless of data size. Three lines replacing a manual sweep."
      },
      {
        "type": "definition",
        "front": "The recognition cues",
        "back": "\"pair summing to X\" → hash/two pointers · \"longest contiguous\" → sliding window · \"k largest / merge k\" → heap · \"minimum X such that\" → binary search · \"count ways over a grid\" → DP (state the recurrence FIRST)."
      },
      {
        "type": "pitfall",
        "front": "Is a hash lookup O(1)?",
        "back": "Amortized and EXPECTED. Worst case O(n) under adversarial keys — a real consideration anywhere an attacker controls the input."
      },
      {
        "type": "pitfall",
        "front": "Accidental quadratic behaviour",
        "back": "`x in list` in a loop · repeated string concatenation · a pandas apply doing a per-row lookup. Only ONE loop is visible. Ask what the INNER operation costs, don't count loops."
      },
      {
        "type": "intuition",
        "front": "Unrecognized problem — what first?",
        "back": "Work a small example BY HAND, out loud. Whatever you did manually is a sketch of the algorithm (\"I never looked back more than two steps\" → the DP recurrence). Then brute force + complexity, then look for the cue."
      },
      {
        "type": "intuition",
        "front": "Read the constraint as a hint",
        "back": "n up to 10⁶ rules out quadratic → sorting or hashing. n up to a few hundred permits DP over pairs. The stated input size implies the target complexity, and candidates routinely ignore it."
      },
      {
        "type": "intuition",
        "front": "Optimal or finished?",
        "back": "FINISHED. A working quadratic answer with a stated improvement beats an unfinished optimal one. What loses the round is producing a quadratic solution without NOTICING — that's a judgement claim, not a time-budget one."
      },
      {
        "type": "intuition",
        "front": "★ This round's honest role",
        "back": "A FLOOR CHECK, not a differentiator — low interviewer variance, so structure pays less here than in design. Failing is disqualifying, excelling buys little. Target reliable, then spend the hours on design and project write-ups."
      }
    ],
    "refs": [
      {
        "title": "Cormen, Leiserson, Rivest & Stein, Introduction to Algorithms (4th ed.)",
        "url": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"
      },
      {
        "title": "Sedgewick & Wayne, Algorithms (4th ed.)",
        "url": "https://algs4.cs.princeton.edu/home/"
      },
      {
        "title": "Malkov & Yashunin (2018), Efficient and Robust Approximate Nearest Neighbor Search Using HNSW",
        "url": "https://arxiv.org/abs/1603.09320"
      },
      {
        "title": "Crosby & Wallach (2003), Denial of Service via Algorithmic Complexity Attacks",
        "url": "https://www.usenix.org/legacy/events/sec03/tech/full_papers/crosby/crosby.pdf"
      },
      {
        "title": "Skiena, The Algorithm Design Manual (3rd ed.)",
        "url": "https://www.algorist.com/"
      }
    ],
    "demos": [
      "bfs-dfs-astar",
      "dijkstra",
      "edit-distance",
      "knapsack"
    ]
  },
  "breadth-rapid-fire": {
    "level": "intro",
    "body": {
      "intuition": [
        "The breadth round is testing one thing: have you USED this, or only read about it. The reliable tell is whether you can name a failure mode. Anyone can define regularization; someone who has shipped it says which regularizer they reached for, what it did to the coefficients, and when it made things worse.",
        "So the answer template is three beats and it fits in forty seconds. WHAT IT IS in one sentence, WHEN IT BREAKS with a specific condition, and A NUMBER if you have one. The third beat is what this curriculum uniquely supplies - twenty-four modules of measured results that turn a definition into evidence.",
        "The numbers are the point of this lesson. 'Temperature scaling fixes calibration' is a definition; 'one scalar took ECE from 0.087 to 0.011 with accuracy unchanged to four decimals, and the aggregate hid a minority subgroup at 0.153' is an answer that could only come from having done it. Nothing else in this module produces that difference so cheaply."
      ],
      "math": [
        {
          "h": "The three-beat template",
          "paras": [
            "Length is the most common error in this round. A rapid-fire question wants forty seconds, and a two-minute answer reads as inability to prioritize - which is itself the thing being scored.",
            "The failure mode is the beat that distinguishes usage from reading, and it is the one to lead with if you only get two."
          ],
          "tex": "\\text{WHAT (1 sentence)} \\;\\to\\; \\text{WHEN IT BREAKS (a specific condition)} \\;\\to\\; \\text{A NUMBER (if you have one)}",
          "texNote": "Then stop. Silence after a complete answer is fine and reads as confidence; filling it with elaboration reads as uncertainty and invites a harder follow-up on ground you chose badly."
        },
        {
          "h": "★ The numbers worth carrying, part one",
          "paras": [
            "Each is a measured result from this curriculum, and each converts a definition into evidence."
          ],
          "tex": "\\begin{array}{ll} \\text{temperature scaling} & \\text{ECE } 0.087\\to0.011,\\ \\text{accuracy unchanged}\\\\ \\text{aggregate calibration} & \\text{overall } 0.011\\ \\text{vs minority } 0.153\\\\ \\text{conformal coverage} & 0.902\\ \\text{marginal, } 0.727\\text{--}0.990\\ \\text{per class}\\\\ \\text{adding controls} & R^2\\ 0.898\\to0.987\\ \\text{while the estimate degrades } 87\\%\\\\ \\text{propensity balance} & 0.436\\to0.016\\ \\text{with the estimate } 81\\%\\ \\text{high} \\end{array}",
          "texNote": "Notice the shape they share: a metric improving while the thing you wanted got worse. That pattern is the single most reusable idea in the curriculum and it answers a surprising range of questions."
        },
        {
          "h": "★ The numbers worth carrying, part two",
          "paras": [
            "Systems and modelling results, where the arithmetic is usually the whole answer."
          ],
          "tex": "\\begin{array}{ll} \\text{KV cache at 32k, batch 8} & \\sim\\!137\\ \\text{GB vs } 35\\ \\text{GB of int4 weights}\\\\ \\text{paged attention} & 15\\%\\to98\\%\\ \\text{utilization},\\ 6.4\\times\\\\ \\text{LoRA rank elbow} & r{=}1\\ \\text{MSE } 0.96,\\ r{=}2\\to0.0000\\ \\text{at } 12\\%\\ \\text{of params}\\\\ \\text{uplift vs response model} & \\text{AUC } 0.513\\ \\text{earns } 12.4\\times\\ \\text{AUC } 0.895\\\\ \\text{peeking} & 5\\%\\to25\\%\\ \\text{false positives over } 20\\ \\text{looks} \\end{array}",
          "texNote": "You do not need all of these. Five or six deployed accurately is worth more than twenty half-remembered, and a number you are unsure of should be given as an order of magnitude or not at all."
        }
      ],
      "code": [
        {
          "h": "The failure mode for each classic question",
          "paras": [
            "This is the beat that separates having used a thing from having read about it, and it is memorizable."
          ],
          "code": "# REGULARIZATION    L1 zeroes correlated features ARBITRARILY - which one\n#                   survives is a coin flip, so don't read selection as\n#                   importance (same shape as SHAP splitting duplicated credit)\n# BATCH NORM        breaks at batch size 1 and leaks batch statistics across\n#                   examples; train/eval behaviour differs, which is a\n#                   classic silent inference bug\n# DROPOUT           interacts badly with batch norm; the variance shift is\n#                   why models regress when both are used naively\n# CROSS-VALIDATION  leaks under grouping and under time - random k-fold on\n#                   user-level data or a time series is optimistic\n# EARLY STOPPING    is model selection on the validation set, so the\n#                   validation score is no longer an unbiased estimate\n# CLASS WEIGHTS     change the implied threshold; you have moved the operating\n#                   point, not fixed the imbalance\n# AUC               is threshold-free and therefore silent about the operating\n#                   point you will actually ship (base rate 0.1% -> 1% FPR is\n#                   8.3% precision)\n# ENSEMBLES         remove INDEPENDENT error and leave shared bias - 1 to 16\n#                   reward models moved true quality 7.467 -> 7.714",
          "caption": "Every entry is a condition, not a caveat. 'It can be tricky' is not a failure mode; 'it breaks at batch size 1' is."
        },
        {
          "h": "Handling the question you cannot answer",
          "paras": [
            "It will happen, and the response is scored more than the gap is."
          ],
          "code": "# SAY YOU DON'T KNOW, THEN REASON FROM SOMETHING ADJACENT\n#   'I haven't used X. Structurally it looks like Y, which works by Z -\n#    is that the right intuition?'\n\n# WHAT THIS BUYS\n#   * it is honest, and an interviewer who catches a bluff discounts\n#     everything you said before it\n#   * reasoning by analogy is the thing the round is actually probing\n#   * it invites a correction, which turns a gap into a short exchange\n\n# ★ THE ASYMMETRY IS LARGE. One admitted gap costs almost nothing; one\n#   detected bluff costs the round, because it converts every other\n#   answer from evidence into a claim that now needs checking.",
          "caption": "The bluff is the highest-variance move available and the variance is all downside, which is the opposite of what this module is trying to achieve."
        }
      ],
      "useCases": [
        "The breadth round itself, where fifteen to twenty questions in forty-five minutes rewards prioritization as much as knowledge.",
        "The opening minutes of any technical conversation, where a short accurate answer with a failure mode establishes credibility faster than a long one.",
        "Self-diagnosis before a loop: run the list, and every entry where you cannot name a failure mode is a topic you have read rather than used.",
        "Teaching or reviewing, where 'when does this break' is the fastest way to find out whether someone understands a technique."
      ],
      "pitfalls": [
        "Answering at length. A rapid-fire question wants forty seconds, and a two-minute answer demonstrates an inability to prioritize, which is part of what is being measured.",
        "Giving a definition with no failure mode. That is the exact signature of having read about something rather than used it, and it is what the round is designed to detect.",
        "Quoting a number you are unsure of. An order of magnitude offered as an order of magnitude is fine; a precise-sounding wrong number is worse than none.",
        "Bluffing. One admitted gap costs almost nothing and one detected bluff costs the round, because every prior answer becomes a claim requiring verification.",
        "Elaborating into silence after a complete answer. It reads as uncertainty and invites a follow-up on ground you did not choose.",
        "Treating AUC as an operating-point answer. It is threshold-free, so at a 0.1% base rate it is compatible with 8.3% precision at a 1% FPR.",
        "Memorizing twenty numbers badly. Five or six deployed accurately beats twenty half-remembered, and the failure modes matter more than the numbers."
      ],
      "connections": [
        {
          "ref": "ml-theory/bias-variance",
          "text": "The most-asked concept in the round, and the one where the failure mode - that the decomposition assumes a fixed data distribution - is rarely offered."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "The source of the cleanest number to carry: one scalar, ECE 0.087 to 0.011, accuracy unchanged, and an aggregate hiding a subgroup at 0.153."
        },
        {
          "ref": "causal-inference/causal-graphs",
          "text": "Where the most reusable pattern comes from: a fit statistic improving while the estimate degrades, which answers a surprising range of questions."
        },
        {
          "ref": "interview-capstone/derivations",
          "text": "The depth round, which probes the same topics from the other direction - not what breaks, but why it works."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "A worked example of the answer shape: what it is, the int2 cliff where it breaks, and per-tensor versus per-channel as the number."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What is the breadth round testing?",
          "a": "Whether you've USED this or only read about it. The reliable tell is whether you can name a FAILURE MODE."
        },
        {
          "q": "Give the answer template.",
          "a": "WHAT it is (one sentence) → WHEN it breaks (a specific condition) → A NUMBER if you have one. Then stop."
        },
        {
          "q": "How long should an answer be?",
          "a": "About forty seconds. A two-minute answer demonstrates an inability to prioritize, which is itself being scored."
        },
        {
          "q": "L1 regularization — the failure mode?",
          "a": "It zeroes correlated features ARBITRARILY — which one survives is a coin flip — so don't read selection as importance."
        },
        {
          "q": "Batch norm — the failure mode?",
          "a": "Breaks at batch size 1, leaks batch statistics across examples, and train/eval behaviour differs — a classic silent inference bug."
        },
        {
          "q": "Cross-validation — the failure mode?",
          "a": "Leaks under grouping and under time. Random k-fold on user-level data or on a time series is optimistic."
        },
        {
          "q": "Early stopping — the failure mode?",
          "a": "It's model selection on the validation set, so that score is no longer an unbiased estimate of generalization."
        },
        {
          "q": "Class weights — the failure mode?",
          "a": "They change the implied threshold. You've moved the operating point, not fixed the imbalance."
        },
        {
          "q": "AUC — the failure mode?",
          "a": "Threshold-free, so it's silent about the operating point you'll ship. At a 0.1% base rate, 1% FPR is 8.3% precision."
        },
        {
          "q": "Ensembles — the failure mode?",
          "a": "They remove INDEPENDENT error and leave shared bias. 1 → 16 reward models moved true quality only 7.467 → 7.714."
        },
        {
          "q": "★ What do you do when you don't know?",
          "a": "Say so, then reason from something adjacent: \"I haven't used X; structurally it looks like Y, which works by Z — is that right?\""
        },
        {
          "q": "Why never bluff?",
          "a": "The asymmetry. One admitted gap costs almost nothing; one detected bluff converts every prior answer from evidence into a claim that needs checking."
        }
      ],
      "standard": [
        {
          "q": "How do you structure an answer in a rapid-fire round?",
          "a": "THREE BEATS IN ABOUT FORTY SECONDS. WHAT IT IS, in one sentence. WHEN IT BREAKS, with a specific condition. AND A NUMBER, if I have one. Then stop. THE SECOND BEAT IS THE ONE THAT MATTERS, because the round is testing whether I have used the technique or only read about it, and a failure mode is the reliable tell — anyone can define regularization, and someone who has shipped it says that L1 zeroes correlated features arbitrarily so the survivor is a coin flip and selection should not be read as importance. THE THIRD BEAT IS WHAT THIS CURRICULUM UNIQUELY SUPPLIES. 'Temperature scaling fixes calibration' is a definition. 'One scalar took ECE from 0.087 to 0.011 with accuracy unchanged to four decimals, and the aggregate number hid a minority subgroup sitting at 0.153' is an answer that could only come from having done it. THE LENGTH DISCIPLINE IS PART OF THE ANSWER: a two-minute response to a rapid-fire question reads as an inability to prioritize, which is part of what is being scored, and elaborating into a silence after a complete answer reads as uncertainty and invites a follow-up on ground I did not choose.",
          "deepDive": "There is a specific and useful move for the case where you know a lot about the topic: give the forty-second answer, then offer the depth explicitly — 'there's more on the calibration-versus-subgroup interaction if that's useful'. That hands the interviewer control over pacing, which is what they need in a round with fifteen questions to get through, and it signals that the depth exists without spending their budget. It also avoids the most common failure among strong candidates, which is answering the question they wish had been asked. The mirror-image discipline is to stop cleanly: after a complete three-beat answer, silence is fine and reads as confidence. Candidates find that silence uncomfortable and fill it, and the filling is almost always the weakest part of the answer, because it is unplanned and drifts toward whatever they thought of last. Practising the stop is worth as much as practising the content, and it is the same variance-reduction argument that runs through this whole module."
        },
        {
          "q": "Which numbers from this curriculum would you actually carry into a loop?",
          "a": "FIVE OR SIX, DEPLOYED ACCURATELY, rather than twenty half-remembered — and I would pick them to cover the widest range of questions. ONE: temperature scaling took ECE from 0.087 to 0.011 with accuracy unchanged, and the aggregate 0.011 hid a minority subgroup at 0.153. That single result answers calibration, subgroup evaluation, and why aggregate metrics mislead. TWO: adding controls to a regression drove R-squared from 0.898 to 0.987 while the causal estimate degraded 87% — the best-fitting model was the most wrong one — which answers anything about causal versus predictive modelling. THREE: an uplift score with AUC 0.513 earned 12.4× more incremental conversions than a response model with AUC 0.895, which answers targeting, metric choice, and why offline metrics mislead. FOUR: peeking at an A/B test 20 times took the false positive rate from 5% to 25%, which answers experimentation. FIVE: the KV cache at 32k context and batch 8 is around 137 GB against 35 GB of int4 weights — the model fits and the workload does not — which answers LLM serving. THAT SET SPANS CALIBRATION, CAUSALITY, METRICS, EXPERIMENTATION AND SYSTEMS with five facts.",
          "deepDive": "The reason those five work well is that each carries a transferable SHAPE rather than a domain fact, and the shape is what generalizes to a question you did not prepare. Temperature scaling is 'the aggregate hides the subgroup'. The R-squared result is 'a fit statistic improving while the thing you want degrades'. The uplift result is 'a metric anti-correlated with the decision'. Peeking is 'the decision rule is part of the statistic'. The KV cache is 'the bottleneck is not where the parameter count suggests'. Those five shapes answer a very wide range of questions, including ones about techniques you have never touched, because you can reason from the shape to the likely failure. That is also the honest reason to prefer a small accurate set: a number you are unsure of should be given as an order of magnitude or omitted, since a precise-sounding wrong figure is worse than no figure — it converts a strong answer into one the interviewer now has to discount, which is the same asymmetry as bluffing."
        },
        {
          "q": "A question comes up on something you have never used. What do you say?",
          "a": "I SAY I HAVEN'T USED IT, AND THEN I REASON FROM SOMETHING ADJACENT — 'I haven't worked with X. Structurally it looks like Y, which works by Z; is that the right intuition?' THREE THINGS THAT BUYS. It is honest, and honesty here is not a moral point but a strategic one: an interviewer who catches a bluff discounts everything said before it, so one detected bluff converts a whole round of evidence into claims requiring verification. It demonstrates reasoning by analogy, which is closer to what the round is probing than recall is — the job involves encountering unfamiliar techniques constantly, and the useful skill is mapping them onto structures you know. And it invites a correction, which turns a gap into a short collaborative exchange rather than a dead thirty seconds. THE ASYMMETRY IS THE WHOLE ARGUMENT: one admitted gap costs almost nothing, because nobody expects coverage of everything, and one detected bluff is close to disqualifying. In lesson 25-01's terms, bluffing is the highest-variance move available to a candidate and the variance is entirely downside, which is precisely the opposite of what this module is trying to do.",
          "deepDive": "There is a version of this that goes further and is worth having: name what would DISTINGUISH the possibilities. 'I'd guess it behaves like Y under condition A and like Z under condition B — do you know which regime it's usually in?' That demonstrates that you know what the relevant axis is even without knowing the answer, which is a stronger signal than a correct recalled definition would have been, because recall is cheap and knowing the axis is not. It also produces a genuinely useful conversation, which affects the interviewer's impression through a channel no rubric captures. The related discipline is to distinguish between 'I don't know' and 'I don't remember the number' — the second is fine to say and to bound, as in 'it's a factor of several, not an order of magnitude', while the first should not be dressed up as the second. Precision about your own uncertainty is itself evidence of the calibration this curriculum spent a module on, and interviewers notice it even when they could not name why."
        },
        {
          "q": "What are the most commonly asked breadth topics, and what is the failure mode for each?",
          "a": "THE SET IS SMALL AND THE FAILURE MODES ARE MEMORIZABLE. BIAS-VARIANCE: the decomposition assumes a fixed data distribution, so it says nothing under shift, and double descent shows the classic U-curve is not the whole story. REGULARIZATION: L1 zeroes correlated features arbitrarily, so which one survives is a coin flip. BATCH NORM: breaks at batch size 1, leaks statistics across examples in a batch, and behaves differently in train and eval — a classic silent inference bug. DROPOUT: interacts badly with batch norm through a variance shift, which is why naively using both regresses. CROSS-VALIDATION: leaks under grouping and under time, so random k-fold on user-level or temporal data is optimistic. EARLY STOPPING: is model selection on the validation set, so that score stops being unbiased. CLASS WEIGHTS: change the implied threshold, so you have moved the operating point rather than fixed the imbalance. AUC: is threshold-free and therefore silent about the operating point you ship — at a 0.1% base rate, a 1% FPR is 8.3% precision. ENSEMBLES: remove independent error and leave shared bias, measured at 7.467 to 7.714 from one model to sixteen.",
          "deepDive": "Two meta-points about that list. First, notice that several failure modes are the same failure mode: early stopping, cross-validation leakage and selecting a checkpoint on a holdout are all 'a measurement participating in the selection stops being a measurement', which is module 24's thesis and the Goodhart result from 24-10. Recognizing that lets you answer three questions with one idea and say so, which reads far better than three memorized caveats. Second, the strongest version of any of these answers connects the failure mode to a decision: 'batch norm's train/eval difference is why I check inference-mode outputs against training-mode on a fixed batch before every deploy' turns a caveat into a practice, and a practice is evidence of having been burned. That is the highest-signal form available in this round and it costs one clause. The preparation exercise that produces it is to go through the list and, for each, write the check you would actually run — which takes an hour and converts the whole set from recall into experience-shaped answers."
        },
        {
          "q": "How would you prepare for this round efficiently?",
          "a": "BY RUNNING THE LIST AND FINDING THE GAPS, WHICH IS FASTER THAN STUDYING BROADLY. Take the twenty or thirty concepts that actually get asked and, for each, try to say the three beats out loud on a timer: what it is, when it breaks, and a number. EVERY ENTRY WHERE I CANNOT NAME A FAILURE MODE IS A TOPIC I HAVE READ RATHER THAN USED, and that is exactly what the round will detect — so the gaps the exercise finds are precisely the ones worth closing, and closing them means reading about failures rather than definitions, which is a different and more efficient search. THE SECOND HALF IS THE DELIVERY, because this round has a length discipline that content preparation does not address: forty seconds, three beats, then stop. That needs rehearsal out loud, ideally with someone timing, because the failure is not knowing too little but saying too much. THIRD, I'D FIX FIVE OR SIX NUMBERS accurately rather than twenty vaguely, chosen to span calibration, causality, metrics, experimentation and systems. AND I'D PRACTISE THE 'I DON'T KNOW' RESPONSE explicitly, because it is the one that has to be smooth under pressure and is never rehearsed.",
          "deepDive": "The gap-finding exercise has a useful property: it is bounded and finishable, which matters because the failure mode in interview preparation is an unbounded reading list that never converges and crowds out the rounds with more controllable variance. Thirty concepts at two minutes each is an hour, and the output is a specific list of maybe five topics to study rather than a vague sense of underpreparedness. It also produces a calibration check on your own knowledge, which is worth having independently — most people discover that the topics they feel weakest about are fine and the ones they never think about are the gaps, because familiarity and understanding come apart. That is the same self-assessment calibration problem module 24 discussed, applied to yourself, and the exercise is the reliability diagram. Finally, this round pairs efficiently with the algorithms round: several patterns there map onto ML components here, so learning each with its ML use covers both, which is the same consolidation argument that makes the whole module cheaper than it looks."
        },
        {
          "q": "What does this round reveal that the others do not?",
          "a": "COVERAGE AND HONESTY, AND IT IS THE ONLY ROUND THAT REALLY PROBES EITHER. A design round tests depth on one problem; a coding round tests one narrow skill; a project deep-dive tests what you personally did. THE BREADTH ROUND SAMPLES THE WHOLE SURFACE, and because it moves fast it also samples your behaviour at the boundary of your knowledge — which is why the 'I don't know' response matters disproportionately here. That behaviour is genuinely predictive of working with someone: an engineer who bluffs in an interview bluffs in a design review, and the cost there is much higher than a bad hire decision. THE SECOND THING IT REVEALS IS WHETHER YOUR KNOWLEDGE IS INDEXED OR MERELY STORED. Fifteen questions in forty-five minutes gives no time to reconstruct from first principles, so it tests retrieval rather than derivation — which is the complement of the depth round, and it is why the two exist together. IN THIS MODULE'S TERMS it is a high-frequency, low-depth sample of a large space, which makes it a coverage estimate in exactly module 24's sense: fifteen questions from a space of hundreds, and the interviewer is extrapolating.",
          "deepDive": "That last framing has a practical implication worth acting on. Because the round is a small sample from a large space, its variance is high — fifteen questions is not many, and which fifteen you get is close to random. So an unusually bad breadth round is weak evidence, and an unusually good one is weak evidence too, which is consistent with the loop arithmetic from 25-01 where a single interview had an AUC of 0.778. The practical consequence for a candidate is not to over-update from one round, and the practical consequence for an interviewer is that the round should be scored on the pattern of answers rather than on the count correct — a candidate who answers ten of fifteen well and says 'I don't know' cleanly on the other five is a better signal than one who answers twelve with three confident errors, even though the count favours the second. Interviewers who score the count rather than the pattern get the ranking backwards, and it is worth knowing that a good interviewer is not counting."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What the breadth round tests",
        "back": "Have you USED this, or only read about it. The reliable tell is whether you can name a FAILURE MODE. Anyone can define regularization."
      },
      {
        "type": "definition",
        "front": "★ The three-beat template",
        "back": "WHAT it is (one sentence) → WHEN it breaks (a SPECIFIC condition) → A NUMBER if you have one. ~40 seconds. **Then stop** — silence after a complete answer reads as confidence."
      },
      {
        "type": "formula",
        "front": "Five numbers that span the curriculum",
        "back": "Temp scaling ECE 0.087→0.011 (minority 0.153) · R² 0.898→0.987 while the estimate degrades 87% · uplift AUC 0.513 earns 12.4× AUC 0.895 · peeking 5%→25% · KV cache ~137 GB vs 35 GB of int4 weights."
      },
      {
        "type": "intuition",
        "front": "★ Why those five",
        "back": "Each carries a transferable SHAPE, not a domain fact: aggregate hides subgroup · fit improves while the target degrades · metric anti-correlated with the decision · the decision rule is part of the statistic · the bottleneck isn't where parameters suggest."
      },
      {
        "type": "pitfall",
        "front": "L1, batch norm, dropout — failure modes",
        "back": "L1 zeroes correlated features ARBITRARILY (survivor is a coin flip). Batch norm breaks at batch size 1, leaks batch statistics, train≠eval. Dropout + batch norm interact via a variance shift."
      },
      {
        "type": "pitfall",
        "front": "CV, early stopping, class weights — failure modes",
        "back": "CV leaks under grouping and under time. Early stopping is model selection on the validation set, so it's no longer unbiased. Class weights move the implied THRESHOLD — the operating point, not the imbalance."
      },
      {
        "type": "pitfall",
        "front": "AUC and ensembles — failure modes",
        "back": "AUC is threshold-free, so it's silent about the operating point you ship (0.1% base rate, 1% FPR → 8.3% precision). Ensembles remove INDEPENDENT error only: 1 → 16 models moved true quality just 7.467 → 7.714."
      },
      {
        "type": "intuition",
        "front": "Several failure modes are ONE failure mode",
        "back": "Early stopping, CV leakage, checkpoint selection on a holdout: *a measurement participating in the selection stops being a measurement*. Saying that answers three questions with one idea."
      },
      {
        "type": "intuition",
        "front": "★ The \"I don't know\" response",
        "back": "\"I haven't used X. Structurally it looks like Y, which works by Z — is that right?\" Honest, demonstrates reasoning by analogy (what's actually being probed), and invites a correction."
      },
      {
        "type": "pitfall",
        "front": "Why never bluff",
        "back": "The asymmetry. One admitted gap costs almost nothing; one DETECTED bluff converts every prior answer from evidence into a claim needing verification. Highest-variance move available, all downside."
      },
      {
        "type": "intuition",
        "front": "The preparation exercise",
        "back": "Run the list on a timer, three beats out loud. Every entry where you can't name a failure mode is a topic you READ rather than used. Bounded (~1 hour), finishable, and it outputs a specific list of five gaps."
      },
      {
        "type": "intuition",
        "front": "★ Why one bad breadth round is weak evidence",
        "back": "Fifteen questions sampled from a space of hundreds — high variance, consistent with a single interview's AUC of 0.778. A good interviewer scores the PATTERN, not the count: 10/15 with clean \"I don't know\"s beats 12/15 with three confident errors."
      }
    ],
    "refs": [
      {
        "title": "Ng, Machine Learning Yearning",
        "url": "https://info.deeplearning.ai/machine-learning-yearning-book"
      },
      {
        "title": "Google, Rules of Machine Learning: Best Practices for ML Engineering",
        "url": "https://developers.google.com/machine-learning/guides/rules-of-ml"
      },
      {
        "title": "Belkin, Hsu, Ma & Mandal (2019), Reconciling Modern Machine-Learning Practice and the Bias-Variance Trade-Off",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1903070116"
      },
      {
        "title": "Ioffe & Szegedy (2015), Batch Normalization",
        "url": "https://arxiv.org/abs/1502.03167"
      },
      {
        "title": "Li, Chen, Hu & Yang (2019), Understanding the Disharmony between Dropout and Batch Normalization",
        "url": "https://arxiv.org/abs/1801.05134"
      }
    ],
    "demos": [
      "bias-variance-decomp",
      "overfitting",
      "cross-validation",
      "roc"
    ]
  },
  "derivations": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The depth round asks whether you understand WHY, and the test is not whether you can recite a result but whether you can PERTURB it - change an assumption and say what happens to the answer. Someone who memorized a derivation freezes at that question; someone who derived it once answers immediately.",
        "The single most valuable thing in this lesson is a unification rather than a derivation. The gradient of logistic regression is X-transpose times (sigma(Xw) minus y), over n. The gradient of softmax cross-entropy is X-transpose times (P minus Y), over n. THE SAME SHAPE - features times (prediction minus target) - and that is not a coincidence: it holds for every generalized linear model paired with its canonical link. Saying that is worth more than reciting either derivation.",
        "And every derivation should be verified numerically, because it costs ten lines and converts a belief into a check. Central differences against the analytic gradients agreed to 8.5e-11 for logistic regression, 1.3e-7 for softmax cross-entropy, and 1.5e-10 for the sigmoid identity. That habit is also the answer to a common follow-up: how do you know your gradient is right?"
      ],
      "math": [
        {
          "h": "★ The unification worth leading with",
          "paras": [
            "Both classic gradients have the same form, and the reason is structural: for an exponential-family likelihood with its canonical link, the derivative of the log-partition function IS the mean, so the chain rule collapses.",
            "This is the answer that demonstrates understanding rather than recall, and it generalizes to Poisson regression, linear regression and any other GLM."
          ],
          "tex": "\\nabla_w \\mathcal{L} = \\tfrac{1}{n}X^\\top\\big(\\hat{y}-y\\big): \\quad \\text{logistic } \\hat{y}=\\sigma(Xw), \\quad \\text{softmax } \\hat{Y}=P, \\quad \\text{linear } \\hat{y}=Xw",
          "texNote": "Verified numerically against central differences: logistic max absolute difference 8.489e-11, softmax cross-entropy 1.282e-07, both at the analytic form above. The softmax residual is larger only because the finite-difference step interacts with a flatter surface."
        },
        {
          "h": "The identities that make everything else fast",
          "paras": [
            "A small set of results that appear inside most derivations. Knowing them turns a five-minute derivation into a one-minute one."
          ],
          "tex": "\\sigma'(z)=\\sigma(z)(1-\\sigma(z)) \\quad \\tfrac{\\partial}{\\partial z_i}\\mathrm{LSE}(z)=\\mathrm{softmax}(z)_i \\quad \\tfrac{\\partial}{\\partial X}\\|Xw-y\\|^2=2X^\\top(Xw-y) \\quad \\tfrac{\\partial}{\\partial A}\\log\\det A = A^{-\\top}",
          "texNote": "The sigmoid identity verified to 1.522e-10 against central differences. The log-sum-exp derivative being the softmax is why cross-entropy gradients are so clean and why numerically stable implementations subtract the max without changing anything downstream."
        },
        {
          "h": "The derivations worth being able to produce cold",
          "paras": [
            "Short enough to finish under pressure, load-bearing enough that the follow-ups are interesting."
          ],
          "tex": "\\text{bias-variance} \\cdot \\text{OLS normal equations} \\cdot \\text{logistic \\& softmax gradients} \\cdot \\text{backprop for one layer} \\cdot \\text{PCA as an eigenproblem} \\cdot \\text{the bayes rule/posterior update}",
          "texNote": "Six items. Each takes two to four minutes on a whiteboard and each has a standard perturbation - what if the features are correlated, what if the link is not canonical, what if the covariance is singular - which is where the round actually goes."
        }
      ],
      "code": [
        {
          "h": "★ Verify every derivation numerically",
          "paras": [
            "Ten lines, and it converts a belief into a check. It is also the answer to 'how do you know your gradient is right'."
          ],
          "code": "def numgrad(f, x, eps=1e-6):\n    g = np.zeros_like(x)\n    for i in range(len(x)):\n        e = np.zeros_like(x); e[i] = eps\n        g[i] = (f(x+e) - f(x-e)) / (2*eps)      # CENTRAL differences: O(eps^2)\n    return g\n\n# logistic regression   analytic X^T(sigma(Xw)-y)/n   max|diff| 8.489e-11\n# softmax cross-entropy analytic X^T(P-Y)/n           max|diff| 1.282e-07\n# sigma'(z) = sigma(z)(1-sigma(z))                    max|diff| 1.522e-10\n\n# ★ USE CENTRAL, NOT FORWARD, differences. Forward is O(eps) and the\n#   accuracy floor is much worse - the truncation-vs-cancellation trade\n#   from module 22's autodiff lesson, where no eps reaches machine precision.\n# ★ A relative error below ~1e-7 for a smooth function is a pass. If it\n#   fails, check the loss reduction (mean vs sum) FIRST - that factor of n\n#   is the most common discrepancy by a wide margin.",
          "caption": "Doing this unprompted in a take-home or on a whiteboard is a strong signal, because it is the habit of someone who has debugged a gradient rather than only written one."
        },
        {
          "h": "The perturbations the round actually asks",
          "paras": [
            "The derivation is the setup. These are the questions, and they are where the round is won or lost."
          ],
          "code": "# OLS            what if X^T X is singular?  -> no unique solution; ridge\n#                adds lambda*I making it invertible, which is also the MAP\n#                estimate under a Gaussian prior. Say both.\n# LOGISTIC       what if the classes are separable? -> the MLE diverges,\n#                weights go to infinity; regularization is what makes it\n#                well-posed, not just better-generalizing\n# SOFTMAX        why subtract the max? -> exp overflows above ~88 in float32,\n#                and softmax is shift-invariant so it changes nothing\n# BIAS-VARIANCE  does it hold under distribution shift? -> no, the\n#                decomposition assumes a fixed data distribution\n# PCA            what if features have different units? -> the covariance\n#                is unit-dependent, so standardize or you get a units artefact\n# BACKPROP       why is reverse mode preferred? -> cost is O(outputs) forward\n#                passes vs O(inputs) backward; with one scalar loss and\n#                millions of parameters, reverse wins by that ratio",
          "caption": "Each answer is one sentence and each demonstrates that the result was derived rather than absorbed."
        }
      ],
      "useCases": [
        "The ML depth round, where a single topic is probed until it breaks and the perturbation questions are the actual content.",
        "Debugging a custom loss or layer, where a numerical gradient check finds in ten lines what hours of reading will not.",
        "Reading a paper critically, since most methods are a modification to one of these six derivations and knowing the base makes the delta visible.",
        "Teaching or reviewing, where asking someone to perturb an assumption immediately distinguishes memorization from understanding."
      ],
      "pitfalls": [
        "Memorizing derivations without deriving them. The round's real content is the perturbation - what if the features are correlated, what if the link is not canonical - and memorization does not survive it.",
        "Reciting logistic and softmax gradients as unrelated results. Both are X-transpose times prediction-minus-target over n, and the unification is worth more than either derivation.",
        "Never checking a gradient numerically. Central differences agreed to 8.5e-11, 1.3e-7 and 1.5e-10 here, and the check is ten lines.",
        "Using forward instead of central differences. Forward is O(eps) accurate against O(eps squared), and the accuracy floor is far worse - the truncation-versus-cancellation trade with no step size that reaches machine precision.",
        "Debugging a failed gradient check without first suspecting the mean-versus-sum reduction. That factor of n is the most common discrepancy by a wide margin.",
        "Answering 'why regularize' with generalization only. For separable logistic regression the MLE diverges, so regularization makes the problem well-posed, which is a stronger and more precise answer.",
        "Deriving PCA without mentioning units. The covariance matrix is unit-dependent, so unstandardized features give an artefact of measurement scale rather than structure."
      ],
      "connections": [
        {
          "ref": "neural-nets/backprop",
          "text": "The derivation that generalizes all the others, and the reverse-mode argument that explains why it is the cost model deep learning is built on."
        },
        {
          "ref": "supervised-learning/glm",
          "text": "Why the two gradients coincide - the exponential family with its canonical link, where the log-partition derivative is the mean."
        },
        {
          "ref": "ml-theory/convex-optimization",
          "text": "What the gradients are for, and why convexity of the logistic loss makes the separable-data divergence a well-posedness problem rather than an optimization one."
        },
        {
          "ref": "frontier-frameworks/jax-fundamentals",
          "text": "Why autodiff is exact where finite differences have an error floor, which is the reason a gradient check is a sanity check rather than the source of truth."
        },
        {
          "ref": "unsupervised-learning/pca",
          "text": "The eigenproblem derivation and the standardization question that is its standard perturbation."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ Give the logistic regression gradient.",
          "a": "∇_w L = Xᵀ(σ(Xw) − y)/n. Verified against central differences to max|diff| 8.489e-11."
        },
        {
          "q": "Give the softmax cross-entropy gradient.",
          "a": "∇_W L = Xᵀ(P − Y)/n where P = softmax(XW) and Y is one-hot. Verified to 1.282e-07."
        },
        {
          "q": "★ Why are they the same shape?",
          "a": "Both are features times (prediction − target). It holds for every GLM with its CANONICAL link, because the log-partition derivative is the mean, so the chain rule collapses."
        },
        {
          "q": "State σ'(z).",
          "a": "σ(z)(1 − σ(z)). Verified numerically to 1.522e-10."
        },
        {
          "q": "What is ∂LSE(z)/∂z_i?",
          "a": "softmax(z)_i. That's why cross-entropy gradients are so clean."
        },
        {
          "q": "How do you check a gradient?",
          "a": "Central differences: (f(x+ε) − f(x−ε))/2ε, O(ε²). Relative error below ~1e-7 on a smooth function is a pass."
        },
        {
          "q": "Why central, not forward?",
          "a": "Forward is O(ε) with a much worse accuracy floor — the truncation-vs-cancellation trade where no step size reaches machine precision."
        },
        {
          "q": "Gradient check fails. First suspect?",
          "a": "The reduction — mean vs sum. That factor of n is the most common discrepancy by a wide margin."
        },
        {
          "q": "OLS: what if XᵀX is singular?",
          "a": "No unique solution. Ridge adds λI making it invertible — and that's also the MAP estimate under a Gaussian prior. Say both."
        },
        {
          "q": "Logistic: what if the classes are separable?",
          "a": "The MLE DIVERGES — weights go to infinity. Regularization makes the problem well-posed, not merely better-generalizing."
        },
        {
          "q": "PCA: what if features have different units?",
          "a": "The covariance matrix is unit-dependent, so you get an artefact of measurement scale. Standardize, or use the correlation matrix."
        },
        {
          "q": "Why reverse-mode autodiff?",
          "a": "Cost is O(outputs) backward passes vs O(inputs) forward. One scalar loss, millions of parameters — reverse wins by that ratio."
        }
      ],
      "standard": [
        {
          "q": "Derive the logistic regression gradient, then tell me something interesting about it.",
          "a": "THE DERIVATION IS SHORT. The negative log-likelihood for one example is −[y log σ(z) + (1−y) log(1−σ(z))] with z = wᵀx. Using σ'(z) = σ(z)(1−σ(z)), the derivative of the first term with respect to z is −y(1−σ(z)) and of the second is (1−y)σ(z), which sum to σ(z) − y. The z-to-w step contributes x, so the per-example gradient is (σ(z) − y)x and the batch gradient is Xᵀ(σ(Xw) − y)/n. THE INTERESTING PART IS THAT THIS IS THE SAME SHAPE AS THE SOFTMAX CROSS-ENTROPY GRADIENT, Xᵀ(P − Y)/n, and the same shape as linear regression's Xᵀ(Xw − y)/n. FEATURES TIMES PREDICTION MINUS TARGET, three times. That is not a coincidence: for a generalized linear model paired with its canonical link, the derivative of the log-partition function IS the mean of the distribution, so the chain rule collapses and the awkward middle term cancels exactly. Which means if you know one of these you know all of them, and you can write down the Poisson regression gradient without deriving it. I'D ALSO SAY I VERIFY THESE NUMERICALLY — central differences agreed to 8.5e-11 for logistic and 1.3e-7 for softmax.",
          "deepDive": "The perturbation that usually follows is what happens with separable data, and the answer is more interesting than 'it overfits'. If a hyperplane separates the classes perfectly, the likelihood can always be increased by scaling the weights up — pushing every σ(z) closer to 0 or 1 — so the MLE does not exist and gradient descent drives the norm to infinity while the loss decreases forever. That makes regularization a WELL-POSEDNESS requirement rather than a generalization preference, which is a sharper answer than the usual one. It also connects to the implicit-bias literature: unregularized gradient descent on separable logistic loss converges in direction to the max-margin solution, slowly, which is one explanation for why heavily overparameterized models generalize despite fitting the training data exactly. The second common perturbation is correlated features, where the loss stays convex but the curvature becomes badly conditioned, so convergence slows and the individual coefficients become unstable while the predictions do not — which is the same phenomenon as SHAP splitting credit between duplicated features in module 24."
        },
        {
          "q": "How do you know a gradient you derived is correct?",
          "a": "I CHECK IT NUMERICALLY, AND IT IS TEN LINES. Central differences — (f(x+ε) − f(x−ε))/2ε — evaluated coordinate by coordinate, compared against the analytic gradient by maximum absolute or relative difference. Measured on the three results in this lesson: logistic regression 8.489e-11, softmax cross-entropy 1.282e-07, and the sigmoid identity 1.522e-10. A relative error below about 1e-7 on a smooth function is a pass. USE CENTRAL RATHER THAN FORWARD DIFFERENCES, because forward is O(ε) accurate and central is O(ε²), and the accuracy floor differs substantially — this is the truncation-versus-cancellation trade from the autodiff material, where shrinking ε reduces truncation error and amplifies floating-point cancellation, so no step size reaches machine precision and central differences simply have a better minimum. WHEN THE CHECK FAILS, the first thing to suspect is the reduction: a mean-versus-sum mismatch gives a clean factor of n and is by far the most common discrepancy. After that, an index transposition, a missing chain-rule factor, or a non-smooth point such as a ReLU exactly at zero, where the check legitimately fails and you should perturb away from the kink.",
          "deepDive": "Doing this unprompted is a strong signal because it is the habit of someone who has debugged a gradient rather than only written one, and it transfers directly to real work — every custom loss, custom layer or hand-written backward pass should ship with a gradient check, and most do not. There is a subtlety worth knowing for the modern setting: with float32 the check is much noisier, so it is standard to run gradient checks in float64 even when training in float32 or bfloat16, and a check that fails in float32 and passes in float64 is telling you about precision rather than about your derivation. The related caution is that autodiff is exact where finite differences have an error floor, so the numerical check is a sanity check on your ANALYTIC work, not a source of truth — if your framework's autodiff and your hand derivation disagree, the framework is usually right and your derivation is the thing to re-examine. The exception is a custom op with an incorrectly registered backward, which is exactly the case the check exists to catch."
        },
        {
          "q": "Walk me through PCA and its assumptions.",
          "a": "PCA FINDS THE DIRECTIONS OF MAXIMUM VARIANCE, and there are two equivalent derivations worth being able to give. MAXIMIZE VARIANCE: find the unit vector w maximizing the variance of Xw, which is wᵀΣw subject to ‖w‖ = 1; the Lagrangian gives Σw = λw, so w is an eigenvector of the covariance and λ is the variance captured. MINIMIZE RECONSTRUCTION ERROR: find the rank-k subspace minimizing squared reconstruction error, which by Eckart–Young is the top-k eigenvectors — the same answer from a different objective, and saying they coincide is a better answer than either alone. In practice it is computed via the SVD of the centred data rather than by forming the covariance, because forming XᵀX squares the condition number. THE ASSUMPTIONS ARE WHERE THE ROUND GOES. It assumes variance means importance, which fails whenever a low-variance direction carries the signal. It is linear, so it cannot capture curved structure. It assumes centring, and forgetting to centre gives a first component pointing at the mean. AND IT IS UNIT-DEPENDENT: the covariance changes under rescaling, so unstandardized features produce an artefact of measurement scale rather than structure.",
          "deepDive": "The units point is the one I would lead with if asked for a single caveat, because it silently ruins real analyses — a dataset with a feature in dollars and another in millimetres has a first component that is essentially the dollar feature, and the plot looks meaningful. Using the correlation matrix instead of the covariance is equivalent to standardizing first and is the usual default for heterogeneous features. The 'variance equals importance' assumption deserves the same scrutiny: PCA is unsupervised, so it knows nothing about the target, and for a supervised task there is no guarantee the top components are the predictive ones — which is why PCA-then-regress can be worse than regressing on the raw features, and why partial least squares exists. The other common follow-up is how to choose k, where the honest answer is that the scree plot is a heuristic and the principled versions depend on what PCA is for — explained-variance thresholds for compression, cross-validated downstream performance for a supervised pipeline, and parallel analysis if you care about which components are distinguishable from noise."
        },
        {
          "q": "Explain backpropagation and why reverse mode is the right choice.",
          "a": "BACKPROP IS THE CHAIN RULE APPLIED IN A SPECIFIC ORDER. For a composition of functions, the derivative of the output with respect to any parameter is a product of Jacobians along the path, and the only question is the ORDER of multiplication — which is associative, so the answer is identical and the COST is not. FORWARD MODE propagates derivatives from inputs toward outputs and costs one pass per INPUT dimension. REVERSE MODE propagates from outputs backward and costs one pass per OUTPUT dimension. With a scalar loss and millions of parameters, reverse mode costs one backward pass and forward mode would cost millions, so the ratio is the parameter count. THAT IS THE WHOLE ARGUMENT, and it is why deep learning's cost model looks the way it does: roughly two to three times the forward cost for a backward pass, independent of parameter count. THE PRICE IS MEMORY — reverse mode must store the intermediate activations from the forward pass to use on the way back, which is why activation memory scales with depth times batch size and why gradient checkpointing exists, trading recomputation for memory. FOR ONE LAYER with z = Wx + b and a downstream gradient g, the parameter gradient is g xᵀ and the gradient passed back is Wᵀ g.",
          "deepDive": "The memory point is worth developing because it is where the follow-ups usually go and where the practical consequences live. Activation memory, not parameter memory, is what limits batch size for most training runs, and the standard levers all trade against recomputation: gradient checkpointing stores a subset of activations and recomputes the rest, typically buying a large memory reduction for around 30% more compute; reversible architectures avoid storing activations entirely by making them recoverable; and activation offloading moves them to host memory at the cost of bandwidth. There is a nice connection to the inference side here too — training is compute-bound and dominated by matmuls, while autoregressive generation is memory-bandwidth-bound and dominated by weight and KV-cache movement, which is why the same hardware has completely different utilization profiles in the two regimes. Being able to state that contrast is a strong signal in a systems-flavoured depth round, and it costs one sentence."
        },
        {
          "q": "What makes a depth round go well or badly?",
          "a": "IT GOES WELL WHEN YOU CAN PERTURB THE RESULT AND BADLY WHEN YOU CAN ONLY STATE IT. The derivation is the setup; the round's real content is the follow-up — what if XᵀX is singular, what if the classes are separable, what if the link is not canonical, what if the features have different units, does this hold under distribution shift. Someone who derived a result once answers those immediately because the derivation shows where each assumption entered. Someone who memorized the endpoint freezes, and the freeze is more informative to the interviewer than the original answer was. SO THE PREPARATION IS TO DERIVE RATHER THAN READ, and specifically to derive with the perturbations attached: for each of the six core results, know the two or three standard modifications and what they do. THE SECOND THING THAT GOES WRONG IS SILENCE WHILE THINKING. A derivation has genuine pauses, and narrating the plan first — 'I'll write the per-example loss, differentiate with respect to the logit, then chain to the weights' — gives the interviewer the structure so the pauses read as work rather than as being stuck. That is this module's thesis in the round where it is least obvious.",
          "deepDive": "There is a specific recovery worth having rehearsed, because getting stuck mid-derivation is common and survivable. Say where you are and what you are trying to do — 'I have the derivative with respect to the logit and I'm trying to chain it back to the weights; the shapes should end up as features by classes' — because shape checking is both a genuine debugging technique and a legible one. Interviewers frequently offer a nudge at that point, and taking one gracefully costs far less than grinding in silence; what they are scoring is whether you can work with someone. The other useful habit is to sanity-check the result before declaring it done: check the shape, check the sign by asking what happens when the prediction exceeds the target, and check a degenerate case such as a perfect prediction giving a zero gradient. Those three checks take fifteen seconds and catch most errors, and doing them out loud is exactly the kind of visible rigour that the whole module argues transmits."
        },
        {
          "q": "Which derivations are worth the preparation time, and why those?",
          "a": "SIX, CHOSEN BECAUSE THEY ARE SHORT ENOUGH TO FINISH UNDER PRESSURE AND LOAD-BEARING ENOUGH THAT THE FOLLOW-UPS ARE INTERESTING. THE BIAS-VARIANCE DECOMPOSITION, because it is the most-asked and because its assumption — a fixed data distribution — is the perturbation people miss. THE OLS NORMAL EQUATIONS, because singularity leads to ridge and ridge leads to the MAP-under-a-Gaussian-prior connection, which is three answers from one derivation. LOGISTIC AND SOFTMAX GRADIENTS TOGETHER, because the unification is the payoff and separable-data divergence is the perturbation. BACKPROP FOR ONE LAYER, because the reverse-mode cost argument generalizes to everything and the memory trade is the follow-up. PCA, because the two equivalent derivations coinciding is a good answer and the units caveat is a real-world failure. AND BAYES WITH A CONJUGATE UPDATE, because it makes the prior's role concrete and connects to when it stops mattering — three priors spanning 14× at n=10 and agreeing to three decimals at n=100,000. EACH TAKES TWO TO FOUR MINUTES on a whiteboard, so the whole set is an afternoon plus rehearsal.",
          "deepDive": "The reason to prefer that bounded set over broader coverage is the same argument as the algorithms round: preparation fails when the list is unbounded and never converges. Six derivations with two perturbations each is thirty-six things, which is finishable in a weekend and produces a real sense of readiness rather than a vague one. It also pairs efficiently with the breadth round, since the perturbations ARE the failure modes that round asks for — separable data, singular covariance, unit dependence, fixed-distribution assumptions — so learning them once serves both, which is the third time in this module that two rounds have collapsed into one preparation. The honest limit is that a depth round can go anywhere, and a specialist interviewer will probe their own area past whatever you prepared. The response to that is the same as for an unknown breadth question: say where your knowledge ends, reason from the nearest structure you do know, and let them correct you — which reads better than a memorized answer to a question they did not quite ask."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The unification worth leading with",
        "back": "∇_w L = Xᵀ(ŷ − y)/n for logistic (ŷ=σ(Xw)), softmax (Ŷ=P) AND linear (ŷ=Xw). Features × (prediction − target). Holds for every GLM with its CANONICAL link — the log-partition derivative is the mean, so the chain rule collapses."
      },
      {
        "type": "formula",
        "front": "The identities that make derivations fast",
        "back": "σ′(z) = σ(z)(1−σ(z)) · ∂LSE(z)/∂z_i = softmax(z)_i · ∂‖Xw−y‖²/∂w = 2Xᵀ(Xw−y) · ∂log det A/∂A = A⁻ᵀ."
      },
      {
        "type": "formula",
        "front": "★ Verify numerically — always",
        "back": "Central differences (f(x+ε)−f(x−ε))/2ε, O(ε²). Measured: logistic **8.489e-11**, softmax CE **1.282e-07**, σ′ identity **1.522e-10**. Relative error < ~1e-7 on a smooth function is a pass."
      },
      {
        "type": "pitfall",
        "front": "Central, not forward differences",
        "back": "Forward is O(ε) with a much worse accuracy floor — truncation vs cancellation, where no step size reaches machine precision. Also: run the check in float64 even when training in float32."
      },
      {
        "type": "pitfall",
        "front": "Gradient check failed — first suspect?",
        "back": "The REDUCTION: mean vs sum, a clean factor of n, and by far the most common discrepancy. Then index transposition, a missing chain-rule factor, or a non-smooth point (ReLU exactly at 0)."
      },
      {
        "type": "intuition",
        "front": "★ Logistic on separable data",
        "back": "The MLE **does not exist** — scaling the weights up always increases the likelihood, so ‖w‖ → ∞. Regularization is a WELL-POSEDNESS requirement, not a generalization preference. (Unregularized GD converges in direction to max-margin.)"
      },
      {
        "type": "intuition",
        "front": "OLS with singular XᵀX",
        "back": "No unique solution. Ridge adds λI making it invertible — and it is simultaneously the MAP estimate under a Gaussian prior on w. Say both; it's three answers from one derivation."
      },
      {
        "type": "definition",
        "front": "PCA, two derivations",
        "back": "Maximize variance wᵀΣw s.t. ‖w‖=1 → Σw = λw. OR minimize rank-k reconstruction error → same top-k eigenvectors (Eckart–Young). Saying they COINCIDE beats either alone. Compute via SVD, not by forming XᵀX."
      },
      {
        "type": "pitfall",
        "front": "PCA's real-world failure",
        "back": "It's UNIT-DEPENDENT — dollars vs millimetres gives a first component that is just the dollar feature, and the plot looks meaningful. Use the correlation matrix. Also: it's unsupervised, so top components need not be predictive."
      },
      {
        "type": "formula",
        "front": "Why reverse-mode autodiff",
        "back": "Forward costs one pass per INPUT dim; reverse one per OUTPUT dim. Scalar loss + millions of parameters ⇒ reverse wins by the parameter count. Price: storing activations — hence checkpointing (~30% more compute for a large memory cut)."
      },
      {
        "type": "intuition",
        "front": "★ What the depth round actually tests",
        "back": "Whether you can PERTURB the result, not state it. Memorization freezes at \"what if XᵀX is singular / the classes are separable / the units differ\" — and the freeze is more informative than the original answer."
      },
      {
        "type": "intuition",
        "front": "Recovering when stuck mid-derivation",
        "back": "Say where you are and what you're aiming at — \"I have ∂/∂logit, chaining to weights, shapes should end up features × classes.\" Shape checking is a real technique AND a legible one, and it invites a nudge you can take gracefully."
      }
    ],
    "refs": [
      {
        "title": "Bishop (2006), Pattern Recognition and Machine Learning",
        "url": "https://www.microsoft.com/en-us/research/publication/pattern-recognition-machine-learning/"
      },
      {
        "title": "Petersen & Pedersen, The Matrix Cookbook",
        "url": "https://www.math.uwaterloo.ca/~hwolkowi/matrixcookbook.pdf"
      },
      {
        "title": "Baydin, Pearlmutter, Radul & Siskind (2018), Automatic Differentiation in Machine Learning: A Survey",
        "url": "https://arxiv.org/abs/1502.05767"
      },
      {
        "title": "Soudry, Hoffer, Nacson, Gunasekar & Srebro (2018), The Implicit Bias of Gradient Descent on Separable Data",
        "url": "https://arxiv.org/abs/1710.10345"
      },
      {
        "title": "Chen, Xu, Zhang & Guestrin (2016), Training Deep Nets with Sublinear Memory Cost",
        "url": "https://arxiv.org/abs/1604.06174"
      }
    ],
    "demos": [
      "backprop",
      "gradient-descent",
      "bayes",
      "pca"
    ]
  },
  "portfolio-capstone": {
    "level": "core",
    "body": {
      "intuition": [
        "The last lesson of the curriculum, and it is about the artefact that carries everything else: a project you can defend end to end. The project round has the highest controllable variance of any round, it is chronically underprepared relative to coding, and the fix is a writing exercise rather than a technical one.",
        "The failure is almost never that the project is uninteresting. It is that the candidate cannot separate what THEY did from what the team did, cannot state the alternative they rejected, and cannot say what the result was in a number. Those three gaps are why a strong project produces a weak round, and pre-writing four sentences per project closes all of them.",
        "This is also where the module's thesis and the curriculum's converge. Lesson 25-01 measured that structure amplifies with the sign of your level - moving P(offer) from 0.522 to 0.792 at the 95th percentile and from 0.108 to 0.025 at the 75th. The twenty-four modules before this one are the substance; this lesson is the transmission. Neither works alone, and the order matters: substance first, then legibility."
      ],
      "math": [
        {
          "h": "The four sentences that convert a project into a story",
          "paras": [
            "Write these once per project, before any interview. They are not a script to recite - they are an index that makes the round's questions answerable without improvising under pressure.",
            "The fourth is the one candidates omit and the one interviewers weight most."
          ],
          "tex": "\\text{(1) the decision I owned} \\;\\cdot\\; \\text{(2) the option I rejected, and why} \\;\\cdot\\; \\text{(3) the metric that moved, by how much} \\;\\cdot\\; \\text{(4) what I would do differently}",
          "texNote": "Four sentences per project, three or four projects, is under an hour of writing. It converts the highest-variance round in the loop into one of the lowest, which is the best return available in interview preparation."
        },
        {
          "h": "★ Why this round deserves the time",
          "paras": [
            "From the loop model in lesson 25-01: the levers available to a candidate are position in the ranking and the variance with which an interviewer reads you, and the second is the one available this week.",
            "The condition attached to that advice is the honest part and it applies here too."
          ],
          "tex": "P(\\text{offer})\\ \\text{at a top-10\\% bar}: \\quad 95\\text{th pct } 0.522 \\to \\mathbf{0.792}, \\quad 90\\text{th } 0.335 \\to 0.413, \\quad 75\\text{th } 0.108 \\to \\mathbf{0.025} \\quad (\\sigma: 1.5 \\to 0.7)",
          "texNote": "Legibility amplifies with the sign of your actual level. That is why this lesson is last: the substance had to come first, and a well-told story about work you did not really do is worse than no story."
        },
        {
          "h": "The take-home rubric, in the reviewer's order",
          "paras": [
            "Reviewers read in a predictable order and stop early on a bad signal. Optimize for the first two minutes."
          ],
          "tex": "\\text{README} \\to \\text{results \\& evaluation} \\to \\text{leakage check} \\to \\text{code structure} \\to \\text{tests} \\to \\text{limitations}",
          "texNote": "A modest result reported honestly with a diagnosis beats a suspiciously good one with no interrogation - because the reviewer's first suspicion of an unexpectedly strong number is that it leaked, and you want to have answered that before they ask."
        }
      ],
      "code": [
        {
          "h": "★ What a defensible project contains",
          "paras": [
            "The bar is not novelty. It is that every claim in it survives one follow-up question."
          ],
          "code": "# A BASELINE YOU BEAT, and by how much, with a confidence interval\n#   'GBDT 0.842 +/- 0.011 against a majority-class baseline of 0.71'\n#   -> a number with no baseline is not a result\n\n# A METRIC CHOSEN FOR A STATED REASON\n#   'PR-AUC, because the base rate is 0.4% and ROC-AUC is silent about\n#    the operating point we'd actually ship'\n\n# A LEAKAGE CHECK YOU RAN AND CAN NAME\n#   'split by user before any scaling or imputation; time-ordered split\n#    because the target is temporal'\n\n# A DECISION YOU OWNED AND AN OPTION YOU REJECTED\n#   'chose logistic over GBDT because the output feeds a cost threshold\n#    and I needed calibration; cost ~2 points of PR-AUC'\n\n# AN HONEST LIMITATION\n#   'the labels come from manual review, so they inherit the reviewers'\n#    bias, and I could not measure that with the data available'\n\n# ★ Each of these is one sentence and each pre-answers the obvious\n#   follow-up. That is the whole technique.",
          "caption": "Notice that four of the five are curriculum habits: a baseline, a justified metric, a leakage check, and a stated limitation."
        },
        {
          "h": "The curriculum in one page",
          "paras": [
            "The through-line across twenty-five modules, stated as questions rather than as facts, because the questions are what transfer."
          ],
          "code": "# WHAT IS THE REFERENCE CLASS?      every number holds over a set. State it\n#   in the same sentence.            (M24: ECE 0.011 overall, 0.153 minority)\n\n# WHAT ASSUMPTION IS DOING THE WORK? data never identifies a causal effect;\n#                                    an untestable assumption does. (M23)\n\n# WHAT CONSUMES THIS NUMBER?         order-only -> calibration optional.\n#                                    A price or a threshold -> it must be right.\n\n# WHERE DOES THE LABEL COME FROM?    how delayed, how biased, and is it\n#                                    CENSORED by the system's own actions?\n\n# WHAT DOES THE ARITHMETIC ALLOW?    latency and memory budgets eliminate\n#                                    most designs before taste enters. (M17, M25)\n\n# WHAT WOULD MAKE ME REVERT?         treat your own design as a hypothesis.\n\n# ★ Six questions. They take under two minutes and they locate the hard\n#   part of essentially any applied ML problem - which is what twenty-five\n#   modules were for.",
          "caption": "None of these is a technique. They are the habits the techniques were teaching, and they outlive every framework in the curriculum."
        }
      ],
      "useCases": [
        "The project deep-dive round, which is the highest-variance round in most loops and the one most improved by an hour of writing.",
        "Take-home exercises, where the README, the evaluation section and the honest limitations do more work than the model choice.",
        "Writing a design doc or a project retrospective at work, where the same four sentences produce a document people can argue with.",
        "Choosing what to build next, since a project that cannot answer the four questions is one you will not be able to defend regardless of how well it works."
      ],
      "pitfalls": [
        "Preparing the project round by re-reading the code. The failure is narrative, not technical - what you owned, what you rejected, what moved, what you would change.",
        "Reporting a number with no baseline. A result without a comparison is not a result, and the follow-up will arrive immediately.",
        "Omitting the limitations section. It is the highest-signal paragraph in most take-homes and it is almost always absent.",
        "Over-engineering a take-home. A two-hour brief answered with Docker, a config framework and three model classes reads as poor scope judgement rather than thoroughness.",
        "Reporting a suspiciously good number without interrogating it. The reviewer's first hypothesis is leakage, so state the split and the check before they ask.",
        "Claiming team work as your own. It collapses under one follow-up, and the collapse costs more than the credit was worth - the bluff asymmetry from the breadth round.",
        "Polishing the story before having the substance. Legibility amplifies with the sign of your level, and at the 75th percentile it took P(offer) from 0.108 to 0.025."
      ],
      "connections": [
        {
          "ref": "interview-capstone/interview-landscape",
          "text": "The measurement that justifies spending an hour here: this is the round with the most controllable variance, and variance is what loses loops you should have won."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "The reference-class discipline applied to your own writeup - every number with the set it holds over, stated in the same sentence."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Where the numbers in a good project story come from, and why a result with a confidence interval reads differently from a point estimate."
        },
        {
          "ref": "mlops/system-design",
          "text": "The production context that makes a project defensible - what you monitored, what broke, and what you would revert."
        },
        {
          "ref": "interview-capstone/system-design-framework",
          "text": "The same skeleton applied to your own work, which is why a project you can walk through the eight steps is one you can defend."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ Give the four sentences per project.",
          "a": "The decision I owned · the option I rejected and why · the metric that moved and by how much · what I'd do differently. Four sentences × four projects is under an hour."
        },
        {
          "q": "Which is most often omitted?",
          "a": "The fourth — what you'd do differently — and it's the one interviewers weight most, because it shows you treat your own work as a hypothesis."
        },
        {
          "q": "Why does this round deserve the time?",
          "a": "It has the highest CONTROLLABLE variance in the loop and is chronically underprepared relative to coding, where practice material is abundant and legibility gains are small."
        },
        {
          "q": "What's the honest condition on that advice?",
          "a": "Legibility amplifies with the sign of your level: σ 1.5→0.7 moved P(offer) 0.522 → **0.792** at the 95th percentile and 0.108 → **0.025** at the 75th."
        },
        {
          "q": "What does a defensible result need?",
          "a": "A baseline you beat, by how much, with an interval. A number with no comparison is not a result."
        },
        {
          "q": "What does a metric choice need?",
          "a": "A stated reason: \"PR-AUC because the base rate is 0.4% and ROC-AUC is silent about the operating point we'd ship.\""
        },
        {
          "q": "Name the leakage checks worth stating.",
          "a": "Split by user BEFORE any scaling or imputation; time-ordered split when the target is temporal; no future information in features."
        },
        {
          "q": "Why state limitations explicitly?",
          "a": "It's the highest-signal paragraph in most take-homes and almost always absent. It also pre-answers the reviewer's first suspicion."
        },
        {
          "q": "What's the reviewer's reading order for a take-home?",
          "a": "README → results & evaluation → leakage check → code structure → tests → limitations. Optimize for the first two minutes."
        },
        {
          "q": "Modest result or suspiciously good one?",
          "a": "A modest result reported honestly with a diagnosis beats a suspiciously good one with no interrogation — the reviewer's first hypothesis is leakage."
        },
        {
          "q": "Why not over-engineer a take-home?",
          "a": "Docker, a config framework and three model classes on a two-hour brief reads as poor scope judgement, not thoroughness."
        },
        {
          "q": "★ Give the curriculum's six questions.",
          "a": "What's the reference class? · What assumption is doing the work? · What consumes this number? · Where does the label come from? · What does the arithmetic allow? · What would make me revert?"
        }
      ],
      "standard": [
        {
          "q": "How would you prepare for a project deep-dive round?",
          "a": "AS A WRITING EXERCISE, NOT A TECHNICAL ONE, because the failure is almost never that the project is uninteresting. It is that the candidate cannot separate what THEY did from what the team did, cannot name the alternative they rejected, and cannot say what the result was in a number. THE FIX IS FOUR SENTENCES PER PROJECT, written once, before any interview: the decision I owned, the option I rejected and why, the metric that moved and by how much, and what I would do differently. Four sentences across three or four projects is under an hour, and it converts the highest-variance round in the loop into one of the lowest. THE FOURTH IS THE ONE PEOPLE OMIT and the one interviewers weight most, because it demonstrates that you treat your own work as a hypothesis rather than as a monument — which is the disposition this whole curriculum has been building. I'D ALSO REHEARSE THE HANDOFF between the two-minute version and the ten-minute version, since interviewers ask for one and get the other constantly, and being able to give a genuinely two-minute summary and then say 'happy to go deeper on the evaluation or the serving side' hands them the pacing control they need.",
          "deepDive": "The 'what would you do differently' answer has a failure mode worth avoiding: it should be a real technical judgement, not a humility performance. 'I'd have written more tests' is a non-answer; 'I'd have logged the assignment propensities from the start, because without them I couldn't answer any counterfactual question about the ranker later and retrofitting it onto the logs was impossible' is a real one, and it demonstrates that you learned something transferable. The same applies to the rejected option — 'I chose logistic regression over a GBDT because the output fed a cost-based threshold and I needed calibration, which cost about two points of PR-AUC' contains a decision, a constraint, a trade and a number in one sentence. Those sentences are hard to produce under pressure and easy to produce at a desk, which is precisely why pre-writing them is the highest-return hour in interview preparation. It is also useful independent of interviewing: a project you cannot summarize in four sentences is one you have not finished thinking about."
        },
        {
          "q": "What makes a take-home submission strong?",
          "a": "THE WRITING, BECAUSE NOBODY IS WATCHING YOU REASON. In a live round the interviewer sees your thinking and the code can be sparse; in a take-home the code alone is a low-signal artefact and the README is the only channel. SO: A README stating the problem as you understood it, your assumptions, the results with numbers, and what you would do with more time. AN EVALUATION SECTION THAT TAKES ITSELF SERIOUSLY — a metric chosen for a stated reason, a baseline, a variance estimate or interval rather than a point estimate, and a per-segment breakdown, which is module 24's reference-class discipline applied to a two-hour exercise for almost no extra cost. AN EXPLICIT LEAKAGE CHECK, because the reviewer's first hypothesis about a surprisingly good number is that it leaked, and stating the split — by user, before any scaling or imputation, time-ordered if the target is temporal — answers that before it is asked. A TEST FILE, even a small one, because it is the most commonly missing item and demonstrates the habit. AND AN HONEST LIMITATIONS SECTION, the highest-signal paragraph in most submissions and almost always absent. WHAT I'D AVOID IS OVER-ENGINEERING: a two-hour brief answered with Docker, a config framework and three model classes reads as poor scope judgement.",
          "deepDive": "The strongest submissions are usually a simple baseline done carefully with the evaluation taken seriously, which surprises people who expect novelty to be the bar. The reason is that a reviewer is trying to predict what you will be like as a colleague, and careful beats clever for that purpose almost every time. There is also a specific asymmetry about results: if your number is unimpressive, say so plainly with a diagnosis — 'the signal in these features is weak; a majority-class baseline gets 0.71 and my best model gets 0.74, and I think the ceiling here is the label quality rather than the model' — because that reads as judgement, while an unexplained mediocre result reads as inability. Conversely a suspiciously strong number with no interrogation is the worst outcome, since the reviewer will assume leakage and you will not be there to correct them. The general habit is the one the curriculum keeps returning to: state what the number holds over, state what could have made it wrong, and state what you checked."
        },
        {
          "q": "How do you talk about work that was mostly done by a team?",
          "a": "PRECISELY, AND WITHOUT INFLATING IT, because the inflation collapses under one follow-up and the collapse costs more than the credit was worth — the same asymmetry as bluffing in the breadth round, where one detected overstatement converts every other claim into something requiring verification. THE FORM THAT WORKS is to state the team's scope, then your slice, then the specific decisions inside your slice: 'the team built the ranking stack; I owned the candidate-generation service, and the decision I'd point to is that I measured retrieval recall separately and found it was the ceiling at 0.70, which redirected the next quarter's roadmap away from the ranker.' THAT IS HONEST AND STRONGER THAN A VAGUE CLAIM TO THE WHOLE SYSTEM, because it contains a specific act of judgement that only the person who did it would produce. IF YOUR CONTRIBUTION WAS GENUINELY SMALL on a big impressive project, say so and pick a different project to go deep on — a small system you owned entirely is better interview material than a large one you touched, and interviewers are explicitly trying to find the boundary of what you did. THE QUESTION THEY ARE ASKING is not how impressive the project was; it is whether your resume is load-bearing.",
          "deepDive": "There is a related trap in the opposite direction, which is undersell — engineers who worked on something substantial and describe it so modestly that no decision is visible. 'I helped with the feature pipeline' contains no information. The fix is the same four sentences: even a modest contribution has a decision you owned and an option you rejected, and stating them at the right scale is accurate rather than boastful. It is worth rehearsing the boundary language explicitly, because it is awkward to improvise: 'that part was owned by a colleague, so I can tell you the interface and the constraint it put on my side but not the internals' is a completely acceptable answer and reads as precision. The interviewer generally knows what one person can do in the stated time, so a claim that exceeds it triggers exactly the follow-up you cannot survive. Being the person who is clearly accurate about their own scope is a stronger signal than being the person with the biggest project, and it is entirely under your control."
        },
        {
          "q": "If you had one week before a loop, how would you spend it?",
          "a": "BY CONTROLLABLE VARIANCE, WHICH IS THE MEASUREMENT FROM LESSON 25-01. ONE HOUR: write the four sentences for each project. This is the single highest-return activity in the week because the project round is high-variance and chronically underprepared. THREE TO FOUR HOURS: run the breadth list on a timer, three beats each, and note every concept where you cannot name a failure mode — that produces a specific list of maybe five gaps rather than a vague sense of underpreparedness, and it is bounded and finishable. THREE TIMED MOCK DESIGN CASES, out loud, with someone giving feedback on STRUCTURE rather than content, because the design round has the most controllable variance and the failure is usually presentation order rather than knowledge. AN AFTERNOON on the five coding patterns until they are automatic, and one pass through the six derivations with their standard perturbations. AND THE REST ON REST, because loop performance is fatigue-sensitive and a fifth mock case is worth less than being sharp. WHAT I WOULD NOT DO is another fifty algorithm problems, which is where the hours usually go and where the marginal return is lowest.",
          "deepDive": "The reason mock interviews outperform solo practice by more than their content justifies is that what they train is the TRANSMISSION, and transmission is what the loop model says decides outcomes you should have won. Solving a design case in your head and solving it out loud to someone who can be confused are different skills, and only the second is tested. That also explains a pattern worth naming: strong engineers sometimes interview badly not from lack of knowledge but because they solve internally and then state a conclusion, which transmits almost nothing — the high-variance presentation from 25-01. The remedy is uncomfortable and fast. If no partner is available, recording yourself and listening back is a surprisingly good substitute, because the gap between what you think you said and what a listener received is obvious on playback and invisible in the moment. One week is enough to close most of it, which is the genuinely encouraging finding in this module."
        },
        {
          "q": "What is the through-line of this curriculum?",
          "a": "SIX QUESTIONS, AND THEY ARE HABITS RATHER THAN TECHNIQUES. WHAT IS THE REFERENCE CLASS — every number holds over a set, and the set belongs in the same sentence as the number; an ECE of 0.011 overall was 0.153 for a minority subgroup. WHAT ASSUMPTION IS DOING THE WORK — data never identifies a causal effect, an untestable assumption does, and the diagnostics systematically check something else. WHAT CONSUMES THIS NUMBER — an ordering makes calibration optional, and a price or a cost threshold makes it mandatory, worth up to 36.9% of revenue in the ads case. WHERE DOES THE LABEL COME FROM — how delayed, how biased, and is it censored by the system's own actions, which was the same finding three times across the design cases. WHAT DOES THE ARITHMETIC ALLOW — a latency budget eliminated most architectures before taste entered, and 115 ms permits 128 cross-encoder items or 10 LLM items. AND WHAT WOULD MAKE ME REVERT — treating your own design as a hypothesis. SIX QUESTIONS, UNDER TWO MINUTES, and they locate the hard part of essentially any applied ML problem. That is what twenty-five modules were for.",
          "deepDive": "It is worth being explicit that none of the six is a technique, because techniques were the surface and the habits are the content. Frameworks will churn — module 22 made that its thesis and the environment demonstrated it by not having half the libraries installed — while the questions survive, and a candidate or engineer who has the questions can pick up a technique in an afternoon. The reverse is not true. It is also why the curriculum ends with a communication lesson rather than a technical one: every question in that list is a thing you have to SAY, out loud, to a colleague or an interviewer or in a design doc, and a habit exercised only internally does not change any decision. The measured version from 25-01 is that structure amplifies with the sign of your level, which is the honest closing note — the twenty-four technical modules were the sign, and this one is the amplifier, and the amplifier is worthless applied to the wrong sign."
        },
        {
          "q": "What went wrong in building this module, and what does it illustrate?",
          "a": "MY FIRST VERSION OF THIS MODULE'S CENTRAL CLAIM WAS WRONG, AND IT WAS WRONG IN THE DIRECTION I EXPECTED — which is the most dangerous kind of error. The thesis is that reducing an interviewer's measurement variance is a lever a candidate controls, and to measure it I compared P(offer) at different noise levels. THE FIRST COMPARISON HELD THE THRESHOLD FIXED while changing the noise, which is invalid: lowering the noise narrows the score distribution, so fewer candidates clear a threshold calibrated to a wider one, and the result came out saying that reducing noise HURT everyone. I nearly wrote that up as a surprising finding. THE CORRECT COMPARISON HOLDS THE ACCEPT RATE FIXED, because the company hires a fixed fraction either way, and it produced something better than my hypothesis: a CROSSOVER. Structure moves P(offer) from 0.522 to 0.792 at the 95th percentile and from 0.108 to 0.025 at the 75th, because for a candidate below the bar interviewer noise is a lottery ticket and legibility cashes it in. SO THE HONEST ADVICE IS CONDITIONAL, and I would not have found the condition if the first version had happened to come out the way I expected.",
          "deepDive": "That is the second time in three modules the same shape appeared, which makes it the finding worth ending on. Module 24 shipped an invalid certified-robustness radius, caught only because certified accuracy exceeded empirical accuracy and a lower bound cannot exceed what it bounds. Here the error was an invalid comparison, caught only because the result contradicted a mechanism I could reason about independently. IN BOTH CASES THE CODE WAS CORRECT AND THE QUESTION WAS WRONG, which no amount of review finds — the check that worked was an invariant or a mechanism computed separately from the thing being tested. And in both cases the corrected version was more interesting than the original hypothesis: the certificate got a real abstention rate and a real gap, and the interview advice got a condition that makes it honest rather than motivational. The habit that generalizes, and the one I would put last in a curriculum: when a result confirms what you expected, look for the invariant that would have caught you if it had not."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ The four sentences per project",
        "back": "(1) The decision I OWNED. (2) The option I REJECTED, and why. (3) The metric that moved, BY HOW MUCH. (4) What I'd do DIFFERENTLY. Under an hour for four projects; converts the highest-variance round into one of the lowest."
      },
      {
        "type": "intuition",
        "front": "Which sentence is omitted, and why it matters",
        "back": "The fourth. Interviewers weight it most because it shows you treat your own work as a HYPOTHESIS. And it must be a real technical judgement — \"more tests\" is a non-answer; \"I'd have logged propensities from day one\" is not."
      },
      {
        "type": "intuition",
        "front": "★ Why this round, and the honest condition",
        "back": "Highest CONTROLLABLE variance, chronically underprepared. But legibility amplifies with the sign of your level: σ 1.5→0.7 gives 0.522 → **0.792** at the 95th pct and 0.108 → **0.025** at the 75th. Substance first, then transmission."
      },
      {
        "type": "definition",
        "front": "What a defensible result contains",
        "back": "A BASELINE you beat, by how much, with an interval · a metric chosen for a STATED reason · a leakage check you can NAME · a decision owned + option rejected · an honest limitation. One sentence each; each pre-answers the obvious follow-up."
      },
      {
        "type": "intuition",
        "front": "The take-home reading order",
        "back": "README → results & evaluation → leakage check → code structure → tests → limitations. Reviewers stop early on a bad signal — optimize the first two minutes."
      },
      {
        "type": "pitfall",
        "front": "Modest vs suspiciously good",
        "back": "A modest number reported honestly WITH a diagnosis beats a strong one with no interrogation — the reviewer's first hypothesis about an unexpectedly good result is leakage, and you won't be there to correct them."
      },
      {
        "type": "pitfall",
        "front": "Over-engineering a take-home",
        "back": "Docker + a config framework + three model classes on a two-hour brief reads as poor SCOPE JUDGEMENT, not thoroughness. The strongest submissions are a simple baseline done carefully with the evaluation taken seriously."
      },
      {
        "type": "intuition",
        "front": "Talking about team work",
        "back": "Team scope → your slice → a specific decision inside it. \"That part was owned by a colleague; I can give you the interface and the constraint but not the internals\" reads as PRECISION. The question is whether your resume is load-bearing."
      },
      {
        "type": "intuition",
        "front": "One week before a loop",
        "back": "1 hr: the four sentences. 3–4 hrs: breadth list on a timer, note every missing failure mode. 3 timed mock DESIGN cases out loud. An afternoon on the five coding patterns + six derivations. Rest. NOT fifty more algorithm problems."
      },
      {
        "type": "intuition",
        "front": "Why mocks beat solo practice",
        "back": "They train TRANSMISSION, which is what the loop model says decides outcomes. Solving internally then stating a conclusion transmits almost nothing — the high-variance presentation. Recording yourself is a surprisingly good substitute."
      },
      {
        "type": "intuition",
        "front": "★ The curriculum's six questions",
        "back": "What's the REFERENCE CLASS? · What ASSUMPTION is doing the work? · What CONSUMES this number? · Where does the LABEL come from (delayed? biased? censored)? · What does the ARITHMETIC allow? · What would make me REVERT?"
      },
      {
        "type": "intuition",
        "front": "★ The habit to end on",
        "back": "Twice in three modules a result was wrong while the code was correct — an invalid certificate (caught by certified > empirical) and an invalid comparison (caught by a mechanism reasoned separately). **When a result confirms what you expected, look for the invariant that would have caught you if it hadn't.**"
      }
    ],
    "refs": [
      {
        "title": "Huyen (2022), Designing Machine Learning Systems",
        "url": "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"
      },
      {
        "title": "Kapoor & Narayanan (2023), Leakage and the Reproducibility Crisis in Machine-Learning-Based Science",
        "url": "https://www.cell.com/patterns/fulltext/S2666-3899(23)00159-9"
      },
      {
        "title": "Mitchell et al. (2019), Model Cards for Model Reporting",
        "url": "https://arxiv.org/abs/1810.03993"
      },
      {
        "title": "Google re:Work, Guide to Structured Interviewing",
        "url": "https://rework.withgoogle.com/en/guides/hiring-use-structured-interviewing"
      },
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      }
    ],
    "demos": [
      "canary-rollout",
      "drift-detection",
      "fairness",
      "model-cascade"
    ]
  }
};
