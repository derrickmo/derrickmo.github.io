// GENERATED from content/lessons/advanced-cv/grad-cam.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-cv/grad-cam/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "grad-cam": {
    "level": "core",
    "body": {
      "intuition": [
        "You have a CNN that classifies an X-ray as pneumonia. Which pixels did it use? The family of methods answering that question is ATTRIBUTION, and Grad-CAM is the one that became standard for convolutional networks because it is cheap, requires no retraining, and produces a heatmap that lines up with objects rather than with individual pixels. The core insight is that the LAST convolutional layer is the right place to look: its feature maps are still spatial (typically 7x7 or 14x14, so each cell corresponds to a region of the image) but they are already semantic, encoding 'dog face' or 'wheel' rather than 'edge at 30 degrees'.",
        "Grad-CAM works by asking how much each of those feature maps MATTERS for the class you care about. Backpropagate the class score to the last conv layer, average each channel's gradients over space to get one importance weight per channel, then take a weighted sum of the feature maps and apply ReLU to keep only the positive evidence. The result is a coarse map, upsampled to image size, showing where the class evidence lives. Its predecessor CAM required a specific architecture (global average pooling directly into the classifier); Grad-CAM's contribution was making the same idea work for ANY CNN by using gradients instead of the classifier weights.",
        "The essential discipline in this topic is scepticism. Attribution maps are persuasive - a heatmap over a tumour looks like an explanation - and several popular methods have been shown to produce plausible-looking output that does not depend on the model at all. Adebayo et al.'s SANITY CHECKS are the standard test: randomize the model's weights, and a faithful attribution should change completely. Guided Backprop and Guided Grad-CAM largely FAIL that test (they behave like edge detectors), while Grad-CAM and Integrated Gradients pass. Treat a heatmap as a hypothesis to be tested causally, never as evidence on its own."
      ],
      "math": [
        {
          "h": "Grad-CAM: gradient-weighted feature maps",
          "paras": [
            "Take the score for class c BEFORE the softmax, backpropagate to the last conv layer's activations A^k, and average those gradients over the spatial dimensions to get a scalar importance alpha for each channel. The map is the weighted sum of channels, passed through ReLU so that only evidence FOR the class survives."
          ],
          "tex": "\\alpha_k^{c} = \\underbrace{\\frac{1}{Z}\\sum_{i}\\sum_{j} \\frac{\\partial y^{c}}{\\partial A^{k}_{ij}}}_{\\text{global-average-pooled gradient}}, \\qquad L^{c}_{\\text{Grad-CAM}} = \\mathrm{ReLU}\\!\\left(\\sum_{k} \\alpha_k^{c} A^{k}\\right)",
          "texNote": "Z = number of spatial positions. Use the pre-softmax LOGIT y^c, not the probability - softmax normalizes across classes, so its gradient mixes in evidence about the OTHER classes. The ReLU is what makes the map class-discriminative: negative contributions belong to other classes."
        },
        {
          "h": "Why plain gradient saliency saturates",
          "paras": [
            "The simplest attribution is the gradient of the score with respect to the input. Its flaw is that a gradient is a LOCAL sensitivity: once a feature has driven the output into a saturated region, the local slope is zero even though the feature was decisive. Integrated Gradients fixes this by accumulating gradients along a path from a baseline to the input, which satisfies COMPLETENESS - the attributions sum exactly to the change in output."
          ],
          "tex": "\\mathrm{IG}_i(x) = (x_i - b_i)\\int_{0}^{1} \\frac{\\partial f\\big(b + \\alpha (x - b)\\big)}{\\partial x_i}\\, d\\alpha, \\qquad \\sum_i \\mathrm{IG}_i(x) = f(x) - f(b)",
          "texNote": "b = the baseline (usually a black image, though the choice materially changes the answer). The integral is approximated with 50-300 Riemann steps; too few and the completeness error is large (one measured example: error 0.21 at 64 steps, 0.007 at 128)."
        }
      ],
      "code": [
        {
          "h": "Grad-CAM in about twenty lines",
          "paras": [
            "Hook the last convolutional layer to capture its activations and gradients, backpropagate one class logit, and combine. The two details that matter are using the LOGIT rather than the softmax probability, and taking the ReLU after the weighted sum rather than before."
          ],
          "code": "import torch, torch.nn.functional as F\n\nclass GradCAM:\n    def __init__(self, model, target_layer):\n        self.model, self.acts, self.grads = model.eval(), None, None\n        target_layer.register_forward_hook(\n            lambda m, i, o: setattr(self, 'acts', o.detach()))\n        target_layer.register_full_backward_hook(\n            lambda m, gi, go: setattr(self, 'grads', go[0].detach()))\n\n    def __call__(self, x, class_idx=None):\n        logits = self.model(x)                       # (1, C) - LOGITS, not probabilities\n        if class_idx is None:\n            class_idx = logits.argmax(1).item()\n        self.model.zero_grad()\n        logits[0, class_idx].backward()              # one scalar -> gradients at the hook\n\n        alpha = self.grads.mean(dim=(2, 3), keepdim=True)      # GAP over space: (1,K,1,1)\n        cam = F.relu((alpha * self.acts).sum(dim=1, keepdim=True))   # weighted sum + ReLU\n        cam = F.interpolate(cam, size=x.shape[-2:], mode='bilinear', align_corners=False)\n        cam = cam - cam.min()\n        return (cam / (cam.max() + 1e-8)).squeeze().cpu().numpy()\n\nfrom torchvision.models import resnet50, ResNet50_Weights\nmodel = resnet50(weights=ResNet50_Weights.DEFAULT)\ncam = GradCAM(model, model.layer4[-1])               # LAST conv block: semantic + spatial\nheatmap = cam(img_tensor)                            # (224, 224) in [0, 1]",
          "caption": "Grad-CAM: forward and backward hooks on the last conv block, gradients global-average-pooled into per-channel weights, weighted sum, ReLU, upsample. Backpropagate the LOGIT - the softmax's gradient mixes in information about competing classes."
        },
        {
          "h": "The sanity check that separates real attribution from decoration",
          "paras": [
            "Adebayo et al.'s model-randomization test is the minimum bar. Progressively randomize the network's weights from the top down; a faithful attribution should degrade toward noise. A method whose map barely changes is responding to the IMAGE, not to the model, and explains nothing."
          ],
          "code": "import numpy as np\nfrom scipy.stats import spearmanr\n\ndef randomization_test(attr_fn, model, x, layers):\n    \"\"\"Correlate the attribution before vs after randomizing weights, top-down.\"\"\"\n    base = attr_fn(model, x).ravel()\n    out = []\n    for layer in layers:                              # cascading randomization\n        for p in layer.parameters():\n            torch.nn.init.normal_(p, std=0.01)\n        out.append(spearmanr(base, attr_fn(model, x).ravel()).correlation)\n    return out\n\n# Representative results (rank correlation with the original map, after full randomization):\n#   method                 corr    verdict\n#   Grad-CAM               0.06    PASSES - tracks the model\n#   Integrated Gradients   0.09    PASSES\n#   Gradient saliency      0.21    passes, weakly\n#   Guided Backprop        0.94    FAILS - essentially an edge detector\n#   Guided Grad-CAM        0.87    FAILS - inherits Guided Backprop's behaviour\n#\n# A map that survives randomizing the model is not explaining the model.\n# Guided Backprop produces the prettiest, sharpest visualizations in the literature\n# AND is the one that fails hardest - which is exactly why the check exists.",
          "caption": "Adebayo's cascading model-randomization test. Guided Backprop and Guided Grad-CAM produce the sharpest, most convincing images and are largely independent of the model's weights - a caution that visual plausibility is not faithfulness."
        }
      ],
      "useCases": [
        "Debugging classifiers by finding shortcut features: the canonical failures - a pneumonia model keyed on the hospital's scanner watermark, a husky-vs-wolf classifier keyed on snow - were found by looking at attribution maps, and this remains the technique's highest-value use.",
        "Weakly-supervised localization: because Grad-CAM produces a spatial map from image-level labels alone, it can generate coarse bounding boxes or segmentation seeds without any localization annotation, which is a common bootstrap for detection datasets.",
        "Regulatory and clinical settings where a prediction must be accompanied by evidence a human can inspect - noting that the map is a hypothesis for a clinician to evaluate, not a justification in itself.",
        "Model comparison and dataset auditing: systematically different attribution patterns between two models with the same accuracy often reveal that one relies on a spurious cue, which aggregate metrics cannot show."
      ],
      "pitfalls": [
        "Backpropagating the softmax probability instead of the logit: softmax couples the classes, so its gradient mixes in evidence about competitors and the resulting map is less class-discriminative. Always use the pre-softmax score.",
        "Treating a heatmap as an explanation: Guided Backprop and Guided Grad-CAM produce the sharpest images in the literature and largely FAIL Adebayo's model-randomization test - they behave like edge detectors. Run the sanity check before trusting any method.",
        "Confusing plausibility with faithfulness: a map that highlights the object looks right, but 'looks right to a human' is not evidence that the model used those pixels. Causal tests - occlude the highlighted region and measure the score drop - are what support a claim.",
        "Reading Grad-CAM at full resolution: the map is computed at the last conv layer's resolution (often 7x7 for a 224px input) and bilinearly upsampled, so its apparent pixel-level precision is an artifact of interpolation. Use Grad-CAM++ or higher-resolution layers if fine detail matters, and never quote it as pixel-accurate.",
        "Forgetting that attribution is not causation: a highlighted region is correlated with the model's output on this input, which says nothing about what would happen under intervention or about whether the feature is causally related to the label in the world."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/attribution",
          "text": "The trustworthy-AI module derives saliency, Integrated Gradients, exact Shapley values, and attention rollout from scratch and grades them against a KNOWN planted signal - the quantitative version of this lesson."
        },
        {
          "ref": "cnn/cnn-architectures",
          "text": "Grad-CAM depends on the last conv layer being both spatial and semantic, which is a property of the downsampling hierarchy those architectures build."
        },
        {
          "ref": "advanced-cv/vit",
          "text": "Transformers have no last conv layer, so attribution there uses attention rollout or applies Grad-CAM to the final block's token activations reshaped to a grid - the method has to be adapted."
        },
        {
          "ref": "cnn/style-transfer",
          "text": "Optimizing an input under a frozen network is the shared machinery of feature visualization and attribution; style transfer is the constructive branch of the same family."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is Grad-CAM?",
          "a": "Weight the last conv layer's feature maps by their global-average-pooled gradients for a class, sum, ReLU, and upsample - giving a coarse heatmap of where the class evidence is."
        },
        {
          "q": "Why use the LAST convolutional layer?",
          "a": "It is the best trade-off: still spatial (7x7 or 14x14, so positions map to image regions) but already semantic (object parts rather than edges)."
        },
        {
          "q": "Why the ReLU?",
          "a": "To keep only features that contribute POSITIVELY to the class. Negative contributions are evidence for other classes, so removing them makes the map class-discriminative."
        },
        {
          "q": "Logit or softmax probability?",
          "a": "The pre-softmax logit. Softmax normalizes across classes, so its gradient mixes in information about competitors and dilutes class-specificity."
        },
        {
          "q": "How does Grad-CAM differ from CAM?",
          "a": "CAM required global average pooling feeding directly into the classifier, so it worked only for specific architectures. Grad-CAM uses gradients as the channel weights and works for any CNN with no retraining."
        },
        {
          "q": "What is the resolution limitation?",
          "a": "The map is computed at the last conv layer's spatial size (often 7x7) and bilinearly upsampled, so it is inherently coarse - apparent pixel precision is an interpolation artifact."
        },
        {
          "q": "Why does plain gradient saliency fail?",
          "a": "It measures LOCAL sensitivity, so a saturated feature has zero gradient even if it drove the prediction. Integrated Gradients accumulates gradients along a path from a baseline to fix this."
        },
        {
          "q": "What is completeness in Integrated Gradients?",
          "a": "The attributions sum exactly to f(x) - f(baseline). It is an axiom the method satisfies by construction, and a numerical check on whether you used enough integration steps."
        },
        {
          "q": "What are Adebayo's sanity checks?",
          "a": "Randomize model weights (or labels) and see whether the attribution changes. A faithful method should degrade to noise; Guided Backprop and Guided Grad-CAM largely do not, so they fail."
        },
        {
          "q": "Which methods fail the sanity check?",
          "a": "Guided Backprop and Guided Grad-CAM - they produce the sharpest, most convincing maps and behave essentially like edge detectors independent of the weights."
        },
        {
          "q": "How would you test a heatmap causally?",
          "a": "Occlude or perturb the highlighted region and measure the drop in the class score, compared against occluding a random region of the same size (deletion/insertion metrics)."
        },
        {
          "q": "How do you attribute for a Vision Transformer?",
          "a": "There is no last conv layer - use attention rollout (multiplying attention across layers, accounting for residuals), or apply Grad-CAM to the final block's token activations reshaped into a grid."
        }
      ],
      "standard": [
        {
          "q": "Explain Grad-CAM: how it works, why the design choices are what they are, and its limitations.",
          "a": "THE MECHANISM, step by step. (1) Run the image forward and pick the class c you want to explain. (2) Take that class's PRE-SOFTMAX logit and backpropagate it to the activations A^k of the last convolutional layer. (3) GLOBAL-AVERAGE-POOL those gradients over the spatial dimensions, giving one scalar alpha_k per channel - an importance weight answering 'how much does increasing this feature map's activation increase the class score?'. (4) Take the weighted sum of the feature maps, sum_k alpha_k A^k. (5) Apply a ReLU. (6) Bilinearly upsample to the input resolution and overlay. WHY EACH CHOICE. LAST CONV LAYER: it is the sweet spot between spatial and semantic. Early layers are high-resolution but encode edges and colours, so a map there would be sharp and meaningless; the classifier head has no spatial extent at all. The last conv block (7x7 for a 224px ResNet) still has spatial structure where each cell summarizes a large receptive field, and its channels encode object parts. GLOBAL-AVERAGE-POOLED GRADIENTS: a single scalar per channel treats the channel as a unit - 'how important is this concept' - rather than weighting positions individually, which is what makes the map smooth and object-shaped rather than noisy. RELU: negative contributions are evidence for OTHER classes; removing them is what makes the map class-DISCRIMINATIVE, which is Grad-CAM's headline property - you can ask for 'dog' and 'cat' on the same image and get different maps. LOGIT NOT PROBABILITY: softmax couples classes, so its gradient includes 'this is not a cat' information and dilutes specificity. THE HISTORICAL POINT worth making: CAM (Zhou et al., 2016) did something similar but required an architecture ending in global average pooling straight into a linear classifier, and used the classifier weights as the channel importances - so applying it meant modifying and retraining your network. Grad-CAM's contribution (Selvaraju et al., 2017) was recognizing that the gradient generalizes those weights, so the method works on ANY CNN, unmodified, post hoc. That generality is why it became standard. THE LIMITATIONS, which I would be careful to state. (1) COARSE RESOLUTION: a 7x7 map upsampled to 224x224 looks precise but is not - the apparent detail is bilinear interpolation. Grad-CAM++ and Score-CAM improve on this, and layer choice trades resolution against semantics. (2) IT LOCALIZES, IT DOES NOT EXPLAIN. The map says where evidence was, not what about that region mattered - texture? shape? colour? For a model relying on texture rather than shape, Grad-CAM would highlight the object either way. (3) POOR WITH MULTIPLE INSTANCES: the original struggles when several instances of a class are present, which Grad-CAM++ specifically addresses. (4) ARCHITECTURE-DEPENDENT: no last conv layer means no Grad-CAM, so transformers need adaptation. (5) NOT CAUSAL: the map reports a gradient-weighted correlation on this input, not what would happen under intervention. THE DISCIPLINE I WOULD ATTACH: before believing any attribution method, run the model-randomization sanity check, and support any specific claim with a causal test - occlude the highlighted region and measure the score drop against a random-region control (the deletion/insertion metrics). Grad-CAM passes the sanity check, which is why it is a reasonable default; several sharper-looking methods do not.",
          "deepDive": {
            "q": "Explain the Adebayo sanity checks in detail. Why do Guided Backprop and Guided Grad-CAM fail them?",
            "a": "THE PROBLEM THEY ADDRESS. Attribution maps are evaluated by eye, and human judgement of 'does this highlight the object' rewards PLAUSIBILITY rather than FAITHFULNESS. Adebayo et al. (2018), 'Sanity Checks for Saliency Maps', proposed falsifiable tests: state a property any faithful method must have, then check it. THE TWO TESTS. (1) MODEL PARAMETER RANDOMIZATION. Progressively randomize the trained network's weights, from the top layer downward, recomputing the attribution at each step. A method that explains the MODEL must produce increasingly different maps as the model is destroyed - by the time all weights are random, the map should be uncorrelated with the original. (2) DATA RANDOMIZATION. Train the same architecture on data with RANDOMLY PERMUTED LABELS (so it memorizes noise and has learned nothing generalizable), then compare attributions to those from the properly-trained model. A faithful method should produce very different maps, because the two models have learned completely different functions. THE RESULTS. Grad-CAM and Integrated Gradients pass both tests - their maps degrade toward noise as the model is randomized (rank correlation with the original falling to around 0.06-0.09 after full randomization). Plain gradient saliency passes, weakly. GUIDED BACKPROP and GUIDED GRAD-CAM largely FAIL: their maps remain visually similar and highly rank-correlated (0.85-0.95) even with fully random weights. WHY THEY FAIL - the mechanism. Guided Backprop modifies the backward pass through ReLUs: it zeroes negative gradients AND negative activations' gradients, keeping only positive signals. This produces beautifully sharp, edge-like visualizations. But that filtering is doing something specific: it behaves like a partial image RECONSTRUCTION, recovering the input's edge structure rather than the model's decision process. Nie et al. (2018) analysed this and showed guided backprop is essentially performing image reconstruction, which is why the output resembles an edge detector applied to the input - and an edge detector does not care what the network's weights are. Guided Grad-CAM multiplies Guided Backprop by the Grad-CAM map, so it inherits the sharpness AND the pathology: the sharp detail comes from the failing component while only the coarse envelope comes from the faithful one. THE UNCOMFORTABLE IRONY that makes this memorable: the methods producing the most convincing, publication-friendly visualizations are the ones that fail hardest. Visual quality and faithfulness are anti-correlated here, because sharpness comes from responding to image edges, and image edges are model-independent. WHAT TO DO WITH THIS. (a) Run the randomization check on any attribution method before deploying it, and report the result - it takes an afternoon. (b) Prefer methods that pass: Grad-CAM for CNNs, Integrated Gradients with enough steps (checking the completeness error), or Shapley-based methods where affordable. (c) Do not use Guided Backprop or Guided Grad-CAM for claims about model behaviour; they remain acceptable as visualization aesthetics if you say so. (d) Add CAUSAL evaluation on top: deletion/insertion curves (progressively remove the highest-attributed pixels and measure how fast the score falls, versus a random-order control), or pointing-game accuracy against ground-truth boxes. (e) Recognize the general principle, which transfers well beyond vision: an interpretability method must be VALIDATED, and the validation must be a test the method could fail. This is the same move as control tasks for probing classifiers (Hewitt and Liang) and as activation patching for causal claims - the field's response to a decade of plausible-looking but unvalidated explanations."
          }
        },
        {
          "q": "Compare the main attribution methods. How would you choose between them?",
          "a": "THE FAMILIES. (1) GRADIENT-BASED. Plain SALIENCY is the gradient of the class score with respect to the input - one backward pass, and it answers 'what infinitesimal change would most affect the output?'. Its weaknesses are SATURATION (a feature that drove the output into a flat region has zero gradient despite being decisive) and noisiness at the pixel level. SMOOTHGRAD averages saliency over several noisy copies of the input, which visibly reduces noise but is a cosmetic improvement rather than a fix for saturation. INTEGRATED GRADIENTS accumulates gradients along a straight path from a BASELINE to the input, which resolves saturation and satisfies two axioms - SENSITIVITY (a feature that changes the output gets non-zero attribution) and COMPLETENESS (attributions sum to f(x) - f(baseline)). Completeness doubles as a numerical check: if the sum is far off, you used too few integration steps. (2) CAM-BASED. CAM and GRAD-CAM weight the last conv layer's feature maps. Coarse but object-shaped, class-discriminative, cheap (one backward pass), and they pass sanity checks. GRAD-CAM++ improves multi-instance handling and localization; SCORE-CAM avoids gradients entirely by masking the input with each feature map and measuring the score change, which is more faithful and much slower. (3) PERTURBATION-BASED. OCCLUSION sliding a grey patch over the image and measuring the score drop - conceptually the most direct (it is an intervention, not a gradient) and expensive. LIME fits a local interpretable surrogate on perturbed superpixels. RISE uses random masks. These are model-agnostic (they need only forward passes) but slow and sensitive to the perturbation design. (4) SHAPLEY-BASED. Exact Shapley values are the unique attribution satisfying efficiency, symmetry, dummy, and additivity - a strong axiomatic footing - but require 2^n coalitions, so practical use means approximations (KernelSHAP, DeepSHAP, sampling). Best when you need principled attributions on a moderate number of features, which is more common for tabular data than for pixels. (5) ATTENTION-BASED for transformers: raw attention is unreliable (information moves through residual connections, so last-layer attention can put BELOW-chance weight on the decisive token), while ATTENTION ROLLOUT - multiplying attention matrices across layers with residual correction - recovers it far better. HOW I CHOOSE. Start with the model type: CNN -> Grad-CAM as the default (cheap, passes sanity checks, object-shaped); transformer -> attention rollout or Integrated Gradients; black box or non-differentiable -> occlusion, LIME, or KernelSHAP. Then the requirement: need pixel-level detail -> Integrated Gradients or Grad-CAM++ rather than vanilla Grad-CAM; need axiomatic guarantees -> Integrated Gradients or Shapley; need speed at scale -> Grad-CAM or plain saliency; need model-agnosticism -> perturbation methods. THE PRACTICES THAT MATTER MORE THAN THE CHOICE, and which I would emphasize: (a) run the model-randomization sanity check on whatever you pick; (b) check completeness if using IG, and use enough steps; (c) be deliberate about the BASELINE for IG - a black image says 'compared to darkness', a blurred image says 'compared to low-frequency content', and the two give materially different attributions, so the baseline is part of the question you are asking; (d) validate causally with deletion/insertion curves; (e) compare two or three methods and be suspicious when they disagree, because agreement across mechanisms is weak evidence of faithfulness and disagreement is strong evidence that at least one is wrong."
        },
        {
          "q": "How would you use attribution to debug a model that has learned a shortcut?",
          "a": "SHORTCUT LEARNING is when a model achieves high accuracy using a feature that correlates with the label in your data but is not the intended signal and will not transfer - the pneumonia classifier keying on the portable-scanner token that appears on images from the ICU, the husky-vs-wolf classifier keying on snow, the skin-lesion model keying on the surgical ruler that dermatologists place next to lesions they suspect are malignant. These models look excellent on held-out data from the same source and fail immediately elsewhere, and aggregate metrics cannot reveal them. THE WORKFLOW. (1) START FROM THE ERRORS AND THE SUSPICIOUS SUCCESSES. Look at attribution maps for correctly-classified examples, not just errors - a shortcut shows up as confident CORRECT predictions attributed to the wrong region. Sample across classes and across data sources. (2) LOOK FOR SPATIAL PATTERNS THAT SHOULD NOT MATTER: attention on image corners, borders, watermarks, timestamps, backgrounds, or annotation artifacts. If Grad-CAM consistently lights up the bottom-left corner for one class, you have found something. (3) STRATIFY BY METADATA. Compare attribution patterns and accuracy across hospitals, scanners, cameras, time periods, or collection batches. Shortcuts are usually ACQUISITION artifacts, so they align with a metadata variable, and a large accuracy gap across sites with different attribution patterns is close to a diagnosis. (4) CONFIRM CAUSALLY - the essential step, because a heatmap alone is a hypothesis. Occlude or inpaint the suspected region and measure the accuracy drop. If masking the watermark collapses performance, the shortcut is confirmed. Conversely, mask the OBJECT and see whether performance survives - a model that still classifies correctly with the object removed is definitively using context. That second test is the more damning one and is easy to run. (5) QUANTIFY THE DEPENDENCE across the dataset, not on cherry-picked images: what fraction of predictions change when the region is masked? THE FIXES, once confirmed, in order of preference. (a) FIX THE DATA - remove or crop the artifact, or better, collect data where the shortcut and the label are DECORRELATED (images of the same condition from multiple scanners). Balancing the confound is the only fix that removes the incentive to use it. (b) AUGMENT AWAY the shortcut: random cropping to remove borders, colour or texture augmentation, or stylization if the shortcut is texture-based (the Stylized-ImageNet result). (c) MASK the region at training and inference if it is a known fixed artifact. (d) Loss-level approaches - group DRO, invariant risk minimization, or adversarial removal of the confound - which are principled but harder to get working and should not be the first move. (e) Add the confound as an explicit input so the model can condition on it rather than exploit it implicitly, if that is appropriate. WHAT I WOULD BUILD INTO THE PROCESS, because finding these once is not enough: hold out an EXTERNAL validation set (different site, scanner, or time period) from the start - the gap between internal and external performance is the single best shortcut detector, and it requires no interpretability at all. Add attribution spot-checks to the review process for any model going into a high-stakes setting. And treat surprisingly high accuracy as a bug report, since in my experience the base rate of 'too-good result turns out to be a shortcut or a leak' is high enough to justify the investigation every time."
        },
        {
          "q": "What does it mean for an attribution method to be faithful, and how would you measure it?",
          "a": "THE DISTINCTION THAT MATTERS. PLAUSIBILITY is whether an explanation looks right to a human - does the heatmap cover the object? FAITHFULNESS is whether the explanation accurately describes what the MODEL actually did. These come apart badly: an edge detector produces highly plausible maps for any image and is perfectly unfaithful, and a faithful method may highlight a spurious region that looks wrong to a human precisely BECAUSE the model is using a shortcut. Optimizing for plausibility is therefore actively harmful - it selects methods that hide the model's real behaviour, which is the opposite of what interpretability is for. HOW TO MEASURE FAITHFULNESS. (1) SANITY CHECKS (necessary, not sufficient). Adebayo's model-randomization test: randomize weights and the attribution must change. A method that passes is not proven faithful, but one that fails is definitively unfaithful - it is a filter, and Guided Backprop fails it. (2) DELETION AND INSERTION CURVES - the workhorse quantitative measures. DELETION: remove pixels in order of attribution (highest first, replacing with a baseline) and plot the class probability as you go. A faithful attribution produces a STEEP early drop - the pixels it ranked highest really were the important ones - so a LOW area under the deletion curve is good. INSERTION: start from a blurred or blank image and add pixels in attribution order; a faithful map produces a fast RISE, so a HIGH area under the insertion curve is good. Crucially, both must be compared against a RANDOM-ORDER control, and reported as the gap. (3) POINTING GAME: does the attribution's maximum fall inside the ground-truth bounding box? Cheap and interpretable, but it measures localization and therefore conflates faithfulness with plausibility - it only makes sense if you already believe the model uses the object. (4) SENSITIVITY-N / COMPLETENESS: for methods with axioms, check them numerically. IG's attributions should sum to f(x) - f(baseline); a large gap means too few integration steps, and this is a free diagnostic. (5) SYNTHETIC GROUND TRUTH - the most rigorous option and the one I would use if the stakes justify it. Construct a task where you KNOW which inputs matter (a deterministic function of features 0, 1, 2 with the rest pure noise; or an image task with a planted trigger), train to near-perfect accuracy, and measure what fraction of attribution mass lands on the truly-relevant inputs. This gives an actual number rather than a proxy, and it is how the trustworthy-AI module grades these methods. THE MEASUREMENT PITFALLS, which are real. Deletion/insertion depend on the BASELINE used for removal - grey, black, blur, and noise give different curves, and removing pixels creates out-of-distribution inputs where the model's behaviour is undefined, so part of the score drop reflects distribution shift rather than lost information. Some methods are implicitly optimized for these metrics. And no single metric is decisive, which is why the honest practice is to report several plus a sanity check. WHAT I WOULD ACTUALLY REPORT for a method I intended to rely on: the randomization-test correlation, deletion and insertion AUCs against a random-order control, and - if a synthetic analogue of the task can be built - the relevant-mass fraction on planted signal. Plus an explicit statement that attribution is correlational, so any causal claim about the model needs an intervention (occlusion, ablation, or activation patching), and any causal claim about the WORLD needs an experiment."
        },
        {
          "q": "How does attribution change for Vision Transformers compared to CNNs?",
          "a": "THE STRUCTURAL DIFFERENCE. Grad-CAM depends on a LAST CONVOLUTIONAL LAYER that is simultaneously spatial and semantic. A ViT has no such layer: it processes a sequence of patch tokens through transformer blocks, and while the tokens retain a spatial correspondence (each maps to a 16x16 patch), the mechanism of information flow is attention plus residual connections rather than local convolution. So the methods need adaptation, and new ones become available. WHAT TRANSFERS. Integrated Gradients, plain saliency, occlusion, LIME, and SHAP are architecture-agnostic - they treat the model as a differentiable (or black-box) function of the input and work unchanged. Grad-CAM can be adapted by treating the final block's TOKEN activations as the feature maps: reshape the (N_patches, d) tensor back into a (H/16, W/16, d) grid and apply the usual gradient-weighting. This works reasonably, with the caveat that the resolution is now the patch grid (14x14 for a 224px ViT-B/16), and that where you hook matters - the standard advice is the last block's output before the final layer norm. WHAT IS NEW - ATTENTION-BASED METHODS, and the important caution. The obvious idea is to read the attention weights: which patches did the CLS token attend to? RAW LAST-LAYER ATTENTION IS UNRELIABLE, and the reason is instructive: information moves through RESIDUAL connections as well as attention, so by the final layer the relevant content may already have been copied into the CLS token's residual stream and last-layer attention can put near-chance or even BELOW-chance weight on the decisive patch. ATTENTION ROLLOUT (Abnar and Zuidema) fixes much of this by multiplying the attention matrices across layers while accounting for residuals (add the identity and renormalize), which recovers the flow of information from input patches to the output token and empirically performs far better - in a controlled experiment with a known trigger token, raw last-layer attention scored below chance while rollout scored many times chance. Chefer et al. refined this with a method combining attention and gradients (relevance propagation through the transformer) that is generally the strongest transformer-specific attribution. THE ADDITIONAL COMPLICATIONS worth naming. (a) Multiple heads: attention is per-head, so you must decide how to aggregate - mean, max, or gradient-weighted - and the choice changes the map. (b) The CLS token is a special position and its attention pattern is not always the semantic one you want; some analyses use mean patch-to-patch attention instead. (c) REGISTER TOKENS / attention artifacts: Darcet et al. showed ViTs repurpose a few background patches as global-information scratchpads, producing high-norm outlier tokens that corrupt attention maps - adding dedicated register tokens fixes the maps considerably, and it is a good example of an interpretability finding driving an architectural change. THE HAPPY SURPRISE worth mentioning: self-supervised ViTs, specifically DINO, produce attention maps that segment objects remarkably cleanly WITHOUT any segmentation supervision - far better than supervised ViTs' maps. That result was one of the strongest early arguments for self-supervised pretraining, and it means that for DINO-family models the attention map is genuinely informative rather than merely suggestive. THE UNCHANGED DISCIPLINE: whatever method you use, run the sanity checks and validate causally. The transformer setting has its own version of causal validation - activation patching, where you copy activations between a clean and a corrupted run and measure recovery - which is stronger evidence than any attention map, and is exactly what the mechanistic-interpretability literature uses."
        },
        {
          "q": "A clinician asks whether they can trust your model because the heatmap looks right. How do you respond?",
          "a": "I would say plainly that a heatmap looking right is weak evidence, explain why in terms they can act on, and then describe what evidence would actually support trust. WHY THE HEATMAP IS WEAK EVIDENCE - three points, stated without jargon. (1) The map shows where the model LOOKED, not whether it looked for the right reason. It can highlight the lesion while keying on a texture artifact that happens to co-occur with lesions in our data. (2) Some popular heatmap methods produce convincing pictures that barely depend on the model at all - they are closer to edge detectors, and this is a published, replicated finding rather than a theoretical worry. (3) Our own judgement is the problem: a map that matches clinical intuition feels confirmatory, so we are most likely to accept it exactly when it agrees with us, which is when it is least informative. Confirmation bias is doing real work in that reaction. WHAT WOULD ACTUALLY SUPPORT TRUST, which is the constructive half. (a) EXTERNAL VALIDATION - performance on data from a different hospital, scanner, and patient population than the model was trained on. This is the single strongest evidence, because shortcut features are almost always acquisition artifacts and they do not survive a site change. If we have not done this, that is the first thing to fix. (b) CAUSAL TESTS on the region: if we mask the highlighted area and performance collapses, the model really is using it; if we mask the LESION and performance survives, it is using context and the heatmap misled us. Those two experiments are cheap and far more informative than any number of maps. (c) SUBGROUP PERFORMANCE: how does it do by age, sex, ethnicity, comorbidity, scanner, and disease severity? A good aggregate number can hide a group where it fails, and that group is who gets harmed. (d) CALIBRATION: when it says 80%, is it right 80% of the time - on THIS population? A miscalibrated model gives misleading confidence even when its ranking is fine. (e) COMPARISON TO CLINICIAN PERFORMANCE and, more importantly, to the clinician-PLUS-model workflow, since the deployed system is the pair, not the model. (f) FAILURE-MODE CHARACTERIZATION: which cases does it get wrong, and are those failures the kind a clinician would catch? (g) A PROSPECTIVE evaluation, ideally, since retrospective performance systematically overstates. WHAT I WOULD SAY ABOUT THE HEATMAPS THEMSELVES: they remain useful, just not as evidence of correctness. Their real value is as a DEBUGGING and MONITORING tool - a map highlighting a scanner watermark tells us something is badly wrong, and that negative signal is trustworthy in a way the positive signal is not. In deployment they can also help a clinician decide where to look, as long as the interface does not present them as a justification. THE FRAMING I WOULD LEAVE THEM WITH: trust should rest on measured behaviour in conditions resembling deployment - external sites, relevant subgroups, calibrated probabilities, characterized failure modes - not on whether the explanation is satisfying. And I would offer to run the two mask experiments that week, because a concrete result beats a methodological argument in this conversation, and if the model IS relying on something spurious, the clinician's intuition about where it should be looking is exactly the prior that will help us find it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Grad-CAM",
        "back": "alpha_k = GAP over space of d(logit_c)/d(A^k); map = ReLU(sum_k alpha_k A^k), upsampled. Computed at the LAST conv layer - still spatial (7x7) but already semantic."
      },
      {
        "type": "intuition",
        "front": "Why the ReLU and why the logit",
        "back": "ReLU keeps only POSITIVE contributions to class c (negatives are evidence for other classes) - this is what makes the map class-discriminative. Use the pre-softmax logit; softmax couples classes and dilutes specificity."
      },
      {
        "type": "definition",
        "front": "CAM vs Grad-CAM",
        "back": "CAM needed an architecture ending in GAP -> linear classifier and used the classifier weights. Grad-CAM uses GRADIENTS as those weights, so it works on any CNN post hoc with no retraining."
      },
      {
        "type": "pitfall",
        "front": "Grad-CAM's resolution is an illusion",
        "back": "The map is 7x7 for a 224px input, bilinearly upsampled - apparent pixel precision is interpolation. Never quote it as pixel-accurate; use Grad-CAM++ / Score-CAM if detail matters."
      },
      {
        "type": "formula",
        "front": "Integrated Gradients",
        "back": "IG_i = (x_i - b_i) * integral over alpha of d f(b + alpha(x-b))/dx_i. Fixes SATURATION (a decisive but saturated feature has zero local gradient) and satisfies COMPLETENESS: attributions sum to f(x) - f(b)."
      },
      {
        "type": "pitfall",
        "front": "Adebayo sanity checks",
        "back": "Randomize model weights (or train on permuted labels); a faithful map must change. Grad-CAM and IG pass (corr ~0.06-0.09); Guided Backprop and Guided Grad-CAM FAIL (~0.85-0.95) - they act as edge detectors."
      },
      {
        "type": "intuition",
        "front": "The sharpest maps fail hardest",
        "back": "Guided Backprop's beautiful edge-like output comes from partial image RECONSTRUCTION, which is model-independent. Visual quality and faithfulness are anti-correlated here - plausibility is not evidence."
      },
      {
        "type": "definition",
        "front": "Deletion / insertion curves",
        "back": "Remove pixels in attribution order (steep score drop = faithful, LOW AUC good) or add them to a blank image (fast rise, HIGH AUC good). Always report against a RANDOM-order control."
      },
      {
        "type": "pitfall",
        "front": "Attention is not attribution (ViTs)",
        "back": "Information also flows through RESIDUALS, so raw last-layer attention can be at or below chance on the decisive patch. Use attention ROLLOUT (multiply across layers, add identity for residuals) or Chefer's gradient-weighted relevance."
      },
      {
        "type": "intuition",
        "front": "Using attribution to find shortcuts",
        "back": "Look at CORRECT confident predictions, not just errors. Then confirm causally: mask the suspected artifact (accuracy should collapse) AND mask the object (if accuracy survives, the model is using context)."
      }
    ],
    "refs": [
      {
        "title": "Selvaraju et al. (2017), Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization",
        "url": "https://arxiv.org/abs/1610.02391"
      },
      {
        "title": "Adebayo et al. (2018), Sanity Checks for Saliency Maps",
        "url": "https://arxiv.org/abs/1810.03292"
      },
      {
        "title": "Sundararajan, Taly & Yan (2017), Axiomatic Attribution for Deep Networks (Integrated Gradients)",
        "url": "https://arxiv.org/abs/1703.01365"
      },
      {
        "title": "Abnar & Zuidema (2020), Quantifying Attention Flow in Transformers (attention rollout)",
        "url": "https://arxiv.org/abs/2005.00928"
      }
    ],
    "demos": [
      "saliency",
      "attention-rollout",
      "convolution"
    ],
    "demoTitles": {
      "saliency": "Saliency Maps",
      "attention-rollout": "Attention Rollout",
      "convolution": "Convolution Lab"
    }
  }
};
