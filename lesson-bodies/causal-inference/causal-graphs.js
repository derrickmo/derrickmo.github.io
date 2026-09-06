// GENERATED from content/lessons/causal-inference/causal-graphs.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/causal-inference/causal-graphs/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "causal-graphs": {
    "level": "core",
    "body": {
      "intuition": [
        "A causal graph is a way of writing your assumption down so that other people can attack it. That is its entire job. It does not extract causation from correlation and it does not tell you which arrows to draw - you supply the arrows from domain knowledge, and the graph converts them into testable implications and an unambiguous rule for which variables to control for.",
        "Everything follows from three three-node patterns. A CHAIN X -> M -> Y passes association until you condition on M. A FORK X <- Z -> Y passes association until you condition on Z. A COLLIDER X -> C <- Y passes NOTHING until you condition on C, and then it starts. In simulation the chain and fork both went from about +0.5 to +0.002 when conditioned on the middle node, and the collider went from -0.001 to -0.501. Two independent causes became strongly correlated because we looked at their common effect.",
        "The collider is the pattern that makes 'control for everything you have' wrong, and it is why more controls can make an estimate worse. The demonstration that should stay with you: adding controls raised R-squared monotonically from 0.898 to 0.987 while the causal estimate moved from 3.80 to 0.50 against a true value of 3.80. THE BEST-FITTING MODEL WAS THE MOST WRONG ONE."
      ],
      "math": [
        {
          "h": "d-separation: a graph question with a purely mechanical answer",
          "paras": [
            "A path is blocked if it contains a non-collider you conditioned on, or a collider you did NOT condition on and none of whose descendants you conditioned on. Two variables are d-separated given a set if every path between them is blocked.",
            "The colliders' rule is inverted relative to the others, which is the entire source of difficulty. Once you can trace paths, the algorithm is graph search - there is no statistics in it."
          ],
          "tex": "\\text{chain } X\\!\\to\\! M\\!\\to\\! Y:\\ \\rho=0.578 \\to 0.002 \\mid M \\qquad \\text{fork } X\\!\\leftarrow\\! Z\\!\\to\\! Y:\\ \\rho=0.501 \\to 0.002 \\mid Z \\qquad \\text{collider } X\\!\\to\\! C\\!\\leftarrow\\! Y:\\ \\rho=-0.001 \\to -0.501 \\mid C",
          "texNote": "Conditioning BLOCKS in the first two and OPENS in the third. Selection is conditioning in disguise: restricting the sample to the top 20% of the collider produced a correlation of -0.356 between two variables generated independently."
        },
        {
          "h": "The backdoor criterion",
          "paras": [
            "A set Z is admissible if it blocks every path from T to Y that starts with an arrow INTO T, and contains no descendant of T. Then the interventional distribution is identified by adjustment.",
            "The second clause is what rules out mediators and colliders on the causal side, and it is exactly the clause 'control for everything' violates."
          ],
          "tex": "P(Y\\mid do(T{=}t)) = \\sum_{z} P(Y\\mid T{=}t, Z{=}z)\\,P(Z{=}z)",
          "texNote": "Note the second factor: P(z), not P(z | t). That single difference is the whole distinction between observing and intervening - you re-weight to the population's covariate distribution rather than the treated group's."
        },
        {
          "h": "What the data can and cannot identify about the graph",
          "paras": [
            "Observational data determines the graph only up to a Markov equivalence class: DAGs sharing the same skeleton and the same v-structures are indistinguishable, no matter how much data you collect.",
            "Three of the four three-node graphs below produce numerically identical correlation structure. The collider is the one the data CAN pick out, because its signature is inverted."
          ],
          "tex": "\\begin{array}{lcccc} \\text{DAG} & \\rho(X,M) & \\rho(M,Y) & \\rho(X,Y) & \\rho(X,Y\\mid M)\\\\ X\\to M\\to Y & 0.800 & 0.600 & 0.480 & -0.000\\\\ X\\leftarrow M\\leftarrow Y & 0.800 & 0.599 & 0.479 & -0.000\\\\ X\\leftarrow M\\to Y & 0.800 & 0.600 & 0.480 & 0.002\\\\ X\\to M\\leftarrow Y & 0.601 & 0.601 & 0.001 & -0.563 \\end{array}",
          "texNote": "Rows 1-3 agree to three decimals at n = 1,000,000. Intervening on X changes Y in row 1 and in none of the others. Discovery algorithms return the CLASS, and choosing within it is a modelling decision you make, not a result the data hands you."
        }
      ],
      "code": [
        {
          "h": "'Adjust for everything you have' is wrong, measured",
          "paras": [
            "Z is a genuine confounder, Med is a mediator on the causal path, Col is caused by both treatment and outcome. True total effect 3.800."
          ],
          "code": "# Z   -> T,  T -> Med -> Y,  T -> Y,  Z -> Y,  T -> Col <- Y\n\n# Y ~ T                     4.298   confounded\n# Y ~ T + Z    (BACKDOOR)   3.803   <- correct, and the SMALLEST model that is\n# Y ~ T + Z + Med           1.998   <- mediator blocks the indirect path\n# Y ~ T + Z + Col           0.131   <- collider opens a spurious path\n# Y ~ T + Z + Med + Col     0.504   <- kitchen sink\n\n# and the fit statistic, over the same four rows:\n#   R^2   0.8978 -> 0.9125 -> 0.9732 -> 0.9865      MONOTONICALLY BETTER\n\n# ★ The best-fitting model is the most wrong one, and no quantity computed\n#   from the residuals can tell the difference. The DAG can.",
          "caption": "Model selection by predictive fit selects against the correct causal specification here. That is not a quirk of this simulation; it is what fit statistics are for."
        },
        {
          "h": "The three rules of do-calculus, and what they are for",
          "paras": [
            "Each rule licenses a rewrite of an expression containing do(). Applied repeatedly, they either reduce the expression to observational quantities - identified - or they do not, and the effect is not identifiable from that graph."
          ],
          "code": "# Rule 1  insert/delete an OBSERVATION\n#   P(y | do(t), z, w) = P(y | do(t), w)      if (Y ⫫ Z | T,W) in G_T̄\n\n# Rule 2  exchange an ACTION for an OBSERVATION   <- this is the backdoor rule\n#   P(y | do(t), w)    = P(y | t, w)          if (Y ⫫ T | W) in G_T_\n\n# Rule 3  insert/delete an ACTION\n#   P(y | do(t), w)    = P(y | w)             if (Y ⫫ T | W) in G_T̄(W)\n\n# ★ COMPLETENESS (Shpitser & Pearl 2006): if these three rules cannot reduce\n#   the expression, NO method can identify it from that graph and observational\n#   data. A negative answer here is a proof, not a failure to find a trick.",
          "caption": "The completeness result is why the framework is worth learning: it answers 'is this even possible' before you spend a quarter estimating it."
        }
      ],
      "useCases": [
        "Deciding an adjustment set before you fit anything, which turns a modelling argument into a graph argument that a domain expert with no statistics can join.",
        "Reviewing someone else's regression: ask what each control is, and whether any of them is caused by the treatment. Post-treatment controls are the single most common error in applied work.",
        "Diagnosing suspicious correlations in observational logs, where sample restriction - only logged-in users, only sessions over 30 seconds, only successful requests - is collider conditioning by another name.",
        "Deriving falsification tests: a proposed DAG implies specific conditional independences, and those can be checked in the data even though the DAG itself cannot."
      ],
      "pitfalls": [
        "Controlling for a mediator when you want the total effect. The estimate drops to the direct effect - 1.998 against a truth of 3.800 - and it looks like a well-behaved regression the whole time.",
        "Controlling for a collider. It manufactures association where none existed: 0.131 against a truth of 3.800, and the conditional correlation between two independent variables went from -0.001 to -0.501.",
        "Selecting the sample on a collider. Restricting to the top 20% of a common effect produced a -0.356 correlation between independent variables. 'Only users who converted' and 'only patients who were admitted' are this exact mistake.",
        "Choosing controls by what improves R-squared or held-out loss. Fit rose monotonically across the sequence in which the causal estimate degraded by 87%.",
        "Believing a causal discovery algorithm outputs a DAG. It outputs an equivalence class; three of the four graphs above are indistinguishable at a million samples and disagree about whether intervening on X does anything at all.",
        "Drawing the graph after seeing the estimates, which converts a falsifiable assumption into a post-hoc rationalisation. Draw it first, write it down, and let it be wrong.",
        "Assuming a variable is safe to include because it is 'pre-treatment'. An M-bias structure can make a pre-treatment collider harmful, so the criterion is the path, not the timestamp."
      ],
      "connections": [
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "The same assumption in the other dialect: conditional ignorability given Z is exactly the statement that Z satisfies the backdoor criterion."
        },
        {
          "ref": "causal-inference/confounding",
          "text": "The fork pattern at full strength, with a real dataset where the sign reverses and the deciding fact is not in the table."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "What to do when no admissible adjustment set exists - a different graph pattern that identifies the effect without ever measuring the confounder."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "Graphical models used for the other purpose - factorizing a joint distribution for inference - where the arrows carry no interventional meaning and the same picture means something weaker."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Where the mediator-versus-confounder distinction becomes a legal and ethical question, because path-specific effects decide which discrimination pathways count."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the three elementary path structures.",
          "a": "Chain X→M→Y, fork X←Z→Y, collider X→C←Y. Conditioning blocks the first two and OPENS the third."
        },
        {
          "q": "State d-separation in one sentence.",
          "a": "A path is blocked if a conditioned non-collider sits on it, or an unconditioned collider (with no conditioned descendant) sits on it; d-separated means every path is blocked."
        },
        {
          "q": "What is the backdoor criterion?",
          "a": "Z blocks every path from T to Y with an arrow into T, and contains no descendant of T. Then adjusting for Z identifies the causal effect."
        },
        {
          "q": "Why is the second clause of the backdoor criterion there?",
          "a": "It excludes post-treatment variables - mediators and colliders - which are exactly what 'control for everything' wrongly includes."
        },
        {
          "q": "Write the adjustment formula and say what is unusual about it.",
          "a": "P(Y|do(t)) = Σ_z P(Y|t,z)P(z). The weight is P(z), not P(z|t) — that is the difference between intervening and observing."
        },
        {
          "q": "What is a Markov equivalence class?",
          "a": "The set of DAGs with the same skeleton and same v-structures. Observational data cannot distinguish within it, however large."
        },
        {
          "q": "Which three-node graphs are indistinguishable from data?",
          "a": "X→M→Y, X←M←Y and X←M→Y — identical to three decimals at n=1M. Only the collider X→M←Y is separable."
        },
        {
          "q": "What happens if you control for a mediator?",
          "a": "You get the direct effect, not the total. Simulated: 1.998 against a true total of 3.800."
        },
        {
          "q": "What happens if you control for a collider?",
          "a": "You open a spurious path. Simulated: 0.131 against a true 3.800, and independent variables went to ρ = −0.501."
        },
        {
          "q": "How is sample selection related to colliders?",
          "a": "Selection IS conditioning. Restricting to the top 20% of a common effect produced ρ = −0.356 between independent variables."
        },
        {
          "q": "Can R-squared help you choose controls?",
          "a": "No, and it actively misleads: R² rose 0.898→0.987 across the exact sequence in which the causal estimate fell from 3.80 to 0.50."
        },
        {
          "q": "What does the completeness of do-calculus give you?",
          "a": "If the three rules cannot reduce the expression, no method identifies that effect from that graph and observational data. A proof of impossibility, not a failed search."
        }
      ],
      "standard": [
        {
          "q": "Explain d-separation and the backdoor criterion, and why the collider case is the one that trips people.",
          "a": "D-SEPARATION IS A GRAPH-SEARCH QUESTION WITH A MECHANICAL ANSWER. Association flows along paths, and a path is blocked in one of two ways: a non-collider on it that you conditioned on, or a collider on it that you did NOT condition on and none of whose descendants you conditioned on. Two variables are d-separated given a set when every path between them is blocked, which implies conditional independence. The three primitives are chain X→M→Y, fork X←Z→Y and collider X→C←Y, and in simulation the chain went from ρ = 0.578 to 0.002 given M, the fork from 0.501 to 0.002 given Z, and the collider from −0.001 to −0.501 given C. THE COLLIDER'S RULE IS INVERTED, which is the whole source of difficulty: for two of the three patterns conditioning removes association, and for the third it creates it. THE BACKDOOR CRITERION IS THE PAYOFF. A set Z is admissible if it blocks every path from T to Y that begins with an arrow into T, and contains no descendant of T. Then P(Y|do(t)) = Σ_z P(Y|t,z)P(z) — note P(z) and not P(z|t), which is precisely the difference between intervening and observing. The second clause is the one that makes 'adjust for everything you have' wrong, because everything you have usually includes post-treatment variables.",
          "deepDive": {
            "q": "Why does the collider case trip up people who come from predictive modelling?",
            "a": "The reason people trip on colliders is that the intuition transfers wrongly from prediction, where more conditioning is more information and the worst case is variance. Here conditioning has a direction. The cleanest way to internalise it is the selection version: restrict the sample to the top 20% of a variable that two independent causes both feed, and those causes acquire ρ = −0.356. That is not a subtle bias, and it has a familiar shape — among admitted patients, among users who converted, among applicants who were hired, among papers that got published. Each of those is a collider restriction, and each manufactures a negative association between the qualities that got you in. The practical habit worth building is that every filter in a query is a conditioning statement, so a WHERE clause deserves the same scrutiny as a covariate list. Note also that the timestamp heuristic is not quite safe: M-bias is a structure where a pre-treatment variable is a collider on a path between two unmeasured confounders, so conditioning on it opens a backdoor. The criterion is about paths, not about when the variable was recorded."
          }
        },
        {
          "q": "Your colleague adds every available column as a control 'to be safe'. Show them why that is not safe.",
          "a": "I WOULD RUN THE FOUR-ROW TABLE, BECAUSE IT IS FASTER THAN THE ARGUMENT. Simulate a confounder Z that causes both treatment and outcome, a mediator on the path T→Med→Y, and a collider caused by both T and Y, with a known total effect of 3.800. Regressing Y on T alone gives 4.298, confounded. Adding Z — the correct backdoor set — gives 3.803. Adding the mediator on top gives 1.998, because conditioning on Med blocks the indirect path and leaves the direct effect. Adding the collider gives 0.131, because it opens a spurious path. The kitchen sink gives 0.504. SO THE CORRECT MODEL IS THE SECOND-SMALLEST ONE, and three of the four specifications are wrong in three different directions. THEN THE PART THAT LANDS: R-squared over the same sequence goes 0.8978, 0.9125, 0.9732, 0.9865. It improves monotonically, exactly as the causal estimate degrades by 87%. If you select controls by fit, cross-validated loss, or feature importance, you will reliably choose the worst specification, because those criteria measure agreement with observed Y and every post-treatment variable is enormously informative about observed Y. 'To be safe' has it backwards — including a variable is a claim, and the safe default is to include only what an argument justifies.",
          "deepDive": {
            "q": "Is there a defensible version of your colleague's instinct?",
            "a": "There is a legitimate version of the colleague's instinct, and it is worth granting so the advice is actionable rather than just prohibitive. Adding PRE-TREATMENT variables that predict the outcome but not treatment is usually beneficial: it does not bias the estimate and it reduces residual variance, so precision improves. Adding pre-treatment variables that predict TREATMENT but not the outcome is the bad kind of harmless — they are instruments-in-waiting, and conditioning on them amplifies whatever unmeasured confounding bias exists, a phenomenon known as Z-bias or bias amplification. So the ranking is: confounders first, then outcome predictors for precision, never treatment-only predictors, never anything post-treatment. If you genuinely do not know the structure, the honest move is to present the estimate under several defensible adjustment sets and report the range, which at least converts a hidden choice into a visible one. What you must not do is pick the specification after seeing which gives the most publishable number, because at that point the graph has become a rationalisation rather than an assumption."
          }
        },
        {
          "q": "What can a causal discovery algorithm actually give you from observational data?",
          "a": "THE EQUIVALENCE CLASS, AND NOT MORE. Constraint-based methods like PC and FCI test conditional independences and return a CPDAG — a graph where some edges are directed and some remain undirected because the data cannot orient them. The reason is structural, not statistical: DAGs sharing a skeleton and the same v-structures imply exactly the same set of conditional independences, so they are observationally equivalent at any sample size. In simulation, X→M→Y, X←M←Y and X←M→Y produced ρ(X,M) = 0.800, ρ(M,Y) ≈ 0.600, ρ(X,Y) ≈ 0.480 and ρ(X,Y|M) ≈ 0.000 — agreeing to three decimals at a million samples. AND THEY DISAGREE ABOUT EVERYTHING THAT MATTERS: intervening on X changes Y in the first and does nothing in the other two. The collider X→M←Y is the one case the data separates, with ρ(X,Y) = 0.001 rising to −0.563 once you condition, an inverted signature nothing else produces. So discovery is genuinely useful for narrowing hypotheses and for finding structure you did not think of, and it is not a substitute for the assumption. Orientation within the class comes from outside the data: time ordering, domain knowledge, an experiment, or a functional-form assumption such as additive non-Gaussian noise.",
          "deepDive": {
            "q": "What do the functional-form methods like LiNGAM actually buy you?",
            "a": "Those functional-form escapes are worth knowing because they are frequently oversold. LiNGAM identifies the direction when relations are linear and noise is non-Gaussian, exploiting the fact that independence of the residual holds in only one direction; ANM and post-nonlinear models do the analogous thing for nonlinear relations with additive noise. Both are real theorems, and both fail quietly when their functional assumption is violated — which is the module's thesis restating itself, since the identification is again bought by an untestable assumption, just one about functional form rather than about confounding. The other practical limitation is that PC assumes causal sufficiency, meaning no unmeasured confounders, which is exactly what you would not assume if you were being careful; FCI relaxes it and pays by returning a still weaker object, a PAG, in which many edges say only 'these are related somehow'. My honest summary in an interview: use discovery to generate candidate structures and to check that the structure you believe is not refuted by the implied independences, then get orientation from design."
          }
        },
        {
          "q": "Walk through the three rules of do-calculus and say what the completeness result means practically.",
          "a": "EACH RULE LICENSES A REWRITE OF AN EXPRESSION CONTAINING do(), justified by a d-separation statement in a MUTILATED graph. Rule 1 inserts or deletes an observation: P(y|do(t),z,w) = P(y|do(t),w) when Y is d-separated from Z given T and W in the graph with arrows into T removed. Rule 2 exchanges an action for an observation: P(y|do(t),w) = P(y|t,w) when Y is d-separated from T given W in the graph with arrows OUT of T removed — this is the backdoor rule, and it is the one that does the work in most applied problems. Rule 3 deletes an action entirely: P(y|do(t),w) = P(y|w) under d-separation in a graph with arrows into a subset of T removed. You apply them repeatedly, and either the do() operators disappear — leaving an expression in observational quantities, so the effect is IDENTIFIED and you now know exactly what to estimate — or they do not. THE COMPLETENESS RESULT SAYS THE SECOND CASE IS FINAL: if these three rules cannot eliminate the do(), then no method whatsoever identifies that effect from that graph plus observational data. Practically, that is a decision procedure you can run before committing resources, and a negative answer is a proof rather than a failure of imagination.",
          "deepDive": {
            "q": "Where does do-calculus earn its keep in practice?",
            "a": "The practical value shows up in two situations. The first is front-door identification, which is the reason to know rule 2 in both directions: if T→M→Y with an unmeasured confounder between T and Y but none touching M, the effect is identified even though no admissible adjustment set exists, by chaining T→M and M→Y. That is a genuinely surprising result and it is unreachable by backdoor reasoning alone. The second is the negative case — someone proposes a study, you sketch the graph, the algorithm returns non-identifiable, and the correct response is to change the DESIGN, not the estimator. Find an instrument, find a discontinuity, get a natural experiment, or measure the missing variable. What you should not do is switch to a more flexible model, because non-identifiability is a statement about the target quantity and no amount of model capacity addresses it. In practice tooling handles the algebra: the ID algorithm is implemented in several libraries, so your job is drawing a defensible graph and interpreting the verdict, not doing the derivations by hand."
          }
        },
        {
          "q": "How would you use a DAG to produce falsification tests rather than just an adjustment set?",
          "a": "A DAG IMPLIES CONDITIONAL INDEPENDENCES, AND THOSE ARE CHECKABLE EVEN THOUGH THE DAG IS NOT. Every d-separation statement in the graph is a prediction about the observed distribution, so I would enumerate them — most tooling will do this — and test each one. Failing tests do not tell you which arrow is wrong, but they do tell you the graph as drawn is inconsistent with the data, which is a real refutation and worth more than any amount of asserting the assumption. This is the closest thing to a test set that causal inference has, and it is worth being precise about its limit: passing every implied independence does not confirm the graph, because everything in the same Markov equivalence class passes identically. SECOND FAMILY: NEGATIVE CONTROLS. A negative control outcome is one the treatment cannot plausibly affect, and finding a nonzero effect there is direct evidence of an open backdoor. A negative control exposure runs it the other way. Both convert 'I believe there is no unmeasured confounding' into a number in the same format as the estimate, which is much harder to wave away. THIRD: PLACEBO AND PRE-PERIOD TESTS, estimating the effect in a window before treatment could have acted, where the answer must be zero. Fourth, if you have a subgroup with known-zero effect, estimate it and check.",
          "deepDive": {
            "q": "What keeps a battery of falsification tests honest?",
            "a": "Two cautions keep this honest. First, these tests have power problems in both directions: an implied independence can fail because of a nonlinearity your test cannot see, and it can pass because your test is underpowered, so a clean falsification report should state the effect sizes it could have detected rather than just p-values. Second, running a large battery of tests and reporting that most passed is a multiple-comparisons exercise, and there is a real temptation to drop the ones that failed. The disciplined version is to pre-register the implied independences from the graph you drew BEFORE looking, then report all of them. That ordering matters more than it sounds: a graph drawn after seeing the estimates is not an assumption, it is a rationalisation, and it has lost the property that made it worth drawing — that it could have been shown wrong. The graph's real function is to make your reasoning attackable, and every one of these tests is an invitation to attack it."
          }
        },
        {
          "q": "Someone says DAGs are academic and they will just use a flexible model. What is your response?",
          "a": "THE FLEXIBLE MODEL AND THE DAG ANSWER DIFFERENT QUESTIONS, and the flexible model does not answer theirs. Model capacity buys you a better approximation of E[Y | T, X] — the observed conditional expectation. Identification is the question of whether that object has anything to do with E[Y | do(T)], and it is settled entirely by which variables are in X and how they relate to T and Y. A gradient boosted model with a thousand features fits the confounded simulation superbly and returns a confidently wrong effect, and its excellent held-out performance is not evidence, because the counterfactual is not in the test set either. THE SHARPEST VERSION IS THE FIT TABLE: across four specifications R-squared improved monotonically 0.898 → 0.987 while the causal estimate went 4.298 → 3.803 → 1.998 → 0.504 against a truth of 3.800. Any automatic model selection procedure driven by predictive loss picks the worst one. I would also grant the legitimate half of their point: modern estimators genuinely help, and double machine learning exists precisely to let you use flexible models for the nuisance functions while keeping a valid estimate of the target. But note what DML requires as input — a set of confounders that satisfies the backdoor criterion. IT ASSUMES THE DAG. It does not discover it.",
          "deepDive": {
            "q": "What are DAGs genuinely bad at?",
            "a": "It is worth naming what DAGs are bad at, so the defence is not evangelism. They are coarse: an arrow means 'may affect' with no sign, magnitude or functional form, so two analysts can agree on the graph and disagree wildly about the estimate. They handle feedback loops and equilibrium systems awkwardly, which matters in economics and in any system with a control loop. They say nothing about measurement error unless you draw it explicitly, and people rarely do. And in a domain with hundreds of variables the graph becomes unreadable, at which point the honest move is to draw the subgraph relevant to the specific effect and state which variables you are assuming irrelevant. The reason to use them anyway is cheapness: sketching a graph takes minutes, catches post-treatment controls immediately, and forces the assumption into a form a domain expert with no statistics can argue with. That last property is the real one — the graph's value is social as much as mathematical, because it moves the argument from 'which regression' to 'what causes what', which is the argument that actually decides the answer."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What a causal graph is for",
        "back": "Writing your assumption down so others can attack it. It does not extract causation from data — you supply the arrows, and it returns testable implications plus an unambiguous adjustment set."
      },
      {
        "type": "definition",
        "front": "The three path structures",
        "back": "Chain X→M→Y (0.578 → 0.002 | M), fork X←Z→Y (0.501 → 0.002 | Z), collider X→C←Y (−0.001 → −0.501 | C). Conditioning BLOCKS the first two, OPENS the third."
      },
      {
        "type": "definition",
        "front": "d-separation",
        "back": "A path is blocked by a conditioned non-collider, or by an unconditioned collider with no conditioned descendant. All paths blocked ⇒ conditional independence. Pure graph search — no statistics in it."
      },
      {
        "type": "formula",
        "front": "Backdoor adjustment",
        "back": "P(Y|do(t)) = Σ_z P(Y|t,z)·P(z). The weight is P(z), NOT P(z|t) — that single difference is observing vs intervening."
      },
      {
        "type": "pitfall",
        "front": "★ Best-fitting model = most wrong model",
        "back": "True effect 3.800. Y~T: 4.298 | +Z: 3.803 ✓ | +mediator: 1.998 | +collider: 0.131 | kitchen sink: 0.504. R² rose monotonically 0.898→0.987 across that same sequence."
      },
      {
        "type": "pitfall",
        "front": "Selection IS conditioning",
        "back": "Restrict to the top 20% of a collider → two independently generated variables show ρ = −0.356. 'Only admitted patients', 'only converted users', 'only published papers' are all this."
      },
      {
        "type": "definition",
        "front": "Markov equivalence class",
        "back": "DAGs with the same skeleton and same v-structures imply identical conditional independences. X→M→Y, X←M←Y, X←M→Y agreed to 3 decimals at n=1M — and disagree on whether do(X) does anything."
      },
      {
        "type": "intuition",
        "front": "Which structure CAN the data identify?",
        "back": "The v-structure. Collider signature is inverted: ρ(X,Y)=0.001 marginally, −0.563 conditionally. Nothing else produces that, which is why discovery orients some edges and not others."
      },
      {
        "type": "definition",
        "front": "Rule 2 of do-calculus",
        "back": "P(y|do(t),w) = P(y|t,w) when Y ⫫ T | W in the graph with arrows OUT of T deleted. This is the backdoor rule and does most of the applied work."
      },
      {
        "type": "intuition",
        "front": "Completeness of do-calculus",
        "back": "If the three rules can't eliminate do(), NO method identifies that effect from that graph + observational data. A negative answer is a proof — change the DESIGN, not the estimator."
      },
      {
        "type": "pitfall",
        "front": "Which controls are safe to add?",
        "back": "Confounders ✓. Pre-treatment outcome predictors ✓ (precision, no bias). Treatment-only predictors ✗ (Z-bias: AMPLIFIES existing confounding). Anything post-treatment ✗."
      },
      {
        "type": "pitfall",
        "front": "Is 'pre-treatment' enough to make a control safe?",
        "back": "No. M-bias: a pre-treatment variable can be a collider between two unmeasured confounders, so conditioning opens a backdoor. The criterion is the PATH, not the timestamp."
      }
    ],
    "refs": [
      {
        "title": "Pearl (2009), Causality: Models, Reasoning and Inference (2nd ed.)",
        "url": "https://bayes.cs.ucla.edu/BOOK-2K/"
      },
      {
        "title": "Pearl (1995), Causal Diagrams for Empirical Research",
        "url": "https://www.jstor.org/stable/2337329"
      },
      {
        "title": "Shpitser & Pearl (2006), Identification of Joint Interventional Distributions in Recursive Semi-Markovian Causal Models",
        "url": "https://ftp.cs.ucla.edu/pub/stat_ser/r327.pdf"
      },
      {
        "title": "Spirtes, Glymour & Scheines (2000), Causation, Prediction, and Search",
        "url": "https://mitpress.mit.edu/9780262194402/causation-prediction-and-search/"
      },
      {
        "title": "Cinelli, Forney & Pearl (2022), A Crash Course in Good and Bad Controls",
        "url": "https://journals.sagepub.com/doi/10.1177/00491241221099552"
      }
    ],
    "demos": [
      "do-intervention",
      "simpsons-paradox",
      "bfs-dfs-astar",
      "regression"
    ],
    "demoTitles": {
      "do-intervention": "do() & Backdoor Adjustment",
      "simpsons-paradox": "Simpson's Paradox",
      "bfs-dfs-astar": "BFS vs DFS vs A*",
      "regression": "Linear & Logistic Regression"
    }
  }
};
