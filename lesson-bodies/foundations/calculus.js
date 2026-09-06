// GENERATED from content/lessons/foundations/calculus.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/calculus/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "calculus": {
    "level": "intro",
    "body": {
      "intuition": [
        "Every model in this curriculum learns the same way: compute how much a small nudge to each parameter would change the loss (the gradient), then step the parameters in the direction that decreases loss the fastest. That's it - that's gradient descent, and it's the engine behind every training loop from a two-parameter linear regression to a 70-billion-parameter language model. The gradient is nothing mysterious: it's just the vector of partial derivatives, each one answering 'if I nudge this one parameter and freeze everything else, how does the output change?'",
        "The chain rule is the reason backpropagation works at all: a deep network is a composition of many simple functions (linear layer, then activation, then linear layer, ...), and the chain rule says the derivative of a composition is the product of the derivatives of its pieces. Backprop (Module 04) is literally the chain rule applied systematically, layer by layer, computed efficiently in one backward pass instead of once per parameter.",
        "The optimization landscape ideas here - convexity, local vs global minima, saddle points, learning rate - explain *why* training sometimes struggles: a badly-chosen learning rate can overshoot or crawl, a saddle point can look locally like 'no direction improves things' even though far-away regions do better, and second-order curvature (how the gradient itself is changing) is what separates a well-conditioned optimization problem from an ill-conditioned one that zig-zags for thousands of steps."
      ],
      "math": [
        {
          "h": "Gradient descent as repeated first-order improvement",
          "paras": [
            "The gradient of a scalar loss with respect to a parameter vector points in the direction of steepest *increase*; stepping in the opposite direction, scaled by a learning rate, is guaranteed (for small enough steps, on a smooth-enough function) to decrease the loss - this simple update rule, applied millions of times, is the entirety of how neural networks learn."
          ],
          "tex": "\\theta_{t+1} = \\theta_t - \\eta \\nabla_\\theta \\mathcal{L}(\\theta_t) \\qquad \\nabla_\\theta \\mathcal{L} = \\left[\\frac{\\partial \\mathcal{L}}{\\partial \\theta_1}, \\dots, \\frac{\\partial \\mathcal{L}}{\\partial \\theta_n}\\right]^\\top",
          "texNote": "Each parameter moves opposite its own partial derivative, scaled by the learning rate eta - a small enough eta guarantees the loss doesn't increase on a smooth function."
        },
        {
          "h": "The chain rule: why backprop is possible",
          "paras": [
            "For a composed function L(f(g(x))), the derivative with respect to x is the product of each stage's local derivative - this is what lets a deep network's loss gradient with respect to an early layer's weights be computed by multiplying local Jacobians backward through the network, rather than re-deriving a new formula for every layer depth."
          ],
          "tex": "\\frac{d}{dx}\\, L(f(g(x))) = L'(f(g(x))) \\cdot f'(g(x)) \\cdot g'(x)",
          "texNote": "Each factor is a 'local' derivative of one stage evaluated at that stage's input - backprop computes these left-to-right in the forward pass, then multiplies right-to-left in the backward pass."
        }
      ],
      "code": [
        {
          "h": "Gradient descent on a 2-D loss surface, from scratch",
          "paras": [
            "Minimizing a simple quadratic bowl by hand, comparing a well-chosen learning rate to one that's too large - the exact failure mode that motivates learning-rate schedules and adaptive optimizers."
          ],
          "code": "import numpy as np\n\n# L(w) = 0.5 * (a*w1^2 + b*w2^2)  -- an ill-conditioned bowl if a >> b\na, b = 10.0, 1.0\ngrad = lambda w: np.array([a * w[0], b * w[1]])\nloss = lambda w: 0.5 * (a * w[0]**2 + b * w[1]**2)\n\ndef run_gd(lr, steps=30, w0=np.array([1.0, 1.0])):\n    w = w0.copy()\n    history = [loss(w)]\n    for _ in range(steps):\n        w = w - lr * grad(w)\n        history.append(loss(w))\n    return history\n\ngood = run_gd(lr=0.15)     # converges steadily\ntoo_big = run_gd(lr=0.25)  # 1/a = 0.1 is the stability boundary along the steep axis -> diverges\nprint(f\"good lr final loss: {good[-1]:.6f}\")\nprint(f\"too-big lr final loss: {too_big[-1]:.2e}\")  # blows up",
          "caption": "Along the steep axis (curvature a=10), the stable learning-rate ceiling is roughly 2/a - overshoot it and the loss diverges instead of converging, the textbook 'zig-zag then explode' failure mode."
        },
        {
          "h": "Autograd computes the chain rule for you",
          "paras": [
            "The same gradient computed by hand above, now via PyTorch's autograd - the mechanism every model in this curriculum relies on instead of hand-deriving derivatives."
          ],
          "code": "import torch\n\nw = torch.tensor([1.0, 1.0], requires_grad=True)\na, b = 10.0, 1.0\nloss = 0.5 * (a * w[0]**2 + b * w[1]**2)\n\nloss.backward()             # walks the computation graph backward via the chain rule\nprint(w.grad)                # tensor([10., 1.]) - matches grad(w) above exactly\n\n# verify against finite differences (the numerical ground truth)\neps = 1e-4\nw_np = w.detach().numpy()\nnumerical = np.array([\n    (loss_fn := lambda v: 0.5*(a*v[0]**2 + b*v[1]**2))(w_np + eps*np.array([1,0])) - loss_fn(w_np - eps*np.array([1,0])),\n    loss_fn(w_np + eps*np.array([0,1])) - loss_fn(w_np - eps*np.array([0,1])),\n]) / (2 * eps)\nprint(numerical)             # [10. 1.] - agrees with autograd to floating-point precision",
          "caption": "Autograd IS the chain rule, applied automatically to whatever computation graph .backward() walks - central finite differences confirm it's correct, not approximate."
        }
      ],
      "useCases": [
        "Every training loop in this curriculum - from Module 02's linear regression through Module 08's transformers - is gradient descent (or a variant) driven entirely by the chain rule computing gradients through composed functions.",
        "Learning rate schedules (warmup, cosine decay, seen in 22-02) exist precisely to navigate the stability-vs-speed tradeoff the ill-conditioned bowl example shows: too small wastes steps, too large diverges.",
        "Second-order curvature reasoning motivates adaptive optimizers (Adam, RMSprop) that effectively rescale each parameter's learning rate by its own local curvature, avoiding the single-global-learning-rate ill-conditioning problem.",
        "25-09's from-scratch backprop derivation is this lesson's chain rule applied explicitly through a full 2-layer network, matching autograd to machine precision."
      ],
      "pitfalls": [
        "Choosing a learning rate that's too large for the steepest direction in the loss landscape causes divergence, not just slow convergence - the failure mode isn't always subtle, it can blow up to NaN within a few steps.",
        "Confusing a local minimum with the global minimum - gradient descent only guarantees convergence to a point where the gradient is zero (a critical point), which could be a local minimum, a saddle point, or (rarely, for a maximization framed as minimization) a local maximum.",
        "Ill-conditioned loss surfaces (very different curvature along different directions, like the a=10,b=1 example) cause zig-zagging: a learning rate safe for the steep direction is far too small for the shallow one, wasting many steps.",
        "Vanishing/exploding gradients in deep networks are a direct consequence of the chain rule multiplying many factors together - if each layer's local derivative is consistently <1 or >1, the product shrinks or grows exponentially with depth (this is why residual connections and careful initialization exist, Module 04+).",
        "Forgetting to zero gradients between optimizer steps (optimizer.zero_grad() in PyTorch) causes gradients to accumulate across steps rather than reflect only the current batch - a common and confusing bug that looks like 'training is unstable' but is actually 'gradients are wrong'."
      ],
      "connections": [
        {
          "ref": "foundations/information-theory",
          "text": "Cross-entropy's gradient with respect to model logits (the softmax-minus-one-hot identity, derived exactly in 25-09) is the concrete derivative every classifier's training loop computes."
        },
        {
          "ref": "foundations/complexity",
          "text": "The next lesson asks how expensive one gradient-descent step actually is - the computational-complexity lens on the same training loop."
        },
        {
          "text": "Module 04's backpropagation lessons are this lesson's chain rule made systematic across an entire network, computed by autograd in one backward pass."
        },
        {
          "text": "22-02's optimizer lessons (SGD, Adam, gradient clipping, LR schedules) are all direct engineering responses to the ill-conditioning and stability issues introduced here."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State the gradient descent update rule.",
          "a": "theta_{t+1} = theta_t - eta * gradient(L(theta_t)) - step opposite the gradient, scaled by the learning rate."
        },
        {
          "q": "What does the gradient of a loss point toward?",
          "a": "The direction of steepest INCREASE - gradient descent steps in the opposite direction to decrease the loss."
        },
        {
          "q": "State the chain rule for a composition L(f(g(x))).",
          "a": "dL/dx = L'(f(g(x))) * f'(g(x)) * g'(x) - the product of each stage's local derivative."
        },
        {
          "q": "Why does backpropagation work?",
          "a": "It's the chain rule applied systematically through a network's layers, computing all parameter gradients in one backward pass instead of one derivation per parameter."
        },
        {
          "q": "What happens if the learning rate is too large?",
          "a": "The update can overshoot and diverge - loss increases or blows up instead of decreasing, especially along high-curvature directions."
        },
        {
          "q": "What's a saddle point?",
          "a": "A critical point (zero gradient) that's a local minimum along some directions and a local maximum along others - not a true minimum, but gradient descent can slow dramatically near one."
        },
        {
          "q": "What causes zig-zagging during gradient descent?",
          "a": "An ill-conditioned loss surface - very different curvature along different directions - forces a learning rate small enough for the steep direction, which is too small for the shallow one."
        },
        {
          "q": "What's the mechanism behind vanishing gradients in deep networks?",
          "a": "The chain rule multiplies many layers' local derivatives together - if each is consistently less than 1, the product shrinks exponentially with depth."
        },
        {
          "q": "What does optimizer.zero_grad() do, and why is forgetting it a bug?",
          "a": "Resets accumulated gradients to zero before the next backward pass - without it, gradients from multiple batches sum together instead of reflecting only the current batch."
        },
        {
          "q": "How do you numerically verify an analytic gradient?",
          "a": "Central finite differences: (f(x+eps) - f(x-eps)) / (2*eps), compared against the analytic/autograd gradient."
        },
        {
          "q": "What's the difference between a local and a global minimum for gradient descent's guarantee?",
          "a": "Gradient descent only guarantees reaching a critical point (zero gradient); it makes no guarantee that point is the global minimum on a non-convex loss surface."
        }
      ],
      "standard": [
        {
          "q": "Derive the stability condition for gradient descent on a 1-D quadratic loss L(w) = 0.5*a*w^2, and explain what it predicts about the ill-conditioned 2-D example in this lesson.",
          "a": "The gradient is grad(w) = a*w, so the update is w_{t+1} = w_t - eta*a*w_t = (1 - eta*a)*w_t. This is a linear recurrence: w_t = (1-eta*a)^t * w_0, which converges to 0 (the minimum) if and only if |1 - eta*a| < 1, i.e., 0 < eta < 2/a. For the 2-D bowl L(w) = 0.5*(a*w1^2 + b*w2^2) with a=10, b=1, each coordinate behaves independently with its own stability ceiling: eta < 2/10 = 0.2 for w1, and eta < 2/1 = 2.0 for w2. A single shared learning rate must satisfy the tighter constraint (eta < 0.2) to avoid diverging along w1, which is exactly why lr=0.25 in the code example blows up - it exceeds w1's stability ceiling even though it would be extremely conservative (and slow) for w2 alone.",
          "deepDive": {
            "q": "How does this generalize to explain why Adam-style per-parameter learning rates help on ill-conditioned problems?",
            "a": "Adam maintains a running estimate of each parameter's gradient magnitude (via the second moment) and divides that parameter's update by (roughly) its own typical gradient scale - effectively giving each coordinate its own adaptive learning rate close to its own stability-appropriate value, rather than being bottlenecked by whichever coordinate has the steepest curvature; this is why Adam often converges faster than plain SGD on the kind of ill-conditioned landscape the a=10,b=1 example represents, though it isn't a free lunch (it can generalize differently, and its adaptive scaling has its own failure modes)."
          }
        },
        {
          "q": "Walk through backpropagation for a 1-hidden-layer network L = CE(softmax(W2 * tanh(W1*x)), y) using only the chain rule, identifying each local derivative.",
          "a": "Define z1 = W1*x (pre-activation), a1 = tanh(z1) (hidden activation), z2 = W2*a1 (logits), p = softmax(z2), L = CE(p, y). Backprop computes, right to left: dL/dz2 = p - y (the softmax+cross-entropy combined gradient, derived exactly in 25-09) - this is the 'local derivative' of the loss+softmax stage. Then dL/dW2 = dL/dz2 * a1^T (chain rule: how z2 depends on W2, times how L depends on z2). Then dL/da1 = W2^T * dL/dz2 (how z2 depends on a1, propagated backward). Then dL/dz1 = dL/da1 * (1 - a1^2) (tanh's local derivative, elementwise). Finally dL/dW1 = dL/dz1 * x^T. Each step multiplies the accumulated upstream gradient by that layer's own local derivative - exactly the chain rule, applied once per layer, reusing the same upstream gradient value rather than recomputing anything from scratch.",
          "deepDive": {
            "q": "Why is this 'backward' order more efficient than computing dL/dW1 and dL/dW2 independently from first principles?",
            "a": "Computing gradients backward lets every layer reuse the single upstream gradient signal (dL/dz2, then dL/da1, then dL/dz1) computed by the layer after it - this is reverse-mode automatic differentiation, and its cost is proportional to one forward pass plus one backward pass regardless of how many parameters exist, whereas computing each parameter's gradient independently via, say, finite differences would cost one extra forward pass PER PARAMETER, making it computationally infeasible for networks with millions or billions of parameters."
          }
        },
        {
          "q": "A training run's loss suddenly jumps to NaN after training stably for many steps. List the calculus-level causes you'd investigate, in order of likelihood.",
          "a": "1) Exploding gradients: check gradient norms over recent steps - if they're growing before the NaN, the chain rule's repeated multiplication through many layers (or through a numerically unstable operation like an unclipped exponential in softmax/attention) has compounded past float range; fix with gradient clipping or a lower learning rate. 2) A learning rate that's locally too large for the current curvature - even a previously-stable LR can become unstable if training has moved into a sharper region of the loss surface; a warmup+decay schedule or an adaptive optimizer mitigates this. 3) A numerically unstable operation upstream - unclipped exp() in a custom softmax, division by a near-zero variance in a custom normalization, or log(0) from a probability that hit exactly zero (the information-theory lesson's pitfall) - these produce inf/NaN locally that then poisons every downstream gradient via the chain rule. 4) Data issue: an extreme outlier input producing an extreme loss value on one batch, which then produces an extreme gradient.",
          "deepDive": {
            "q": "Why does gradient clipping specifically address cause #1 without changing the direction of the update?",
            "a": "Gradient clipping by global norm rescales the entire gradient vector by a single scalar factor (min(1, max_norm/||g||)) when its norm exceeds a threshold - this preserves the gradient's *direction* (the relative proportions between parameters) while capping its *magnitude*, so the optimizer still moves toward decreasing loss, just with a bounded step size regardless of how extreme an individual batch's gradient happened to be; it directly targets the exponential-growth failure mode of exploding gradients without altering what direction 'improvement' points in."
          }
        },
        {
          "q": "Explain the difference between a convex and a non-convex loss surface, and why this distinction matters for what gradient descent can guarantee about neural network training.",
          "a": "A function is convex if the line segment between any two points on its graph lies on or above the graph - equivalently, its second derivative (curvature) is nonnegative everywhere in 1-D, or its Hessian is positive semi-definite in higher dimensions. For a convex loss, any local minimum is automatically the global minimum, so gradient descent converging to a critical point guarantees a globally optimal solution (this is why linear/logistic regression's loss surfaces, which are convex, have theoretical convergence guarantees). Neural network loss surfaces are generally non-convex - they can have many local minima, saddle points, and flat regions - so gradient descent converging to a critical point offers no guarantee it's the best possible solution; it might be a mediocre local minimum. In practice, deep learning works well anyway partly because empirical evidence suggests most local minima found by SGD on large, overparameterized networks tend to have similar loss values to each other (the 'flat local minima are common and good enough' observation), and because saddle points, not bad local minima, appear to be the more common obstacle in high dimensions.",
          "deepDive": {
            "q": "Why are saddle points argued to be more common than bad local minima in high-dimensional non-convex optimization?",
            "a": "At a critical point in d dimensions, whether it's a local min, local max, or saddle depends on the signs of the Hessian's d eigenvalues - a local minimum requires ALL d eigenvalues to be positive, a local max requires all negative, and anything else (a mix of signs) is a saddle; as d grows, the probability that a random critical point happens to have all-same-sign curvature in every one of d independent directions shrinks rapidly (roughly like 2^{-d} under simplifying independence assumptions), so in the very high dimensions of a neural network's parameter space, saddle points vastly outnumber true local minima among critical points - which is why 'is the gradient near zero because we're stuck at a bad local min or just slowly crossing a saddle' is a live practical question, and why momentum-based optimizers (which don't stop the instant the gradient is small) help escape saddle regions."
          }
        },
        {
          "q": "Design a finite-difference gradient checker for a custom loss function you've hand-derived the analytic gradient for. Walk through the implementation and explain why you'd use central differences rather than forward differences.",
          "a": "For each parameter w_i, perturb it by +eps and -eps (holding every other parameter fixed), evaluate the loss at both perturbed points, and estimate the partial derivative as (L(w + eps*e_i) - L(w - eps*e_i)) / (2*eps), where e_i is the i-th standard basis vector; compare this numerical estimate to the analytic gradient's i-th component, typically checking that their relative difference is below a small threshold (e.g., 1e-5) across all parameters. Central differences (using both +eps and -eps) are preferred over forward differences (only L(w+eps) vs L(w)) because central differences have error that scales as O(eps^2) (from a Taylor expansion, the odd-order error terms cancel by symmetry), while forward differences have error scaling as O(eps) - central differences are quadratically more accurate for the same eps, which matters because eps itself is a tradeoff: too large introduces truncation error (the linear approximation breaks down), too small introduces floating-point cancellation error from subtracting two very close numbers.",
          "deepDive": {
            "q": "Why does gradient checking become impractical for a full-scale neural network with millions of parameters, and what's used instead?",
            "a": "Checking every parameter requires two full forward passes per parameter (one for +eps, one for -eps), so the total cost is O(2 * num_params) forward passes - for a network with millions of parameters this is computationally infeasible to run regularly, versus one backward pass computing all gradients simultaneously via autograd; in practice, gradient checking is used sparingly - on a small subset of parameters, a tiny toy version of the architecture, or only when implementing a new custom autograd operation - rather than as a routine check during normal training, precisely because its cost doesn't scale the way backprop's does."
          }
        },
        {
          "q": "Explain what a second-order (Newton's method) optimization step does differently from gradient descent, and why it's rarely used directly to train large neural networks despite converging in fewer iterations.",
          "a": "Gradient descent uses only first-order information (the gradient) and takes a step of fixed direction magnitude eta in the steepest-descent direction. Newton's method additionally uses the Hessian (the matrix of second derivatives, capturing local curvature) to take a step that accounts for how the gradient itself is changing: theta_{t+1} = theta_t - H^{-1} grad(L(theta_t)) - this automatically rescales the step size per-direction according to local curvature (large step where the surface is flat, small step where it's steep), which is exactly the ill-conditioning problem this lesson's a=10,b=1 example suffers from, and it converges quadratically near a minimum versus gradient descent's linear convergence. It's rarely used directly on large networks because computing and inverting the Hessian costs O(n^2) memory and O(n^3) time for n parameters - for a network with even a few million parameters this is completely infeasible, versus gradient descent's O(n) cost per step.",
          "deepDive": {
            "q": "How do practical optimizers like Adam approximate second-order benefits without paying the full Hessian cost?",
            "a": "Adam maintains per-parameter running estimates of the first moment (mean of recent gradients, like momentum) and second moment (mean of recent squared gradients) and divides each parameter's update by the square root of its own second-moment estimate - this is a diagonal (per-parameter-only, ignoring cross-parameter curvature) and cheap-to-compute approximation to what a full Newton step would do, capturing the 'give each parameter its own effective learning rate based on how large its gradients typically are' benefit at O(n) cost instead of the full Hessian's O(n^2)-O(n^3), trading exactness (it ignores how parameters' curvatures interact with each other) for tractability at scale."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Gradient descent update",
        "back": "theta_{t+1} = theta_t - eta * grad(L(theta_t)) - step opposite the gradient, scaled by the learning rate."
      },
      {
        "type": "formula",
        "front": "Chain rule for L(f(g(x)))",
        "back": "dL/dx = L'(f(g(x))) * f'(g(x)) * g'(x) - product of each stage's local derivative."
      },
      {
        "type": "intuition",
        "front": "Why backprop is efficient",
        "back": "Reverse-mode chain rule reuses one upstream gradient per layer - cost is one backward pass total, not one pass per parameter (unlike finite differences)."
      },
      {
        "type": "formula",
        "front": "1-D GD stability ceiling",
        "back": "For L(w)=0.5*a*w^2, converges iff 0 < eta < 2/a - exceeding it diverges instead of just converging slowly."
      },
      {
        "type": "intuition",
        "front": "Ill-conditioning / zig-zagging",
        "back": "Very different curvature along different directions forces a shared LR small enough for the steepest direction - wastes steps on shallow ones."
      },
      {
        "type": "definition",
        "front": "Saddle point",
        "back": "A zero-gradient critical point that's a min along some directions, max along others - not a true minimum, but slows GD near it."
      },
      {
        "type": "pitfall",
        "front": "Vanishing/exploding gradients",
        "back": "Chain rule multiplies many layers' local derivatives - consistently <1 or >1 factors shrink/grow the product exponentially with depth."
      },
      {
        "type": "pitfall",
        "front": "Forgetting zero_grad()",
        "back": "Gradients accumulate across steps instead of reflecting only the current batch - looks like instability, is actually wrong gradients."
      },
      {
        "type": "definition",
        "front": "Convex vs non-convex loss",
        "back": "Convex: any local min is the global min (GD guarantee). Non-convex (typical for NNs): GD only guarantees a critical point, could be local min or saddle."
      }
    ],
    "refs": [
      {
        "title": "Boyd & Vandenberghe, Convex Optimization (free PDF)",
        "url": "https://web.stanford.edu/~boyd/cvxbook/"
      },
      {
        "title": "PyTorch: Autograd mechanics",
        "url": "https://pytorch.org/docs/stable/notes/autograd.html"
      },
      {
        "title": "Dauphin et al., Identifying and attacking the saddle point problem (NeurIPS 2014)",
        "url": "https://arxiv.org/abs/1406.2572"
      },
      {
        "title": "PyTorch: torch.nn.utils.clip_grad_norm_",
        "url": "https://pytorch.org/docs/stable/generated/torch.nn.utils.clip_grad_norm_.html"
      }
    ],
    "demos": [
      "autodiff",
      "gradient-descent",
      "newton-vs-gradient",
      "optimizers"
    ],
    "demoTitles": {
      "autodiff": "Automatic Differentiation",
      "gradient-descent": "Gradient Descent",
      "newton-vs-gradient": "Newton vs Gradient Descent",
      "optimizers": "Optimizer Shootout"
    }
  }
};
