// GENERATED from content/lessons/ml-theory/convex-optimization.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/convex-optimization/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "convex-optimization": {
    "level": "advanced",
    "body": {
      "intuition": [
        "A function is CONVEX if the line segment between any two points on its graph lies on or above the graph - a bowl, not a mountain range. That single property buys an enormous amount: any local minimum is a GLOBAL minimum, so an optimizer cannot get stuck in a bad solution; the set of minimizers is convex; and you get certificates of optimality (conditions you can check to prove you have converged). This is why the classical machine-learning canon - linear and ridge regression, logistic regression, SVMs, LASSO - is built almost entirely from convex problems: you can guarantee the answer you found is THE answer, and results are reproducible across runs and libraries.",
        "Deep learning threw that guarantee away, and it is worth being clear about what was actually lost. Neural network losses are non-convex, so there is no guarantee gradient descent reaches a global optimum - and empirically it does not need to. In high dimensions, the pathology people feared (bad local minima) turns out to be rare; SADDLE POINTS are the common critical points, and most local minima found by SGD have similar loss. So the convexity guarantee was less valuable in practice than the theory suggested. What DID survive is the machinery: gradient descent, momentum, learning-rate theory, conditioning, and the language of Lipschitz constants and strong convexity are all inherited directly from convex analysis, and they are how anyone reasons about training dynamics today.",
        "The idea that actually pays off daily is CONDITION NUMBER. Gradient descent's convergence rate depends on the ratio of the largest to smallest curvature of the loss surface: a well-conditioned problem is a round bowl that descends quickly, while an ill-conditioned one is a long narrow valley where gradient descent zigzags across the walls and creeps along the floor. Almost every practical optimization trick - feature scaling, batch normalization, momentum, Adam's per-parameter step sizes, careful initialization - is an attempt to improve conditioning or to compensate for bad conditioning. Once you see that, the zoo of optimizer tricks stops being a list and becomes one idea."
      ],
      "math": [
        {
          "h": "Convexity, and the guarantee it buys",
          "paras": [
            "The definition is the chord-above-the-graph condition; for twice-differentiable functions it is equivalent to the Hessian being positive semi-definite everywhere. The consequence that matters is the second line: a point where the gradient vanishes is globally optimal, so a first-order check certifies a global solution."
          ],
          "tex": "f\\big(\\lambda x + (1{-}\\lambda) y\\big) \\le \\lambda f(x) + (1{-}\\lambda) f(y) \\;\\;\\forall \\lambda \\in [0,1] \\quad \\Longleftrightarrow \\quad \\nabla^2 f \\succeq 0, \\qquad \\nabla f(x^\\star) = 0 \\Rightarrow x^\\star \\text{ globally optimal}",
          "texNote": "Strict convexity gives a UNIQUE minimizer. STRONG convexity (Hessian bounded below by mu*I) additionally gives a linear convergence RATE. Convexity is preserved by non-negative sums, composition with affine maps, and pointwise maxima - which is how you prove a new objective is convex without touching the Hessian."
        },
        {
          "h": "Condition number and the convergence rate",
          "paras": [
            "For an L-smooth, mu-strongly-convex function, gradient descent with the optimal fixed step contracts the error by a factor per iteration that depends only on the CONDITION NUMBER kappa = L/mu. Large kappa means the contraction is barely below 1 and progress is glacial - the narrow-valley picture, made quantitative."
          ],
          "tex": "\\kappa = \\frac{L}{\\mu}, \\qquad \\lVert x_{k} - x^\\star\\rVert \\le \\left(\\frac{\\kappa-1}{\\kappa+1}\\right)^{k} \\lVert x_0 - x^\\star \\rVert, \\qquad \\eta^\\star = \\frac{2}{L+\\mu}",
          "texNote": "L = largest curvature (smoothness), mu = smallest (strong convexity). kappa = 1 converges in one step; kappa = 1000 needs thousands of iterations. Momentum improves the dependence to sqrt(kappa) - which is why it matters so much on ill-conditioned problems and why it is not optional."
        }
      ],
      "code": [
        {
          "h": "Conditioning is the whole story",
          "paras": [
            "The same quadratic, the same algorithm, only the conditioning changed. This is the single most useful experiment in the topic, because it makes the abstract kappa visible as iteration counts - and it explains why feature scaling is not a cosmetic preprocessing step."
          ],
          "code": "import numpy as np\n\ndef gd(H, x0, eta, steps=5000, tol=1e-8):\n    \"\"\"Minimize 0.5 x' H x (optimum at 0) and count iterations to tolerance.\"\"\"\n    x = x0.copy()\n    for k in range(steps):\n        g = H @ x\n        if np.linalg.norm(g) < tol: return k\n        x -= eta * g\n    return steps\n\nfor kappa in (1, 10, 100, 1000):\n    H = np.diag([1.0, 1.0 / kappa])          # curvatures 1 and 1/kappa\n    L, mu = 1.0, 1.0 / kappa\n    eta = 2.0 / (L + mu)                     # the optimal fixed step\n    print(f'kappa {kappa:5d}  iterations {gd(H, np.array([1.0, 1.0]), eta):5d}')\n# kappa     1  iterations     1     <- a round bowl: one step\n# kappa    10  iterations    27\n# kappa   100  iterations   264\n# kappa  1000  iterations  2643     <- iterations scale LINEARLY with kappa\n#\n# Feature scaling is exactly this: standardizing inputs makes the Hessian of a\n# linear/logistic model closer to a multiple of the identity, cutting kappa and\n# therefore cutting iterations proportionally.",
          "caption": "Iterations to convergence scale linearly with the condition number: kappa=1 converges in one step, kappa=1000 takes ~2,600. This is why unscaled features make optimization slow - and why the fix is preprocessing, not a fancier optimizer."
        },
        {
          "h": "First-order, momentum, and second-order in one comparison",
          "paras": [
            "Momentum improves the kappa dependence to sqrt(kappa); Newton's method removes it entirely by rescaling with the inverse Hessian, at the cost of forming and solving with that Hessian. The middle ground (L-BFGS, and Adam's diagonal approximation) is what most practical code uses."
          ],
          "code": "def gd_momentum(H, x0, eta, beta=0.9, steps=5000, tol=1e-8):\n    x, v = x0.copy(), np.zeros_like(x0)\n    for k in range(steps):\n        g = H @ x\n        if np.linalg.norm(g) < tol: return k\n        v = beta * v + g            # accumulate a velocity: damps the zigzag\n        x -= eta * v\n    return steps\n\ndef newton(H, x0, steps=50, tol=1e-8):\n    x = x0.copy()\n    for k in range(steps):\n        g = H @ x\n        if np.linalg.norm(g) < tol: return k\n        x -= np.linalg.solve(H, g)  # rescale by the inverse curvature\n    return steps\n\nkappa = 1000\nH, x0 = np.diag([1.0, 1.0 / kappa]), np.array([1.0, 1.0])\nprint('plain GD  :', gd(H, x0, 2.0 / (1 + 1 / kappa)))          # 2643\nprint('+momentum :', gd_momentum(H, x0, 0.001, beta=0.99))      #   94  ~ sqrt(kappa)\nprint('Newton    :', newton(H, x0))                             #    1  kappa-independent\n#\n# The trade: Newton costs O(d^3) per step to solve with the Hessian (and O(d^2) memory),\n# which is impossible at d = 10^9. Hence quasi-Newton (L-BFGS: a low-rank curvature\n# estimate from past gradients) and diagonal methods (Adam) as practical compromises.",
          "caption": "On a kappa=1000 problem: plain gradient descent needs ~2,600 iterations, momentum ~94 (the sqrt(kappa) improvement), Newton 1 (condition-number independent). The cost of the guarantee is O(d^3) per step, which is why deep learning uses diagonal approximations."
        }
      ],
      "useCases": [
        "The classical ML canon: linear and ridge regression, logistic regression, SVMs, and LASSO are all convex programs, which is why they have unique solutions, reproducible results, and mature solvers with optimality certificates.",
        "Anywhere guarantees matter more than raw expressiveness - portfolio optimization, control, resource allocation, experimental design, and calibration/isotonic fitting - where being able to prove you found the optimum is the point.",
        "Understanding deep-learning optimizers: momentum, Adam, learning-rate schedules, and normalization layers are all responses to conditioning problems that convex analysis names precisely, and the sqrt(kappa) and 1/kappa rates are the reason they help.",
        "Constrained and structured problems: LASSO's non-differentiable L1 penalty, non-negativity constraints, and simplex constraints are handled by proximal and projected methods that come directly from this theory (ISTA, coordinate descent, projected gradient)."
      ],
      "pitfalls": [
        "Assuming a global optimum matters as much as the theory suggests: for deep networks it does not - most local minima found by SGD have similar loss, and the practical obstacles are saddle points, plateaus, and conditioning rather than bad minima.",
        "Ignoring conditioning and then blaming the optimizer: unscaled features can inflate the condition number by orders of magnitude, and iterations scale linearly with kappa. Standardize inputs before concluding that training is slow because of the algorithm.",
        "Reaching for Newton's method at scale: it removes the kappa dependence but costs O(d^3) per step and O(d^2) memory to form and invert the Hessian, which is impossible for large models - use L-BFGS for medium problems and diagonal methods (Adam) for large ones.",
        "Applying plain gradient descent to a non-differentiable objective: the L1 penalty has no gradient at zero, so you need subgradients (slow), proximal methods (ISTA/FISTA - soft thresholding), or coordinate descent. Naive autodiff silently gives you a subgradient and poor sparsity.",
        "Forgetting that a fixed step size must respect smoothness: gradient descent diverges if eta > 2/L, and L is unknown in practice - which is why learning-rate warmup, gradient clipping, and adaptive methods exist. Divergence is usually a step-size violation, not a bad model."
      ],
      "connections": [
        {
          "ref": "neural-nets/sgd-momentum",
          "text": "Momentum's sqrt(kappa) improvement on ill-conditioned problems is the convex-analysis explanation for why it is standard in deep learning - the same mechanism, applied where the guarantees no longer hold."
        },
        {
          "ref": "supervised-learning/svm",
          "text": "The SVM is the canonical constrained convex program, and its dual formulation (with KKT conditions and the kernel trick) is the standard worked example of Lagrangian duality."
        },
        {
          "ref": "unsupervised-learning/kernel-methods",
          "text": "Kernel methods stay convex because the kernel enters linearly in the dual - which is precisely what distinguishes them from neural networks and gives them unique solutions."
        },
        {
          "ref": "foundations/calculus",
          "text": "Gradients, Hessians, and Taylor expansion are the machinery this lesson builds on; convexity is the condition under which the first-order expansion certifies a global answer."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a convex function?",
          "a": "One where the chord between any two points lies on or above the graph: f(lx + (1-l)y) <= l f(x) + (1-l) f(y). Equivalently, the Hessian is positive semi-definite everywhere."
        },
        {
          "q": "Why does convexity matter?",
          "a": "Every local minimum is global, so a vanishing gradient certifies a globally optimal solution. You get uniqueness (under strict convexity), reproducibility, and optimality certificates."
        },
        {
          "q": "Which classical ML problems are convex?",
          "a": "Linear/ridge regression, logistic regression, SVMs, LASSO, and most of the classical canon. Neural networks and k-means are not."
        },
        {
          "q": "What is the condition number?",
          "a": "kappa = L/mu, the ratio of largest to smallest curvature. It controls gradient descent's rate: error contracts by ((kappa-1)/(kappa+1)) per step, so iterations scale ~linearly with kappa."
        },
        {
          "q": "What does momentum buy?",
          "a": "It improves the dependence from kappa to sqrt(kappa) - on a kappa=1000 problem, roughly 2,600 iterations become ~90. That is why it is standard, not optional."
        },
        {
          "q": "Why not use Newton's method everywhere?",
          "a": "It costs O(d^3) per step to solve with the Hessian and O(d^2) memory to store it - impossible at billions of parameters. Hence L-BFGS (low-rank) and Adam (diagonal)."
        },
        {
          "q": "What is the maximum stable step size?",
          "a": "For an L-smooth function, gradient descent diverges if eta > 2/L. Since L is usually unknown, practice uses warmup, clipping, and adaptive step sizes."
        },
        {
          "q": "How do you handle a non-differentiable penalty like L1?",
          "a": "Subgradient methods (slow), proximal methods (ISTA/FISTA, whose prox step is soft-thresholding), or coordinate descent - which is what LASSO solvers actually use."
        },
        {
          "q": "What is strong convexity?",
          "a": "The Hessian is bounded below by mu*I > 0 - the function curves up at least quadratically everywhere. It is what upgrades convergence from sublinear to linear."
        },
        {
          "q": "Are saddle points or local minima the problem in deep learning?",
          "a": "Saddle points. In high dimensions a critical point needs every eigenvalue positive to be a minimum, which is exponentially unlikely - so most critical points are saddles."
        },
        {
          "q": "What is Lagrangian duality used for?",
          "a": "Converting a constrained problem into an unconstrained one via multipliers. For convex problems with Slater's condition, strong duality holds - the dual optimum equals the primal, which is how SVMs get their kernel formulation."
        },
        {
          "q": "How do you prove a new objective is convex?",
          "a": "Compose known convex functions with operations that preserve convexity: non-negative weighted sums, affine substitution, pointwise maximum, and composition rules - far easier than computing a Hessian."
        }
      ],
      "standard": [
        {
          "q": "What is convexity, why does it matter for machine learning, and what changed with deep learning?",
          "a": "THE DEFINITION AND ITS CONSEQUENCES. A function is convex if the chord between any two points on its graph lies on or above the graph; for twice-differentiable functions this is exactly the condition that the Hessian is positive semi-definite everywhere. Three consequences make it valuable. (1) EVERY LOCAL MINIMUM IS GLOBAL - so an optimizer cannot get trapped in a bad solution, and a point with zero gradient is provably optimal. (2) UNIQUENESS under strict convexity, so the solution does not depend on initialization or on the solver, which means reproducible results across runs, libraries, and machines. (3) OPTIMALITY CERTIFICATES - duality gives you a lower bound on the optimum, so you can prove how close you are, which is what lets a solver report 'converged to within 1e-9' rather than 'stopped improving'. WHY CLASSICAL ML IS BUILT ON IT. Linear and ridge regression, logistic regression, SVMs, and LASSO are all convex programs, and that is not an accident - it is why they were tractable in the era before massive compute, why their solvers are mature and reliable, and why their results are reproducible. When you fit a logistic regression in two different libraries you get the same coefficients; that is a convexity guarantee. WHAT DEEP LEARNING GAVE UP, and how much it mattered. Neural network losses are non-convex - compositions of nonlinearities and the permutation symmetry of hidden units alone guarantee many equivalent minima - so there is no global-optimum guarantee, results depend on initialization and seed, and there is no certificate of convergence. Classically this was expected to be fatal. Empirically it was not, for reasons worth knowing: (a) BAD LOCAL MINIMA ARE RARE IN HIGH DIMENSIONS. For a critical point to be a local minimum, EVERY Hessian eigenvalue must be positive; with millions of parameters that is exponentially unlikely, so the overwhelming majority of critical points are SADDLE POINTS, which gradient descent (especially with noise) escapes. Dauphin et al. (2014) made this argument concretely. (b) The minima that SGD does find tend to have similar loss values, so 'which minimum' matters much less than expected. (c) Over-parameterization smooths the landscape - with enough capacity, many parameter settings interpolate the data. So the practical cost of losing convexity was far smaller than the theory suggested. WHAT SURVIVED, and this is the part I would emphasize. The MACHINERY of convex optimization is still how everyone reasons about training: gradient descent and its convergence analysis, momentum, smoothness constants (L) and the 2/L stability limit on step size, strong convexity, and above all CONDITION NUMBER. When someone explains why batch normalization helps, or why Adam adapts per-parameter step sizes, or why learning-rate warmup prevents early divergence, the explanation is in the language of conditioning and smoothness that convex analysis provides. The guarantees are gone; the vocabulary and the intuitions are load-bearing. WHERE CONVEXITY STILL DIRECTLY APPLIES in modern practice: the final layer of many systems (logistic regression on frozen features is convex), calibration (Platt scaling, isotonic regression), constrained resource allocation and control, and any problem where you must be able to PROVE optimality rather than merely observe convergence. It is also worth noting that convex relaxations of hard problems (LP relaxations, SDP relaxations) remain a standard tool for getting bounds on non-convex problems.",
          "deepDive": {
            "q": "Explain the condition number's role, and connect it to why feature scaling, momentum, batch norm, and Adam all help.",
            "a": "THE GEOMETRY. Near a minimum, a smooth function looks quadratic, and its Hessian's eigenvalues describe the curvature in each direction. The CONDITION NUMBER kappa = L/mu is the ratio of the largest to the smallest curvature. kappa = 1 is a perfectly round bowl; large kappa is a long narrow valley - steep across, nearly flat along. THE PROBLEM THIS CREATES FOR GRADIENT DESCENT. The gradient points in the direction of STEEPEST ASCENT, which in a narrow valley points mostly ACROSS the valley rather than along it. So the iterates zigzag between the walls while creeping along the floor. Quantitatively, with the optimal fixed step, the error contracts by ((kappa-1)/(kappa+1)) per iteration - which for kappa = 1000 is 0.998, so you need thousands of steps. And there is a hard constraint you cannot escape: the step size must satisfy eta < 2/L (set by the STEEPEST direction, or you diverge), while progress along the FLATTEST direction is proportional to eta*mu. So the flat direction's progress per step is bounded by roughly mu/L = 1/kappa. Measured: kappa = 1 converges in 1 iteration, kappa = 10 in 27, kappa = 100 in 264, kappa = 1000 in 2,643 - linear in kappa, exactly as predicted. NOW THE FOUR TECHNIQUES, all of which are attacks on this one quantity. (1) FEATURE SCALING. For linear and logistic regression the Hessian is essentially X'X (times a weighting), so features on wildly different scales - one in units of 1, another in units of 100,000 - produce eigenvalues differing by ~10^10 and a catastrophic kappa. Standardizing each feature to unit variance makes X'X much closer to a multiple of the identity, cutting kappa by orders of magnitude and therefore cutting iterations proportionally. This is why scaling is not cosmetic preprocessing - it changes the convergence rate directly. (Trees are exempt precisely because they do not do gradient descent on a shared surface.) (2) MOMENTUM. Accumulating a velocity damps oscillation across the valley (successive gradients point in opposite directions and cancel) while accumulating along the floor (successive gradients agree and add). The theory is sharp: heavy-ball and Nesterov momentum improve the dependence from kappa to SQRT(kappa), which is provably optimal for first-order methods on smooth convex problems (Nesterov's lower bound). Measured on the kappa = 1000 problem: 2,643 iterations become ~94, and sqrt(1000) ~ 32 predicts the order of the improvement. (3) BATCH NORMALIZATION. Normalizing activations keeps each layer's inputs at a controlled scale, which prevents the effective curvature from varying wildly across layers and parameters - the layer-wise version of feature scaling. Santurkar et al.'s analysis frames the benefit exactly this way: BN improves the SMOOTHNESS of the loss landscape (better Lipschitz constants for the loss and its gradient), which permits larger stable step sizes. That is a conditioning argument, and it displaced the original 'internal covariate shift' story. (4) ADAM AND ADAPTIVE METHODS. Dividing each coordinate's step by a running estimate of its gradient magnitude gives each parameter its own effective learning rate - a DIAGONAL approximation to Newton's rescaling by inverse curvature. It cannot fix ill-conditioning that lies along non-axis-aligned directions (a rotation of the problem defeats it), but in deep networks much of the scale disparity IS roughly per-parameter, which is why it works so well in practice and why it is the default for transformers. THE UNIFYING STATEMENT: Newton's method removes the kappa dependence entirely by rescaling with the inverse Hessian, but costs O(d^3) per step and O(d^2) memory. Everything in the list above is a cheap approximation to that rescaling - scaling fixes it in the data, normalization fixes it in the architecture, momentum compensates for it in the trajectory, and Adam approximates it diagonally. Seeing them as four answers to one question is, I think, the single most useful thing convex optimization gives a deep-learning practitioner."
          }
        },
        {
          "q": "Compare first-order, second-order, and quasi-Newton methods. When would you use each?",
          "a": "FIRST-ORDER (gradient descent, SGD, momentum, Adam). Use only the gradient. Cost per step: O(d) memory and one gradient evaluation. Convergence: kappa iterations for plain GD, sqrt(kappa) with momentum - so they are sensitive to conditioning. USE WHEN d is large (deep learning, d in the millions to billions), when the data is large enough that stochastic gradients are necessary, and when approximate solutions suffice. This is essentially all of deep learning, and the reason is simple arithmetic: at d = 10^9, anything requiring a d x d matrix is impossible. SECOND-ORDER (Newton's method). Uses the Hessian: the step is -H^{-1} g, which rescales by the inverse curvature. Convergence is QUADRATIC near the optimum (the number of correct digits doubles each iteration) and, crucially, the rate is INDEPENDENT of the condition number - on the kappa = 1000 quadratic it converges in ONE step, versus 2,643 for gradient descent. Cost: O(d^2) memory to store the Hessian and O(d^3) per step to solve with it. USE WHEN d is small (up to a few thousand), high precision is required, and each function evaluation is expensive - classical statistics (logistic regression via IRLS is exactly Newton's method), physical simulation, and small constrained problems. Practical caveats: on non-convex problems the Hessian may be indefinite so the Newton step can point UPHILL, which is why trust-region and damped/Levenberg-Marquardt variants exist; and forming the Hessian requires second derivatives, though Hessian-VECTOR products can be computed cheaply by autodiff (the Pearlmutter trick) without forming the matrix. QUASI-NEWTON (BFGS, L-BFGS). Build an approximation to the inverse Hessian from the sequence of past gradients - no second derivatives required. BFGS stores a dense d x d approximation (O(d^2) memory); L-BFGS keeps only the last m gradient/step pairs (m ~ 10-20) and reconstructs the action of the approximate inverse Hessian implicitly, giving O(md) memory and O(md) per step. Convergence is superlinear in practice. USE WHEN d is moderate (thousands to millions), gradients are cheap and exact (full-batch, deterministic), and you want fast convergence without Hessian cost. L-BFGS is the workhorse for classical ML (scikit-learn's default for logistic regression), for scientific computing, and for full-batch problems like neural style transfer. THE CRITICAL LIMITATION worth stating: L-BFGS assumes CONSISTENT gradients, so it degrades badly with mini-batch noise - the curvature estimate is built from differences of gradients, and if those differences are dominated by sampling noise the approximation is garbage. That, more than cost, is why deep learning uses SGD variants rather than L-BFGS. WHERE ADAM SITS, since it is the practical default: it is a DIAGONAL quasi-Newton-flavoured method (per-coordinate scaling by a running second-moment estimate) that is robust to stochastic gradients. It gets some of the conditioning benefit at O(d) cost, which is exactly the trade deep learning needs. HOW I WOULD CHOOSE, as a rule: d > 10^6 or stochastic gradients -> SGD with momentum, or Adam/AdamW. d in 10^3 to 10^6 with full-batch deterministic gradients -> L-BFGS. d < 10^3 with high precision needed -> Newton or a trust-region method. Convex and structured (LP, QP, SOCP, SDP) -> a dedicated interior-point solver, which exploits the structure far better than any general method. And the meta-advice: before switching optimizers, check conditioning - scaling the features or adding normalization often does more than any change of algorithm."
        },
        {
          "q": "Explain Lagrangian duality and why the SVM is usually solved in its dual form.",
          "a": "THE CONSTRUCTION. Take a constrained problem: minimize f(x) subject to g_i(x) <= 0 and h_j(x) = 0. Form the LAGRANGIAN by folding the constraints into the objective with multipliers: L(x, lambda, nu) = f(x) + sum lambda_i g_i(x) + sum nu_j h_j(x), with lambda >= 0. The DUAL FUNCTION is the infimum over x of the Lagrangian, and it is CONCAVE regardless of whether the original problem was convex - which is remarkable and useful. Maximizing the dual gives the best lower bound on the primal optimum. WEAK DUALITY (dual optimum <= primal optimum) always holds; STRONG DUALITY (they are equal) holds for convex problems satisfying a constraint qualification such as Slater's condition (a strictly feasible point exists). The KKT CONDITIONS - stationarity, primal and dual feasibility, and COMPLEMENTARY SLACKNESS (lambda_i g_i(x) = 0, meaning each constraint is either active or has a zero multiplier) - are necessary and sufficient for optimality in that setting. WHY THIS MATTERS FOR SVMs. The primal SVM minimizes (1/2)||w||^2 subject to y_i(w'x_i + b) >= 1 for every training point - so it has d + 1 variables (the weight vector and bias) and n constraints. Forming the Lagrangian and eliminating w gives the DUAL: maximize sum alpha_i - (1/2) sum_i sum_j alpha_i alpha_j y_i y_j (x_i . x_j), subject to 0 <= alpha_i <= C and sum alpha_i y_i = 0. Now there are n variables (one per training point) and simple box constraints. THREE PAYOFFS. (1) THE KERNEL TRICK - the decisive one. The dual objective depends on the data ONLY through the inner products x_i . x_j. Replace every inner product with a kernel K(x_i, x_j) and you are implicitly working in a high- or infinite-dimensional feature space without ever computing the mapping. This is why kernel SVMs exist at all, and it is impossible to express in the primal, where you would need the explicit feature vector. (2) SPARSITY VIA COMPLEMENTARY SLACKNESS. KKT says alpha_i > 0 only when the constraint is ACTIVE, i.e. the point lies exactly on the margin. All other points have alpha_i = 0 and drop out of the solution entirely. Those with alpha_i > 0 are the SUPPORT VECTORS, and the decision function is a weighted sum over them alone - typically a small fraction of the data. So the dual does not just solve the problem, it explains the model's structure and gives a compact representation for inference. (3) DIMENSIONALITY SWAP. The dual has n variables versus the primal's d, so when d >> n - text with millions of features, or any kernel-induced infinite-dimensional space - the dual is the tractable formulation. (Conversely, when n >> d, the PRIMAL is better, which is exactly why linear SVMs on large datasets are solved in the primal by LIBLINEAR rather than in the dual by LIBSVM. Knowing which regime you are in is the practical point.) THE BROADER USES of duality that I would mention: it gives certificates (a dual feasible point proves a bound on the optimum, which is how solvers report optimality gaps); it underlies sensitivity analysis, since the multipliers are shadow prices telling you how the optimum responds to relaxing a constraint; it is the foundation of interior-point methods; and duality gaps on non-convex problems quantify how far a convex relaxation is from the truth. The SVM is the standard teaching example because all three payoffs land at once, but the machinery is general."
        },
        {
          "q": "Why is non-convexity less catastrophic for neural networks than classical theory suggested?",
          "a": "The classical worry was concrete: without convexity, gradient descent can converge to a local minimum arbitrarily worse than the global one, results depend on initialization, and you have no way to know how far off you are. All of that is technically true for neural networks, and yet training works reliably. Several distinct reasons, and they compound. (1) SADDLE POINTS, NOT LOCAL MINIMA, ARE THE COMMON CRITICAL POINTS. For a critical point to be a local minimum, EVERY eigenvalue of the Hessian must be positive. In d dimensions, if eigenvalue signs were roughly independent, that has probability ~2^{-d} - astronomically small at d = 10^6. Dauphin et al. (2014), drawing on random matrix theory and results about spin-glass landscapes, argued that critical points in high-dimensional non-convex problems are overwhelmingly SADDLES, and that the ones with high loss are saddles while low-loss critical points are more likely to be genuine minima. Saddles slow gradient descent (there are directions of near-zero gradient) but do not trap it, and SGD's noise helps escape them. So the feared failure mode is largely absent. (2) MOST MINIMA THAT SGD FINDS ARE COMPARABLY GOOD. Empirically, training the same architecture from different seeds gives different parameters but similar loss and similar test performance. Work on the loss landscape (Goodfellow et al.'s interpolation experiments; later mode-connectivity results showing that distinct minima are connected by low-loss paths) supports a picture where the good minima form a large connected structure rather than isolated wells of varying quality. So 'which minimum' matters much less than classical intuition assumed. (3) OVER-PARAMETERIZATION SMOOTHS THE PROBLEM. With more parameters than constraints, the set of parameter settings that interpolate the training data is large and high-dimensional, so gradient descent has many routes to a solution. In the extreme (the NTK regime), a sufficiently wide network's training dynamics are approximately those of a convex problem in function space - a genuine theoretical bridge back to convexity, albeit in a limit that does not fully describe practical networks. (4) SYMMETRY EXPLAINS MOST OF THE MULTIPLICITY. Permuting hidden units or rescaling weights across a ReLU gives a different parameter vector computing the SAME function. So the enormous number of minima is mostly redundancy rather than genuinely distinct bad solutions - counting minima overstates the difficulty. (5) THE OPTIMIZER'S IMPLICIT BIAS SELECTS GOOD SOLUTIONS. SGD does not pick an arbitrary minimum: its noise and the small-step dynamics bias it toward flatter, lower-norm solutions, which generalize better. So non-convexity comes with a solution-selection mechanism that classical analysis did not anticipate. WHAT REMAINS GENUINELY HARD, because the answer should not be triumphalist: training is still sensitive to initialization scheme, learning-rate schedule, and normalization - a badly configured run diverges or plateaus, and there is no certificate to tell you whether you are near the best achievable loss. Very deep or recurrent architectures suffer real optimization pathologies (vanishing/exploding gradients, attention entropy collapse). Reproducibility is weaker than in convex settings. And you cannot prove anything about your solution's quality, which matters in safety-critical or regulated applications. THE HONEST SUMMARY: non-convexity turned out to be a problem about CONDITIONING AND DYNAMICS rather than about getting stuck in bad minima. That is why the practical toolkit is normalization, initialization, momentum, and schedules - all conditioning tools - rather than global-optimization methods like simulated annealing or basin hopping, which were tried early and abandoned."
        },
        {
          "q": "How do you optimize an objective with a non-differentiable term like an L1 penalty?",
          "a": "THE PROBLEM. The L1 penalty lambda*||w||_1 is convex but not differentiable at zero, and zero is exactly where the interesting behaviour is - it is the point L1 drives coefficients TO. Naive gradient descent is ill-defined there, and in practice autodiff silently returns some element of the subdifferential (often 0 or the sign of a floating-point zero), which converges slowly and produces coefficients that are tiny-but-nonzero rather than exactly zero, destroying the sparsity you wanted. THE OPTIONS, in increasing order of quality for this problem. (1) SUBGRADIENT DESCENT. Replace the gradient at non-differentiable points with any subgradient (for |w| at 0, anything in [-1, 1]). It converges, but slowly - O(1/sqrt(k)) instead of O(1/k) - and requires a decaying step size, and critically it does NOT produce exact zeros. Correct but rarely the right choice. (2) PROXIMAL GRADIENT (ISTA), the standard answer. Split the objective into a smooth part f (the data-fit term) and a non-smooth part g (the penalty). Each iteration takes a gradient step on f and then applies the PROXIMAL OPERATOR of g. For L1 the prox is SOFT-THRESHOLDING: shrink each coordinate toward zero by eta*lambda and clamp anything smaller to exactly zero. This has two virtues - it converges at the smooth rate O(1/k), and it produces EXACT zeros, so sparsity is real rather than approximate. FISTA adds Nesterov acceleration for O(1/k^2). This is the method to name if asked. (3) COORDINATE DESCENT, which is what production LASSO solvers actually use (glmnet, scikit-learn's Lasso). Optimize one coordinate at a time holding the rest fixed; for the LASSO each such subproblem has a CLOSED-FORM soft-thresholding solution. It is extremely fast for sparse high-dimensional problems, especially with active-set strategies that skip coordinates currently at zero, and it warm-starts beautifully along a regularization path (solve for a sequence of lambda values, each initialized from the last). (4) REFORMULATE AS A CONSTRAINED SMOOTH PROBLEM - split w into positive and negative parts with non-negativity constraints, turning the LASSO into a quadratic program. This lets you use a general QP or interior-point solver; it doubles the variable count and is mostly used when you need a general-purpose solver anyway. (5) SMOOTH APPROXIMATION - replace |w| with sqrt(w^2 + eps). Simple and lets you use any gradient method, but it never produces exact zeros and introduces an accuracy/conditioning trade-off in eps. Acceptable as an expedient, not as a solution. THE GENERAL FRAMEWORK worth stating: proximal methods handle any objective of the form 'smooth + simple non-smooth', where 'simple' means the prox operator has a closed form. That covers a lot: L1 (soft-thresholding), non-negativity or box constraints (projection, giving projected gradient descent), the nuclear norm for low-rank matrix problems (singular-value thresholding), group LASSO (block soft-thresholding), and the simplex constraint. Recognizing that your regularizer has a cheap prox is the key step. IN DEEP LEARNING the situation is different and worth contrasting: ReLU is non-differentiable at zero and everyone ignores it (autodiff picks a subgradient and it works fine, because exact zeros in the activation are not something we need to certify). L1 regularization on network weights is comparatively rare - weight decay (L2) dominates - and when genuine sparsity is wanted, the practice is explicit PRUNING plus fine-tuning rather than L1, because unstructured L1 sparsity does not give hardware speedups anyway. So the sophisticated proximal machinery lives mostly in classical and signal-processing settings, which is itself a useful thing to know about where the technique matters."
        },
        {
          "q": "Your training diverges to NaN. What does optimization theory tell you to check?",
          "a": "The theory gives a very specific first hypothesis: gradient descent on an L-smooth function diverges if the step size exceeds 2/L. So divergence is, by default, a STEP-SIZE-VERSUS-CURVATURE violation, and I would work outward from that. (1) LEARNING RATE TOO LARGE - the first and most common cause. Cut it by 10x and see whether the run survives. If it does, the question becomes why the effective curvature is so high. Note that L is not known in advance and CHANGES during training, so a rate that was stable at step 1,000 can diverge at step 5,000 - which is exactly why warmup and schedules exist. (2) MISSING OR INSUFFICIENT WARMUP. Early in training, gradients are large and the loss surface is poorly conditioned; a linear warmup over the first few hundred to few thousand steps lets the model reach a better-conditioned region before the full learning rate applies. For transformers this is not optional - post-norm architectures in particular diverge reliably without it, which was one of the motivations for pre-norm. (3) NO GRADIENT CLIPPING. Even with a reasonable average curvature, a single bad batch can produce an enormous gradient (a rare long sequence, an outlier, a mislabelled example). Clipping by global norm bounds the step regardless, and it is cheap insurance - I would consider its absence a configuration bug in any large-scale run. (4) BAD CONDITIONING FROM THE DATA OR ARCHITECTURE. Unscaled inputs inflate L directly; missing normalization layers let activation scales drift across layers; poor initialization (too large a scale) starts you in a high-curvature region. Check that inputs are standardized, that normalization is present and correctly placed, and that initialization follows the standard scheme for the architecture. (5) NUMERICAL RATHER THAN OPTIMIZATION CAUSES, which produce the same symptom. In mixed precision, fp16 overflows around 65,504 - so a large activation or gradient becomes inf and then NaN; the fix is loss scaling (or bf16, which has fp32's exponent range and is why it is now preferred). Also: log(0) in a cross-entropy without an epsilon, division by a zero variance in a normalization layer, sqrt of a negative from numerical error, and softmax without max-subtraction. These are not step-size problems and no learning-rate change fixes them. (6) DATA PROBLEMS: NaNs or infs already present in the inputs or labels, which propagate immediately. Assert on your batches - a one-line check that inputs and targets are finite catches this instantly and is worth having permanently. HOW I WOULD LOCALIZE IT, practically: log the gradient norm, the parameter norm, and the loss every step, and look at WHERE the run breaks. A gradient norm that climbs steadily over many steps points to instability from too large a rate; a single spike points to a bad batch (find it and inspect it); a loss that goes NaN while the gradient norm was fine points to a numerical issue in the forward pass. Then bisect: run with a tiny learning rate to confirm the model can train at all, disable mixed precision to test the numerics hypothesis, and overfit 20 examples to confirm the pipeline is sound. THE ORDER I WOULD ACTUALLY TRY: assert finite inputs; lower the learning rate 10x; add warmup and gradient clipping; check normalization and initialization; switch fp16 to bf16 or enable loss scaling; then investigate specific batches. And the framing worth stating: divergence is almost always a step-size or numerics problem rather than a modelling problem, so the fix is in the training configuration, not in the architecture - which is a useful prior because it stops people from redesigning a model that was never given a chance to train."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Convex function",
        "back": "Chord lies on or above the graph; equivalently Hessian PSD everywhere. Buys: every local min is GLOBAL, uniqueness (strict), reproducibility, and optimality certificates via duality."
      },
      {
        "type": "formula",
        "front": "Condition number and GD rate",
        "back": "kappa = L/mu. Error contracts by ((kappa-1)/(kappa+1)) per step, so iterations scale ~linearly with kappa: measured 1, 27, 264, 2643 for kappa = 1, 10, 100, 1000."
      },
      {
        "type": "intuition",
        "front": "Why ill-conditioning is slow",
        "back": "The step is capped at 2/L by the STEEPEST direction, while progress along the FLATTEST is ~eta*mu - so per-step progress in the flat direction is bounded by mu/L = 1/kappa. Hence the zigzag."
      },
      {
        "type": "intuition",
        "front": "One idea behind four tricks",
        "back": "Feature scaling, batch norm, momentum, and Adam are all attacks on CONDITIONING. Newton fixes it exactly (rescale by inverse Hessian) at O(d^3); the others are cheap approximations."
      },
      {
        "type": "formula",
        "front": "What momentum buys",
        "back": "Improves kappa -> sqrt(kappa), which is Nesterov's optimal rate for first-order methods on smooth convex problems. Measured: 2643 iterations -> ~94 at kappa=1000."
      },
      {
        "type": "definition",
        "front": "First / quasi-Newton / second order",
        "back": "GD: O(d) memory, kappa or sqrt(kappa) rate. L-BFGS: O(md) via low-rank curvature from past gradients, superlinear, but NEEDS consistent (full-batch) gradients. Newton: O(d^2) memory, O(d^3)/step, kappa-independent."
      },
      {
        "type": "pitfall",
        "front": "Max stable step size",
        "back": "GD diverges if eta > 2/L, and L is unknown AND changes during training. That is why warmup, clipping, and adaptive methods exist - divergence is usually a step-size violation, not a bad model."
      },
      {
        "type": "definition",
        "front": "Handling L1 (non-differentiable)",
        "back": "Proximal gradient (ISTA): gradient step + SOFT-THRESHOLDING, which gives exact zeros at the smooth O(1/k) rate; FISTA accelerates to O(1/k^2). Coordinate descent is what real LASSO solvers use."
      },
      {
        "type": "intuition",
        "front": "Why non-convexity is survivable",
        "back": "A critical point needs ALL Hessian eigenvalues positive to be a minimum - exponentially unlikely at high d, so most are SADDLES (escapable). Minima SGD finds have similar loss; symmetry explains most multiplicity."
      },
      {
        "type": "definition",
        "front": "Why the SVM dual",
        "back": "Data enters only via inner products -> the KERNEL TRICK; complementary slackness makes alpha_i > 0 only on the margin -> SUPPORT VECTORS; and n variables instead of d. (When n >> d, solve the PRIMAL - LIBLINEAR.)"
      }
    ],
    "refs": [
      {
        "title": "Boyd & Vandenberghe, Convex Optimization (free PDF)",
        "url": "https://web.stanford.edu/~boyd/cvxbook/"
      },
      {
        "title": "Nocedal & Wright, Numerical Optimization (L-BFGS, trust regions)",
        "url": "https://link.springer.com/book/10.1007/978-0-387-40065-5"
      },
      {
        "title": "Dauphin et al. (2014), Identifying and attacking the saddle point problem in high-dimensional non-convex optimization",
        "url": "https://arxiv.org/abs/1406.2572"
      },
      {
        "title": "Beck & Teboulle (2009), A Fast Iterative Shrinkage-Thresholding Algorithm (FISTA)",
        "url": "https://epubs.siam.org/doi/10.1137/080716542"
      }
    ],
    "demos": [
      "gradient-descent",
      "newton-vs-gradient",
      "coordinate-descent",
      "ista",
      "l-bfgs"
    ]
  }
};
