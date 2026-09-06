// GENERATED from content/lessons/rnn-nlp/word-vectors.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rnn-nlp/word-vectors/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "word-vectors": {
    "level": "core",
    "body": {
      "intuition": [
        "Once text is tokens, each token is just an integer ID - and integers carry no notion of meaning or similarity (token 5 isn't 'closer' to token 6 than to token 500). Word embeddings fix this by mapping each token to a dense vector in a continuous space, learned so that words used in similar contexts land near each other. The result is a geometry of meaning: 'king' and 'queen' are close, 'Paris' and 'Rome' are close, and directions in the space capture relationships. This dense-vector representation is the substrate for every neural NLP model - the embedding table is literally the first learnable layer.",
        "The guiding principle is the distributional hypothesis: 'you shall know a word by the company it keeps' - words that appear in similar contexts tend to have similar meanings. Word2Vec operationalizes this beautifully with a self-supervised task: slide a window over a huge unlabeled corpus and train a model to predict a word from its neighbors (or the neighbors from the word). There are no labels - the context IS the supervision - and the byproduct of learning this prediction task is embeddings that encode meaning. This 'predict the context' recipe is the ancestor of all modern self-supervised representation learning.",
        "The famous demonstration is that these vectors support analogical arithmetic: the vector for 'king' minus 'man' plus 'woman' lands near 'queen', because the learned directions encode consistent relationships (gender, tense, plurality, capital-of). GloVe reaches similar embeddings from a different angle - factorizing a global word co-occurrence matrix rather than predicting local windows - and FastText adds subword (character n-gram) information so it can embed out-of-vocabulary words and better handle morphology. Understanding these three clarifies what an embedding IS before transformers make embeddings contextual."
      ],
      "math": [
        {
          "h": "Word2Vec skip-gram with negative sampling",
          "paras": [
            "Skip-gram trains each word's vector to predict its context words. Rather than a full softmax over the whole vocabulary (expensive), negative sampling turns it into binary classification: push the dot product of a true (word, context) pair up, and push a few random (word, negative) pairs down. The learned center-word vectors are the embeddings."
          ],
          "tex": "\\mathcal{L} = -\\log \\sigma(v_c^\\top v_w) - \\sum_{k=1}^{K} \\log \\sigma(-v_{n_k}^\\top v_w), \\qquad n_k \\sim P_{\\text{noise}}",
          "texNote": "v_w is the center word, v_c a true context word, v_{n_k} K random negatives. Maximize similarity to real neighbors, minimize it to random words - similarity = dot product."
        },
        {
          "h": "Analogies as vector arithmetic",
          "paras": [
            "Because consistent relationships become consistent offset vectors, analogies reduce to arithmetic: to solve 'a is to b as c is to ?', compute the vector b - a + c and find its nearest neighbor. The offset (b - a) captures the relationship (e.g., the 'gender' or 'capital-of' direction), and adding it to c transports along the same relationship."
          ],
          "tex": "\\text{king} - \\text{man} + \\text{woman} \\approx \\text{queen}, \\qquad \\hat{d} = \\arg\\max_{d} \\cos\\!\\big(v_d,\\; v_b - v_a + v_c\\big)",
          "texNote": "The relationship a->b is the offset v_b - v_a; applying it to c and taking the nearest word (by cosine similarity) recovers the analogous word. Consistent offsets = linear structure in meaning."
        }
      ],
      "code": [
        {
          "h": "Skip-gram intuition and analogy arithmetic",
          "paras": [
            "The core operations: similarity is cosine/dot product between embeddings, and analogies are nearest-neighbor searches on vector arithmetic. Shown with a pretrained embedding interface."
          ],
          "code": "import numpy as np\n\n# assume `emb` maps word -> unit-normalized vector (e.g. from gensim Word2Vec / GloVe)\ndef cosine(a, b): return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))\n\ndef analogy(emb, a, b, c, vocab):\n    target = emb[b] - emb[a] + emb[c]              # king - man + woman\n    # nearest word to the target, excluding the inputs\n    best = max((w for w in vocab if w not in {a,b,c}),\n               key=lambda w: cosine(emb[w], target))\n    return best\n\n# analogy(emb, 'man', 'king', 'woman', vocab)  -> 'queen'\n# cosine(emb['paris'], emb['rome'])  -> high; cosine(emb['paris'], emb['banana']) -> low\nprint('similarity = dot product of embeddings; analogies = nearest neighbor of b - a + c')",
          "caption": "Similarity is cosine of embeddings; analogies are the nearest word to b - a + c. Consistent relationship-offsets are what make the arithmetic work."
        },
        {
          "h": "FastText: subwords give out-of-vocabulary embeddings",
          "paras": [
            "FastText represents a word as the sum of its character n-gram vectors, so it can embed a word it never saw in training (and share strength across morphological variants)."
          ],
          "code": "def char_ngrams(word, n=3):\n    w = f'<{word}>'                                  # boundary markers\n    return [w[i:i+n] for i in range(len(w)-n+1)]\n\n# fastText embedding of a word = sum (or mean) of its char n-gram embeddings\n# emb('running') ~ emb('<ru') + emb('run') + emb('unn') + ... + emb('ng>')\n# because 'running', 'runner', 'runs' share n-grams, their vectors are related,\n# and a NEVER-SEEN word like 'runnable' still gets a vector from its n-grams\nprint(char_ngrams('running'))   # word2vec/GloVe would give an unseen word NO vector at all",
          "caption": "FastText sums character n-gram vectors, so morphological variants share structure and out-of-vocabulary words still get an embedding - unlike word2vec/GloVe."
        }
      ],
      "useCases": [
        "The embedding layer of every neural NLP model - the token-ID-to-vector lookup that RNNs and transformers consume - is exactly this idea, learned jointly with the rest of the network.",
        "Semantic search and retrieval - representing documents/queries as vectors and finding nearest neighbors is the basis of vector search and modern RAG (though with contextual, not static, embeddings now).",
        "Transfer learning in the pre-transformer era - pretrained word2vec/GloVe vectors gave a huge boost as initialization for downstream tasks with limited labeled data, the first widespread NLP transfer learning.",
        "Analyzing and auditing meaning - the geometry of embeddings reveals (and can measure) semantic relationships and social biases encoded from the training corpus."
      ],
      "pitfalls": [
        "Static embeddings give ONE vector per word regardless of context, so polysemy is broken: 'bank' (river) and 'bank' (money) collapse into a single averaged vector - the fundamental limitation contextual embeddings (ELMo/BERT) later fixed.",
        "Word2Vec/GloVe have no representation for out-of-vocabulary words - a word not in the training vocabulary gets no vector at all (or a generic unknown), which is exactly the gap FastText's subword n-grams close.",
        "Embeddings absorb and amplify biases from the training corpus - analogies like 'man is to doctor as woman is to nurse' emerge because the corpus reflected them, so embeddings can encode and propagate social stereotypes (a real fairness concern).",
        "The famous analogies are cherry-picked and imperfect: many analogies don't work cleanly, the offset-vector structure is approximate, and evaluation on analogy benchmarks overstates how cleanly meaning is linear.",
        "Cosine similarity in embedding space measures distributional similarity (similar contexts), which conflates different relationships - antonyms like 'hot' and 'cold' appear in very similar contexts, so they're close in the space despite opposite meanings."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/tokenization",
          "text": "Embeddings are indexed by token ID, so the tokenizer defines the units that get embedded - subword tokens are why modern embedding tables are bounded in size."
        },
        {
          "ref": "rnn-nlp/elmo",
          "text": "ELMo (and BERT) make embeddings CONTEXTUAL - a different vector for 'bank' in each sentence - directly fixing static embeddings' polysemy limitation."
        },
        {
          "ref": "unsupervised-learning/pca",
          "text": "Word2Vec/GloVe are dimensionality-reduction-like factorizations of co-occurrence statistics; GloVe is explicitly a matrix factorization, connecting to PCA/SVD."
        },
        {
          "text": "The self-supervised 'predict from context' recipe here is the direct ancestor of masked language modeling and all modern representation learning (Modules 09/12)."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a word embedding?",
          "a": "A dense vector representation of a token, learned so words used in similar contexts are near each other - giving a continuous geometry of meaning."
        },
        {
          "q": "What is the distributional hypothesis?",
          "a": "'You shall know a word by the company it keeps' - words appearing in similar contexts tend to have similar meanings, the basis for learning embeddings from unlabeled text."
        },
        {
          "q": "How does Word2Vec skip-gram train?",
          "a": "Self-supervised: predict context words from a center word (or vice versa) over a sliding window; the context is the supervision, no labels needed."
        },
        {
          "q": "What is negative sampling?",
          "a": "Replacing the expensive full-vocabulary softmax with binary classification: push true (word, context) pairs together and a few random (word, negative) pairs apart."
        },
        {
          "q": "How do word-vector analogies work?",
          "a": "Consistent relationships become consistent offset vectors, so 'a:b :: c:?' is solved by nearest neighbor of b - a + c (e.g. king - man + woman = queen)."
        },
        {
          "q": "How does GloVe differ from Word2Vec?",
          "a": "GloVe factorizes a global word co-occurrence matrix (count-based), while Word2Vec predicts local context windows (prediction-based) - similar embeddings, different route."
        },
        {
          "q": "What does FastText add?",
          "a": "Subword (character n-gram) information: a word's vector is the sum of its n-gram vectors, so it embeds out-of-vocabulary words and captures morphology."
        },
        {
          "q": "What is the key limitation of static embeddings?",
          "a": "One vector per word regardless of context - polysemy collapses ('bank' river vs money become one averaged vector). Fixed by contextual embeddings (ELMo/BERT)."
        },
        {
          "q": "Why can embeddings encode social bias?",
          "a": "They learn from corpus co-occurrence statistics, so stereotypes present in the text become geometric relationships in the space (e.g. biased analogies)."
        },
        {
          "q": "Why are antonyms often close in embedding space?",
          "a": "Cosine similarity measures distributional similarity (similar contexts), and antonyms like hot/cold appear in very similar contexts - so 'close' means 'used similarly', not 'same meaning'."
        }
      ],
      "standard": [
        {
          "q": "Explain how Word2Vec turns an unlabeled corpus into meaningful embeddings, including why negative sampling is used.",
          "a": "Word2Vec creates a self-supervised prediction task from raw text: slide a fixed-size window over the corpus, and for each center word, the task is to predict its surrounding context words (skip-gram) - or predict the center from the context (CBOW). Crucially there are no human labels; the naturally-occurring co-occurrences ARE the supervision, so any amount of unlabeled text becomes training data. Each word has a learnable vector, and the model scores a (center, context) pair by the dot product of their vectors passed through a sigmoid; training pushes the vectors of words that co-occur to have high dot product. The byproduct of learning to predict context is that words appearing in similar contexts end up with similar vectors (the distributional hypothesis made concrete), which is exactly the meaningful geometry we want. Negative sampling exists to make this tractable: the 'correct' way to predict a context word is a softmax over the ENTIRE vocabulary, which costs O(|V|) per training example (tens of thousands to millions of words) - prohibitively expensive across billions of windows. Negative sampling replaces that full softmax with a much cheaper binary classification: for each true (center, context) pair, sample K random 'negative' words (typically 5-20) and train the model to say 'yes' to the true pair and 'no' to the K negatives, via a sigmoid on each dot product. This approximates the softmax gradient at O(K) instead of O(|V|) cost, making training on huge corpora feasible while producing essentially the same quality embeddings.",
          "deepDive": {
            "q": "Why are negative samples drawn from a modified (unigram^0.75) distribution rather than uniformly or by raw frequency?",
            "a": "Negative samples in Word2Vec are drawn from the unigram frequency distribution raised to the power 0.75 (then renormalized), a deliberately chosen middle ground between uniform sampling and raw-frequency sampling. Raw-frequency sampling (proportional to how often each word occurs) would over-sample extremely common words like 'the', 'of', 'and' as negatives, which are poor, uninformative negatives (they co-occur with everything, so pushing them away carries little signal) and would swamp the rare words that actually carry meaning. Uniform sampling (every word equally likely) would over-sample rare words, giving too many negatives that the model would rarely see as true pairs anyway. Raising the frequency to the 0.75 power dampens the distribution: it still samples frequent words more often (they're useful negatives to contrast against) but boosts the relative probability of rarer words compared to raw frequency, so mid-frequency and rare words get sampled as negatives often enough to shape their embeddings well. Empirically the 0.75 exponent was found to produce the best embeddings - it's a tuned hyperparameter of the noise distribution that balances informative-negative selection against covering the vocabulary, and the same distribution is used to subsample very frequent words during training so 'the'/'a' don't dominate the positive examples either."
          }
        },
        {
          "q": "Explain the vector-arithmetic analogy property: why does king - man + woman land near queen, and what does it reveal about the embedding space?",
          "a": "The analogy property works because consistent semantic relationships become consistent geometric offsets (direction + magnitude) in the learned space. When Word2Vec/GloVe learn from a corpus, pairs of words related the same way - king/queen, man/woman, actor/actress, uncle/aunt - all differ along roughly the SAME direction (a 'gender' direction), because the corpus uses each masculine/feminine pair in analogously-shifted contexts. So the offset vector (king - man) approximately equals (queen - woman), which rearranges to king - man + woman ~ queen. Solving the analogy 'man is to king as woman is to ?' therefore reduces to computing the vector king - man + woman (apply the gender offset that took man to king, starting from woman) and finding its nearest neighbor by cosine similarity, which lands near queen. This reveals that the embedding space has approximately LINEAR structure for many relationships: not just similarity (nearby = similar meaning) but consistent directions encoding relational concepts like gender, verb tense, pluralization, and country-capital - the relationships live in the geometry as translations. It's a striking emergent property, evidence that predicting context forces the model to organize meaning in a way where relationships are (approximately) linear operations. The caveat, important for honesty, is that this is APPROXIMATE and cherry-picked: many analogies fail, the offsets aren't perfectly parallel, the standard evaluation excludes the input words from the answer (which flatters the results), and the linear structure holds far better for some relationship types than others - so the analogy demos overstate how cleanly meaning is linear.",
          "deepDive": {
            "q": "What does the imperfection of analogies (and the exclusion of input words in evaluation) tell you about interpreting embedding geometry?",
            "a": "It's a caution against over-interpreting the clean 'meaning is linear arithmetic' story. Two specifics reveal the subtlety: first, standard analogy evaluation computes b - a + c and then takes the nearest word EXCLUDING a, b, and c - and it turns out that without this exclusion, the nearest neighbor of king - man + woman is very often just 'king' again (the result stays close to the largest-magnitude input), meaning much of the 'analogy' is dominated by simple similarity to the inputs rather than a true relational transport; the exclusion is doing significant work to produce the impressive answer. Second, the offset vectors for a given relationship aren't truly parallel - they cluster around a direction but with real spread, so the arithmetic works for prototypical, high-frequency pairs and degrades for rarer or more ambiguous ones. The takeaway for interpreting embedding geometry: the space genuinely captures relational structure, but it's approximate, entangled with raw similarity, and unevenly distributed across relationship types - so embedding directions are useful, real signals (and can be probed and measured, including for bias) but shouldn't be treated as exact, clean semantic operators. This same 'plausible but not fully faithful' caution recurs whenever we read structure out of learned representations (the interpretability lessons make it rigorous)."
          }
        },
        {
          "q": "Compare the count-based (GloVe) and prediction-based (Word2Vec) approaches to word embeddings. Are they fundamentally different?",
          "a": "They arrive at similar embeddings from opposite-looking starting points, and are more deeply related than they first appear. Word2Vec is PREDICTION-based and LOCAL: it slides a window over the corpus and trains vectors to predict local co-occurrences (center predicts context), learning implicitly from streaming local windows via stochastic gradient descent, never explicitly forming a global statistic. GloVe is COUNT-based and GLOBAL: it first builds the full word-word co-occurrence matrix (how often each word appears near each other word across the entire corpus), then learns vectors whose dot products approximate the LOGARITHM of those co-occurrence counts - essentially a weighted matrix factorization of the global co-occurrence statistics. So Word2Vec looks like an online predictive model and GloVe like a batch matrix factorization. But they're not fundamentally different: it was shown (Levy & Goldberg) that Word2Vec's skip-gram with negative sampling is IMPLICITLY factorizing a shifted pointwise-mutual-information matrix of the same co-occurrence statistics GloVe uses explicitly - so both are, at heart, factorizing (log-)co-occurrence information into low-dimensional vectors, just with different weightings and optimization. Practically they produce comparable-quality embeddings; the differences are more about engineering: GloVe can be efficient because it operates on the compact co-occurrence matrix (computed once) and can weight rare vs frequent co-occurrences explicitly, while Word2Vec streams over text and is easy to update incrementally. The deeper lesson is that 'predict the context' and 'factorize the co-occurrence matrix' are two views of the same underlying idea - distributional semantics captured as low-rank structure.",
          "deepDive": {
            "q": "Why does GloVe model the LOG of co-occurrence counts and use a weighting function, rather than fitting raw counts directly?",
            "a": "GloVe fits vector dot products to the log of co-occurrence counts for two connected reasons. First, the log makes the relationship linear in a way that produces the analogy structure: GloVe's design starts from the observation that RATIOS of co-occurrence probabilities encode meaning (e.g., the ratio of how often 'ice' vs 'steam' co-occur with 'solid' vs 'gas' distinguishes them), and taking logs turns those meaningful ratios into vector DIFFERENCES - so log co-occurrence is what makes relationships become linear offsets, giving the analogy arithmetic. Second, raw co-occurrence counts span many orders of magnitude (function words co-occur with everything astronomically often; rare pairs occur once), so fitting them directly would let the huge counts dominate and the model would waste capacity matching 'the'-with-everything while ignoring informative rare co-occurrences; the log compresses this range. GloVe additionally applies a weighting function that CAPS the influence of very high-frequency co-occurrences (they contribute a fixed maximum weight beyond a threshold) and DOWN-weights very rare co-occurrences (which are noisy and possibly spurious), so the factorization focuses on the mid-frequency co-occurrences that carry the most reliable semantic signal. Together, the log transform (for linear relational structure and range compression) and the weighting (to balance frequent vs rare pairs) are what let GloVe's simple weighted least-squares factorization of co-occurrence counts produce high-quality embeddings with the analogy property - it's a carefully-designed objective that bakes in the distributional-ratio insight."
          }
        },
        {
          "q": "You need to embed a corpus with heavy morphology or many rare/technical terms and typos. Why is FastText a better choice than Word2Vec/GloVe, and what's the mechanism?",
          "a": "Word2Vec and GloVe treat each word as an atomic unit with its own independent vector, which creates two problems your corpus hits hard: (1) any word not seen enough times in training (rare technical terms, typos, morphological variants) gets a poor or nonexistent vector, and a word never seen at all gets NO vector (or a generic unknown), and (2) morphologically related words ('run', 'runs', 'running', 'runner') are learned as completely separate vectors, so the model can't share what it learns about one across the others, wasting data and giving rare variants weak vectors. FastText fixes both by representing each word as the SUM (or average) of vectors for its character n-grams (plus the whole word). The mechanism: 'running' is decomposed into overlapping character n-grams like '<ru', 'run', 'unn', 'nni', 'nin', 'ing', 'ng>' (with boundary markers), each n-gram has its own learned vector, and the word's embedding is the composition of these. This means (a) morphological variants SHARE n-grams ('run', 'runs', 'running' all contain 'run'), so they get related vectors and strength is shared across them - great for morphologically rich languages; (b) an out-of-vocabulary word - a never-seen technical term, a novel compound, or a typo - can still be embedded by summing its character n-gram vectors, since those n-grams were seen in other words, so FastText produces a sensible vector for words Word2Vec/GloVe simply cannot handle; and (c) typos and spelling variants land near their correct forms because they share most n-grams. The cost is a larger model (many n-gram vectors) and slightly noisier vectors for words whose meaning isn't compositional in their spelling, but for morphology-heavy, rare-term-heavy, or noisy text FastText's subword approach is clearly superior.",
          "deepDive": {
            "q": "What is the limitation of FastText's compositional (sum-of-n-grams) approach - when does spelling-based embedding mislead?",
            "a": "FastText's core assumption is that a word's meaning is compositional in its spelling - that character n-grams carry meaning that sums to the word's meaning - and this fails whenever spelling and meaning are decoupled. The clearest failure is words that share spelling but not meaning: FastText will place words with similar character n-grams near each other even when they're semantically unrelated, so a rare word might get pulled toward a spelling-similar but meaning-different word. Proper nouns and idiosyncratic terms whose meaning isn't derivable from their characters (many names, brand words, arbitrary codes) get vectors dominated by their n-grams rather than their actual usage, which can be misleading. And for languages or vocabularies where morphology is NOT a reliable meaning signal (or where meaning comes from context far more than form), the subword decomposition adds noise - a word's true distributional meaning gets diluted by generic n-gram vectors. So FastText trades Word2Vec/GloVe's out-of-vocabulary failure for a spelling-compositionality assumption that's usually helpful (morphology and typos) but sometimes wrong (spelling-similar-meaning-different, non-compositional names). It's the recurring representation-learning theme that every method bakes in an inductive bias - here 'meaning is in the characters' - which helps exactly when the bias matches the data (morphological languages, noisy text) and hurts when it doesn't, and the real fix for context-dependent meaning is contextual embeddings, which the next lessons build toward."
          }
        },
        {
          "q": "Explain why static word embeddings fundamentally cannot handle polysemy, and how this motivated contextual embeddings.",
          "a": "Static embeddings (Word2Vec, GloVe, FastText) assign exactly ONE fixed vector to each word type, computed once during training and looked up unchanged at every use. Polysemy - a single word form having multiple distinct meanings, like 'bank' (river edge vs financial institution), 'bat' (animal vs sporting equipment), or 'play' (theater vs sport vs manipulate) - fundamentally breaks this one-vector-per-word scheme, because the training process sees all senses of the word mixed together and can only learn a single vector that is some AVERAGE of all its senses. That averaged vector sits in a compromise location: near neither sense cleanly, pulled toward the more frequent sense, and useless for distinguishing which meaning is intended in a given sentence. The information about which sense is active lives in the CONTEXT (the surrounding words), but a static embedding lookup ignores context entirely - 'bank' gets the same vector in 'river bank' and 'bank account'. This is a fundamental, not incidental, limitation: no amount of training data fixes it, because the representation format itself (one vector per word type) can't express context-dependent meaning. This directly motivated contextual embeddings: ELMo, then BERT and the transformer models, produce a DIFFERENT vector for a word depending on the sentence it appears in - the embedding is a function of the whole context, so 'bank' in 'river bank' gets a vector near water/geography senses and 'bank' in 'bank account' gets one near finance. The model reads the surrounding words and computes a context-specific representation, resolving polysemy by construction. So static embeddings were the crucial first step (dense, meaningful, transferable vectors) but their single-vector-per-word rigidity is precisely the gap that contextual representation learning - the heart of modern NLP - was built to close.",
          "deepDive": {
            "q": "If context resolves polysemy, why were static embeddings still hugely useful and widely deployed for years before contextual ones?",
            "a": "Static embeddings were transformative despite the polysemy limitation because they delivered enormous practical value that outweighed it for many tasks. First, they provided the first widespread NLP TRANSFER LEARNING: you could train embeddings once on a massive unlabeled corpus and then initialize any downstream model's embedding layer with them, giving a large boost on tasks with limited labeled data - meaning was injected for free from unlabeled text, which was revolutionary when labeled data was the bottleneck. Second, they're CHEAP and SIMPLE: a lookup table is trivial to compute and store, with no per-inference model to run, so they scaled to production systems (search, recommendation, classification) easily, whereas contextual embeddings require running a large model on every input. Third, polysemy, while real, affects a minority of tokens strongly - many words are effectively monosemous, and for tasks like document classification or coarse semantic similarity, the averaged vector for a polysemous word is often good enough, especially when the surrounding words (also embedded) provide disambiguating signal at the model level even if not in the individual embedding. So static embeddings occupied a sweet spot of high value / low cost that made them the workhorse of NLP for years; contextual embeddings won once the compute to run big models per-input became affordable and the accuracy gains (largely from resolving context-dependence like polysemy) justified the cost - a classic case of a simpler method dominating until a more expensive, more capable one becomes practical."
          }
        },
        {
          "q": "How would you evaluate the quality of a set of word embeddings?",
          "a": "There are two families of evaluation, intrinsic and extrinsic, and the distinction matters. INTRINSIC evaluation tests the embeddings directly against human judgments of meaning, without a downstream task: (1) word similarity - correlate the cosine similarity of embedding pairs against human-rated similarity scores (datasets like WordSim-353, SimLex-999), measuring whether the geometry matches human intuitions of relatedness; (2) analogy tasks - the b - a + c nearest-neighbor test over benchmark analogy sets (though, as noted, this is flattered by excluding the input words and is cherry-picked); (3) categorization/clustering - whether words group into sensible semantic clusters. Intrinsic tests are fast, interpretable, and directly probe the embedding space, but they measure a proxy for usefulness, not usefulness itself. EXTRINSIC evaluation plugs the embeddings into an actual downstream task (text classification, named-entity recognition, sentiment analysis, question answering) and measures the task performance - this is the metric that actually matters, because it answers 'do these embeddings help the thing I care about?'. The catch is that extrinsic evaluation is slower, task-specific, and confounds embedding quality with everything else in the pipeline. The key insight (and a common interview point) is that intrinsic and extrinsic scores DON'T always agree - embeddings that top a similarity benchmark can underperform on a downstream task and vice versa - so you should ultimately trust extrinsic, task-relevant evaluation and treat intrinsic scores as a quick, cheap diagnostic rather than the final word, exactly the same 'validate on the real objective, not a proxy' discipline as model selection generally.",
          "deepDive": {
            "q": "Why might embeddings that score well on intrinsic similarity benchmarks perform worse on a downstream task?",
            "a": "Because intrinsic benchmarks optimize for a notion of similarity that may not match what the downstream task needs, and the mismatch can be systematic. Intrinsic word-similarity datasets typically reward embeddings where semantically RELATED words are close, but they conflate different relations - 'similarity' (car/automobile) and 'relatedness' (car/road) get blurred, and antonyms (hot/cold), which are distributionally similar, score as 'close' even though many tasks (sentiment, entailment) critically need to distinguish them. So an embedding tuned (or selected) to maximize a similarity benchmark might place antonyms and topically-related-but-different words very close, which HELPS the benchmark but HURTS a task that must separate them. Additionally, the hyperparameters that optimize intrinsic scores (window size, dimensionality, training corpus) aren't the same as those that optimize a given downstream task - e.g., smaller context windows capture more syntactic/functional similarity while larger windows capture topical similarity, and which is better depends entirely on the task. There's also a selection/overfitting concern: repeatedly tuning embeddings against a fixed intrinsic benchmark can overfit that benchmark's particular word pairs and idiosyncrasies without generalizing. This is why the field moved toward extrinsic, task-based evaluation as the arbiter - the same lesson as everywhere in ML that a convenient proxy metric (intrinsic similarity) can diverge from the true objective (downstream utility), so you measure what you actually care about."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Word embedding",
        "back": "A dense vector per token, learned so words in similar contexts are near each other - a continuous geometry of meaning; the first learnable layer of neural NLP models."
      },
      {
        "type": "intuition",
        "front": "Distributional hypothesis",
        "back": "'You shall know a word by the company it keeps' - similar contexts imply similar meanings. The basis for learning embeddings self-supervised from unlabeled text."
      },
      {
        "type": "definition",
        "front": "Word2Vec skip-gram + negative sampling",
        "back": "Predict context from a center word (self-supervised); replace the O(|V|) softmax with binary classification: true pairs together, K random negatives apart."
      },
      {
        "type": "formula",
        "front": "Analogy arithmetic",
        "back": "Consistent relationships = consistent offsets, so a:b::c:? is nearest neighbor of b - a + c (king - man + woman ~ queen). Approximate + cherry-picked, but real linear structure."
      },
      {
        "type": "definition",
        "front": "GloVe vs Word2Vec",
        "back": "GloVe factorizes the global log co-occurrence matrix (count-based); Word2Vec predicts local windows (prediction-based). Deeply related - both factorize co-occurrence stats."
      },
      {
        "type": "definition",
        "front": "FastText",
        "back": "Word vector = sum of its character n-gram vectors - shares strength across morphological variants and embeds out-of-vocabulary words, unlike word2vec/GloVe."
      },
      {
        "type": "pitfall",
        "front": "Static embedding polysemy failure",
        "back": "One vector per word = an AVERAGE of all senses ('bank' river+money collapse). Fundamental limit fixed by contextual embeddings (ELMo/BERT)."
      },
      {
        "type": "pitfall",
        "front": "Embeddings encode bias / antonym closeness",
        "back": "They learn corpus co-occurrence, so social stereotypes become geometry; and cosine measures distributional similarity, so antonyms (hot/cold) are close (used similarly)."
      }
    ],
    "refs": [
      {
        "title": "Mikolov et al., Efficient Estimation of Word Representations (Word2Vec, 2013)",
        "url": "https://arxiv.org/abs/1301.3781"
      },
      {
        "title": "Pennington et al., GloVe: Global Vectors (2014)",
        "url": "https://aclanthology.org/D14-1162/"
      },
      {
        "title": "Bojanowski et al., Enriching Word Vectors with Subword Information (FastText, 2017)",
        "url": "https://aclanthology.org/Q17-1010/"
      },
      {
        "title": "Levy & Goldberg, Neural Word Embedding as Implicit Matrix Factorization (2014)",
        "url": "https://papers.nips.cc/paper/2014/hash/feab05aa91085b7a8012516bc3533958-Abstract.html"
      }
    ],
    "demos": [
      "word2vec",
      "embeddings",
      "vector-search"
    ],
    "demoTitles": {
      "word2vec": "word2vec (Skip-gram)",
      "embeddings": "Embedding Atlas",
      "vector-search": "Vector Search"
    }
  }
};
