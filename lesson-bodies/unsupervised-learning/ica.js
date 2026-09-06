// GENERATED from content/lessons/unsupervised-learning/ica.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/unsupervised-learning/ica/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "ica": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Independent Component Analysis solves the cocktail party problem: several microphones each record a mix of several people talking at once, and ICA recovers the individual voices from the mixtures - with no information about who was speaking or where the microphones were. It's the archetype of blind source separation: given only linear mixtures of unknown independent sources, recover the sources. The 'blind' is the remarkable part - ICA succeeds knowing almost nothing, relying on a single powerful assumption.",
        "That assumption is statistical independence, and it's what separates ICA from PCA. PCA finds uncorrelated directions of maximum variance - but uncorrelated is much weaker than independent (it only rules out linear relationships). ICA finds directions that are statistically independent, which requires looking beyond variance to higher-order structure. The key realization is that independence is tied to non-Gaussianity: sums of independent signals look more Gaussian than the individual signals (by the Central Limit Theorem), so ICA recovers the original sources by finding the linear transformation that makes the components maximally non-Gaussian - undoing the Gaussianizing effect of mixing.",
        "This dependence on non-Gaussianity is also ICA's fundamental limitation, and understanding why makes the whole method click. If two sources were both Gaussian, their mixture would be Gaussian too, and there'd be no non-Gaussianity to maximize - the sources would be unrecoverable (a rotation of independent Gaussians is still independent Gaussians, so the problem is unidentifiable). ICA therefore works precisely because real-world sources (speech, EEG signals, images) are non-Gaussian, and it fails on Gaussian sources - the opposite of methods that assume Gaussianity."
      ],
      "math": [
        {
          "h": "The generative model: mixtures of independent sources",
          "paras": [
            "ICA assumes the observed signals x are a linear mixture (via an unknown mixing matrix A) of statistically independent sources s. The goal is to find an unmixing matrix W that recovers the sources up to permutation and scaling - independence, not variance, is the criterion."
          ],
          "tex": "x = A s, \\quad s_i \\text{ mutually independent} \\;\\Rightarrow\\; \\hat{s} = W x, \\quad W \\approx A^{-1}",
          "texNote": "s are the unknown independent sources, A the unknown mixing. ICA estimates W to recover s - identifiable only up to permutation (which source is which) and scale (amplitude/sign)."
        },
        {
          "h": "Independence via maximal non-Gaussianity",
          "paras": [
            "By the Central Limit Theorem, a mixture of independent sources is more Gaussian than the sources themselves. So recovering a source = finding the projection direction w that makes w^T x maximally non-Gaussian. Non-Gaussianity is measured by negentropy (or its proxies: kurtosis, or robust contrast functions like those in FastICA)."
          ],
          "tex": "\\max_w \\; J(w^\\top x), \\quad J(y) = H(y_{\\text{gauss}}) - H(y) \\ge 0 \\quad (\\text{negentropy})",
          "texNote": "Negentropy J is the entropy gap between a signal and a Gaussian of the same variance - zero only for a Gaussian, positive otherwise. Maximizing it finds the non-Gaussian (source) directions."
        }
      ],
      "code": [
        {
          "h": "Blind source separation with FastICA",
          "paras": [
            "Two independent signals are mixed into two observations; ICA recovers the originals (up to sign/scale/order) from the mixtures alone - something PCA cannot do."
          ],
          "code": "import numpy as np\nfrom sklearn.decomposition import FastICA, PCA\n\nrng = np.random.default_rng(0)\nt = np.linspace(0, 8, 2000)\ns1 = np.sign(np.sin(3 * t))                 # square wave (non-Gaussian)\ns2 = np.mod(t, 2) - 1                        # sawtooth (non-Gaussian)\nS = np.c_[s1, s2] + 0.02 * rng.standard_normal((2000, 2))\nS /= S.std(0)\n\nA = np.array([[1.0, 0.7], [0.6, 1.0]])       # unknown mixing\nX = S @ A.T                                   # observed mixtures\n\nS_ica = FastICA(n_components=2, random_state=0).fit_transform(X)   # recovers sources\nS_pca = PCA(n_components=2).fit_transform(X)                        # only decorrelates - does NOT unmix\nprint('ICA recovered the two source signals (up to sign/scale/order); PCA did not separate them')",
          "caption": "ICA recovers the independent square and sawtooth sources from their mixtures; PCA only finds uncorrelated variance directions and leaves them mixed."
        },
        {
          "h": "Why PCA is the standard preprocessing for ICA (whitening)",
          "paras": [
            "ICA typically whitens the data first (PCA + scaling to unit variance), which makes the remaining unmixing a rotation - reducing ICA's job to finding the right rotation that maximizes non-Gaussianity."
          ],
          "code": "import numpy as np\n\n# whitening = PCA rotation + unit-variance scaling; sklearn's FastICA does this internally (whiten=True)\ndef whiten(X):\n    Xc = X - X.mean(0)\n    cov = np.cov(Xc, rowvar=False)\n    d, E = np.linalg.eigh(cov)               # eigendecomposition of covariance\n    W_white = E @ np.diag(d ** -0.5) @ E.T   # decorrelate + scale to unit variance\n    return Xc @ W_white.T\n\n# after whitening, the components are uncorrelated with unit variance,\n# so the only freedom left for ICA is a rotation -> find the rotation maximizing non-Gaussianity",
          "caption": "Whitening (PCA + unit-variance scaling) reduces ICA to finding a rotation - which is why 'PCA prepares the data, ICA finds the independent directions' is the pipeline."
        }
      ],
      "useCases": [
        "Biomedical signal separation - removing eye-blink and muscle artifacts from EEG/MEG, separating fetal from maternal ECG, isolating brain sources - the flagship real-world application of ICA.",
        "Audio source separation (the cocktail party problem) - unmixing overlapping speakers or instruments recorded on multiple microphones.",
        "Feature extraction where independent (not just uncorrelated) components are desired - ICA on natural image patches recovers edge-like features resembling early visual cortex receptive fields.",
        "Financial and sensor data - separating independent driving factors from mixed multivariate time series when the underlying sources are non-Gaussian."
      ],
      "pitfalls": [
        "ICA cannot separate Gaussian sources - if two sources are Gaussian, their mixture is Gaussian and there's no non-Gaussianity to exploit; the problem is unidentifiable (any rotation of independent Gaussians is still independent Gaussians).",
        "The recovered sources are ambiguous in order, sign, and scale: ICA identifies the independent directions but not which source is 'first', its amplitude, or its sign - you can't recover the true scaling or ordering from the mixtures alone.",
        "Confusing ICA with PCA: PCA finds uncorrelated max-variance directions (second-order statistics only), ICA finds statistically independent directions (needs higher-order/non-Gaussian structure) - uncorrelated is necessary but far from sufficient for independent.",
        "Sensitivity to the number of components and to noise: classic ICA assumes as many mixtures as sources and low noise; over- or under-specifying the component count, or heavy noise, degrades the separation.",
        "Assuming ICA gives an importance ranking like PCA's variance order - it does not; ICA components have no natural ordering by importance (unlike PCA's eigenvalue ordering), since all are treated as equally-valid independent sources."
      ],
      "connections": [
        {
          "ref": "unsupervised-learning/pca",
          "text": "PCA (uncorrelated, max-variance, second-order) vs ICA (independent, non-Gaussian, higher-order) is the core contrast; PCA whitening is the standard ICA preprocessing."
        },
        {
          "ref": "foundations/information-theory",
          "text": "ICA's non-Gaussianity is measured by negentropy - the entropy gap to a Gaussian - directly using the entropy machinery from information theory."
        },
        {
          "ref": "foundations/probability",
          "text": "The Central Limit Theorem (mixtures are more Gaussian than sources) is exactly why maximizing non-Gaussianity recovers the sources."
        },
        {
          "ref": "unsupervised-learning/matrix-factorization",
          "text": "ICA is a matrix factorization (x = As) with an independence constraint - a different constraint than PCA's orthogonality or NMF's non-negativity."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What problem does ICA solve?",
          "a": "Blind source separation: recover statistically independent source signals from linear mixtures of them, with no information about the sources or the mixing."
        },
        {
          "q": "What is the key assumption of ICA?",
          "a": "The sources are statistically independent (and non-Gaussian) - independence is a much stronger condition than PCA's uncorrelatedness."
        },
        {
          "q": "How does ICA differ from PCA?",
          "a": "PCA finds uncorrelated max-variance directions (second-order stats); ICA finds statistically independent directions using higher-order/non-Gaussian structure."
        },
        {
          "q": "Why does ICA rely on non-Gaussianity?",
          "a": "By the CLT, mixtures are more Gaussian than sources - so making components maximally non-Gaussian undoes the mixing and recovers the sources."
        },
        {
          "q": "Why can't ICA separate Gaussian sources?",
          "a": "A mixture of Gaussians is Gaussian, so there's no non-Gaussianity to maximize; any rotation of independent Gaussians is still independent Gaussians - unidentifiable."
        },
        {
          "q": "What ambiguities remain in ICA's output?",
          "a": "Order (which source is which), sign, and scale (amplitude) - ICA recovers the independent directions but not their labeling, polarity, or magnitude."
        },
        {
          "q": "How is non-Gaussianity measured?",
          "a": "Negentropy (the entropy gap to a Gaussian of equal variance), or proxies like kurtosis or FastICA's robust contrast functions."
        },
        {
          "q": "Why is whitening used before ICA?",
          "a": "Whitening (PCA + unit-variance scaling) decorrelates the data, reducing the remaining unmixing to finding a rotation that maximizes non-Gaussianity."
        },
        {
          "q": "Do ICA components have a natural importance order?",
          "a": "No - unlike PCA's eigenvalue ordering, ICA's independent components have no inherent ranking; all are equally-valid sources."
        },
        {
          "q": "Name the flagship real-world application of ICA.",
          "a": "Removing artifacts (eye blinks, muscle) from EEG/MEG and separating biomedical signals - plus audio (cocktail party) source separation."
        }
      ],
      "standard": [
        {
          "q": "Explain precisely why 'uncorrelated' (PCA) is weaker than 'independent' (ICA), and why that difference requires ICA to use higher-order statistics.",
          "a": "Two variables are uncorrelated if their covariance is zero - i.e., there's no linear relationship between them (E[XY] = E[X]E[Y]). Two variables are independent if their joint distribution factorizes completely - knowing one tells you nothing about the other, for ALL statistical relationships, not just linear ones (E[f(X)g(Y)] = E[f(X)]E[g(Y)] for every f, g). Independence implies uncorrelatedness, but not the reverse: variables can be perfectly uncorrelated yet strongly dependent through a nonlinear relationship - the classic example is Y = X^2 for symmetric X, which has zero correlation with X but is completely determined by it. Covariance (and hence PCA, which only uses the covariance matrix) captures only second-order statistics - means and pairwise linear relationships - so decorrelating via PCA removes linear dependence but leaves any higher-order dependence intact. Independence requires that ALL higher-order cross-moments also factorize, so to find genuinely independent components ICA must look beyond the covariance to higher-order statistics (third moments/skewness, fourth moments/kurtosis, or full-distribution measures like negentropy/mutual information). That's the fundamental reason ICA is harder and more powerful than PCA: it optimizes a criterion (non-Gaussianity / independence) that second-order-only methods are blind to.",
          "deepDive": {
            "q": "For a set of jointly Gaussian variables specifically, why does uncorrelated actually equal independent, and why does this doom ICA on Gaussian data?",
            "a": "For jointly Gaussian variables there's a special coincidence: the entire joint distribution is fully determined by the means and the covariance matrix (Gaussians have no independent higher-order structure - all higher moments are functions of the first two). So if jointly Gaussian variables are uncorrelated (diagonal covariance), their joint density factorizes into a product of the marginals, which is exactly independence - uncorrelated and independent coincide for Gaussians (and only for Gaussians). This dooms ICA on Gaussian sources because ICA's whole strategy is to find directions of maximal non-Gaussianity to distinguish independent sources from their mixtures; but if the sources are Gaussian, then after whitening (which makes them uncorrelated, hence independent, with a spherical covariance), ANY rotation of the whitened data is still a set of uncorrelated - hence independent - Gaussians with the same spherical distribution. There is no preferred rotation, no non-Gaussianity to maximize, and thus no way to identify the original mixing direction - the model is fundamentally unidentifiable. This is why ICA requires at most one Gaussian source and works precisely on the non-Gaussian real-world signals (speech, EEG, images) that PCA-style Gaussian-assuming methods cannot separate."
          }
        },
        {
          "q": "Walk through the intuition for why maximizing non-Gaussianity recovers the independent sources, invoking the Central Limit Theorem.",
          "a": "The Central Limit Theorem says that a sum (or weighted mixture) of many independent random variables tends toward a Gaussian distribution, regardless of the individual variables' distributions. Now consider ICA's setup: each observed mixture x_i = sum_j A_ij s_j is a weighted combination of the independent sources, so by the CLT each observed mixture is MORE Gaussian than the individual sources that went into it - mixing 'Gaussianizes'. Turn this around: to recover a source, we want to find a projection w^T x of the observed data. That projection is itself some linear combination of the original sources (since x is a linear combination of sources, any linear function of x is too). Among all possible projections, the one that equals a single original source (rather than a mixture of several) will be the LEAST Gaussian, because it hasn't been through the Gaussianizing mixing - it's one raw non-Gaussian source. A projection that mixes several sources is, by the CLT, more Gaussian. Therefore, searching for the projection direction w that maximizes non-Gaussianity of w^T x drives the solution toward extracting a single source: the extrema of non-Gaussianity correspond exactly to the individual independent components. Repeat (finding orthogonal directions after whitening) to extract each source. So 'undo the mixing' becomes the concrete, optimizable objective 'find the most non-Gaussian projections', which is what algorithms like FastICA maximize.",
          "deepDive": {
            "q": "Negentropy is the theoretically ideal non-Gaussianity measure but hard to compute - what does FastICA use instead and why?",
            "a": "Negentropy - the difference between a variable's differential entropy and that of a Gaussian with the same variance - is the theoretically optimal measure of non-Gaussianity (it's zero only for a Gaussian, always non-negative, and invariant to invertible linear transforms), but computing it exactly requires knowing the full probability density, which you don't have and can't reliably estimate from finite samples. The naive proxy is kurtosis (the fourth standardized moment, measuring tailedness), which is simple but very sensitive to outliers because it involves fourth powers - a few extreme samples dominate it, making it statistically fragile. FastICA instead uses robust approximations of negentropy based on the expectation of well-chosen nonlinear contrast functions G, of the form J(y) ~ [E[G(y)] - E[G(nu)]]^2 where nu is a standard Gaussian - with G chosen to grow slowly (common choices are G(u) = log cosh(u) or G(u) = -exp(-u^2/2)) so that the estimator doesn't blow up on outliers the way kurtosis does. These contrast functions give a fast, robust, statistically stable estimate of non-Gaussianity that FastICA maximizes via a fixed-point iteration (which is why it's 'fast'). So the practical algorithm trades the intractable ideal (exact negentropy) for a robust, cheap surrogate that behaves far better than kurtosis on real data."
          }
        },
        {
          "q": "You need to remove eye-blink artifacts from EEG recordings. Explain why ICA is well-suited and how you'd apply it.",
          "a": "ICA is well-suited because EEG is essentially a linear mixture of independent sources - the electrical activity of different brain regions plus distinct artifact generators (eye movements/blinks, muscle activity, heartbeat) - all summed at the scalp electrodes with mixing weights determined by the head's geometry, which is exactly ICA's generative model (x = As, independent non-Gaussian sources linearly mixed). The individual sources are non-Gaussian (blinks are sharp, localized, distinctly non-Gaussian events; neural rhythms have their own non-Gaussian structure), so ICA can separate them, and there are typically many electrodes (mixtures), satisfying the 'at least as many mixtures as sources' requirement. The application workflow: (1) Record from multiple electrodes and arrange the data as (time samples x channels). (2) Run ICA (after whitening) to decompose the multichannel signal into independent components, each with a time course and a scalp topography (its column of the mixing matrix). (3) Identify the artifact components - the eye-blink component is recognizable by its characteristic frontal scalp topography (strongest near the eyes), its sharp blink-shaped time course, and its correlation with a simultaneously-recorded EOG channel. (4) Zero out (remove) the identified artifact components and reconstruct the cleaned EEG from the remaining components (multiply back by the mixing matrix with the artifact columns removed). This surgically removes the blink while preserving the underlying brain signal, which simple band-pass filtering cannot do because the artifact and neural signals overlap in frequency.",
          "deepDive": {
            "q": "Why can't you just band-pass filter out eye-blink artifacts instead of using ICA, and what does ICA's spatial-filtering approach add?",
            "a": "Band-pass filtering removes specific FREQUENCY bands, but eye-blink artifacts and genuine neural activity overlap heavily in the frequency domain - blinks contain low-frequency energy that coincides with real slow brain rhythms (delta/theta), so any filter aggressive enough to remove the blink would also remove real neural signal in those bands, and blinks also have broadband components. Filtering treats every channel's time series independently in the frequency domain and has no way to exploit the fact that a blink shows up with a specific SPATIAL pattern across electrodes. ICA adds spatial filtering informed by independence: it uses the multichannel structure to identify a component defined by both a time course AND a fixed scalp topography, isolating the blink as a single independent source regardless of what frequencies it occupies. Removing that one component subtracts the blink's contribution from every electrode according to the learned mixing weights, cleanly excising the artifact across the whole frequency range while leaving the temporally-and-spatially-distinct neural sources untouched. So ICA's advantage is that it separates by statistical independence and spatial signature rather than by frequency, which is exactly what's needed when artifact and signal share frequencies - a capability a frequency filter fundamentally lacks."
          }
        },
        {
          "q": "Explain the permutation, sign, and scaling ambiguities of ICA - why they arise mathematically and whether they matter in practice.",
          "a": "The ambiguities arise directly from ICA's model x = As with both A and s unknown. (1) Scaling: for any source s_j, you could multiply it by a constant c and divide the corresponding column of A by c, and the observed mixtures x would be identical - so the amplitude (and, since c can be negative, the sign) of each recovered source is not determined by the data; ICA can't know whether a source's true amplitude was large-and-weakly-mixed or small-and-strongly-mixed. Typically ICA fixes this arbitrarily by normalizing each recovered source to unit variance. (2) Sign: as a special case of scaling with c = -1, the polarity of each source is undetermined (a source and its negation, with a sign-flipped mixing column, produce the same mixtures). (3) Permutation: you could reorder the sources (permute the columns of A and correspondingly the entries of s) and get the same x - so ICA has no way to know which recovered component corresponds to 'source 1' versus 'source 2'; the ordering is arbitrary, and unlike PCA there's no eigenvalue to rank them by. Whether they matter depends on the application: for artifact removal (EEG) they're irrelevant - you identify and remove a component by its topography/time course regardless of its sign/scale/index. For source separation where you just want the separated waveforms (unmixing speakers), sign and scale don't change the intelligible signal much and order doesn't matter. They DO matter if you need absolute amplitudes, consistent component labeling across datasets, or to compare components across subjects - in which case you resolve them with external information (a reference channel, known source properties, or a matching/alignment step across runs).",
          "deepDive": {
            "q": "How would you match ICA components across multiple subjects or recordings given the permutation ambiguity?",
            "a": "Because ICA orders and signs components arbitrarily per run, comparing 'the same' component across subjects requires an explicit alignment step. The general approach is to define a similarity between components from different runs and solve an assignment problem to pair them up. Common signals to match on: (1) spatial topography - each component has a scalp map (its mixing column), and you can correlate topographies across subjects (after sign-aligning by flipping to maximize correlation), pairing components with the most similar spatial patterns; (2) time-course or spectral properties when there's a shared stimulus/task, matching components whose activity correlates with the same event; (3) for a principled joint approach, use group ICA methods that decompose all subjects together (e.g., concatenating data or using tensor/joint-diagonalization variants), which produce components already in correspondence across subjects by construction. Mechanically, once you have a pairwise similarity matrix between one run's components and another's, the Hungarian algorithm solves the optimal one-to-one assignment, and sign is resolved by choosing the polarity that maximizes the matched similarity. This is exactly analogous to the general problem that unsupervised methods produce label-free structure - you need an external anchor (topography, task correlation, or a joint model) to impose a consistent identity on the otherwise-arbitrary ordering, which is why cross-subject ICA analyses always include an explicit component-matching stage."
          }
        },
        {
          "q": "Compare PCA and ICA as matrix factorizations, and describe when you'd reach for each (or use them together).",
          "a": "Both express the data as a product of matrices, but they impose different constraints that reflect different goals. PCA factorizes the centered data to find orthogonal directions of maximum variance, using only second-order statistics (the covariance) - it gives uncorrelated, variance-ranked components, is optimal for compression/denoising/reconstruction (best low-rank approximation), and is deterministic. ICA factorizes x = As seeking statistically INDEPENDENT sources using higher-order statistics (non-Gaussianity) - it gives components that are as independent as possible with no natural variance ordering, and it's aimed at recovering meaningful underlying sources rather than compressing. So the goals differ: PCA answers 'what are the main directions of variation, and how do I reduce dimensionality with least reconstruction error?', while ICA answers 'what are the independent underlying signals that got mixed together?'. Reach for PCA when you want dimensionality reduction, decorrelation, compression, or visualization and you care about variance/reconstruction; reach for ICA when you believe the data is a mixture of independent non-Gaussian sources and you want to recover those sources (audio/biomedical separation, independent feature extraction). They're commonly used TOGETHER: PCA/whitening is the standard preprocessing for ICA - PCA first reduces dimensionality (discarding noise, keeping the top components) and whitens (decorrelates + unit-variance scales) the data, which reduces ICA's remaining task to finding the rotation that maximizes non-Gaussianity. So a typical pipeline is 'PCA to denoise and whiten, then ICA to separate the independent sources', with PCA handling second-order structure and ICA handling the higher-order independence.",
          "deepDive": {
            "q": "Where does Non-negative Matrix Factorization (NMF) fit into this family of constrained factorizations, and what makes its parts-based decomposition different?",
            "a": "NMF is a third member of the constrained-factorization family, distinguished by its constraint: it factorizes a non-negative data matrix X into two non-negative matrices X ~ WH, requiring all entries of the factors to be >= 0. Where PCA constrains components to be orthogonal (and allows negative values) and ICA constrains them to be statistically independent, NMF constrains them to be non-negative - and that single constraint produces a qualitatively different, 'parts-based' decomposition. Because you can only ADD non-negative components (no cancellation via negatives), NMF tends to represent data as a sum of localized, additive parts: on face images it learns components resembling individual facial features (a nose, an eyebrow, a mouth) rather than PCA's holistic 'eigenfaces' that mix positive and negative pixel values across the whole face, and on text (document-term matrices) it learns interpretable topics as additive combinations of words. This makes NMF especially interpretable when the data is naturally non-negative and additive (pixel intensities, word counts, spectra, amplitudes), which is exactly where it's used - topic modeling, spectral unmixing, image parts-learning. So the family reads as: same factorization skeleton, different constraint (orthogonality/variance for PCA, independence/non-Gaussianity for ICA, non-negativity/additivity for NMF), each constraint chosen to match a different notion of what a 'meaningful component' is."
          }
        },
        {
          "q": "Given ICA's assumptions, list the situations where ICA will fail or perform poorly, and how you'd recognize each.",
          "a": "ICA fails or degrades whenever its assumptions are violated. (1) Gaussian sources: if the sources are (near-)Gaussian, there's no non-Gaussianity to exploit and the separation is unidentifiable - you'd recognize this if the recovered components look like arbitrary rotations that change wildly across runs/seeds with no stable structure, and you can pre-check by measuring the sources' kurtosis/non-Gaussianity. ICA tolerates at most one Gaussian source. (2) Nonlinear mixing: ICA assumes the mixing is linear (x = As); if sources combine nonlinearly, linear ICA can't unmix them - recognizable by poor separation despite non-Gaussian sources, requiring nonlinear ICA variants instead. (3) Fewer mixtures than sources (underdetermined): classic ICA needs at least as many observed mixtures (sensors) as sources; with fewer, it can't fully separate them - recognizable when known distinct sources remain blended and no unmixing matrix recovers them. (4) Heavy noise: the basic noiseless model degrades when observations are very noisy, smearing the independence structure - recognizable by noisy, poorly-separated components, addressed with noisy-ICA models or denoising first. (5) Time-varying mixing: if the mixing matrix A changes over the recording (moving sources/sensors), a single stationary W can't track it - recognizable by separation that's good in some segments and bad in others. (6) Wrong component count: over- or under-specifying the number of components splits or merges sources - recognizable by components that look like fragments or blends of expected sources. The general diagnostic theme is instability and residual mixing: if repeated runs give inconsistent components or known-distinct sources stay entangled, one of these assumptions is likely broken, and you check non-Gaussianity, sensor-to-source counts, noise level, and mixing linearity/stationarity to localize which.",
          "deepDive": {
            "q": "What is the fundamental identifiability condition for ICA, stated precisely, and how many Gaussian sources can it tolerate?",
            "a": "The fundamental identifiability result (Comon, 1994) is: the ICA model x = As is identifiable - the independent sources can be recovered up to the permutation, sign, and scaling ambiguities - if and only if at most ONE of the independent sources is Gaussian (and the mixing matrix A is of full column rank, i.e., invertible in the square case, so the sources are actually mixed distinguishably). The reason for the 'at most one Gaussian' condition is exactly the rotational unidentifiability of Gaussians: if two or more sources were Gaussian, the subspace they span is rotationally symmetric (any orthogonal rotation of jointly-Gaussian independent variables yields another set of independent Gaussians with the same distribution), so within that Gaussian subspace there's no statistical criterion to pick out the true mixing directions - they're fundamentally confounded. A single Gaussian source is fine because there's no other Gaussian to rotate it against; its direction is pinned down by being orthogonal (after whitening) to the recoverable non-Gaussian sources. This condition is what formally underlies all the practical failure modes around Gaussianity, and it's why the very first thing to check when ICA misbehaves is whether more than one source is close to Gaussian - if so, no algorithm can separate them, and the problem itself, not the method, is the obstacle."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "ICA / blind source separation",
        "back": "Recover statistically independent source signals from linear mixtures, knowing nothing about the sources or mixing (x=As -> estimate W~A^-1)."
      },
      {
        "type": "intuition",
        "front": "ICA's key assumption vs PCA's",
        "back": "ICA: sources statistically INDEPENDENT (+ non-Gaussian, higher-order stats). PCA: directions merely UNCORRELATED (second-order only). Independent >> uncorrelated."
      },
      {
        "type": "intuition",
        "front": "Why maximize non-Gaussianity?",
        "back": "By the CLT, mixtures are more Gaussian than sources - so the most non-Gaussian projection is a single unmixed source. Measured by negentropy."
      },
      {
        "type": "pitfall",
        "front": "ICA cannot separate Gaussian sources",
        "back": "A mixture of Gaussians is Gaussian; any rotation of independent Gaussians is still independent Gaussians - unidentifiable. Tolerates at most one Gaussian source."
      },
      {
        "type": "pitfall",
        "front": "ICA ambiguities",
        "back": "Order (which source is which), sign, and scale (amplitude) are all undetermined - recovers the independent directions, not their labeling/polarity/magnitude."
      },
      {
        "type": "definition",
        "front": "Negentropy",
        "back": "Non-Gaussianity measure: entropy gap between a signal and a Gaussian of equal variance; 0 only for Gaussian. FastICA uses robust proxies (log cosh), not raw kurtosis."
      },
      {
        "type": "intuition",
        "front": "Whitening before ICA",
        "back": "PCA + unit-variance scaling decorrelates the data, reducing the remaining unmixing to finding a ROTATION that maximizes non-Gaussianity."
      },
      {
        "type": "pitfall",
        "front": "ICA components aren't ranked",
        "back": "Unlike PCA's eigenvalue ordering, ICA components have no natural importance order - all are equally-valid independent sources."
      }
    ],
    "refs": [
      {
        "title": "Hyvarinen & Oja, Independent Component Analysis: Algorithms and Applications (2000)",
        "url": "https://www.cs.helsinki.fi/u/ahyvarin/papers/NN00new.pdf"
      },
      {
        "title": "Comon, Independent component analysis, a new concept? (1994)",
        "url": "https://www.sciencedirect.com/science/article/abs/pii/0165168494900299"
      },
      {
        "title": "scikit-learn: FastICA & blind source separation",
        "url": "https://scikit-learn.org/stable/modules/decomposition.html#ica"
      },
      {
        "title": "Bell & Sejnowski, An information-maximization approach to blind separation (1995)",
        "url": "https://www.cnl.salk.edu/~tony/ptr/bell-sejnowski95.pdf"
      }
    ],
    "demos": [
      "ica"
    ],
    "demoTitles": {
      "ica": "ICA (Cocktail Party)"
    }
  }
};
