// GENERATED from content/lessons/pytorch-internals/torchscript.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/pytorch-internals/torchscript/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "torchscript": {
    "level": "core",
    "body": {
      "intuition": [
        "Eager PyTorch is a Python program. That is its great virtue - you can print, branch, debug, and use any library - and it is exactly what you cannot ship to a production server that must not run a Python interpreter, or to a mobile device, or into a C++ service. TorchScript is the answer to that: a statically-typed subset of Python with its own intermediate representation, serializable to a single file, and executable by LibTorch with no Python at all. Getting a model into it means confronting a fact eager mode works hard to hide - that your model is a PROGRAM, not a graph, and the two are not the same thing.",
        "There are two ways across and they fail in opposite ways. TRACING runs your model on an example input and records the operations that actually executed. It handles almost any Python because it never reads your code - and that is the problem: it records the TRACE, not the PROGRAM. Any data-dependent branch is resolved once, at trace time, and baked in. A model with an if on a tensor value is silently frozen into whichever branch that example took, and the exported artifact confidently computes the wrong thing for every input that should have taken the other one. Some cases emit a TracerWarning; shape specialization often does not. SCRIPTING instead compiles your source, so control flow survives - at the cost of only accepting a typed subset of Python, which means annotations, homogeneous containers, and no arbitrary objects.",
        "This is the module's theme with an unusually sharp edge, because the failure is not just silent, it is silent in the ARTIFACT you deploy rather than in the code you test. And there is a second honesty owed here. TorchScript is in maintenance mode. It is still widely deployed, still the thing you will meet in existing systems, and still the shortest path into LibTorch - but the direction PyTorch is investing in is torch.export with AOTInductor and ExecuTorch for deployment, and torch.compile for training. So learn TorchScript because you will encounter it and because its tracing-versus-scripting distinction is the conceptual foundation for everything that followed, and start new export work by looking at torch.export first."
      ],
      "math": [
        {
          "h": "What tracing actually captures",
          "paras": [
            "Tracing evaluates your function at one point and records the operations that ran. Formally it captures the restriction of f to the single control-flow path that the example input selected - not f itself.",
            "So tracing is exact if and only if your model's execution path does not depend on the values or the shapes of its inputs."
          ],
          "tex": "\\mathrm{trace}(f, x_0) = f\\big|_{\\,\\Pi(x_0)}, \\qquad \\Pi(x_0) = \\text{the branch path taken at } x_0 \\\\[4pt] \\mathrm{trace}(f,x_0)(x) = f(x) \\iff \\Pi(x) = \\Pi(x_0)",
          "texNote": "Read the condition literally: the trace is correct only on inputs that take the SAME path. That covers a great many models - a fixed stack of layers has one path - and it excludes anything with a data-dependent branch, a loop whose count depends on the input, or an early exit. The dangerous part is that violating the condition produces a wrong answer rather than an error."
        },
        {
          "h": "Scripting compiles the source into a typed IR",
          "paras": [
            "Scripting reads your Python and compiles it, so branches and loops become branches and loops in the IR. The price is a type system: every value needs a static type, and the default for an unannotated argument is Tensor.",
            "That default is the single most common scripting error - a function taking an int or a list is assumed to take a Tensor and fails at compile time with a message about the wrong type."
          ],
          "tex": "\\text{Python source} \\;\\xrightarrow{\\;\\text{compile}\\;}\\; \\text{typed IR}, \\qquad \\tau \\in \\{\\text{Tensor}, \\text{int}, \\text{float}, \\text{bool}, \\text{List}[\\tau], \\text{Dict}[\\tau,\\tau], \\text{Optional}[\\tau], \\ldots\\}",
          "texNote": "Containers must be HOMOGENEOUS - List[int] is fine, a list mixing ints and tensors is not - and Optional requires explicit refinement, meaning you must check for None in a way the compiler can see before using the value. These constraints are why scripting a research codebase is real work: the code is usually valid Python and not valid typed Python."
        },
        {
          "h": "Freezing as partial evaluation",
          "paras": [
            "After scripting or tracing an eval-mode module, freezing inlines the parameters as constants and folds everything that can be computed from them. It is partial evaluation of the program with the weights known.",
            "This is what enables optimizations that are unavailable while the weights are still mutable attributes - constant folding, dead-code elimination of training-only branches, and fusing a BatchNorm into the preceding convolution."
          ],
          "tex": "\\text{freeze}: \\; g(\\theta, x) \\;\\longmapsto\\; g_{\\theta}(x) \\quad \\text{with } \\theta \\text{ folded in and } \\text{training-only paths pruned}",
          "texNote": "The consequence is that a frozen module is deployment-only: parameters are no longer separately addressable, you cannot load a new state_dict into it, and the training branches are gone. Freeze as the last step of an export pipeline, never as something you keep around and expect to update."
        }
      ],
      "code": [
        {
          "h": "The tracing trap, and the verification that catches it",
          "paras": [
            "The canonical failure in three lines. What matters is not the example but the habit that follows it: an export is not done until you have checked it against eager on inputs that exercise every path and several shapes."
          ],
          "code": "class Dynamic(nn.Module):\n    def forward(self, x):\n        if x.sum() > 0:          # <-- DATA-DEPENDENT BRANCH\n            return x * 2\n        return x - 1\n\nt = torch.jit.trace(Dynamic(), torch.ones(3))   # traces the POSITIVE branch\nt(torch.ones(3))     # 2, 2, 2   correct\nt(-torch.ones(3))    # -2,-2,-2  WRONG - eager gives -2,-2,-2? no: -1-1 = -2...\n#                       eager returns x-1 = -2; the trace returns x*2 = -2.\n#                       They agree BY COINCIDENCE here, which is exactly how\n#                       this bug survives a casual check. Use asymmetric values.\n\n# SCRIPTING KEEPS THE BRANCH:\ns = torch.jit.script(Dynamic())\ns(-torch.ones(3))    # correct - the `if` is compiled into the IR\n\n# THE VERIFICATION THAT IS NOT OPTIONAL:\ndef verify(eager, exported, inputs):\n    eager.eval(); exported.eval()\n    for x in inputs:\n        a, b = eager(x), exported(x)\n        assert torch.allclose(a, b, atol=1e-5), f\"MISMATCH on shape {tuple(x.shape)}\"\n\nverify(model, traced, [\n    torch.randn(1, 3, 224, 224),      # different BATCH sizes - tracing\n    torch.randn(8, 3, 224, 224),      # specializes on shape silently\n    torch.randn(1, 3, 256, 256),      # different spatial size\n    torch.full((4, 10), -5.0),        # inputs that take the OTHER branch\n])\n# Test every branch and several shapes. A single-input check passes for a\n# model that is completely broken for half its inputs.",
          "caption": "Note the coincidence in the comment: the two branches happened to agree on that input, which is precisely how a baked-in branch survives a casual check. Verification needs inputs chosen to exercise different paths and different shapes, not one convenient example."
        },
        {
          "h": "Scripting in practice: annotations, mixing, and freezing",
          "paras": [
            "Scripting a real model is mostly a typing exercise. The mixing rule is the practical escape hatch: script the parts with control flow, trace the parts that are awkward to type, and compose them."
          ],
          "code": "class Net(nn.Module):\n    def __init__(self, layers: nn.ModuleList, use_aux: bool):\n        super().__init__()\n        self.layers = layers\n        self.use_aux: bool = use_aux          # annotate, or it becomes a Tensor\n\n    def forward(self, x: torch.Tensor,\n                mask: Optional[torch.Tensor] = None) -> torch.Tensor:\n        #        ^^^^^^^^ UNANNOTATED ARGS DEFAULT TO Tensor - the single most\n        #        common scripting error. An int, a bool, or a list must be said.\n        if mask is not None:                  # explicit refinement: the compiler\n            x = x * mask                      # needs to SEE the None check\n        for layer in self.layers:             # ModuleList iteration is supported;\n            x = layer(x)                      # a plain list would not be\n        return x\n\nscripted = torch.jit.script(Net(...))\n\n# MIXING is the practical answer for real models:\n#   - script the module that has the control flow\n#   - trace the submodules that are painful to type (third-party layers,\n#     anything using numpy or arbitrary Python objects)\n#   - a scripted module can CALL a traced one, and vice versa\nclass Wrapper(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.backbone = torch.jit.trace(third_party_net, example)  # no branches\n    def forward(self, x, n: int):\n        for _ in range(n):                     # real control flow, so SCRIPT\n            x = self.backbone(x)\n        return x\nfinal = torch.jit.script(Wrapper())\n\n# FREEZE LAST, for deployment only:\nfrozen = torch.jit.freeze(scripted.eval())    # inlines weights as constants,\n                                              # folds constants, prunes\n                                              # training-only branches, allows\n                                              # conv-BN fusion.\n# After freezing you cannot load a new state_dict - parameters are gone as\n# separately addressable attributes. It is the last step, not a checkpoint.\nfrozen.save(\"model.pt\")     # loadable from C++ with torch::jit::load, no Python",
          "caption": "Unannotated arguments default to Tensor, which is the error people hit first. The mixing pattern is what makes scripting tractable on real code: script the control flow, trace the awkward leaves, and compose them."
        }
      ],
      "useCases": [
        "Deploying into a C++ service or any environment that must not run a Python interpreter - a saved TorchScript archive is loaded by LibTorch with torch::jit::load and needs nothing from your training environment.",
        "Mobile and embedded inference, historically via PyTorch Mobile, where the absence of a Python runtime is a hard constraint rather than a performance preference.",
        "Removing the GIL from a serving path, since a scripted module executes without holding it - which is what allows genuine multi-threaded request handling in a single process rather than one process per worker.",
        "Locking a model into a self-contained artifact for reproducibility or handover: the archive carries the code and the weights together, so it cannot silently drift when the surrounding Python package is upgraded."
      ],
      "pitfalls": [
        "Tracing a model with data-dependent control flow. The trace records the branch your example happened to take and bakes it in, so the exported artifact confidently computes the wrong thing for every input that should have gone the other way. Script anything with an if or a data-dependent loop.",
        "Verifying an export on a single input. A model that is broken for half its inputs passes that check, and branches can coincidentally agree on convenient values. Verify across several shapes and inputs chosen to exercise each path.",
        "Ignoring TracerWarning. It is emitted precisely when the tracer notices a tensor value being converted to a Python number or used in control flow, which is the signature of the problem above. It is a warning that should be treated as an error.",
        "Forgetting that tracing specializes on shape. Many traces work only for the batch size and spatial dimensions used at trace time, and this is often silent rather than warned. Test other shapes explicitly, and use dynamic-shape support deliberately if you need it.",
        "Leaving arguments unannotated when scripting. Anything without an annotation is assumed to be a Tensor, so an int, bool or list argument fails to compile with a message about types that reads as unrelated to the actual mistake.",
        "Freezing before you are finished. Freezing inlines the weights as constants, so parameters are no longer separately addressable and you cannot load a new state_dict. It is the last step of an export pipeline, not an intermediate artifact.",
        "Assuming the exported model is faster. TorchScript's optimizer does some fusion, and the main reason to use it is removing the Python runtime rather than raw speed. If throughput is the goal, measure - and look at torch.compile or a dedicated inference runtime instead."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/torch-fx",
          "text": "The same tracing-versus-source distinction one level up. fx traces symbolically to produce a Python-level graph you can rewrite, and it hits exactly the same wall on data-dependent control flow - which is why torch.compile's Dynamo, which handles it by breaking the graph, superseded both."
        },
        {
          "ref": "mlops/torchscript-onnx",
          "text": "The deployment-side treatment: what an exported artifact means operationally, how ONNX compares as a target, and where torch.export and ExecuTorch fit as the direction the ecosystem is moving."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "The training-side successor. Dynamo captures graphs from real Python bytecode and simply BREAKS the graph at anything it cannot handle, which is why it works on code that scripting rejects and tracing silently corrupts."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Post-training quantization historically ran on scripted or fx-traced graphs, because quantization is a graph rewrite - you need a data structure to insert observers into, and a Python program is not one."
        },
        {
          "ref": "pytorch-internals/nn-module-patterns",
          "text": "Why scripting can iterate an nn.ModuleList and not a plain Python list of modules: the registration mechanism is what makes the structure visible to the compiler, exactly as it makes it visible to the optimizer."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is TorchScript?",
          "a": "A statically-typed subset of Python with its own IR, serializable to a single archive and executable by LibTorch without a Python interpreter."
        },
        {
          "q": "What is the difference between tracing and scripting?",
          "a": "Tracing runs the model on an example and records the operations that executed. Scripting compiles your source code, so control flow survives."
        },
        {
          "q": "What does tracing get wrong?",
          "a": "Any data-dependent control flow. It records the branch the example took and bakes it in, so the artifact is wrong for inputs that should take the other branch."
        },
        {
          "q": "When is a trace exact?",
          "a": "Exactly when every input takes the same control-flow path as the example. A fixed stack of layers qualifies; anything with a data-dependent if or loop does not."
        },
        {
          "q": "What is a TracerWarning?",
          "a": "A warning emitted when the tracer sees a tensor converted to a Python number or used in control flow - the signature of the baked-in-branch problem. Treat it as an error."
        },
        {
          "q": "What does scripting cost?",
          "a": "It only accepts a typed subset of Python: static types everywhere, homogeneous containers, explicit Optional refinement, and no arbitrary Python objects."
        },
        {
          "q": "What type does an unannotated argument get when scripting?",
          "a": "Tensor. That default is the most common scripting error - an int, bool or list argument must be annotated."
        },
        {
          "q": "Can you mix tracing and scripting?",
          "a": "Yes, and it is the practical approach: script the parts with control flow and trace the submodules that are awkward to type. Each can call the other."
        },
        {
          "q": "What does torch.jit.freeze do?",
          "a": "Inlines parameters as constants on an eval-mode module, enabling constant folding, dead-code elimination of training branches, and conv-BN fusion."
        },
        {
          "q": "Why can you not load a state_dict into a frozen module?",
          "a": "Freezing folded the parameters into the graph as constants, so they no longer exist as separately addressable attributes. Freeze last."
        },
        {
          "q": "Why does TorchScript help with the GIL?",
          "a": "A scripted module executes without holding the interpreter lock, so a single process can genuinely serve requests on multiple threads."
        },
        {
          "q": "What is TorchScript's status today?",
          "a": "Maintenance mode. It is still widely deployed and is the shortest path into LibTorch, but new work should look at torch.export with AOTInductor or ExecuTorch."
        }
      ],
      "standard": [
        {
          "q": "Explain tracing versus scripting and how you would decide between them.",
          "a": "WHAT EACH DOES. Tracing runs your model on an example input and records the sequence of tensor operations that actually executed. It never looks at your source, so it handles arbitrary Python - numpy calls, third-party libraries, weird objects - because none of that appears in the recording. Scripting compiles the Python source into a typed IR, so branches become branches and loops become loops, at the cost of accepting only a statically-typed subset of the language. THE FAILURE MODES ARE OPPOSITE, which is the useful framing. Tracing accepts almost everything and can be WRONG. Scripting rejects a lot and, when it succeeds, is faithful. Concretely: trace a model containing if x.sum() > 0 and the trace records only the branch that example took. The exported artifact then computes the wrong function for every input that should have gone the other way, with no error and often no warning. Formally, a trace is exact only on inputs that take the same control-flow path as the example. THE SECOND TRACING TRAP is shape specialization. Many traces are valid only for the batch size and spatial dimensions used at trace time, and this is frequently silent. So a model traced on batch 1 can produce wrong results or fail obscurely on batch 8. HOW I WOULD DECIDE. Does the forward pass contain data-dependent control flow - an if on a tensor value, a loop whose count comes from the data, an early exit, a variable-length sequence handled with a Python loop? If yes, SCRIPT it, because tracing is not merely suboptimal, it is incorrect. If the model is a fixed sequence of operations - which most vision backbones and most transformer blocks are - tracing is fine and much less work. IN PRACTICE I WOULD MIX. Script the module that owns the control flow; trace the submodules that are painful to type, such as third-party layers or anything touching non-tensor Python. A scripted module can call a traced one and vice versa, so you pay the typing cost only where it buys you correctness. THE VERIFICATION IS NOT OPTIONAL, and this is what I would emphasize as the practice. Compare the exported module against eager on a set of inputs chosen to exercise EVERY branch and SEVERAL shapes, including a different batch size. A single-input check passes for a model that is broken for half its inputs, and I have seen branches coincidentally agree on the convenient test value, which is how this bug survives review. And treat TracerWarning as an error, because it fires exactly when the tracer notices the situation that causes this. THE HONEST CODA. TorchScript is in maintenance mode; the direction is torch.export with AOTInductor and ExecuTorch. I would still learn this distinction, because it is the conceptual foundation for every graph-capture mechanism that followed, including fx and Dynamo.",
          "deepDive": {
            "q": "torch.compile handles code that scripting rejects and tracing corrupts. What does it do differently?",
            "a": "THE KEY DIFFERENCE: DYNAMO OPERATES ON PYTHON BYTECODE, AND IT IS ALLOWED TO GIVE UP LOCALLY. TorchScript's two approaches are both all-or-nothing on a whole function: scripting must compile everything or it errors, and tracing must record everything or it silently omits it. Dynamo instead analyses the bytecode frame by frame, capturing what it can into an FX graph and inserting a GRAPH BREAK at anything it cannot - a data-dependent branch, a call into arbitrary Python, a print statement, a numpy operation. Execution falls back to the interpreter at the break, then resumes capturing after it. So a function becomes several compiled graphs with Python in between, rather than one graph or a failure. That single design decision is why torch.compile works on real research code that scripting rejects. WHAT REPLACES THE CORRECTNESS PROBLEM: GUARDS. Because the captured graph is specialized to the conditions that held at capture time - shapes, dtypes, the values of Python variables that affected the trace, the types of arguments - Dynamo records a set of GUARDS alongside it. At every call it checks the guards; if they hold, the compiled graph runs; if not, it recompiles for the new conditions and caches that too. This is the crucial contrast with tracing: TorchScript's trace silently assumes its specialization remains valid, while Dynamo CHECKS. A data-dependent branch that would have been baked in by a trace instead becomes either a guard that triggers recompilation or a graph break, and in both cases the answer is correct. DYNAMIC SHAPES ARE HANDLED, not assumed away. By default Dynamo specializes on shape for the first compilation, then if it sees a different shape it recompiles with symbolic shapes so one graph covers a range. That is why dynamic=True exists and why you can see two compilations rather than one - the first is specialized, the second is generalized. WHAT IT COSTS. Compilation time on first call and on every guard miss. Graph breaks reduce the optimization opportunity, since the compiler can only fuse within a graph - so a loop containing a break is compiled many small pieces. And debugging requires new tools: torch._dynamo.explain reports the graph count and the reason for each break, which is the thing to look at when compiled code is not faster. THE HONEST SUMMARY OF THE PROGRESSION. Tracing: easy, silently wrong on control flow. Scripting: correct, rejects real code. fx: symbolic tracing, same control-flow wall as tracing, but produces a Python-level graph that is pleasant to rewrite. Dynamo: captures from bytecode, breaks the graph rather than failing or lying, and guards its specializations. Each step traded a different thing, and the one that won traded completeness of the graph for never being wrong - which, given that the failure mode of the alternatives was a silently incorrect deployed artifact, is the right trade."
          }
        },
        {
          "q": "How would you set up a verification process for an exported model?",
          "a": "The premise is that export failures are SILENT, so verification is not a formality - it is the only thing standing between you and a wrong artifact in production. I would build it as a test that runs in CI on every export. LEVEL 1: NUMERICAL EQUIVALENCE, on a deliberately chosen input set. Compare eager against the exported module with torch.allclose at a stated tolerance, over: several BATCH SIZES including one and something large, since tracing specializes on shape; several SPATIAL or SEQUENCE lengths if the model accepts them; inputs constructed to take EACH BRANCH of any conditional in the model, which requires knowing what the branches are; and edge inputs - all zeros, extreme magnitudes, an empty or length-one sequence. The branch coverage is the part people skip and it is the part that catches the tracing bug. I would also avoid symmetric test values, because I have seen two branches coincidentally agree on ones and zeros. LEVEL 2: MODE AND STATE. Assert the exported module is in eval mode and that it was exported from an eval-mode model - a model traced in training mode bakes in dropout and BatchNorm's batch-statistics path, which is a completely different function. Confirm buffers made it across by comparing state, since a buffer registered as a plain attribute will be absent. LEVEL 3: THE FULL PIPELINE, not just the model. Most production mismatches are not in the model at all - they are preprocessing. Normalization constants, channel order, resize interpolation, tokenizer version. I would verify end to end from raw input to final output, comparing against the training-time pipeline, because a correct model with different preprocessing is indistinguishable from a broken model in the metrics and far more common. LEVEL 4: A GOLDEN-OUTPUT REGRESSION TEST. Save a fixed set of inputs and the outputs the model produced at export time, and check them on every subsequent export. This catches drift from library upgrades, from a changed op implementation, and from someone editing the model. It is the highest-value long-lived test here. LEVEL 5: PERFORMANCE, with the caveat that it is a separate question. Measure latency at the batch sizes you serve, with proper warm-up and synchronization, and compare against the eager baseline - because the assumption that export makes things faster is often wrong, and if the only benefit was removing Python you want to know that explicitly. WHAT TOLERANCE TO USE. Exact equality is the wrong target: fusion changes the order of floating-point operations, so small differences are expected and legitimate. I would set atol around 1e-5 for fp32 and much looser for fp16 or bf16, and - more importantly - check the DISTRIBUTION of differences rather than only the max, because a max difference of 1e-3 concentrated on one element means something different from the same max spread across everything. THE PROCESS POINT. All of this runs automatically or it will not be run. An export script that prints 'exported successfully' without comparing anything is the normal state of affairs, and it is why this class of bug reaches production."
        },
        {
          "q": "A model works in eager mode but fails or misbehaves after scripting. Walk through the debugging.",
          "a": "SCRIPTING FAILURES ARE LOUD, which is a mercy, so the work is usually interpreting an unhelpful message. Common categories, in the order I meet them. (1) TYPE ERRORS FROM MISSING ANNOTATIONS. Every unannotated argument is assumed to be Tensor, so passing an int produces an error complaining about a type mismatch somewhere downstream of the real cause. Fix: annotate every non-tensor argument and every non-tensor attribute assigned in __init__. This is by far the most common category and the message rarely points at the line that needs the annotation. (2) HETEROGENEOUS CONTAINERS. A list holding mixed types, or a dict with non-uniform values, cannot be typed. Fix: make them homogeneous, or use a NamedTuple or a dataclass that the compiler understands. (3) OPTIONAL WITHOUT REFINEMENT. Using a value of type Optional[Tensor] requires the compiler to SEE a None check in a form it can follow - an explicit if x is not None, not a truthiness test and not a check hidden in a helper. (4) UNSUPPORTED PYTHON. Arbitrary classes, closures over non-scriptable objects, *args in some positions, exceptions with non-constant messages, and calls into numpy or any third-party library. Fix: move it out of the scripted region, or wrap it - a submodule that is traced rather than scripted, or a function marked with torch.jit.ignore so it stays a Python call. (5) INHERITANCE AND super() patterns that the compiler cannot resolve. THE FAILURE THAT IS NOT LOUD, and the one worth the most attention: the module scripts successfully and behaves DIFFERENTLY. Causes I would check in order. (a) Was the model in eval mode? A model scripted in training mode carries dropout active and BatchNorm on the batch-statistics path. (b) Are buffers present? A tensor stored as a plain attribute rather than a registered buffer will not be there. (c) Is there control flow that depends on a Python attribute the compiler CONSTANT-FOLDED? An attribute like self.use_aux annotated as bool is compiled as a value, so changing it after scripting has no effect - the branch is already resolved. This surprises people and is the scripted analogue of the tracing trap. (d) Did a traced submodule get mixed in, bringing its own baked-in branch with it? That is a real and easily missed combination: the outer module scripts faithfully and an inner traced module is silently wrong. HOW I WOULD LOCALIZE. Script the SMALLEST unit that fails rather than the whole model - go submodule by submodule, since the error message from a large module is nearly useless. Print scripted_module.code, which shows the compiler's view of your function and is often immediately revealing about what it thought your types were. And .graph for the IR when the source view is not enough. THE PREVENTION. Script early and continuously rather than at the end of a project. A codebase written with scripting in mind - annotations everywhere, ModuleList rather than list, no arbitrary objects in forward - scripts in minutes; the same model written freely can be days of work to convert. That is a real argument for deciding your deployment path before you write the model rather than after.",
          "deepDive": {
            "q": "What actually happens to a Python attribute like self.use_aux when you script a module, and why does changing it afterwards do nothing?",
            "a": "WHAT THE COMPILER DOES. When you script a module, the compiler walks its attributes. Parameters and buffers become graph inputs that stay mutable. But a plain Python attribute of a primitive type - a bool, an int, a float, a string - is treated as a CONSTANT of the compiled module unless you take specific steps otherwise. Its value at scripting time is baked into the IR. WHY THAT IS THE RIGHT DEFAULT. It enables the optimization that makes scripting worth doing. If self.use_aux is a constant False, then the branch if self.use_aux: ... is dead code, and the compiler eliminates it entirely - along with any submodules only reachable through it. Constant folding then propagates: shapes computed from constant dimensions become constants, arithmetic on them is evaluated at compile time, and whole subgraphs disappear. A model with several configuration flags can shrink substantially. Treating those attributes as mutable would forbid all of it. THE CONSEQUENCE. scripted.use_aux = True after scripting either raises, or sets an attribute that nothing reads, depending on how it was declared. The compiled graph does not contain a branch to take. This is genuinely surprising the first time and it is the scripted analogue of the tracing trap: a decision that was dynamic in Python has become static in the artifact. The difference from tracing is that here it is intentional and documented rather than an accident - but the practical effect on someone who did not expect it is the same. HOW TO GET MUTABILITY WHEN YOU NEED IT. (1) Make it a TENSOR - a registered buffer holding a flag - so the branch becomes a real conditional on a tensor value in the IR, which scripting supports. Costs you the dead-code elimination. (2) Make it an ARGUMENT to forward, annotated as bool, so the caller supplies it per call. Usually the cleanest design and it makes the dependency explicit. (3) Export SEPARATE ARTIFACTS for each configuration, which is often the right production answer - two models rather than one model with a switch, each fully optimized. THE DESIGN LESSON I WOULD DRAW. Export forces you to decide which of your model's behaviours are CONFIGURATION, fixed at build time, and which are INPUT, varying per call. Eager mode lets you leave that undecided because a Python attribute can be either. A compiled artifact cannot, and the compiler will make the decision for you - toward constant - if you do not make it yourself. Recognizing that this is a modelling decision rather than a framework quirk is what makes the behaviour predictable, and it applies equally to torch.export's distinction between static and dynamic dimensions."
          }
        },
        {
          "q": "Why would you export a model at all? Argue the cases for and against.",
          "a": "THE CASES FOR, and I would separate them because they are often conflated. (1) NO PYTHON RUNTIME. This is the strongest and most common reason. A C++ service, a mobile app, an embedded device, a game engine - environments where shipping a Python interpreter plus a package environment is impossible or unacceptable. An exported archive loads with LibTorch and needs nothing from your training setup. Nothing else solves this. (2) THE GIL. A scripted module executes without holding the interpreter lock, so one process can serve concurrent requests on multiple threads. In eager Python you typically need one process per concurrent request stream, which multiplies memory by the number of workers - and for a large model that is the difference between fitting on a machine and not. (3) DEPLOYMENT HERMETICITY. The archive contains the code and the weights together, so it cannot break when someone upgrades a package in the serving image. That reproducibility is worth real money in an environment where model and infrastructure are deployed on different schedules. (4) OPTIMIZATION OPPORTUNITY. Freezing enables constant folding, dead-code elimination and operator fusion that are unavailable while weights are mutable Python attributes. Real, though usually smaller than people expect. THE CASES AGAINST. (1) IT IS WORK, and the work is proportional to how dynamically the model was written. A model written without export in mind can take days to convert, and the conversion pressure can distort the model code - people remove clean Python constructs to satisfy a compiler. (2) DEBUGGING GETS HARDER. You lose print, breakpoints, and readable stack traces inside the exported region. The workflow becomes verify-by-comparison rather than inspect-directly. (3) THE CORRECTNESS RISK IS REAL. Tracing can silently produce a wrong artifact, and that risk is only managed by a verification discipline that must itself be built and maintained. (4) SPEED IS OFTEN NOT THE BENEFIT. People export expecting throughput and get parity, then attribute the disappointment to configuration. If speed is the goal, torch.compile or a dedicated inference runtime is usually the better lever. (5) MAINTENANCE MODE. TorchScript specifically is no longer where the investment is going, so building new infrastructure on it means building on something that will not improve. HOW I WOULD DECIDE. If the serving environment requires no-Python, export is not a choice and the question is only which target - and for new work I would evaluate torch.export with AOTInductor, or ONNX if the runtime ecosystem matters, before TorchScript. If you serve from Python and throughput is the concern, do NOT export first: measure, then try torch.compile, then consider a specialized runtime like a dedicated inference server. And if you serve from Python and the concern is process memory from many workers, the GIL argument makes export worth it even at parity latency. THE THING I WOULD SAY TO A TEAM. Decide the deployment path BEFORE writing the model, because it is nearly free to write export-friendly code from the start and expensive to retrofit. That is the single highest-leverage decision in this area and it is usually made last."
        },
        {
          "q": "Compare TorchScript, torch.export, ONNX and torch.compile.",
          "a": "They are frequently discussed as alternatives and they answer different questions, so I would separate the axes first: TRAINING versus INFERENCE, and STAYING IN PYTORCH versus LEAVING IT. torch.compile IS FOR TRAINING AND EAGER SPEED, and it does not produce a portable artifact. Dynamo captures graphs from Python bytecode, breaking the graph wherever it cannot proceed, and Inductor generates fused kernels. You stay in Python, you keep debuggability, and you get speed. It is not a deployment mechanism - the compiled artifact lives in the process. TORCHSCRIPT IS AN INFERENCE ARTIFACT that leaves Python. Tracing or scripting produces a serializable archive runnable by LibTorch. It is mature, widely deployed, and in maintenance mode. Its distinctive problem is that tracing can silently be wrong and scripting rejects real code. TORCH.EXPORT IS THE INTENDED SUCCESSOR to TorchScript for capture. It produces a full-graph, ahead-of-time representation with explicit handling of dynamic shapes - you declare which dimensions are dynamic rather than hoping the trace generalizes. It is strict about capture: rather than silently baking in a branch, it fails and tells you, which is the correctness lesson from tracing applied deliberately. From an exported program you can go to AOTInductor for a compiled shared library, or to ExecuTorch for mobile and embedded. ONNX IS AN INTERCHANGE FORMAT, and that is its whole point - it is not a PyTorch thing. Export to ONNX when the RUNTIME is not PyTorch: ONNX Runtime, TensorRT, CoreML, a vendor accelerator, or a team that does not use PyTorch. The cost is operator coverage - an op without an ONNX equivalent needs a custom implementation or a model change - and the fact that you are now debugging across a format boundary. HOW I WOULD CHOOSE. Serving from Python and want speed: torch.compile, and nothing else. Serving from C++ or mobile, new project: torch.export, then AOTInductor or ExecuTorch. Serving from C++, existing system already on it: TorchScript, because it works and rewriting has no payoff. Targeting a non-PyTorch runtime or specialized hardware: ONNX, accepting the coverage tax. THE CONCEPTUAL THREAD, which is what I would want to leave someone with. All four are answering the same question - how do you get a graph out of a Python program - and they differ in what they do when the program is not a graph. Tracing lies. Scripting refuses unless you rewrite. fx traces symbolically and hits the same wall as tracing. Dynamo breaks the graph and guards its assumptions. torch.export fails loudly and makes you declare your dynamism. The industry converged on the last two because the failure mode of the first - a silently incorrect deployed artifact - is the worst one available, and being told what your model cannot do is far better than being given something that quietly does the wrong thing."
        },
        {
          "q": "How does export interact with quantization and other graph-level optimizations?",
          "a": "THE UNDERLYING REASON THEY ARE CONNECTED: quantization is a GRAPH REWRITE, and a Python program is not a graph. To quantize you must insert observers that watch activation ranges, then replace float operations with quantized ones, then fuse patterns like conv-batchnorm-relu into a single quantized op. Every one of those steps needs a data structure representing the model's operations and their connectivity. Eager mode does not have one - it has a Python function - which is why eager-mode quantization requires you to manually place QuantStub and DeQuantStub modules and manually specify fusion lists. That is tedious and error-prone, and it exists only because the graph is absent. WHAT A CAPTURED GRAPH BUYS. With a scripted, fx-traced, or exported graph, the toolchain can find the patterns automatically: walk the graph, match conv followed by batchnorm followed by relu, replace with the fused quantized module. fx-graph-mode quantization was built for exactly this and it is substantially less manual than the eager path. The modern direction is quantization on top of torch.export's representation, for the same reason. THE FUSIONS THAT MATTER, and why the graph is required. CONV-BN FUSION is the canonical one: in eval mode, batch normalization is an affine transformation with fixed parameters, so it can be folded into the preceding convolution's weights and bias exactly - a numerically exact rewrite that removes every BN op. You cannot do this without knowing that a particular BN follows a particular conv, which is a graph property. Similarly for fusing activation functions into the preceding operation to avoid a round trip through memory. LINEAR ALGEBRA FUSIONS - combining the separate query, key and value projections into one matmul - are the same category. THE INTERACTION WITH FREEZING. torch.jit.freeze inlines parameters as constants, which is what makes conv-BN fusion possible in the scripted path: while the weights are mutable attributes the compiler cannot fold them, because they could change. Freezing is the step that converts them into something foldable. This is why freezing is not merely a cleanup - it is what unlocks the optimization. THE ORDER THAT MATTERS IN PRACTICE. Prepare and calibrate quantization on the captured graph, convert, THEN export or freeze for deployment. Doing it in the wrong order - freezing first, then trying to quantize - leaves you with a graph whose parameters are already constants and whose structure has been altered, and the quantization patterns may no longer match. WHAT I WOULD WARN ABOUT. Every one of these rewrites changes numerics, and conv-BN fusion is exact only in EVAL mode with the BN in its inference formulation - fusing a training-mode BN is wrong. So the verification discipline from earlier in this lesson applies with more force after an optimization pass than before it: compare against eager, on multiple inputs, and look at the distribution of differences rather than only the maximum."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "What tracing actually captures",
        "back": "trace(f, x0) = f restricted to the control-flow PATH taken at x0. It is exact iff every input takes that same path. Violating it produces a WRONG ANSWER, not an error - the artifact confidently computes the other branch."
      },
      {
        "type": "intuition",
        "front": "Tracing vs scripting fail in OPPOSITE directions",
        "back": "TRACING accepts almost any Python and can be silently WRONG (it never reads your code). SCRIPTING refuses a lot and, when it succeeds, is FAITHFUL. Practical answer: mix - script the control flow, trace the awkward-to-type leaves."
      },
      {
        "type": "pitfall",
        "front": "Verify an export on MULTIPLE branches and shapes",
        "back": "A single-input check passes for a model broken on half its inputs - and two branches can COINCIDENTALLY agree on symmetric test values like ones/zeros. Also test different batch sizes: tracing specializes on shape, often silently."
      },
      {
        "type": "pitfall",
        "front": "Unannotated scripting arguments default to Tensor",
        "back": "The single most common scripting error, and the message points downstream of the real cause. Annotate every non-tensor argument AND every non-tensor attribute assigned in __init__."
      },
      {
        "type": "intuition",
        "front": "Why changing a scripted module's bool attribute does nothing",
        "back": "Plain primitive attributes are compiled as CONSTANTS, which is what enables dead-code elimination of the branches they guard. The decision that was dynamic in Python became static in the artifact. Use a buffer, a forward argument, or separate artifacts."
      },
      {
        "type": "definition",
        "front": "torch.jit.freeze",
        "back": "Partial evaluation: inlines parameters as CONSTANTS on an eval-mode module, enabling constant folding, dead-code elimination of training branches, and conv-BN fusion. Afterwards you CANNOT load a state_dict - it is the last step, not a checkpoint."
      },
      {
        "type": "intuition",
        "front": "Why quantization needs a captured graph",
        "back": "Quantization is a GRAPH REWRITE - insert observers, replace ops, fuse conv-bn-relu patterns. A Python program is not a data structure you can match patterns against, which is exactly why EAGER-mode quantization requires manual QuantStubs and fusion lists."
      },
      {
        "type": "intuition",
        "front": "Conv-BN fusion is exact, and only in eval mode",
        "back": "In eval, BN is a fixed affine map, so it folds into the preceding conv's weights exactly (~1e-7). It requires knowing WHICH bn follows WHICH conv - a graph property - and it requires the weights to be constants, which is what freezing provides."
      },
      {
        "type": "pitfall",
        "front": "Treat TracerWarning as an error",
        "back": "It fires precisely when the tracer sees a tensor converted to a Python number or used in control flow - the signature of the baked-in-branch bug. It is the one warning in this area that reliably indicates a correctness problem."
      },
      {
        "type": "intuition",
        "front": "The real reason to export is NOT speed",
        "back": "It is removing the Python runtime (C++/mobile), escaping the GIL (one process serving many threads instead of one process per worker), and hermetic artifacts. If speed is the goal, measure - torch.compile or a dedicated runtime is usually the better lever."
      },
      {
        "type": "definition",
        "front": "TorchScript vs torch.export vs ONNX vs torch.compile",
        "back": "compile = TRAINING/eager speed, stays in Python, no artifact. TorchScript = inference artifact leaving Python, MAINTENANCE MODE. torch.export = its successor, explicit dynamic shapes, FAILS LOUDLY instead of baking in. ONNX = interchange for NON-PyTorch runtimes."
      },
      {
        "type": "intuition",
        "front": "What Dynamo does that scripting and tracing do not",
        "back": "It works on BYTECODE and is allowed to give up LOCALLY - inserting a GRAPH BREAK rather than failing or lying - and it GUARDS its specializations, rechecking them per call and recompiling on a miss. Tracing assumes its specialization holds; Dynamo verifies it."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: TorchScript documentation",
        "url": "https://pytorch.org/docs/stable/jit.html"
      },
      {
        "title": "PyTorch: Loading a TorchScript Model in C++",
        "url": "https://pytorch.org/tutorials/advanced/cpp_export.html"
      },
      {
        "title": "PyTorch: torch.export",
        "url": "https://pytorch.org/docs/stable/export.html"
      },
      {
        "title": "PyTorch: Quantization - eager, fx graph mode, and export paths",
        "url": "https://pytorch.org/docs/stable/quantization.html"
      },
      {
        "title": "ONNX: Open Neural Network Exchange",
        "url": "https://onnx.ai/"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "batching",
      "mixed-precision"
    ]
  }
};
