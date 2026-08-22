// GENERATED from content/lessons/rnn-nlp/sequence-labeling.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rnn-nlp/sequence-labeling/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "sequence-labeling": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Many NLP tasks are about assigning a label to each word in a sequence: named-entity recognition (is this word part of a Person, Location, Organization?), part-of-speech tagging (noun, verb, adjective?), and chunking. This is sequence labeling, and the key realization is that the labels are NOT independent - they constrain each other. In named-entity recognition with BIO tags, an 'Inside-Person' tag can only follow a 'Begin-Person' or another 'Inside-Person'; an 'I-PER' appearing after an 'O' or a 'B-LOC' is structurally invalid. So predicting each word's label independently can produce impossible label sequences, which is why sequence labeling is a structured-prediction problem, not independent classification.",
        "A Conditional Random Field (CRF) is the classic solution: instead of scoring each label independently, it scores an ENTIRE label sequence, combining per-word 'emission' evidence (how well each label fits its word) with 'transition' evidence (how compatible adjacent labels are). By modeling the joint sequence and finding the best VALID label sequence globally (via the Viterbi algorithm), a CRF respects the label dependencies - it will never emit an I-PER after an O because the transition score forbids it, and it can use the fact that a Location label makes an adjacent Location label more likely. This global, joint labeling is what a per-word classifier cannot do.",
        "The dominant architecture that resulted was the BiLSTM-CRF: a bidirectional LSTM reads the whole sentence and produces a rich contextual representation of each word (the emission scores), and a CRF layer on top models the label transitions and decodes the globally-best label sequence. This combined the best of both - deep learned features from the BiLSTM and structured decoding from the CRF - and was the state-of-the-art for named-entity recognition and tagging before transformers. It's a clean, important example of combining neural representation learning with classical structured prediction, and the CRF layer is still used on top of transformer encoders today."
      ],
      "math": [
        {
          "h": "The CRF: scoring a whole label sequence",
          "paras": [
            "A linear-chain CRF scores a label sequence y for input x by summing per-position emission scores (label fits the word) and transition scores (adjacent labels are compatible), then normalizing over ALL possible label sequences. The normalization couples the labels - the probability of a sequence depends on all others."
          ],
          "tex": "P(y \\mid x) = \\frac{1}{Z(x)} \\exp\\Big(\\sum_t \\text{emit}(y_t, x_t) + \\text{trans}(y_{t-1}, y_t)\\Big), \\quad Z(x) = \\sum_{y'} \\exp(\\cdots)",
          "texNote": "Emission = how well label y_t fits word x_t; transition = compatibility of adjacent labels y_{t-1}, y_t. Z(x) normalizes over ALL label sequences (computed by the forward algorithm), coupling the predictions."
        },
        {
          "h": "Viterbi decoding: the best valid label sequence",
          "paras": [
            "Finding the highest-scoring label sequence naively means searching exponentially many sequences, but the linear-chain structure (each label depends only on its neighbor) allows the Viterbi algorithm - dynamic programming - to find the exact global optimum in linear time."
          ],
          "tex": "\\hat{y} = \\arg\\max_y \\text{score}(y, x), \\qquad V_t(k) = \\max_{j} \\big[V_{t-1}(j) + \\text{trans}(j, k)\\big] + \\text{emit}(k, x_t)",
          "texNote": "Viterbi's DP recurrence: the best score ending in label k at position t is the best over previous labels j plus the transition and emission. Exact global decoding in O(T * K^2) - linear in sequence length."
        }
      ],
      "code": [
        {
          "h": "Why independent per-word labels produce invalid sequences",
          "paras": [
            "A per-word classifier that picks each label independently (argmax per position) can emit structurally impossible label sequences - the exact problem a CRF's transition scores fix."
          ],
          "code": "import numpy as np\n\n# BIO tags: O, B-PER, I-PER, B-LOC, I-LOC\n# per-word argmax can produce 'O I-PER' or 'B-LOC I-PER' - structurally INVALID\nper_word_preds = ['O', 'I-PER', 'O', 'B-LOC', 'I-PER']  # I-PER after O and after B-LOC: invalid!\n\ndef is_valid_bio(tags):\n    for prev, cur in zip(['O'] + tags, tags):\n        if cur.startswith('I-') and not (prev.endswith(cur[2:]) and prev != 'O'):\n            return False                             # I-X must follow B-X or I-X\n    return True\n\nprint('per-word prediction valid?', is_valid_bio(per_word_preds))  # False\n# a CRF's transition scores make impossible transitions score -inf, so decoding\n# only ever produces VALID sequences - the structural constraint is enforced jointly",
          "caption": "Independent per-word argmax can emit invalid label sequences (I-PER after O); a CRF's transition scores forbid impossible transitions and decode only valid sequences."
        },
        {
          "h": "The BiLSTM-CRF architecture",
          "paras": [
            "A BiLSTM produces contextual per-word features (the emission scores); a CRF layer adds learned transition scores and decodes the globally-best valid label sequence with Viterbi."
          ],
          "code": "# conceptual structure (PyTorch-style):\n# 1) embed tokens -> 2) BiLSTM produces a hidden state per word (context from both directions)\n# 3) linear layer maps each hidden state to per-label emission scores\n# 4) CRF layer holds a learned transition matrix (label -> label compatibility)\n# 5) training: maximize log P(gold sequence) = gold score - log Z (forward algorithm)\n# 6) inference: Viterbi decode the highest-scoring VALID label sequence\n\n# emission (from BiLSTM) = 'what does this word look like'\n# transition (from CRF)  = 'what labels can follow what'\n# together: rich features + valid structured output\nprint('BiLSTM = contextual emission features; CRF = transition constraints + global decode')",
          "caption": "BiLSTM-CRF: the BiLSTM gives rich contextual emission scores per word, the CRF adds transition scores and Viterbi-decodes the globally-best valid label sequence - deep features + structured decoding."
        }
      ],
      "useCases": [
        "Named-entity recognition (NER) - extracting people, organizations, locations, dates from text - the flagship sequence-labeling task, foundational to information extraction and knowledge-base construction.",
        "Part-of-speech tagging and chunking - assigning grammatical categories, used as features/preprocessing and in linguistic analysis.",
        "Any span-extraction or per-token labeling task - slot filling in dialogue, extracting fields from documents, biomedical entity recognition - framed as labeling each token with a BIO-style tag.",
        "The BiLSTM-CRF (and transformer-CRF) pattern - combining a neural encoder with a CRF layer - is a reusable recipe wherever per-token predictions must form a valid, dependency-respecting sequence."
      ],
      "pitfalls": [
        "Predicting labels independently (per-word argmax) can produce structurally invalid sequences (I-PER after O) - the label dependencies must be modeled jointly, which is exactly what the CRF's transition scores do.",
        "The CRF only models LOCAL (adjacent-label) dependencies in the linear-chain case - it captures 'I-X must follow B-X' but not long-range label constraints; higher-order or global constraints need more expensive models.",
        "Tagging-scheme choice matters: BIO vs BIOES (adding End and Single tags) affects boundary detection, and the scheme interacts with the CRF's transitions - a poorly chosen scheme can make valid spans harder to represent.",
        "CRF training requires the partition function Z (sum over all label sequences), computed by the forward algorithm - correct but adds cost; and Viterbi decoding is exact but O(T*K^2), which grows with the number of label types K.",
        "With strong transformer encoders, the CRF layer's benefit shrinks (the encoder's contextual representations already implicitly capture much label-transition structure), so the CRF is sometimes dropped - but it still helps when strict output validity or explicit transition modeling matters."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/lstm-gru",
          "text": "The BiLSTM (bidirectional LSTM) provides the contextual per-word emission features the CRF decodes over - the encoder from the previous lessons feeds the structured layer."
        },
        {
          "ref": "rnn-nlp/dependency-parsing",
          "text": "Both are structured prediction; sequence labeling's structure is a linear CHAIN (Viterbi decodes it exactly), parsing's is a TREE - two points on the structured-prediction spectrum."
        },
        {
          "ref": "unsupervised-learning/gmm-em",
          "text": "The forward algorithm (for the CRF's partition function) and Viterbi are the same dynamic-programming machinery as HMMs, whose forward-backward is the EM E-step - shared DP foundations."
        },
        {
          "ref": "rnn-nlp/elmo",
          "text": "Contextual embeddings (ELMo, then transformers) provide even richer emission features, further improving sequence labeling - the next step up from BiLSTM features."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is sequence labeling?",
          "a": "Assigning a label to each word in a sequence - named-entity recognition, part-of-speech tagging, chunking - where the labels are interdependent (a structured-prediction problem)."
        },
        {
          "q": "What is BIO tagging?",
          "a": "A scheme where each token gets B- (Begin), I- (Inside), or O (Outside) an entity type - so 'B-PER I-PER' marks a two-word person span. I-X must follow B-X or I-X."
        },
        {
          "q": "Why can't you just predict each word's label independently?",
          "a": "The labels are interdependent - independent per-word argmax can produce invalid sequences (I-PER after O), so the labels must be modeled jointly."
        },
        {
          "q": "What is a Conditional Random Field (CRF)?",
          "a": "A model that scores an ENTIRE label sequence via emission (label-fits-word) + transition (adjacent-label compatibility) scores, decoding the globally-best VALID sequence."
        },
        {
          "q": "What are emission and transition scores?",
          "a": "Emission: how well a label fits a word (from the encoder). Transition: how compatible adjacent labels are (learned; makes invalid transitions like O->I-PER impossible)."
        },
        {
          "q": "What does Viterbi decoding do?",
          "a": "Dynamic programming that finds the exact highest-scoring label sequence in O(T*K^2) - exploiting the linear-chain structure so it doesn't search exponentially many sequences."
        },
        {
          "q": "What is a BiLSTM-CRF?",
          "a": "A bidirectional LSTM produces contextual per-word emission features; a CRF layer adds transition scores and Viterbi-decodes the globally-best valid sequence. SOTA for NER pre-transformers."
        },
        {
          "q": "What dependency does a linear-chain CRF model?",
          "a": "Only adjacent-label (local) dependencies - it captures 'I-X follows B-X' but not long-range label constraints, which need higher-order/global models."
        },
        {
          "q": "How does sequence labeling relate to dependency parsing?",
          "a": "Both are structured prediction; sequence labeling's structure is a linear CHAIN (Viterbi decodes exactly), parsing's is a TREE - the chain is the simpler structure."
        },
        {
          "q": "Do you still need a CRF with transformers?",
          "a": "Less so - strong encoders implicitly capture much transition structure - but a CRF still helps when strict output validity or explicit transition modeling matters."
        }
      ],
      "standard": [
        {
          "q": "Explain why named-entity recognition is a structured-prediction problem and how a CRF addresses it.",
          "a": "Named-entity recognition assigns each token a label (like B-PER, I-PER, B-LOC, I-LOC, O in BIO tagging) marking whether it begins, continues, or is outside an entity of some type. It's structured prediction, not independent classification, because the labels are INTERDEPENDENT via hard structural constraints: an 'Inside' tag (I-PER) is only valid immediately after a 'Begin' or 'Inside' tag of the SAME type (B-PER or I-PER) - an I-PER after an O (outside), or after a B-LOC (different type), is structurally IMPOSSIBLE (you can't be 'inside a person entity' without having begun one). So the correct label for each word depends on its neighbors' labels, and predicting each word's label independently (per-word argmax over the emission scores) can easily produce these invalid sequences - a classifier confident that word 3 is I-PER and word 2 is O gives an impossible 'O I-PER', which then can't be interpreted as a valid entity span. A CRF addresses this by modeling the JOINT label sequence rather than independent labels. It scores an entire candidate label sequence by combining two kinds of evidence: EMISSION scores (how well each label fits its word, coming from the encoder - the local evidence a per-word classifier also uses) and TRANSITION scores (a learned compatibility between each pair of adjacent labels - the piece that captures the dependencies). The transition scores learn that O->I-PER and B-LOC->I-PER are incompatible (assigned very low / effectively forbidden scores) while B-PER->I-PER and B-PER->O are fine. Then, at inference, the CRF DECODES the highest-scoring label sequence GLOBALLY via the Viterbi algorithm, which considers the transition constraints jointly - so it will NEVER output an invalid transition (an impossible transition tanks the whole sequence's score), and it can also exploit soft dependencies (a nearby entity making an adjacent label more likely). This joint, constrained decoding is exactly what independent per-word classification cannot do, and it's why CRFs improved NER: they enforce output validity and model label interactions the per-word approach ignores.",
          "deepDive": {
            "q": "How does the CRF training objective (with the partition function Z) differ from independent per-word cross-entropy, and why does that matter?",
            "a": "The difference is that a CRF is trained to maximize the probability of the correct WHOLE SEQUENCE under a JOINT distribution, while independent per-word classification maximizes each word's label probability separately - and the coupling is exactly what the partition function Z provides. For independent classification, the loss is a sum of per-word cross-entropies, each normalizing over the label set for THAT word alone (a softmax per position), treating positions independently - so the model never learns that certain label COMBINATIONS are impossible, only which single label fits each word. For a CRF, the probability of a label sequence y given input x is P(y|x) = exp(score(y,x)) / Z(x), where score(y,x) sums emission and transition scores over the whole sequence and Z(x) = sum over ALL possible label sequences y' of exp(score(y',x)) - the normalizer runs over the entire exponential space of label sequences, not per-word. Training maximizes log P(gold sequence | x) = score(gold, x) - log Z(x), so the gradient pushes UP the score of the correct whole sequence and pushes DOWN the total score mass of ALL sequences (via Z) - which teaches the model the RELATIVE scores of whole sequences including which transitions are good/bad, coupling the labels. Computing Z naively is intractable (exponentially many sequences), but the linear-chain structure lets the FORWARD ALGORITHM (dynamic programming, like Viterbi but summing instead of maxing) compute Z exactly in O(T*K^2). Why it matters: the CRF's sequence-level objective with the joint normalizer is what makes it learn transition structure and produce globally-coherent, valid label sequences - the per-word objective, lacking the joint normalization, optimizes each label in isolation and so can't learn or enforce the label dependencies. It's the same distinction as everywhere in structured prediction: modeling and normalizing over the JOINT structure (at the cost of computing a partition function) is what captures the interdependence that independent per-item modeling misses, and dynamic programming (forward algorithm / Viterbi) is what makes the joint computation tractable for chain-structured outputs."
          }
        },
        {
          "q": "Walk through the BiLSTM-CRF architecture and explain what each component contributes.",
          "a": "The BiLSTM-CRF combines a neural sequence encoder with a structured decoding layer, and each part contributes something the other can't. The flow: (1) EMBEDDING - map each token to a vector (word embeddings, often plus character-level features to handle morphology and out-of-vocabulary words). (2) BiLSTM - a bidirectional LSTM processes the embedded sequence, producing for each word a hidden state that summarizes context from BOTH directions (the words before AND after it). This bidirectionality is crucial for labeling because the correct label for a word often depends on future context (to know if 'Washington' is a person or a place, you need the surrounding words on both sides). (3) LINEAR (emission) LAYER - a linear projection maps each word's BiLSTM hidden state to a vector of EMISSION scores, one per possible label - 'how well does each label fit this word, given its full context'. (4) CRF LAYER - holds a learned TRANSITION matrix (a score for each label-to-label pair) and combines it with the emission scores to score whole label sequences; at training it maximizes the log-probability of the gold sequence (using the forward algorithm for Z), and at inference it Viterbi-decodes the globally-best valid label sequence. What each contributes: the BiLSTM provides RICH, CONTEXTUAL EMISSION FEATURES - it learns from data what each word looks like in its full bidirectional context, replacing the hand-engineered features classical CRFs relied on (this is the 'deep learned representations' contribution). The CRF provides STRUCTURED DECODING - it models the label transitions and enforces valid, globally-coherent output, which a BiLSTM alone (predicting each label independently from its hidden state via a softmax) cannot do (this is the 'structured prediction' contribution). Together they're complementary: BiLSTM emissions capture 'what does this word look like in context' and CRF transitions capture 'what labels can validly follow what', and Viterbi combines them into the best valid sequence. This synergy - deep contextual features feeding a structured output layer - made BiLSTM-CRF the dominant NER/tagging architecture before transformers, and it's a reusable template (encoder + CRF) that persists with transformer encoders replacing the BiLSTM.",
          "deepDive": {
            "q": "Why did character-level features become a standard addition to word-level BiLSTM-CRF NER models?",
            "a": "Character-level features were added to BiLSTM-CRF NER models because word-level embeddings alone have gaps that character-level information fills - and NER is especially sensitive to these gaps. Three key reasons: (1) OUT-OF-VOCABULARY WORDS - NER frequently encounters names, especially entities, that weren't in the training vocabulary (novel person names, company names, place names), and word embeddings give these no useful vector (or a generic unknown); a character-level model (a character CNN or character BiLSTM that reads the word's letters and produces a vector) can build a representation from the spelling, so even an unseen name gets a meaningful embedding - crucial because entities are disproportionately rare/novel words. (2) MORPHOLOGY and ORTHOGRAPHIC CUES - entity recognition relies heavily on surface form: capitalization (proper nouns are capitalized), suffixes (-ington, -corp, -ville often signal places/organizations), digits and punctuation patterns (dates, codes), and prefixes - character-level features directly capture these orthographic signals that word embeddings abstract away, and these cues are strong evidence for entity type and boundaries. (3) MORPHOLOGICALLY RICH LANGUAGES - for languages with heavy inflection, character features share strength across word forms. Mechanically, a character-level encoder processes each word's character sequence into a fixed vector, which is CONCATENATED with the word embedding before feeding the BiLSTM, so each word's input carries both its distributional meaning (word embedding) and its spelling/orthographic form (character features). This combination was found to significantly improve NER, especially on rare and unseen entities, because it lets the model recognize an entity from its spelling and orthographic cues even when the word itself is novel - directly addressing NER's core challenge of identifying entities that are often rare, novel, or out-of-vocabulary. It's the same subword/character insight as FastText (spelling carries meaning, and out-of-vocabulary words need a representation from their characters), applied within the NER architecture, and it foreshadowed why subword tokenization and contextual (character-aware) representations matter so much for handling the open-ended vocabulary of real text."
          }
        },
        {
          "q": "Compare sequence labeling (linear-chain CRF) with dependency parsing as structured-prediction problems - what makes one easier than the other?",
          "a": "Both are structured prediction - predicting an interdependent output with constraints - but they differ in the STRUCTURE of the output, which determines the tractability of exact inference. Sequence labeling's output is a LINEAR CHAIN: a label per token, where (in a linear-chain CRF) each label depends only on its immediate neighbors. This local, sequential dependency structure is what makes it comparatively EASY: because the dependencies are between adjacent labels only, the highest-scoring valid label sequence can be found EXACTLY and EFFICIENTLY by the Viterbi algorithm (dynamic programming) in O(T*K^2) time - linear in sequence length - and the partition function Z (for training) similarly by the forward algorithm. The chain structure admits polynomial-time exact inference. Dependency parsing's output is a TREE: each word points to a head, with GLOBAL constraints (exactly one root, no cycles, one head per word, and for projective trees no crossing edges). These constraints are non-local - whether an edge is valid depends on the whole tree (a cycle involves multiple edges anywhere), not just adjacent elements - which makes exact inference HARDER: you need specialized algorithms (maximum-spanning-tree / Chu-Liu-Edmonds for non-projective, Eisner's O(n^3) DP for projective) rather than simple linear-chain DP, and transition-based parsing resorts to greedy/beam search precisely because global tree inference is costlier. So the general principle is that the SHAPE of the output structure determines inference difficulty: a chain (local, sequential dependencies) enables exact linear-time DP (Viterbi), while a tree (global, non-local constraints) requires more expensive algorithms or approximation. This is why sequence labeling with a CRF is a 'solved', clean structured-prediction problem (exact efficient inference) while parsing has the richer transition-vs-graph-based algorithmic landscape with its greedy-vs-optimal trade-offs - the tree structure's global constraints are fundamentally harder to satisfy exactly than the chain's local ones. It's a nice illustration that in structured prediction, the tractability isn't about the task's difficulty per se but about the graphical/combinatorial structure of the output and whether it admits efficient exact search.",
          "deepDive": {
            "q": "The Viterbi/forward algorithms for CRFs are the same DP as HMMs - what's the relationship, and how do CRFs improve on HMMs?",
            "a": "CRFs and Hidden Markov Models (HMMs) share the same underlying dynamic-programming machinery (Viterbi for the best sequence, forward-backward for marginals/normalization) because both are sequential/chain-structured models, but they differ fundamentally in being GENERATIVE vs DISCRIMINATIVE, and CRFs improve on HMMs in ways that mirror the logistic-regression-vs-naive-Bayes distinction. An HMM is a GENERATIVE model of the joint P(x, y): it models P(y_t | y_{t-1}) (transition probabilities between hidden states/labels) and P(x_t | y_t) (emission probabilities of observations given labels), assuming each observation depends ONLY on its own label and each label only on the previous one - and it's trained to maximize the joint likelihood. A CRF is a DISCRIMINATIVE model of the conditional P(y | x) directly: it doesn't model how observations are generated, instead directly scoring label sequences given the input using emission and transition FEATURES. The improvements: (1) RICH, OVERLAPPING FEATURES - an HMM's emission P(x_t | y_t) must be a proper probability distribution over observations and (for tractability) assumes observations are conditionally independent given their label, so it CAN'T easily use rich, overlapping features of the input (the word's context, capitalization, neighboring words, suffixes) without violating its independence assumptions; a CRF, modeling P(y|x) directly, can condition on ARBITRARY features of the ENTIRE input x at each position (including future/past words, and in BiLSTM-CRF, deep contextual features) without any generative constraint - a major flexibility gain. (2) NO GENERATIVE ASSUMPTIONS TO VIOLATE - the CRF doesn't waste modeling capacity on P(x) or make possibly-false independence assumptions about observations, so it typically achieves higher labeling accuracy (the discriminative advantage, given enough data - the same Ng-Jordan generative-vs-discriminative story). The DP algorithms are shared because both are linear-chain models where labels depend on neighbors, so Viterbi (max) and forward-backward (sum) apply to both - but the CRF's discriminative formulation with arbitrary input features is what made it superior for sequence labeling, and pairing it with a BiLSTM (rich learned emission features) took full advantage of exactly the flexibility HMMs lacked. So CRF = 'HMM's chain structure and DP inference, but discriminative and able to use rich input features', which is why it superseded HMMs for supervised sequence labeling."
          }
        },
        {
          "q": "In the transformer era, when do you still add a CRF layer on top of a neural encoder, and when can you drop it?",
          "a": "The decision hinges on how much the encoder already captures label-transition structure and how important strict output validity is. WHEN TO KEEP THE CRF: (1) Strict output VALIDITY is required - if the application needs guaranteed valid label sequences (e.g., every predicted entity span must be well-formed, no I-PER after O), the CRF's transition scores enforce this by construction, whereas a per-token classifier (even on transformer features) can still emit invalid sequences that need post-hoc fixing. (2) Explicit label DEPENDENCIES matter and aren't fully captured by the encoder - for tasks with strong, structured label-transition constraints (complex tagging schemes, tasks where adjacent labels strongly constrain each other), the CRF's explicit transition modeling still adds value. (3) Lower-resource settings - with less data, the CRF's explicit structural inductive bias helps the model produce coherent sequences that it might not learn implicitly from limited examples. (4) When empirically the CRF gives a measurable boost on your task/data. WHEN TO DROP IT: (1) Strong transformer encoders (BERT and successors) produce such rich CONTEXTUAL representations that each token's representation already 'knows' a great deal about its neighbors' likely labels - the bidirectional self-attention effectively captures much of the label-transition structure implicitly - so a simple per-token softmax classifier on top of a strong transformer often MATCHES a transformer-CRF, making the CRF's added complexity and inference cost (Viterbi, forward algorithm for Z) unnecessary. (2) When the marginal accuracy gain from the CRF is negligible on your task (empirically, for many NER tasks with a strong pretrained encoder, the CRF adds little). (3) When simplicity, speed, and ease of implementation matter and validity can be handled with light post-processing. So the honest picture: the CRF's benefit has SHRUNK with strong pretrained encoders because they implicitly capture label dependencies that the CRF used to add explicitly, so for high-resource NER with a strong transformer, the CRF is often dropped for simplicity with little loss; but the CRF is still worth adding when you need guaranteed valid output structure, when explicit transition constraints are important, in lower-resource settings, or whenever it empirically helps - it's no longer a default requirement but a tool to deploy when structural validity or explicit dependency modeling justifies its cost. The general lesson (recurring for CRFs, explicit parsing, and other classical structured components) is that strong pretrained representations absorb much of the structure that classical structured layers used to supply explicitly, reducing but not eliminating the need for them.",
          "deepDive": {
            "q": "Why do strong pretrained encoders reduce the CRF's benefit - what is the encoder implicitly learning that the CRF used to provide?",
            "a": "Strong pretrained encoders reduce the CRF's benefit because their contextual representations implicitly encode the very label-dependency information the CRF's transition scores were added to provide explicitly - so the two become partly redundant. Here's the mechanism: a CRF's core added value over per-token classification is modeling TRANSITION structure - that certain label sequences are valid/likely and others invalid/unlikely (I-PER must follow B-PER, a location label makes an adjacent location label more likely, etc.). A per-token classifier on WEAK features had no access to this - it saw each token somewhat in isolation and needed the CRF to impose the sequential coherence. But a strong bidirectional transformer, via self-attention, gives each token a representation that INTEGRATES information from all other tokens including their identities and likely roles - so the representation of a token that should be I-PER already 'sees' that the previous token is a B-PER (a person-name beginning) and encodes context consistent with continuing that entity. In effect, the transformer's contextual encoding has ALREADY propagated the neighboring-label-relevant information into each token's representation, so a simple classifier on top can predict labels that are largely coherent with their neighbors WITHOUT an explicit transition model, because the features it's classifying already reflect the context that determines valid transitions. The transformer is implicitly learning the 'what labels fit together in context' structure through its attention over the whole sequence, which is much of what the CRF's transition matrix explicitly encoded. This is why the CRF's marginal benefit shrinks: the encoder now supplies (implicitly, in the features) the sequential-coherence information the CRF used to supply (explicitly, in the transition scores), making them redundant to a significant degree. The residual value of the CRF is in the parts it does that the encoder still can't guarantee - HARD validity constraints (the encoder makes valid sequences LIKELY but doesn't strictly FORBID invalid ones, while the CRF's structure guarantees valid decoding) and explicit global sequence-level optimization - which is exactly why the CRF is kept when strict validity is required and dropped when 'usually coherent' suffices. It's a concrete instance of the broad pattern that powerful learned representations absorb structure that used to require explicit modeling, shifting classical structured components from necessities to optional refinements."
          }
        },
        {
          "q": "You're building a named-entity recognition system for a specialized domain (say biomedical or legal text). Walk through your approach and key decisions.",
          "a": "I'd approach it as a domain-adaptation-heavy sequence-labeling problem and reason through several decisions. (1) TAGGING SCHEME and label set: define the entity types the domain needs (e.g., biomedical: gene, protein, disease, drug, chemical) and choose a tagging scheme (BIO or the richer BIOES, which adds End and Single tags and often improves boundary detection) - the label set must match the downstream use, and domain entities can have tricky boundaries (long multi-word terms, nested entities) that affect the scheme. (2) ENCODER choice: start from a strong pretrained encoder, but crucially a DOMAIN-ADAPTED one - general-domain BERT underperforms on specialized text because the vocabulary and language differ, so I'd use (or continue-pretrain toward) a domain-specific model (e.g., BioBERT/PubMedBERT for biomedical, a legal-domain model for legal), since in-domain pretraining dramatically helps on specialized terminology and out-of-vocabulary domain terms. (3) SUBWORD/CHARACTER handling: specialized domains have heavy out-of-vocabulary vocabulary (chemical names, gene symbols, legal citations), so a domain-appropriate tokenizer and character-level features (or a domain-pretrained subword vocabulary) matter for representing novel terms from their spelling. (4) OUTPUT LAYER: decide whether to add a CRF - for domains with strict span-validity needs or complex label transitions, a CRF layer helps ensure valid output; with a strong domain-adapted encoder it may be droppable, so I'd try both and measure. (5) DATA: labeled data is usually scarce in specialized domains, so I'd leverage transfer learning (the domain-pretrained encoder does much of the work), consider distant/weak supervision (using domain dictionaries/ontologies to auto-label, then denoise) and active learning to label the most informative examples, and use whatever annotated domain corpora exist (biomedical has curated NER datasets). (6) EVALUATION: use entity-level (span-level) precision/recall/F1 (not just per-token accuracy - a partially-correct span is usually wrong for the downstream use), do error analysis by entity type and boundary vs type errors, and evaluate on held-out DOMAIN data (general-domain performance won't transfer). (7) HANDLING domain quirks: nested/overlapping entities (common in biomedical) may need a scheme beyond flat BIO (span-based or nested-NER models), and normalization/linking to ontologies is often a needed downstream step. The key decisions are dominated by DOMAIN ADAPTATION - the biggest lever is a domain-pretrained encoder plus domain-appropriate tokenization, since specialized terminology is where general models fail - combined with strategies to cope with scarce labeled data (transfer, weak supervision, active learning) and careful span-level evaluation. This reflects the general small-data / domain-shift lessons: match the representation to the domain, exploit transfer learning to compensate for scarce labels, and evaluate on the real distribution with the metric the application needs.",
          "deepDive": {
            "q": "Why does entity-level (span) F1 matter more than token-level accuracy for evaluating NER, and how does that connect to the 'aggregate metric hides what matters' theme?",
            "a": "Entity-level (span) F1 matters more than token-level accuracy for NER because the UNIT that matters to the downstream application is the whole entity SPAN, not individual tokens, and token-level accuracy can look high while the actual entities are mostly wrong. Concretely, consider a three-word entity 'New York Times' (an organization): token-level accuracy scores each of the three tokens separately, so getting two of three tokens right is ~67% token accuracy - but for the application, a span with a wrong boundary (predicting 'York Times' or 'New York' as the entity) is a WRONG entity, useless or misleading for extraction; the partial credit token accuracy gives doesn't reflect that the extracted entity is incorrect. Even worse, the majority class in NER is usually 'O' (outside any entity) - most tokens aren't part of any entity - so token-level accuracy is dominated by correctly labeling the many O tokens, inflating the number while saying little about the actual entity-finding performance (the same imbalance problem as accuracy on rare-positive tasks). Entity-level F1 instead scores a predicted entity as correct ONLY if it EXACTLY matches a gold entity in both boundaries and type (a strict span match), and computes precision (of predicted entities, how many are exactly right) and recall (of gold entities, how many were found) and their F1 - directly measuring 'did we correctly extract the entities', which is what the application cares about. This connects to the recurring 'aggregate metric hides what matters' theme (from the parser-evaluation deep-dive, calibration, slice analysis): token-level accuracy is an aggregate over the wrong unit (tokens) that averages away the entity-boundary structure and is dominated by the easy majority class, hiding the actual entity-extraction quality - exactly like overall accuracy hiding subgroup failures or LAS hiding severe attachment errors. The fix is the same principle: measure the metric at the RIGHT GRANULARITY (spans, the unit the task uses) with awareness of the class imbalance (precision/recall/F1 on entities, not accuracy over tokens), so the number reflects what the application actually needs. It's a concrete NER instance of choosing an evaluation that matches the true objective and unit of value rather than a convenient per-token aggregate that flatters the model while obscuring its real performance on the task that matters."
          }
        },
        {
          "q": "The BIO/CRF sequence-labeling approach assumes each token belongs to at most one entity. What breaks when entities can nest or overlap, and how is that handled?",
          "a": "The standard BIO (or BIOES) sequence-labeling formulation assigns each token exactly ONE label, which bakes in the assumption that entities are FLAT and non-overlapping - each token belongs to at most one entity. This breaks for NESTED or OVERLAPPING entities, which are common in some domains: in biomedical text, 'human epidermal growth factor receptor' might be a protein, while 'epidermal growth factor' inside it is a separate entity, and 'human' might be a species mention - so a single token like 'epidermal' simultaneously belongs to multiple entities of different types and spans. A single BIO label per token literally cannot represent this - you can't tag 'epidermal' as both I-PROTEIN (of the outer entity) and B-PROTEIN (of the inner one) at once - so the flat sequence-labeling formulation is fundamentally unable to capture nested structure, and forcing it to choose one label loses entities. Handling approaches: (1) SPAN-BASED models - instead of labeling tokens, enumerate candidate SPANS (contiguous token subsequences, up to some max length) and classify each span independently as an entity type or not; because different spans can overlap, this naturally represents nested/overlapping entities (both the outer and inner span get classified as entities). This is the dominant modern approach for nested NER, and it also connects to how some question-answering and coreference models work. (2) LAYERED / STACKED sequence labeling - run multiple BIO labeling passes, each capturing one 'layer' of nesting (inner entities in one pass, outer in another), stacking flat labelings to build up nested structure. (3) HYPERGRAPH or parsing-based methods - represent the nested structure with a richer graph/tree formalism that can encode containment. (4) A GENERATIVE / sequence-to-sequence formulation - generate the entities (with their spans and types) as an output sequence, which isn't constrained to one-label-per-token. The trade-offs: span-based enumeration is more expressive (handles nesting) but more expensive (O(n^2) candidate spans, or O(n * max_length)) and requires classifying many negative (non-entity) spans; the flat BIO-CRF approach is efficient and simple but can only do flat NER. So the key lesson is that the CHOICE OF OUTPUT FORMULATION encodes assumptions about the task's structure - BIO assumes flat entities, and when that assumption is violated (nested/overlapping entities), you must switch to a formulation (span-based, layered, or generative) whose structure can represent the true output, exactly the structured-prediction principle that the output representation must match the problem's actual structure.",
          "deepDive": {
            "q": "How do span-based NER models work, and what's the connection to how extractive question-answering models predict answer spans?",
            "a": "Span-based NER models reframe entity recognition from 'label each token' to 'classify each candidate span', and they share their core mechanism with extractive question-answering - both are fundamentally about identifying and scoring SPANS of text. In a span-based NER model: (1) encode the sentence with a contextual encoder (transformer/BiLSTM) to get a representation per token; (2) enumerate candidate spans - contiguous token subsequences, typically all spans up to a maximum length (O(n * max_length) candidates); (3) form a representation for each span (e.g., by combining its start-token and end-token representations, plus a width feature); (4) classify each span independently as one of the entity types OR 'not an entity'. Because spans are enumerated independently and can overlap, this naturally handles nested and overlapping entities - both the outer 'human epidermal growth factor receptor' span and the inner 'epidermal growth factor' span can each be classified as an entity, which flat token-labeling cannot represent. The connection to extractive QA: extractive question-answering (like SQuAD-style QA) also predicts a SPAN - the answer span within a passage - typically by predicting a START position and an END position (each token's representation is scored for how likely it is to be the answer's start and its end, and the best start<=end span is selected). Both tasks are 'find and score spans of text using contextual token representations': NER classifies candidate spans by entity type, QA selects the single best answer span via start/end scoring - the shared abstraction is that a span is identified by its boundaries (start and end tokens) and scored using the encoder's representations of those boundary tokens (and the span between them). This shared 'span identification and scoring' machinery is why span-based methods generalize across NER, QA, coreference resolution, and other span-extraction tasks, and why modern architectures often use a common span-representation approach: encode the text once, then score spans for whatever the task needs (entity type, answer likelihood, coreference). It's an example of recognizing that superficially-different NLP tasks (recognizing entities, answering questions, resolving references) share a deep structure - identifying meaningful spans of text - which lets the same modeling tools apply across them, and it's why span-based formulations became a unifying, expressive alternative to token-level labeling when the flat one-label-per-token assumption is too restrictive."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Sequence labeling",
        "back": "Assign a label to each word (NER, POS tagging, chunking) where labels are interdependent - a structured-prediction problem, not independent classification."
      },
      {
        "type": "definition",
        "front": "BIO tagging",
        "back": "Each token gets B- (Begin), I- (Inside), or O (Outside) an entity type. I-X must follow B-X or I-X - so per-word argmax can produce invalid sequences."
      },
      {
        "type": "definition",
        "front": "Conditional Random Field (CRF)",
        "back": "Scores a whole label sequence via emission (label-fits-word) + transition (adjacent-label compatibility), decoding the globally-best VALID sequence. Models label dependencies jointly."
      },
      {
        "type": "definition",
        "front": "Emission vs transition scores",
        "back": "Emission: how well a label fits a word (from the encoder). Transition: learned compatibility of adjacent labels - forbids invalid transitions like O->I-PER."
      },
      {
        "type": "definition",
        "front": "Viterbi decoding",
        "back": "Dynamic programming finding the exact best label sequence in O(T*K^2) by exploiting the linear-chain structure - not searching exponentially many sequences."
      },
      {
        "type": "definition",
        "front": "BiLSTM-CRF",
        "back": "BiLSTM = rich contextual per-word emission features; CRF = transition scores + Viterbi global decode. Deep features + structured decoding; SOTA NER pre-transformers."
      },
      {
        "type": "intuition",
        "front": "CRF vs HMM",
        "back": "Same chain DP (Viterbi/forward), but CRF is DISCRIMINATIVE (models P(y|x) with arbitrary input features) vs HMM's GENERATIVE P(x,y) with independence assumptions - CRF is more flexible/accurate."
      },
      {
        "type": "pitfall",
        "front": "CRF benefit shrinks with transformers",
        "back": "Strong encoders implicitly capture label-transition structure in their contextual features, so a CRF often adds little - keep it for strict output validity or explicit constraints."
      }
    ],
    "refs": [
      {
        "title": "Lafferty, McCallum, Pereira - Conditional Random Fields (2001)",
        "url": "https://repository.upenn.edu/cis_papers/159/"
      },
      {
        "title": "Lample et al., Neural Architectures for Named Entity Recognition (BiLSTM-CRF, 2016)",
        "url": "https://aclanthology.org/N16-1030/"
      },
      {
        "title": "Huang, Xu, Yu - Bidirectional LSTM-CRF Models for Sequence Tagging (2015)",
        "url": "https://arxiv.org/abs/1508.01991"
      },
      {
        "title": "Jurafsky & Martin, Speech and Language Processing (Ch. 8, Sequence Labeling)",
        "url": "https://web.stanford.edu/~jurafsky/slp3/8.pdf"
      }
    ],
    "demos": []
  }
};
