// GENERATED from content/lessons/frontier-frameworks/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "frontier-frameworks". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
  },
  "flax-optax": {
    "level": "core",
    "body": {
      "intuition": [
        "If functions must be pure, then state has to live somewhere explicit - and the two structures that result do all the work in this ecosystem. PARAMETERS become a PYTREE: an arbitrary nested container of arrays, updated by a single tree_map. There is no module registry, no parameters() method, no walk over named tensors, because the tree structure IS the registry. OPTIMIZERS become a PAIR of pure functions - one to initialize state, one to turn gradients into updates - which is exactly what Optax calls a GradientTransformation.",
        "That second choice is the one with consequences. Because an optimizer is a pure function rather than an object that mutates parameters, optimizers COMPOSE: clipping is a transformation, scaling by a schedule is a transformation, Adam is a transformation, and chaining them is function composition. What is an inheritance hierarchy or a set of constructor flags in an object-oriented framework becomes a list here, and the ORDER in the list is the semantics - clip before you scale, or you clipped the wrong quantity.",
        "The measurements make the payoff concrete and also mark its limits. Chaining a global-norm clip before SGD rescued a high learning-rate run that otherwise diverged to infinity, bringing it to a finite 9.38. Adam beat plain SGD 0.046 to 10.0 on an ill-conditioned problem. And a warmup-plus-cosine schedule beat a constant at the peak rate, 2.10 to 2.97 - but only in that regime, because with a tuned constant rate and an adaptive optimizer the schedule's advantage disappears. Stating the regime is the difference between a technique and a superstition."
      ],
      "math": [
        {
          "h": "The whole update is one tree_map",
          "paras": [
            "Parameters are a tree of arrays; gradients have the same tree structure; so the update maps over both.",
            "No registry is needed because the structure carries the information."
          ],
          "tex": "\\theta \\leftarrow \\texttt{tree\\_map}(\\lambda p, u:\\; p + u,\\; \\theta,\\; \\Delta), \\qquad \\text{struct}(\\Delta) = \\text{struct}(\\theta)",
          "texNote": "This is the entire parameter-update mechanism, for any model architecture, with no special cases. It works because grad of a function taking a pytree returns a pytree of the same shape - so the correspondence between a parameter and its gradient is structural rather than looked up by name. The practical consequence is that model code and optimizer code do not need to know about each other, which is what makes the optimizer composition below possible."
        },
        {
          "h": "An optimizer is a pair of pure functions - so they chain",
          "paras": [
            "One function makes the initial state; the other maps gradients and state to updates and new state.",
            "Composition of these is just function composition, which is why chaining is the natural API."
          ],
          "tex": "\\texttt{init}: \\theta \\mapsto s_0, \\qquad \\texttt{update}: (g, s, \\theta) \\mapsto (\\Delta, s'), \\qquad \\texttt{chain}(t_1, t_2) = t_2 \\circ t_1",
          "texNote": "Because there is no mutation, an optimizer is a value you can compose, log, checkpoint or swap. Chaining clip then scale then Adam is a list rather than a class hierarchy - and ORDER IS SEMANTICS: clipping before the optimizer bounds the raw gradient, clipping after bounds the already-scaled update, and those are different operations. Getting the order wrong produces a silently different algorithm."
        },
        {
          "h": "Global-norm clipping - and when it is load-bearing",
          "paras": [
            "Clipping rescales the whole gradient when its norm exceeds a threshold, preserving direction.",
            "It rescued a diverging run, and the setup needed to show that is itself informative."
          ],
          "tex": "g \\leftarrow g \\cdot \\min\\!\\Big(1, \\frac{c}{\\|g\\|_2}\\Big) \\qquad \\text{diverged to } \\infty \\;\\longrightarrow\\; 9.38 \\text{ finite}",
          "texNote": "Rescaling the GLOBAL norm rather than clipping per-parameter is what preserves the update direction; per-element clipping changes where you are going, not just how far. Note what the demonstration required: it only diverged with plain SGD, because Adam's per-parameter normalization already bounds the effective step - so clipping matters MOST exactly where the optimizer is not already adaptive, which tells you when to reach for it."
        }
      ],
      "code": [
        {
          "h": "Two structures, and the composition they enable",
          "paras": [
            "This is what the frameworks are underneath, which is why it is worth writing once by hand."
          ],
          "code": "# 1. PARAMS ARE A PYTREE. The tree structure IS the registry.\nparams = {\"layer1\": {\"w\": W1, \"b\": b1},\n          \"layer2\": {\"w\": W2, \"b\": b2}}\ngrads  = grad(loss)(params, X, Y)      # SAME tree structure\nparams = tree_map(lambda p, g: p - lr*g, params, grads)   # the WHOLE update\n#   No .parameters(), no named_parameters walk, no module registry -\n#   the correspondence is STRUCTURAL. Model code and optimizer code\n#   never need to know about each other.\n\n# 2. AN OPTIMIZER IS A PAIR OF PURE FUNCTIONS = Optax's\n#    GradientTransformation:\n#      init  : params -> state\n#      update: (grads, state, params) -> (updates, new_state)\n#    Because they're pure, they COMPOSE - chaining is a LIST, not a\n#    class hierarchy:\ntx = chain(\n  clip_by_global_norm(1.0),   # ★ ORDER IS SEMANTICS\n  scale_by_adam(),            #   clip BEFORE the optimizer bounds the\n  scale_by_schedule(sched),   #   RAW gradient; clip after bounds the\n  scale(-1.0),                #   already-SCALED update. Different\n)                             #   algorithms, no error either way.\n\nstate = tx.init(params)\nupdates, state = tx.update(grads, state, params)\nparams = tree_map(add, params, updates)\n\n# THE PAYOFF: the optimizer is a VALUE. You can log it, checkpoint it,\n# swap it, or build one that didn't exist - without subclassing.",
          "caption": "Chaining is function composition, so the optimizer becomes a value you compose rather than an object you configure — and order in the chain is the algorithm."
        },
        {
          "h": "What was measured, and the regime each result holds in",
          "paras": [
            "Three results, and the caveats are the reason to trust the first three numbers."
          ],
          "code": "# CONDITIONING: on an ill-conditioned problem\n#   plain SGD   final loss 10.0\n#   Adam        final loss 0.046\n#   Same story as 04-08: the condition number explains why per-parameter\n#   normalization helps, and it is the same reason batch norm and\n#   careful scaling help.\n\n# ★ CLIPPING: a high-LR run diverged to inf; clip_by_global_norm(1.0)\n#   chained BEFORE the optimizer brought it to 9.38 finite.\n#   ⚠ THE DEMO HAD TO USE PLAIN SGD ON A LINEAR MODEL - with Adam it\n#     WOULD NOT DIVERGE, because Adam's per-parameter normalization\n#     already bounds the effective step.\n#   ★ THAT CONSTRAINT IS THE FINDING: clipping is load-bearing exactly\n#     where the optimizer is NOT already adaptive - plain SGD, and the\n#     rare-but-large gradient spikes that adaptivity smooths over.\n\n# SCHEDULES: warmup + cosine 2.10  vs  constant-at-peak 2.97\n#   ⚠ AND THE REGIME: this held in the ILL-CONDITIONED, FULL-BATCH-SGD\n#     setting. With a TUNED CONSTANT rate and an adaptive optimizer the\n#     advantage largely disappears.\n#   ★ So the honest claim is not \"schedules beat constants\" but\n#     \"warmup+decay beats a constant AT THE PEAK RATE\" - which is a\n#     comparison against an unfairly-chosen baseline unless you say so.\n\n# ⚠ A PURITY GOTCHA worth remembering: int() on a TRACED step counter\n#   crashes inside a jitted update. The step is a traced value, so\n#   schedules must be computed with array ops, not Python arithmetic -\n#   the same class of error as a Python `if` on a tracer (22-01).",
          "caption": "Each result comes with the regime it holds in — and the clipping demo needing plain SGD is itself the finding about when clipping matters."
        }
      ],
      "useCases": [
        "Building a training loop where the optimizer needs behaviour no library provides, since composing transformations is easier than subclassing an optimizer.",
        "Stabilizing a run that diverges, where global-norm clipping chained before the optimizer is the standard first intervention.",
        "Reasoning about why Adam helps, which is the conditioning argument rather than a general claim that adaptive optimizers are better.",
        "Reading any modern training stack, since parameters-as-trees and optimizers-as-transformations are the underlying structures regardless of the framework's surface."
      ],
      "pitfalls": [
        "Getting the chain order wrong. Clipping before the optimizer bounds the raw gradient and clipping after bounds the scaled update - different algorithms, and neither raises an error.",
        "Clipping per element instead of by global norm. Element-wise clipping changes the update direction, while global-norm rescaling preserves it and only limits the magnitude.",
        "Quoting the schedule result without its regime. Warmup plus cosine beat a constant AT THE PEAK RATE in an ill-conditioned full-batch setting; against a tuned constant with an adaptive optimizer the advantage largely disappears.",
        "Expecting clipping to help everywhere. Adam's per-parameter normalization already bounds the effective step, so clipping is load-bearing mainly where the optimizer is not adaptive or where gradients spike rarely.",
        "Calling int() on a traced step counter. The step is a traced value inside a jitted update, so schedules must use array operations - the same class of error as a Python conditional on a tracer.",
        "Assuming an adaptive optimizer removes the need to think about conditioning. It compensates for it, which is why the ill-conditioned comparison shows 0.046 against 10.0 rather than showing that conditioning stopped mattering.",
        "Treating the pytree as a framework detail. It is the mechanism that lets model code and optimizer code stay independent, which is what makes composition possible at all."
      ],
      "connections": [
        {
          "ref": "frontier-frameworks/jax-fundamentals",
          "text": "Where purity comes from and why state has to be explicit - the pytree and the transformation pair are the two answers to that constraint."
        },
        {
          "ref": "neural-nets/adam-lr-scheduling",
          "text": "The optimizers themselves, and the schedule mechanics - here they reappear as composable transformations rather than as configured objects."
        },
        {
          "ref": "ml-theory/convex-optimization",
          "text": "The condition number as the unifying explanation for why Adam beats SGD here, and for why scaling, normalization and momentum all help the same underlying problem."
        },
        {
          "ref": "training-systems/training-stability",
          "text": "Clipping in its production context, including the ordering trap with loss scaling and why the finite check belongs before the optimizer step."
        },
        {
          "ref": "pytorch-internals/mini-framework",
          "text": "The same exercise from the other direction - building the abstractions yourself so their behaviour stops being magic."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How are parameters represented?",
          "a": "As a pytree - an arbitrary nested container of arrays. The tree structure is the registry, so no parameters() method is needed."
        },
        {
          "q": "What is the entire update step?",
          "a": "One tree_map over parameters and gradients, which have the same tree structure because grad of a pytree function returns a pytree."
        },
        {
          "q": "What is an optimizer in this design?",
          "a": "A pair of pure functions - init producing state, and update mapping gradients and state to updates and new state. That is Optax's GradientTransformation."
        },
        {
          "q": "Why does that make optimizers compose?",
          "a": "Because they are pure functions, chaining them is function composition - so clipping, scaling and Adam are a list rather than a class hierarchy."
        },
        {
          "q": "Does chain order matter?",
          "a": "Yes, and it is the semantics. Clipping before the optimizer bounds the raw gradient; clipping after bounds the scaled update. Neither errors."
        },
        {
          "q": "What did clipping rescue?",
          "a": "A high learning-rate run that diverged to infinity came to a finite 9.38 with a global-norm clip chained before the optimizer."
        },
        {
          "q": "Why global norm rather than per element?",
          "a": "Rescaling the global norm preserves the update direction and only limits its magnitude; element-wise clipping changes where you are going."
        },
        {
          "q": "Why did the clipping demo need plain SGD?",
          "a": "Adam would not diverge - its per-parameter normalization already bounds the effective step. That constraint is the finding about when clipping matters."
        },
        {
          "q": "Adam versus SGD on the ill-conditioned problem?",
          "a": "0.046 against 10.0. It is the condition-number story - per-parameter normalization compensating for badly scaled curvature."
        },
        {
          "q": "What did the schedule buy?",
          "a": "Warmup plus cosine reached 2.10 against a constant-at-peak 2.97 - in the ill-conditioned full-batch SGD regime specifically."
        },
        {
          "q": "Why is that claim regime-bound?",
          "a": "Against a tuned constant rate with an adaptive optimizer the advantage largely disappears, so the honest claim names the baseline."
        },
        {
          "q": "What breaks if you call int() on the step counter?",
          "a": "It crashes inside a jitted update, because the step is a traced value - schedules must use array operations, not Python arithmetic."
        }
      ],
      "standard": [
        {
          "q": "How does a functional training stack actually work?",
          "a": "TWO STRUCTURES DO ALL THE WORK, and both are consequences of the purity requirement rather than framework choices. STRUCTURE ONE - PARAMETERS AS A PYTREE. A model's parameters are an arbitrary nested container of arrays: dicts of dicts of arrays, or whatever shape suits. Gradients come back with the SAME tree structure, because differentiating a function of a pytree returns a pytree, and the entire update is one tree_map over the two. There is no parameters() method, no named-tensor walk, no module registry - the tree structure IS the registry, and the correspondence between a parameter and its gradient is structural rather than looked up by name. The consequence that matters: model code and optimizer code never need to know about each other, which is what makes the second structure possible. STRUCTURE TWO - OPTIMIZERS AS PAIRS OF PURE FUNCTIONS. An init function turning parameters into optimizer state, and an update function mapping gradients and state to updates and new state. That is exactly Optax's GradientTransformation, and because both are pure, optimizers COMPOSE. Chaining a clip, then Adam, then a schedule, then a sign flip is function composition expressed as a list. In an object-oriented framework the same configurability arrives as constructor flags and subclassing; here it is a value you can build, log, checkpoint or swap. THE THING TO GET RIGHT: ORDER IS SEMANTICS. Clipping before the optimizer bounds the RAW gradient; clipping after bounds the already-scaled update. Those are different algorithms and neither raises an error, so a reordered chain is a silent behaviour change. WHAT THE MEASUREMENTS SHOWED. Global-norm clipping chained before SGD rescued a high learning-rate run from divergence to a finite 9.38. Adam beat plain SGD 0.046 to 10.0 on an ill-conditioned problem - the condition-number story from 04-08, where per-parameter normalization compensates for badly scaled curvature. And warmup plus cosine reached 2.10 against a constant-at-peak 2.97. THE CAVEATS THAT MAKE THOSE NUMBERS TRUSTWORTHY, and I would give them unprompted. The clipping demo REQUIRED plain SGD on a linear model, because with Adam it would not diverge at all - which is the finding: clipping is load-bearing exactly where the optimizer is not already adaptive. And the schedule comparison was against a constant AT THE PEAK RATE in an ill-conditioned full-batch setting; with a tuned constant and an adaptive optimizer the advantage largely disappears. Naming the baseline is the difference between a technique and a superstition.",
          "deepDive": {
            "q": "Build a custom optimizer in this style. What becomes easy and what becomes hard?",
            "a": "WHAT BECOMES EASY IS COMPOSITION, AND WHAT BECOMES HARD IS ANYTHING NEEDING GLOBAL COORDINATION - and that split follows directly from the design. THE EASY CASES. Suppose I want Adam with decoupled weight decay, gradient clipping, a warmup-cosine schedule, and a different learning rate for the embedding layer. In this style that is a chain plus one masked transformation - each piece is independent, each is testable alone, and the composition is a list I can print. In an object-oriented framework the same thing is a subclass, or constructor flags, or a param_groups structure, and the pieces are entangled in one update method. WRITING A NEW TRANSFORMATION is also easy: define init and update, and it composes with everything that exists. Lion, Adafactor, Shampoo, per-layer adaptive scaling, a custom gradient filter - each is a small self-contained pair of functions. That is a genuine reduction in the cost of trying an idea, and it is why new optimizers propagate quickly in this ecosystem. WHAT BECOMES HARD. Anything requiring information across the whole update that is not in the gradient tree. Second-order methods needing curvature, optimizers that adapt based on a validation signal, or logic conditioned on training dynamics all have to thread that information through the state explicitly - it cannot be reached from a global. That is more honest and more verbose. CONTROL FLOW inside the update is awkward, because it is traced: no Python conditionals on traced values, so branching becomes structured primitives, and the int()-on-a-traced-step crash is exactly this class of error arriving in a schedule. DEBUGGING is harder inside a jitted update, since values are tracers. And STATE SIZE is explicit rather than hidden, which is clarifying and also means you notice that Adam's state is twice the parameter count - which is the fact FSDP and ZeRO exploit. WHAT I WOULD ACTUALLY BUILD to test one. Write the transformation, then check three things: that it reduces to a known optimizer when its distinctive term is switched off, that the state shapes are what you expect, and that it behaves on an ILL-CONDITIONED problem rather than a well-conditioned one - because a well-conditioned test makes every optimizer look the same and tells you nothing. That last point is why the measured comparison used an ill-conditioned setting deliberately. THE TRANSFERABLE POINT, which is the module's thesis in miniature: the init/update pair is not an Optax API, it is the general shape of a stateful transformation expressed purely. Once you see it, PyTorch optimizers read as the same structure with the state hidden inside the object and the composition replaced by inheritance. Recognizing the invariant is what lets you move between them, and it is what will still be true when both libraries have been replaced."
          }
        },
        {
          "q": "When does gradient clipping actually matter?",
          "a": "MOSTLY WHERE THE OPTIMIZER IS NOT ALREADY ADAPTIVE, and the way that fact emerged is a good illustration of reading a demonstration properly. THE MEASURED RESULT: a high learning-rate run that diverged to infinity came to a finite 9.38 with a global-norm clip chained before the optimizer. THE CONSTRAINT THE DEMONSTRATION NEEDED: it had to use plain SGD on a linear model, because with Adam the run WOULD NOT DIVERGE. That is not an inconvenience in the setup - it is the finding. Adam divides by a running estimate of the gradient magnitude, so the effective step is already bounded per parameter, and a large gradient produces a correspondingly large denominator rather than a large step. So clipping's protection is largely redundant there. WHERE IT IS STILL LOAD-BEARING, even with an adaptive optimizer. Rare, LARGE spikes - a bad batch, a numerical edge case, a corrupted example - where the running estimate has not adapted yet and one step can destroy the run. Sequence models with long dependencies, where the original motivation came from and where the gradient magnitude genuinely explodes. Early training, before the adaptive statistics have settled. And any regime with high learning rates by design. In practice most large-scale training uses both an adaptive optimizer and clipping, because the failure it prevents is catastrophic and its cost when unnecessary is near zero. WHY GLOBAL NORM AND NOT PER-ELEMENT. Rescaling by the global norm preserves the update DIRECTION and only limits its magnitude. Clipping each element independently changes the direction - a parameter whose gradient was large gets attenuated relative to one whose was small, so you are no longer following the gradient. That distinction is easy to miss and it matters, because the whole justification for the step is that it points downhill. WHERE THE ORDERING TRAP LIVES, which is the production version of this. Clipping must operate on the gradient in its correct scale. In a mixed-precision setup with a loss scaler, clipping BEFORE unscaling clips a quantity that has been multiplied by the scale factor, so the effective threshold is wrong by that factor - and nothing errors. That is one of the recurring silent bugs in 16-06's territory, and it is the same 'order is semantics' point that the chain makes here. HOW I WOULD SET THE THRESHOLD: not by intuition. Log the gradient norm distribution for a few hundred steps and put the threshold above the bulk but below the spikes - typically that means clipping fires on a small percentage of steps. If it is firing constantly, the learning rate is too high or something upstream is wrong, and clipping is masking a problem rather than solving one. That monitoring is worth more than the clip itself, because the norm distribution is a LEADING indicator of instability while the loss is a lagging one."
        },
        {
          "q": "Do learning-rate schedules actually help?",
          "a": "YES, IN A REGIME - AND THE MEASURED COMPARISON NAMES A BASELINE THAT IS EASY TO CHOOSE UNFAIRLY. THE RESULT: warmup plus cosine decay reached 2.10 against a constant learning rate at the peak value, which reached 2.97. THE REGIME: ill-conditioned, full-batch SGD. THE CAVEAT: against a TUNED constant rate with an adaptive optimizer, the advantage largely disappears. So the honest claim is not 'schedules beat constants' but 'warmup plus decay beats a constant at the peak rate', and that baseline is unfairly chosen unless you say so - because nobody would run a constant at the peak of a schedule, they would tune it. WHY THE PIECES HELP, separately, since they are different mechanisms. WARMUP addresses early instability: at initialization the gradient estimates are poor and the optimizer state is uninitialized, so a large step can do damage that the run never recovers from. Ramping up avoids that. It matters more at large batch sizes, which is where the large-batch training literature introduced it - and there the mechanism is specific, because scaling the learning rate with the batch size makes the initial steps proportionally more dangerous. DECAY addresses the end of training: a large step size cannot settle into a minimum, so reducing it lets the run converge rather than bouncing. Cosine is popular because it is smooth and needs no tuning beyond the horizon. WHEN IT MATTERS MOST: full-batch or large-batch training, ill-conditioned problems, plain SGD, and long runs where the endpoint matters. WHEN IT MATTERS LEAST: adaptive optimizers with a well-tuned constant, short runs, and well-conditioned problems - where a good deal of what a schedule does is already being done by the per-parameter normalization. THE PRACTICAL POSITION I WOULD TAKE. Use warmup essentially always for large-scale training, because the failure it prevents is catastrophic and its cost is a few hundred steps. Use decay when the final loss matters and the horizon is known. And be suspicious of schedule comparisons that do not report the tuned-constant baseline, because that is the comparison that determines whether the schedule is contributing anything. AND THE GENERAL HABIT this illustrates, which the module keeps returning to: a technique's measured benefit is against a specific baseline in a specific regime. Reporting the number without both is how a result becomes a superstition - repeated because it was true once, in conditions nobody records."
        },
        {
          "q": "What does this design tell you about PyTorch's optimizers?",
          "a": "THAT THEY ARE THE SAME STRUCTURE WITH THE STATE HIDDEN AND THE COMPOSITION REPLACED BY INHERITANCE - and seeing that makes both frameworks predictable rather than requiring separate mental models. THE MAPPING. A PyTorch optimizer holds state in a dict keyed by parameter tensor and mutates parameters in step(). The functional version threads state explicitly and returns updates. Same algorithm, same state - Adam's two moment estimates per parameter either way - but one hides it inside the object and the other makes it a value you can see. WHAT THE EXPLICIT VERSION MAKES OBVIOUS, and this is why writing it once is worth the effort. Adam's optimizer state is TWICE the parameter count in floats, which is a fact you can read off the init function directly. That is exactly the observation ZeRO and FSDP exploit - optimizer state is 12 of the 16 bytes per parameter in a mixed-precision setup, which is why sharding it is the cheapest of the sharding stages. In PyTorch that fact is true and invisible; here it is in the type. WHERE THE DESIGNS DIVERGE PRACTICALLY. Composition: chaining transformations versus configuring or subclassing. Param groups: a masked transformation versus a list of dicts. Checkpointing: the state is a value you serialize versus a state_dict you extract. And schedules: a transformation in the chain versus a separate scheduler object that mutates the optimizer's learning rate - which is why PyTorch schedulers have the well-known ordering subtleties about when step() is called relative to the optimizer's. That is the same 'order is semantics' problem the chain makes explicit. WHAT TRANSFERS EITHER WAY. Every optimizer is: transform the gradient using some state, then apply. Clipping, weight decay, momentum, per-parameter normalization and schedules are all transformations of the gradient before it becomes an update, and the questions that matter - what order do they apply in, what state do they carry, what does that cost in memory - are the same questions in both. WHY THIS IS THE MODULE'S POINT IN MINIATURE. Optax is a library and it will change. 'A stateful transformation expressed as an init/update pair, composed by chaining' is a structure that predates it and will outlive it - it is what any pure formulation of an optimizer looks like. A practitioner who learned the structure reads a new framework's optimizer code and recognizes it; one who learned an API has to relearn. And in this specific case the structure also explains a memory fact that governs how large-scale training is engineered, which is a good example of a mechanism paying off two levels away from where it was learned."
        },
        {
          "q": "Why teach this without the libraries installed?",
          "a": "BECAUSE IT REMOVES THE OPTION OF TEACHING API SURFACE AND LEAVES ONLY THE DURABLE PART - and in this module that constraint turned out to be the right pedagogy rather than a limitation to apologize for. WHAT THE CONSTRAINT FORCED. Without Flax, 'parameters' had to be built as a pytree updated by tree_map, which is what Flax's parameter handling IS once you strip the module system off it. Without Optax, an optimizer had to be written as an init/update pair and composed by chaining, which is exactly Optax's GradientTransformation. So the lesson teaches the two structures rather than two import paths, and a reader who then opens either library recognizes what they are looking at. WHY THAT IS BETTER THAN THE ALTERNATIVE. An API-first treatment teaches which function to call, which is genuinely useful and has a short half-life - these libraries change, and the specific names will not survive as long as the ideas. A mechanism-first treatment teaches why the function exists, which transfers to the next library and explains behaviour the documentation does not mention. The clearest case here: understanding that an optimizer is a pure transformation makes the chain-ORDER question obvious, whereas an API-first reading treats the chain as a configuration list where order looks incidental. WHAT IT COSTS, honestly. You do not learn the real ergonomics - the module system, the state management helpers, the many small conveniences that make a mature library pleasant. Someone who has done only this exercise will be slower on their first real project than someone who read the quickstart. So it is not a substitute for using the library; it is the thing that makes using the library make sense. THE PATTERN ACROSS THIS MODULE, which is deliberate: vLLM is taught by simulating paged KV allocation, Triton by writing the tile model in numpy, ONNX by building a graph IR and an interpreter, and the compiler by measuring fusion and launch overhead directly. In each case the library is absent and the MECHANISM is the content - and in each case the mechanism is the part that explains what you will see in production. AND THE CAPSTONE MEASURES WHY THIS ALLOCATION IS RIGHT: principles have a roughly 60-month half-life against tool trivia's 8, which works out to about 7.2 times more retained knowledge per hour invested, and tool value SATURATES at fluent-enough-to-ship while principle depth keeps compounding. That is the argument for teaching this way, and it is stated as a measurement rather than a preference - which is the only way this module would be willing to make it."
        },
        {
          "q": "How does this lesson advance the module's thesis?",
          "a": "IT SHOWS THE INVARIANT UNDER TWO SPECIFIC LIBRARIES, WHICH IS THE MODULE'S CLAIM MADE CONCRETE. Flax and Optax are the current expression of two ideas: parameters as a tree of arrays, and optimizers as composable pure transformations. Neither idea belongs to either library. The pytree is what any purely-functional parameter representation has to look like, and the init/update pair is what any stateful transformation expressed purely has to look like - which is why the same structures show up in PyTorch once you use torch.func, and why they will show up in whatever replaces both. THE SECOND CONTRIBUTION IS THE REGIME DISCIPLINE, carried over from module 21 and applied here to results that are usually quoted unconditionally. 'Adam beats SGD' - on an ill-conditioned problem, 0.046 against 10.0, and the mechanism is per-parameter normalization compensating for curvature scaling. 'Clipping prevents divergence' - it did, and the demonstration REQUIRED plain SGD because Adam would not diverge, which tells you clipping is load-bearing where the optimizer is not adaptive. 'Schedules beat constants' - warmup plus cosine beat a constant AT THE PEAK RATE in an ill-conditioned full-batch setting, and against a tuned constant with an adaptive optimizer the advantage largely goes away. Every one of those is true and every one of them has a baseline and a regime that is usually dropped when the claim is repeated. THE THIRD IS THE ORDERING POINT, which generalizes past optimizers: when components compose, the order is the semantics, and a reordering is a silent behaviour change rather than an error. Clip before or after scaling; unscale before or after clipping in mixed precision; step the scheduler before or after the optimizer. All the same shape of bug, all silent, and all obvious once you see the composition as function composition rather than as a configuration list. AND THE PEDAGOGY IS THE THESIS, which is worth saying explicitly because it recurs through the whole module: the libraries were not installed, so the mechanism had to be built. That constraint removed the option of teaching an API and left the part that transfers - and the capstone will measure why that allocation of learning time is the right one rather than asserting it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The whole update is one tree_map",
        "back": "θ ← tree_map(λ p,u: p+u, θ, Δ), because grad of a pytree function returns a pytree with the SAME structure. No .parameters(), no registry — the correspondence is STRUCTURAL, which is why model and optimizer code stay independent."
      },
      {
        "type": "formula",
        "front": "★ An optimizer = (init, update), so they CHAIN",
        "back": "init: θ→s₀ · update: (g,s,θ)→(Δ,s′). That IS Optax's GradientTransformation. Because they're pure, composition is function composition — a LIST, not a class hierarchy. The optimizer becomes a VALUE you can log, checkpoint, swap."
      },
      {
        "type": "pitfall",
        "front": "★ ORDER IS SEMANTICS",
        "back": "Clip BEFORE the optimizer bounds the RAW gradient; clip after bounds the already-SCALED update. Different algorithms, no error either way. Same shape of bug as clip-vs-unscale in mixed precision and scheduler-vs-optimizer step order."
      },
      {
        "type": "formula",
        "front": "Global-norm clipping",
        "back": "g ← g·min(1, c/‖g‖₂) — rescaling the GLOBAL norm preserves the update DIRECTION and limits only magnitude. Per-element clipping changes where you're going, which destroys the justification for the step."
      },
      {
        "type": "intuition",
        "front": "★ Why the clip demo needed plain SGD",
        "back": "With Adam the run WOULDN'T diverge — per-parameter normalization already bounds the effective step. That constraint IS the finding: clipping is load-bearing exactly where the optimizer is NOT already adaptive (plus rare large spikes and early training)."
      },
      {
        "type": "formula",
        "front": "Adam vs SGD, ill-conditioned",
        "back": "0.046 vs 10.0 — the condition-number story from 04-08. Adaptive optimizers COMPENSATE for badly scaled curvature; they don't make conditioning stop mattering."
      },
      {
        "type": "pitfall",
        "front": "The schedule result names an unfair baseline",
        "back": "warmup+cosine 2.10 vs constant-AT-PEAK 2.97, in an ILL-CONDITIONED FULL-BATCH-SGD regime. Against a TUNED constant with an adaptive optimizer the advantage largely disappears. \"Schedules beat constants\" without the baseline is a superstition."
      },
      {
        "type": "intuition",
        "front": "Warmup and decay solve DIFFERENT problems",
        "back": "WARMUP: early steps are dangerous because gradient estimates are poor and optimizer state is uninitialized — matters more at large batch. DECAY: a large step can't settle into a minimum. Use warmup ~always at scale; decay when the endpoint matters."
      },
      {
        "type": "pitfall",
        "front": "int() on a traced step counter crashes",
        "back": "Inside a jitted update the step is a TRACED value, so schedules must use array ops rather than Python arithmetic — the same class of error as a Python `if` on a tracer."
      },
      {
        "type": "intuition",
        "front": "Set the clip threshold from the NORM DISTRIBUTION",
        "back": "Log gradient norms for a few hundred steps; put the threshold above the bulk, below the spikes — it should fire on a small % of steps. Constant firing means the LR is too high and clipping is masking it. The norm is LEADING; loss is lagging."
      },
      {
        "type": "intuition",
        "front": "The explicit state reveals a memory fact",
        "back": "Adam's state is 2× the parameter count, readable straight off the init function. That's the fact ZeRO/FSDP exploit — optimizer state is 12 of 16 bytes per parameter, so sharding it is the cheapest stage. True in PyTorch too, just invisible."
      },
      {
        "type": "intuition",
        "front": "Why teach it without the libraries",
        "back": "Removing the library removes the option of teaching API surface and leaves the MECHANISM — which is what explains behaviour the docs don't mention (e.g. why chain order matters). Not a substitute for using the library; the thing that makes it make sense."
      }
    ],
    "refs": [
      {
        "title": "Optax, Gradient Transformations and Chaining",
        "url": "https://optax.readthedocs.io/en/latest/api/transformations.html"
      },
      {
        "title": "Flax, Module and Parameter Handling",
        "url": "https://flax.readthedocs.io/en/latest/"
      },
      {
        "title": "Pascanu, Mikolov & Bengio (2013), On the Difficulty of Training Recurrent Neural Networks (gradient clipping)",
        "url": "https://arxiv.org/abs/1211.5063"
      },
      {
        "title": "Kingma & Ba (2014), Adam: A Method for Stochastic Optimization",
        "url": "https://arxiv.org/abs/1412.6980"
      },
      {
        "title": "Goyal et al. (2017), Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour (warmup)",
        "url": "https://arxiv.org/abs/1706.02677"
      }
    ],
    "demos": [
      "optimizers",
      "lr-schedule",
      "gradient-descent",
      "newton-vs-gradient"
    ]
  },
  "open-weight-models": {
    "level": "core",
    "body": {
      "intuition": [
        "A lesson about which open-weight models are good would be obsolete before it was published - the leaderboard turns over every few months. What does not turn over is the ARITHMETIC that decides what you can actually run, and that arithmetic is short enough to do in your head: gigabytes equals billions of parameters times bytes per parameter. A 70B model at four bits is about 35 GB, which fits comfortably in an 80 GB accelerator. That is the calculation everyone does.",
        "The calculation almost nobody does is the second one. At 32k context and a batch of 8, the KV cache for that same model comes to roughly 137 GB - which does not merely add to the weights, it DWARFS them. So the model fits and the workload does not, and the failure arrives as an out-of-memory error at some batch size rather than at load time. Deciding what you can run means budgeting weights plus cache plus activations against the device, and the cache term is the one that scales with how you intend to use it.",
        "The quality side has the same shape: a rule that holds until it does not, with a measurable cliff. Post-training quantization from full precision to int8 and int4 cost almost nothing measurable - 0.908 to about 0.906 - and int2 collapsed to 0.595. So there is a floor, it is below four bits for this task, and the practical consequence is the frontier question: under a fixed memory budget, a larger model quantized harder frequently beats a smaller model at full precision. That is the decision the arithmetic is for."
      ],
      "math": [
        {
          "h": "Weights - the calculation everybody does",
          "paras": [
            "Memory for parameters is exactly the parameter count times the bytes each one occupies.",
            "It is worth being able to do this instantly, because it rules options in and out before anything is downloaded."
          ],
          "tex": "\\text{GB} \\approx \\text{params}(\\text{B}) \\times \\text{bytes/param}, \\qquad 70 \\times 0.5 = 35\\ \\text{GB} \\;\\;(\\text{int4, fits } 80\\ \\text{GB})",
          "texNote": "fp32 is 4 bytes, fp16 and bf16 are 2, int8 is 1, int4 is 0.5. So the same 70B model is 280, 140, 70 or 35 GB depending only on the format. This single line explains most of what quantization is for at the deployment layer, and it is the reason a 4-bit 70B and a 16-bit 8B are the kind of thing people compare - they occupy similar space."
        },
        {
          "h": "The KV cache - the calculation that decides the answer",
          "paras": [
            "Cache memory scales with sequence length and batch size, neither of which appears in the weight calculation.",
            "At long context it is not a correction term - it dominates."
          ],
          "tex": "\\text{KV} = 2 \\cdot L \\cdot h_{kv} \\cdot d_{h} \\cdot s \\cdot b \\cdot \\text{bytes} \\;\\;\\Rightarrow\\;\\; \\approx 137\\ \\text{GB} \\;\\;(32\\text{k ctx}, b{=}8)",
          "texNote": "Against 35 GB of int4 weights, the cache at this operating point is roughly four times the model. So 'does it fit' has no answer without a context length and a batch size - and the failure mode is an out-of-memory error at some batch size rather than at load, which is why it surprises people. Note also which factor is absent: the number of QUERY heads. That is precisely why grouped-query attention shrinks the cache without shrinking the model."
        },
        {
          "h": "Quantization has a floor, and outliers set the scale",
          "paras": [
            "Accuracy is flat down to four bits and collapses at two, so the useful range has a measurable edge.",
            "And how you choose the scale matters more than the bit width once outliers are present."
          ],
          "tex": "0.908 \\xrightarrow{\\text{int8}} 0.906 \\xrightarrow{\\text{int4}} 0.906 \\xrightarrow{\\text{int2}} \\mathbf{0.595}, \\qquad \\text{int4: per-tensor } 0.655 \\;\\text{vs}\\; \\text{per-channel } 0.732",
          "texNote": "The int2 collapse establishes that the flatness is a regime rather than a law. The second comparison is the more useful one: a few large-magnitude channels stretch the range, so ONE scale per tensor spends most of its levels representing outliers and leaves the bulk of the weights crushed into a handful of values. Per-channel scales fix that, and this is the observation behind LLM.int8, GPTQ and AWQ - derived here rather than cited."
        }
      ],
      "code": [
        {
          "h": "The two calculations, and why the second decides",
          "paras": [
            "Do both before choosing a model, because the first one alone is misleading."
          ],
          "code": "# 1. WEIGHTS - the easy one\n#    GB = params(B) * bytes_per_param\n#      fp32 4 | fp16/bf16 2 | int8 1 | int4 0.5\n#    70B int4 = 35 GB  -> \"fits an 80 GB card\" ✓\n\n# 2. ★ KV CACHE - the one that decides, and the one people skip\n#    KV = 2 * layers * kv_heads * head_dim * seq * batch * bytes\n#    at 32k context, batch 8:  ~137 GB\n#    -> FOUR TIMES the quantized weights. The model fits; the WORKLOAD\n#       does not. And it fails as an OOM at some batch size, not at load.\n#\n#    ★ NOTE WHICH TERM IS ABSENT: the number of QUERY heads. That is\n#      exactly why grouped-query attention shrinks the cache without\n#      shrinking the model (08-07).\n\n# SO \"WILL THIS RUN?\" HAS NO ANSWER WITHOUT A CONTEXT LENGTH AND A\n# BATCH SIZE. The budget is:\n#      weights + KV(seq, batch) + activations  <=  device memory\n# and only the first term is a property of the model.\n\n# ★ THE FRONTIER QUESTION this arithmetic is FOR:\n#    under a fixed memory budget, which model?\n#      70B @ int4  = 35 GB\n#      13B @ fp16  = 26 GB\n#      8B  @ fp16  = 16 GB\n#    A BIGGER MODEL QUANTIZED HARDER frequently beats a smaller model at\n#    full precision - which is the practical reason quantization is a\n#    capability decision rather than only a cost one.",
          "caption": "The weight calculation rules models in; the KV calculation rules workloads out — and only the second depends on how you intend to use the model."
        },
        {
          "h": "Where quantization actually breaks - outliers, not bit width",
          "paras": [
            "The measured cliff and the scale-granularity comparison say different things."
          ],
          "code": "# MEASURED, post-training quantization from scratch:\n#   fp32   0.908\n#   int8   0.906     <- essentially free\n#   int4   0.906     <- still essentially free\n#   int2   0.595     ★ CLIFF - the flatness was a REGIME, not a law\n\n# ★ AND THE MORE USEFUL COMPARISON, at int4:\n#   per-TENSOR  scale   0.655\n#   per-CHANNEL scale   0.732\n#   THE MECHANISM: a few channels have much larger magnitudes, so ONE\n#   scale for the whole tensor spends its levels representing OUTLIERS\n#   and crushes the bulk of the weights into a few values.\ns_tensor  = max(abs(W)) / qmax              # outliers set the range\ns_channel = max(abs(W), axis=0) / qmax      # each channel its own range\n#   -> This is the observation behind LLM.int8, GPTQ and AWQ. HOW you\n#      choose the scale matters more than the bit width, once you are\n#      in the range where bit width alone is nearly free.\n\n# ⚠ HONESTY NOTE FROM BUILDING THIS: the first classifier trained to\n#   CHANCE (0.537) - not a modelling failure but a DATA BUG, because\n#   the generator gave train and test DIFFERENT decision boundaries.\n#   ★ Chance-level accuracy is a data-bug SIGNATURE. Before tuning\n#     anything, check that train and test came from the same process.\n#   Also: int2 had to be added, because int4 alone showed no\n#   degradation and there would have been no cliff to see.",
          "caption": "Bit width is nearly free down to four bits; how the scale is chosen is what actually breaks, which is why per-channel scaling is the standard fix."
        }
      ],
      "useCases": [
        "Deciding whether a model will run on the hardware you have, which requires the KV-cache calculation and not only the weight calculation.",
        "Choosing between a larger quantized model and a smaller full-precision one under a fixed memory budget, which the frontier makes a calculable comparison.",
        "Sizing a serving deployment, where the batch size you can support follows from the cache arithmetic rather than from the model card.",
        "Reading quantization claims critically, since bit width alone is nearly free in the useful range and scale granularity is where quality is actually lost."
      ],
      "pitfalls": [
        "Checking whether the weights fit and stopping there. At 32k context and batch 8 the KV cache was roughly four times the int4 weights, so the model fits and the workload does not.",
        "Quoting a memory requirement without a context length and batch size. Only the weight term is a property of the model; the rest depends on how you intend to use it.",
        "Assuming quantization is free because int8 and int4 measured flat. The int2 collapse to 0.595 shows the flatness is a regime with an edge, not a law.",
        "Using one scale per tensor. A few large-magnitude channels stretch the range and crush everything else, which cost about eight points against per-channel scaling at int4.",
        "Comparing models at equal parameter count rather than equal memory. Under a fixed budget the right comparison is a larger quantized model against a smaller full-precision one.",
        "Treating chance-level accuracy as a modelling problem. It is a data-bug signature - here the generator gave train and test different decision boundaries - and tuning will not fix it.",
        "Forgetting that the KV cache formula omits query heads. That absence is exactly why grouped-query attention shrinks the cache without shrinking the model."
      ],
      "connections": [
        {
          "ref": "llm-systems/quantization",
          "text": "The mechanism in depth - PTQ versus QAT, GPTQ and AWQ, and why accuracy is a step function that cannot see the distributional damage quantization does."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Where the parameter count comes from, and the per-layer budget that lets you estimate a model's size from its shape."
        },
        {
          "ref": "transformers/gqa-mqa",
          "text": "The KV-cache formula's missing query-head term, which is the whole reason grouped-query attention works as a cache reduction."
        },
        {
          "ref": "frontier-frameworks/vllm-inference",
          "text": "What to do about the cache once you have measured it - paged allocation turns the reservation problem into a utilization problem."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The other half of the model-choice question - what a given parameter count is worth, and why inference-aware training pushes toward smaller models trained longer."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How much memory does a 70B model need at int4?",
          "a": "About 35 GB - parameters in billions times bytes per parameter, and int4 is half a byte each."
        },
        {
          "q": "So it fits an 80 GB card?",
          "a": "The weights do. At 32k context and batch 8 the KV cache is around 137 GB, so the workload does not."
        },
        {
          "q": "What does the KV cache scale with?",
          "a": "Layers, KV heads, head dimension, sequence length, batch size and bytes per value - the last two are your workload, not the model."
        },
        {
          "q": "Which term is missing from the KV formula?",
          "a": "The number of query heads. That absence is exactly why grouped-query attention shrinks the cache without shrinking the model."
        },
        {
          "q": "When does the memory failure show up?",
          "a": "As an out-of-memory error at some batch size, not at load time - which is why checking only the weights is misleading."
        },
        {
          "q": "What did quantization cost, measured?",
          "a": "0.908 at full precision, about 0.906 at int8 and int4, and 0.595 at int2 - a cliff below four bits."
        },
        {
          "q": "What does the int2 collapse tell you?",
          "a": "That the flatness at int8 and int4 is a regime with an edge rather than a law - there is a floor and it is task-dependent."
        },
        {
          "q": "Per-tensor or per-channel scaling?",
          "a": "Per-channel. At int4 it measured 0.732 against per-tensor's 0.655, because a few large channels otherwise stretch the range."
        },
        {
          "q": "What is the outlier problem exactly?",
          "a": "A few channels have much larger magnitudes, so one scale per tensor spends its levels on outliers and crushes the bulk of weights into few values."
        },
        {
          "q": "What is the frontier question?",
          "a": "Under a fixed memory budget, which model - and a larger model quantized harder frequently beats a smaller one at full precision."
        },
        {
          "q": "What does chance-level accuracy usually mean?",
          "a": "A data bug. Here the generator gave train and test different decision boundaries, and no amount of tuning would have fixed it."
        },
        {
          "q": "Why is the memory arithmetic worth memorizing?",
          "a": "Model names turn over every few months and the arithmetic does not - it is the durable part of the deployment decision."
        }
      ],
      "standard": [
        {
          "q": "How do you decide whether a model will run on your hardware?",
          "a": "WITH TWO CALCULATIONS, AND THE SECOND ONE IS THE ONE THAT DECIDES - which is the reverse of how people usually approach it. CALCULATION ONE, WEIGHTS: gigabytes equals parameters in billions times bytes per parameter. fp32 is 4, fp16 and bf16 are 2, int8 is 1, int4 is 0.5. So a 70B model is 280, 140, 70 or 35 GB depending only on format. This rules models in and out instantly and it is worth being able to do in your head. CALCULATION TWO, THE KV CACHE: two, times layers, times KV heads, times head dimension, times sequence length, times batch size, times bytes. At 32k context with a batch of 8, that came to roughly 137 GB for the same model - about four times the int4 weights. So the weights fit an 80 GB device and the workload does not, and the failure arrives as an out-of-memory error at some batch size rather than at load time, which is why it catches people out. THE CONSEQUENCE, stated plainly: 'will this model run' has no answer without a context length and a batch size. The budget is weights plus cache plus activations against device memory, and only the first term is a property of the model - the other two are properties of how you intend to use it. A model card telling you the parameter count has told you one of three terms. THE TERM THAT IS ABSENT from the cache formula is worth noticing: the number of QUERY heads. Cache size depends on KV heads only, which is precisely why grouped-query attention reduces it substantially without reducing model capacity - the queries can stay numerous while the keys and values are shared. That is a design fact you can read off the formula. WHAT I WOULD ACTUALLY DO with the numbers. Work backwards: fix the context length and batch size the product needs, compute the cache, subtract from device memory, and see what is left for weights. That tells you which models are candidates, rather than picking a model and discovering the constraint later. And if nothing fits, the levers are visible in the formula - shorter context, smaller batch, more aggressive weight quantization, KV-cache quantization, grouped-query attention, or paged allocation to stop reserving for the maximum length. AND THE REASON THIS IS THE DURABLE CONTENT: the specific models in the landscape turn over every few months, so a lesson about which one is best would be stale immediately. The arithmetic does not turn over. Someone who can do these two calculations can evaluate a model released next year on hardware released next year, which is what the skill is for.",
          "deepDive": {
            "q": "You have an 80 GB accelerator and need 32k context. Walk through the options.",
            "a": "I WOULD START FROM THE CACHE, BECAUSE IT IS THE BINDING TERM AT THAT CONTEXT LENGTH, and work backwards to what the weights can be. THE STARTING POSITION: at 32k context and batch 8, a 70B-class model's KV cache is around 137 GB - already over budget before any weights. So the batch of 8 is not available at that context on one device, and the question becomes which combination of levers gets there. LEVER 1 - REDUCE THE BATCH. The cache is linear in batch size, so batch 1 at 32k is roughly 17 GB, which leaves room for 35 GB of int4 weights comfortably. That works and it destroys throughput, because decode is memory-bandwidth-bound and batching is the main way to amortize the weight read across sequences. So this is the option that makes the model run and makes the service uneconomic - worth knowing as a floor rather than a plan. LEVER 2 - GROUPED-QUERY ATTENTION, if the model has it. Cache scales with KV heads, so a model with 8 KV heads against 64 query heads has a cache an eighth the size of a multi-head equivalent. This is the single largest architectural lever and it costs nothing at inference time because it is a property of the model you chose - which makes it a selection criterion rather than a tuning knob. LEVER 3 - QUANTIZE THE CACHE, not just the weights. The cache is usually fp16; int8 halves it. The quality cost is real but modest in practice, and it acts on the term that is dominating, which is where leverage is. LEVER 4 - PAGED ALLOCATION. Most of the apparent cache requirement is RESERVATION for the maximum length rather than tokens actually generated - a request that produces 200 tokens does not need 32k of cache. Paged allocation in fixed blocks means you pay for what is used, and the measured effect elsewhere in this module is roughly a sixfold increase in concurrent requests at much higher utilization. This is usually the biggest practical win and it requires no model change. LEVER 5 - SMALLER OR MORE AGGRESSIVELY QUANTIZED WEIGHTS, which frees space for cache. The frontier comparison applies: a 70B at int4 and a 13B at fp16 occupy comparable space, and the larger quantized model is frequently better - but the smaller model also has a proportionally smaller cache, so at long context it wins twice. That interaction is easy to miss when comparing only weight sizes. LEVER 6 - MORE DEVICES, with tensor parallelism inside a node, which splits both weights and cache. HOW I WOULD ACTUALLY SEQUENCE IT: choose a GQA model, use paged allocation, quantize weights to int4 and measure the quality cost on my own task, then quantize the cache if still short, and only then reduce context or batch - because those two are the levers that degrade the product rather than the implementation. AND THE MEASUREMENT I would insist on before committing: quality on my own evaluation set at each quantization setting, since the flat int8-and-int4 result is a regime and the cliff's location is task-dependent. Assuming int4 is free because it was free in a benchmark is exactly the error the int2 collapse is there to warn about."
          }
        },
        {
          "q": "Why does per-channel quantization beat per-tensor, and what does that tell you?",
          "a": "BECAUSE A FEW LARGE CHANNELS SET THE RANGE FOR EVERYTHING ELSE, and the measured gap - 0.732 against 0.655 at int4 - says that HOW you choose the scale matters more than the bit width once you are in the range where bit width is nearly free. THE MECHANISM. Quantization maps a continuous range onto a small number of levels, and the scale factor is set by the largest magnitude that must be represented. With ONE scale for the whole tensor, a handful of outlier channels with much larger magnitudes stretch that range - so most of the available levels are spent covering values that only a few weights occupy, and the bulk of the weights get crushed into a few adjacent levels. The effective precision for the typical weight is far lower than the nominal bit width suggests. Per-channel scaling gives each channel its own range, so an outlier channel's magnitude no longer degrades its neighbours. WHY THIS IS MORE THAN A DETAIL. It is the observation the whole modern quantization literature is built on. LLM.int8 identified that a small number of outlier FEATURES dominate and handled them in higher precision. GPTQ solves for weights that minimize the output error rather than the weight error, which implicitly handles the same problem. AWQ observes that not all weights matter equally and protects the salient ones based on activation magnitudes. All three are responses to the same fact: the distribution is not uniform, and treating it as uniform wastes the range. WHAT IT TELLS YOU PRACTICALLY. First, when evaluating a quantization method, the granularity of the scale is a first-class question and often more important than the nominal bits - a 'per-tensor int8' and a 'per-channel int4' are not ordered the way the bit widths suggest. Second, the outliers are a property of the model and the data, so a method that works on one architecture may not transfer, and measuring on your own model is not optional. Third, the direction of the fix generalizes: whenever a shared parameter is set by an extreme value, giving finer-grained parameters is the standard remedy - which is the same argument as per-channel batch norm statistics or per-layer learning rates. THE HONEST LIMIT of the measured comparison: it was demonstrated on a small classifier, so the specific numbers do not transfer to a transformer. What transfers is the mechanism and the ordering - per-channel beats per-tensor for the same reason at any scale, and the reason is that the weight distribution has a tail. AND THE LESSON THE MEASUREMENT SETUP TEACHES: int2 had to be added deliberately, because int4 alone showed no degradation and there would have been no cliff to observe. A quantization evaluation that stops at the bit width where nothing happens has demonstrated nothing about where the floor is - which is the number you actually need."
        },
        {
          "q": "Given a fixed memory budget, how do you choose a model?",
          "a": "BY COMPARING AT EQUAL MEMORY RATHER THAN AT EQUAL PARAMETER COUNT, which is the comparison the arithmetic exists to make possible. THE SETUP. A 70B at int4 is about 35 GB. A 13B at fp16 is about 26 GB. An 8B at fp16 is about 16 GB. Those are the real alternatives under a budget, and comparing '70B versus 13B' without stating the precision is comparing things that do not occupy comparable space. THE GENERAL FINDING, which the frontier makes visible: a LARGER MODEL QUANTIZED HARDER frequently beats a smaller model at full precision, because quantization down to four bits costs very little - measured at 0.906 against 0.908 - while parameter count buys real capability. That is why quantization is a capability decision at the deployment layer rather than only a cost optimization: it changes which models are available to you at all. WHAT COMPLICATES IT, and these are the parts that make it a real decision rather than a rule. The KV CACHE also scales with model size, so a smaller model wins twice at long context - smaller weights AND a smaller cache per token. At 32k context that second effect can dominate, so the frontier's ordering can reverse depending on the workload. Architecture matters: a model with grouped-query attention has a much smaller cache than one without at the same parameter count, which can be worth more than the parameter difference. And the quality cost of quantization is TASK-DEPENDENT - the flat result is a regime, and where the cliff sits depends on what you are measuring, so the comparison has to be run on your own evaluation set. HOW I WOULD RUN IT. Fix the memory budget, the context length and the batch size the product needs. Enumerate the candidates that fit under those constraints - which is now a calculation rather than a guess. Evaluate each on my own task at the quantization setting it needs to fit. Then compare on quality, latency and cost together, because a model that fits and is too slow has not solved the problem. THE THING I WOULD MEASURE THAT PEOPLE SKIP: quality at the ACTUAL quantization setting, not the published benchmark for that model at full precision. A model card's scores are for the unquantized version, and the frontier decision depends on the quantized quality - which is a different number, on your data, and it is the only one that answers the question. AND THE DURABLE PART: this whole procedure is model-agnostic. It works for the models available today, and it will work for whatever replaces them, because the inputs are memory arithmetic and a task-specific evaluation rather than a leaderboard position."
        },
        {
          "q": "What should you actually check before adopting an open-weight model?",
          "a": "FIVE THINGS, AND THE BENCHMARK SCORES ARE THE LEAST INFORMATIVE OF THEM. (1) THE MEMORY ARITHMETIC at your context length and batch size, which determines whether the question is even live. Weights plus KV cache plus activations against your device, with the cache computed from the model's actual layer count and KV head count rather than assumed. This is the fastest way to eliminate candidates, and it takes minutes. (2) THE LICENCE, which is a genuine constraint people discover late. 'Open weights' covers a wide range - some licences restrict commercial use, some restrict use above a scale threshold, some restrict training other models on outputs, and some are properly permissive. This is a legal and product question that can invalidate an otherwise-good technical choice, and it should be checked first because it is cheap. (3) QUALITY ON YOUR OWN TASK, at the quantization setting you will actually deploy. Published benchmark scores are for the full-precision model on public benchmarks, and both of those differ from your situation. Public benchmarks are also subject to contamination and to selection - the reported configuration is often the best of several - so they establish a shortlist rather than a ranking. (4) THE ARCHITECTURE'S SERVING PROPERTIES, which the parameter count hides. Does it use grouped-query attention, which shrinks the cache substantially? Is it a mixture of experts, where all experts must be resident even though only some compute - so the memory footprint is the full parameter count while the FLOPs are much lower? That MoE asymmetry is a common and expensive surprise: a model that is cheap to train and cheap in FLOPs can be expensive to serve. What is the trained context length, and does quality actually hold there rather than the window merely being advertised? (5) THE ECOSYSTEM: is it supported by the inference engine you plan to use, are there quantized versions with known quality, is the tokenizer well-behaved for your languages. This is unglamorous and it determines how much work adoption is. WHAT I WOULD DELIBERATELY NOT DO: choose based on leaderboard position. The ordering changes constantly, the differences at the top are often within noise, and the metric that decides your product is quality on your task under your memory and latency constraints - which no leaderboard measures. AND THE MODULE'S POINT ONE MORE TIME: every item above is durable. The list of models is not. Someone who runs this checklist can evaluate a model released after this was written, which is the only useful form the knowledge can take in a landscape that turns over this fast."
        },
        {
          "q": "Your model trains to chance accuracy. What do you check?",
          "a": "THE DATA, BEFORE ANYTHING ELSE - because chance-level accuracy is a data-bug SIGNATURE rather than a modelling failure, and this exact case occurred while building this lesson. WHAT HAPPENED: a classifier trained to 0.537 on a binary task. That reads as a model that cannot learn, and the instinct is to tune - more capacity, different learning rate, longer training. The actual cause was that the data generator produced train and test sets with DIFFERENT decision boundaries, so the model learned the training boundary correctly and was evaluated against a different one. No amount of tuning fixes that, and every hour spent on the model is wasted. WHY CHANCE IS DIAGNOSTIC. A model that is genuinely too weak usually still gets ABOVE chance, because most real tasks have some easily-learnable signal. Landing exactly at chance means the labels carry no usable relationship to the features AS EVALUATED, which points at the data pipeline rather than the model. THE CHECKS, in order of how fast they are. (1) Can the model overfit a SINGLE BATCH? If it cannot drive the loss to near zero on ten examples, the bug is in the model, the loss or the optimizer. If it CAN, the model is fine and the problem is data or evaluation. This is the fastest and most decisive test available and it should be reflexive. (2) Are train and test drawn from the same process? Same generator, same preprocessing, same label mapping. This is what failed here. (3) Are labels aligned with inputs - no off-by-one from a shuffle, no misaligned index after a filter? (4) Is the label mapping consistent - class 0 meaning the same thing in both splits? (5) Is there a shape or transpose error making the model see permuted features? (6) Is the evaluation itself correct - the right split, the right metric, no argmax over the wrong axis? WHAT I WOULD BUILD SO THIS IS CHEAP: the overfit-one-batch check as a standing test, and an assertion that train and test come from the same generator configuration. Both are a few lines and both catch a class of bug that otherwise consumes days. THE GENERAL PRINCIPLE this belongs to, which recurs throughout the curriculum: a surprising result is more often an instrumentation or data bug than a discovery. The measured number was 0.537 and the conclusion 'this task is not learnable' would have been completely wrong. Checking the pipeline before believing the finding is what separates a measurement from a mistake - and it is the same reflex as measuring the compile CACHE before believing a speedup."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE CLEAREST CASE WHERE THE PERISHABLE AND THE DURABLE ARE EASY TO TELL APART. The list of open-weight models is the most perishable content in this entire curriculum - the leaderboard turns over every few months, and a lesson naming the best model would be wrong before anyone read it. The MEMORY ARITHMETIC is the opposite: gigabytes equals parameters times bytes per parameter, and cache equals two times layers times KV heads times head dimension times sequence times batch. Those will be true for every model in this architecture family, on every accelerator, for as long as the architecture lasts. So the lesson teaches the calculations and treats the model list as an example. THE SPECIFIC FINDING WORTH CARRYING is that the calculation everyone does is not the one that decides. Weights at int4 fit comfortably; the KV cache at a realistic context and batch was roughly four times larger and blew the budget. That is a case where the obvious number is genuinely misleading rather than merely incomplete - and it fails as an out-of-memory error at some batch size rather than at load, so it is discovered late. THE SECOND is that a rule can be flat until it is not. Quantization to int8 and int4 cost essentially nothing measurable, and int2 collapsed to 0.595. That establishes the flatness as a regime with an edge, and the practical instruction is to find the edge on your own task rather than assuming a published bit width transfers. It is the same discipline module 21 applied to agent techniques, arriving in a numerical setting. THE THIRD is that the mechanism matters more than the headline parameter. Per-channel versus per-tensor scaling was worth more at int4 than another bit would have been, because outliers set the range - and that single observation is what LLM.int8, GPTQ and AWQ are all responses to. Deriving it puts you in a position to evaluate the next method in that family rather than taking its claims on trust. AND THE HONESTY NOTE belongs to the thesis too: the classifier that trained to chance was a data bug wearing a modelling failure's clothes, and the reflex it teaches - check the pipeline before believing the result - is the same reflex as measuring the compile cache before believing a speedup. Both are cases where the instrument, not the system, produced the number."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The calculation everybody does",
        "back": "GB ≈ params(B) × bytes/param. fp32 4 · fp16/bf16 2 · int8 1 · int4 0.5. So a 70B is 280 / 140 / 70 / 35 GB by format alone — which is why \"70B@int4\" and \"13B@fp16\" are comparable objects."
      },
      {
        "type": "formula",
        "front": "★ The calculation that DECIDES",
        "back": "KV = 2·L·h_kv·d_head·seq·batch·bytes → **~137 GB at 32k ctx, batch 8** vs 35 GB of int4 weights. The model fits; the WORKLOAD doesn't. And it fails as an OOM at some batch size, not at load."
      },
      {
        "type": "intuition",
        "front": "\"Will this run?\" has no answer alone",
        "back": "The budget is weights + KV(seq, batch) + activations ≤ device. Only the FIRST term is a property of the model — the other two are properties of how you intend to use it. A parameter count is one of three terms."
      },
      {
        "type": "intuition",
        "front": "The term missing from the KV formula",
        "back": "The number of QUERY heads. Cache depends on KV heads only — which is exactly why grouped-query attention shrinks the cache without shrinking model capacity. A design fact you can read straight off the formula."
      },
      {
        "type": "formula",
        "front": "Quantization has a FLOOR",
        "back": "fp32 0.908 → int8 0.906 → int4 0.906 → **int2 0.595**. The flatness at 8 and 4 bits is a REGIME with an edge, not a law — and int2 had to be added deliberately, or there'd have been no cliff to see."
      },
      {
        "type": "formula",
        "front": "★ Outliers set the scale — per-channel wins",
        "back": "int4: per-TENSOR 0.655 vs per-CHANNEL 0.732. A few large channels stretch the range, so one scale spends its levels on outliers and crushes the bulk into a few values. HOW you scale beats how many bits."
      },
      {
        "type": "intuition",
        "front": "That one observation explains three methods",
        "back": "LLM.int8 (handle outlier features in higher precision) · GPTQ (minimize OUTPUT error, not weight error) · AWQ (protect salient weights by activation magnitude). All responses to: the distribution has a tail."
      },
      {
        "type": "intuition",
        "front": "★ The frontier question",
        "back": "Under a fixed memory budget, a BIGGER model quantized HARDER frequently beats a smaller one at full precision. So quantization is a CAPABILITY decision, not only a cost one — it changes which models exist for you."
      },
      {
        "type": "pitfall",
        "front": "…but the frontier can reverse at long context",
        "back": "A smaller model wins TWICE — smaller weights AND a smaller cache per token. At 32k the second effect can dominate, so compare at equal memory INCLUDING the cache at your actual context and batch."
      },
      {
        "type": "pitfall",
        "front": "★ Chance accuracy is a DATA-BUG signature",
        "back": "A classifier trained to 0.537 — not a weak model but a generator giving train and test DIFFERENT decision boundaries. Reflex: can it overfit ONE BATCH? If yes, the model is fine and the bug is data or evaluation."
      },
      {
        "type": "intuition",
        "front": "What to check before adopting an open-weight model",
        "back": "Memory arithmetic at YOUR ctx/batch · the LICENCE (checked first, it's cheap and can invalidate everything) · quality on YOUR task at the DEPLOYED quantization · serving properties (GQA? MoE = full memory, low FLOPs) · ecosystem support."
      },
      {
        "type": "intuition",
        "front": "Why this is the durable content",
        "back": "The model list is the most perishable thing in the curriculum; the arithmetic is true for every model in this architecture family on every accelerator. Learn the calculation, treat the leaderboard as an example."
      }
    ],
    "refs": [
      {
        "title": "Dettmers et al. (2022), LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
        "url": "https://arxiv.org/abs/2208.07339"
      },
      {
        "title": "Frantar et al. (2022), GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers",
        "url": "https://arxiv.org/abs/2210.17323"
      },
      {
        "title": "Lin et al. (2023), AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration",
        "url": "https://arxiv.org/abs/2306.00978"
      },
      {
        "title": "Dettmers & Zettlemoyer (2022), The Case for 4-bit Precision: k-bit Inference Scaling Laws",
        "url": "https://arxiv.org/abs/2212.09720"
      },
      {
        "title": "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models",
        "url": "https://arxiv.org/abs/2307.09288"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "distillation",
      "kv-cache"
    ]
  },
  "vllm-inference": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The idea behind paged attention is not from machine learning. It is virtual memory, from operating systems, applied to the KV cache - and recognizing that is what makes it obvious rather than clever. The problem is the same one that motivated paging in the first place: you have variable-sized objects whose final size is unknown when you allocate, and reserving the maximum for each one wastes most of your memory to internal fragmentation.",
        "The waste is much larger than intuition suggests. Reserving a contiguous block for the maximum sequence length fit 97 concurrent requests at 15% UTILIZATION - meaning 85% of the memory reserved for KV cache never held a single token, because most requests finish far short of the maximum. Allocating instead in fixed 16-token blocks, with a table mapping logical positions to physical blocks, fit 621 requests at 98% utilization. That is a 6.4-fold increase in concurrency from an allocation strategy, with no change to the model, the kernels or the hardware.",
        "The second measurement is about scheduling rather than allocation and it compounds with the first. In static batching, the whole batch runs until the LONGEST sequence finishes, so finished sequences sit idle occupying slots. Continuous batching evicts them each step and admits waiting requests immediately, which measured 1.74 times the throughput at 93% utilization against 54%. Both results have the same shape: the model was never the bottleneck, the memory management was."
      ],
      "math": [
        {
          "h": "Contiguous reservation wastes the gap between expected and maximum",
          "paras": [
            "If you must reserve for the worst case but usually need much less, utilization is the ratio of the two.",
            "That ratio is small whenever the length distribution has a long tail, which it always does."
          ],
          "tex": "\\text{util} = \\frac{\\mathbb{E}[\\text{len}]}{\\text{len}_{\\max}} \\;\\Rightarrow\\; 15\\%, \\qquad \\text{concurrent requests} = \\Big\\lfloor \\frac{M}{\\text{KV}(\\text{len}_{\\max})} \\Big\\rfloor = 97",
          "texNote": "The denominator is the maximum because you cannot know in advance how long a generation will run, and moving a sequence's cache later would be expensive. So every request pays for the longest thing it might become. With a typical output-length distribution that is most of the memory, and the measured 15% means 85% of the KV region held nothing at all."
        },
        {
          "h": "Paging bounds the waste by the block size",
          "paras": [
            "Allocate fixed-size blocks on demand and keep a table from logical position to physical block.",
            "Then a sequence wastes at most the unused remainder of its last block."
          ],
          "tex": "\\text{waste} \\le (\\text{block}-1) \\text{ per sequence} \\;\\Rightarrow\\; \\text{util } 98\\%, \\quad 621 \\text{ requests } (6.4\\times)",
          "texNote": "The waste no longer depends on the maximum length at all - only on the block size, which you choose. This is exactly the operating-system argument for paging over fixed partitions, and the indirection has the same cost: an extra lookup per access, which the attention kernel must handle by gathering from non-contiguous blocks rather than reading a contiguous span."
        },
        {
          "h": "Block size is a U-curve, for the classic reasons",
          "paras": [
            "Small blocks reduce fragmentation and increase table overhead and indirection.",
            "Large blocks reduce overhead and bring fragmentation back."
          ],
          "tex": "\\text{cost}(\\text{block}) = \\underbrace{\\alpha/\\text{block}}_{\\text{table + indirection}} + \\underbrace{\\beta \\cdot \\text{block}}_{\\text{internal frag.}} \\;\\;\\Rightarrow\\;\\; \\text{min at } 16",
          "texNote": "The measured minimum at 16 tokens is the same U-curve that sets an operating system's page size, arrived at from the same two competing terms. It is worth noticing that the optimum is a property of the workload's length distribution and the kernel's gather cost, not a universal constant - so it is a parameter to measure rather than a number to copy, even though 16 is a sensible default."
        }
      ],
      "code": [
        {
          "h": "The allocation change, and what it buys",
          "paras": [
            "Two strategies for the same memory, differing only in how it is handed out."
          ],
          "code": "# STRATEGY 1 - CONTIGUOUS, reserve for the MAXIMUM length.\n#   You cannot know how long a generation will run, and relocating a\n#   sequence's cache later is expensive - so every request pays for the\n#   longest thing it might become.\n#     concurrent requests   97\n#     KV utilization        15%   <- 85% of reserved memory held NOTHING\n\n# ★ STRATEGY 2 - PAGED: fixed 16-token blocks, allocated on demand,\n#   with a table mapping logical position -> physical block.\nblock_table[seq_id] = [blk7, blk3, blk91, ...]   # NON-contiguous\n#     concurrent requests   621   (6.4x)\n#     KV utilization        98%\n#   Waste is now bounded by (block_size - 1) per sequence and no longer\n#   depends on the maximum length AT ALL.\n\n# ★ THE IDEA IS NOT FROM ML. This is VIRTUAL MEMORY: fixed partitions\n#   with internal fragmentation, replaced by pages plus a page table.\n#   Recognizing the precedent is what makes it obvious rather than\n#   clever - and it is why the technique will outlive the library that\n#   popularized it.\n\n# THE COST, the same one paging always has: an extra indirection. The\n# attention kernel must GATHER from non-contiguous blocks instead of\n# reading a contiguous span, which is why paged attention needs a\n# custom kernel rather than being a pure allocator change.\n\n# AND THE BONUS THE INDIRECTION ENABLES: blocks can be SHARED. Two\n# requests with the same prompt prefix point at the same physical\n# blocks (copy-on-write when they diverge) - so prefix sharing and\n# beam search become memory-cheap, which contiguous allocation cannot\n# express at all.",
          "caption": "The 6.4× concurrency comes from an allocation strategy, not from the model, the kernels or the hardware — and the indirection it introduces is what makes prefix sharing possible."
        },
        {
          "h": "Continuous batching, and the block-size U-curve",
          "paras": [
            "The scheduling change compounds with the allocation change, and the tuning parameter behaves classically."
          ],
          "code": "# STATIC BATCHING: form a batch, run until the LONGEST sequence\n# finishes. Sequences that finished early sit idle holding their slots.\n#     throughput  1.00x      utilization 54%\n#\n# ★ CONTINUOUS BATCHING: at every decode step, evict finished\n#   sequences and admit waiting ones.\n#     throughput  1.74x      utilization 93%\n#   The mechanism is just that a decode step is independent per\n#   sequence, so the batch's membership can change between steps -\n#   there is no reason to keep a finished sequence in it.\n\n# ★ BLOCK SIZE IS A U-CURVE, minimum at 16:\n#     too SMALL -> more blocks, bigger table, more indirection per access\n#     too LARGE -> internal fragmentation returns\n#   Exactly the two competing terms that set an OS page size. The\n#   optimum depends on YOUR length distribution and gather cost, so 16\n#   is a sensible default rather than a constant.\n\n# ⚠ WHAT THIS SIMULATION DOES AND DOESN'T MEASURE, stated plainly:\n#   it models ALLOCATION and SCHEDULING behaviour - occupancy,\n#   fragmentation, admission - which is where the 6.4x and 1.74x come\n#   from. It does NOT measure kernel performance, memory bandwidth or\n#   real latency. Those numbers are honest about the mechanism and are\n#   not a benchmark of any implementation.",
          "caption": "Continuous batching works because a decode step is independent per sequence — so there is no reason for a finished one to keep its slot."
        }
      ],
      "useCases": [
        "Serving many concurrent requests against one model, where allocation strategy rather than model choice determines how many fit.",
        "Workloads with highly variable output lengths, which is exactly where contiguous max-length reservation wastes the most.",
        "Systems with heavy prompt reuse - shared system prompts, few-shot prefixes, branching generation - where block sharing turns duplication into pointers.",
        "Capacity planning, where the concurrency you can support follows from the block arithmetic rather than from a benchmark on one request."
      ],
      "pitfalls": [
        "Reserving KV memory for the maximum sequence length. Measured utilization was 15%, so most of the reserved region never held a token, and concurrency was six times lower than it needed to be.",
        "Treating the 6.4x as a model or kernel improvement. It came entirely from how memory is handed out, which is why the same idea works for any model.",
        "Keeping finished sequences in a static batch. They occupy slots until the longest sequence completes, which measured as 54% utilization against continuous batching's 93%.",
        "Copying a block size of 16 without measuring. It is the minimum of a U-curve whose position depends on your length distribution and gather cost, not a universal constant.",
        "Expecting paged allocation to be a pure allocator change. The attention kernel must gather from non-contiguous blocks, which is why it needs kernel support rather than only a memory manager.",
        "Ignoring prefix sharing. Block indirection lets identical prompt prefixes point at the same physical blocks, which contiguous allocation cannot express at all.",
        "Reading simulation numbers as a benchmark. The model captures allocation and scheduling behaviour, not kernel performance, bandwidth or real latency."
      ],
      "connections": [
        {
          "ref": "transformers/kv-cache",
          "text": "Where the cache comes from and why it grows with sequence length - the object this lesson is about managing."
        },
        {
          "ref": "frontier-frameworks/open-weight-models",
          "text": "The arithmetic that shows the cache rivalling the weights at long context, which is what makes its allocation the binding constraint."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "The other side of inference efficiency - amortizing the weight read across more tokens, which composes with better cache utilization."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The complementary lever: fewer bytes per parameter and per cache entry, attacking the same memory-bandwidth constraint from the value side."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The general serving concerns this sits inside - batching policy, admission control, tail latency and capacity planning."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What idea is paged attention borrowed from?",
          "a": "Virtual memory. Fixed-size blocks plus a table mapping logical to physical, replacing contiguous reservation with internal fragmentation."
        },
        {
          "q": "Why must contiguous allocation reserve the maximum?",
          "a": "You cannot know how long a generation will run, and relocating a sequence's cache later is expensive - so every request pays for its worst case."
        },
        {
          "q": "What was the measured utilization?",
          "a": "15% contiguous against 98% paged, so 85% of the reserved KV region never held a token."
        },
        {
          "q": "And the concurrency effect?",
          "a": "97 requests contiguous against 621 paged - 6.4 times, from an allocation strategy with no change to model, kernels or hardware."
        },
        {
          "q": "How much does paging waste?",
          "a": "At most the block size minus one per sequence - and crucially, it no longer depends on the maximum length at all."
        },
        {
          "q": "What does the indirection cost?",
          "a": "An extra lookup per access, and the attention kernel must gather from non-contiguous blocks rather than read a contiguous span."
        },
        {
          "q": "What does the indirection enable?",
          "a": "Block sharing - identical prompt prefixes point at the same physical blocks with copy-on-write, which contiguous allocation cannot express."
        },
        {
          "q": "What is static batching's problem?",
          "a": "The batch runs until the longest sequence finishes, so sequences that completed early hold their slots idle."
        },
        {
          "q": "What did continuous batching measure?",
          "a": "1.74 times the throughput at 93% utilization against 54% - evicting finished sequences and admitting waiting ones every step."
        },
        {
          "q": "Why is that possible at all?",
          "a": "A decode step is independent per sequence, so batch membership can change between steps - there is no reason to keep a finished one."
        },
        {
          "q": "Why is block size a U-curve?",
          "a": "Small blocks add table overhead and indirection; large blocks bring back internal fragmentation. The measured minimum was 16."
        },
        {
          "q": "What does the simulation not measure?",
          "a": "Kernel performance, memory bandwidth and real latency. It models allocation and scheduling, which is where those two numbers come from."
        }
      ],
      "standard": [
        {
          "q": "Explain paged attention and why it works.",
          "a": "IT IS VIRTUAL MEMORY APPLIED TO THE KV CACHE, and recognizing the precedent is what makes it obvious rather than clever. THE PROBLEM. During generation, each sequence accumulates a KV cache that grows one token at a time, and you do not know how long it will grow for. Contiguous allocation therefore has to RESERVE for the maximum possible length, because relocating a sequence's cache mid-generation would be expensive. So every request occupies the space of the longest thing it might become. THE WASTE, measured: 97 concurrent requests at 15% utilization. Eighty-five percent of the memory reserved for KV cache never held a single token, because output lengths have a long tail and most requests finish far short of the maximum. That is not a rounding error - it is most of the memory. THE FIX. Allocate in fixed-size blocks - 16 tokens - on demand, and keep a table mapping each sequence's logical positions to physical blocks. Now a sequence's blocks need not be contiguous, allocation happens as it grows, and the waste is bounded by the unused remainder of the last block rather than by the maximum length. Measured: 621 concurrent requests at 98% utilization, a 6.4-fold increase, with no change to the model, the kernels' arithmetic, or the hardware. WHY THE PRECEDENT MATTERS. This is exactly the argument operating systems made for paging over fixed partitions, and the trade is the same: you accept an indirection per access to eliminate fragmentation. That framing tells you what to expect - a page table, a page size to tune, and a cost paid in lookups - and it is why the technique will outlive whichever library popularized it. THE COST is that indirection. The attention kernel can no longer read a contiguous span; it must gather from scattered blocks, which is why paged attention requires kernel support rather than being purely an allocator change. THE BONUS the indirection enables, which is easy to miss and quite valuable: blocks can be SHARED. Two requests with the same system prompt or few-shot prefix point at the same physical blocks, with copy-on-write when they diverge. So prefix sharing and beam search become memory-cheap, and contiguous allocation cannot express that at all. THE SCHEDULING CHANGE THAT COMPOUNDS WITH IT: continuous batching. In static batching the batch runs until the longest sequence finishes, so completed sequences hold slots idle - measured at 54% utilization. Evicting them each step and admitting waiting requests gave 1.74 times throughput at 93%. It works because a decode step is independent per sequence, so there is no reason for batch membership to be fixed. AND THE HONEST SCOPE: these numbers come from a simulation of allocation and scheduling behaviour. They capture the mechanism - occupancy, fragmentation, admission - and they are not a benchmark of kernel performance, bandwidth or latency.",
          "deepDive": {
            "q": "You are designing an inference server from scratch. What are the decisions?",
            "a": "I WOULD MAKE FIVE DECISIONS, AND THE FIRST TWO ACCOUNT FOR MOST OF THE THROUGHPUT. DECISION 1 - MEMORY ALLOCATION: paged, in fixed blocks, with a block table per sequence. This is the 6.4x, and it is the single largest structural win available because it addresses the fact that the KV cache rivals or exceeds the weights at realistic context lengths. Block size is a U-curve - small blocks add table overhead and indirection, large blocks bring back fragmentation - with a measured minimum at 16, though the optimum depends on your length distribution and gather cost, so I would sweep it on real traffic rather than copy it. DECISION 2 - BATCHING POLICY: continuous, evicting finished sequences and admitting waiting ones each step. That is the 1.74x, and it is available because decode steps are independent per sequence. The complication is PREFILL versus DECODE: prefill is compute-bound and processes a whole prompt at once, decode is memory-bandwidth-bound and produces one token. Mixing them naively means a long prefill stalls every decoding sequence, which shows up as latency spikes for users mid-generation. Chunked prefill - splitting a long prompt into pieces interleaved with decode steps - is the standard answer and it is a real design decision rather than an implementation detail. DECISION 3 - ADMISSION AND PREEMPTION. What happens when memory is exhausted mid-generation? Options are to preempt a sequence and recompute its cache later, to swap its blocks to host memory, or to refuse admission earlier so it does not happen. Each has a different tail-latency profile, and this is where a server's behaviour under load is actually determined. I would want admission control tied to available blocks rather than to a request count, since blocks are the real resource. DECISION 4 - PREFIX SHARING, which the block indirection makes possible. If most requests share a long system prompt, sharing those blocks is both a memory saving and a compute saving, since the shared prefix's prefill can be cached too. For chat products with a large fixed preamble this is substantial and it costs nothing but bookkeeping. DECISION 5 - QUANTIZATION of weights and of the cache, which changes the constants in every calculation above and interacts with everything - more concurrent sequences fit, which raises the batch, which improves the arithmetic intensity of decode. WHAT I WOULD MEASURE, and it is not tokens per second on one request. Concurrency at target latency, KV utilization, the prefill-decode time split, p95 time-to-first-token and p95 inter-token latency separately - because those two are different user experiences with different causes - and preemption rate. AND THE SEQUENCING I would recommend: get allocation and batching right first, since they are structural and independent of the model, then quantize, then look at kernels. Kernel optimization is the most visible work and the least likely to be the binding constraint, which is the same ordering lesson this curriculum keeps arriving at from other directions."
          }
        },
        {
          "q": "Why did the field converge on continuous batching?",
          "a": "BECAUSE STATIC BATCHING WASTES THE MOST EXPENSIVE RESOURCE ON THE SLOWEST MEMBER, and the fix is available for free once you notice that decode steps are independent. THE PROBLEM WITH STATIC BATCHING. You form a batch of requests, run them together, and the batch completes when the LONGEST sequence finishes. A request that needed 20 tokens sits in the batch doing nothing until one that needs 2000 completes - occupying a slot, occupying its KV memory, and contributing no useful work. With a long-tailed output distribution, which is the normal case, most of the batch is idle most of the time. Measured utilization was 54%. THE FIX. A decode step computes one token for each sequence, and those computations are independent - nothing about sequence A's step depends on sequence B. So batch membership does not need to be fixed for the duration. At each step, remove sequences that emitted their end token, and admit waiting requests into the freed slots. Measured: 1.74 times the throughput at 93% utilization. WHY IT COMPOUNDS WITH PAGED ALLOCATION. Continuous batching only helps if you can actually give the freed memory to a new request, and with contiguous max-length reservation the freed block is a fixed-size hole that only fits another maximum-length reservation. Paging makes the memory genuinely fungible, so the two techniques multiply rather than add. That is why they arrived together. WHAT IT COMPLICATES. Requests now enter a batch that is mid-flight, which means the system must handle sequences at different stages simultaneously - and prefill for a newly admitted request is a compute-heavy operation that competes with the decode steps of everyone else. Done naively, admitting a request with a long prompt stalls every sequence currently generating, which users experience as a stutter mid-response. Chunked prefill exists for exactly this. There is also a fairness question: continuous admission can starve long requests if the policy always prefers short ones. AND THE GENERAL SHAPE worth extracting: static batching was a design inherited from training, where a batch is a natural unit because the whole batch participates in one gradient step. Generation has no such coupling - the batch is purely a device-utilization device - so importing the training-shaped abstraction cost most of the throughput. That is a recurring pattern in this curriculum: an abstraction that is correct in one regime is silently expensive in another, and the two regimes here are exactly training and inference from 17-01. Recognizing which regime you are in tells you which abstractions to distrust."
        },
        {
          "q": "What does it mean that this was taught by simulation?",
          "a": "IT MEANS THE NUMBERS DESCRIBE THE MECHANISM RATHER THAN AN IMPLEMENTATION, and being explicit about which is which is what makes them usable. WHAT THE SIMULATION MODELS: allocation and scheduling. Requests arrive with sampled prompt and output lengths, memory is handed out under one policy or another, sequences occupy and release blocks, and the scheduler admits and evicts. From that you get occupancy, fragmentation, concurrency and utilization - which is exactly where the 6.4x and the 1.74x come from, because both are consequences of how memory is handed out and when slots are freed. WHAT IT DOES NOT MODEL: kernel performance, memory bandwidth, the actual cost of gathering from non-contiguous blocks, or real latency. So it cannot tell you what tokens per second a given implementation achieves, and it would be wrong to quote it as a benchmark. WHY THAT IS STILL THE RIGHT WAY TO TEACH IT. The mechanism is the durable part. vLLM's specific implementation will change, its API will change, and competing engines will make different trade-offs - but 'contiguous reservation wastes the gap between expected and maximum length, and paging bounds waste by block size' is a fact about the allocation problem that holds for all of them. A reader who understands that can evaluate any inference engine's memory story, including engines that do not exist yet. And there is a second benefit specific to simulations: they are HONEST BY CONSTRUCTION in a way benchmarks are not. There is no warm cache to accidentally measure, no hardware variation, no vendor-tuned configuration. The result follows from the stated model, which is inspectable, so the reader can check whether the model matches their situation rather than trusting a number from someone else's machine. THE LIMIT I WOULD STATE ALONGSIDE IT. A simulation can only be as good as its assumptions - here, the length distribution, the arrival process and the memory budget. Change those and the numbers change, which is a feature if you are reasoning about your own workload and a trap if you quote the figures as universal. So the right use is to re-run it with YOUR length distribution, which is a few lines, rather than to cite 6.4x. AND THE PATTERN ACROSS THIS MODULE: Triton is taught by writing the tile model in numpy, ONNX by building a graph IR and interpreter, Flax and Optax by building the pytree and the transformation pair. In every case the library is absent and the mechanism is the content, and in every case the mechanism is what explains behaviour you will see in production. That constraint was imposed by the environment and it turned out to be the right pedagogy, which the capstone then measures rather than asserts."
        },
        {
          "q": "How do prefill and decode differ, and why does it complicate serving?",
          "a": "THEY ARE DIFFERENT COMPUTATIONS WITH OPPOSITE BOTTLENECKS SHARING ONE DEVICE, which is the central scheduling difficulty in LLM serving. PREFILL processes the entire prompt at once. Every token attends to every previous token, so it is a large matrix operation with high arithmetic intensity - the weights are read once and used for many tokens' worth of computation. It is COMPUTE-bound, it takes time proportional to prompt length, and it produces exactly one token of output. DECODE produces one token per step. It reads every weight and the entire KV cache to compute a single token's worth of arithmetic, so its arithmetic intensity is around one against hardware ratios in the hundreds. It is MEMORY-BANDWIDTH-bound, and the accelerator is largely idle waiting for bytes. THE CONSEQUENCE FOR BATCHING. Decode benefits enormously from batching, because the weight read is amortized across every sequence in the batch - this is the whole reason concurrency matters and why the paged-allocation win translates into throughput. Prefill benefits much less, because it is already compute-saturated. So the two halves of the same request want different batching policies. THE SCHEDULING PROBLEM. If a long prefill runs as one unit, every sequence currently decoding stalls for its duration. Users experience that as a stutter mid-response - the tokens stop arriving for a moment because someone else submitted a long prompt. This is a real and common complaint and it is a scheduling artefact rather than a capacity problem. THE STANDARD FIX is chunked prefill: split the prompt into pieces and interleave those pieces with decode steps, so the prefill's cost is spread across many steps and no single step is long. It costs a little total throughput and it dramatically improves inter-token latency consistency, which is the metric users actually feel. THE METRICS THIS FORCES YOU TO SEPARATE. Time-to-first-token is dominated by prefill and by queueing; inter-token latency is dominated by decode and by scheduling interference. They have different causes and different fixes, so a single 'latency' number describes neither - and a system can be excellent on one and unacceptable on the other. I would report and alert on both at p95. AND THE CONNECTION TO THE MODULE'S FRAMING: prefill and decode are the compute-bound and bandwidth-bound regimes from 17-01 appearing inside a single request. Every technique here follows from which side you are on - batching and paging help decode by increasing concurrency, chunking helps prefill by making it interruptible, and quantization helps decode by reducing bytes read. Knowing the regime tells you which lever applies, which is more useful than a list of techniques."
        },
        {
          "q": "When would paged attention NOT be worth it?",
          "a": "WHEN THE WASTE IT ELIMINATES IS SMALL, and that condition is more common than the headline number suggests. THE GAIN COMES FROM THE GAP between expected and maximum sequence length. Utilization under contiguous allocation is roughly the ratio of the two, so paging's benefit is largest when output lengths are long-tailed and the maximum is much larger than the typical. Reverse that and the benefit shrinks. WHERE IT IS SMALL. Fixed or narrow output lengths - a classifier, an extraction task, an embedding service, anything with a tight token budget - where reserving the maximum is reserving roughly what you use. Single-request or very low-concurrency serving, where memory is not the binding constraint and the indirection is pure cost. Very short contexts, where the whole cache is small relative to the weights. And offline batch processing, where you control the batching entirely and can sort by length to get most of the packing benefit for free. WHERE IT COSTS SOMETHING. The indirection is real: the attention kernel gathers from scattered blocks instead of reading a contiguous span, which is less friendly to memory access patterns. A well-tuned contiguous kernel can be faster per token than a paged one - the paged system wins on CONCURRENCY, not on single-stream speed. So for a latency-critical single-stream workload, contiguous may genuinely be better, and quoting the 6.4x there would be quoting a throughput result at a latency problem. There is also implementation complexity: a block allocator, a block table, preemption and eviction policies, and a custom kernel. If you are using an existing engine that is free; if you are building it, it is not. HOW I WOULD DECIDE. Compute the utilization you would get under contiguous allocation from your own length distribution - expected over maximum. If that is 15%, paging is transformative. If it is 80%, it is a modest gain for real complexity. That calculation takes minutes and it is the honest version of the decision. AND THE BROADER POINT, which is why the question is worth asking: a technique with a spectacular published number was measured on a workload where it shines. The number is real and it is conditional, and the condition here is a long-tailed length distribution with high concurrency. That is the module 21 discipline applied to a systems technique - find the regime, check whether you are in it, and do not import a result across a boundary it was never measured across."
        },
        {
          "q": "How does this lesson serve the module's thesis?",
          "a": "IT IS THE CLEAREST CASE OF AN INVARIANT WEARING A NEW NAME. Paged attention is presented as a machine-learning systems innovation, and it is virtual memory - fixed-size blocks and a page table replacing contiguous reservation, with the same trade of an indirection against fragmentation, and even the same U-curve setting the page size. A reader who knows the operating-systems precedent understands the technique in a sentence and can predict its properties: it will need a table, it will have a tunable block size, it will cost a lookup, and it will enable sharing. That prediction comes from the invariant, not from the library. WHY THAT MATTERS FOR THIS MODULE SPECIFICALLY. vLLM is a library with a version number and a roadmap, and other engines make different choices. What does not change is that generation produces variable-length objects whose final size is unknown at allocation time, and that reserving the maximum wastes the gap. Any engine, now or later, is answering that question - so understanding the question lets you evaluate any answer. THE SECOND CONTRIBUTION is a habit rather than a fact: the biggest wins in this lesson came from ALLOCATION and SCHEDULING, not from the model, the kernels or the hardware. 6.4x from how memory is handed out and 1.74x from when slots are freed. That is worth internalizing because kernel work is the most visible and prestigious optimization available and it was not the binding constraint - the same ordering lesson that appears in RAG, where chunking beats the embedding model, and in agents, where endpointing beats the model. Look at the boring stage first. THE THIRD is the honest scoping of a simulation. The numbers model allocation behaviour, not kernel performance, and saying so is what makes them useful - a reader can check whether the model's assumptions match their workload and re-run it with their own length distribution, which is a better relationship to a number than trusting a benchmark from someone else's hardware. AND THE CONDITION, since this module inherits module 21's discipline: paging's gain is the gap between expected and maximum length. It is transformative at 15% utilization and marginal at 80%, so the technique is conditional like everything else here - and the calculation that tells you which case you are in takes minutes."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Paged attention IS virtual memory",
        "back": "Fixed-size blocks + a table mapping logical→physical, replacing contiguous reservation with internal fragmentation. Same trade (an indirection to kill fragmentation), same U-curve setting the page size. The precedent is 1960s OS design."
      },
      {
        "type": "formula",
        "front": "Why contiguous allocation wastes so much",
        "back": "util ≈ E[len]/len_max, because you can't know the final length and relocating a cache is expensive — so every request pays for its worst case. **Measured: 97 requests at 15% utilization** — 85% of the KV region held nothing."
      },
      {
        "type": "formula",
        "front": "★ What paging buys",
        "back": "Waste ≤ (block−1) per sequence, and **no longer depends on max length at all**. Measured: **621 requests at 98% utilization = 6.4×** — from an allocation strategy, with no change to model, kernels or hardware."
      },
      {
        "type": "intuition",
        "front": "The indirection's bonus: SHARING",
        "back": "Blocks can be shared — two requests with the same prompt prefix point at the same physical blocks, copy-on-write when they diverge. Prefix sharing and beam search become memory-cheap. Contiguous allocation cannot express this at all."
      },
      {
        "type": "formula",
        "front": "Continuous batching",
        "back": "Static: the batch runs until the LONGEST sequence finishes, so completed ones hold slots idle → 54% util. Continuous: evict finished, admit waiting, every step → **1.74× throughput at 93%**. Possible because decode steps are independent per sequence."
      },
      {
        "type": "intuition",
        "front": "Why the two techniques MULTIPLY",
        "back": "Continuous batching only helps if freed memory is usable — and under max-length reservation the freed slot is a fixed hole that fits only another max-length reservation. Paging makes memory fungible. That's why they arrived together."
      },
      {
        "type": "formula",
        "front": "Block size is a classic U-curve",
        "back": "cost = α/block (table + indirection) + β·block (internal fragmentation) → minimum at 16. Same two competing terms that set an OS page size — and the optimum depends on YOUR length distribution, so 16 is a default, not a constant."
      },
      {
        "type": "intuition",
        "front": "Prefill vs decode: opposite bottlenecks, one device",
        "back": "PREFILL: whole prompt at once, high arithmetic intensity, COMPUTE-bound. DECODE: one token, reads every weight + the cache, BANDWIDTH-bound. So decode loves batching and prefill doesn't — and a long prefill STALLS everyone decoding."
      },
      {
        "type": "intuition",
        "front": "Chunked prefill, and two separate latency metrics",
        "back": "Split a long prompt into pieces interleaved with decode steps, so no step is long. And report TTFT (prefill + queueing) and INTER-TOKEN latency (decode + interference) SEPARATELY — different causes, different fixes, one number describes neither."
      },
      {
        "type": "pitfall",
        "front": "When paging is NOT worth it",
        "back": "Narrow output lengths (classification, extraction), low concurrency, short contexts, offline batch you can sort by length. Compute E[len]/len_max for YOUR traffic: 15% → transformative, 80% → modest gain for real complexity."
      },
      {
        "type": "pitfall",
        "front": "It wins on CONCURRENCY, not single-stream speed",
        "back": "The gather from scattered blocks is less friendly than a contiguous read, so a well-tuned contiguous kernel can be faster per token. Quoting 6.4× at a single-stream latency problem is quoting a throughput result at the wrong question."
      },
      {
        "type": "intuition",
        "front": "★ The wins were ALLOCATION and SCHEDULING",
        "back": "6.4× from how memory is handed out, 1.74× from when slots are freed — not from the model, kernels or hardware. Kernel work is the most visible optimization and was not the binding constraint. Look at the boring stage first."
      }
    ],
    "refs": [
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for Large Language Model Serving with PagedAttention",
        "url": "https://arxiv.org/abs/2309.06180"
      },
      {
        "title": "Yu et al. (2022), Orca: A Distributed Serving System for Transformer-Based Generative Models (continuous batching)",
        "url": "https://www.usenix.org/conference/osdi22/presentation/yu"
      },
      {
        "title": "Agrawal et al. (2023), SARATHI: Efficient LLM Inference by Piggybacking Decodes with Chunked Prefills",
        "url": "https://arxiv.org/abs/2308.16369"
      },
      {
        "title": "Pope et al. (2022), Efficiently Scaling Transformer Inference",
        "url": "https://arxiv.org/abs/2211.05102"
      },
      {
        "title": "Denning (1970), Virtual Memory (the operating-systems precedent)",
        "url": "https://dl.acm.org/doi/10.1145/356571.356573"
      }
    ],
    "demos": [
      "paged-attention",
      "kv-cache",
      "kv-cache-eviction",
      "speculative-decoding"
    ]
  },
  "torch-compile-triton": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Every compiler for tensor programs does the same three things, and the flags differ far more than the mechanisms. It CAPTURES a graph, so it can see more than one operation at a time. It FUSES memory-bound operations, so a chain of elementwise ops becomes one pass over memory instead of many. And it REDUCES LAUNCH OVERHEAD, so thousands of tiny operations stop paying a fixed cost each. Inductor, XLA, TVM and TensorRT are four answers to those three problems, which is why learning the problems transfers and learning the flags does not.",
        "The fusion mechanism is worth deriving rather than accepting, because it explains almost all of the speedup. An elementwise operation does about one arithmetic operation per element loaded, so its arithmetic intensity is roughly one - against hardware ratios in the hundreds, that means it is entirely memory-bound and the accelerator is idle waiting for bytes. Measured, a chain of such operations takes time linear in the chain length, about 0.83 milliseconds per operation, because EACH ONE is a separate round trip to memory. Fusing thirty-two of them into a single pass cuts the traffic by thirty-two.",
        "The second mechanism has a different shape and bites at small sizes. Every kernel launch carries a fixed cost of roughly 1.4 microseconds, which is invisible when the kernel does real work and dominant when it does not. Ten thousand small operations measured 53.5 times slower than one large one doing the same total arithmetic - the time was almost entirely launches. That is why fusion and graph capture matter disproportionately for small tensors, and why CUDA graphs exist at all."
      ],
      "math": [
        {
          "h": "Elementwise operations are always memory-bound",
          "paras": [
            "Arithmetic intensity is the ratio of computation to bytes moved, and for an elementwise op it is about one.",
            "Hardware ratios are in the hundreds, so the accelerator idles."
          ],
          "tex": "I = \\frac{\\text{FLOPs}}{\\text{bytes}} \\approx 1 \\quad\\text{vs}\\quad \\frac{\\text{peak FLOP/s}}{\\text{bandwidth}} \\sim 10^2, \\qquad \\Rightarrow\\; \\text{bandwidth-bound, always}",
          "texNote": "This is the roofline argument, and it settles the question before any benchmark: no amount of faster arithmetic helps an operation that is waiting for memory. The only lever is moving fewer bytes - which is what fusion does, and it is why the biggest compiler win is on the operations that look cheapest. It is also the same argument that makes LLM decode bandwidth-bound in 17-01, arriving at a much smaller scale."
        },
        {
          "h": "Fusion turns N memory passes into one",
          "paras": [
            "Each unfused operation reads its input and writes its output, so a chain of N does N round trips.",
            "Measured time is linear in chain length, which is the evidence."
          ],
          "tex": "t_{\\text{unfused}} \\approx N \\cdot \\frac{2 \\cdot \\text{bytes}}{\\text{BW}} \\;\\;(\\text{slope } 0.83\\ \\text{ms/op}), \\qquad t_{\\text{fused}} \\approx \\frac{2 \\cdot \\text{bytes}}{\\text{BW}} \\;\\;\\Rightarrow\\; 32\\times \\text{less traffic}",
          "texNote": "The linear relationship is the diagnostic: if adding an elementwise operation adds a constant time regardless of what the operation computes, you are measuring memory traffic rather than arithmetic. Fusing keeps the intermediate values in registers or shared memory so they are never written out - which is why a fused chain costs about what one operation costs, and why compiler speedups on such code are large and easy."
        },
        {
          "h": "Launch overhead dominates at small sizes",
          "paras": [
            "Each kernel launch has a fixed cost independent of the work it does.",
            "When the work is small, the fixed cost is the whole story."
          ],
          "tex": "t = N(t_{\\text{launch}} + t_{\\text{work}}), \\quad t_{\\text{launch}} \\approx 1.4\\,\\mu s \\;\\;\\Rightarrow\\;\\; 10^4 \\text{ small ops} = 53.5\\times \\text{one big op}",
          "texNote": "So a model built from many small operations can be overhead-bound rather than compute-bound or memory-bound - a third regime. The fixes are fusion, which reduces the count, and graph capture with replay, which amortizes the launch cost across a whole graph. This is why small-batch inference and tiny models often see the largest relative gains from compilation, which is the opposite of the intuition that compilers help most on big work."
        }
      ],
      "code": [
        {
          "h": "The three things every tensor compiler does",
          "paras": [
            "The mechanisms are the durable content; the flags are not."
          ],
          "code": "# 1. CAPTURE a graph - so the compiler can see more than one op.\ngraph = symbolic_trace(model).graph      # torch.fx -> 5 op nodes here\n#    Everything downstream operates on this IR. Dynamo, XLA's tracer\n#    and ONNX export are all doing this step with different tradeoffs\n#    between coverage and strictness (22-06).\n\n# 2. ★ FUSE memory-bound ops - the biggest win, and derivable:\n#    an elementwise op does ~1 FLOP per element loaded -> arithmetic\n#    intensity ~1, against hardware ratios ~100. ALWAYS bandwidth-bound.\n#      unfused chain: time LINEAR in N, slope ~0.83 ms/op\n#                     (each op = a separate ROUND TRIP to memory)\n#      fused:         one pass -> 32 ops = 32x less traffic\n#    ★ THE DIAGNOSTIC: if adding an op adds constant time REGARDLESS of\n#      what it computes, you are measuring MEMORY, not arithmetic.\n\n# 3. REDUCE LAUNCH OVERHEAD - a third regime, at small sizes:\n#      t = N * (t_launch + t_work),  t_launch ~ 1.4 us\n#      10,000 small ops = 53.5x one big op doing the same arithmetic\n#    Fixes: fusion (fewer launches) and graph capture + replay (amortize\n#    them). This is why SMALL-batch inference often sees the LARGEST\n#    relative gain from compilation - the opposite of the intuition\n#    that compilers help most on big work.\n\n# THE REAL API, for reference (it did not execute in this environment -\n# inductor needs a host C compiler, and Triton was not installed):\n#   model = torch.compile(model, mode=\"max-autotune\")\n#   @triton.jit\n#   def kernel(X, Y, N, BLOCK: tl.constexpr): ...",
          "caption": "Capture, fuse, amortize launches — the three mechanisms behind inductor, XLA, TVM and TensorRT alike, which is why the mechanisms transfer and the flags do not."
        },
        {
          "h": "The Triton tile model, verified rather than trusted",
          "paras": [
            "The abstraction is per-block code with within-block parallelism handled for you."
          ],
          "code": "# THE TILE ABSTRACTION: you write code for ONE BLOCK of data; the\n# compiler handles parallelism WITHIN the block and schedules blocks\n# across the device. That is one level up from CUDA (per-thread) and\n# one level down from a framework op (whole tensor).\n\n# ★ VERIFY THE TILING IS RIGHT BY CHECKING IT AGAINST THE NAIVE FORM.\n#   Written block-wise in numpy, the result matched the naive\n#   computation EXACTLY - which is what tells you the indexing,\n#   masking and accumulation are correct before any GPU is involved:\nfor start in range(0, N, BLOCK):\n    idx  = start + arange(BLOCK)\n    mask = idx < N                    # ★ the tail block is where\n    x    = load(X + idx, mask=mask)   #   tiling bugs live\n    store(Y + idx, f(x), mask=mask)\nassert allclose(Y_blockwise, Y_naive)  # exact\n\n# ⚠ WHY THIS LESSON MEASURED MECHANISMS RATHER THAN torch.compile:\n#   inductor needs a host C compiler (absent here) and Triton was not\n#   installed, so torch.compile DOES NOT EXECUTE in this environment.\n#   Rather than report numbers from a path that did not run, the\n#   mechanisms were measured with tools that do run - fx for capture,\n#   timing for fusion and launch overhead, numpy for the tile model.\n#   ★ That is the honest move: measure what you can actually run, and\n#     say which parts are shown as API rather than executed.",
          "caption": "Checking the block-wise form against the naive one catches indexing and masking bugs — especially in the tail block — before any GPU is involved."
        }
      ],
      "useCases": [
        "Speeding up a model whose profile shows many small elementwise operations, which is exactly the case fusion addresses and where the gains are largest.",
        "Diagnosing whether a workload is compute-bound, bandwidth-bound or overhead-bound, which determines which of the three mechanisms will help.",
        "Writing a custom kernel for an operation the framework does not fuse well, where the tile model is the right level of abstraction.",
        "Reading any tensor compiler's documentation, since capture, fusion and launch amortization are what all of them are doing under different names."
      ],
      "pitfalls": [
        "Assuming a compiler helps most on large work. Launch overhead dominates at small sizes, so small-batch inference and tiny models often see the largest relative gains.",
        "Treating elementwise operations as cheap. They are bandwidth-bound with arithmetic intensity around one, so a chain of them is a chain of round trips to memory.",
        "Optimizing arithmetic in a memory-bound region. No amount of faster math helps an operation waiting for bytes - the only lever is moving fewer of them.",
        "Skipping the linearity diagnostic. If adding an operation adds constant time regardless of what it computes, you are measuring memory traffic and fusion is the fix.",
        "Trusting a tiled kernel without checking it against the naive form. Indexing and masking bugs concentrate in the tail block, and the exact-match check catches them cheaply.",
        "Benchmarking a compiled function with a warm cache. Compilation cost is real and shape-dependent, and a warm-cache measurement reports the steady state as though it were free.",
        "Quoting compilation speedups without the recompile behaviour. Dynamic shapes trigger recompiles, and a path that recompiles frequently can be slower than eager."
      ],
      "connections": [
        {
          "ref": "training-systems/torch-compile",
          "text": "The production behaviour of this machinery, including the recompile cliff that silently drops a job back to eager execution for the rest of the run."
        },
        {
          "ref": "pytorch-internals/torch-fx",
          "text": "Graph capture as an inspectable object, with the surgery passes that show what a compiler is doing when it fuses or rewrites."
        },
        {
          "ref": "frontier-frameworks/jax-fundamentals",
          "text": "The same tracing and shape-specialization mechanism, where the cold-versus-warm measurement problem is identical."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Where the bandwidth-bound argument reappears at model scale - decode reads every weight to do one token's arithmetic, which is the same roofline reasoning."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How to tell which regime you are in before optimizing, including MFU as the absolute metric and a budget that must account for all of step time."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What do all tensor compilers do?",
          "a": "Capture a graph, fuse memory-bound operations, and reduce launch overhead. Inductor, XLA, TVM and TensorRT are four answers to those three problems."
        },
        {
          "q": "Why are elementwise operations always bandwidth-bound?",
          "a": "Their arithmetic intensity is about one FLOP per element loaded, against hardware compute-to-bandwidth ratios in the hundreds."
        },
        {
          "q": "What does an unfused chain cost?",
          "a": "Time linear in chain length - about 0.83 ms per operation measured - because each one is a separate round trip to memory."
        },
        {
          "q": "What does fusion do about that?",
          "a": "Keeps intermediates in registers or shared memory so they are never written out, turning N passes into one - 32 ops became 32 times less traffic."
        },
        {
          "q": "What is the linearity diagnostic?",
          "a": "If adding an operation adds constant time regardless of what it computes, you are measuring memory traffic rather than arithmetic."
        },
        {
          "q": "What is the launch overhead?",
          "a": "About 1.4 microseconds fixed per kernel, so ten thousand small operations measured 53.5 times slower than one large one doing the same arithmetic."
        },
        {
          "q": "Which workloads gain most from compilation?",
          "a": "Small ones, often - launch overhead dominates at small sizes, which is the opposite of the intuition that compilers help most on big work."
        },
        {
          "q": "What is the third regime?",
          "a": "Overhead-bound, alongside compute-bound and bandwidth-bound. It is fixed per-launch cost dominating, and graph capture with replay amortizes it."
        },
        {
          "q": "What is the Triton tile abstraction?",
          "a": "You write code for one block of data; the compiler handles parallelism within the block and schedules blocks across the device."
        },
        {
          "q": "How do you check a tiled kernel is correct?",
          "a": "Write the block-wise form in numpy and check it matches the naive computation exactly - which catches indexing and masking bugs before any GPU."
        },
        {
          "q": "Where do tiling bugs concentrate?",
          "a": "The tail block, where the mask matters because the last block is partially out of range."
        },
        {
          "q": "Why did this lesson measure mechanisms rather than torch.compile?",
          "a": "Inductor needed a host C compiler that was absent and Triton was not installed, so the mechanisms were measured with tools that actually ran."
        }
      ],
      "standard": [
        {
          "q": "What does torch.compile actually do, and where do the gains come from?",
          "a": "IT DOES THREE THINGS, AND ALMOST ALL THE GAIN COMES FROM THE SECOND AND THIRD. STEP ONE - GRAPH CAPTURE. Rather than executing operations one at a time as Python calls them, it traces the program into a graph. That is the enabling step: a compiler that can only see one operation cannot fuse anything. Dynamo does this by bytecode analysis with graph breaks where it cannot follow, which is why coverage is a real concern and why some code compiles into several graphs instead of one. STEP TWO - FUSION, which is the biggest win and is derivable rather than mysterious. An elementwise operation does roughly one arithmetic operation per element loaded, so its arithmetic intensity is about one, against hardware compute-to-bandwidth ratios in the hundreds. It is entirely memory-bound. Measured, a chain of such operations takes time LINEAR in the chain length - about 0.83 milliseconds per operation - because each one reads its input from memory and writes its output back. Fusing them keeps the intermediates in registers so they are never written out, and a chain of thirty-two becomes one pass with thirty-two times less traffic. THE DIAGNOSTIC that tells you this is what you are looking at: if adding an operation adds constant time regardless of WHAT it computes, you are measuring memory traffic, not arithmetic. STEP THREE - LAUNCH OVERHEAD. Every kernel launch costs roughly 1.4 microseconds regardless of the work it does. Ten thousand small operations measured 53.5 times slower than one large operation doing the same total arithmetic - almost all of that time was launches. This is a third regime alongside compute-bound and bandwidth-bound, and the fixes are fusion, which reduces the count, and graph capture with replay, which amortizes them. WHAT THIS IMPLIES ABOUT WHERE COMPILATION HELPS, and it inverts the usual intuition: small workloads often gain most in relative terms, because they are overhead-bound. A large matrix multiplication is already compute-bound and near peak - a compiler has little to add. A model of many small elementwise operations is dominated by traffic and launches, which is exactly what compilation removes. THE COSTS, which I would state alongside. Compilation takes real time on the first call, and it is shape-dependent - a new shape recompiles, and a path with many distinct shapes can spend more time compiling than it saves. Graph breaks reduce the fusion opportunity. And in production the failure mode to watch is the recompile cliff, where exceeding the cache limit silently drops back to eager for the rest of the run. AND THE HONEST NOTE ABOUT THIS LESSON: torch.compile did not execute in the environment it was written in - inductor needs a host C compiler and Triton was not installed. Rather than report numbers from a path that did not run, the mechanisms were measured with tools that do: fx for capture, timing for fusion and launch overhead, numpy for the tile model.",
          "deepDive": {
            "q": "A model is slow. How do you determine which of the three regimes you are in?",
            "a": "BY MEASURING THE SHAPE OF THE COST RATHER THAN ITS SIZE, because each regime has a signature and they call for different fixes. REGIME 1 - COMPUTE-BOUND. The accelerator is doing arithmetic near peak. The signature is high measured FLOP utilization, and time that scales with the arithmetic - doubling the work doubles the time. If you are here, a compiler has little to offer and the levers are algorithmic: fewer FLOPs, lower precision, better parallelism. Large matrix multiplications and convolutions on big inputs live here. REGIME 2 - BANDWIDTH-BOUND. The device is waiting for bytes. The signature is the LINEARITY DIAGNOSTIC: adding an elementwise operation adds a constant time regardless of what that operation computes - measured at about 0.83 ms per operation in the chain - because you are counting memory round trips rather than arithmetic. Another signature is that changing the arithmetic precision changes speed roughly proportionally to the bytes moved, not to the FLOPs. The fix is fusion, and it is often dramatic. REGIME 3 - OVERHEAD-BOUND. The fixed per-launch cost dominates. The signature is that time scales with the NUMBER of operations rather than with their size - ten thousand small operations were 53.5 times one large one at the same total arithmetic - and that making the tensors bigger barely changes the total time. The fix is fusion to reduce the count and graph capture with replay to amortize the launches. HOW I WOULD ACTUALLY MEASURE. A profiler timeline is the fastest route: gaps between kernels point at overhead or at host-side stalls, long kernels with low occupancy point at bandwidth, and dense kernels at high utilization point at compute. If a profiler is unavailable, the two scaling experiments above - vary the operation COUNT at fixed size, and vary the SIZE at fixed count - separate the three regimes with nothing but a timer. THE ORDER I WOULD WORK IN. Establish the regime before optimizing, because the wrong lever in the wrong regime does nothing and is easy to mistake for the technique not working. Then apply the matching fix. Then RE-MEASURE, because optimizing a system re-orders its bottlenecks - removing memory traffic can move you into the overhead regime, and removing launches can expose a compute limit. That re-measure step is what people skip, and it is why optimization efforts often stall after one successful change. AND THE CONNECTION UPWARD: this is the same reasoning that makes LLM decode bandwidth-bound at model scale - reading every weight to do one token's arithmetic is an arithmetic intensity of about one, exactly like an elementwise op. The roofline argument is scale-free, which is why learning it once pays at both the kernel level and the serving level."
          }
        },
        {
          "q": "What is Triton for, and when would you write a kernel?",
          "a": "IT IS AN ABSTRACTION LEVEL BETWEEN CUDA AND A FRAMEWORK OPERATION, and the level is the point. In CUDA you write per-THREAD code and manage indexing, shared memory and synchronization yourself. In a framework you call an operation over a whole tensor and get whatever the library implemented. Triton sits between: you write code for one BLOCK of data, and the compiler handles parallelism within the block and schedules blocks across the device. That removes most of the tedium and most of the opportunity to get synchronization wrong, while keeping the control that matters. WHEN WRITING A KERNEL IS JUSTIFIED. When the operation you need is a FUSION the compiler will not do - a sequence of elementwise and reduction steps that logically belong together but that the framework materializes separately. When the memory access pattern is unusual and the generic implementation is inefficient - custom sparsity, blocked layouts, paged gathers. When you need an operation that does not exist, which is how flash attention and paged attention both arrived: not faster arithmetic but a different memory schedule. And when profiling shows a specific kernel is the bottleneck AND you can articulate why the existing one is suboptimal - that last clause matters, because 'this seems slow' is not a plan. WHEN IT IS NOT JUSTIFIED, which is most of the time. If the operation is a standard matmul or convolution, the vendor library is very hard to beat and you will not. If you have not profiled, you do not know the kernel is the problem, and this lesson's own ordering says allocation and scheduling are more often the constraint. And if torch.compile already fuses the region, you would be reimplementing what you get for free. THE PRACTICE THAT MAKES IT SAFE, and it is the lesson's method: verify the TILED form against the NAIVE form before optimizing anything. Write the block-wise computation in numpy, check it matches the naive result exactly, and only then port it. The exact match is what tells you the indexing, masking and accumulation are right - and the bugs concentrate in the TAIL BLOCK, where the last block is partially out of range and the mask has to be correct. Getting a wrong answer fast is the failure mode here, and it is silent. THE DURABLE PART, which is why this belongs in this module: the tile model is not a Triton idea. Blocked computation with a per-block program and a scheduler is how GPU kernels are structured generally, and it is how you should think about the problem regardless of the language. Triton makes it convenient; the model is what transfers, and it is what lets you read a CUDA kernel or a Mojo kernel or whatever comes next and recognize what it is doing."
        },
        {
          "q": "Why does fusion matter so much, and what limits it?",
          "a": "IT MATTERS BECAUSE THE OPERATIONS IT TARGETS ARE THE ONES THAT LOOK CHEAPEST, and it is limited by what the compiler can see and prove. WHY IT MATTERS. An elementwise operation - an activation, an add, a scale, a mask - does about one arithmetic operation per element it loads. Arithmetic intensity of one, against hardware ratios in the hundreds, means it is entirely bandwidth-bound: the device is waiting for memory and the arithmetic is free. So a chain of these is a chain of round trips, measured as linear time in chain length at about 0.83 ms per operation. They are individually trivial and collectively expensive, which is exactly the pattern that a per-operation mental model misses. Fusing thirty-two of them into one pass cuts memory traffic by thirty-two, and that is where most of a compiler's gain on real models comes from. WHAT LIMITS IT. GRAPH BREAKS: if the compiler cannot trace through a piece of Python - data-dependent control flow, an unsupported call, a print - it splits the graph, and operations on either side of the break cannot fuse with each other. Reducing graph breaks is often the highest-value change to compiled code, and it is invisible unless you look for it. MATERIALIZATION POINTS: an intermediate that something else needs, or that is returned, must be written out. REDUCTIONS across the fusion boundary, which change the parallel structure and cannot always be merged with elementwise work. MEMORY LIMITS: fusing keeps intermediates in registers or shared memory, and a chain too long or too wide exceeds what is available, so the compiler spills and the benefit degrades. And OPERATIONS WITH DIFFERENT SHAPES or broadcast patterns, which may not fuse cleanly. WHAT THIS IMPLIES FOR HOW YOU WRITE MODEL CODE. Keeping the hot path traceable is worth real effort, because a graph break costs more than most micro-optimizations gain. Avoiding unnecessary materialization - not returning intermediates you do not need, not converting to Python scalars mid-graph - preserves fusion opportunities. And a chain of small operations that is logically one thing is a candidate to check: either the compiler fuses it, or it is a place a custom kernel would pay. HOW I WOULD VERIFY IT HAPPENED, rather than assume: look at the generated code or count the kernels in a profiler timeline. A fused region shows as one kernel; an unfused one shows as several. The linearity test also works from outside - if adding an operation to the chain still adds constant time after compilation, fusion did not happen and something is preventing it. AND THE REASON THIS IS THE DURABLE CONTENT: fusion is not a torch.compile feature, it is the answer to a hardware fact that is not going to change - that memory is much slower than arithmetic and the gap has widened for decades. Any compiler for this hardware will fuse, and understanding why lets you predict where it will and will not help."
        },
        {
          "q": "How would you decide whether to compile a model at all?",
          "a": "BY ESTABLISHING THE REGIME AND THE SHAPE STABILITY, because those two facts determine both the size of the win and whether it is achievable. THE REGIME QUESTION: is the workload compute-bound, bandwidth-bound or overhead-bound? Compile helps enormously in the last two and little in the first. A model dominated by large matrix multiplications is already near peak and there is not much to fuse; a model with many small elementwise operations is dominated by traffic and launches, which is exactly what compilation removes. The two scaling experiments settle it - vary operation count at fixed size, vary size at fixed count - and they need nothing but a timer. THE SHAPE QUESTION: how many distinct input shapes does this path see? Compilation is shape-specialized, so each new shape recompiles. A training loop with fixed shapes compiles once and amortizes forever - the decision is trivially yes. A serving path with variable-length inputs recompiles per length unless you bucket or pad, and a path with a long tail of unique shapes can spend more time compiling than it saves. That is the same mechanism as JAX's recompile-on-new-shape from 22-01, and the same fix applies. THE COSTS I WOULD ACCOUNT FOR. Compile time on the first call, which affects startup and can be substantial for a large model. Debuggability, since a compiled region is harder to inspect and stack traces get worse. Coverage, because graph breaks fragment the graph and reduce the benefit, sometimes to nothing. And in production, the recompile cliff from 16-02: exceeding the cache limit can silently drop the job back to eager for the remainder of the run, which shows up as a mysterious throughput regression with no error. THE DECISION I WOULD ACTUALLY MAKE. For training with fixed shapes: compile, measure, and keep it if the gain is real. For inference with bucketed shapes: compile, and monitor recompile counts as an operational metric. For a path with genuinely dynamic shapes and no bucketing option: measure carefully before committing, and expect the answer to be no. THE MEASUREMENT DISCIPLINE, which this module keeps returning to: benchmark COLD as well as warm. A warm-cache measurement reports the steady state and hides the compilation entirely, which is the flattering number and the one that will not reproduce in production. And report the shape distribution the benchmark used, because a fixed-shape microbenchmark on a variable-shape workload is measuring a different system. AND THE ORDERING POINT that applies here as elsewhere: compilation is a visible, interesting optimization, and in a serving system the allocation and scheduling decisions from 22-04 were worth 6.4x and 1.74x with no kernel work at all. Establish that the kernel layer is the binding constraint before spending effort there - which is the same lesson as chunking beating the embedding model, and endpointing beating the language model."
        },
        {
          "q": "What does it mean that the compiler could not be run in this environment?",
          "a": "IT MEANT REPORTING THE MECHANISMS INSTEAD OF A SPEEDUP, and I think that produced a better lesson than the alternative. THE SITUATION: inductor requires a host C compiler that was not present, and Triton was not installed. So torch.compile did not execute. THE TWO OPTIONS. One is to describe what torch.compile does and cite numbers from elsewhere, which would present figures nobody in the lesson measured - the exact practice this curriculum spends its time arguing against. The other is to measure the MECHANISMS with tools that do run, and to show the real API as reference rather than as a result. That is what was done: torch.fx for graph capture, direct timing for the fusion and launch-overhead effects, and numpy for the tile model. WHY THE RESULT IS STILL SUBSTANTIVE. The three findings are properties of the hardware and the workload, not of any compiler. Elementwise chains are bandwidth-bound because arithmetic intensity is about one - that is true regardless of who compiles it. Time linear in chain length at 0.83 ms per operation is a measurement of memory traffic. Ten thousand small operations at 53.5 times one large one is a measurement of launch overhead. A compiler's job is to remove those two costs, so measuring the costs tells you what the compiler is worth on your workload - arguably more directly than a speedup number from someone else's machine would. WHAT IS GENUINELY MISSING: the actual end-to-end speedup on this hardware, the quality of inductor's fusion decisions, and any experience of the tooling. Those are real gaps and the lesson should not pretend otherwise, which is why the API appears as reference with an explicit note that it did not run. THE GENERAL PRINCIPLE I would draw, since it applies well beyond this lesson: when you cannot run the thing, measure the mechanism it operates on rather than importing someone else's number. The imported number is unverifiable, hardware-specific and usually measured under favourable conditions - and it teaches nothing about WHY. The mechanism measurement is reproducible, tells you where the win would come from, and lets a reader estimate the gain for their own case. AND IT IS THE MODULE'S PEDAGOGY STATED OPENLY. The same constraint produced the Flax and Optax lesson without Flax or Optax, the vLLM lesson without vLLM, and the ONNX lesson without ONNX. In each case the library was absent and the mechanism was the content - and the capstone measures why that allocation of learning time is the right one, rather than asserting it as a preference."
        },
        {
          "q": "How does this lesson serve the module's thesis?",
          "a": "IT REDUCES A FAST-MOVING TOOLING AREA TO THREE MECHANISMS THAT WILL OUTLIVE ALL OF IT. Compilers for tensor programs are one of the most churn-heavy parts of this landscape - inductor, XLA, TVM, TensorRT, and whatever arrives next, each with its own flags, modes and failure cases. What every one of them does is capture a graph, fuse memory-bound operations, and amortize launch overhead. Learn those three and a new compiler's documentation becomes recognizable; learn the flags and you relearn each time. THE DERIVATION IS THE POINT, not the numbers. Fusion matters because elementwise operations have arithmetic intensity around one against hardware ratios in the hundreds - so they are bandwidth-bound, and a chain of them is a chain of round trips. That is a roofline argument, it follows from a hardware fact that has been getting more extreme for decades, and it is why the biggest compiler win is on the operations that look cheapest. Anyone who understands that can predict where compilation will help without running it. THE THIRD REGIME is the part most people are missing. Compute-bound and bandwidth-bound are familiar; OVERHEAD-bound - where a fixed 1.4 microseconds per launch dominates and ten thousand small operations cost 53.5 times one large one - is a distinct regime with its own fix, and it explains the counterintuitive fact that small workloads often gain most from compilation. THE MEASUREMENT DISCIPLINE carries over from 22-01 unchanged: benchmark cold as well as warm, because a warm cache reports the compiler as free. And the linearity diagnostic is a nice example of a measurement that identifies a MECHANISM rather than a magnitude - if adding an operation adds constant time regardless of what it computes, you know you are memory-bound without needing a profiler. AND THE ENVIRONMENT CONSTRAINT made the thesis explicit. torch.compile could not run here, so rather than importing a speedup from elsewhere, the lesson measured the costs a compiler removes and showed the API as reference. That is the module's pedagogy in the open: when you cannot run the tool, measure the mechanism it operates on - because the mechanism is reproducible, it explains WHY, and it lets a reader estimate the answer for their own hardware instead of trusting someone else's."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ All tensor compilers do three things",
        "back": "CAPTURE a graph (see more than one op) · FUSE memory-bound ops · AMORTIZE launch overhead. Inductor, XLA, TVM, TensorRT are four answers to those three problems. Learn the problems — the flags don't transfer."
      },
      {
        "type": "formula",
        "front": "Elementwise ops are ALWAYS bandwidth-bound",
        "back": "Arithmetic intensity ≈ 1 FLOP/byte vs hardware ratios ~100. So no amount of faster arithmetic helps — the only lever is moving fewer BYTES, which is what fusion does. Same roofline argument that makes LLM decode bandwidth-bound."
      },
      {
        "type": "formula",
        "front": "★ Fusion: N memory passes → one",
        "back": "Unfused chain time is LINEAR in N (slope ~0.83 ms/op) because each op is a round trip. Fused keeps intermediates in registers → 32 ops = 32× less traffic. The biggest compiler win, on the ops that look cheapest."
      },
      {
        "type": "intuition",
        "front": "★ The linearity DIAGNOSTIC",
        "back": "If adding an op adds CONSTANT time regardless of what it computes, you're measuring memory traffic, not arithmetic — so fusion is the fix. Identifies the mechanism with nothing but a timer."
      },
      {
        "type": "formula",
        "front": "The third regime: OVERHEAD-bound",
        "back": "t = N(t_launch + t_work), t_launch ≈ 1.4 µs → **10,000 small ops = 53.5× one big op** at the same arithmetic. Not compute-bound, not bandwidth-bound. Fixes: fusion (fewer launches) + graph capture & replay (amortize)."
      },
      {
        "type": "intuition",
        "front": "Compilers help MOST on small work",
        "back": "The opposite of the intuition. A big matmul is already compute-bound and near peak — little to add. Many small elementwise ops are dominated by traffic and launches, which is exactly what compilation removes."
      },
      {
        "type": "intuition",
        "front": "Separating the three regimes with a timer",
        "back": "Vary op COUNT at fixed size → overhead-bound if time tracks count. Vary SIZE at fixed count → bandwidth-bound if time tracks bytes. Neither → compute-bound. Then RE-MEASURE after fixing, because optimizing re-orders bottlenecks."
      },
      {
        "type": "intuition",
        "front": "The Triton tile model",
        "back": "One level up from CUDA (per-thread), one below a framework op (whole tensor): you write per-BLOCK code, the compiler handles within-block parallelism and schedules blocks. The model transfers even if the language doesn't."
      },
      {
        "type": "pitfall",
        "front": "Verify tiling against the NAIVE form first",
        "back": "Write the block-wise version in numpy and assert it matches exactly — that's what proves indexing, masking and accumulation are right. Bugs concentrate in the TAIL BLOCK, and getting a wrong answer FAST is a silent failure."
      },
      {
        "type": "pitfall",
        "front": "What limits fusion",
        "back": "GRAPH BREAKS (ops either side can't fuse — often the highest-value fix and invisible unless you look) · materialization points · reductions across the boundary · register/shared-memory limits · mismatched shapes and broadcasts."
      },
      {
        "type": "intuition",
        "front": "Decide whether to compile from TWO facts",
        "back": "The REGIME (compile helps bandwidth- and overhead-bound, little for compute-bound) and SHAPE STABILITY (fixed shapes → compile once; a long tail of unique shapes can spend more time compiling than it saves — bucket or don't)."
      },
      {
        "type": "intuition",
        "front": "★ When you can't run the tool, measure the MECHANISM",
        "back": "torch.compile didn't execute here (no host C compiler, no Triton), so rather than importing someone else's speedup, the lesson measured the COSTS a compiler removes. Reproducible, explains WHY, and lets you estimate for your own hardware."
      }
    ],
    "refs": [
      {
        "title": "Ansel et al. (2024), PyTorch 2: Faster Machine Learning Through Dynamic Python Bytecode Transformation and Graph Compilation",
        "url": "https://pytorch.org/assets/pytorch2-2.pdf"
      },
      {
        "title": "Tillet, Kung & Cox (2019), Triton: An Intermediate Language and Compiler for Tiled Neural Network Computations",
        "url": "https://dl.acm.org/doi/10.1145/3315508.3329973"
      },
      {
        "title": "Chen et al. (2018), TVM: An Automated End-to-End Optimizing Compiler for Deep Learning",
        "url": "https://arxiv.org/abs/1802.04799"
      },
      {
        "title": "Williams, Waterman & Patterson (2009), Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      },
      {
        "title": "PyTorch, torch.compile Documentation",
        "url": "https://pytorch.org/docs/stable/torch.compiler.html"
      }
    ],
    "demos": [
      "kv-cache",
      "batching",
      "quantization",
      "kv-cache-eviction"
    ]
  },
  "onnx-export": {
    "level": "core",
    "body": {
      "intuition": [
        "Every model export format is three things: a GRAPH, an OPSET, and a PARITY CHECK. The graph is an intermediate representation of the computation as nodes and edges. The opset is a contract stating which operations the target runtime is guaranteed to understand. And parity is the only way you find out whether the exported thing computes what the original did. ONNX, TorchScript, TFLite, CoreML and StableHLO are five instances of that structure, which is why understanding the structure beats learning any one of their APIs.",
        "The parity check is the part that gets skipped, and it is the only one that can catch a correctness failure. Exporting a small network produced a five-node graph, and a from-scratch interpreter running that graph reproduced the original framework's outputs to about 6 times 10 to the minus 6, with predictions agreeing exactly. That is what 'the export worked' should mean. 'It exported without raising an error' means only that the tracer completed - which is a much weaker statement and the one people usually settle for.",
        "The opset is a contract, and the useful demonstration is what happens when it is violated: exporting a model containing an operation outside the opset REFUSED rather than silently substituting an approximation. That refusal is the feature. A tool that quietly replaces an unsupported activation with a near-equivalent produces a model that runs, returns plausible numbers, and is subtly wrong - a failure that surfaces as a mysterious quality regression in production rather than as an error at build time."
      ],
      "math": [
        {
          "h": "Parity is the export correctness check",
          "paras": [
            "Run both the original and the exported graph on the same inputs and compare.",
            "Agreement to floating-point noise is the evidence that the export is faithful."
          ],
          "tex": "\\max_i \\big| y^{\\text{exported}}_i - y^{\\text{original}}_i \\big| \\approx 6\\times10^{-6}, \\qquad \\text{prediction agreement} = 1.000",
          "texNote": "Two numbers, because they answer different questions. The maximum absolute difference says the numerics are faithful; the prediction agreement says the decisions are identical. Small numeric drift with identical decisions is the normal and acceptable outcome, and the pair distinguishes it from the case where drift has become large enough to flip an argmax - which a tolerance check alone would let through."
        },
        {
          "h": "The opset is a contract, and violation should REFUSE",
          "paras": [
            "Export succeeds only if every operation in the graph has a definition the target understands.",
            "The alternative to refusing is silently substituting, which is worse."
          ],
          "tex": "\\text{export ok} \\iff \\text{ops}(\\text{graph}) \\subseteq \\text{opset}(v), \\qquad \\text{unsupported} \\Rightarrow \\textbf{refuse}, \\text{ not approximate}",
          "texNote": "A refusal at build time is a cheap, loud failure. A silent substitution - replacing an unsupported activation with something close - produces a model that runs, returns plausible numbers and is subtly wrong, which surfaces in production as an unexplained quality regression. The opset version is also why exported models pin a version: the same graph against a different opset is a different contract."
        },
        {
          "h": "Quantized export - drift without decision change",
          "paras": [
            "Integer weights are smaller and the outputs move slightly.",
            "Whether that matters depends entirely on what consumes the output."
          ],
          "tex": "\\text{size} \\;\\downarrow 3.6\\times, \\qquad \\text{accuracy } 0.912 \\to 0.914, \\qquad \\text{logits DRIFT, } \\arg\\max \\text{ unchanged}",
          "texNote": "The accuracy moving slightly UP is within noise and is the honest reading - quantization did not help, it did not measurably hurt. The important observation is the last clause: the logits changed and the decisions did not, because argmax is a step function and the drift was smaller than the margin. That is reassuring for a classifier and it is exactly the property that makes accuracy blind to quantization damage in a GENERATIVE model, where you sample from the distribution and errors compound."
        }
      ],
      "code": [
        {
          "h": "Graph, opset, parity - the three things every export format is",
          "paras": [
            "Building the IR and an interpreter by hand is what makes the structure visible."
          ],
          "code": "# 1. THE GRAPH - an IR of nodes and edges. Exporting a small MLP gave\n#    a FIVE-NODE graph, with framework ops mapped to opset ops:\n#      Linear -> Gemm      ReLU -> Relu\n#    The mapping is the interesting part: the export format has its own\n#    vocabulary, and your framework's op must translate into it.\n\n# 2. ★ THE PARITY CHECK - the only step that can catch a CORRECTNESS\n#    failure, and the one that gets skipped:\ny_ref = torch_model(x)\ny_exp = interpret(graph, x)          # a from-scratch interpreter\nprint(abs(y_exp - y_ref).max())      # 6e-6   <- numerics faithful\nprint((y_exp.argmax(-1) == y_ref.argmax(-1)).mean())   # 1.000\n#    ★ TWO numbers because they answer DIFFERENT questions: drift says\n#      the arithmetic matches; agreement says the DECISIONS match.\n#      Small drift + identical decisions is the normal good outcome.\n#    ⚠ \"It exported without an error\" only means the TRACER completed.\n\n# 3. ★ THE OPSET IS A CONTRACT. An op outside it made export REFUSE:\n#      GELU not in opset  ->  export FAILS, loudly, at build time\n#    THAT REFUSAL IS THE FEATURE. The alternative - silently swapping\n#    in a near-equivalent - gives you a model that RUNS, returns\n#    PLAUSIBLE numbers, and is subtly wrong. That surfaces as an\n#    unexplained quality regression in production, weeks later, with\n#    no error to grep for.\n#    (It is also why exports pin an opset VERSION: the same graph\n#     against a different opset is a different contract.)",
          "caption": "A refusal at build time is a cheap loud failure; a silent substitution is a correctness bug that surfaces as a mysterious regression weeks later."
        },
        {
          "h": "Quantized runtime - and the caveat that decides whether it is safe",
          "paras": [
            "The measured result is reassuring, and the reason it is reassuring does not generalize."
          ],
          "code": "# MEASURED, int8 weights in the exported runtime:\n#   size        3.6x smaller\n#   accuracy    0.912 -> 0.914     (up slightly = WITHIN NOISE; the\n#                                   honest reading is \"no measurable\n#                                   change\", not \"quantization helped\")\n#   logits      DRIFT\n#   decisions   UNCHANGED\n\n# ★ WHY DECISIONS SURVIVED: argmax is a STEP FUNCTION, and the drift\n#   was smaller than the margin between the top two logits. Nothing\n#   flipped.\n#\n# ⚠ AND THAT IS EXACTLY WHY IT DOESN'T GENERALIZE. For a CLASSIFIER,\n#   \"logits drift, argmax holds\" is a safe result. For a GENERATIVE\n#   model you SAMPLE from the distribution, so drift changes which\n#   tokens can appear - and errors COMPOUND over hundreds of\n#   autoregressive steps (17-06). The same measurement that reassures\n#   here is the one that hides quantization damage there.\n\n# SO THE EXPORT CHECKLIST DEPENDS ON THE CONSUMER:\n#   classifier   -> parity on logits + agreement on argmax  ✓ enough\n#   generative   -> ALSO perplexity, long-output generation, and\n#                   sampling at the deployed temperature\n#   regression   -> parity on the VALUES; there is no argmax to hide\n#                   drift behind, so the tolerance IS the metric\n\n# AND THE OPERATIONAL ONES that are easy to forget:\n#   dynamic axes declared (or the export bakes in the batch size)\n#   preprocessing INSIDE or OUTSIDE the graph - decide and document\n#   the opset version PINNED alongside the artifact",
          "caption": "\"Logits drift, decisions don't\" is a safe result for a classifier and the exact blind spot that hides quantization damage in a generative model."
        }
      ],
      "useCases": [
        "Moving a trained model to a different runtime or language, where the graph-plus-opset structure is what makes the handoff possible at all.",
        "Deploying to constrained targets - mobile, embedded, browser - where a quantized exported runtime is often the only way the model fits.",
        "Decoupling training and serving stacks, so the serving side is not pinned to the training framework's version.",
        "Verifying that an optimization or conversion preserved behaviour, which the parity check answers directly and 'it ran' does not."
      ],
      "pitfalls": [
        "Treating a successful export as a successful conversion. It means the tracer completed; only a parity check tells you the exported graph computes the same thing.",
        "Checking numeric tolerance without checking decisions. Small drift with identical predictions is fine, and the pair distinguishes it from drift large enough to flip an argmax.",
        "Wanting the exporter to substitute unsupported operations. A refusal at build time is loud and cheap; a silent approximation is a correctness bug that surfaces as a quality regression weeks later.",
        "Not pinning the opset version with the artifact. The same graph against a different opset is a different contract, and behaviour can change underneath you.",
        "Generalizing 'logits drift but decisions do not' beyond classifiers. Generative models sample from the distribution and compound errors, so that reassuring result is exactly the blind spot there.",
        "Forgetting dynamic axes. An export without them bakes in the traced batch size or sequence length, which fails at the first differently-shaped input.",
        "Leaving preprocessing ambiguous. Whether normalization lives inside or outside the graph is a decision that silently produces wrong answers if the serving side assumes the other one."
      ],
      "connections": [
        {
          "ref": "mlops/torchscript-onnx",
          "text": "The production context for this - tracing versus scripting, versioning the artifact, and the serving stack the export feeds."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Why accuracy is a step function and cannot see distributional damage - the same mechanism that makes the classifier result reassuring and the generative case dangerous."
        },
        {
          "ref": "pytorch-internals/torchscript",
          "text": "Tracing versus scripting, and the failure where a trace bakes in the path taken at one input while scripting refuses instead."
        },
        {
          "ref": "frontier-frameworks/torch-compile-triton",
          "text": "The other consumer of a captured graph - a compiler optimizing it in place rather than an exporter shipping it elsewhere."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Where the exported artifact goes, including versioning, warmup and the operational concerns that outlive any particular export format."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is every export format, structurally?",
          "a": "A graph, an opset, and a parity check. ONNX, TorchScript, TFLite, CoreML and StableHLO are five instances of that structure."
        },
        {
          "q": "What does a successful export actually tell you?",
          "a": "That the tracer completed. It says nothing about whether the exported graph computes the same thing."
        },
        {
          "q": "What is the parity check?",
          "a": "Run both the original and the exported graph on the same inputs and compare - here, maximum difference 6e-6 with predictions agreeing exactly."
        },
        {
          "q": "Why report two numbers?",
          "a": "Drift says the arithmetic matches; agreement says the decisions match. Small drift with identical decisions is the normal good outcome."
        },
        {
          "q": "What is an opset?",
          "a": "A contract stating which operations the target runtime is guaranteed to understand. Export succeeds only if every op in the graph is in it."
        },
        {
          "q": "What happened with an unsupported operation?",
          "a": "Export refused, loudly, at build time - rather than silently substituting an approximation."
        },
        {
          "q": "Why is refusing better?",
          "a": "A silent substitution produces a model that runs, returns plausible numbers and is subtly wrong, surfacing as a quality regression with no error to find."
        },
        {
          "q": "Why pin the opset version?",
          "a": "The same graph against a different opset is a different contract, so behaviour can change underneath you without the artifact changing."
        },
        {
          "q": "What did int8 export measure?",
          "a": "3.6 times smaller, accuracy 0.912 to 0.914 - within noise - with logits drifting and decisions unchanged."
        },
        {
          "q": "Why did decisions survive the drift?",
          "a": "Argmax is a step function, and the drift was smaller than the margin between the top two logits, so nothing flipped."
        },
        {
          "q": "When does that reassurance fail?",
          "a": "For generative models. You sample from the distribution, so drift changes which tokens can appear and errors compound over many steps."
        },
        {
          "q": "What operational details are easy to forget?",
          "a": "Declaring dynamic axes, deciding whether preprocessing is inside or outside the graph, and pinning the opset version with the artifact."
        }
      ],
      "standard": [
        {
          "q": "How would you export a model and know that the export is correct?",
          "a": "BY TREATING EXPORT AS THREE THINGS AND CHECKING THE THIRD, because the first two are what tools give you and the third is what tells you it worked. THE THREE THINGS: a GRAPH - an IR of nodes and edges representing the computation; an OPSET - a contract about which operations the target runtime understands; and a PARITY CHECK - a comparison of outputs between the original and the export. Every export format is these three, which is why the structure transfers across ONNX, TorchScript, TFLite, CoreML and whatever comes next. WHAT EXPORT ACTUALLY DOES. It maps your framework's operations into the target's vocabulary - a Linear becomes a Gemm, a ReLU becomes a Relu - and produces a graph. Exporting a small network gave five nodes. The mapping is where the interesting failures live, because the target has its own vocabulary and your operation must translate into it. THE PARITY CHECK, which is the answer to the question. Run both on the same inputs and report TWO numbers: the maximum absolute difference in outputs, which was about 6e-6, and the prediction agreement, which was exactly 1.0. Two numbers because they answer different questions - drift says the arithmetic is faithful, agreement says the decisions are identical, and small drift with identical decisions is the normal acceptable outcome. Reporting only a tolerance would let through a case where drift had grown large enough to flip an argmax. WHY 'IT EXPORTED' IS NOT ENOUGH. That statement means the tracer completed. It does not mean the graph computes what the original computed, and there are several ways for those to differ: a traced control-flow path baked in, a missing dynamic axis, a subtle difference in an operator's semantics between frameworks, or preprocessing that lives on the wrong side of the boundary. All of those produce a model that runs. THE OPSET AS A CONTRACT, and the demonstration that matters: an operation outside the opset made export REFUSE rather than substitute. That refusal is the feature. A tool that silently replaces an unsupported activation with a near-equivalent gives you something that runs, returns plausible numbers and is subtly wrong - which surfaces weeks later as an unexplained quality regression with no error to grep for. Cheap loud failure beats expensive quiet failure, and it is worth choosing tools on that basis. WHAT ELSE I WOULD CHECK BEFORE SHIPPING: dynamic axes declared, so the export does not bake in the traced batch size or sequence length; preprocessing decided and documented as inside or outside the graph; the opset version pinned alongside the artifact; and parity re-verified on a REALISTIC input distribution rather than one random tensor, because a single input can pass while an edge case diverges.",
          "deepDive": {
            "q": "The exported model gives slightly different outputs. Is that a problem?",
            "a": "IT DEPENDS ENTIRELY ON WHAT CONSUMES THE OUTPUT, and that is the whole answer - the same drift is harmless in one setting and disqualifying in another. FIRST, ESTABLISH THE SCALE. A maximum absolute difference around 1e-6 is floating-point noise from a different operation order, a fused kernel, or a different accumulation precision. That is expected and unavoidable. A difference around 1e-2 is not noise and points at a real semantic difference - a different default in an operator, a padding convention, an epsilon in a normalization layer, or a substituted operation. So the magnitude tells you which conversation you are having. THEN ASK WHO CONSUMES IT. For a CLASSIFIER, what matters is the argmax, and the measured case is the reassuring one: logits drifted, decisions were identical, because argmax is a step function and the drift was smaller than the margin between the top two logits. Report prediction agreement, and if it is 1.0 on a realistic input set you are fine. For a REGRESSION model there is no argmax to hide behind - the values ARE the output, so the tolerance is the metric and you need to decide what tolerance the downstream system can accept. For a GENERATIVE model, this is where the reassuring result becomes a trap. You SAMPLE from the distribution rather than taking the argmax, so drift changes which tokens can appear at all - particularly in the low-probability tail where the relative error is largest. And errors COMPOUND, because each token conditions on the ones before it, so a small per-step perturbation becomes a large divergence over hundreds of steps. A prediction-agreement check on the first token would pass while the generated text degraded, which is exactly the blind spot from 17-06. For a RANKING or RETRIEVAL system, what matters is the induced ordering, so measure rank correlation and recall at k rather than the score values. THE CHECK I WOULD RUN FOR THE GENERATIVE CASE, since the classifier's check is inadequate there: perplexity on held-out text, which is continuous and sensitive; long-output generation compared at the deployed sampling parameters rather than greedily; repetition and format-violation rates; and the divergence between the two output distributions, which measures what actually changed rather than a downstream consequence of it. WHERE THE DRIFT USUALLY COMES FROM, in rough order: fused operations accumulating in a different order, different epsilon or default values in normalization, a different padding or rounding convention, reduced-precision accumulation in the runtime, and outright operator substitution. The last one is the one to rule out first, because it is the only one that is a bug rather than a property. AND THE PRINCIPLE, which is this module's habit: choose a check the consumer can actually be broken by. Prediction agreement is the right check when a prediction is what ships, and it is the wrong check when a distribution is what ships - which is the same 'what would this metric fail to detect' question that the evaluation lessons keep returning to."
          }
        },
        {
          "q": "Why is a refusal better than a substitution?",
          "a": "BECAUSE A LOUD CHEAP FAILURE BEATS A QUIET EXPENSIVE ONE, and this is one of the clearest cases of that principle in the curriculum. THE SITUATION: a model contains an operation the target opset does not define. The exporter has two options. Option one is to REFUSE - fail at build time with a message naming the unsupported operation. Option two is to SUBSTITUTE something close, so the export succeeds. WHY SUBSTITUTION IS WORSE, even though it is more convenient in the moment. The resulting model runs. It returns numbers in the right range. Its outputs are plausible. And it computes something different from what you trained. That failure surfaces as a quality regression in production, possibly weeks later, with no error message, no stack trace and nothing to grep for - and the investigation starts from 'the model got worse' with no pointer at the export step, which by then is several deploys back. The cost of finding it dwarfs the cost of handling the refusal. WHY REFUSAL IS CHEAP. You get the failure at build time, with the offending operation named, and the fixes are all straightforward: use a later opset that defines it, decompose the operation into supported primitives, register a custom operator, or change the model to use a supported equivalent deliberately. Each of those is a decision YOU make with knowledge of the consequences, rather than one the tool makes silently on your behalf. THE GENERAL PRINCIPLE, which recurs across this curriculum: prefer tools that fail loudly at the boundary over tools that degrade quietly past it. The same argument appears with tracing versus scripting, where a trace bakes in the path taken at one input and scripting refuses on unsupported constructs; with strict schema validation over lenient coercion; and with a validator that rejects a malformed tool call rather than executing a guessed interpretation. In every case the strict option is more annoying up front and cheaper overall. HOW I WOULD APPLY IT WHEN CHOOSING TOOLS. Ask what a conversion tool does with something it does not understand. If the answer is 'best effort', treat every conversion as requiring a full parity check on a realistic input distribution, because you cannot rely on the tool telling you. If the answer is 'refuses', the parity check is still worth running - but you have a much stronger guarantee that the graph you shipped is the graph you built. AND THE CONNECTION TO THE PARITY CHECK: refusal handles the failures the tool can SEE. Parity handles the ones it cannot - a semantic difference in an operator that exists in both vocabularies but behaves slightly differently. You need both, and they cover different classes of error."
        },
        {
          "q": "When is exporting worth the trouble at all?",
          "a": "WHEN THE SERVING ENVIRONMENT DIFFERS FROM THE TRAINING ENVIRONMENT IN A WAY THAT MATTERS - and when it does not, the export step is complexity for nothing. WHERE IT PAYS. A DIFFERENT RUNTIME OR LANGUAGE: serving from C++, Rust, Java, mobile or the browser, where shipping a Python training framework is not an option. This is the original motivation and it is still the strongest one. CONSTRAINED TARGETS: mobile and embedded, where a quantized exported runtime is frequently the only way the model fits at all, and where the framework's overhead is unacceptable. DECOUPLING VERSIONS: the serving stack stops being pinned to the training framework's version, so you can upgrade one without the other - which matters more the longer a model is in production. OPTIMIZED RUNTIMES: the target runtime may have graph optimizations, fused kernels or hardware-specific paths that the training framework does not, which is where a real speedup comes from rather than from the export itself. WHERE IT DOES NOT PAY. If you serve from the same framework you trained in, on similar hardware, at a scale where the framework's own serving path is adequate - the export adds a conversion step, a parity obligation, an artifact to version and a class of failure that would not otherwise exist. That is a real cost for no benefit, and 'we should export because that is what you do' is how it gets adopted. WHAT IT COSTS, honestly, so the decision is informed. The conversion can fail on unsupported operations or dynamic control flow. The exported model may be harder to debug, since you have lost the framework's introspection. Some operations behave subtly differently, which is what parity checks exist to catch. Dynamic shapes need explicit handling. And you now maintain two paths - training and serving - that must be kept in agreement, which is an ongoing obligation rather than a one-time task. HOW I WOULD DECIDE: name the specific constraint the export is solving. 'We serve from Java' is a constraint. 'We need it on device' is a constraint. 'The runtime is measurably faster on our hardware' is a constraint, once measured. 'It is more portable' is not a constraint unless portability is a requirement someone has. AND THE PART THAT SURVIVES EITHER WAY, which is why the lesson is worth learning regardless: graph, opset, parity is the structure of every conversion, not just export. Compiling a model, quantizing it, distilling it, or moving it between hardware are all transformations where the same question applies - does the transformed thing compute what the original did, and how would I know. The parity check is the durable habit, and it applies to changes you would not think of as exports at all."
        },
        {
          "q": "What does 'logits drift but decisions do not' tell you?",
          "a": "IT TELLS YOU THE PERTURBATION WAS SMALLER THAN THE ARGMAX MARGIN - which is reassuring here and is exactly the blind spot that hides quantization damage elsewhere. WHAT WAS MEASURED. Int8 export gave a model 3.6 times smaller with accuracy moving 0.912 to 0.914 - which is within noise, and the honest reading is 'no measurable change' rather than 'quantization helped'. The logits changed and the predictions did not. WHY. Argmax is a STEP FUNCTION of the logits: only which one is largest matters. If the top logit led the second by more than the drift, the ordering survives and accuracy is unchanged. So the accuracy result is not evidence that the model is unchanged; it is evidence that the change was smaller than the margins. Those are different claims and the second is much weaker. WHY THAT MATTERS FOR CLASSIFIERS ANYWAY: for a system that ships a prediction, the argmax IS the output, so if the argmax is stable the model is behaving identically from the consumer's perspective. The check is appropriate to the consumer and the result is genuinely reassuring. WHERE IT BECOMES DANGEROUS: a generative model. There you SAMPLE from the distribution rather than taking the argmax, so drift in the logits changes the probabilities and therefore which tokens can appear - particularly in the low-probability tail, where the relative error from quantization is largest and where sampling actually reaches. And errors COMPOUND, because each token conditions on the previous ones, so a small per-step perturbation becomes a large divergence over hundreds of steps. A prediction-agreement check would pass while the generated text degraded, which is precisely the failure in 17-06 where quantized models pass benchmarks and produce worse long outputs. WHAT TO MEASURE INSTEAD IN THAT CASE: perplexity, which is continuous and responds immediately; the divergence between the two output distributions, which measures the thing that changed rather than a downstream consequence; long-output generation at the DEPLOYED sampling parameters rather than greedily; and repetition and format-violation rates, where compounding shows up. THE GENERAL PRINCIPLE this is an instance of, and it recurs through the whole curriculum: choose a metric that can MOVE in response to the change you are testing. Accuracy cannot see a distributional change because it is a step function. That is a property of the instrument, not a fact about the model, and it is why the same measurement is a valid safety check in one setting and a false reassurance in another. Asking 'what change would this metric fail to detect' before running it is the habit that prevents both errors."
        },
        {
          "q": "What operational details make an export actually deployable?",
          "a": "FOUR THINGS THAT ARE EASY TO OMIT AND EXPENSIVE TO DISCOVER LATE. (1) DYNAMIC AXES. Export traces with concrete shapes, so unless you declare which dimensions are dynamic, the batch size and sequence length are baked in - and the first differently-shaped input fails, usually in staging if you are lucky and production if you are not. This has to be declared at export time and verified by running the exported model at several shapes, which is a two-line test that is routinely skipped. (2) THE PREPROCESSING BOUNDARY. Normalization, tokenization, resizing and type conversion either live inside the exported graph or outside it, and both are valid choices - what is not valid is leaving it ambiguous. If the serving code assumes preprocessing is inside and it is outside, the model receives unnormalized inputs and returns confident nonsense, with no error. I would decide deliberately, document it with the artifact, and prefer INSIDE the graph where the target supports it, because it removes a whole class of skew between training and serving. (3) VERSION PINNING. The opset version is part of the contract, so the artifact must record which one it was exported against - the same graph against a different opset is a different contract. Alongside it: the exporter version, the source framework version and the model version, because reproducing a conversion six months later is otherwise guesswork. (4) THE PARITY TEST AS A CI ARTIFACT, not a one-time check. Store a set of reference inputs and their expected outputs from the original model, and re-run the comparison every time the model, the exporter or the runtime changes. That turns a manual step into a regression gate, and it is the only thing that catches a runtime upgrade changing an operator's behaviour underneath you. WHAT I WOULD ALSO VERIFY BEFORE TRUSTING IT: parity on a REALISTIC input distribution rather than one random tensor, since edge cases - empty inputs, maximum lengths, unusual values - are where semantic differences surface. Performance on the target hardware, because the reason for exporting is often speed and that should be measured rather than assumed. And warmup behaviour, since many runtimes optimize on the first inference and the first request is not representative. THE FRAMING I WOULD OFFER: an exported model is a build artifact, and it deserves the treatment a build artifact gets - versioned, tested, reproducible, with its inputs pinned. Treating it as a file someone generated once is how a serving stack ends up with a model nobody can rebuild, which is a worse problem than any of the individual failures above."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT REDUCES A FORMAT-HEAVY TOPIC TO THREE INVARIANTS THAT DO NOT DEPEND ON THE FORMAT. Export tooling is churn: ONNX opsets version, TorchScript was superseded, TFLite and CoreML and StableHLO each have their own vocabulary and their own converters. A lesson about any one API would date quickly. GRAPH, OPSET, PARITY does not - every one of those formats is those three things, and understanding the structure means a new format's documentation is recognizable rather than novel. THE HABIT IT INSTALLS is the parity check, and it generalizes far past export. Any transformation of a model - compiling it, quantizing it, distilling it, pruning it, moving it to different hardware - raises the same question: does the transformed thing compute what the original did, and how would I know? 'It ran without an error' is the answer people accept and it is much weaker than it sounds. Two numbers - numeric drift and decision agreement - is the answer that means something, and running both is what distinguishes them. THE DESIGN PRINCIPLE the opset demonstrates is one this curriculum keeps arriving at from different directions: prefer loud cheap failure to quiet expensive failure. The exporter REFUSING an unsupported operation is better than substituting an approximation, because the substituted model runs and is subtly wrong, and that surfaces weeks later with nothing to grep for. The same principle is why scripting refusing beats tracing baking in a path, why validation rejecting a malformed tool call beats executing a guess, and why a strict schema beats lenient coercion. AND THE MOST TRANSFERABLE RESULT is the one that looks like good news: logits drifted, decisions did not. That is reassuring for a classifier and it is precisely the mechanism that hides quantization damage in a generative model, because argmax is a step function and sampling is not. Same measurement, opposite meaning, depending on what consumes the output. Learning to ask what a metric would FAIL to detect - before running it - is worth more than any of the specific numbers here, and it is the thread that ties this lesson to the evaluation lessons in every other module."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Every export format is three things",
        "back": "A GRAPH (IR of nodes and edges) · an OPSET (contract of ops the target understands) · a PARITY CHECK (does it compute the same thing). ONNX, TorchScript, TFLite, CoreML, StableHLO are five instances — learn the structure, not the API."
      },
      {
        "type": "pitfall",
        "front": "\"It exported\" means the TRACER completed",
        "back": "Nothing more. It doesn't mean the graph computes what the original did — a traced control-flow path, a missing dynamic axis, an operator semantic difference, or misplaced preprocessing all produce a model that RUNS."
      },
      {
        "type": "formula",
        "front": "★ The parity check is TWO numbers",
        "back": "max|y_exp − y_ref| ≈ 6e-6 (the arithmetic is faithful) AND prediction agreement = 1.000 (the DECISIONS match). Small drift + identical decisions is the normal good outcome; a tolerance check alone would let a flipped argmax through."
      },
      {
        "type": "formula",
        "front": "The opset is a CONTRACT",
        "back": "export ok ⟺ ops(graph) ⊆ opset(v). An unsupported GELU made export REFUSE at build time. Pin the opset VERSION with the artifact — the same graph against a different opset is a different contract."
      },
      {
        "type": "intuition",
        "front": "★ Why refusal is the FEATURE",
        "back": "A silent substitution gives a model that RUNS, returns PLAUSIBLE numbers, and is subtly wrong — surfacing as an unexplained quality regression weeks later with no error to grep for. Loud cheap failure beats quiet expensive failure."
      },
      {
        "type": "intuition",
        "front": "Same principle, four places",
        "back": "Exporter refusing vs substituting · scripting refusing vs tracing baking in a path · validation rejecting a malformed tool call vs executing a guess · strict schema vs lenient coercion. Strict is more annoying up front and cheaper overall."
      },
      {
        "type": "formula",
        "front": "Quantized export, measured",
        "back": "3.6× smaller · accuracy 0.912 → 0.914 (WITHIN NOISE — the honest reading is \"no measurable change\", not \"it helped\") · logits DRIFT · decisions UNCHANGED."
      },
      {
        "type": "intuition",
        "front": "★ Why decisions survived — and why that doesn't generalize",
        "back": "argmax is a STEP FUNCTION and the drift was smaller than the top-two margin. Safe for a CLASSIFIER. For a GENERATIVE model you SAMPLE, so drift changes which tokens can appear, and errors COMPOUND over hundreds of steps."
      },
      {
        "type": "intuition",
        "front": "The check depends on the CONSUMER",
        "back": "Classifier → logit parity + argmax agreement. Regression → the tolerance IS the metric (no argmax to hide behind). Generative → perplexity, distribution divergence, long-output generation at DEPLOYED sampling params. Ranking → rank correlation, recall@k."
      },
      {
        "type": "intuition",
        "front": "Drift magnitude tells you which conversation you're having",
        "back": "~1e-6 = floating-point noise from op order, fusion or accumulation precision — expected. ~1e-2 = a real semantic difference: an operator default, a padding convention, an epsilon, or an outright substitution. Rule out substitution FIRST."
      },
      {
        "type": "pitfall",
        "front": "Four operational details that bite",
        "back": "DYNAMIC AXES (or the batch/seq size is baked in) · the PREPROCESSING boundary (decide inside-or-outside and document it, or serving sends unnormalized inputs silently) · VERSION pinning (opset, exporter, framework) · parity as a CI GATE, not a one-time check."
      },
      {
        "type": "intuition",
        "front": "When exporting is NOT worth it",
        "back": "Same framework, similar hardware, adequate native serving — the export adds a conversion step, a parity obligation, an artifact to version, and a failure class that wouldn't exist. Name the specific constraint it solves; \"portability\" isn't one unless someone requires it."
      }
    ],
    "refs": [
      {
        "title": "ONNX, Operators and Opset Versioning",
        "url": "https://onnx.ai/onnx/repo-docs/Versioning.html"
      },
      {
        "title": "Jacob et al. (2018), Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference",
        "url": "https://arxiv.org/abs/1712.05877"
      },
      {
        "title": "Krishnamoorthi (2018), Quantizing Deep Convolutional Networks for Efficient Inference: A Whitepaper",
        "url": "https://arxiv.org/abs/1806.08342"
      },
      {
        "title": "ONNX Runtime, Performance and Quantization Documentation",
        "url": "https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html"
      },
      {
        "title": "PyTorch, torch.onnx Export Documentation",
        "url": "https://pytorch.org/docs/stable/onnx.html"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "distillation",
      "batching"
    ]
  },
  "provider-apis": {
    "level": "core",
    "body": {
      "intuition": [
        "Almost nothing in this lesson is about machine learning. Retries with exponential backoff and jitter, token-bucket rate limiting, idempotency keys and streaming responses are distributed-systems client engineering that predates language models by decades. That is precisely why they are worth learning here: the provider, the model and the endpoint will all change, and a correctly built client will keep working against whatever replaces them.",
        "The measurements show how much these mechanisms are worth. Against an endpoint failing 30% of the time, a naive client succeeded 71.3% of the time end to end; with exponential backoff and jitter it reached 99.7%, against a theoretical ceiling of 99.76% set by five consecutive failures. A token bucket took a 100-call burst from 95 rejections to zero. Streaming reached first output in 0.25 seconds against 1.43 for the complete response - 5.7 times sooner - and because prefill is roughly constant while total time grows with output length, streaming wins MORE on long replies, not less.",
        "The two genuinely LLM-specific facts are worth separating from the general engineering. OUTPUT tokens dominate spend, so cost control is mostly about controlling how much the model says rather than how much you send it. And idempotency interacts with billing in a way most APIs do not: three retries of a generation are three billable generations unless the key deduplicates them, at which point they become one. Retrying is the standard fix for flakiness and it is also, without a key, a way to pay three times for one answer."
      ],
      "math": [
        {
          "h": "Retries against independent failures",
          "paras": [
            "If each attempt fails independently, end-to-end success is one minus the probability that all attempts fail.",
            "That gives both the gain and the ceiling."
          ],
          "tex": "P_{\\text{success}} = 1 - p_{\\text{fail}}^{\\,n+1}: \\quad 0.713 \\;\\xrightarrow{\\;4\\text{ retries}\\;}\\; 0.997, \\qquad \\text{ceiling } 1 - 0.3^5 = 0.9976",
          "texNote": "The measured 99.7% sits essentially at the analytic ceiling, which tells you the retry policy is extracting nearly everything available. The assumption doing the work is INDEPENDENCE - retries help against transient failures and do nothing against a provider outage, where every attempt fails together. That is why retry budgets and circuit breakers exist: past a point, retrying a systematically failing dependency adds load without adding success."
        },
        {
          "h": "The rate-limit mismatch that produces surprise 429s",
          "paras": [
            "Your token bucket and the provider's limiter may implement different models.",
            "A bucket that allows bursts can exceed a sliding-window cap even while respecting its own average rate."
          ],
          "tex": "\\text{bucket: rate } r,\\ \\text{capacity } c \\quad\\text{vs}\\quad \\text{provider: } \\le N \\text{ per window} \\;\\Rightarrow\\; \\text{burst } c + \\text{refills in-window} > N",
          "texNote": "Setting capacity to 1 removes bursting, and setting the rate below the cap - 4 against a limit of 5 - leaves a safety margin for clock skew and in-flight requests. Without that margin the measured configuration still produced 8 rejections, because a burst plus refills landing inside the same window momentarily exceeded the sliding cap. The general lesson is that a client-side limiter must be conservative relative to a server-side one whose exact model you cannot see."
        },
        {
          "h": "Streaming changes which latency you are measuring",
          "paras": [
            "Prefill is roughly constant; generation time grows with the number of output tokens.",
            "So time-to-first-token is nearly flat while total time is not."
          ],
          "tex": "T_{\\text{total}} \\approx t_{\\text{prefill}} + N\\,t_{\\text{token}} \\quad (1.43\\ \\text{s}), \\qquad \\mathrm{TTFT} \\approx t_{\\text{prefill}} \\quad (0.25\\ \\text{s}) \\;\\Rightarrow\\; 5.7\\times",
          "texNote": "Because only the total grows with N, streaming's advantage INCREASES with response length - the opposite of the intuition that it is a small constant improvement. The consequence for measurement is that in a streaming product, mean total latency describes something no user experiences; TTFT and inter-token latency are the numbers that correspond to the experience."
        }
      ],
      "code": [
        {
          "h": "The four client mechanisms, with what each measured",
          "paras": [
            "None of these are LLM-specific, which is exactly why they will outlast the API."
          ],
          "code": "# 1. RETRIES - exponential backoff WITH JITTER\n#      30%-flaky endpoint:  71.3%  ->  99.7%   (ceiling 1-0.3^5 = 99.76%)\ndelay = min(base * 2**attempt, cap) * random()   # ★ jitter, not fixed\n#    ★ RETRY ONLY TRANSIENT failures - 429, 5xx, timeouts. Retrying a\n#      400 is guaranteed waste: the request was malformed and will be\n#      malformed again.\n#    ★ JITTER beats the thundering herd: without it, every client that\n#      failed at the same moment retries at the same moment.\n#    ⚠ AND THE ASSUMPTION: retries help against INDEPENDENT failures.\n#      In a provider outage every attempt fails together, so retrying\n#      adds load without adding success -> retry budgets, circuit\n#      breakers.\n\n# 2. RATE LIMITING - token bucket, client side\n#      100-call burst:  95 rejected  ->  0 rejected\n#    ★ THE SUBTLE PART, and it cost 8 rejections before it was fixed:\n#      YOUR bucket and THEIR limiter may implement different models. A\n#      bucket with capacity>1 can burst, and burst + refills landing in\n#      the SAME window momentarily exceeds a SLIDING-WINDOW cap even\n#      though the average rate is legal.\n#      FIX: capacity = 1 (no burst) and rate BELOW the cap (4 vs 5) as\n#      a margin for clock skew and in-flight requests.\n\n# 3. STREAMING - TTFT 0.25s vs full 1.43s = 5.7x sooner\n#    ★ prefill is ~CONSTANT, total grows LINEARLY with output length,\n#      so streaming wins MORE on long replies - not a fixed small gain.\n\n# 4. IDEMPOTENCY KEY - and this one is about MONEY\n#      3 retries + key  ->  1 billable generation (replayed from cache)\n#      3 retries, no key ->  3 billable generations\n#    Retrying is the standard fix for flakiness AND a way to pay three\n#    times for one answer.",
          "caption": "Four mechanisms from ordinary distributed-systems practice — and the idempotency one is the only place where a retry policy shows up on the invoice."
        },
        {
          "h": "Cost, tails, and the virtual clock that made this testable",
          "paras": [
            "Two production facts and one methodological trick worth stealing."
          ],
          "code": "# COST: OUTPUT tokens dominate spend. So cost control is mostly about\n# controlling how much the model SAYS - max_tokens, stop sequences,\n# asking for structure rather than prose - not about trimming prompts.\n# (Prompt length is a LATENCY lever via prefill; output is the money.)\n\n# ★ LATENCY: p50 1.14s, p95 2.00s - and the BACKOFF WAITS LIVE IN THE\n#   TAIL. So the retry policy that took success from 71.3% to 99.7%\n#   also made p95 worse. That is a real trade, and it is invisible if\n#   you only report the mean:\n#     retries      -> success UP, tail latency UP\n#     more retries -> diminishing success, worsening tail\n#   Set a retry BUDGET and a deadline, not just a max attempt count.\n\n# ★ THE METHODOLOGICAL TRICK: a VIRTUAL CLOCK. Backoff logic is\n#   normally painful to test because correct code SLEEPS - so tests are\n#   slow, or you shorten the delays and test something else.\n#   With a virtual clock, time advances on demand:\nclock.advance(delay)      # no real sleeping\n#   -> the backoff arithmetic is EXACT and the suite runs instantly.\n#   Any time-dependent policy - retries, rate limits, timeouts,\n#   circuit breakers, caches - is testable this way, and most codebases\n#   never do it.\n\n# ⚠ THE WHOLE LESSON USED A MOCK PROVIDER, NO NETWORK. That is what\n#   makes the numbers reproducible and the failure rates exactly known.\n#   It measures CLIENT POLICY, not any provider's real reliability.",
          "caption": "The virtual clock makes backoff arithmetic exact and the tests instant — and it applies to any time-dependent policy, which is why most codebases test these badly."
        }
      ],
      "useCases": [
        "Any application calling a hosted model, where client-side reliability engineering determines the user-visible failure rate more than the provider's uptime does.",
        "Cost control on a deployed product, where output-token limits and idempotent retries are the two largest levers.",
        "Perceived-latency work, where streaming changes both the experience and which metric should be reported.",
        "Testing time-dependent policies - retries, rate limits, timeouts, circuit breakers - which a virtual clock makes exact and fast."
      ],
      "pitfalls": [
        "Retrying every failure. Only transient errors deserve a retry; a 400 was malformed and will be malformed again, so retrying it is guaranteed waste.",
        "Backing off without jitter. Every client that failed at the same moment retries at the same moment, which recreates the load spike that caused the failure.",
        "Assuming retries help in an outage. The gain depends on failures being independent, and in a provider outage every attempt fails together - so retry budgets and circuit breakers are what stop you adding load.",
        "Matching your rate limiter's average to the provider's cap. A burst plus refills inside the same window can exceed a sliding-window limit even at a legal average, which is why capacity of one and a rate below the cap are the safe configuration.",
        "Reporting mean latency in a streaming product. Time-to-first-token and inter-token latency correspond to the experience; the mean total describes something no user has.",
        "Retrying without an idempotency key. Three retries of a generation are three billable generations, and the key is what makes them one.",
        "Ignoring what retries do to the tail. The policy that took success from 71.3% to 99.7% also pushed backoff waits into p95, so success and tail latency trade against each other.",
        "Trimming prompts to save money. Output tokens dominate spend; prompt length is primarily a latency lever through prefill."
      ],
      "connections": [
        {
          "ref": "frontier-frameworks/vllm-inference",
          "text": "What is happening on the other side of the API - prefill versus decode, continuous batching, and why time-to-first-token and inter-token latency have different causes."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The same concerns from the server's perspective, including admission control and the capacity planning that produces the rate limits clients see."
        },
        {
          "ref": "agentic-ai/observability",
          "text": "Where these costs are measured in an agent, including the heavy-tailed spend distribution and why a per-run cap leaves the median untouched."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The general practice - percentiles over means, distributions over point estimates, and alerting on shifts rather than fixed thresholds."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Why prefill is roughly constant and generation grows with output length, which is the mechanism behind the streaming result."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What did retries buy against a 30%-flaky endpoint?",
          "a": "End-to-end success from 71.3% to 99.7%, against an analytic ceiling of 99.76% - so the policy extracted nearly everything available."
        },
        {
          "q": "What assumption does that rest on?",
          "a": "Independent failures. In a provider outage every attempt fails together, so retrying adds load without adding success."
        },
        {
          "q": "Which failures should you retry?",
          "a": "Transient ones - 429, 5xx, timeouts. A 400 was malformed and will be malformed again, so retrying it is guaranteed waste."
        },
        {
          "q": "Why jitter?",
          "a": "Without it, every client that failed at the same moment retries at the same moment - recreating the load spike that caused the failure."
        },
        {
          "q": "What did client-side rate limiting do?",
          "a": "Took a 100-call burst from 95 rejections to zero, using a token bucket."
        },
        {
          "q": "What is the subtle rate-limit failure?",
          "a": "Your bucket and their limiter may use different models - a burst plus refills inside the same window can exceed a sliding-window cap at a legal average rate."
        },
        {
          "q": "What is the safe configuration?",
          "a": "Capacity of one, so no bursting, and a rate below the cap - four against a limit of five - as margin for clock skew and in-flight requests."
        },
        {
          "q": "What did streaming measure?",
          "a": "Time to first output 0.25 seconds against 1.43 for the full response - 5.7 times sooner."
        },
        {
          "q": "Why does streaming win more on long replies?",
          "a": "Prefill is roughly constant while total time grows with output length, so TTFT stays flat while the thing it is compared against grows."
        },
        {
          "q": "What does an idempotency key do?",
          "a": "Makes three retries one billable generation instead of three, by replaying the cached response rather than generating again."
        },
        {
          "q": "What dominates cost?",
          "a": "Output tokens. Prompt length is primarily a latency lever through prefill; how much the model says is the money."
        },
        {
          "q": "What do retries do to latency?",
          "a": "Push backoff waits into the tail - p95 was 2.00 seconds against a p50 of 1.14, so success and tail latency trade against each other."
        }
      ],
      "standard": [
        {
          "q": "How would you build a production client for a hosted model API?",
          "a": "AS AN ORDINARY DISTRIBUTED-SYSTEMS CLIENT, because almost none of what makes it reliable is machine-learning specific - and that is what makes the work durable across providers and models. MECHANISM 1 - RETRIES with exponential backoff and jitter. Against an endpoint failing 30% of the time, a naive client succeeded 71.3% end to end; with retries it reached 99.7%, essentially at the analytic ceiling of one minus 0.3 to the fifth. Two rules make this correct rather than harmful. Retry only TRANSIENT failures - 429, 5xx, timeouts - because a 400 was malformed and will be malformed again, so retrying it is guaranteed waste and adds load. And use JITTER, because without it every client that failed at the same instant retries at the same instant, recreating the spike that caused the failure. MECHANISM 2 - CLIENT-SIDE RATE LIMITING with a token bucket, which took a 100-call burst from 95 rejections to zero. The subtle part cost 8 rejections before it was found: your limiter and the provider's may implement DIFFERENT MODELS. A bucket with capacity above one can burst, and a burst plus refills landing inside the same window can exceed a sliding-window cap even though the average rate is legal. The safe configuration is capacity one - no bursting - and a rate below the published cap, four against five, as margin for clock skew and requests already in flight. MECHANISM 3 - STREAMING, which reached first output in 0.25 seconds against 1.43 for the complete response. The mechanism matters: prefill is roughly constant while total time grows with output length, so streaming's advantage INCREASES with reply length rather than being a fixed small gain. It also changes which metric is meaningful - in a streaming product, mean total latency describes an experience nobody has, and TTFT plus inter-token latency are the numbers that correspond to what users feel. MECHANISM 4 - IDEMPOTENCY KEYS, which is the one place this differs from a typical API because generation is expensive. Three retries with a key is one billable generation, replayed from cache; without a key it is three. So the standard fix for flakiness is also, unguarded, a way to pay three times for one answer. THE TRADE I WOULD MAKE EXPLICIT: retries improve success and worsen the TAIL, because backoff waits land in p95 - measured at 2.00 seconds against a p50 of 1.14. So I would set a retry BUDGET and an overall DEADLINE rather than only a maximum attempt count, and report both success rate and p95 rather than choosing whichever looks better. AND THE COST LEVER that is specific to this domain: output tokens dominate spend, so max_tokens, stop sequences and asking for structured rather than prose output are the levers that matter. Trimming prompts is mostly a latency optimization through prefill, not a cost one.",
          "deepDive": {
            "q": "Your provider integration is unreliable and expensive. Walk through fixing it.",
            "a": "I WOULD SEPARATE THE FOUR FAILURE MODES FIRST, because 'unreliable and expensive' is at least four different problems with different fixes and the aggregate hides which. STEP 1 - CLASSIFY THE FAILURES from logs. What fraction are 429 rate limits, 5xx server errors, timeouts, and 4xx client errors? Each has a different response. 429s mean your client-side limiting is wrong or absent. 5xx and timeouts are transient and deserve retries. 4xx are YOUR bug and retrying them is pure waste - and a surprisingly large share of 'flaky provider' reports turn out to be a malformed request being retried repeatedly. STEP 2 - FIX RATE LIMITING, if 429s are present. A token bucket sized conservatively: capacity one to prevent bursting, rate below the published cap. The failure I would specifically look for is the subtle one - a burst plus refills landing inside the same sliding window exceeding the cap at a legal average rate, which produced 8 rejections in the measured setup before the margin was added. If you are running multiple client instances, the limit is shared and each instance needs a fraction of it, which is a common oversight when a service scales horizontally. STEP 3 - FIX RETRIES. Exponential backoff with jitter, transient errors only, with a retry BUDGET and an overall deadline. And check for the pathological case: retries without an idempotency key on a generation endpoint means you are paying for every attempt, so a flaky integration is directly inflating the bill. Adding the key turns three attempts into one billable generation. STEP 4 - ATTACK COST, which is a different investigation. Output tokens dominate spend, so I would look at the output-length distribution first. A tail of very long responses is usually the largest single cost item and it is usually unintended - a missing max_tokens, a prompt that invites rambling, or a model asked for prose where structure would do. Set max_tokens, add stop sequences, and request structured output. Then caching: if requests repeat, prompt caching on the stable prefix is a large linear saving and it requires the stable content to come FIRST in the prompt. Then model selection per request type, since routing simple calls to a smaller model is often the biggest untried saving. STEP 5 - MEASURE THE TAIL, because retries and the fixes above interact. Report p50 and p95 for latency and cost separately, and watch the retry rate as its own metric - a rising retry rate is an early warning that the provider or your request pattern has changed, and it precedes both the reliability and the cost symptoms. WHAT I WOULD BUILD SO THIS IS NOT A ONE-TIME FIX: the virtual-clock test suite. Backoff, rate limiting, timeouts and circuit breakers are all time-dependent, which normally makes them slow to test and therefore untested. With a virtual clock the arithmetic is exact and the suite runs instantly, so these policies can have real tests rather than hopeful ones - and in my experience that is the difference between a client that is correct and one that has never been exercised at its edges."
          }
        },
        {
          "q": "How do you rate-limit correctly against a limit you cannot see?",
          "a": "CONSERVATIVELY, BECAUSE YOUR MODEL OF THEIR LIMITER IS A GUESS - and the measured failure shows how a reasonable-looking configuration still gets rejected. THE MECHANISM YOU CONTROL: a token bucket. Tokens accumulate at a fixed rate up to a capacity; each request consumes one; if none are available, you wait. It is simple, it is standard, and it took a 100-call burst from 95 rejections to zero. THE MISMATCH THAT BITES. A token bucket with capacity greater than one permits BURSTS - you can spend accumulated tokens quickly. Many server-side limiters use a SLIDING WINDOW instead, counting requests over a trailing period. Those two models disagree: a burst that spends the bucket, plus refills arriving inside the same window, can put more requests in that window than the cap allows, even though your average rate is legal. That is exactly what produced 8 rejections in the measured setup before the margin was added, and it is the reason a client that 'respects the rate limit' still sees 429s. THE SAFE CONFIGURATION: capacity of one, which removes bursting entirely, and a rate BELOW the published cap - four against a limit of five. The margin covers clock skew between you and the provider, requests already in flight when you count, and any difference between your model of their limiter and its actual behaviour. Giving up a fifth of nominal throughput to eliminate rejections is usually a good trade, because a rejection costs a round trip and a retry anyway. WHAT ELSE COMPLICATES IT IN PRODUCTION. Multiple client instances share one limit, so each needs a fraction - and a service that scales horizontally silently multiplies its request rate unless the limiter is coordinated or the per-instance rate is divided. Limits are often per-model and per-key, and sometimes on tokens per minute rather than requests, in which case you must estimate token counts before sending. Limits change without notice. And headers frequently report your remaining quota, which is far better information than your own model - if the provider tells you, use that rather than inferring. THE COMPLEMENTARY MECHANISM: handle 429s gracefully anyway, with backoff that respects a Retry-After header when one is provided. Client-side limiting reduces rejections; it does not eliminate them, because your model can always be wrong. AND THE GENERAL PRINCIPLE: when you must respect a constraint enforced by a system whose internals you cannot observe, be strictly more conservative than the stated limit and treat rejections as a signal that your model is wrong rather than as noise to retry through. That applies well beyond rate limits - it is the same reasoning as leaving headroom on any capacity you do not control."
        },
        {
          "q": "What does streaming change, beyond feeling faster?",
          "a": "IT CHANGES WHICH LATENCY IS THE PRODUCT'S LATENCY, and that reframing has consequences for measurement, for architecture and for cost. THE MEASUREMENT: first output at 0.25 seconds against 1.43 for the complete response - 5.7 times sooner. THE MECHANISM, which is the part worth internalizing: prefill is roughly constant for a given prompt, while total generation time grows linearly with the number of output tokens. So time-to-first-token is nearly flat in response length while total time is not - which means streaming's advantage GROWS with reply length rather than being a fixed small improvement. A long response is exactly where streaming matters most, which is the opposite of the intuition that it is a nicety for short interactions. WHAT IT CHANGES ABOUT MEASUREMENT. In a streaming product, mean total latency describes something no user experiences - they experienced the first token quickly and then a stream. The metrics that correspond to the experience are TTFT and INTER-TOKEN latency, and they have different causes: TTFT is prefill plus queueing, inter-token latency is decode plus scheduling interference from other requests. A system can be excellent on one and unacceptable on the other, and a single latency number describes neither. I would report both at p95. WHAT IT CHANGES ABOUT ARCHITECTURE. The client must handle a partial response - rendering incrementally, handling a mid-stream error, and deciding what to do if the user navigates away. Anything that needs the COMPLETE output before acting - validating a JSON structure, running a guardrail on the finished text, executing a tool call - cannot start until the stream ends, so streaming buys nothing for those paths and adds complexity. That is a real design consideration: streaming helps where a human reads the output progressively and helps very little where a program consumes it whole. WHAT IT CHANGES ABOUT CANCELLATION, which is a cost lever people miss. With streaming you can stop generation when the user navigates away or interrupts, which stops the meter. Without it you pay for the whole response whether or not anyone reads it. In an interactive product with a meaningful abandonment rate, that is a real saving and it requires the cancellation to actually propagate. AND WHAT IT DOES NOT CHANGE: total throughput, total cost per completed response, or the underlying generation speed. It is a latency-perception and cancellation mechanism, not a performance one - so if the complaint is 'the system is slow' in the sense of total time, streaming addresses how it feels rather than what it costs, and both are legitimate targets as long as you are clear which one you are hitting."
        },
        {
          "q": "What is the virtual clock, and why does it matter?",
          "a": "IT IS A TEST-TIME REPLACEMENT FOR REAL TIME, AND IT MAKES A WHOLE CATEGORY OF LOGIC TESTABLE THAT OTHERWISE IS NOT. THE PROBLEM. Backoff, rate limiting, timeouts, circuit breakers and cache expiry are all time-dependent, and correct implementations SLEEP. So a faithful test of an exponential backoff policy with a few retries takes tens of seconds, and a full suite becomes unusably slow. The two usual responses are both bad: shorten the delays for tests, which means you are testing different code from what runs in production, or skip the tests, which is what most codebases do - leaving the exact logic that only executes during incidents completely unexercised. THE FIX: inject the clock. The policy asks a clock object for the current time and calls a sleep on it, and in tests that object advances instantly on demand. The backoff arithmetic is then EXACT - you can assert that the third retry waited precisely the intended interval - and the suite runs in milliseconds. WHAT IT LETS YOU TEST that otherwise goes untested. That the delay sequence is what you designed, including the cap. That jitter is within its intended bounds and is actually random rather than accidentally fixed. That the retry budget and the overall deadline are respected, and which one binds first. That the rate limiter's tokens refill correctly across a window boundary - which is exactly where the sliding-window mismatch lives. That a circuit breaker opens after the right number of failures and half-opens after the right interval. And that a timeout fires at the timeout rather than at a value someone changed six months ago. WHY IT MATTERS DISPROPORTIONATELY HERE. All of this logic runs only when things are going wrong, so bugs in it are discovered during incidents, which is the worst possible time. A retry policy with an off-by-one that turns four attempts into forty, a rate limiter that fails to refill across a boundary, a circuit breaker that never closes again - each is a small bug with a large blast radius and each is invisible in normal operation. THE GENERAL PRACTICE, which is worth stealing regardless of what you are building: make time an INPUT rather than an ambient fact. Anything the code reads from the environment - time, randomness, the filesystem, network - is a dependency, and injecting it is what turns untestable behaviour into testable behaviour. Randomness gets the same treatment here, since jitter is only assertable if the source is controllable. AND IT IS WHY THE MEASUREMENTS IN THIS LESSON ARE EXACT: with a mock provider and a virtual clock, the failure rate is known by construction and the backoff arithmetic is not approximated. The numbers describe CLIENT POLICY precisely rather than describing one afternoon's experience of a real endpoint, which is a much more useful thing to have measured."
        },
        {
          "q": "How would you control the cost of a provider-based product?",
          "a": "BY ATTACKING OUTPUT TOKENS FIRST, because they dominate spend - which makes most prompt-trimming efforts a latency optimization dressed as a cost one. LEVER 1 - OUTPUT LENGTH, the largest by a distance. Look at the output-length DISTRIBUTION rather than the mean; the tail is usually where the money is and it is usually unintended. Set max_tokens as a hard bound. Add stop sequences. Ask for structured output rather than prose, which is shorter and more useful downstream. And check the prompt for language that invites rambling - 'explain in detail' costs real money at volume. LEVER 2 - CACHING, which is linear in hit rate and unusually effective for this workload because prompts repeat. Prompt caching on a stable prefix requires the stable content to come FIRST - a timestamp or request id at the top of the system prompt silently destroys the hit rate, and the only symptom is a several-fold cost increase with identical behaviour. Response caching for exactly repeated requests is even cheaper where the workload allows it. LEVER 3 - MODEL ROUTING. Not every request needs the largest model. Classifying request difficulty and routing the simple majority to a smaller one is often the biggest untried saving in a mature product, and it is measurable: run both on a sample and compare quality on the routed subset rather than overall. LEVER 4 - IDEMPOTENCY, which is a correctness fix with a billing consequence. Retries without a key mean paying for every attempt, so an unreliable integration inflates the bill in proportion to its flakiness - three retries become three generations. With a key they become one. LEVER 5 - CANCELLATION, if streaming. Stopping generation when a user abandons stops the meter, and in an interactive product with real abandonment that is a genuine saving. It requires the cancellation to propagate, which is easy to omit. WHAT I WOULD MEASURE to drive all of this: cost per request at p50 and p95, because the distribution is heavy-tailed and the mean is set by the tail; cost broken down by request type, which usually reveals one category consuming most of the budget; cache hit rate, monitored so a prompt change cannot silently destroy it; and the output-length distribution. AND THE ONE I WOULD SET AS A GUARDRAIL rather than an optimization: a per-request and per-user cost cap. As the agent observability lesson measured, cost distributions are heavy-tailed enough that a cap removes the runaway tail while leaving the median run untouched - so it bounds exposure without degrading the typical request. That is the difference between a cost you can state and one that depends on a behaviour you do not control."
        },
        {
          "q": "How does this lesson fit the module?",
          "a": "IT IS THE MOST EXPLICIT CASE OF THE MODULE'S THESIS: almost none of this is about machine learning, and that is exactly why it lasts. Exponential backoff with jitter, token-bucket rate limiting, idempotency keys and streaming are distributed-systems client engineering with decades of history. The provider will change, the model will change, the endpoint and the SDK will change - and a client built on these mechanisms keeps working, because the mechanisms are answers to properties of networks rather than properties of language models. WHAT IS ACTUALLY LLM-SPECIFIC, and it is worth isolating because it is small: OUTPUT tokens dominate cost, which inverts the usual instinct to trim inputs; and idempotency interacts with BILLING, because a generation is expensive enough that paying three times for a retried request is a real line item rather than a rounding error. Everything else transfers from any API client you have written. THE MEASUREMENTS give the mechanisms weight rather than leaving them as advice: 71.3% to 99.7% from retries, 95 rejections to zero from a token bucket, 5.7 times sooner from streaming. And each comes with its condition - retries assume INDEPENDENT failures and do nothing in an outage; the rate limiter needs a MARGIN because your model of the provider's limiter is a guess; streaming's gain GROWS with output length rather than being fixed. THE TRADE-OFF THAT GETS HIDDEN is worth carrying: the retry policy that took success to 99.7% also pushed backoff waits into p95. Success and tail latency trade against each other, and reporting only the one that improved is the flattering version. That is the same habit this module applied to compile-time benchmarks and to quantization accuracy - report the number that could embarrass the technique. AND THE METHODOLOGICAL CONTRIBUTION, which I would rank alongside the content: the virtual clock. Time-dependent policies are normally untested because faithful tests are slow, so the logic that runs only during incidents is the least exercised code in the system. Injecting the clock makes the arithmetic exact and the suite instant. It is a small technique, it applies to anything with a timeout or a delay, and most codebases never do it - which makes it a good example of the kind of durable, transferable practice this module is trying to leave behind."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Almost none of this is ML",
        "back": "Backoff+jitter, token buckets, idempotency keys, streaming — distributed-systems client engineering predating LLMs by decades. The provider, model and SDK will change; a client built on these keeps working. THAT is why it's here."
      },
      {
        "type": "formula",
        "front": "Retries against a 30%-flaky endpoint",
        "back": "P = 1 − p_fail^(n+1): **71.3% → 99.7%**, ceiling 1 − 0.3⁵ = 99.76% — so the policy extracted nearly everything available. Assumption doing the work: INDEPENDENT failures."
      },
      {
        "type": "pitfall",
        "front": "Retries do nothing in an OUTAGE",
        "back": "Every attempt fails together, so retrying adds load without adding success — hence retry BUDGETS and circuit breakers. And retry only TRANSIENT errors: a 400 was malformed and will be malformed again."
      },
      {
        "type": "intuition",
        "front": "Why jitter",
        "back": "Without it, every client that failed at the same instant retries at the same instant — recreating the load spike that caused the failure. delay = min(base·2^n, cap) × random()."
      },
      {
        "type": "formula",
        "front": "★ The subtle 429 source",
        "back": "YOUR token bucket and THEIR limiter may use different models. A burst (capacity>1) plus refills landing in the SAME window exceeds a SLIDING-WINDOW cap even at a legal average rate. Cost 8 rejections before the margin was added."
      },
      {
        "type": "intuition",
        "front": "The safe rate-limit configuration",
        "back": "capacity = 1 (no bursting) and rate BELOW the cap (4 vs 5) as margin for clock skew and in-flight requests. Also: multiple instances SHARE the limit, and if headers report remaining quota, trust that over your own model."
      },
      {
        "type": "formula",
        "front": "★ Streaming wins MORE on long replies",
        "back": "T_total ≈ t_prefill + N·t_token (1.43 s) but TTFT ≈ t_prefill (0.25 s) = 5.7×. Prefill is ~constant, total grows with N — so the advantage GROWS with response length, not a fixed small gain."
      },
      {
        "type": "intuition",
        "front": "Streaming changes which metric is real",
        "back": "Mean total latency describes an experience nobody has. Report TTFT (prefill + queueing) and INTER-TOKEN latency (decode + interference) separately at p95 — different causes, different fixes."
      },
      {
        "type": "pitfall",
        "front": "Retries show up on the INVOICE",
        "back": "3 retries without an idempotency key = 3 billable generations. With a key = 1, replayed from cache. The standard fix for flakiness is also, unguarded, a way to pay three times for one answer."
      },
      {
        "type": "pitfall",
        "front": "★ Retries worsen the TAIL",
        "back": "The policy that took success 71.3% → 99.7% pushed backoff waits into p95 (2.00 s vs p50 1.14 s). Success and tail latency TRADE. Set a retry budget AND a deadline — and report both numbers, not the flattering one."
      },
      {
        "type": "intuition",
        "front": "OUTPUT tokens dominate cost",
        "back": "So cost control is about how much the model SAYS — max_tokens, stop sequences, structured output — not about trimming prompts. Prompt length is primarily a LATENCY lever via prefill."
      },
      {
        "type": "intuition",
        "front": "★ The virtual clock",
        "back": "Correct backoff code SLEEPS, so faithful tests are slow — and this logic runs ONLY during incidents, making it the least-exercised code you own. Inject the clock: arithmetic exact, suite instant. Applies to retries, rate limits, timeouts, breakers, caches."
      }
    ],
    "refs": [
      {
        "title": "AWS Architecture Blog, Exponential Backoff and Jitter",
        "url": "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/"
      },
      {
        "title": "Google SRE Book, Handling Overload",
        "url": "https://sre.google/sre-book/handling-overload/"
      },
      {
        "title": "Stripe API, Idempotent Requests",
        "url": "https://docs.stripe.com/api/idempotent_requests"
      },
      {
        "title": "Anthropic, API Rate Limits",
        "url": "https://docs.anthropic.com/en/api/rate-limits"
      },
      {
        "title": "Dean & Barroso (2013), The Tail at Scale",
        "url": "https://research.google/pubs/pub40801/"
      }
    ],
    "demos": [
      "batching",
      "kv-cache",
      "decoding",
      "tokenizer"
    ]
  },
  "finetuning-stacks": {
    "level": "advanced",
    "body": {
      "intuition": [
        "LoRA's claim is that the update a fine-tuning task needs has low intrinsic rank, so you can represent it with two thin matrices instead of a full one. That is an empirical claim about tasks, and the usual evidence for it is a table of benchmark scores - which cannot separate 'the update really is low rank' from 'the benchmark could not tell the difference'. The way to settle it is to construct a task whose update is EXACTLY rank two by design, and then sweep the adapter rank against a known answer.",
        "That sweep produces the cleanest result in the module. At rank one, the mean squared error was 0.96 - the adapter LITERALLY CANNOT represent a rank-two update, so this is a representational limit rather than an optimization failure and no amount of training fixes it. At rank two it snapped to 0.0000, matching full fine-tuning exactly, at 12% of the parameters. At ranks four, eight and sixteen it plateaued. So the rule the elbow encodes is: pay until you reach the task's intrinsic rank, then stop - extra rank buys nothing.",
        "The other thing worth correcting is where the memory saving comes from. It is not primarily that the adapter is small. It is that the base weights are a FROZEN BUFFER - no gradient, and crucially no optimizer state, which for Adam is twice the parameter count in floats. Freezing removes the largest allocation in a training step, and the adapter's own size is almost incidental by comparison. QLoRA then goes further and stores that frozen base in four bits, 7.9 times smaller, with the adapters trained on top absorbing most of the quantization damage."
      ],
      "math": [
        {
          "h": "Rank is a hard representational limit",
          "paras": [
            "A product of a d-by-r and an r-by-d matrix has rank at most r, so an update of higher rank is unreachable.",
            "That is a fact about matrices, not about training."
          ],
          "tex": "\\Delta W = BA, \\;\\; B \\in \\mathbb{R}^{d\\times r}, A \\in \\mathbb{R}^{r\\times d} \\;\\Rightarrow\\; \\mathrm{rank}(\\Delta W) \\le r, \\qquad r{=}1 \\text{ on a rank-2 task}: \\text{MSE } 0.96",
          "texNote": "The r equals one failure is therefore not a tuning problem - the target is outside the representable set and the best achievable error is bounded below by the discarded singular value, which is the Eckart-Young statement. That distinction matters diagnostically: an underfitting adapter that will not improve with more steps or a better learning rate is telling you the rank is too low, and no other symptom looks quite like it."
        },
        {
          "h": "The elbow - pay until the task's rank, then stop",
          "paras": [
            "Once r reaches the intrinsic rank, the adapter can represent the update exactly and further rank adds nothing.",
            "Measured against a task constructed to be rank two, the elbow is sharp."
          ],
          "tex": "r=1:\\;0.96 \\quad\\Longrightarrow\\quad r=2:\\;\\mathbf{0.0000} \\;(\\text{= full FT}) \\quad\\Longrightarrow\\quad r=4,8,16:\\;\\text{plateau}",
          "texNote": "The snap to exactly full-fine-tuning quality at r equal to the true rank, at 12% of the parameters, is what LoRA's thesis predicts and it is rarely shown this cleanly because real tasks have no known intrinsic rank. The practical consequence is that rank is a parameter to SWEEP rather than to default: too low is a hard ceiling, too high is wasted parameters and no gain."
        },
        {
          "h": "Where the memory actually goes",
          "paras": [
            "Trainable parameter count is the visible saving; optimizer state is the large one.",
            "And the ratio looks unimpressive at toy widths and shrinks fast at real ones."
          ],
          "tex": "\\frac{2rd}{d^2} = \\frac{2r}{d}: \\;\\; \\frac{2\\cdot4}{32} = 25\\% \\;\\;(\\text{toy}) \\quad\\text{vs}\\quad \\frac{2\\cdot8}{4096} = 0.4\\% \\;\\;(\\text{real width})",
          "texNote": "The toy at 32 by 32 UNDERSTATES the benefit badly, and saying so matters - the ratio is linear in r and inverse in d, so it collapses as models get wide. But the dominant saving is elsewhere: a frozen base carries no gradient and no optimizer state, and Adam's state alone is twice the parameter count in floats. Removing that is the reason LoRA fits on hardware full fine-tuning does not."
        }
      ],
      "code": [
        {
          "h": "What LoRA actually does, and why B is zero-initialized",
          "paras": [
            "Two structural decisions carry almost all of the benefit."
          ],
          "code": "class LoRALinear(nn.Module):\n    def __init__(self, d, r):\n        self.register_buffer(\"W\", pretrained)   # ★ BUFFER, not Parameter:\n                                                #   no grad, and no\n                                                #   OPTIMIZER STATE\n        self.A = nn.Parameter(randn(r, d) * 0.01)\n        self.B = nn.Parameter(zeros(d, r))      # ★ ZERO init\n\n    def forward(self, x):\n        return x @ self.W.T + (x @ self.A.T) @ self.B.T\n\n# ★ WHY B IS ZERO: BA = 0 at step 0, so the adapter is an exact NO-OP\n#   and training starts from the PRETRAINED function. Not a detail -\n#   it is what makes attaching an adapter safe rather than a\n#   perturbation you have to recover from.\n\n# ★ WHERE THE MEMORY SAVING REALLY COMES FROM - not the adapter size:\n#   full FT:  weights + GRADIENTS + OPTIMIZER STATE (Adam = 2x params)\n#   LoRA:     weights (frozen buffer) + tiny adapter grads + tiny state\n#   Freezing removes the LARGEST allocation in a training step. The\n#   adapter being small is almost incidental next to that.\n\n# THE PARAMETER RATIO, and an honest note about the toy:\n#   2rd/d^2 = 2r/d\n#     32x32, r=4    -> 25%     <- the toy UNDERSTATES it badly\n#     4096, r=8     -> 0.4%    <- real widths\n#   Linear in r, inverse in d - so it collapses as models get wide.\n\n# AND THE SERVING PROPERTY that drove adoption as much as the memory:\n#   the adapter is an ADDITIVE side path, so it can be MERGED into W\n#   for zero-overhead inference, or kept separate so one base serves\n#   many tasks with per-request adapters.",
          "caption": "The frozen buffer removes gradients and optimizer state — the largest allocation in a training step — which is the saving, not the adapter's size."
        },
        {
          "h": "★ The rank sweep on a task with a KNOWN answer",
          "paras": [
            "Constructing the task to be exactly rank two is what makes the elbow verifiable rather than folklore."
          ],
          "code": "# THE SETUP: a regression task whose true update is EXACTLY RANK 2 by\n# construction. So the right answer is known, and the sweep is graded\n# rather than interpreted.\n#\n#   r = 1   MSE 0.96      ★ CANNOT represent a rank-2 update.\n#                           rank(BA) <= r is a MATRIX fact, so this is\n#                           a REPRESENTATIONAL limit - more steps, a\n#                           better LR, more data: none of it helps.\n#   r = 2   MSE 0.0000    ★ SNAPS to full-fine-tuning quality, at 12%\n#                           of the parameters.\n#   r = 4   plateau\n#   r = 8   plateau\n#   r = 16  plateau       -> extra rank buys NOTHING\n#\n# ★ THE ELBOW RULE: pay until you reach the task's intrinsic rank,\n#   then stop.\n#\n# ⚠ AND THE HONEST LIMIT: you do NOT know a real task's intrinsic rank.\n#   So rank is a parameter to SWEEP, not to default - and the two\n#   failure directions look completely different:\n#     too LOW  -> a hard ceiling that more training cannot move\n#                 (the diagnostic: loss plateaus far from full-FT and\n#                  is insensitive to LR and steps)\n#     too HIGH -> wasted parameters, no gain, slightly more overfitting\n\n# QLoRA - the frozen base stored in int4:\n#   base size            7.9x smaller\n#   base alone, int4     MSE 2.11    <- the quantization damage\n#   QLoRA (adapters on top of it)    MSE 0.024\n#   fp32 LoRA                        MSE 0.000\n# ★ The fp adapters, trained ON TOP of the quantized base, ABSORB most\n#   of the quantization error - 2.11 down to 0.024. Not free (0.024 vs\n#   0.000), and it recovers ~99% of the damage for a 7.9x smaller base.",
          "caption": "A task built to be exactly rank two turns LoRA's central claim into a graded measurement — and the r=1 failure is a matrix fact, not a training problem."
        }
      ],
      "useCases": [
        "Fine-tuning a model that will not fit in memory under full fine-tuning, where freezing the base removes gradients and optimizer state rather than merely shrinking the trainable set.",
        "Serving many task-specific variants from one base model, which the additive side-path structure makes possible without duplicating weights.",
        "Choosing an adapter rank, which the elbow makes a sweep with a clear stopping rule rather than a guess.",
        "Diagnosing an adapter that underfits, where insensitivity to learning rate and step count points at a representational ceiling rather than an optimization problem."
      ],
      "pitfalls": [
        "Treating a rank-too-low failure as a tuning problem. The product of a d-by-r and r-by-d matrix has rank at most r, so a higher-rank update is outside the representable set and no training fixes it.",
        "Defaulting the rank instead of sweeping it. Too low is a hard ceiling and too high is wasted parameters, and the intrinsic rank of a real task is unknown.",
        "Believing the adapter's small size is the memory saving. The dominant saving is that a frozen base carries no gradients and no optimizer state, and Adam's state alone is twice the parameter count.",
        "Reading the toy parameter ratio as representative. Twenty-five percent at 32 by 32 understates it badly - the ratio is 2r over d, so it collapses to well under one percent at real widths.",
        "Initializing B randomly. Zero initialization makes the adapter an exact no-op at step zero so training starts from the pretrained function rather than from a perturbation.",
        "Assuming QLoRA is free. The adapters absorbed most of the quantization damage - 2.11 down to 0.024 - but full-precision LoRA reached 0.000, so there is a real if small cost.",
        "Comparing quality without stating the base precision. A QLoRA result and an fp16 LoRA result are different experiments, and the difference is the quantization the adapters had to absorb."
      ],
      "connections": [
        {
          "ref": "fine-tuning/lora",
          "text": "The full treatment, including the argument that LoRA won on serving structure rather than accuracy, and why PEFT accuracy is a saturated axis."
        },
        {
          "ref": "fine-tuning/qlora",
          "text": "The quantized-base variant in depth - NF4, double quantization and paged optimizers - and what each contributes to the memory budget."
        },
        {
          "ref": "frontier-frameworks/open-weight-models",
          "text": "Where the int4 base sits in the memory arithmetic, and why quantization is a capability decision rather than only a cost one."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "The other way to make optimizer state affordable - sharding it rather than eliminating it - and why Adam being elementwise is what permits that."
        },
        {
          "ref": "ml-theory/learning-theory",
          "text": "The intrinsic-dimension framing behind the low-rank claim: why a task can require far fewer effective parameters than the model has."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why can't a rank-1 adapter fit a rank-2 update?",
          "a": "The product of a d-by-r and an r-by-d matrix has rank at most r. It is a matrix fact, so more steps or a better learning rate cannot help."
        },
        {
          "q": "What did the sweep measure?",
          "a": "On a task built to be exactly rank two: r equals 1 gave MSE 0.96, r equals 2 gave 0.0000 matching full fine-tuning, and 4, 8 and 16 plateaued."
        },
        {
          "q": "What rule does the elbow encode?",
          "a": "Pay until you reach the task's intrinsic rank, then stop - extra rank buys nothing."
        },
        {
          "q": "Why is that hard to apply directly?",
          "a": "You do not know a real task's intrinsic rank, so rank is a parameter to sweep rather than to default."
        },
        {
          "q": "How do the two rank failures look different?",
          "a": "Too low is a hard ceiling insensitive to learning rate and steps; too high is wasted parameters with no gain."
        },
        {
          "q": "Where does the memory saving actually come from?",
          "a": "The frozen base is a buffer with no gradient and no optimizer state - and Adam's state alone is twice the parameter count in floats."
        },
        {
          "q": "So the adapter's size is not the point?",
          "a": "Largely not. Removing gradients and optimizer state is the dominant saving; the adapter being small is almost incidental next to that."
        },
        {
          "q": "Why is B initialized to zero?",
          "a": "So the product BA is zero at step zero and the adapter is an exact no-op - training starts from the pretrained function rather than a perturbation."
        },
        {
          "q": "What is the parameter ratio?",
          "a": "2r over d. At 32 by 32 with r equals 4 that is 25%, which understates it - at width 4096 with r equals 8 it is about 0.4%."
        },
        {
          "q": "What did QLoRA measure?",
          "a": "An int4 base 7.9 times smaller, with the base alone at MSE 2.11 and QLoRA at 0.024 - the adapters absorbed most of the quantization damage."
        },
        {
          "q": "Is QLoRA free then?",
          "a": "No. Full-precision LoRA reached 0.000 against QLoRA's 0.024, so there is a real if small cost for a 7.9 times smaller base."
        },
        {
          "q": "What serving property drove adoption?",
          "a": "The adapter is an additive side path, so it can be merged for zero-overhead inference or kept separate so one base serves many tasks."
        }
      ],
      "standard": [
        {
          "q": "How would you choose the LoRA rank?",
          "a": "BY SWEEPING IT, AND THE ELBOW TELLS YOU WHEN TO STOP - which is a much sharper rule than the usual advice to try 8 or 16. THE MEASUREMENT THAT ESTABLISHES THE RULE. On a task constructed so the true update is EXACTLY rank two, rank one gave MSE 0.96, rank two gave 0.0000 - snapping to full fine-tuning quality at 12% of the parameters - and ranks four, eight and sixteen plateaued. Constructing the task with a known intrinsic rank is what makes this a graded measurement rather than an interpretation of benchmark scores, which is how the claim is usually supported and which cannot distinguish 'the update is low rank' from 'the benchmark could not tell'. WHY RANK ONE FAILED, and it matters diagnostically: the product of a d-by-r and an r-by-d matrix has rank at most r, so a rank-two target is outside the representable set. That is a REPRESENTATIONAL limit, not an optimization one - more steps, a better learning rate, more data, none of them move it. The best achievable error is bounded below by the singular value you cannot represent. THE PRACTICAL RULE: pay until you reach the task's intrinsic rank, then stop. Extra rank buys nothing but parameters. THE HONEST DIFFICULTY: you do not know a real task's intrinsic rank. So the rule becomes a procedure rather than a number - sweep the rank and look for where the validation metric stops improving. The good news is that the two failure directions have DIFFERENT SIGNATURES, so the sweep is interpretable. Too low shows as a hard ceiling: the loss plateaus well short of full fine-tuning and is insensitive to learning rate and step count, which is unusual and distinctive. Too high shows as no further gain, more parameters, and slightly more overfitting risk on small data. HOW I WOULD RUN IT: a geometric sweep - 2, 4, 8, 16, 32 - on a validation set, comparing against a full fine-tuning reference if it fits, because the reference tells you whether the plateau you found is the task's ceiling or the adapter's. That reference is the part people skip, and without it a plateau is ambiguous. WHAT ELSE INTERACTS WITH RANK. The alpha scaling, which interacts with the effective learning rate, so changing rank without adjusting it changes two things at once. And WHICH modules get adapters - attention projections only, or the feed-forward layers too - which is often a larger decision than the rank itself, and worth sweeping first because the FFN holds roughly two thirds of a transformer block's parameters. AND THE FRAMING I would keep: rank is a capacity dial with a hard floor and a flat ceiling. That shape is unusual - most hyperparameters degrade gracefully in both directions - and it is why the sweep is cheap and the default is risky.",
          "deepDive": {
            "q": "Explain where LoRA's memory saving actually comes from.",
            "a": "NOT PRIMARILY FROM THE ADAPTER BEING SMALL, which is the usual explanation and the less important half. THE FULL FINE-TUNING BUDGET, per parameter, in a mixed-precision setup: the weight itself, a gradient, and optimizer state - which for Adam is two moment estimates, so twice the parameter count in floats. Plus a master copy of the weights in fp32 if you are doing mixed precision properly. The optimizer state and the master weights dominate: of roughly 16 bytes per parameter, about 12 are optimizer-related. THE LoRA BUDGET: the base weights are a frozen BUFFER - registered as a buffer rather than a Parameter, so autograd does not track them, no gradient is allocated for them, and the optimizer never sees them. So the 12 bytes per parameter of optimizer state disappear for the base, which is essentially all of the model. What remains is the base weights themselves, plus gradients and optimizer state for the adapter, which is 2rd parameters against d squared. SO THE DOMINANT TERM REMOVED IS OPTIMIZER STATE, not parameters. That is why LoRA fits on hardware where full fine-tuning does not by a much larger factor than the trainable-parameter ratio suggests - the trainable ratio is what people quote, and the memory ratio is better than it. WHAT ELSE CONTRIBUTES. Activations for the backward pass still have to be stored, and they scale with batch and sequence rather than with parameters - so LoRA does not remove them, which is why gradient checkpointing remains relevant and why very long sequences are still expensive. This is a common surprise: someone expects LoRA to make memory a non-issue and finds activations binding. QLoRA GOES FURTHER by storing the frozen base in four bits - 7.9 times smaller in the measurement - which attacks the one term LoRA left alone. The adapters are trained in full precision on top of that quantized base, and the measured result is the interesting part: the base alone had MSE 2.11 from quantization damage, and QLoRA reached 0.024. The adapters ABSORBED most of the error, because they are trained against the quantized base and learn to compensate for it. Not free - fp32 LoRA reached 0.000 - but recovering roughly 99% of the damage for a base nearly eight times smaller. THE COMPARISON WORTH DRAWING is with FSDP and ZeRO, which attack the same term differently: rather than eliminating optimizer state by freezing, they SHARD it across devices, which works because Adam is elementwise so each shard can be updated independently. Same observation about where the memory is - the frozen-base approach removes it and the sharding approach distributes it, and they compose. AND THE DIAGNOSTIC I would take from this: when someone says a method saves memory, ask WHICH term. Parameters, gradients, optimizer state and activations are four different budgets with different scaling, and a method that addresses one may leave you bound by another - which is exactly what happens when LoRA users discover activations."
          }
        },
        {
          "q": "Why does QLoRA work at all, given the base is damaged?",
          "a": "BECAUSE THE ADAPTERS ARE TRAINED ON TOP OF THE DAMAGED BASE AND LEARN TO COMPENSATE FOR IT - which is a genuinely non-obvious mechanism and the measurement makes it concrete. THE NUMBERS. Storing the frozen base in int4 made it 7.9 times smaller. The quantized base ALONE, evaluated without adaptation, had MSE 2.11 - that is the quantization damage, and it is large. Training full-precision LoRA adapters on top of that quantized base gave 0.024. Full-precision LoRA on an undamaged base gave 0.000. So the adapters recovered roughly 99% of the damage. WHY THAT HAPPENS. The adapters are not trained against the original model and then bolted onto a quantized one - they are trained with the quantized base in the forward pass. So the optimization sees the quantization error as part of the function it is adapting, and the low-rank update it learns includes whatever correction reduces the loss. The quantization error is not adversarial; it is a fixed, structured perturbation, and a trainable component in the same computation can partially cancel it. THE HONEST READING, which I would give rather than the enthusiastic one: it is NOT free. 0.024 against 0.000 is a real gap, small in this setting and not guaranteed to be small in another. What QLoRA buys is that a model which would not fit at all becomes trainable, and the quality cost is a fraction of the quantization damage rather than the whole of it. That is a much better trade than 'quantize and hope', and it is a worse trade than full precision. WHAT DECIDES WHETHER IT IS ACCEPTABLE. The same question as any quantization decision: what consumes the output. For a classifier where the argmax is what ships, a small logit drift is invisible. For a generative model where you sample and errors compound, the same drift is not, and the check has to be perplexity and long-output generation rather than accuracy - the blind spot from 17-06. So a QLoRA result on a classification benchmark does not license the same confidence for a generation task. WHAT ELSE IS IN REAL QLoRA beyond int4 storage, since the measurement isolated one part: a data type chosen for the weight distribution rather than a uniform integer grid, double quantization of the quantization constants themselves, and paged optimizer state to survive memory spikes. Each addresses a specific term, and the memory arithmetic from 22-03 is how you would evaluate whether each is worth its complexity. AND THE COMPARISON THAT MATTERS FOR A DECISION: QLoRA against LoRA on a smaller model at full precision, under the same memory budget. That is the frontier question again - a bigger model quantized harder versus a smaller one intact - and it is measurable rather than a matter of taste."
        },
        {
          "q": "What makes this measurement more convincing than a benchmark table?",
          "a": "THE TASK HAS A KNOWN ANSWER BY CONSTRUCTION, so the sweep is graded rather than interpreted. That is the methodological point and it generalizes well past LoRA. THE PROBLEM WITH THE USUAL EVIDENCE. LoRA's claim is that fine-tuning updates have low intrinsic rank. The standard support is a table showing that rank 8 or 16 matches full fine-tuning on a set of benchmarks. That is consistent with the claim and it is also consistent with something else entirely: that the benchmarks could not distinguish the two. PEFT accuracy is a saturated axis - even very small adapters are competitive on standard suites - so a table of near-identical scores has low power to separate hypotheses. You cannot tell 'the update was low rank' from 'the metric was insensitive'. WHAT THE CONSTRUCTED TASK DOES. Build a regression problem whose true update is exactly rank two. Now the right answer is known, the error is continuous and unbounded rather than a saturating accuracy, and each rank's result is a graded measurement against ground truth. Rank one gives 0.96 - and you know exactly why, because rank(BA) is at most r and the target is not in that set. Rank two gives 0.0000 - it recovers the update exactly. Four, eight and sixteen plateau - no further gain because there is nothing left to represent. The prediction and the observation match precisely, which is what makes it evidence rather than illustration. WHY THE FAILURE DIRECTION MATTERS. The r equals one result is the informative one, because it shows the mechanism failing in the predicted WAY. A theory that only ever succeeds is weakly supported; one that fails exactly where it says it will is much better supported. And the failure is diagnostically distinctive - insensitive to learning rate and step count, because it is representational - which gives a practitioner something to recognize in the wild. THE LIMIT, stated so the result is not over-read: this is a toy. The parameter ratio at 32 by 32 understates the real benefit badly, real tasks have no known intrinsic rank, and the interaction with pretrained representations is not modelled at all. What the toy establishes is the MECHANISM and the SHAPE of the rank-quality curve - a hard floor, a sharp elbow, a flat plateau - and that shape is what tells you how to sweep. AND THE GENERAL PRACTICE worth taking: when a claim is about a mechanism, construct a case where the mechanism's prediction is checkable, rather than reaching for a benchmark that averages over cases where you cannot tell. That is the same move as the deterministic agent environments in module 21 and the simulated allocator in 22-04, and it is what makes those results reproducible by anyone with an afternoon."
        },
        {
          "q": "When would you not use LoRA?",
          "a": "WHEN THE UPDATE YOU NEED IS NOT LOW RANK, OR WHEN THE CONSTRAINT IT SOLVES IS NOT YOUR CONSTRAINT. WHERE IT IS THE WRONG TOOL. Large distribution shifts - adapting a model to a domain or a language genuinely unlike its pretraining - where the required change is not a small correction to the existing function. The rank sweep gives the diagnostic: if quality keeps improving as rank rises well past typical values, you are being told the update is not low rank, and at that point full fine-tuning is the honest answer. Continued PRETRAINING on a large corpus, where you are not adapting a behaviour but adding knowledge, which is not what a low-rank correction is shaped for. And any case where the plateau you reach is well short of a full fine-tuning reference - which is why running that reference matters when it fits. WHERE THE CONSTRAINT IS DIFFERENT. If memory is not binding, LoRA's main benefit is unnecessary and full fine-tuning is simpler with one less hyperparameter family. If you are serving a single task, the multi-adapter serving advantage does not apply, and you would merge the adapter anyway. And if ACTIVATIONS are what is binding rather than optimizer state, LoRA does not help - activations scale with batch and sequence, not with trainable parameters, and this is a common surprise for people who expected LoRA to make memory a non-issue. Gradient checkpointing is the lever there. WHERE SOMETHING ELSE IS BETTER. If the task is really about output FORMAT or a narrow behaviour, prompting or constrained decoding may get there with no training at all - and that comparison should be run first because it is nearly free. If you need many tasks and they are small, prompt tuning or a shared adapter may be more efficient. If you have very little data, full fine-tuning risks overfitting and a LOW rank is actually an advantage as a regularizer, which is an argument FOR LoRA that gets missed. WHAT I WOULD CHECK BEFORE COMMITTING: run the rank sweep with a full fine-tuning reference on a subset, and look at the shape. A sharp elbow well below the maximum rank says LoRA is appropriate and tells you where to set it. A curve still climbing at high rank says the update is not low rank and you should reconsider. That is a few hours and it converts a default into a decision. AND THE POINT THIS MODULE WOULD ADD: the specific stack - which library, which flags, which quantization data type - will turn over. The mechanism will not. The update is either low rank or it is not, the frozen base either removes your binding memory term or it does not, and the rank sweep answers both. Those questions survive the tooling."
        },
        {
          "q": "How does adapter design affect serving?",
          "a": "IT IS ARGUABLY WHY LoRA WON, and the property is structural rather than about quality. THE STRUCTURE: the adapter is an ADDITIVE side path. The forward pass is x times W plus x times A times B, and because addition is associative you have two options that other parameter-efficient methods do not. OPTION 1 - MERGE. Compute W plus BA once and store it as a single matrix. The served model is then indistinguishable from a fully fine-tuned one, with zero inference overhead, no extra kernels and no changes to the serving path. That means adopting LoRA costs nothing at serving time if you serve one task, which removes the usual objection to parameter-efficient methods. OPTION 2 - KEEP SEPARATE. One base model in memory, many small adapters, and the adapter selected per request. That is the property that makes multi-tenant serving economical: a hundred customer-specific variants become one base plus a hundred small matrices instead of a hundred full models. Batching requests with DIFFERENT adapters in the same batch is more involved and is exactly what specialized serving support exists to do. WHY THIS BEATS THE ALTERNATIVES STRUCTURALLY. Prompt tuning prepends learned vectors, which occupies context on every request - a permanent tax on the sequence length, paid forever, and it cannot be merged away. Adapter layers inserted between blocks add sequential depth, which adds latency that cannot be merged either. LoRA's additive form is the only one of the three that can collapse into the base weights, and that is a consequence of where it sits in the computation rather than of anything about its quality. WHAT IT COSTS. Unmerged, you pay an extra small matrix multiplication per adapted layer - modest but not free, and it interacts with kernel fusion since the side path is an extra operation the compiler must handle. Merged, you lose the ability to switch tasks without recomputing, and you can no longer serve multiple adapters from one copy. So the choice is per-deployment: merge for a single-task high-throughput service, keep separate for multi-tenant. THE MEMORY ARITHMETIC AT SERVING, which follows the pattern from 22-03: an adapter at rank 8 on width 4096 is 2rd equals 65k parameters per adapted matrix, which is negligible against the base. So the number of adapters you can hold is effectively unlimited relative to the base, and the binding constraint is the base plus the KV cache as usual. AND THE POINT FOR THIS MODULE: this is a case where the DEPLOYMENT structure, not the training benefit, explains adoption. A method that trains efficiently and serves awkwardly loses to one that does both, and recognizing that shape - asking what a method implies for serving, not just for training - is a durable habit worth more than the specific method."
        },
        {
          "q": "How does this lesson relate to the module's thesis?",
          "a": "IT SEPARATES A MECHANISM WITH A LONG HALF-LIFE FROM A STACK WITH A SHORT ONE. The fine-tuning tooling in this area turns over fast - libraries, flags, quantization data types, and a steady stream of variants each claiming an improvement. What does not turn over is the mechanism: an update is either representable in low rank or it is not, freezing a base removes gradients and optimizer state, and a fixed perturbation in the forward pass can be partially absorbed by a trainable component trained against it. Those three facts explain LoRA, QLoRA and most of what will replace them. THE MEASUREMENT DISCIPLINE is the other contribution, and I think it is the more transferable one. LoRA's central claim is usually supported by benchmark tables that CANNOT distinguish 'the update is low rank' from 'the benchmark is insensitive' - because PEFT accuracy is a saturated axis where even tiny adapters look competitive. Constructing a task whose update is exactly rank two turns the claim into something graded: rank one fails at 0.96 for a reason you can state from linear algebra, rank two snaps to 0.0000, higher ranks plateau. The theory predicts the failure and the failure occurs where predicted, which is much stronger evidence than a table of similar scores. THE HONEST CAVEATS carry the module's habit. The toy's 25% parameter ratio UNDERSTATES the real benefit, because the ratio is 2r over d and collapses at real widths - saying so matters, since a reader could otherwise conclude LoRA is less impressive than it is. QLoRA is NOT free: 0.024 against full-precision LoRA's 0.000, recovering about 99% of a large quantization damage rather than all of it. And you do not know a real task's intrinsic rank, so the elbow is a procedure rather than a number. AND THE STRUCTURAL OBSERVATION worth carrying furthest: LoRA's additive form is what lets it merge for zero-overhead serving or stay separate for multi-tenant serving, and that deployment property arguably explains its adoption better than any accuracy comparison does. Asking what a method implies for SERVING, not just for training, is a habit that keeps paying - and it is the same instinct as asking which memory term a technique actually removes."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Rank is a HARD representational limit",
        "back": "ΔW = BA with B∈ℝ^{d×r}, A∈ℝ^{r×d} ⇒ rank(ΔW) ≤ r. So r=1 on a rank-2 task gave MSE 0.96 — a MATRIX fact, not a tuning problem. More steps, better LR, more data: none of it moves it."
      },
      {
        "type": "formula",
        "front": "★ The elbow, on a task with a KNOWN answer",
        "back": "r=1 → 0.96 · **r=2 → 0.0000 (= full FT) at 12% of params** · r=4/8/16 → plateau. The rule: pay until you reach the task's intrinsic rank, then stop. Extra rank buys nothing."
      },
      {
        "type": "intuition",
        "front": "The two rank failures look DIFFERENT",
        "back": "Too LOW = a hard ceiling, insensitive to LR and step count (distinctive — most hyperparameters degrade gracefully). Too HIGH = wasted params, no gain, slightly more overfitting. That asymmetry is what makes a sweep interpretable."
      },
      {
        "type": "formula",
        "front": "★ Where the memory saving REALLY comes from",
        "back": "NOT the adapter's size — the frozen base is a BUFFER: no gradient, and no OPTIMIZER STATE (Adam = 2× params; ~12 of 16 bytes/param are optimizer-related). Freezing removes the largest allocation in a training step."
      },
      {
        "type": "pitfall",
        "front": "LoRA does NOT remove activations",
        "back": "Activations for the backward pass scale with batch and sequence, not with trainable parameters. A common surprise: people expect LoRA to make memory a non-issue and find activations binding. Gradient checkpointing is the lever there."
      },
      {
        "type": "formula",
        "front": "The ratio — and an honest note about the toy",
        "back": "2rd/d² = 2r/d. 32×32 with r=4 → 25% (**the toy UNDERSTATES it badly**); width 4096 with r=8 → 0.4%. Linear in r, inverse in d, so it collapses as models get wide."
      },
      {
        "type": "intuition",
        "front": "Why B is zero-initialized",
        "back": "BA = 0 at step 0, so the adapter is an exact NO-OP and training starts from the PRETRAINED function — not a perturbation you must recover from. That's what makes attaching an adapter safe."
      },
      {
        "type": "formula",
        "front": "★ QLoRA: the adapters ABSORB the damage",
        "back": "int4 base 7.9× smaller · base alone MSE **2.11** (the quantization damage) · QLoRA **0.024** · fp32 LoRA **0.000**. The adapters are trained WITH the quantized base in the forward pass, so they learn to compensate. ~99% recovered — not free."
      },
      {
        "type": "intuition",
        "front": "Why a constructed task beats a benchmark table",
        "back": "PEFT accuracy is a SATURATED axis, so near-identical scores can't distinguish \"the update is low rank\" from \"the benchmark is insensitive\". A task built to be rank-2 makes each rank a GRADED measurement — and the theory fails exactly where predicted."
      },
      {
        "type": "intuition",
        "front": "★ The serving property that arguably won it",
        "back": "The adapter is an ADDITIVE side path, so it can MERGE into W (zero inference overhead, indistinguishable from full FT) or stay SEPARATE (one base, many per-request adapters). Prompt tuning taxes context forever; adapter layers add depth. Neither can merge."
      },
      {
        "type": "intuition",
        "front": "When LoRA is the wrong tool",
        "back": "Large distribution shifts or continued pretraining (the sweep tells you: quality still climbing at high rank = the update isn't low rank) · memory not binding · ACTIVATIONS binding instead · or the task is really format, where prompting/constrained decoding is nearly free."
      },
      {
        "type": "intuition",
        "front": "Ask WHICH memory term a method removes",
        "back": "Parameters, gradients, optimizer state, activations — four budgets with different scaling. LoRA eliminates optimizer state by freezing; FSDP/ZeRO SHARDS it (Adam is elementwise, so shards update independently). They compose."
      }
    ],
    "refs": [
      {
        "title": "Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models",
        "url": "https://arxiv.org/abs/2106.09685"
      },
      {
        "title": "Dettmers et al. (2023), QLoRA: Efficient Finetuning of Quantized LLMs",
        "url": "https://arxiv.org/abs/2305.14314"
      },
      {
        "title": "Aghajanyan, Zettlemoyer & Gupta (2020), Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning",
        "url": "https://arxiv.org/abs/2012.13255"
      },
      {
        "title": "Zhang et al. (2023), AdaLoRA: Adaptive Budget Allocation for Parameter-Efficient Fine-Tuning",
        "url": "https://arxiv.org/abs/2303.10512"
      },
      {
        "title": "Liu et al. (2024), DoRA: Weight-Decomposed Low-Rank Adaptation",
        "url": "https://arxiv.org/abs/2402.09353"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "distillation",
      "optimizers"
    ]
  },
  "eval-harnesses": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The first result in this lesson makes the rest of it necessary. Take one fixed set of model outputs, from a model whose true skill is 0.85 by construction, and score it four ways. Exact string match gives 0.22. Normalized match - lowercase, strip punctuation and whitespace - gives 0.83. Pass-at-1 gives 0.56 and pass-at-5 gives 0.86. Same outputs, same model, four numbers spanning almost the entire range. THE SCORER IS THE EVAL, and 'what did the model score' is an unanswerable question without it.",
        "The second is the same statistical point that governs any small evaluation, with the interval attached. At fifty items, the Wilson 95% confidence interval is about eleven points wide. A model that is genuinely four points better is ranked correctly only 67% of the time - barely better than a coin flip - so a comparison on a fifty-item suite is close to uninformative for effects of that size. That is a stronger claim than 'the number is noisy': the ORDERING is wrong a third of the time.",
        "The third and fourth are about the two ways an eval can be quietly wrong. Contamination inflates a score LINEARLY and leaves no signature - each leaked item contributes one minus the model's skill, so a 20% leak turns a true 0.70 into 0.76 with nothing in the output to indicate it. And a biased judge can be worse than noisy: a judge with both position and length bias picked the correct answer 77% of the time when it was shown first, which looks like a competent judge - and swap-averaging revealed that it actually preferred the WRONG BUT LONGER answer 41.5% of the time. The naive number was hiding the bias, not reflecting it."
      ],
      "math": [
        {
          "h": "The scorer determines the score",
          "paras": [
            "Four scorers applied to one fixed set of outputs from a model with known skill.",
            "The spread is nearly the whole range."
          ],
          "tex": "\\text{true skill } 0.85 \\;\\longrightarrow\\; \\underbrace{0.22}_{\\text{exact match}},\\; \\underbrace{0.83}_{\\text{normalized}},\\; \\underbrace{0.56}_{\\text{pass@1}},\\; \\underbrace{0.86}_{\\text{pass@5}}",
          "texNote": "Exact match punishes formatting rather than measuring capability; normalization recovers the underlying skill; and pass-at-k is answering a different question entirely - whether ANY of k samples succeeds, which is the right metric for a system that can verify and retry and the wrong one for a single-shot product. So pin the scorer FIRST, version it with the results, and treat a scorer change as invalidating every comparison made across it."
        },
        {
          "h": "Small suites get the ordering wrong",
          "paras": [
            "The Wilson interval is the right binomial interval at small n, and it is wide.",
            "The consequence for comparisons is worse than for point estimates."
          ],
          "tex": "\\text{Wilson 95\\% CI at } N{=}50 \\approx \\pm 11\\text{pt}, \\qquad \\Pr[\\text{correct ranking of a 4pt gap}] = 0.67",
          "texNote": "Two thirds is barely above chance for a decision that is usually presented as a finding. The Wilson interval is preferred over the normal approximation here because it behaves correctly near zero and one, where small evals often sit. And the practical rule follows: size the suite from the effect you need to detect, and if you cannot, report the interval and say explicitly that differences below some size are not resolvable."
        },
        {
          "h": "Contamination is linear and leaves no trace",
          "paras": [
            "A leaked item is answered correctly regardless of skill, so it contributes the gap between one and the skill.",
            "The inflation is smooth and invisible in the score itself."
          ],
          "tex": "\\text{observed} = s + \\rho\\,(1-s), \\qquad \\rho{=}0.2,\\; s{=}0.70 \\;\\Rightarrow\\; 0.76",
          "texNote": "There is no signature in the score - no bimodality, no odd distribution, nothing that would make a reader suspicious. It is a straight line in the leaked fraction, which means the only defences are external: a private held-out set, freshly constructed items, or an n-gram overlap check against the training corpus where you can see it. Detecting it after the fact from the number alone is not possible."
        },
        {
          "h": "Position bias cancels under swapping; length bias does not",
          "paras": [
            "Position bias is antisymmetric in the ordering, so averaging both orders removes it exactly.",
            "Length bias is symmetric in the ordering, so it survives."
          ],
          "tex": "\\tfrac{1}{2}\\big[P(A \\mid AB) + P(A \\mid BA)\\big] \\;\\Rightarrow\\; \\text{position cancels}, \\qquad 0.77 \\;\\longrightarrow\\; 0.415",
          "texNote": "The naive 77% looked like a competent judge and was mostly the correct answer being shown first. Swap-averaging did not merely reduce noise - it UNMASKED the real preference, which was for the wrong but longer answer at 41.5%. A length-free judge swap-averages to a fair 50%, confirming the machinery. So swapping is mandatory and it is not sufficient: length bias needs rubric scoring or explicit length control on top."
        }
      ],
      "code": [
        {
          "h": "★ The scorer is the eval",
          "paras": [
            "One fixed set of outputs, four scorers, four incompatible conclusions."
          ],
          "code": "# SAME model outputs. TRUE skill 0.85 by construction.\n#   exact string match     0.22   <- punishes FORMATTING, not capability\n#   normalized match       0.83   <- lowercase/strip/collapse -> recovers\n#                                    the actual skill\n#   pass@1                 0.56   \\  a DIFFERENT QUESTION: does ANY of k\n#   pass@5                 0.86   /  samples succeed?\n#\n# ★ So \"what did the model score\" is UNANSWERABLE without the scorer.\n#   PIN IT FIRST, version it with the results, and treat a scorer\n#   change as INVALIDATING every comparison made across it.\n\n# WHICH SCORER IS RIGHT depends on the consumer, not on taste:\n#   single-shot product        -> pass@1 (or normalized match)\n#   generate-and-VERIFY system -> pass@k is the right question, because\n#                                 you can afford to sample and check\n#   free-form answers          -> normalized match, or a judge with the\n#                                 corrections below\n#   ⚠ exact match is almost never what you want, and it is the default\n#     in more harnesses than you would expect.\n\n# ⚠ AND YOUR HARNESS HAS BUGS TOO. While building this, a repeated\n#   8-prompt suite let the mock model's per-prompt cache QUANTIZE the\n#   realized skill to all-known - producing a clean, plausible, and\n#   completely fake 1.00. The fix was DISTINCT prompts.\n#   ★ An eval that returns a suspiciously round number is a bug\n#     signature, not a result.",
          "caption": "Four scorers, one set of outputs, scores from 0.22 to 0.86 — which is why the scorer must be pinned and versioned before any comparison means anything."
        },
        {
          "h": "Noise, contamination, and debiasing a judge",
          "paras": [
            "Three failure modes: one statistical, one invisible, one that swapping partly fixes."
          ],
          "code": "# 1. NOISE - use the WILSON interval, not the normal approximation\n#    (it behaves correctly near 0 and 1, where small evals often sit):\n#      N=50  ->  95% CI ~ +-11 points\n#      a genuinely 4pt-better model is ranked CORRECTLY only 67% of\n#      the time. Not \"noisy\" - the ORDERING is wrong a third of the\n#      time, on a comparison usually presented as a finding.\n\n# 2. CONTAMINATION - linear, and INVISIBLE in the score:\n#      observed = skill + leak_frac * (1 - skill)\n#      20% leak turns a true 0.70 into 0.76\n#    ★ No signature. No bimodality, nothing odd in the distribution.\n#      Defences are all EXTERNAL: a private held-out set, freshly\n#      written items, or n-gram overlap against the corpus you can see.\n\n# 3. ★ JUDGE BIAS - and swapping does more than reduce noise:\n#      naive (correct answer shown FIRST)        0.770\n#      swap-averaged over BOTH orderings         0.415\n#    Position bias is ANTISYMMETRIC in the ordering, so averaging\n#    cancels it EXACTLY - and what it revealed is that the judge\n#    actually PREFERS THE WRONG BUT LONGER ANSWER. The 0.77 was hiding\n#    the bias, not reflecting competence.\nscore = 0.5*(judge(a, b) + judge(b, a))     # mandatory, ~free\n#    ⚠ LENGTH bias is SYMMETRIC in the ordering, so it SURVIVES\n#      swapping. It needs rubric scoring or explicit length control.\n#    ✔ SANITY CHECK: a length-free judge swap-averages to a fair 0.500,\n#      which confirms the machinery rather than the conclusion.",
          "caption": "Swap-averaging cancels position bias exactly because it is antisymmetric — and in doing so it unmasked a judge that preferred the wrong, longer answer."
        }
      ],
      "useCases": [
        "Building an internal evaluation suite, where pinning and versioning the scorer is the decision that makes every later comparison meaningful.",
        "Comparing two models or two prompts, where suite size determines whether the comparison resolves the effect you care about at all.",
        "Reading a published evaluation critically, where the scorer, the suite size and the contamination check are the three things most often missing.",
        "Using an LLM judge responsibly, where swap-averaging is mandatory and free and length control is the part it does not fix."
      ],
      "pitfalls": [
        "Reporting a score without the scorer. Identical outputs scored 0.22, 0.83, 0.56 and 0.86 under four scorers, so the number alone carries no information.",
        "Using exact string match by default. It punishes formatting rather than measuring capability, and it is the default in more harnesses than people expect.",
        "Quoting pass-at-k as if it answered the same question as pass-at-1. It asks whether any of k samples succeeds, which is right for a verify-and-retry system and wrong for a single-shot product.",
        "Drawing conclusions from a fifty-item suite. The Wilson interval is about eleven points wide there, and a genuinely four-point-better model is ranked correctly only two thirds of the time.",
        "Expecting to detect contamination from the score. It is linear in the leaked fraction and leaves no signature - the defences are all external.",
        "Using an LLM judge without swap-averaging. Position bias is antisymmetric so averaging both orders cancels it exactly, and it costs one extra call.",
        "Believing swap-averaging fixes a judge. Length bias is symmetric in the ordering and survives it, which is why rubric scoring or length control is still needed.",
        "Trusting a suspiciously clean result from your own harness. A repeated-prompt suite produced a fake 1.00 here, and a round number is a bug signature rather than a finding."
      ],
      "connections": [
        {
          "ref": "llm-systems/llm-eval",
          "text": "The instrument-level treatment - which metric can move in response to which change, and the diagnostic question of what a metric would fail to detect."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "The same statistics applied to agents, where a five-task suite mis-ranks a better agent half the time and a holistic judge shows a length bias."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "Where selection over noise inflates a reported result, which is the mechanism behind tuning optimism and the reason for a held-out slice."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The underlying discipline - what a metric expresses, why intervals are not optional, and how a threshold encodes a cost decision."
        },
        {
          "ref": "frontier-frameworks/staying-current",
          "text": "Why headline results regress: best-of-many-configurations on a noisy metric produces a gap that is mostly selection, and it shrinks on replication."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What did four scorers do to one set of outputs?",
          "a": "Exact match 0.22, normalized 0.83, pass-at-1 0.56, pass-at-5 0.86 - from a model whose true skill was 0.85 by construction."
        },
        {
          "q": "What follows from that?",
          "a": "The scorer is the eval. Pin it first, version it with the results, and treat a scorer change as invalidating comparisons made across it."
        },
        {
          "q": "What is wrong with exact string match?",
          "a": "It punishes formatting rather than measuring capability - here it reported 0.22 for a model with 0.85 skill."
        },
        {
          "q": "When is pass-at-k the right metric?",
          "a": "When the system can sample several times and verify, so any success counts. For a single-shot product it answers a different question."
        },
        {
          "q": "How wide is the interval at fifty items?",
          "a": "About eleven points, using the Wilson interval - which is preferred because it behaves correctly near zero and one."
        },
        {
          "q": "What does that do to a comparison?",
          "a": "A genuinely four-point-better model is ranked correctly only 67% of the time, so the ordering is wrong a third of the time."
        },
        {
          "q": "How does contamination affect a score?",
          "a": "Linearly - observed equals skill plus leaked fraction times one minus skill, so a 20% leak turns a true 0.70 into 0.76."
        },
        {
          "q": "Can you detect it from the score?",
          "a": "No. There is no signature, so the defences are external: a private held-out set, fresh items, or n-gram overlap against the corpus."
        },
        {
          "q": "What did the naive judge report?",
          "a": "77% for the correct answer - when the correct answer was shown first, which looked like competence."
        },
        {
          "q": "What did swap-averaging reveal?",
          "a": "41.5% - the judge actually preferred the wrong but longer answer. The naive number was hiding the bias rather than reflecting quality."
        },
        {
          "q": "Why does swapping cancel position bias exactly?",
          "a": "Position bias is antisymmetric in the ordering, so averaging the two orders removes it. It costs one extra call."
        },
        {
          "q": "Why does length bias survive?",
          "a": "It is symmetric in the ordering, so averaging does not touch it - it needs rubric scoring or explicit length control."
        }
      ],
      "standard": [
        {
          "q": "Why is the scorer the most important choice in an evaluation?",
          "a": "BECAUSE IT DETERMINES THE NUMBER MORE THAN THE MODEL DOES, and the measurement makes that concrete rather than rhetorical. THE EXPERIMENT: take one fixed set of outputs from a model whose true skill is 0.85 by construction, and score it four ways. Exact string match reports 0.22. Normalized match - lowercase, strip punctuation, collapse whitespace - reports 0.83. Pass-at-1 reports 0.56. Pass-at-5 reports 0.86. Same outputs, same model, four numbers covering almost the whole range. WHAT EACH IS ACTUALLY MEASURING. Exact match measures whether the output string matched a reference exactly, which mostly measures FORMATTING - and a model that is right but adds a period, capitalizes differently, or wraps the answer in a sentence is scored wrong. That is why it reported 0.22 for a model with 0.85 skill, and it is the default in more harnesses than people expect. Normalized match removes the formatting sensitivity and recovers the underlying skill. Pass-at-k asks a genuinely different question: does ANY of k samples succeed? That is the right question when the system can sample repeatedly and verify - a code task with tests, a structured extraction you can validate - and the wrong question for a single-shot product where the user sees one answer. SO 'WHAT DID THE MODEL SCORE' IS UNANSWERABLE without the scorer, and any comparison across different scorers is meaningless. THE PRACTICAL RULES. Pin the scorer before running anything, version it alongside the results, and treat a scorer change as invalidating every comparison made across it - which means a harness upgrade can silently break your historical trend. Choose it from the CONSUMER: what does the downstream system actually need to be true? If a human reads the answer, formatting tolerance is appropriate. If a parser consumes it, format matters and exact match may genuinely be right. If you can verify and retry, pass-at-k is the honest metric and reporting pass-at-1 understates the system. THE FAILURE THIS PREVENTS: two teams reporting different numbers for the same model and concluding one of them made a mistake, when both were correct under different scorers. Or a model appearing to regress after a harness upgrade changed the normalization. Both are common and both are avoided by treating the scorer as part of the result rather than as an implementation detail. AND A WARNING ABOUT YOUR OWN HARNESS, which came out of building this one: a repeated-prompt suite caused the mock model's per-prompt caching to quantize the realized skill, producing a clean, plausible, entirely fake 1.00. The fix was distinct prompts. A suspiciously round number from an eval is a bug signature rather than a finding, and checking your harness against a model of KNOWN skill is the cheapest way to catch it.",
          "deepDive": {
            "q": "Design an evaluation harness for your own product. What are the decisions?",
            "a": "SEVEN DECISIONS, AND THE FIRST TWO DETERMINE WHETHER THE REST MEANS ANYTHING. DECISION 1 - THE SCORER, pinned and versioned before anything runs. Choose it from the consumer: what must be true for the downstream system to work? A parser consuming the output makes format part of correctness; a human reading it does not. If the product can verify and retry, pass-at-k is the honest metric; if it is single-shot, pass-at-1 is. Write the scorer down, version it with the results, and make a scorer change an explicit event that invalidates prior comparisons - because it silently will anyway. DECISION 2 - THE SUITE SIZE, from the effect you need to detect. At fifty items the Wilson interval is about eleven points and a four-point difference is ranked correctly two thirds of the time, so a small suite does not merely blur the result - it inverts the ordering often enough to make the decision uninformed. Decide the smallest difference worth acting on, then size for it. If you cannot afford that size, say so explicitly and report the interval rather than presenting an underpowered comparison as a finding. DECISION 3 - THE ITEMS, sampled from real traffic and stratified by request type. This is the only set whose distribution is guaranteed to match what you serve. Supplement with synthetic items for coverage, knowing they are systematically easier, and include the cases that break things: ambiguous inputs, absent answers, adversarial phrasings, and the second-most-common language of your users. DECISION 4 - CONTAMINATION CONTROL. Keep the suite PRIVATE, since a published set enters crawls and a future model will have seen it. Prefer freshly written items over public benchmarks where you can afford them. And where you can inspect the training corpus, run an n-gram overlap check - because contamination is linear and invisible in the score, so the number itself will never warn you. DECISION 5 - THE JUDGE, if free-form outputs require one. Swap-average over both orderings, which is mandatory and costs one extra call and cancels position bias exactly. Report answer LENGTH alongside every result, because length bias survives swapping. Validate the judge against human labels on a subset and report the agreement, remembering the human-human ceiling. And version the rubric, since judge scores move with its wording. DECISION 6 - THE HELD-OUT SLICE, touched rarely. A suite you tune against repeatedly stops being an unbiased estimate through pure selection - the same mechanism that inflates any repeatedly-optimized benchmark - so keeping a portion untouched is what preserves an honest number for the decisions that matter. DECISION 7 - THE REPORTING FORMAT: score with an interval, the scorer version, the suite version and size, and the failure breakdown by category. The last one is the most useful for improving the product and the least often included. AND THE MAINTENANCE COMMITMENT, which is a decision people make implicitly and should make explicitly: sample new production items in periodically, because the query distribution drifts and a fixed suite quietly becomes a measure of last year's product. Add every production failure as a permanent case, which is how the suite grows into a description of your real failure modes rather than your imagined ones."
          }
        },
        {
          "q": "How do you use an LLM judge without being misled by it?",
          "a": "BY DEBIASING WHAT CAN BE DEBIASED AND MEASURING WHAT CANNOT - and the measurement here shows that the naive number can be actively misleading rather than merely noisy. THE RESULT. A judge with both position and length bias picked the correct answer 77% of the time when the correct answer was shown first. That looks like a reasonably competent judge. Swap-averaging over both orderings gave 41.5% - meaning the judge actually PREFERRED THE WRONG BUT LONGER answer. The naive 77% was not a noisy estimate of competence; it was position bias masquerading as competence. WHY SWAPPING WORKS EXACTLY. Position bias is ANTISYMMETRIC in the ordering - whatever the judge gains from being shown first in one order, it loses in the other - so averaging the two removes it precisely rather than approximately. That is a structural property, not a variance reduction, which is why one extra call is enough and why it is mandatory rather than advisable. WHY LENGTH BIAS SURVIVES. It is SYMMETRIC in the ordering: the longer answer is preferred regardless of where it appears, so averaging over positions does nothing to it. That is why the swap-averaged number revealed the length preference rather than removing it - and why length control is a separate intervention. The fixes are rubric scoring, which replaces one holistic judgement with several specific checks that have no length preference, or explicit length control, matching or regressing out the difference. THE SANITY CHECK THAT VALIDATES THE MACHINERY: a length-free judge swap-averages to a fair 50%. That is worth running, because it confirms the debiasing procedure is doing what you think rather than introducing its own artefact - and it is the kind of control that distinguishes a measurement from a hope. WHAT ELSE I WOULD DO. Validate the judge against HUMAN labels on a subset and report the agreement, remembering that the ceiling is human-human agreement of roughly 70 to 75%. Report answer length alongside every win rate, always, since it is the confound most likely to explain a result. Avoid a judge from the same family as a candidate, where self-preference applies. And version the rubric, because judge scores move substantially with its wording and a rubric change invalidates comparisons across it. THE FRAMING I WOULD KEEP: a judge is an instrument with measurable properties, and the properties are not all fixable. Position bias is fixable exactly and cheaply. Length bias is not fixable by the same trick and must be measured and controlled. Self-preference is avoidable by choice of judge. Reporting a win rate without stating which of these were handled is reporting an unknown instrument's output - and as this measurement shows, the unhandled version can point in the opposite direction from the truth."
        },
        {
          "q": "Why can't you detect contamination from the results?",
          "a": "BECAUSE ITS EFFECT IS LINEAR AND SMOOTH, SO IT LEAVES NO SIGNATURE ANYWHERE IN THE OUTPUT. THE MECHANISM. A contaminated item is one the model has effectively memorized, so it is answered correctly regardless of the model's actual skill. That item therefore contributes the difference between one and the skill. Across a suite with a leaked fraction, the observed score is the skill plus the leaked fraction times one minus the skill - a straight line. A 20% leak turns a true 0.70 into 0.76. WHY THAT IS HARD. There is nothing anomalous to find. The score distribution is not bimodal, the per-item pattern looks ordinary, and the inflated number sits in a completely plausible range - 0.76 is not a suspicious result for a model that could genuinely score it. Any statistical test you might apply to the results is looking for a signature that the mechanism does not produce. THE DEFENCES, all external to the score. A PRIVATE suite, never published, so it cannot enter a crawl. FRESHLY CONSTRUCTED items, written after the model's training cutoff where you know it. N-GRAM OVERLAP against the training corpus, when you can see the corpus - which for open-weight models with published data is sometimes possible and for API models is not. And REPORTING THE CLEAN SUBSET separately when you can identify contaminated items, since the difference between the full and clean scores IS the contamination's effect. THE TIME-DEPENDENCE that makes this worse and is easy to overlook: the same benchmark is clean for a model trained before publication and contaminated after. So a benchmark's validity decays, and a comparison between an older and a newer model on a public benchmark is partly a comparison of training dates rather than of capability. That is a structural problem with public leaderboards rather than a mistake anyone made. WHAT I WOULD ACTUALLY DO for a product evaluation: build the suite from your own traffic, keep it private, and rotate in new items periodically. Those three practices remove most of the exposure, and they are things you would do anyway for distribution reasons. For reading OTHERS' results: treat public-benchmark numbers as an upper bound, weight results on freshly-constructed or private sets much more heavily, and be especially sceptical when a model performs unusually well on an older, popular benchmark relative to its performance elsewhere. AND THE HONEST SUMMARY: contamination is a VALIDITY failure rather than a quality one. It does not make the model worse; it makes the number mean something other than what it appears to. That distinction matters because the instinct on discovering contamination is to distrust the model, and the correct response is to distrust the measurement."
        },
        {
          "q": "How large should an evaluation suite be?",
          "a": "LARGE ENOUGH TO RESOLVE THE DIFFERENCE YOU INTEND TO ACT ON, and the argument is about ORDERING rather than about precision, which makes it much sharper than the usual plea for bigger samples. THE STANDARD FRAMING is that a small sample gives a wide interval - at fifty items the Wilson 95% interval is about eleven points - and people accept that and proceed. THE STRONGER FRAMING is what that does to a comparison, which is what evaluations are actually for. A model that is genuinely four points better is ranked CORRECTLY only 67% of the time on a fifty-item suite. So a third of the time you conclude the worse model is better, and you cannot tell which case you are in. That is not a precision problem; it is a decision that carries almost no information while looking like a finding. WHY THE WILSON INTERVAL rather than the normal approximation: small evaluations often produce scores near zero or one, where the normal approximation misbehaves badly - it can produce intervals extending past the valid range. Wilson is well-behaved there and is the right default for binomial proportions at small n. HOW I WOULD SIZE IT. Decide the smallest difference worth acting on. If a three-point difference would not change any decision, do not size for it. Then choose n so that difference is detectable at the confidence you need - and remember that comparing two models is a comparison of two estimates, so the relevant variance is larger than for a single score. WHAT BUYS MORE THAN A BIGGER SUITE: PAIRING. Run both models on the SAME items and compare per-item outcomes. Item difficulty is the dominant variance component - some items are hard for everything - and pairing removes it entirely. That is frequently worth more than doubling n and it costs nothing you were not already doing, so it should be the default rather than the exception. WHAT TO DO WHEN YOU CANNOT AFFORD IT, since evaluation is genuinely expensive: report the interval, state that differences below some size are not resolvable by this suite, and do not present an underpowered comparison as a result. That is a legitimate position honestly stated, and it is much better than the alternative, which is a confident ranking that is wrong a third of the time. AND WHEN READING OTHERS' EVALUATIONS: suite size and whether intervals were reported are the first two things to check, because their absence tells you how much weight the number can carry. Combined with the selection effect - a result reported as the best of several configurations regresses on replication - an unqualified small-sample gap is close to uninterpretable, which is a strong claim and I think the measurements support it."
        },
        {
          "q": "What should an eval harness give you beyond a number?",
          "a": "PROVENANCE, DECOMPOSITION AND REPRODUCIBILITY - because the number alone cannot be acted on and often cannot even be compared to itself six months later. PROVENANCE, which the scorer result makes non-negotiable. Every reported score should carry: which scorer and its version, which suite and its version and size, which model and its exact settings including temperature and any quantization, and the date. Without the scorer version, a harness upgrade that changes normalization looks like a model regression. Without the suite version, adding items to the suite looks like a quality change. Both of those are common and both waste days. DECOMPOSITION - a per-category breakdown rather than a single aggregate. This is where the actionable information is: an aggregate of 0.76 tells you nothing about what to fix, and a breakdown showing 0.95 on extraction and 0.40 on multi-hop tells you exactly where to work. It also protects against the aggregate hiding a badly failing minority, which is the same structural blindness that recurs across this curriculum. UNCERTAINTY, attached to every number, with paired comparisons for A-versus-B. Without it, a reader cannot tell a real difference from noise, and the mis-ranking result says they will often be wrong. FAILURE EXAMPLES, not just failure counts. Being able to read the actual outputs that failed is the highest-information activity available for improving a system, and a harness that only emits aggregate scores makes it impossible. I would want the harness to save every failing input, output and expected value by default. REPRODUCIBILITY: fixed seeds where sampling is involved, pinned model versions, and enough recorded state that a result from three months ago can be regenerated. Model endpoints change underneath you, so an unpinned historical comparison may be comparing two different models. AND THE PROPERTY THAT MATTERS MOST OPERATIONALLY: the harness should be cheap enough to run on every change. An evaluation that takes a day is run before releases; one that takes minutes is run on every commit and catches regressions when they are one change old rather than fifty. That argues for a fast tier of cheap verifiable items running constantly, and a slower expensive tier with judges and long-form outputs running less often - the same tiering as any test suite. WHAT I WOULD CHECK ABOUT THE HARNESS ITSELF, given what happened while building this one: run it against a model of KNOWN skill and confirm it reports that skill. A repeated-prompt suite here produced a clean, plausible, entirely fake 1.00 because per-prompt caching quantized the realized skill. An eval harness is code, it has bugs, and a suspiciously round number is a bug signature rather than a finding."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE MODULE APPLIED TO THE INSTRUMENT RATHER THAN THE SYSTEM, and it separates a durable practice from a perishable tooling landscape. Evaluation harnesses are libraries with versions, and the benchmark landscape turns over even faster than the model landscape - suites saturate, get contaminated, and get replaced. What does not turn over is the practice: pin the scorer, size for the effect, keep the suite private, debias the judge where the bias is structurally removable and measure it where it is not. Those apply to any harness and any benchmark, including ones that do not exist yet. THE RESULT THAT CARRIES FURTHEST is the first one. Identical outputs scoring 0.22, 0.83, 0.56 and 0.86 under four scorers means the scorer is not an implementation detail but the definition of the measurement. That reframes a class of confusing experiences - two teams reporting different numbers for one model, a model appearing to regress after a harness upgrade - as the same predictable thing rather than as mistakes. THE SHARPEST is the judge result, because the naive number pointed in the OPPOSITE direction from the truth. A judge that looked 77% competent was, once position bias was cancelled, preferring the wrong-but-longer answer at 41.5%. Swap-averaging is not noise reduction; it is an exact cancellation of an antisymmetric bias, and it UNMASKED something the naive measurement hid. Meanwhile length bias is symmetric and survives, which is why the same trick does not fix it. Knowing WHICH biases a correction removes, and why, is the difference between a debiased instrument and a differently-biased one. AND THE HABIT the whole module keeps installing appears here too: check your own instrument. A repeated-prompt suite produced a fake 1.00 through caching, and the reflex it teaches - run the harness against a model of known skill, treat a suspiciously round number as a bug signature - is the same reflex as measuring the compile cache before believing a speedup, and checking the data pipeline before believing a chance-level accuracy. In every case the number was produced by the instrument rather than by the system, and the only defence is a control that would have revealed it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ THE SCORER IS THE EVAL",
        "back": "One fixed set of outputs, TRUE skill 0.85: exact match **0.22** · normalized **0.83** · pass@1 **0.56** · pass@5 **0.86**. \"What did the model score\" is unanswerable without the scorer. Pin it, version it, treat a change as invalidating comparisons."
      },
      {
        "type": "intuition",
        "front": "Choose the scorer from the CONSUMER",
        "back": "Single-shot product → pass@1 / normalized. Generate-and-VERIFY system → pass@k is the honest question. Parser downstream → format is part of correctness. ⚠ Exact match punishes formatting and is the default in more harnesses than you'd expect."
      },
      {
        "type": "formula",
        "front": "★ Small suites invert the ORDERING",
        "back": "Wilson 95% CI at N=50 ≈ ±11 pts, and a genuinely 4-pt-better model is ranked correctly only **67%** of the time. Not \"noisy\" — wrong a third of the time, on a comparison presented as a finding."
      },
      {
        "type": "intuition",
        "front": "Use WILSON, not the normal approximation",
        "back": "Small evals often sit near 0 or 1, where the normal approximation misbehaves and can produce intervals outside the valid range. Wilson is well-behaved there — the right default for binomial proportions at small n."
      },
      {
        "type": "intuition",
        "front": "Pairing beats doubling n",
        "back": "Run both models on the SAME items and compare per-item outcomes. Item difficulty is the dominant variance component and pairing removes it entirely — costs nothing you weren't already doing."
      },
      {
        "type": "formula",
        "front": "★ Contamination is LINEAR and invisible",
        "back": "observed = skill + ρ(1−skill). A 20% leak turns a true 0.70 into 0.76. **No signature** — not bimodal, nothing odd. Defences are all EXTERNAL: private suite, fresh items, n-gram overlap against the corpus."
      },
      {
        "type": "intuition",
        "front": "Contamination is a VALIDITY failure",
        "back": "It doesn't make the model worse; it makes the NUMBER mean something else. So the correct response is to distrust the measurement, not the model. And it's time-dependent: a benchmark is clean before publication and contaminated after."
      },
      {
        "type": "formula",
        "front": "★ Swap-averaging UNMASKED the judge",
        "back": "Naive (correct shown first) **0.770** → swap-averaged **0.415**. The judge actually preferred the WRONG BUT LONGER answer. The 0.77 was position bias masquerading as competence — not a noisy estimate of it."
      },
      {
        "type": "formula",
        "front": "Why swapping works EXACTLY",
        "back": "Position bias is ANTISYMMETRIC in the ordering, so ½[P(A|AB) + P(A|BA)] cancels it precisely — a structural property, not variance reduction. One extra call. Mandatory, not advisable."
      },
      {
        "type": "pitfall",
        "front": "LENGTH bias SURVIVES swapping",
        "back": "It's SYMMETRIC in the ordering — the longer answer wins wherever it appears. Needs rubric scoring (several specific checks, no length preference) or explicit length control. Report answer length beside every win rate."
      },
      {
        "type": "intuition",
        "front": "The control that validates the machinery",
        "back": "A length-free judge swap-averages to a fair **0.500**. Running it confirms the debiasing does what you think rather than introducing its own artefact — the difference between a measurement and a hope."
      },
      {
        "type": "pitfall",
        "front": "★ Your harness has bugs too",
        "back": "A repeated 8-prompt suite let per-prompt caching QUANTIZE the mock model's skill to all-known → a clean, plausible, entirely fake **1.00**. Run the harness against a model of KNOWN skill. A suspiciously round number is a bug signature, not a result."
      }
    ],
    "refs": [
      {
        "title": "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "url": "https://arxiv.org/abs/2306.05685"
      },
      {
        "title": "Chen et al. (2021), Evaluating Large Language Models Trained on Code (pass@k)",
        "url": "https://arxiv.org/abs/2107.03374"
      },
      {
        "title": "Brown, Cai & DasGupta (2001), Interval Estimation for a Binomial Proportion",
        "url": "https://projecteuclid.org/euclid.ss/1009213286"
      },
      {
        "title": "Sainz et al. (2023), NLP Evaluation in Trouble: On the Need to Measure LLM Data Contamination",
        "url": "https://arxiv.org/abs/2310.18018"
      },
      {
        "title": "EleutherAI, Language Model Evaluation Harness",
        "url": "https://github.com/EleutherAI/lm-evaluation-harness"
      }
    ],
    "demos": [
      "classification-metrics",
      "calibration",
      "conformal",
      "cross-validation"
    ]
  },
  "staying-current": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This module has argued throughout that mechanisms outlive tools, and the capstone is where that stops being a preference and becomes a calculation. Model knowledge as a stock that you add to by studying and lose to forgetting: it settles where the two balance, at study rate over decay rate. Principles decay slowly - a half-life measured in years - and tool trivia decays fast, measured in months. Under the modelled half-lives, an hour spent on principles builds about 7.2 times more retained knowledge than an hour spent on tool specifics.",
        "The obvious conclusion from that ratio would be to study only principles, and the model says otherwise once you add the thing that makes tools different: their value SATURATES. You need to be fluent enough to ship, and past that, more tool depth buys very little - whereas principle depth keeps compounding. Putting a saturating return on one side and a scaling return on the other gives an optimum around 70% principles and 30% tools. Principle-HEAVY, not principle-only, and the second half of that is the part people get wrong in both directions.",
        "The other two results are about deciding what to believe. A method with a TRUE effect of ZERO, reported as the best of thirty configurations, showed a +4.1 point improvement - and replicated at +0.1. That gap is pure selection, the maximum over noisy draws, and it means a headline's size tells you as much about how many knobs were tuned as about the method. Requiring an independent second positive before adopting raised the precision of the adopted set from 48% to 84%, at a cost of 12 points of recall - which is the barbell: track everything cheaply, commit only to what replicates."
      ],
      "math": [
        {
          "h": "Knowledge is a stock with a decay rate",
          "paras": [
            "You add by studying and lose by forgetting, so the retained amount settles where the two balance.",
            "The decay rate is what separates a principle from a tool detail."
          ],
          "tex": "\\frac{dS}{dt} = u - \\lambda S \\;\\Rightarrow\\; S^{*} = \\frac{u}{\\lambda}, \\qquad \\frac{S^{*}_{\\text{principle}}}{S^{*}_{\\text{tool}}} = \\frac{\\lambda_{\\text{tool}}}{\\lambda_{\\text{principle}}} = \\frac{60}{8} \\approx 7.2",
          "texNote": "Steady-state stock is inversely proportional to the decay rate, so with half-lives of 60 months against 8, an hour on principles yields about 7.2 times the retained knowledge of an hour on tool trivia. That is the whole argument for mechanism-first learning, expressed as arithmetic rather than as taste - and it is why this module taught vLLM without vLLM and Optax without Optax."
        },
        {
          "h": "Why the answer is 70/30 and not 100/0",
          "paras": [
            "Tool knowledge SATURATES - you need enough to ship and more adds little.",
            "Principle depth does not saturate, so the optimum is interior."
          ],
          "tex": "V = \\underbrace{f_{\\text{sat}}(t)}_{\\text{tools: needed, then flat}} \\times \\underbrace{g(p)}_{\\text{principles: keeps scaling}} \\;\\Rightarrow\\; \\text{optimum} \\approx 70\\%\\ p / 30\\%\\ t",
          "texNote": "The saturation is what makes this a real optimum rather than a corner solution. Without it - with two symmetric scaling terms - the model returns a meaningless 50/50, which is exactly what the first version produced before tool sufficiency was modelled. So the interior optimum is a consequence of an asymmetry in the RETURNS, not of the decay rates alone, and getting to 30% tools is non-negotiable because you cannot ship on principles."
        },
        {
          "h": "Headlines regress because they are maxima over noise",
          "paras": [
            "Reporting the best of n configurations selects on noise as well as on effect.",
            "The expected inflation grows with the number of things tried."
          ],
          "tex": "\\mathbb{E}[\\max_n] \\approx \\sigma\\sqrt{2\\ln n}: \\quad \\text{true effect } 0 \\;\\longrightarrow\\; \\text{reported } +4.1\\text{pt} \\;\\longrightarrow\\; \\text{replicated } +0.1\\text{pt}",
          "texNote": "A method with no effect at all produced a 4.1-point headline purely by being the best of thirty tries. So the size of a reported gain is partly a measure of how many knobs were tuned, and the correction is to discount by that count - which papers rarely report - and to weight independent replications far more heavily than originals. This is the same selection mechanism as tuning optimism in cross-validation, appearing at the scale of a literature."
        },
        {
          "h": "A second independent positive buys precision",
          "paras": [
            "Requiring confirmation filters the adopted set at the cost of missing some real results.",
            "The gain is largest when genuinely good ideas are rare."
          ],
          "tex": "\\text{precision } 0.48 \\longrightarrow 0.84, \\qquad \\text{recall } -12\\text{pt}",
          "texNote": "Nearly doubling precision for twelve points of recall is a good trade whenever adoption is expensive - and adoption of an infrastructure change usually is, since it costs migration, training and a dependency. The mechanism is Bayesian: when the base rate of real effects is low, a single positive is weak evidence and a second independent one is strong. That is why the barbell works - tracking is cheap, committing is not."
        }
      ],
      "code": [
        {
          "h": "The allocation, and the honesty fix that produced it",
          "paras": [
            "The first model gave a non-answer, and the reason it did is the finding."
          ],
          "code": "# THE STOCK MODEL: dS/dt = study - decay*S  ->  S* = study/decay\n#   principles  half-life ~60 months\n#   tool trivia half-life ~8 months\n#   -> an hour on principles yields ~7.2x the RETAINED knowledge\n\n# ★ THE OBVIOUS CONCLUSION (\"study only principles\") IS WRONG, and the\n#   model only says so once you add the asymmetry that matters:\n#     TOOL value SATURATES - you need fluent-enough-to-ship, and past\n#       that more tool depth buys very little\n#     PRINCIPLE depth KEEPS SCALING\n#   -> optimum ~70% principles / 30% tools. Principle-HEAVY, not\n#      principle-ONLY. You cannot ship on principles.\n\n# ⚠ THE HONESTY FIX, and it is the real lesson here:\n#   the FIRST model used a symmetric geometric mean of two scaling\n#   terms. Steady stock is proportional to study rate, so the objective\n#   was symmetric and the optimum came out 50/50 - a meaningless\n#   non-answer dressed as a result.\n#   ★ A MODEL THAT RETURNS A NON-ANSWER IS TELLING YOU THE MODEL IS\n#     WRONG, NOT THAT THE QUESTION HAS NO ANSWER. Modelling tool\n#     SATURATION is what produced a real interior optimum - so the\n#     70/30 is a consequence of an asymmetry in RETURNS, not of the\n#     decay rates alone.\n\n# ★ THE DURABILITY SCORE, applied to THIS MODULE's own content:\n#     score = principle_content x (1 - churn_rate)\n#   DEEP (high durability):\n#     memory arithmetic (GB = params x bytes; KV = 2*L*h_kv*d*s*b)\n#     eval discipline (the scorer IS the eval; Wilson CIs; swap-averaging)\n#     roofline / arithmetic intensity; paging vs contiguous allocation\n#     the rank elbow; purity -> composable transforms\n#   SKIM (low durability):\n#     provider-API specifics, SDK surfaces, compiler FLAGS,\n#     current model names and leaderboard positions",
          "caption": "The first model's 50/50 non-answer was the informative failure — modelling tool saturation is what turned a symmetric objective into a real optimum."
        },
        {
          "h": "Deciding what to believe, and when to adopt",
          "paras": [
            "Two filters: discount the headline, and require a replication before committing."
          ],
          "code": "# ★ HEADLINES REGRESS - measured on a method whose TRUE effect is ZERO:\n#     reported as best-of-30-configs   +4.1 pt\n#     replicated                       +0.1 pt\n#   E[max of n noisy draws] ~ sigma*sqrt(2 ln n), so the reported size\n#   is partly a measure of HOW MANY KNOBS WERE TUNED.\n#\n#   THE QUESTIONS THAT DISCOUNT A CLAIM:\n#     how many configurations were tried?   (rarely reported)\n#     is the baseline TUNED, or a default?  (the usual asymmetry)\n#     COMPUTE-matched?                      (or is it just more compute)\n#     public benchmark => possible contamination (22-09)\n#     any independent replication?\n\n# ★ ADOPT-NOW vs WAIT - requiring an independent SECOND positive:\n#     precision of the adopted set  0.48 -> 0.84\n#     recall                        -12 pt\n#   Nearly doubling precision for 12 points of recall is a good trade\n#   whenever ADOPTION IS EXPENSIVE - and an infrastructure change is:\n#   migration, retraining people, a new dependency to maintain.\n#   The mechanism is Bayesian: when good ideas are RARE, one positive\n#   is weak evidence and a second independent one is strong.\n\n# ★ SO: THE BARBELL. Track everything cheaply; commit to what\n#   replicates.\n#     CHEAP  - skim broadly, note what exists, no commitment\n#     COSTLY - adopt only after independent confirmation, or after you\n#              reproduce the result on YOUR data\n#   The middle - adopting on a single impressive headline - is the\n#   expensive mistake, and it is the default behaviour.",
          "caption": "A true-zero method produced a +4.1 point headline by being the best of thirty tries — which is why the number of configurations tried is the first question to ask."
        }
      ],
      "useCases": [
        "Allocating your own learning time, which the stock model turns into an arithmetic question with a defensible answer rather than a matter of temperament.",
        "Deciding whether to adopt a new technique or dependency, where requiring an independent replication nearly doubles the precision of what you take on.",
        "Reading a paper or release announcement, where the number of configurations tried and the presence of a tuned baseline discount the headline before you read further.",
        "Deciding what to teach or document, where the durability score separates content worth writing carefully from content that will be wrong within a year."
      ],
      "pitfalls": [
        "Concluding from the 7.2 ratio that you should study only principles. Tool value saturates rather than being worthless, and you cannot ship on principles - the modelled optimum is 70/30.",
        "Taking a headline improvement at face value. A method with a true effect of zero reported +4.1 points as the best of thirty configurations, and replicated at +0.1.",
        "Ignoring how many things were tried. The expected inflation grows with the count, so a reported gain is partly a measure of tuning effort - and the count is rarely stated.",
        "Comparing against an untuned baseline. The asymmetry between a carefully tuned method and a default baseline accounts for a large share of reported gains.",
        "Adopting on a single positive result. Requiring an independent second raised adopted-set precision from 48% to 84% for twelve points of recall, which is a good trade when adoption is expensive.",
        "Treating a model that returns a non-answer as evidence that the question has none. The first allocation model gave a meaningless 50/50 because it was symmetric, and the fix was modelling saturation.",
        "Spending equal care on all learning. The durability score separates memory arithmetic and evaluation discipline, which stay true, from compiler flags and SDK surfaces, which do not."
      ],
      "connections": [
        {
          "ref": "frontier-frameworks/eval-harnesses",
          "text": "The measurement discipline this depends on - suite size, scorer choice and contamination are what make a replication meaningful rather than a second guess."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The same selection-over-noise mechanism at a smaller scale - tuning optimism from choosing the best of many configurations on a noisy metric."
        },
        {
          "ref": "interview-capstone/portfolio-capstone",
          "text": "Where the tuning-optimism result reappears as a take-home discipline, with the phantom gain isolated on a true-zero task."
        },
        {
          "ref": "mlops/ml-strategy",
          "text": "Adoption as an organizational decision, where the cost of a dependency and a migration is what makes the precision-over-recall trade worthwhile."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "The same statistics in another domain - small suites inverting rankings, and why the number of tasks decides whether a comparison carries information."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the stock model of knowledge?",
          "a": "You add by studying and lose by forgetting, so retained knowledge settles at study rate over decay rate - inversely proportional to the decay rate."
        },
        {
          "q": "What ratio does that give?",
          "a": "With half-lives of 60 months for principles and 8 for tool trivia, an hour on principles yields about 7.2 times the retained knowledge."
        },
        {
          "q": "So should you study only principles?",
          "a": "No. Tool value saturates - you need fluent-enough-to-ship - while principle depth keeps scaling, which gives an optimum near 70/30."
        },
        {
          "q": "What made the first model fail?",
          "a": "It was symmetric, so the optimum came out 50/50 - a meaningless non-answer. Modelling tool saturation is what produced a real interior optimum."
        },
        {
          "q": "What does a non-answer from a model tell you?",
          "a": "That the model is wrong, not that the question has no answer. The symmetry was the bug."
        },
        {
          "q": "What did the true-zero method report?",
          "a": "+4.1 points as the best of thirty configurations, and +0.1 on replication. The gap is pure selection."
        },
        {
          "q": "Why does that happen?",
          "a": "The expected maximum of n noisy draws grows like sigma times the square root of two log n, so reporting the best of many selects on noise."
        },
        {
          "q": "What does the size of a headline partly measure?",
          "a": "How many knobs were tuned. The configuration count is rarely reported, which is why the discount has to be estimated."
        },
        {
          "q": "What did requiring a second positive buy?",
          "a": "Adopted-set precision from 48% to 84%, at a cost of twelve points of recall."
        },
        {
          "q": "When is that trade best?",
          "a": "When good ideas are rare and adoption is expensive - which describes most infrastructure changes, given migration and maintenance costs."
        },
        {
          "q": "What is the barbell strategy?",
          "a": "Track everything cheaply, commit only to what replicates. The middle - adopting on one impressive headline - is the expensive mistake."
        },
        {
          "q": "What is the durability score?",
          "a": "Principle content times one minus churn rate. It separates memory arithmetic and evaluation discipline from compiler flags and SDK surfaces."
        }
      ],
      "standard": [
        {
          "q": "How should you allocate learning time in a fast-moving field?",
          "a": "ROUGHLY 70% PRINCIPLES AND 30% TOOLS, AND THE MODEL IS WORTH SHOWING BECAUSE BOTH HALVES OF THAT ANSWER ARE NON-OBVIOUS. THE STOCK MODEL. Treat knowledge as a stock: you add to it by studying and lose it by forgetting, so what you retain settles where those balance, at study rate over decay rate. Steady-state stock is therefore INVERSELY proportional to the decay rate. With half-lives of about 60 months for principles and 8 for tool trivia, an hour spent on principles yields roughly 7.2 times the retained knowledge of an hour spent on tool specifics. That is the argument for mechanism-first learning as arithmetic rather than as taste. WHY THE ANSWER IS NOT 100% PRINCIPLES. Because tool value SATURATES. You need to be fluent enough to ship - to actually use the framework, read its errors, know its idioms - and past that point additional tool depth buys very little. Principle depth does not saturate; it keeps compounding, because a mechanism understood more deeply explains more situations. Putting a saturating return against a scaling one produces an interior optimum, around 70/30. THE HONESTY NOTE THAT MATTERS MOST HERE. The first version of this model gave 50/50 - a meaningless non-answer - because it used a symmetric objective in which steady stock was simply proportional to study rate on both sides. A symmetric objective has a symmetric optimum, so the model was answering a question about its own construction rather than about learning. Modelling tool SATURATION is what produced a real optimum, which means the 70/30 comes from an asymmetry in RETURNS rather than from the decay rates alone. AND THE GENERAL LESSON: a model that returns a non-answer is telling you the model is wrong, not that the question has no answer. WHAT THIS LOOKS LIKE IN PRACTICE. The durable half is mechanisms: memory arithmetic, the roofline argument, why paging beats contiguous allocation, why purity enables composable transforms, what a rank constraint means, and the evaluation discipline - the scorer being the eval, interval widths, swap-averaging. Those have been true for years and will stay true. The perishable half is API surfaces, SDK versions, compiler flags, current model names and leaderboard positions - and you need enough of it to work, refreshed continuously and cheaply. THE PRACTICAL SCHEDULE I would suggest: read mechanisms deliberately and slowly, in a form you can reconstruct - which usually means building the thing rather than reading about it, as this whole module did. Skim tooling broadly and often, without trying to retain the details, since they will change and you can look them up. And re-derive a mechanism occasionally rather than re-reading it, since retrieval is what slows the decay.",
          "deepDive": {
            "q": "How do you decide whether to adopt a new technique?",
            "a": "BY DISCOUNTING THE HEADLINE, THEN REQUIRING A REPLICATION BEFORE COMMITTING - and the two measurements make both steps quantitative. STEP 1 - DISCOUNT THE HEADLINE. A method with a TRUE effect of ZERO, reported as the best of thirty configurations, showed +4.1 points. It replicated at +0.1. The entire gap was selection: the expected maximum of n noisy draws grows like sigma times the square root of two log n, so reporting the best of many tries inflates the result even when there is nothing there. The consequence is that a reported gain's SIZE is partly a measure of how many knobs were tuned, not only of how good the method is. THE QUESTIONS THAT ESTIMATE THE DISCOUNT. How many configurations were tried - which is rarely reported, and its absence is itself informative. Was the baseline TUNED, or run at defaults? That asymmetry - a carefully tuned method against a default baseline - accounts for a large share of reported gains in this field and is easy to miss because it looks like a fair comparison. Was the comparison COMPUTE-matched, or is the improvement partly more computation? Is the benchmark public and therefore possibly contaminated, which 22-09 shows is linear and invisible? And has anyone independent reproduced it? STEP 2 - REQUIRE A SECOND POSITIVE. Adopting only after an independent confirmation raised the precision of the adopted set from 48% to 84%, at a cost of twelve points of recall. Nearly doubling precision for twelve points of recall is a good trade whenever adoption is expensive - and an infrastructure change is expensive: migration effort, people to retrain, a dependency to maintain, and a rollback path to build. The mechanism is Bayesian: when the base rate of genuinely good ideas is LOW, a single positive is weak evidence and an independent second is strong. So the rarer real advances are, the more this filter is worth. THE BARBELL THAT FOLLOWS. On the cheap end, track everything - skim releases, note what exists, understand roughly what a new thing claims - because that costs almost nothing and keeps you from being surprised. On the expensive end, commit only to what has replicated, or to what you have reproduced on YOUR data. The middle is the mistake: adopting on one impressive headline, which is the default behaviour and the one the measurements argue against. THE EXCEPTION I WOULD ALLOW, since a strict rule would be wrong: reproduce it yourself on your own data and your own evaluation. That is an independent replication - your own - and it is often cheaper than waiting, especially for a change that is easy to trial. The point is not to wait for permission from the literature; it is to require evidence that is not a single selected number from someone whose incentives favour a large one. AND THE SELF-APPLICATION, which keeps this honest: everything in this module is subject to the same discount. The measurements here are on toys with known ground truth, which makes them reproducible and does not make them universal - and the right response to any of them is the same one recommended above."
          }
        },
        {
          "q": "Why do published improvements shrink on replication?",
          "a": "BECAUSE PUBLICATION SELECTS ON THE MAXIMUM, AND A MAXIMUM OVER NOISE IS BIASED UPWARD - which the measurement isolates by using a method whose true effect is exactly zero. THE EXPERIMENT: take a method that does NOTHING, evaluate thirty configurations of it against a baseline on a noisy metric, and report the best. It showed +4.1 points. Replicating the reported configuration independently gave +0.1. All of the apparent effect was the selection. THE MECHANISM. Each configuration's measured result is the true effect plus noise. Taking the maximum over n draws selects for large POSITIVE noise as well as for genuine effect, and the expected inflation grows like the noise scale times the square root of two log n. So even with a true effect of zero, the best of thirty looks meaningfully positive - and the more you try, the larger the phantom. WHY THIS IS ENDEMIC RATHER THAN DISHONEST. Researchers try many variants, which is good practice. They report the one that worked, which is normal. Reviewers prefer positive results, so negative ones are less likely to appear. Nobody has to behave badly for the literature to acquire this bias, which is why it persists and why individual scepticism has to substitute for a systemic fix. THE COMPOUNDING FACTORS specific to this field. Baselines are frequently untuned while the proposed method is carefully tuned - a comparison that looks fair and is not. Evaluations are often small enough that the noise is large, which makes the max-over-noise term bigger. Compute is not always matched, so some of the gain is more computation rather than a better method. And public benchmarks may be contaminated, which is linear and invisible in the score. Each of these pushes in the same direction. HOW I DISCOUNT IN PRACTICE. Weight independent replications far above originals. Ask how many configurations were tried, and treat the absence of that number as a reason for a larger discount. Look for whether the baseline was tuned with comparable effort. Prefer results on private or freshly-constructed evaluation sets. And be more sceptical of larger reported gains on smaller evaluations, since that combination is exactly what the selection mechanism produces. WHAT I WOULD DO RATHER THAN DESPAIR: reproduce it yourself on your own data, which is both an independent replication and the only one that measures the thing you care about. That is often cheaper than the debate about whether to believe the paper, and it converts a literature question into an engineering one. AND THE SELF-DIRECTED VERSION, which is the harder discipline: when you tune thirty configurations and report your best, you are doing exactly this to yourself. The fix is a held-out set touched once, and it is the same fix as the tuning-optimism result in cross-validation - which is the same mechanism at a smaller scale."
        },
        {
          "q": "What makes a piece of knowledge durable?",
          "a": "TWO FACTORS THAT MULTIPLY: HOW MUCH OF IT IS PRINCIPLE, AND HOW FAST ITS DOMAIN CHURNS. The durability score is principle content times one minus churn rate, and applying it to a body of material sorts what deserves careful study from what deserves a skim. WHAT SCORES HIGH, using this module's own content as the example. MEMORY ARITHMETIC - gigabytes equals parameters times bytes, and the KV-cache formula. That is true for every model in this architecture family on every accelerator, and it decides deployment questions today and will next year. THE ROOFLINE ARGUMENT - arithmetic intensity against the hardware ratio, which explains why elementwise chains are bandwidth-bound and why LLM decode is too. It follows from a hardware trend that has been consistent for decades. EVALUATION DISCIPLINE - the scorer is the eval, interval widths, swap-averaging cancelling an antisymmetric bias, contamination being linear and invisible. Those are properties of measurement, not of any harness. ALLOCATION STRUCTURE - why paging beats contiguous reservation, which is an operating-systems result from the 1960s that arrived here wearing a new name. And MATHEMATICAL FACTS - a rank-r product cannot represent a rank-k update for k above r. WHAT SCORES LOW. API surfaces and SDK method names. Compiler flags and mode names. Current model identifiers and leaderboard positions. Library-specific configuration. Every one of these is genuinely useful and every one has a half-life measured in months - which is fine, because you look them up. THE ASYMMETRY THAT MAKES THIS ACTIONABLE: the two categories deserve different LEARNING METHODS, not just different amounts of time. Durable material is worth learning in a form you can RECONSTRUCT - which in practice means deriving it or building it rather than reading it, because a mechanism you have built is one you can rebuild. Perishable material is worth learning in a form you can LOOK UP - bookmarks, a scratch file, familiarity with where the documentation lives. Trying to memorize an API is wasted effort and trying to look up a mechanism mid-problem does not work. HOW I WOULD APPLY IT TO A NEW TOPIC. Ask what would still be true if the current tool were replaced tomorrow. If the answer is 'most of it', study it properly. If the answer is 'almost none of it', get fluent enough to ship and move on. And notice when a supposedly new idea is an old one renamed - paged attention as virtual memory, adapters as low-rank updates, continuous batching as work-conserving scheduling - because recognizing the precedent both accelerates the learning and tells you the idea is durable, since it already survived one turnover."
        },
        {
          "q": "How would you keep up without spending all your time reading?",
          "a": "WITH A BARBELL: CHEAP BROAD TRACKING AND EXPENSIVE NARROW COMMITMENT, and nothing in the middle - because the middle is where the effort goes and the returns are worst. THE CHEAP END. Skim broadly and frequently, with the goal of knowing what EXISTS rather than how it works. Read abstracts, release notes and summaries. Note the claim and move on. The value is that you are not surprised later and you know where to look when a problem arises - and it costs very little because you are deliberately not retaining details. This is where tool churn is handled: you do not need to learn each release, you need to know it happened. THE EXPENSIVE END. When something is relevant to a problem you actually have, go deep - and go deep on the MECHANISM rather than the interface, because that is the part with a five-year half-life. Build it if you can; the module's own pedagogy is the argument, since teaching vLLM by simulating paged allocation produces understanding that survives vLLM. And require evidence before committing: an independent replication, or your own reproduction on your own data, which the measurement values at nearly doubled precision for twelve points of recall. WHAT NOT TO DO, which is the middle: reading every paper in moderate depth, adopting on a single impressive headline, or trying to keep current with every framework's release notes at a level you could act on. That consumes the most time and returns the least, because moderate depth on perishable material decays before you use it and single-headline adoption has 48% precision. THE FILTERS THAT MAKE SKIMMING EFFICIENT. Prefer things that have survived a while - a technique still in use after two years has passed a replication test the literature did not run deliberately. Prefer independent replications over originals. Notice when something is an old idea renamed, which both speeds the learning and signals durability. And discount headlines by the number of configurations tried, which is usually unstated and whose absence is itself a signal. THE PRACTICE I WOULD ADD, because it addresses decay rather than acquisition: re-derive occasionally instead of re-reading. Retrieval slows forgetting far more than review does, and a mechanism you can reconstruct from scratch is one that has genuinely entered the durable stock. Writing it down in your own words works for the same reason. AND THE ALLOCATION, to close the loop: roughly 70% of deliberate learning time on mechanisms, 30% on tools, with the tool portion refreshed continuously and cheaply rather than studied intensively. Principle-heavy, not principle-only - because the 30% is what lets you ship, and a person who understands every mechanism and cannot use the tools has optimized the wrong objective."
        },
        {
          "q": "What would you distrust in this module itself?",
          "a": "MOST OF THE SPECIFIC NUMBERS, AND ALMOST NONE OF THE MECHANISMS - which is the module's own thesis applied to itself, and it would be inconsistent not to do it. WHAT I WOULD DISTRUST. Every measured figure here comes from a TOY with known ground truth. The 6.4x from paged allocation is a simulation of allocation behaviour, not a benchmark of any implementation. The 12x jit speedup is one function on one machine. The rank elbow is a constructed rank-2 task whose parameter ratio at 32 by 32 badly understates real widths. The 7.2 ratio in the learning model depends entirely on two assumed half-lives that were chosen, not measured. None of these transfer as numbers, and quoting them as though they did would be exactly the error 22-09 warns about. WHAT I WOULD TRUST MORE. The MECHANISMS and their directions. Contiguous reservation wastes the gap between expected and maximum length - that follows from the arithmetic and holds anywhere. Elementwise operations are bandwidth-bound because arithmetic intensity is about one - that follows from a hardware ratio. A rank-r product cannot represent a higher-rank update - that is linear algebra. Position bias is antisymmetric and cancels under swapping while length bias is symmetric and does not - that is a property of the transformation. Those survive because they are derivations rather than observations. WHAT I WOULD ACTIVELY CHECK before relying on any of it. Re-run the calculation with YOUR parameters - your length distribution for the paging decision, your task for the rank sweep, your workload for the compile decision. Every one of these lessons provides a model you can re-run in an afternoon, which is more useful than the number it produced, and that is deliberate. THE PLACES I THINK ARE WEAKEST. The learning-allocation model is the softest thing here: the half-lives are assumptions, the saturation curve is a modelling choice, and the 70/30 is sensitive to both. What I would defend is the STRUCTURE - that decay rates differ, that tool value saturates and principle depth does not, and therefore that the optimum is interior and principle-heavy. The specific split is illustrative. And the compiler lesson measured mechanisms rather than torch.compile itself, because it could not run - which is honest and is also a real gap. AND WHY SAYING THIS MATTERS RATHER THAN UNDERMINING THE MODULE: a body of work that names its own limits is easier to use correctly than one that does not, because a reader can tell which parts to lean on. The module has argued throughout that a claim without its regime is a superstition. Exempting itself would make the argument decorative, and the discount it recommends for other people's headlines is the discount it earns for its own."
        },
        {
          "q": "How does this capstone close the module?",
          "a": "BY MEASURING THE THESIS THE MODULE HAS BEEN ASSERTING SINCE THE FIRST LESSON. Every lesson here claimed that mechanisms outlive tools and taught accordingly - vLLM without vLLM, Optax without Optax, Triton in numpy, a graph IR and interpreter by hand. That is a pedagogical choice and it needed justification beyond preference. The stock model supplies one: retained knowledge is study rate over decay rate, so with half-lives of 60 months against 8, an hour on principles yields about 7.2 times the retained stock. The module's method is an allocation decision with arithmetic behind it. AND THE MODEL CORRECTS THE OVERREACH, which is the part I would want remembered. The ratio alone implies studying only principles, and that is wrong, because tool value SATURATES - you need fluent-enough-to-ship - while principle depth keeps scaling. The optimum is interior, around 70/30, and it is principle-HEAVY rather than principle-only. A person who understands every mechanism and cannot use the tools has optimized the wrong objective. THE HONESTY NOTE IS THE BEST SINGLE THING HERE. The first model was symmetric and returned 50/50 - a meaningless non-answer that could easily have been reported as a finding about balance. The correct reading was that the MODEL was wrong, and modelling tool saturation is what produced a real optimum. 'A non-answer means your model is wrong, not that the question has none' is the most transferable sentence in the lesson, and it belongs to the same family as the chance-level accuracy being a data bug and the warm cache measuring the cache. THE OTHER TWO RESULTS make you a better reader of everything else. Headlines regress because they are maxima over noise - a true-zero method reported +4.1 as the best of thirty and replicated at +0.1 - so the size of a claim partly measures how many knobs were turned. And requiring an independent second positive nearly doubles adopted-set precision for twelve points of recall, which is the barbell: track everything cheaply, commit only to what replicates. AND IT CLOSES BY RANKING ITS OWN CONTENT, which is the right way for a module about durability to end. Deep: memory arithmetic, the roofline argument, evaluation discipline, allocation structure, the rank constraint. Skim: API surfaces, compiler flags, model names, leaderboard positions. If the module is right, that ranking is what a reader should still be able to use when every tool it named has been replaced."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Knowledge as a stock",
        "back": "dS/dt = u − λS ⇒ S* = u/λ, so retained knowledge is INVERSELY proportional to the decay rate. Half-lives 60mo (principles) vs 8mo (tool trivia) ⇒ an hour on principles yields **~7.2× the retained stock**."
      },
      {
        "type": "formula",
        "front": "★ Why 70/30 and not 100/0",
        "back": "Tool value SATURATES (you need fluent-enough-to-ship, then it flattens); principle depth KEEPS SCALING. A saturating return against a scaling one gives an INTERIOR optimum ≈ 70% principles / 30% tools. Principle-HEAVY, not principle-only."
      },
      {
        "type": "pitfall",
        "front": "★ A non-answer means the MODEL is wrong",
        "back": "The first allocation model was symmetric (stock ∝ study rate both sides) and returned a meaningless 50/50 — which could have been reported as a finding about balance. Modelling tool SATURATION produced a real optimum. Same family as chance-accuracy = a data bug."
      },
      {
        "type": "formula",
        "front": "★ Headlines regress: max over noise",
        "back": "E[max of n draws] ≈ σ√(2 ln n). A method with a TRUE effect of ZERO, reported as best-of-30-configs, showed **+4.1 pt** and replicated at **+0.1**. The reported SIZE partly measures how many knobs were turned."
      },
      {
        "type": "intuition",
        "front": "The questions that discount a claim",
        "back": "How many configurations were tried (rarely reported — its absence is a signal) · was the BASELINE tuned or default · compute-matched · public benchmark ⇒ possible contamination · any independent replication?"
      },
      {
        "type": "intuition",
        "front": "Why the bias is endemic, not dishonest",
        "back": "Researchers try many variants (good practice), report what worked (normal), reviewers prefer positives. Nobody behaves badly and the literature still acquires the bias — which is why individual scepticism substitutes for a systemic fix."
      },
      {
        "type": "formula",
        "front": "★ A second independent positive",
        "back": "Adopted-set precision **0.48 → 0.84** at **−12 pt recall**. Nearly doubling precision for 12 points is a good trade whenever ADOPTION is expensive. Bayesian: when good ideas are RARE, one positive is weak and a second independent one is strong."
      },
      {
        "type": "intuition",
        "front": "★ The BARBELL",
        "back": "CHEAP end: skim broadly, know what EXISTS, retain nothing. EXPENSIVE end: go deep on the mechanism when you have the problem, and commit only after replication (or your own reproduction). **The middle — adopting on one headline — is the expensive default.**"
      },
      {
        "type": "formula",
        "front": "The DURABILITY SCORE",
        "back": "principle_content × (1 − churn). DEEP: memory arithmetic · roofline/arithmetic intensity · eval discipline · paging vs contiguous · the rank constraint · purity→transforms. SKIM: API surfaces, compiler flags, model names, leaderboard positions."
      },
      {
        "type": "intuition",
        "front": "The two categories need different METHODS",
        "back": "Durable → learn in a form you can RECONSTRUCT (derive it, build it). Perishable → learn in a form you can LOOK UP. Memorizing an API is wasted; looking up a mechanism mid-problem doesn't work. And re-DERIVE occasionally — retrieval beats review."
      },
      {
        "type": "intuition",
        "front": "Notice when a \"new\" idea is an old one renamed",
        "back": "Paged attention = virtual memory · continuous batching = work-conserving scheduling · adapters = low-rank updates. Recognizing the precedent both accelerates the learning AND signals durability — it already survived one turnover."
      },
      {
        "type": "intuition",
        "front": "★ Apply the discount to THIS module",
        "back": "Distrust the NUMBERS — all from toys with known ground truth (6.4×, 12×, the rank elbow, even the 7.2 from two ASSUMED half-lives). Trust the MECHANISMS and their directions, because they're derivations. Re-run each model with your own parameters."
      }
    ],
    "refs": [
      {
        "title": "Ioannidis (2005), Why Most Published Research Findings Are False",
        "url": "https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0020124"
      },
      {
        "title": "Recht et al. (2019), Do ImageNet Classifiers Generalize to ImageNet?",
        "url": "https://arxiv.org/abs/1902.10811"
      },
      {
        "title": "Henderson et al. (2017), Deep Reinforcement Learning That Matters",
        "url": "https://arxiv.org/abs/1709.06560"
      },
      {
        "title": "Open Science Collaboration (2015), Estimating the Reproducibility of Psychological Science",
        "url": "https://www.science.org/doi/10.1126/science.aac4716"
      },
      {
        "title": "Cepeda et al. (2006), Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis",
        "url": "https://psycnet.apa.org/record/2006-05288-004"
      }
    ],
    "demos": [
      "calibration",
      "cross-validation",
      "bagging-boosting",
      "classification-metrics"
    ]
  }
};
