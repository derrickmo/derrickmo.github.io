// GENERATED from content/lessons/mlops/docker.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/mlops/docker/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "docker": {
    "level": "core",
    "body": {
      "intuition": [
        "A container is the seam between ONE ENVIRONMENT AND ANOTHER, and its job is to make that seam explicit rather than implicit. Without it the environment is whatever happened to be installed on the machine, which is a dependency you cannot version, cannot inspect and cannot reproduce - the missing fourth coordinate from the tracking lesson.",
        "The failure this prevents is 'it works on my machine', and the failure it does NOT prevent is the one that catches ML teams: an unpinned dependency inside the image. A Dockerfile that installs a package without an exact version produces a DIFFERENT image every time it is built, so the container is reproducible only in the sense that it reproduces the build instructions - not the environment. Pinning the image tag and floating the packages inside it is the most common version of this.",
        "For ML the additional constraint is that the environment includes the ACCELERATOR STACK - the driver on the host, the CUDA runtime in the image, and the framework build compiled against a specific version of it. Those three have to be compatible, only one of them is in your image, and a mismatch surfaces as a runtime error or, worse, as a silent fallback to CPU that turns a 20 ms inference into 2 seconds."
      ],
      "math": [
        {
          "h": "What a container does and does not isolate",
          "paras": [
            "The container carries user-space: your code, libraries, and the CUDA runtime. It shares the host kernel and therefore the GPU driver.",
            "That boundary is where ML-specific container problems live, and it is why 'it runs in the container' is not a portability guarantee for GPU workloads."
          ],
          "tex": "\\underbrace{\\text{host kernel} + \\text{GPU driver}}_{\\text{SHARED, not in the image}} \\;\\big|\\; \\underbrace{\\text{CUDA runtime} + \\text{framework} + \\text{your code}}_{\\text{in the image}}",
          "texNote": "So a container that works on one host can fail on another with a different driver, and the compatibility constraint is driver >= runtime. Pinning the image does not pin the driver, which is the one part of the stack you do not control."
        },
        {
          "h": "Reproducible means the same bytes, not the same instructions",
          "paras": [
            "A build is reproducible when rebuilding produces an identical image. Instructions that resolve to 'latest' at build time break that, and they are the default in most package managers.",
            "The failure is silent: the build succeeds, and the image differs."
          ],
          "tex": "\\texttt{pip install torch} \\;\\to\\; \\text{whatever is current} \\qquad\\text{vs}\\qquad \\texttt{pip install torch==2.7.1} + \\text{a lockfile with hashes}",
          "texNote": "The base image tag has the same problem: a mutable tag can be repointed, so the same Dockerfile builds a different image next month. Pinning by DIGEST rather than by tag is what makes the base immutable."
        },
        {
          "h": "Layer caching is why build order matters",
          "paras": [
            "Each instruction is a cached layer, and changing one invalidates every layer after it. Ordering from least to most frequently changed is the difference between a ten-second and a ten-minute iteration."
          ],
          "tex": "\\text{base} \\to \\text{system deps} \\to \\text{python deps} \\to \\text{model artifact} \\to \\text{application code}",
          "texNote": "Copying the whole source tree before installing dependencies is the classic mistake: every code change reinstalls every package. Copy the lockfile, install, then copy the code."
        }
      ],
      "code": [
        {
          "h": "The Dockerfile decisions that matter",
          "paras": [
            "Five of them, and the first two are what make the image reproducible at all."
          ],
          "code": "# 1 ★ PIN THE BASE BY DIGEST, not by tag\n#     FROM python:3.11-slim@sha256:...   <- immutable\n#     a mutable tag can be repointed, so the same Dockerfile builds a\n#     different image next month and nothing tells you\n\n# 2 ★ PIN EVERY DEPENDENCY with a lockfile including hashes\n#     an unpinned install makes the build instructions reproducible and\n#     the ENVIRONMENT not, which is the opposite of the point\n\n# 3 LAYER ORDER: least- to most-frequently-changed\n#     base -> system deps -> lockfile + install -> model -> app code\n#     copying the source before installing means every code change\n#     reinstalls every package\n\n# 4 MULTI-STAGE BUILD: compile in a builder, copy artifacts to a slim\n#     runtime. ML images are large; the build toolchain is most of it.\n\n# 5 NON-ROOT USER, no secrets in layers (they persist even if deleted\n#     in a later instruction), and a HEALTHCHECK that exercises the MODEL\n#     rather than just the HTTP port\n\n# ★ Item 5's last clause matters: a liveness probe that hits /health tells\n#   you the process is up. A probe that runs one inference tells you the\n#   model loaded, which is the failure that actually happens.",
          "caption": "A health check that does not touch the model will happily report healthy while every request returns a 500 from a failed model load."
        },
        {
          "h": "The GPU stack, and the failure that is not an error",
          "paras": [
            "Three components must agree and only one is inside your image."
          ],
          "code": "# THE THREE LAYERS\n#   HOST     NVIDIA driver          - NOT in the image, you may not control it\n#   IMAGE    CUDA runtime + cuDNN   - in the image\n#   IMAGE    framework build        - compiled against a specific CUDA\n#   constraint: driver version >= CUDA runtime version\n\n# ★ THE SILENT FAILURE\n#   a mismatch, a missing --gpus flag, or a container without the runtime\n#   often does NOT error - the framework falls back to CPU. Inference goes\n#   from ~20 ms to ~2 s and everything still returns correct answers.\n#   -> ASSERT the device at startup and FAIL if it is not what you expect:\n#        assert torch.cuda.is_available(), 'GPU not visible'\n#      one line, and it converts a 100x slowdown into a crash loop you\n#      notice in minutes rather than a latency regression you argue about\n\n# AND SIZE\n#   a CUDA-enabled framework image is several GB. Multi-stage builds, slim\n#   runtime bases and CPU-only variants for CPU services are the levers,\n#   and image size is a COLD-START cost under autoscaling.",
          "caption": "The CPU fallback is the module's theme in one behaviour: correct answers, wrong system, nothing raised."
        }
      ],
      "useCases": [
        "Any deployment where the serving environment must match the environment a model was validated in, which is every deployment that matters.",
        "Reproducing a training run months later, where the container is the fourth coordinate the tracking lesson said was usually missing.",
        "Local development that matches production, which removes an entire class of 'works locally' investigations.",
        "Batch and scheduled jobs, where the container is the unit the orchestrator schedules and the environment is otherwise whatever the worker node has."
      ],
      "pitfalls": [
        "Pinning the base image by tag rather than by digest. A mutable tag can be repointed, so the identical Dockerfile builds a different image later and nothing reports it.",
        "Installing dependencies without a lockfile. The build instructions are then reproducible and the environment is not, which is the opposite of the point of containerizing.",
        "Copying the source tree before installing dependencies. Every code change invalidates the dependency layer, turning a ten-second rebuild into a ten-minute one.",
        "Assuming the container isolates the GPU driver. The driver is on the host and shared, so a container that works on one node can fail on another, and driver must be at least the CUDA runtime version.",
        "Not asserting the device at startup. A missing GPU usually falls back to CPU silently - correct answers, 100x slower - and one assert turns it into an immediate crash.",
        "Health checks that only probe the HTTP port. They report healthy while every request fails on a model that did not load; the check should run one inference.",
        "Putting secrets in a layer. Layers are immutable and a secret deleted in a later instruction is still present in the earlier one, recoverable from the image."
      ],
      "connections": [
        {
          "ref": "mlops/mlflow",
          "text": "The environment coordinate this makes explicit - the fourth of the four things a reproducible run needs pinned."
        },
        {
          "ref": "mlops/model-serving",
          "text": "What runs inside the container, and why the health check should exercise the model rather than the process."
        },
        {
          "ref": "mlops/cicd",
          "text": "Where the image is built, scanned and promoted, and why an immutable digest is what makes a promotion meaningful."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Why the framework build is compiled against a specific accelerator stack, and what a precision or kernel mismatch does to numerics."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The startup assertions and health checks that turn a silent environment failure into an alert."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a container isolate, and what does it not?",
          "a": "It carries USER-SPACE — code, libraries, CUDA runtime. It SHARES the host kernel and therefore the GPU DRIVER. The driver is not in your image."
        },
        {
          "q": "What's the GPU compatibility constraint?",
          "a": "Host driver version ≥ CUDA runtime version in the image. Pinning the image does not pin the driver, which is the part you may not control."
        },
        {
          "q": "★ What happens on a GPU mismatch?",
          "a": "Usually NOT an error — the framework falls back to CPU. Inference goes from ~20 ms to ~2 s and every answer is still correct. The module's theme in one behaviour."
        },
        {
          "q": "The one-line fix?",
          "a": "`assert torch.cuda.is_available()` at startup. Converts a 100× latency regression you argue about into a crash loop you notice in minutes."
        },
        {
          "q": "★ Tag or digest for the base image?",
          "a": "DIGEST. A mutable tag can be repointed, so the identical Dockerfile builds a different image next month and nothing reports it."
        },
        {
          "q": "Why is an unpinned `pip install` a problem?",
          "a": "It makes the build INSTRUCTIONS reproducible and the ENVIRONMENT not — the opposite of the point. Use a lockfile with hashes."
        },
        {
          "q": "Give the layer ordering rule.",
          "a": "Least- to most-frequently-changed: base → system deps → lockfile + install → model artifact → app code."
        },
        {
          "q": "What breaks if you get it wrong?",
          "a": "Copying the source before installing means every code change invalidates the dependency layer — a ten-second rebuild becomes ten minutes."
        },
        {
          "q": "What should a health check do?",
          "a": "Run ONE INFERENCE, not just probe the HTTP port. A port probe reports healthy while every request 500s on a model that failed to load."
        },
        {
          "q": "Why multi-stage builds?",
          "a": "Compile in a builder, copy artifacts into a slim runtime. The build toolchain is most of an ML image's size, and size is a COLD-START cost under autoscaling."
        },
        {
          "q": "Why are secrets in layers dangerous?",
          "a": "Layers are immutable. A secret deleted in a later instruction is still present in the earlier one and recoverable from the image."
        },
        {
          "q": "Which coordinate does a container pin?",
          "a": "The ENVIRONMENT — the fourth of the four a reproducible run needs (code, data, params, environment), and one of the two usually treated as implicit."
        }
      ],
      "standard": [
        {
          "q": "What does containerization buy an ML system, and what does it not?",
          "a": "IT MAKES THE ENVIRONMENT EXPLICIT, which is the fourth coordinate the tracking lesson identified as usually missing. Without a container, the environment is whatever happened to be installed on the machine — a dependency you cannot version, inspect or reproduce — and 'it worked last month' becomes unanswerable. With one, the environment is an artifact with an identity. WHAT IT DOES NOT BUY IS REPRODUCIBILITY BY ITSELF, and this is the part ML teams get wrong. A Dockerfile that installs packages without exact versions produces a different image every build, so what is reproducible is the INSTRUCTIONS rather than the environment — which is precisely backwards. The same applies to the base image: a mutable tag can be repointed upstream, so the identical Dockerfile builds a different image later and nothing reports it. Pinning by digest and using a lockfile with hashes is what closes that. AND IT DOES NOT ISOLATE THE ACCELERATOR STACK: the container carries the CUDA runtime and the framework build, and the GPU DRIVER lives on the host and is shared, with the constraint that driver version must be at least the runtime version. So a container that works on one node can fail on another, and the one component you cannot pin is the one you do not control.",
          "deepDive": {
            "q": "Which failure mode is the module's theme in a single behaviour?",
            "a": "The GPU failure mode deserves emphasis because it is the module's theme in a single behaviour. A driver mismatch, a missing GPU flag, or a container launched without the accelerator runtime frequently does NOT raise — the framework detects no device and falls back to CPU. Every answer is still correct; inference goes from around twenty milliseconds to around two seconds; and what you observe is a latency regression that gets attributed to load, to the network, or to a noisy neighbour, and argued about for a week. One assertion at startup that the expected device is visible converts that into an immediate crash loop, which is a much better failure: loud, immediate, and unambiguous. That is the general pattern worth extracting for infrastructure work — prefer a startup assertion over a runtime degradation, because a service that refuses to start is diagnosed in minutes and a service that is quietly slow is diagnosed in days. The same reasoning applies to asserting the model version, the artifact hash and the feature schema at startup: each is one line and each converts a silent wrong-configuration into a loud one."
          }
        },
        {
          "q": "How would you structure a Dockerfile for an ML service?",
          "a": "FIVE DECISIONS, AND THE FIRST TWO DETERMINE WHETHER IT IS REPRODUCIBLE AT ALL. PIN THE BASE BY DIGEST rather than by tag, so the foundation is immutable. PIN EVERY DEPENDENCY with a lockfile including hashes, so the environment rather than the instructions is what reproduces. ORDER THE LAYERS from least- to most-frequently-changed — base, system dependencies, lockfile and install, model artifact, application code — because each instruction is a cached layer and changing one invalidates everything after it; copying the source tree before installing dependencies is the classic mistake and turns a ten-second rebuild into a ten-minute one. USE A MULTI-STAGE BUILD, compiling in a builder image and copying only the artifacts into a slim runtime, because ML images are large and the build toolchain is most of that size — and image size is a cold-start cost under autoscaling, so it is a latency concern rather than a tidiness one. AND THE OPERATIONAL DETAILS: a non-root user, no secrets in any layer since layers are immutable and a deleted secret remains recoverable from the earlier one, and a HEALTH CHECK THAT RUNS ONE INFERENCE rather than probing the port.",
          "deepDive": {
            "q": "Why argue for that last item specifically?",
            "a": "That last item is worth arguing for specifically because the default is wrong in a way that matters. A liveness probe hitting an HTTP endpoint tells you the process is running; it tells you nothing about whether the model loaded, whether the weights file was present, or whether the artifact matches what the service expects. A container that starts, fails to load its model, and serves 500s will pass a port-based probe indefinitely and will be kept in the load balancer's rotation. A probe that runs a single inference on a fixed input catches all of that, and if you compare the output against a stored expected value it also catches a wrong model version or a corrupted artifact — which turns the health check into a continuous parity assertion. It costs one small forward pass per probe interval, which is negligible, and it is the difference between an outage that pages immediately and one that manifests as a slowly rising error rate. The model artifact question — where it lives — is the related decision: baking it into the image makes the deployable unit fully immutable and the image large, while mounting it at runtime keeps images small and reintroduces a seam. Baking is usually right for a service, mounting for a platform serving many models."
          }
        },
        {
          "q": "A container works locally and fails in production. How do you diagnose it?",
          "a": "BY ASKING WHAT IS OUTSIDE THE IMAGE, because that is the only thing that can differ if the image is genuinely pinned. THE FIRST CANDIDATE IS THE GPU DRIVER, since it lives on the host and is shared: check the driver version against the CUDA runtime in the image, with the constraint that driver must be at least runtime, and check whether the container was launched with accelerator access at all. If neither, the framework has fallen back to CPU and you are looking at a latency problem rather than a correctness one. THE SECOND IS THE IMAGE ITSELF NOT BEING PINNED — if the base was a mutable tag or the dependencies unpinned, then 'the same image' is not the same image, and the local and production builds happened at different times. Comparing digests settles it in seconds. THE THIRD IS EVERYTHING ELSE OUTSIDE: environment variables, mounted volumes, network policy, secrets, resource limits — a memory limit that triggers an OOM kill under production batch sizes but not under local ones is common, and it presents as a restart loop rather than an error message. THE FOURTH IS ARCHITECTURE, since an image built on one CPU architecture and run on another either fails loudly or runs under emulation, which is slow enough to look like a different problem.",
          "deepDive": {
            "q": "Why does the resource-limit case deserve expanding?",
            "a": "The resource-limit case is worth expanding because it interacts with the serving lesson's batch-size finding. Local testing runs at small batch and low concurrency, production runs at whatever the traffic dictates, and memory scales with both — so a limit that is generous locally is exceeded in production and the container is killed. The symptom is a restart loop with no application error, because the process was terminated by the kernel rather than failing, and logs frequently show nothing useful. Setting limits from a measured production-shaped load test, and logging peak memory, is the preventative. The general point for this lesson is that a container makes the environment explicit and does not make it identical: the image is a variable you now control, and the host, the orchestrator's configuration and the traffic remain variables you did not. Enumerating what is still outside the image — driver, limits, environment, mounts, architecture, network — is a five-minute exercise per service and it is exactly the list you will work through during an incident anyway."
          }
        },
        {
          "q": "How do you handle the model artifact - in the image or mounted?",
          "a": "IT IS A TRADE BETWEEN IMMUTABILITY AND IMAGE SIZE, AND THE RIGHT ANSWER DEPENDS ON WHETHER THE SERVICE SERVES ONE MODEL OR MANY. BAKING THE MODEL INTO THE IMAGE makes the deployable unit fully immutable: one artifact, one digest, one thing to promote and roll back, and no possibility of the code and the weights being mismatched at runtime. That is a strong property and it is what I would default to for a service dedicated to one model. The costs are image size — which is a cold-start cost under autoscaling, so it becomes a latency concern — and that every model update requires a rebuild and redeploy. MOUNTING THE MODEL at runtime, from object storage or a volume, keeps images small and lets you update the model without rebuilding, which is necessary for a platform serving many models or updating frequently. IT REINTRODUCES A SEAM: the code and the weights are now two independently-versioned things, and the service must ASSERT at startup that it loaded the expected artifact — a hash check against a version it was told to expect — or you have exactly the mismatch the registry lesson warned about. Either way, the model version belongs in the health check and in every prediction log.",
          "deepDive": {
            "q": "What makes the mounted option safe?",
            "a": "The assertion is what makes the mounted option safe and it is usually omitted, which is how a service ends up quietly serving last month's weights after a deployment that failed to copy the new ones. Comparing an artifact hash against an expected value at startup costs a few milliseconds and turns that into a refusal to start. Logging the model version with every prediction is the complementary practice: it makes the question 'which model produced this output' answerable from the logs, which is what you need during an incident and what is impossible to reconstruct afterwards. There is also a middle design worth knowing for platforms — bake a default model into the image so the service can always start and serve something, and mount overrides — which gives a working fallback when artifact storage is unavailable, and that failure does occur. The general principle across all three options is the one this module keeps returning to: make the deployable unit explicit, assert its identity at the boundary, and log it, because the alternative is discovering during an outage that nobody knows what is running."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE SEAM IS BETWEEN ENVIRONMENTS, AND CONTAINERIZATION IS THE RARE CASE WHERE THE FIX IS TO MAKE A SEAM EXPLICIT RATHER THAN TO REMOVE IT. Before a container, the environment is an implicit dependency of every result — invisible, unversioned, and only discovered when a machine changes. A container turns it into an artifact with an identity, which is the same move as versioning the preprocessing object or pinning the data: convert an unrecorded variable into a recorded one. WHAT MAKES THE LESSON BELONG HERE is that containerization is routinely believed to have SOLVED reproducibility when it has only relocated it. An unpinned dependency inside the image, or a mutable base tag, means the image is different on each build and nothing says so — a silent failure at the seam you thought you had closed. AND THE GPU FALLBACK IS THE MODULE'S SIGNATURE IN ONE BEHAVIOUR: a driver mismatch produces correct answers, a hundred times slower, with no error. THE CONTRACT is that the runtime environment matches the validated one; the violation is silent because a missing device is a fallback rather than a fault; and the fix is a one-line startup assertion that converts it into a crash.",
          "deepDive": {
            "q": "What principle does that fix generalize into?",
            "a": "That fix generalizes into a principle worth carrying beyond containers: at every boundary, assert the thing you are assuming, at startup, and fail loudly. The model version matches what was promoted. The GPU is visible. The feature schema matches what the model expects. The artifact hash matches the registry. Each is one line, each runs once per process rather than per request, and each converts a silent misconfiguration into an immediate, unambiguous failure. That is cheap in a way that monitoring is not — monitoring detects a problem after it has affected traffic, and a startup assertion prevents the process from ever serving. Given that this module's recurring problem is silence, startup assertions are the highest-leverage practice in it, and they are systematically under-used because they feel defensive rather than productive. The counter-argument is the incident you did not have."
          }
        },
        {
          "q": "What is the honest cost of containerizing an ML workflow?",
          "a": "REAL, AND WORTH STATING SO THE PRACTICE IS ADOPTED RATHER THAN RESENTED. IMAGE SIZE: a CUDA-enabled framework image runs to several gigabytes, which slows builds, consumes registry storage and — importantly — becomes a COLD-START latency cost under autoscaling, so an image nobody optimized directly worsens tail latency during a traffic spike. Multi-stage builds and CPU-only variants for CPU services are the levers. BUILD TIME AND ITERATION FRICTION: a badly-ordered Dockerfile turns every code change into a full dependency reinstall, which is the difference between iterating and not; correct layer ordering fixes most of it, and a local development mount for code is the usual accommodation. GPU COMPLEXITY: the driver-runtime-framework compatibility matrix is a genuine source of difficulty and it is not the container's fault so much as it is exposed by containerizing. AND A REAL ORGANIZATIONAL COST — it moves environment problems from the individual to the platform, which is a net win and does mean someone owns it. WHAT I WOULD NOT CONCEDE is that it is optional for anything that reaches production, because the alternative is an unversioned dependency in every result.",
          "deepDive": {
            "q": "Is there a middle ground during exploration?",
            "a": "There is a pragmatic middle ground for the research phase that is worth naming, since insisting on full containerization during exploration slows people down for benefits they do not yet need. A lockfile plus a documented environment gets most of the reproducibility value at a fraction of the friction, and containerization becomes required at the point where a result is going to be depended on — a published number, a model heading to review, anything that will be reproduced. Making that boundary explicit in a team's conventions avoids both failure modes: exploratory work grinding to a halt under process, and production work resting on somebody's laptop. It is the same graduated standard that applies to testing and to tracking, and the useful framing is that the ceremony should scale with how much the result will be relied on. That framing also makes the conversation about a specific artifact rather than about discipline in general, which is the version people actually act on."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "What a container isolates",
        "back": "USER-SPACE: code, libraries, CUDA runtime. It SHARES the host kernel and therefore the **GPU driver** — which is not in your image and may not be under your control. Constraint: driver ≥ CUDA runtime."
      },
      {
        "type": "pitfall",
        "front": "★ The GPU mismatch is not an error",
        "back": "A driver mismatch or a missing accelerator flag usually falls back to **CPU**: ~20 ms → ~2 s, every answer still correct. The module's theme in one behaviour. Fix: `assert torch.cuda.is_available()` at startup."
      },
      {
        "type": "pitfall",
        "front": "★ Tag vs digest",
        "back": "Pin the base by DIGEST. A mutable tag can be repointed upstream, so the identical Dockerfile builds a different image next month and nothing reports it."
      },
      {
        "type": "intuition",
        "front": "Reproducible = same BYTES, not same instructions",
        "back": "`pip install torch` makes the INSTRUCTIONS reproducible and the ENVIRONMENT not — exactly backwards. Use a lockfile with hashes."
      },
      {
        "type": "definition",
        "front": "Layer ordering",
        "back": "Least- to most-frequently-changed: base → system deps → **lockfile + install** → model artifact → app code. Copying source before installing turns a 10-second rebuild into 10 minutes."
      },
      {
        "type": "intuition",
        "front": "★ The health check should run an inference",
        "back": "A port probe reports healthy while every request 500s on a model that failed to load — and the container stays in rotation. One inference against a stored expected output also catches a wrong model version."
      },
      {
        "type": "pitfall",
        "front": "Secrets in layers",
        "back": "Layers are IMMUTABLE. A secret deleted in a later instruction is still present in the earlier one and recoverable from the image."
      },
      {
        "type": "intuition",
        "front": "Why multi-stage builds",
        "back": "Compile in a builder, copy artifacts to a slim runtime. The build toolchain is most of an ML image's several GB — and image size is a **COLD-START latency cost** under autoscaling, not a tidiness concern."
      },
      {
        "type": "intuition",
        "front": "Works locally, fails in production — what to check",
        "back": "What's OUTSIDE the image: GPU driver · whether the image was actually pinned (compare digests) · env vars, mounts, network, **resource limits** (an OOM kill is a restart loop with no application error) · CPU architecture."
      },
      {
        "type": "intuition",
        "front": "Model in the image or mounted?",
        "back": "BAKED = fully immutable unit, one digest to promote and roll back; costs size and a rebuild per model update. MOUNTED = small images, independent updates, and it REINTRODUCES a seam — so assert the artifact hash at startup."
      },
      {
        "type": "intuition",
        "front": "★ Assert at the boundary, at startup",
        "back": "GPU visible · model version matches what was promoted · artifact hash matches the registry · feature schema matches. One line each, once per process. Converts silent misconfiguration into an immediate crash — cheaper than monitoring, which detects after traffic is affected."
      },
      {
        "type": "intuition",
        "front": "The honest cost",
        "back": "Image size (cold starts) · build friction from bad layer ordering · the driver/runtime/framework compatibility matrix. A lockfile plus a documented env is the right level during EXPLORATION; containerize when a result will be depended on."
      }
    ],
    "refs": [
      {
        "title": "Docker Documentation, Best Practices for Writing Dockerfiles",
        "url": "https://docs.docker.com/build/building/best-practices/"
      },
      {
        "title": "NVIDIA, CUDA Compatibility and the Container Toolkit",
        "url": "https://docs.nvidia.com/deploy/cuda-compatibility/"
      },
      {
        "title": "Kubernetes Documentation, Configure Liveness, Readiness and Startup Probes",
        "url": "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"
      },
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      },
      {
        "title": "Reproducible Builds, Definitions and Techniques",
        "url": "https://reproducible-builds.org/docs/definition/"
      }
    ],
    "demos": [
      "autoscaling",
      "canary-rollout",
      "batching",
      "model-cascade"
    ]
  }
};
