// GENERATED from content/lessons/frontier-frameworks/jax-fundamentals.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/jax-fundamentals/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "jax-fundamentals": {
    "level": "core",
    "body": {
      "intuition": [
        "The durable idea in JAX is not JAX. It is that if your functions are PURE - same inputs, same outputs, no hidden state - then a compiler can treat them as mathematical objects and rewrite them. That buys a set of function-to-function TRANSFORMS: differentiate this function, vectorize this function, compile this function. And because the functions are pure, the transforms COMPOSE, so you can differentiate a vectorized compiled function and get exactly what the names say.",
        "That property is the whole trade. Purity is what makes the transforms possible, and purity is also the tax: no in-place mutation, randomness threaded explicitly as keys, and control flow that a tracer can follow. Every awkward thing about writing JAX is a consequence of the property that makes it powerful, which is a much better way to learn it than as a list of quirks. And the idea outlived its first framework - the same transforms now exist in PyTorch as torch.func, so what you are learning is the mechanism, not the library.",
        "The measurements attach numbers to each transform, and the useful ones are the caveats. Automatic differentiation agrees with finite differences to about 2 times 10 to the minus 10 and composes for second derivatives - it is exact, not approximate. Vectorization matches an explicit loop to 5 times 10 to the minus 15 at roughly 480 times the speed - it is a rewrite, not an approximation. And compilation gives about 12 times in steady state while making the FIRST call about 10 times SLOWER, which makes jit a bet on repetition rather than a free speedup."
      ],
      "math": [
        {
          "h": "Autodiff is exact; finite differences cannot be",
          "paras": [
            "Finite differences trade truncation error against floating-point cancellation, so there is no step size that removes both.",
            "Automatic differentiation evaluates the derivative directly and has neither error term."
          ],
          "tex": "\\frac{f(x+h)-f(x)}{h} = f'(x) + \\underbrace{O(h)}_{\\text{truncation}} + \\underbrace{O(\\epsilon/h)}_{\\text{cancellation}}, \\qquad \\text{autodiff agreement} \\approx 2.3\\times10^{-10}",
          "texNote": "Shrinking h reduces truncation and amplifies cancellation, so the total error is minimized at some h and never approaches machine precision. Autodiff applies the chain rule to the program itself, so it is exact up to floating point - and because grad returns a FUNCTION, applying it twice gives the second derivative with no extra machinery. That composability is the point; a numerical-differentiation approach degrades badly at second order."
        },
        {
          "h": "jit is a bet on repetition, not a free speedup",
          "paras": [
            "Compilation pays a fixed cost once and reduces the per-call cost afterwards, so it wins only past a break-even count.",
            "And a new input SHAPE triggers a new compilation."
          ],
          "tex": "n\\,t_{\\text{eager}} \\;\\;\\text{vs}\\;\\; t_{\\text{compile}} + n\\,t_{\\text{jit}}, \\qquad n^{*} = \\frac{t_{\\text{compile}}}{t_{\\text{eager}} - t_{\\text{jit}}} \\qquad (\\text{first call} \\approx 10\\times \\text{slower}, \\text{steady} \\approx 12\\times \\text{faster})",
          "texNote": "In a training loop with fixed shapes, n is enormous and jit is close to free. In a serving path with variable-length inputs, every new shape re-pays the compile cost - which is why padding or bucketing shapes is standard practice rather than an optimization. The same recompile-on-new-shape behaviour is exactly what makes torch.compile's dynamic-shape handling a recurring source of surprise, so the mechanism transfers."
        },
        {
          "h": "vmap is a rewrite, not a loop",
          "paras": [
            "Vectorizing maps a function over an axis by transforming the operations, not by iterating.",
            "So the result is bitwise-comparable to the loop and dramatically faster."
          ],
          "tex": "\\texttt{vmap}(f)(X) \\equiv \\big[f(x_1),\\dots,f(x_n)\\big], \\qquad \\|\\cdot - \\text{loop}\\| \\approx 5\\times10^{-15}, \\qquad \\approx 480\\times \\text{faster}",
          "texNote": "The agreement to floating-point noise is the evidence that it is a rewrite rather than an approximation, and the speedup is because batched kernels replace n separate small ones. The composition that matters in practice is jit(vmap(grad(f))), which gives PER-EXAMPLE gradients - genuinely awkward in a framework where batching is baked into the ops, and the enabling primitive for differential privacy, influence functions and gradient-noise estimates."
        }
      ],
      "code": [
        {
          "h": "Three transforms, and the composition that is hard elsewhere",
          "paras": [
            "Each is a function-to-function transform, which is what lets them stack."
          ],
          "code": "# grad  - EXACT, and composes for higher order\ndf   = grad(f)            # agreement with finite differences ~2.3e-10\nd2f  = grad(grad(f))      # second derivative, no extra machinery\n\n# vmap  - a REWRITE of the operations, not a Python loop\nys = vmap(f)(X)           # == [f(x) for x in X] to ~5e-15, ~480x faster\n\n# jit   - trace once, compile, reuse\ng = jit(f)                # steady state ~12x faster\n                          # ★ FIRST call ~10x SLOWER (trace + compile)\n                          # ★ a NEW SHAPE recompiles from scratch\n\n# ★ THE COMPOSITION THAT IS THE POINT - per-example gradients:\nper_example = jit(vmap(grad(loss)))(params, X, Y)\n#   Awkward in a batched-by-default framework, trivial here. It is the\n#   enabling primitive for DP-SGD, influence functions, and the\n#   gradient NOISE SCALE from 16-04.\n\n# THE TAX - every one of these is a consequence of PURITY, which is\n# what made the transforms possible in the first place:\n#   no in-place mutation      -> x = x.at[i].set(v), not x[i] = v\n#   randomness is EXPLICIT    -> key, sub = split(key); normal(sub, ...)\n#   control flow must trace   -> a Python `if` on a TRACED value fails;\n#                                use lax.cond / lax.scan\n# Learning them as consequences beats learning them as quirks.",
          "caption": "The transforms compose because the functions are pure, and every awkward rule in JAX is the price of that same property."
        },
        {
          "h": "★ The benchmark that lies to you",
          "paras": [
            "Measuring compile overhead naively measures nothing, because the cache hides it."
          ],
          "code": "# THE NAIVE BENCHMARK - and why it reports the wrong thing:\ng = jit(f)\ng(x); t0 = time(); g(x); print(time()-t0)    # fast! ...and meaningless\n#   The first call compiled. The second hit the CACHE. You measured the\n#   steady state and concluded compilation is free.\n\n# ★ TO SEE THE REAL COST you need a FRESH function AND a UNIQUE shape,\n#   or JAX's compile cache silently serves a previous compilation:\ndef make_fn():             # fresh function object\n    return jit(lambda x: heavy(x))\nx = ones((SIZE_NEVER_USED_BEFORE,))   # unique shape -> real compile\nt0 = time(); make_fn()(x); print(\"cold:\", time()-t0)   # ~10x SLOWER\n\n# WHY THIS MATTERS BEYOND JAX: the same shape applies to torch.compile,\n# to XLA generally, and to any cached-compilation system. A benchmark\n# that reuses a warm cache measures the cache, not the compiler - and\n# the number it reports is the one you want to believe.\n\n# AND THE PRACTICAL CONSEQUENCE of recompile-on-new-shape:\n#   training loop, fixed shapes   -> n is huge, jit is ~free\n#   serving, variable lengths     -> every new shape re-pays compile\n#                                    => PAD or BUCKET the shapes\n#   This is the same recompile cliff that makes torch.compile\n#   surprising in production (16-02) - one mechanism, two frameworks.",
          "caption": "A warm cache measures the cache rather than the compiler — and it reports exactly the flattering number you were hoping for."
        }
      ],
      "useCases": [
        "Research code where per-example gradients, higher-order derivatives or custom transforms are needed, which is where the functional design pays most clearly.",
        "Training loops with fixed shapes, where compilation is close to free because the break-even count is reached immediately.",
        "Any setting where you need to know whether a speedup is real, since the cold-versus-warm distinction applies to every cached-compilation system.",
        "Learning the mechanism behind torch.compile and XLA, since tracing, shape specialization and recompilation behave the same way across frameworks."
      ],
      "pitfalls": [
        "Benchmarking a jitted function without a fresh function and an unused shape. The compile cache serves a previous compilation, so you measure the steady state and conclude compilation is free.",
        "Assuming jit is a free speedup. The first call is roughly ten times slower, so it is a bet on repetition and can be a net loss on a path that runs a shape once.",
        "Forgetting that a new input shape recompiles. Variable-length serving inputs re-pay the compile cost every time, which is why padding or bucketing is standard.",
        "Treating autodiff as numerical differentiation. Finite differences trade truncation against cancellation and cannot reach machine precision, while autodiff is exact and composes for second order.",
        "Mutating arrays in place. Purity is what makes the transforms possible, so functional updates are a consequence of the design rather than an inconvenience.",
        "Using implicit global randomness. Keys are explicit precisely so a transformed function stays pure and reproducible, and splitting them incorrectly gives correlated draws.",
        "Writing Python control flow over traced values. A conditional on a traced value fails at trace time, and the structured primitives exist because the tracer needs a static graph."
      ],
      "connections": [
        {
          "ref": "neural-nets/backprop",
          "text": "What grad is doing underneath - reverse-mode accumulation over the computation graph, here exposed as a function-to-function transform rather than a method on tensors."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "The same tracing and shape-specialization mechanism in PyTorch, including the recompile cliff that this lesson's new-shape behaviour explains."
        },
        {
          "ref": "pytorch-internals/torch-fx",
          "text": "Graph capture as an explicit object you can inspect and rewrite, which is the other way to reach the same compiler benefits."
        },
        {
          "ref": "frontier-frameworks/flax-optax",
          "text": "What functional purity implies for stateful things - parameters as pytrees and optimizers as init/update pairs rather than objects that mutate."
        },
        {
          "ref": "training-systems/gradient-accumulation",
          "text": "Where per-example gradients become useful, including the gradient noise scale that turns batch size into a calculable quantity."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What makes the JAX transforms composable?",
          "a": "Functional purity. Pure functions can be treated as mathematical objects, so jit, grad and vmap are function-to-function transforms that stack."
        },
        {
          "q": "How exact is autodiff?",
          "a": "It agreed with finite differences to about 2.3e-10 and is exact up to floating point - it applies the chain rule to the program, not a numerical approximation."
        },
        {
          "q": "Why can't finite differences be made exact?",
          "a": "Shrinking h reduces truncation error and amplifies floating-point cancellation, so the total error has a floor well above machine precision."
        },
        {
          "q": "What does jit actually cost?",
          "a": "The first call is about ten times slower - trace plus compile - against roughly twelve times faster in steady state. It is a bet on repetition."
        },
        {
          "q": "What triggers a recompile?",
          "a": "A new input shape. Shapes are static in the compiled graph, which is why variable-length serving inputs re-pay the compile cost."
        },
        {
          "q": "So what do you do in serving?",
          "a": "Pad or bucket the shapes so a small number of compilations covers the traffic, rather than compiling per unique length."
        },
        {
          "q": "Is vmap a loop?",
          "a": "No - it rewrites the operations to run batched. It matched an explicit loop to 5e-15 at roughly 480 times the speed."
        },
        {
          "q": "What is the composition worth knowing?",
          "a": "jit(vmap(grad(f))) for per-example gradients - awkward in a batched-by-default framework, and the primitive behind DP-SGD and influence functions."
        },
        {
          "q": "Why is randomness explicit?",
          "a": "Implicit global state would break purity, which is what the transforms depend on. Keys are threaded and split so functions stay pure and reproducible."
        },
        {
          "q": "Why does a Python if fail on a traced value?",
          "a": "The tracer needs a static graph, so a branch depending on a traced value cannot be resolved at trace time - structured primitives exist for that."
        },
        {
          "q": "How do you measure compile cost honestly?",
          "a": "With a fresh function object and a shape never used before, or the compile cache serves a previous compilation and you measure the steady state."
        },
        {
          "q": "Is any of this specific to JAX?",
          "a": "No - the transforms now exist in PyTorch as torch.func, and the tracing and recompile behaviour is shared with torch.compile and XLA."
        }
      ],
      "standard": [
        {
          "q": "Explain jit, grad and vmap, and what makes them work together.",
          "a": "THEY ARE FUNCTION-TO-FUNCTION TRANSFORMS, AND THEY COMPOSE BECAUSE THE FUNCTIONS ARE PURE - that single property is what the whole design is buying, and it is worth leading with because everything else follows from it. GRAD takes a function and returns its derivative function. It is EXACT - it applies the chain rule to the program itself, agreeing with finite differences to about 2.3e-10 - and because it returns a function, applying it twice gives the second derivative with no extra machinery. That is a real distinction from numerical differentiation, where the error has a floor: shrinking the step reduces truncation and amplifies floating-point cancellation, so there is no step size that reaches machine precision, and second derivatives degrade badly. VMAP takes a function written for one example and returns one that handles a batch, by REWRITING the operations rather than looping. Measured, it matched an explicit loop to 5e-15 - floating-point noise, which is the evidence that it is a rewrite - at roughly 480 times the speed, because batched kernels replace many small ones. The practical value is that you write the math for a single example, which is how you think about it, and get the batched version for free. JIT traces the function, compiles the graph, and reuses it. Steady state was about twelve times faster. THE CAVEAT THAT MATTERS: the first call is about ten times SLOWER, because tracing and compilation happen then, and a NEW INPUT SHAPE recompiles from scratch. So jit is a bet on repetition. In a training loop with fixed shapes the bet is trivially good; on a serving path with variable-length inputs, every new length re-pays the compile cost, which is why padding or bucketing shapes is standard practice rather than an optimization. WHY COMPOSITION IS THE POINT. Because each is a transform on a pure function, jit(vmap(grad(loss))) is meaningful and gives PER-EXAMPLE GRADIENTS: differentiate for one example, vectorize over the batch, compile the result. That is genuinely awkward in a framework where batching is baked into the operations, and it is the enabling primitive for differentially private SGD, influence functions and gradient-noise estimates. THE TAX, which I would frame as consequences rather than quirks: no in-place mutation, randomness threaded as explicit keys, and control flow that a tracer can follow. Each is required by purity, and purity is what makes the transforms possible - so they are the price of the feature rather than design mistakes. AND THE DURABLE PART: none of this is specific to JAX. The same transforms now exist in PyTorch as torch.func, and the tracing and shape-specialization behaviour is shared with torch.compile and XLA. What transfers is the mechanism.",
          "deepDive": {
            "q": "How would you benchmark a compiled function honestly?",
            "a": "CAREFULLY, BECAUSE THE NAIVE VERSION MEASURES THE CACHE AND REPORTS THE NUMBER YOU WANTED. This is the most instructive result in the lesson and it generalizes far past JAX. THE NAIVE BENCHMARK: jit the function, call it once, time the second call. That reports the steady state - fast, impressive, and it silently omits the compilation entirely, because the first call compiled and every call after hit the cache. A team doing this concludes compilation is free and then discovers otherwise in production, where shapes vary. WHAT IS ACTUALLY REQUIRED to see the cold cost: a FRESH function object AND an input shape never used before. Both, because the compile cache is keyed on the function and the shapes - reusing either serves a previous compilation. With that in place the first call measures about ten times slower than eager, which is the number you need in order to reason about whether jit is worth it on a given path. WHAT ELSE I WOULD CONTROL. Asynchronous dispatch: JAX returns before the computation finishes, so a timing that does not block measures dispatch rather than execution - block on the result before stopping the clock. Warmup: for steady-state numbers, discard the first few iterations deliberately, and say that you did. Variance: report a distribution over repeats rather than a single timing, since the tail is where the interesting behaviour is. And the SHAPE DISTRIBUTION, which is the one that decides the answer: benchmark with the shapes production actually sees, because a fixed-shape microbenchmark on a variable-shape workload is measuring a different system. THE BREAK-EVEN CALCULATION that turns this into a decision: compile cost divided by the per-call saving gives the number of calls at which jit pays for itself. In a training loop with fixed shapes that number is reached in seconds. On a serving path with a long tail of unique lengths it may never be reached, and the honest conclusion is to pad, bucket, or not compile that path. WHY IT GENERALIZES. Every cached-compilation system has this shape: XLA, torch.compile, TensorRT, ONNX Runtime's graph optimizations, even JIT-compiled languages. In each case a warm-cache benchmark reports the compiler as free, and in each case the production behaviour is governed by how often the cache misses. So the general habit is: when benchmarking anything with a cache, measure the cache MISS explicitly and state the hit rate you expect in production. AND THE BROADER POINT this module keeps making - the benchmark that flatters you is the one you will not question. Designing the measurement so it CAN show the unflattering result is the discipline, and here it is the difference between 'compilation is free' and 'compilation costs ten times one call and recompiles on every new shape'."
          }
        },
        {
          "q": "What does functional purity cost, and is it worth it?",
          "a": "IT COSTS THE THINGS THAT MAKE IMPERATIVE CODE CONVENIENT, AND IT BUYS THE TRANSFORMS - and framing the costs as consequences of the benefit is the only way they make sense. THE COSTS, concretely. NO IN-PLACE MUTATION: you write a functional update returning a new array rather than assigning into one. This looks wasteful and mostly is not, because the compiler can reuse buffers when it can prove the old value is dead - but it does mean writing code differently. EXPLICIT RANDOMNESS: there is no global seed advanced by side effect; you thread a key and split it. This is more verbose and it delivers something valuable - reproducibility that survives vectorization and parallelism, since each example's key is derived deterministically rather than pulled from shared mutable state. TRACEABLE CONTROL FLOW: a Python conditional on a traced value fails, because the tracer is building a static graph and cannot resolve a branch whose predicate is not known at trace time. Structured primitives exist for that, and they are more awkward to write. And DEBUGGING is harder inside a traced function, since printing a traced value shows a tracer rather than data. WHAT IT BUYS. Transforms that compose, which is not a small thing: per-example gradients, higher-order derivatives, vectorization for free, and parallelization over devices as another transform of the same kind. Compilation that can be aggressive, because the compiler has strong guarantees - no aliasing surprises, no hidden state to preserve. And reproducibility, which matters more than it sounds when you are trying to attribute a result. IS IT WORTH IT: it depends on what you are doing, and I would not give a blanket answer. For research where the transforms are the point - custom gradients, per-example quantities, unusual training procedures - clearly yes, and it is why the style took hold in that community. For standard supervised training where you need none of that, the ecosystem maturity and familiarity of the imperative framework usually wins, and choosing the functional one is paying a real tax for a feature you will not use. THE PART I THINK IS ACTUALLY IMPORTANT, and it is why this is the module's opening lesson: the IDEA outlived its framework. torch.func brings the same transforms to PyTorch, so a practitioner who learned 'functional purity enables composable transforms' can use it anywhere, while one who learned a specific API learned something with a much shorter half-life. That is the module's thesis arriving in the first lesson - and it is also why the notebook teaches the mechanism rather than the library surface."
        },
        {
          "q": "When would you choose JAX over PyTorch, honestly?",
          "a": "LESS OFTEN THAN THE COMPARISON SUGGESTS, AND FOR SPECIFIC REASONS RATHER THAN GENERAL SUPERIORITY. THE CASES FOR IT. Research needing the TRANSFORMS: per-example gradients, higher-order derivatives, custom vectorization, or unusual training procedures where you want to compose your own transformation. This is the strongest case and it is what drove adoption in the research community. Workloads targeting TPUs, where the XLA path is native rather than an adaptation. Scientific computing and simulation, where the functional style fits the mathematics and the differentiability of an entire simulator is the feature. And situations where you want an aggressive compiler with strong guarantees, since purity gives XLA more to work with. THE CASES AGAINST. Ecosystem: the pretrained-model landscape, the tooling, the deployment paths and the volume of examples all favour PyTorch by a wide margin, and that matters more than any per-operation performance comparison for most projects. Team familiarity, which is a real engineering cost rather than a preference. Debugging, which is harder inside traced code. And the fact that PyTorch has absorbed much of the idea - torch.func gives the transforms, torch.compile gives the compilation - so the differentiator has narrowed considerably. WHAT I WOULD ACTUALLY SAY TO A TEAM: the interesting question is rarely which framework but whether you need the transforms. If per-example gradients or composable higher-order derivatives are central to what you are doing, that requirement should drive the choice. If not, the framework decision should be made on ecosystem and team, and the answer will usually be the one you already use. THE THING I WOULD RESIST is the benchmark-driven version of this argument. Framework speed comparisons are dominated by whether the compilation path was warm, whether shapes were fixed, and whether the comparison used equivalent implementations - all of which are exactly the confounds this lesson's benchmarking result is about. A reported speedup from either side deserves the same questions: cold or warm, fixed shapes or realistic ones, and matched implementations. AND THE FRAMING THIS MODULE WOULD ADD: this choice has a short half-life. The frameworks are converging, the transforms have propagated, and the compilation stories are becoming similar. What has a long half-life is understanding WHY purity enables composable transforms and WHY shape specialization causes recompilation - because those explain the behaviour of whatever you end up using, including the thing that replaces both of them. Spending your learning budget on the mechanism rather than the API is the allocation the capstone measures, and this is a good place to start practising it."
        },
        {
          "q": "How do the transforms relate to what PyTorch does?",
          "a": "THEY ARE THE SAME MECHANISMS WITH DIFFERENT DEFAULTS, and mapping them across is the fastest way to make either framework's behaviour predictable. GRAD versus AUTOGRAD. PyTorch's autograd records operations on tensors as you execute them and you call backward to accumulate gradients into a .grad attribute - a stateful, imperative design. JAX's grad transforms a function and returns a function. The underlying reverse-mode accumulation is identical; the difference is whether the graph is a side effect of execution or an explicit object. The consequence is that composing gradients in PyTorch has historically been awkward - hence torch.func, which provides exactly grad, vmap and jacrev in the functional style. VMAP versus BATCHING. PyTorch bakes batching into operations: everything expects a leading batch dimension and you write your model to handle it. JAX writes the single-example function and transforms it. The PyTorch approach is more intuitive for standard models and worse when you need something the batching convention does not express - per-example gradients being the canonical case, which is why torch.func.vmap exists now. JIT versus torch.compile. Both trace the program to a graph, compile it, and specialize on shapes. Both therefore have the recompile-on-new-shape behaviour, and both pay a real cost on the first call. torch.compile's dynamic-shape handling and its guard system are an attempt to soften that, and the same underlying tension - a static graph is what enables optimization, and real inputs are not static - drives both designs. If you understand why JAX recompiles on a new shape, torch.compile's recompile cliff is not a surprise. PURITY versus MUTATION. This is the deepest difference and it explains the rest. PyTorch permits in-place operations and global randomness, which makes it convenient and makes aggressive whole-program compilation harder - the compiler has to prove things the other design guarantees. JAX requires purity, which is inconvenient and gives the compiler more. Neither is right in general; they are different points on the same trade. WHAT I WOULD TAKE FROM THE MAPPING. The mechanisms - reverse-mode differentiation, tracing, shape specialization, batching as a transform - are the durable content, and they appear in every framework in this space including the ones not written yet. The APIs are the perishable content. A practitioner who knows the mechanisms reads a new framework's documentation and recognizes what it is doing; one who knows an API has to learn each new one from scratch. That is the module's whole argument, and this lesson is where it is easiest to see because the same three transforms genuinely exist in both places under different names."
        },
        {
          "q": "Where do per-example gradients actually matter?",
          "a": "IN FOUR PLACES, AND THEY ARE MORE COMMON THAN THE OBSCURITY OF THE PRIMITIVE SUGGESTS. (1) DIFFERENTIALLY PRIVATE SGD, which is the canonical case. DP-SGD requires clipping each example's gradient to a norm bound BEFORE averaging, so that no single example can dominate the update - and that is impossible with a batch gradient, because the sum has already been taken. You need the per-example quantities to clip them individually. Without vmap-of-grad the standard workarounds are running batch size one, which is enormously slow, or microbatching, which is a partial approximation. (2) INFLUENCE FUNCTIONS and data attribution - asking which training examples were responsible for a particular prediction. These require per-example gradient information by construction, and they are how you answer 'why did the model do this' at the data level rather than the feature level. (3) THE GRADIENT NOISE SCALE, which turns 'how big should the batch be' into a calculable quantity rather than a search. It is estimated from the variance of gradients across examples, which needs the per-example gradients - and it is the principled basis for batch-size selection and for batch ramps during training. (4) EXAMPLE WEIGHTING AND CURRICULUM methods, where you want to up-weight or down-weight examples based on their individual gradient behaviour - hard-example mining and several robust-training methods are in this family. WHY IT IS AWKWARD WITHOUT THE TRANSFORM. In a batched-by-default framework the operations sum over the batch internally, so the per-example information is destroyed inside the backward pass. Recovering it means either running examples one at a time or writing custom backward logic. With vmap-of-grad you write the single-example loss, differentiate it, vectorize the result, and compile - and you get the whole batch of per-example gradients as an array with an extra leading dimension. THE COST, stated honestly: memory. Per-example gradients are batch-size times the parameter count, so for a large model this is prohibitive and the technique is used with smaller models, with parameter subsets, or with approximations. That is why DP-SGD at scale involves substantial engineering rather than just calling the transform. AND THE REASON IT BELONGS IN THIS LESSON: it is the clearest demonstration that composability is not an aesthetic property. Three transforms that each do something simple, composed, produce a capability that is hard to get any other way - which is the argument for the functional design in one concrete case rather than in the abstract."
        },
        {
          "q": "How does this lesson set up the module?",
          "a": "IT ESTABLISHES THE MODULE'S THESIS ON A CASE WHERE IT IS EASY TO VERIFY: **the tools churn, the invariants do not.** JAX's specific API is a moving target - and the IDEA it is built on, that purity enables composable function transforms, has already propagated into PyTorch as torch.func. So a practitioner who learned the mechanism can use it in either place, while one who learned the API learned something with a much shorter half-life. That is the allocation the capstone measures, and this lesson is where it is cheapest to see. THE PATTERN EVERY LESSON HERE FOLLOWS, which the environment forced and which turned out to be the right pedagogy. Several of the frameworks this module covers are not installed - Flax, Optax, vLLM, Triton, ONNX - so each was taught by building the MECHANISM from scratch: parameters as pytrees updated by one tree_map, optimizers as init/update pairs, paged KV allocation simulated, tiled kernels in numpy, a graph IR and interpreter written by hand. That constraint removed the option of teaching API surface and left only the durable part. It is a good demonstration that you can understand vLLM without vLLM, because what vLLM does is an allocation strategy rather than a library. THE SECOND THING THIS LESSON CONTRIBUTES is a habit rather than a fact: the benchmark that flatters you is the one you will not question. Measuring jit naively reports compilation as free, because the cache serves a previous compilation - and the fix requires a fresh function AND an unused shape. That shape of error recurs across every cached-compilation system, and the general habit is to measure the cache MISS deliberately and state the hit rate you expect. WHERE IT GOES NEXT. 22-02 takes purity's consequences for stateful things - parameters as trees, optimizers as pairs of functions. 22-05 takes the tracing and shape specialization into PyTorch, where the same mechanism produces the recompile cliff. 22-04 and 22-06 build inference and export mechanisms without their libraries. And 22-09 turns the measurement discipline on evaluation harnesses, where the scorer turns out to be the eval. Each is the same move: find the invariant under the API."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The module's thesis, in one lesson",
        "back": "The durable idea in JAX is not JAX: PURITY enables composable function-to-function transforms. That idea already propagated to PyTorch as torch.func. Learn the mechanism — it outlives the API."
      },
      {
        "type": "formula",
        "front": "Autodiff is EXACT; finite differences can't be",
        "back": "(f(x+h)−f(x))/h = f′ + O(h) truncation + O(ε/h) cancellation — shrinking h trades one for the other, so the error has a FLOOR. Autodiff agreed to ~2.3e-10 and composes: grad(grad(f)) is second order for free."
      },
      {
        "type": "formula",
        "front": "★ jit is a bet on REPETITION",
        "back": "First call ~10× SLOWER (trace+compile), steady state ~12× faster. Break-even n* = t_compile/(t_eager − t_jit). Training loop with fixed shapes → free. Serving with variable lengths → re-pays every new shape."
      },
      {
        "type": "formula",
        "front": "vmap is a REWRITE, not a loop",
        "back": "Matched an explicit loop to ~5e-15 (floating-point noise = the evidence it's a rewrite) at ~480× the speed. Write the math for ONE example, get the batched version."
      },
      {
        "type": "intuition",
        "front": "★ The composition that is the point",
        "back": "jit(vmap(grad(loss))) → PER-EXAMPLE gradients. Awkward in a batched-by-default framework; the enabling primitive for DP-SGD (clip each example BEFORE averaging), influence functions, and the gradient noise scale."
      },
      {
        "type": "pitfall",
        "front": "★ The benchmark that lies",
        "back": "jit(f); f(x); time f(x) → measures the CACHE, reports compilation as free. To see the real cost you need a FRESH function object AND a shape never used before. Same trap in torch.compile, XLA, TensorRT, ONNX Runtime."
      },
      {
        "type": "intuition",
        "front": "Purity's tax = purity's benefit",
        "back": "No in-place mutation · explicit PRNG keys · traceable control flow (a Python `if` on a traced value FAILS). Every awkward rule is a CONSEQUENCE of the property that makes the transforms possible — learn them that way, not as quirks."
      },
      {
        "type": "intuition",
        "front": "Recompile-on-new-shape → pad or bucket",
        "back": "Shapes are static in the compiled graph. Variable-length serving inputs re-pay compilation per length, so bucketing is standard practice, not an optimization. Same mechanism as torch.compile's recompile cliff."
      },
      {
        "type": "intuition",
        "front": "Mapping to PyTorch",
        "back": "grad ↔ autograd (function transform vs stateful .grad) · vmap ↔ batching baked into ops · jit ↔ torch.compile (both trace, both shape-specialize, both recompile) · purity ↔ mutation-permitted. Same mechanisms, different defaults."
      },
      {
        "type": "intuition",
        "front": "When to actually choose JAX",
        "back": "When you need the TRANSFORMS (per-example grads, higher-order, custom vectorization), TPUs, or differentiable simulation. Otherwise ecosystem and team familiarity win — and torch.func has narrowed the gap considerably."
      },
      {
        "type": "pitfall",
        "front": "Per-example gradients cost MEMORY",
        "back": "batch_size × parameter count. Prohibitive for large models, which is why DP-SGD at scale is real engineering rather than one transform call — used with smaller models, parameter subsets, or approximations."
      },
      {
        "type": "intuition",
        "front": "Block before you time",
        "back": "JAX dispatches asynchronously — a timing that doesn't block on the result measures DISPATCH, not execution. Same class of error as the warm cache: the naive measurement reports the flattering number."
      }
    ],
    "refs": [
      {
        "title": "Frostig, Johnson & Leary (2018), Compiling Machine Learning Programs via High-Level Tracing",
        "url": "https://mlsys.org/Conferences/doc/2018/146.pdf"
      },
      {
        "title": "Baydin et al. (2018), Automatic Differentiation in Machine Learning: A Survey",
        "url": "https://arxiv.org/abs/1502.05767"
      },
      {
        "title": "JAX Documentation, The Sharp Bits",
        "url": "https://docs.jax.dev/en/latest/notebooks/Common_Gotchas_in_JAX.html"
      },
      {
        "title": "PyTorch, torch.func: Composable Function Transforms",
        "url": "https://pytorch.org/docs/stable/func.html"
      },
      {
        "title": "Abadi et al. (2016), Deep Learning with Differential Privacy (DP-SGD)",
        "url": "https://arxiv.org/abs/1607.00133"
      }
    ],
    "demos": [
      "backprop",
      "gradient-descent",
      "optimizers",
      "activations"
    ]
  }
};
