// GENERATED from content/lessons/multimodal/simclr-byol.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/multimodal/simclr-byol/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "simclr-byol": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Metric learning needs pairs, and pairs need labels. Self-supervised contrastive learning removes that requirement with one substitution: take TWO AUGMENTED VIEWS of the same image as a positive pair, and every other image in the batch as negatives. No annotation at all, and the resulting representations went from clearly-worse-than-supervised in 2018 to matching and then beating supervised pretraining on transfer by 2021.",
        "The most important thing to understand about this family is that THE AUGMENTATION IS THE OBJECTIVE. You are training the model to produce the same representation for two views, which means you are explicitly instructing it to be INVARIANT to whatever differs between them. Choose random cropping and you teach scale and position invariance. Add colour jitter and you teach colour invariance - which is exactly right for object recognition and exactly wrong if colour is diagnostic, as in histopathology or defect inspection. SimCLR's ablation makes this concrete and slightly alarming: cropping alone performs poorly, because two crops of the same image share a colour histogram and the model can match them on that shortcut without learning anything about content. Colour distortion is what closes the shortcut, and the crop-plus-colour PAIR is what makes the method work. Neither alone does.",
        "Then BYOL arrived and did the same thing with NO NEGATIVES AT ALL - just an online network with an extra predictor head trained to match a slowly-updated copy of itself, with a stop-gradient. That should collapse to a constant and it does not, which set off one of the more instructive episodes in recent ML: a widely-read blog post argued BYOL only worked because batch normalization was leaking implicit contrast between samples, and the BYOL authors replied with a version using group normalization and weight standardization that worked fine. The claim was wrong, the investigation was good science, and SimSiam then showed the momentum encoder was not needed either - stop-gradient plus predictor suffices. Collectively that told the field that preventing collapse is easier and stranger than anyone expected, and that the mechanism is still not fully understood."
      ],
      "math": [
        {
          "h": "NT-Xent: InfoNCE over augmented views",
          "paras": [
            "For a batch of N images, produce 2N views. Each view's positive is its counterpart; the other 2N-2 views are negatives. This is InfoNCE with a temperature, applied to a batch where the positive pairs are manufactured by augmentation."
          ],
          "tex": "\\ell_{i,j} = -\\log\\frac{\\exp\\!\\big(\\mathrm{sim}(z_i,z_j)/\\tau\\big)}{\\sum_{k=1}^{2N}\\mathbb{1}_{k\\neq i}\\exp\\!\\big(\\mathrm{sim}(z_i,z_k)/\\tau\\big)}, \\qquad \\mathrm{sim}(u,v)=\\frac{u^{\\top}v}{\\lVert u\\rVert\\lVert v\\rVert}",
          "texNote": "tau ~ 0.1-0.5 and it matters a great deal: low temperature concentrates gradient on the HARDEST negatives (an automatic hardness weighting that replaces triplet mining), high temperature spreads it. This is the continuous version of the mining decision."
        },
        {
          "h": "The projection head, and why you throw it away",
          "paras": [
            "SimCLR applies the contrastive loss not to the representation h but to a projection z = g(h) through a small MLP. After training the head is DISCARDED and h is used downstream - and h is substantially better than z for transfer, which is the surprising part."
          ],
          "tex": "h = f(\\tilde{x}) \\in \\mathbb{R}^{2048}, \\qquad z = g(h) = W_2\\,\\sigma(W_1 h) \\in \\mathbb{R}^{128}, \\qquad \\mathcal{L}\\text{ acts on } z",
          "texNote": "Linear evaluation on h beats z by more than 10 points. The interpretation: the head ABSORBS the invariances the loss demands - it discards colour, orientation, and crop information that the objective punishes but that downstream tasks may need. Keeping a layer between the loss and the representation protects the representation from the objective."
        },
        {
          "h": "BYOL: no negatives, and three pieces that must all be present",
          "paras": [
            "An online network with a PREDICTOR matches a target network that is an EMA of the online one and receives NO GRADIENT. Removing the predictor or the stop-gradient collapses it immediately; removing the EMA (SimSiam) does not."
          ],
          "tex": "\\mathcal{L} = \\big\\lVert \\overline{q_\\theta(z_\\theta)} - \\overline{z'_\\xi} \\big\\rVert_2^2, \\qquad \\xi \\leftarrow \\lambda\\xi + (1-\\lambda)\\theta, \\qquad \\mathrm{sg}[z'_\\xi]",
          "texNote": "The bar is L2 normalization; sg is stop-gradient. The asymmetry - only one branch has a predictor, only one receives gradient - is what makes the constant solution not an attractor. The mechanism is still not fully settled theoretically."
        }
      ],
      "code": [
        {
          "h": "SimCLR's augmentation ablation, which is the lesson",
          "paras": [
            "The single most useful experiment in this literature, because it shows the objective is a modelling decision rather than a preprocessing detail."
          ],
          "code": "# SimCLR's ImageNet linear-eval ablation (representative published numbers):\n#\n#   augmentation                        top-1\n#   crop only ......................... ~33%    <- the colour-histogram shortcut\n#   colour only ....................... ~26%\n#   CROP + COLOUR ..................... ~56%    <- the pair is what works\n#   + blur, flip, grayscale ........... ~64%\n#\n# Crop alone fails for a specific reason: two crops of the SAME image share a\n# colour histogram, so the model can match them on low-level colour statistics\n# without learning anything about content. Colour distortion destroys that\n# shortcut and FORCES the model to use structure. Neither augmentation alone\n# gets close; the composition is the method.\n\ntrain_tf = T.Compose([\n    T.RandomResizedCrop(224, scale=(0.2, 1.0)),\n    T.RandomHorizontalFlip(),\n    T.RandomApply([T.ColorJitter(0.8, 0.8, 0.8, 0.2)], p=0.8),   # STRONG\n    T.RandomGrayscale(p=0.2),\n    T.RandomApply([T.GaussianBlur(23)], p=0.5),\n    T.ToTensor(), T.Normalize(MEAN, STD),\n])\n\n# THE MODELLING CONSEQUENCE, which is the part to carry into your own domain:\n# you are declaring what the representation should IGNORE. Colour jitter is\n# correct for object recognition and WRONG for histopathology (stain colour is\n# diagnostic), for defect inspection (discolouration IS the defect), and for\n# any task where the augmented-away property is the label. Redesign the policy\n# to match the real acquisition variation in your domain - that is the main\n# modelling decision in this whole method, not the architecture.",
          "caption": "Crop alone reaches ~33% because two crops share a colour histogram and the model matches on that shortcut. Colour distortion closes it. The augmentation policy is not preprocessing - it is the specification of what the representation must ignore."
        },
        {
          "h": "BYOL, and the batch-norm story",
          "paras": [
            "The implementation is short; the interesting content is which pieces are load-bearing and how the field found out."
          ],
          "code": "def byol_step(x, online, target, predictor, tau=0.996):\n    v1, v2 = augment(x), augment(x)                     # two views\n\n    p1 = predictor(online(v1))                          # ONLY online has this\n    p2 = predictor(online(v2))\n    with torch.no_grad():                               # STOP-GRADIENT\n        t1, t2 = target(v1), target(v2)\n\n    loss = mse(norm(p1), norm(t2)) + mse(norm(p2), norm(t1))\n\n    for pt, po in zip(target.parameters(), online.parameters()):\n        pt.data = tau * pt.data + (1 - tau) * po.data   # EMA update\n    return loss\n\n# WHAT IS LOAD-BEARING (measured by ablation):\n#   remove the PREDICTOR ......... collapses immediately\n#   remove the STOP-GRADIENT ..... collapses immediately\n#   remove the EMA (tau -> 0) .... does NOT collapse (this is SimSiam)\n#\n# THE BATCH-NORM EPISODE, worth knowing as a piece of scientific practice:\n# a widely-read 2020 blog post argued BYOL only avoids collapse because\n# BatchNorm leaks information ACROSS samples in a batch, providing implicit\n# contrast - i.e. BYOL was secretly contrastive. Plausible, well argued, and\n# it was tested: the BYOL authors replaced BN with GROUP NORM + WEIGHT\n# STANDARDIZATION (no cross-sample interaction at all) and it still worked,\n# with careful initialization and learning-rate scaling.\n#\n# So BN is not the mechanism. What the episode actually established is that\n# collapse avoidance here is a DYNAMICS property of predictor + stop-gradient,\n# and that it is still not fully explained. Worth citing as an example of a\n# strong claim, a clean rebuttal, and a residual open question.",
          "caption": "Predictor and stop-gradient are load-bearing; the momentum encoder is not (which is SimSiam). The batch-norm hypothesis was plausible, testable, and falsified by swapping in group normalization - and the underlying mechanism remains unsettled."
        }
      ],
      "useCases": [
        "Pretraining on large unlabelled in-domain corpora before fine-tuning on a small labelled set - medical imaging, satellite, industrial inspection, microscopy - which is the highest-return step available when labels are the bottleneck and images are not.",
        "Learning retrieval and similarity embeddings without annotation, where the augmented-view positive replaces the labelled pair and the resulting space supports nearest-neighbour search directly.",
        "Domain adaptation by continued self-supervised pretraining from an existing checkpoint, which is far more practical than training from scratch and captures most of the benefit at a fraction of the compute.",
        "Beyond vision: the same recipe with domain-appropriate augmentations underlies contrastive learning for audio (SpecAugment-style views), time series, tabular data, and graphs - and the augmentation-design problem is the hard part in every case."
      ],
      "pitfalls": [
        "Copying ImageNet's augmentation policy into a domain where it encodes the wrong invariances. Colour jitter is correct for object recognition and destructive for histopathology, defect inspection, or any task where the augmented-away property IS the signal. The policy is the objective - redesign it for your data.",
        "Applying the contrastive loss directly to the representation with no projection head. The head absorbs the invariances the loss demands, and removing it costs over 10 points on linear evaluation because the representation itself gets stripped of information downstream tasks need.",
        "Using the projection output z downstream instead of the pre-projection representation h. The head exists to be discarded; z is optimized for the pretext task and h is what transfers.",
        "Treating the temperature as a minor hyperparameter. Low tau concentrates gradient on the hardest negatives and high tau spreads it - it is the continuous replacement for triplet mining, and results are genuinely sensitive to it.",
        "Ignoring the batch-size requirement. SimCLR's negatives come from the batch, so quality degrades sharply at small batch sizes; MoCo's momentum queue exists precisely to decouple negative count from batch size, and is the right choice on constrained hardware.",
        "Assuming false negatives are harmless. In-batch negatives frequently include other images of the same class, which the loss penalizes anyway - a structural ceiling on representation quality that supervised contrastive learning fixes when labels are available.",
        "Judging these methods by linear probing alone. MAE probes far worse than DINO and fine-tunes better; the two protocols measure linear separability versus adaptability, and they can rank methods oppositely. Report both and pick the one matching how you will use the model."
      ],
      "connections": [
        {
          "ref": "multimodal/siamese",
          "text": "This is metric learning with augmented views supplying the positives instead of labels, and InfoNCE's many negatives replacing triplet mining."
        },
        {
          "ref": "advanced-cv/dino-mae",
          "text": "The direct successors - DINO's centering-and-sharpening and MAE's masked reconstruction - along with the full collapse-prevention taxonomy and the linear-probe-versus-fine-tune split."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "Augmentation is usually a regularizer that buys only the variation it models; here it is promoted to being the objective itself, which makes the same design question much more consequential."
        },
        {
          "ref": "multimodal/clip",
          "text": "CLIP is the cross-modal version: the second 'view' is a caption rather than an augmentation, which is why it learns semantics that augmentation-based methods cannot."
        },
        {
          "ref": "neural-nets/regularization",
          "text": "The batch-norm controversy is a reminder that normalization layers can create cross-sample dependencies with real behavioural consequences - a general hazard, not just a BYOL curiosity."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is SimCLR's core idea?",
          "a": "Two augmented views of the same image are a positive pair; all other images in the batch are negatives. Train with InfoNCE. No labels required."
        },
        {
          "q": "What is NT-Xent?",
          "a": "Normalized temperature-scaled cross-entropy - InfoNCE over 2N augmented views with cosine similarity and a temperature tau, where each view's positive is its counterpart."
        },
        {
          "q": "Why does cropping alone fail?",
          "a": "Two crops of the same image share a colour histogram, so the model matches them on low-level colour statistics without learning content. Colour distortion closes that shortcut."
        },
        {
          "q": "What does the augmentation policy actually specify?",
          "a": "What the representation must be INVARIANT to. It is a modelling decision, not preprocessing - and copying ImageNet's policy into a domain where colour is diagnostic is actively harmful."
        },
        {
          "q": "What is the projection head for?",
          "a": "The contrastive loss acts on z = g(h), and the head is discarded afterwards. It ABSORBS the invariances the loss demands, protecting the representation h from being stripped of information."
        },
        {
          "q": "How much does the projection head matter?",
          "a": "Linear evaluation on h beats z by more than 10 points. Always use the pre-projection representation downstream."
        },
        {
          "q": "What does the temperature do?",
          "a": "Low tau concentrates gradient on the hardest negatives; high tau spreads it evenly. It is the continuous replacement for triplet mining, and results are sensitive to it."
        },
        {
          "q": "Why did SimCLR need large batches?",
          "a": "The negatives come from the batch, so more negatives means a denser signal. MoCo's momentum queue decouples negative count from batch size and is the fix on limited hardware."
        },
        {
          "q": "What is BYOL?",
          "a": "An online network with a PREDICTOR head trained to match an EMA target network under stop-gradient - with NO negatives at all. It should collapse and does not."
        },
        {
          "q": "Which BYOL components are load-bearing?",
          "a": "The predictor and the stop-gradient - removing either collapses it immediately. The EMA is NOT required; removing it gives SimSiam, which still works."
        },
        {
          "q": "What was the batch-norm controversy?",
          "a": "A blog post argued BYOL only worked because BatchNorm leaks cross-sample information, i.e. it was secretly contrastive. The authors falsified it with group norm plus weight standardization, which has no cross-sample interaction."
        },
        {
          "q": "What are false negatives here?",
          "a": "In-batch negatives that are actually the same class as the anchor. The loss pushes them apart regardless, which caps representation quality - supervised contrastive learning fixes it when labels exist."
        }
      ],
      "standard": [
        {
          "q": "Explain SimCLR and which of its components actually matter.",
          "a": "THE METHOD. Take an image, produce two augmented views, encode both, project through a small MLP, and apply InfoNCE where the two views of the same image are positives and all other views in the batch are negatives. No labels anywhere. THE FOUR COMPONENTS AND THEIR MEASURED CONTRIBUTIONS, which is where the substance is. (1) AUGMENTATION COMPOSITION - the largest single factor. SimCLR's ablation grid showed crop alone at roughly 33% linear-eval top-1, colour alone at 26%, and crop PLUS colour at 56%, rising to 64% with blur and flips. The interaction is the finding: neither alone works, and the reason crop alone fails is instructive - two crops of the same image share a colour histogram, so the model can match them on that low-level statistic and never learn content. Colour distortion removes the shortcut. This is a shortcut-learning story identical in structure to the NLI artifact and HANS results: the model finds the cheapest predictive signal, and your job is to remove the cheap ones. (2) THE PROJECTION HEAD - worth over 10 points, and the mechanism is counterintuitive. The loss is applied to z = g(h), and h is used downstream. Why does inserting a discardable layer help? Because the contrastive objective demands invariance to the augmentations, and information about colour, orientation, and crop is therefore actively HARMFUL to the loss. If the loss acts directly on h, that information is stripped from the representation you keep. Putting a head in between lets the head absorb the invariance requirement while h retains information downstream tasks may need. The general principle - keep a buffer between your pretext loss and the representation you plan to reuse - is one of the more transferable ideas in self-supervised learning. (3) LARGE BATCHES AND LONG TRAINING. Negatives come from the batch, so more is better; SimCLR used up to 8192 and trained for many hundreds of epochs. This was a genuine infrastructure requirement and a fair criticism of the method - MoCo's momentum queue exists precisely to decouple negative count from batch size and is the practical answer on limited hardware. (4) TEMPERATURE, which controls hardness weighting: low tau concentrates gradient on the hardest negatives, high tau spreads it. It is the continuous replacement for triplet mining and the results are genuinely sensitive to it. WHAT I WOULD EMPHASIZE ABOUT ALL OF THIS: the augmentation policy IS the objective. You are stating, explicitly, which transformations the representation must ignore. That is a modelling decision about your domain, and copying ImageNet's policy into histopathology (where stain colour is diagnostic) or defect inspection (where discolouration is the defect) instructs the model to discard the signal. I would ask about the domain's real acquisition variation before touching anything else. THE LIMITATIONS worth stating. False negatives - other images of the same class treated as negatives - cap quality structurally, and supervised contrastive learning fixes this when labels exist. The compute requirement is substantial. And the invariances learned are only those the augmentations model, so the representation can be blind to variation the policy never introduced."
        },
        {
          "q": "How does BYOL avoid collapse without negatives, and what did the batch-norm debate establish?",
          "a": "THE PUZZLE. BYOL trains an online network to predict the output of a target network on a different augmented view of the same image. There is no negative term. The obvious global optimum is for both networks to output a CONSTANT for every input - the prediction is then perfect and the representation is worthless. It does not collapse, and the reason is genuinely not obvious. THE THREE COMPONENTS, and their measured necessity. (1) The PREDICTOR - an extra MLP applied only to the ONLINE branch, creating an architectural ASYMMETRY between the two sides. (2) The STOP-GRADIENT on the target branch, so gradients flow through only one path. (3) The EMA (momentum) update of the target from the online network. Ablations show removing the predictor collapses immediately, removing the stop-gradient collapses immediately, and removing the EMA does NOT collapse - which is SimSiam's contribution, and it was surprising because the momentum encoder had been assumed essential. THE LEADING EXPLANATION, offered with appropriate hedging because this is still open. The predictor plus stop-gradient makes the optimization resemble an ALTERNATING procedure, expectation-maximization-like: the online network chases a target that is itself slowly moving, and the predictor absorbs the residual difference between the two views' representations rather than forcing the encoder to make them identical. In that dynamical system the constant solution is not an attractor - the predictor can satisfy the objective without the encoder degenerating. There are also analyses showing the predictor's alignment with the encoder's feature covariance matters, and that a sufficiently well-conditioned predictor prevents dimensional collapse. Nobody has a complete account, and I would say so rather than overclaim. THE BATCH-NORM EPISODE, which is worth telling in full because it is good scientific practice. In 2020 a widely-read blog post argued that BYOL only avoids collapse because BATCH NORMALIZATION leaks information across samples: BN subtracts a batch mean, so each sample's normalized output depends on the OTHER samples in the batch, which is an implicit form of contrast. The claim was that BYOL was secretly contrastive and the 'no negatives' framing was misleading. It was plausible, well-argued, and specific enough to test. The BYOL authors tested it: they replaced BatchNorm with GROUP NORMALIZATION plus WEIGHT STANDARDIZATION - neither of which has any cross-sample interaction - and BYOL still worked, given careful initialization and learning-rate scaling. So the hypothesis was falsified. WHAT THE EPISODE ESTABLISHED, which is more than 'the blog post was wrong'. (a) BN is not the mechanism, though it does help optimization, which is why removing it naively degrades results and made the hypothesis look right. (b) Collapse avoidance is a DYNAMICS property of the predictor-plus-stop-gradient structure, not an implicit contrastive term. (c) The mechanism remains incompletely understood, which is an honest and unusual thing for the field to leave standing. (d) Methodologically it is a good example of a falsifiable claim being cleanly tested - the hypothesis made a specific prediction (remove cross-sample normalization and BYOL collapses) and the prediction failed. WHY IT MATTERS PRACTICALLY: negative-free methods removed the large-batch requirement that made SimCLR expensive, which is a real deployment advantage, and they avoid the false-negative problem entirely since there are no negatives to be wrong about. The costs are sensitivity to hyperparameters and a mechanism you cannot fully reason about when it goes wrong.",
          "deepDive": {
            "q": "How would you design an augmentation policy for a domain that is not natural images?",
            "a": "THE PRINCIPLE. In contrastive self-supervised learning the augmentation policy IS the objective - it declares which transformations the representation must ignore. So the design question is not 'what augmentations are standard' but 'what variation in my data is NUISANCE, and what is SIGNAL'. Getting this backwards trains the model to discard exactly what you need. THE PROCEDURE I would follow. STEP 1 - ENUMERATE THE REAL ACQUISITION VARIATION. What actually differs between two recordings of the SAME underlying thing in your domain? For medical imaging: scanner manufacturer, reconstruction kernel, slice thickness, patient positioning, contrast timing. For industrial inspection: lighting angle, camera pose, conveyor speed, part orientation. For satellite: season, time of day, atmospheric conditions, sensor. These are your candidate augmentations, because invariance to them is genuinely desirable - two scans of the same patient on different machines should embed similarly. STEP 2 - ENUMERATE WHAT IS DIAGNOSTIC AND MUST BE PRESERVED. This is the step that catches the expensive mistakes. In histopathology, STAIN COLOUR carries information and aggressive colour jitter destroys it (though stain NORMALIZATION as an augmentation is correct, because it targets the nuisance variation specifically). In defect inspection, DISCOLOURATION is often the defect. In radiology, absolute intensity is calibrated - CT Hounsfield units mean something physically - so intensity jitter is wrong in a way it is not for photographs. In remote sensing, ABSOLUTE SCALE is meaningful (a building is a fixed size) so aggressive random resizing is wrong, and ORIENTATION is arbitrary so rotation is fine - the exact opposite of natural images, where scale is arbitrary and orientation is meaningful. That inversion is a good illustration of how domain-dependent this is. STEP 3 - CHECK LATERALITY AND SPATIAL SEMANTICS. Horizontal flips are the default in vision and are WRONG whenever left and right differ - medical images (situs, laterality), text in images, and any domain with a canonical orientation. STEP 4 - LOOK FOR DOMAIN-SPECIFIC AUGMENTATIONS THAT MODEL REAL PHYSICS. This is where the biggest gains are and where generic recipes have nothing to offer. Simulate the actual corruption process: k-space undersampling for MRI, realistic noise models for low-dose CT, sensor noise and motion blur for cameras, room impulse responses and codec artifacts for audio, atmospheric effects for satellite. An augmentation that models a real corruption teaches a genuinely useful invariance; a generic one may teach nothing relevant. STEP 5 - EXPLOIT NATURAL POSITIVE PAIRS IF THEY EXIST, which is often better than any augmentation. Two views of the same patient at different times, two cameras of the same scene, two sensors over the same location, the same product photographed by two vendors. Real pairs encode the true nuisance distribution rather than your guess at it, and where available they should replace synthetic augmentation. This is arguably the single most valuable move and it is domain-specific enough that generic papers never mention it. STEP 6 - VALIDATE EMPIRICALLY, because reasoning gets you a shortlist and not an answer. Run the SimCLR-style ablation on your own data: train with each augmentation family alone and in combination, and evaluate on a small labelled downstream set. This is a few days of compute and it is the only way to know. Also check for SHORTCUTS - if your augmentations leave a cheap matching signal (a scanner-specific artifact, a border, a timestamp overlay), the model will use it, and the diagnostic is a representation that clusters by SITE or DEVICE rather than by content. Actually testing whether embeddings cluster by acquisition metadata is a cheap and revealing check that almost nobody runs. THE PRINCIPLE TO STATE AT THE END: for natural images the community's policy encodes decades of accumulated intuition about what does not change an object's identity. In a new domain that intuition does not transfer, and the policy is the main modelling decision in the method - more consequential than the architecture, the batch size, or the loss variant."
          }
        },
        {
          "q": "You have 500,000 unlabelled medical images and 2,000 labelled ones. Would you use SimCLR?",
          "a": "THIS IS EXACTLY THE REGIME SELF-SUPERVISION EXISTS FOR, and yes - with two substantial modifications and one prior step. THE PRIOR STEP: DO NOT TRAIN FROM SCRATCH. 500,000 images is far too few to learn a competitive representation from random initialization; SimCLR used ImageNet's 1.3M with hundreds of epochs, and DINOv2 used 142M curated images. Start from an existing checkpoint - a strong general vision model, or better a published medical-imaging foundation model if one exists for your modality - and do CONTINUED self-supervised pretraining on your 500,000. You inherit general visual competence and adapt it to your domain's statistics, at a fraction of the compute. This distinction between training from scratch and continued pretraining is the difference between a project that works and one that does not, and it is the most common mistake in this setup. MODIFICATION 1 - REDESIGN THE AUGMENTATION POLICY, which is the main modelling work. The standard policy encodes assumptions that are wrong here. Colour jitter is questionable to harmful: for histopathology, stain colour is diagnostic, and the right move is stain NORMALIZATION or stain-specific augmentation rather than generic jitter. For CT, intensity is CALIBRATED (Hounsfield units are physical), so intensity shifts corrupt meaning. Horizontal flips are wrong wherever laterality matters. Aggressive random cropping can crop out a small lesion entirely and then ask the model to match that crop to one containing it, which teaches the wrong invariance. What I WOULD include: realistic acquisition variation - noise models matched to the modality, mild geometric deformation, slice-thickness and resolution variation, scanner-simulation augmentations. And I would strongly consider MAE-style masked reconstruction instead of contrastive learning, because it makes no augmentation-invariance assumptions at all - it only requires that the image be predictable from itself, which is a much safer assumption in a domain where I am unsure which invariances are correct. That is a real argument for the generative family over the contrastive one in non-natural domains. MODIFICATION 2 - EXPLOIT NATURAL POSITIVE PAIRS, which medical data supplies unusually well and which beats synthetic augmentation. Two slices from the same volume, two views of the same study (CC and MLO in mammography), the same patient at different timepoints, or the same anatomy across modalities. These encode the true nuisance variation instead of my guess at it. Using patient identity to form positives (and, importantly, to EXCLUDE same-patient images from the negative set) is a well-established improvement in medical contrastive learning. THE EVALUATION DISCIPLINE, which decides whether any of this is real. Baselines first: fine-tune an ImageNet-pretrained model on the 2,000 labels, and run a linear probe on the same features. If that meets the requirement, stop. Then evaluate the self-supervised representation on the DOWNSTREAM task, not on the pretraining loss, which tells you almost nothing. Split by PATIENT and by SITE, never randomly - images from one patient are highly self-similar and a random split leaks catastrophically, which is the single most common fatal error in medical ML evaluation. With 2,000 labels the validation estimate is noisy, so use cross-validation and report confidence intervals. AND THE ALTERNATIVE I WOULD RAISE FIRST: if labelling more is possible at all, ACTIVE LEARNING on the 500,000 unlabelled images typically buys more than any pretraining change. Going from 2,000 to 3,000 well-chosen labels often beats a month of self-supervised engineering. I would want that comparison made explicitly before committing to the pretraining route, because it is the honest framing of where the value is."
        },
        {
          "q": "Why did self-supervised learning start beating supervised pretraining?",
          "a": "THE CLAIM IS NARROWER THAN IT SOUNDS and worth stating precisely: self-supervised representations transfer BETTER than supervised ImageNet pretraining on many downstream tasks, particularly dense prediction, low-shot learning, and out-of-domain transfer. It is a claim about TRANSFER, not about ImageNet classification itself. THE REASONS, in order of how much I think they contribute. (1) THE LABEL IS A LOW-BANDWIDTH TARGET. A 1000-way ImageNet label carries at most about 10 bits about an image containing millions. Supervised training only needs to preserve whatever distinguishes those 1000 classes, and everything else is free to be discarded - which is exactly what happens. Self-supervised objectives demand far more: to match two augmented views you need a rich representation of content, and to reconstruct masked patches you need to model structure the label never asked about. More demanded, more retained. (2) SUPERVISED TRAINING PERMITS SHORTCUTS. If a texture cue suffices to name the class, the model uses it and stops - the texture-bias result. Self-supervised targets are harder to game: another view's full representation, or the actual pixel content, cannot be satisfied by a single discriminative cue. This is the same shortcut-learning argument that runs through NLI artifacts and HANS, applied to pretraining objectives. (3) THE DATA CEILING IS REMOVED, and this is the structural advantage. ImageNet's 1.3M labels took years and enormous cost; you cannot scale that to 100M+. Self-supervision can use everything, and scale is what produces strong representations. DINOv2's 142M curated images is simply not achievable with human labels. (4) LABEL NOISE AND TAXONOMY ARTIFACTS. ImageNet's label set is idiosyncratic (120 dog breeds, no people category) and its labels contain real errors, so a supervised representation partly encodes those quirks. (5) SELF-SUPERVISED FEATURES ARE MORE SPATIALLY INFORMATIVE, which is why the gap is largest on detection and segmentation - global classification supervision provides little pressure to keep localized information, while masked and view-matching objectives do. WHERE THE CLAIM NEEDS QUALIFYING, because the honest version is less clean. (a) 'SELF-SUPERVISED' IS DOING A LOT OF WORK. CLIP's supervision is human-written alt text at web scale - weakly supervised, not label-free. DINOv2's training set was heavily CURATED by a retrieval pipeline, which is supervision applied to data selection rather than to labels. DATA CURATION has quietly become the important variable, and the supervised/self-supervised dichotomy is blurrier than the framing suggests. (b) COMPUTE IS RARELY NORMALIZED. Self-supervised methods often train far longer; the honest comparison is at matched compute and it is less lopsided. (c) SUPERVISED PRETRAINING REMAINS COMPETITIVE when you have a large in-domain labelled set and the downstream task is similar - the generality you buy is worth less if you only need one task. (d) The evaluation protocols disagree, as the linear-probe versus fine-tune split shows, so 'better' depends on which you report. WHAT I THINK THE HONEST SUMMARY IS: the field moved from 'labels are the supervision signal' to 'DATA is the supervision signal, and labels are one expensive way to extract it'. Self-supervision, weak supervision from text, and careful curation are all ways of getting more signal per unit of human effort, and they compose. The operational consequence for a practitioner is simple and worth stating plainly: start from a strong pretrained checkpoint, continue pretraining on your own unlabelled domain data if you have a meaningful amount, and spend your labelling budget on fine-tuning and evaluation rather than on building a pretraining corpus."
        },
        {
          "q": "What is supervised contrastive learning, and when would you use it over cross-entropy?",
          "a": "THE IDEA. Standard contrastive learning treats only augmented views of the SAME image as positives, which means two different images of the same class are treated as NEGATIVES and pushed apart - a false negative, and a structural limitation. Supervised contrastive learning (SupCon, Khosla et al.) uses the labels: all images of the same class in the batch are positives for each other, and only different-class images are negatives. So it is contrastive learning that knows about classes, or equivalently a classification objective expressed geometrically. THE LOSS generalizes InfoNCE to multiple positives, and the important implementation detail is where the sum over positives goes: putting it INSIDE the log performs noticeably worse than putting it outside, which the paper analyzes and which is an easy thing to get wrong. WHAT IT BUYS OVER CROSS-ENTROPY. (1) BETTER ROBUSTNESS. The reported gains are largest on corrupted and shifted data - ImageNet-C and similar - which suggests the representation is less reliant on brittle discriminative cues. (2) LESS SENSITIVITY TO HYPERPARAMETERS AND TO LABEL NOISE, since the objective is about geometry rather than fitting a specific decision boundary, and a mislabelled example is one bad positive among many rather than a hard constraint on a boundary. (3) A BETTER-STRUCTURED EMBEDDING SPACE, with tighter class clusters and larger margins, which helps if you also want the features for retrieval or few-shot use. (4) It composes naturally with a self-supervised pretraining stage using the same machinery. THE COSTS AND CAVEATS, which matter. (1) It needs LARGE BATCHES to have enough positives and negatives per class - the same constraint as SimCLR, and worse when there are many classes, since a batch of 256 over 1000 classes has very few same-class pairs. (2) It is a TWO-STAGE procedure in the standard recipe: train the encoder contrastively, then train a linear classifier on frozen features. More pipeline than a single cross-entropy run. (3) The reported gains over a WELL-TUNED cross-entropy baseline with modern augmentation and label smoothing are modest, and there has been reasonable debate about how much survives careful matched comparison. I would present it as a real but not transformative improvement. (4) It does not give calibrated probabilities directly; you get those from the second-stage classifier. WHEN I WOULD USE IT. When ROBUSTNESS to distribution shift or corruption is a stated requirement. When labels are NOISY, where its tolerance is a genuine advantage. When I want the embedding for BOTH classification and retrieval, since the geometry is better suited to nearest-neighbour use. And when I already have a contrastive pretraining pipeline and adding labels to it is cheap. WHEN I WOULD NOT. For a straightforward classification task with clean labels, adequate data, and no shift - cross-entropy with good augmentation is simpler, faster, one stage, and gives calibrated outputs. The added complexity should be justified by one of the specific advantages above, not adopted by default. THE FRAMING I FIND CLARIFYING: SupCon sits on a spectrum. Self-supervised contrastive uses only augmentation-based positives (no label information). SupCon uses class labels for positives. And ArcFace-style margin softmax uses class CENTROIDS rather than instance-level positives, which is the same information organized differently and is more efficient when classes are numerous. Which point on that spectrum is right depends on how much label information you have and how many classes there are - which is a more useful way to choose than treating them as competing methods."
        },
        {
          "q": "How do you evaluate a self-supervised representation, and what do the protocols miss?",
          "a": "THE STANDARD PROTOCOLS, and what each actually measures. (1) LINEAR PROBING: freeze the backbone, train one linear layer. Measures how LINEARLY SEPARABLE the representation already is - whether the semantic structure is present and directly accessible. Cheap, standardized, comparable across papers. (2) FINE-TUNING: train everything. Measures how good an INITIALIZATION the representation is, which is a different property. (3) k-NN CLASSIFICATION: classify by nearest neighbours with no training at all. The purest test of whether the embedding space is semantically organized, and parameter-free so there is nothing to tune away. (4) LOW-SHOT: probe or fine-tune with 1% or 10% of labels, closer to the regime self-supervision is actually for. (5) TRANSFER to other datasets and to DENSE tasks - detection, segmentation, depth - which tests generality rather than fit to one benchmark. WHAT THE PROTOCOLS MISS, which is the substance of the question. (a) THEY DISAGREE, AND THE DISAGREEMENT IS INFORMATIVE. MAE probes at roughly 68% and fine-tunes to 83.6%; DINO probes at 78% and fine-tunes to 82.8%. Ranking by one protocol gives the opposite answer to the other. A paper reporting only linear probing systematically favours joint-embedding methods; one reporting only fine-tuning favours generative ones. Reporting both is the minimum, and choosing the one matching your intended use is the actual decision. (b) IMAGENET-CENTRISM. Nearly all evaluation is on ImageNet or ImageNet-like data, and the methods' augmentations were tuned against it, so results transfer less well to medical, satellite, or industrial imagery than the numbers suggest. Domain-specific evaluation is essential and rarely done. (c) DENSE AND STRUCTURAL PROPERTIES go unmeasured by classification protocols. Whether features support dense correspondence, depth, or segmentation is a different question, and DINOv2's headline claim is precisely about dense tasks - which classification probing would not reveal. (d) ROBUSTNESS AND CALIBRATION under shift or corruption are generally not reported. (e) COMPUTE IS NOT NORMALIZED. Methods differ enormously in pretraining cost - MAE is roughly 3x faster per epoch than contrastive methods needing multiple views and large batches - so comparing final numbers without a budget is comparing different things. (f) THE PROTOCOLS HAVE THEIR OWN HYPERPARAMETERS: linear-probe results move by a point or two with the optimizer, learning rate, and whether features are normalized, so small cross-paper differences may be protocol noise. (g) WHICH LAYER you probe matters, and the last layer is often not best because it has specialized to the pretext objective. THE CONTROL EVERYONE SHOULD RUN AND ALMOST NOBODY DOES: a RANDOMLY INITIALIZED encoder of the same architecture. Random convolutional features are a surprisingly strong baseline, and if your pretrained model barely beats it, the pretraining did little. It costs one probe. WHAT I WOULD REPORT for an honest evaluation: linear probe AND k-NN AND fine-tuning; low-shot at 1% and 10%; at least one dense downstream task; transfer to a domain unlike the pretraining data; the random-init control; and all of it at a stated pretraining compute budget. AND THE PRACTICAL POINT THAT SHOULD DRIVE THE CHOICE: how will you USE the model? Frozen features for retrieval - k-NN and linear probe are the relevant numbers. Fine-tuning on a decent labelled set - fine-tuning accuracy matters and the linear probe is irrelevant. Dense prediction - evaluate on dense tasks. The most common evaluation error is optimizing a protocol that does not match the deployment, which is the same error as choosing the wrong metric anywhere else."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "SimCLR / NT-Xent",
        "back": "Two augmented views of an image are positives; all other batch views are negatives. InfoNCE with cosine similarity and temperature tau over 2N views. No labels required."
      },
      {
        "type": "pitfall",
        "front": "The augmentation IS the objective",
        "back": "Matching two views instructs the model to be INVARIANT to whatever differs between them. Colour jitter is right for object recognition and WRONG for histopathology (stain is diagnostic) or defect inspection (discolouration IS the defect)."
      },
      {
        "type": "intuition",
        "front": "Why crop alone fails (~33%)",
        "back": "Two crops of one image share a COLOUR HISTOGRAM, so the model matches on that shortcut without learning content. Colour distortion closes it: crop+colour ~56%. The composition is the method - neither alone works."
      },
      {
        "type": "definition",
        "front": "The projection head",
        "back": "Loss acts on z = g(h); h is used downstream and the head is DISCARDED. Probing h beats z by 10+ points because the head ABSORBS the invariances the loss demands, protecting h from being stripped."
      },
      {
        "type": "intuition",
        "front": "Keep a buffer between pretext loss and representation",
        "back": "The generalizable form of the projection-head result: the pretext objective punishes information downstream tasks may need, so put a discardable layer between them. Applies well beyond SimCLR."
      },
      {
        "type": "definition",
        "front": "BYOL",
        "back": "Online net + PREDICTOR trained to match an EMA target under STOP-GRADIENT. No negatives at all. Should collapse to a constant; does not. Removing predictor or stop-grad collapses it; removing the EMA does NOT (= SimSiam)."
      },
      {
        "type": "intuition",
        "front": "The BYOL batch-norm episode",
        "back": "A blog post argued BN leaks cross-sample info, making BYOL secretly contrastive. Testable, and falsified: group norm + weight standardization (no cross-sample interaction) still works. Mechanism remains an open question."
      },
      {
        "type": "pitfall",
        "front": "Temperature is not a minor knob",
        "back": "Low tau concentrates gradient on the HARDEST negatives; high tau spreads it. It is the continuous replacement for triplet mining, and results are genuinely sensitive to it."
      },
      {
        "type": "pitfall",
        "front": "False negatives cap quality",
        "back": "In-batch negatives often include other images of the same CLASS, and the loss pushes them apart anyway. A structural ceiling - SupCon fixes it when labels exist, by treating same-class images as positives."
      },
      {
        "type": "intuition",
        "front": "MoCo's momentum queue",
        "back": "SimCLR's negatives come from the batch, so quality degrades at small batch sizes. MoCo keeps a queue of past encoded samples, DECOUPLING negative count from batch size - the right choice on constrained hardware."
      },
      {
        "type": "pitfall",
        "front": "Probe and fine-tune can rank methods oppositely",
        "back": "MAE ~68% linear / 83.6% fine-tuned; DINO ~78% / 82.8%. Reporting only one systematically favours a family. Report both, plus k-NN, and pick the protocol matching how you will USE the model."
      },
      {
        "type": "intuition",
        "front": "The control nobody runs",
        "back": "A RANDOMLY INITIALIZED encoder of the same architecture. Random conv features are a surprisingly strong probe baseline - if your pretrained model barely beats it, the pretraining did little. Costs one probe."
      }
    ],
    "refs": [
      {
        "title": "Chen et al. (2020), A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)",
        "url": "https://arxiv.org/abs/2002.05709"
      },
      {
        "title": "Grill et al. (2020), Bootstrap Your Own Latent (BYOL)",
        "url": "https://arxiv.org/abs/2006.07733"
      },
      {
        "title": "Chen & He (2021), Exploring Simple Siamese Representation Learning (SimSiam)",
        "url": "https://arxiv.org/abs/2011.10566"
      },
      {
        "title": "He et al. (2020), Momentum Contrast for Unsupervised Visual Representation Learning (MoCo)",
        "url": "https://arxiv.org/abs/1911.05722"
      },
      {
        "title": "Khosla et al. (2020), Supervised Contrastive Learning",
        "url": "https://arxiv.org/abs/2004.11362"
      }
    ],
    "demos": [
      "contrastive-learning",
      "image-augmentation",
      "embeddings",
      "batch-norm"
    ],
    "demoTitles": {
      "contrastive-learning": "Contrastive Learning",
      "image-augmentation": "Data Augmentation",
      "embeddings": "Embedding Atlas",
      "batch-norm": "Batch Normalization"
    }
  }
};
