// GENERATED from content/lessons/frontier-frameworks/open-weight-models.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/open-weight-models/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "quantization": "Quantization",
      "pruning": "Pruning & Sparsity",
      "distillation": "Knowledge Distillation",
      "kv-cache": "KV Cache"
    }
  }
};
