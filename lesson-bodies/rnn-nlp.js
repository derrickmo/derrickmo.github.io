// GENERATED from content/lessons/rnn-nlp/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "rnn-nlp". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "tokenization": {
    "level": "intro",
    "body": {
      "intuition": [
        "Before any language model can do arithmetic on text, the text has to become numbers - and the very first design decision is what counts as a 'unit'. Tokenization is that decision: how to chop a string into a sequence of discrete tokens that get mapped to integer IDs. It sounds mundane, but it silently shapes everything downstream: the vocabulary size, how gracefully the model handles rare or unseen words, how many tokens a sentence costs (which is literally what you pay per API call), and even which tasks are hard (arithmetic and spelling are famously awkward partly because of how numbers and characters get split).",
        "The two naive extremes both fail. Word-level tokenization gives short sequences and meaningful units, but the vocabulary is unbounded (every typo, name, and morphological variant is a new word) and any word not seen in training becomes a useless 'unknown' token - catastrophic for morphologically rich languages and real-world text. Character-level tokenization has a tiny fixed vocabulary and never hits an unknown character, but sequences become very long and each token carries almost no meaning, making the model work harder to learn anything. Subword tokenization is the sweet spot the whole field converged on: keep common words whole, break rare words into meaningful pieces, and guarantee that any string can be represented by falling back to smaller units.",
        "Byte-Pair Encoding (BPE) is the dominant algorithm and the cleanest to understand: start from individual characters (or bytes), then repeatedly find the most frequent adjacent pair and merge it into a new token, building up a vocabulary of increasingly large subwords until you reach a target size. WordPiece (used by BERT) is a close variant that merges by likelihood gain rather than raw frequency, and SentencePiece is a framework that runs BPE or unigram tokenization directly on raw text (including the spaces) so it's language-agnostic and reversible. Understanding BPE - a greedy merge loop over pair frequencies - demystifies the component every modern LLM starts with."
      ],
      "math": [
        {
          "h": "The vocabulary-vs-sequence-length trade-off",
          "paras": [
            "Tokenization trades vocabulary size against sequence length. A larger vocabulary means shorter sequences (fewer tokens per sentence) but a bigger, sparser embedding table; a smaller vocabulary means longer sequences but denser reuse of each token. The total compute of a transformer scales with sequence length (quadratically in attention), so token efficiency - how many tokens a given text costs - directly affects cost and context usage."
          ],
          "tex": "\\text{word-level: } |V| \\to \\infty,\\; L \\text{ small} \\qquad \\text{char-level: } |V| \\approx 100,\\; L \\text{ large} \\qquad \\text{subword: } |V| \\sim 10^4\\text{--}10^5,\\; L \\text{ moderate}",
          "texNote": "|V| is vocabulary size, L is sequence length. Subword tokenization picks a middle point: a bounded vocabulary that still keeps sequences reasonably short, with no true out-of-vocabulary failures."
        },
        {
          "h": "BPE: greedily merge the most frequent adjacent pair",
          "paras": [
            "BPE starts with a base vocabulary of characters/bytes and iteratively grows it. At each step it counts how often each adjacent token pair co-occurs across the corpus, merges the single most frequent pair into a new token, and records the merge rule. Repeating this M times yields base + M vocabulary items; the ordered list of merges IS the tokenizer, applied greedily to new text."
          ],
          "tex": "(a, b)^\\star = \\arg\\max_{(a,b)} \\text{count}(a b \\text{ adjacent}), \\qquad V \\leftarrow V \\cup \\{ ab \\}, \\quad \\text{repeat } M \\text{ times}",
          "texNote": "Each iteration adds one token (the most frequent pair merged). The merge list is learned once on a corpus, then applied deterministically; the target vocab size M is the main hyperparameter."
        }
      ],
      "code": [
        {
          "h": "Byte-Pair Encoding from scratch",
          "paras": [
            "The whole training algorithm: count adjacent pairs, merge the most frequent, repeat. This is the exact procedure GPT-style tokenizers use (over bytes rather than characters)."
          ],
          "code": "from collections import Counter\n\ndef get_pairs(tokens):\n    return Counter(zip(tokens, tokens[1:]))\n\ndef train_bpe(text, num_merges):\n    tokens = list(text)                    # start from characters\n    merges = []\n    for _ in range(num_merges):\n        pairs = get_pairs(tokens)\n        if not pairs: break\n        best = max(pairs, key=pairs.get)   # most frequent adjacent pair\n        merges.append(best)\n        # merge every occurrence of `best` into a single token\n        merged, i = [], 0\n        while i < len(tokens):\n            if i < len(tokens)-1 and (tokens[i], tokens[i+1]) == best:\n                merged.append(tokens[i] + tokens[i+1]); i += 2\n            else:\n                merged.append(tokens[i]); i += 1\n        tokens = merged\n    return merges, tokens\n\nmerges, toks = train_bpe('low lower lowest ' * 20, num_merges=10)\nprint('learned merges:', merges[:5])   # ('l','o'), ('lo','w'), ... builds up 'low'\nprint('final token count:', len(toks), 'vs', len('low lower lowest ' * 20), 'chars')",
          "caption": "Count adjacent pairs, merge the most frequent, repeat - the merge list IS the tokenizer. Real BPE runs over raw bytes so any string is representable."
        },
        {
          "h": "Token count is what you pay - and it varies wildly",
          "paras": [
            "The same information costs a different number of tokens depending on the text, which matters because compute, cost, and context limits are all measured in tokens - not characters or words."
          ],
          "code": "# with a real tokenizer (e.g. tiktoken for GPT models):\n# import tiktoken; enc = tiktoken.get_encoding('cl100k_base')\n\nexamples = {\n    'common English': 'the quick brown fox',\n    'rare/technical': 'antidisestablishmentarianism',\n    'code/symbols':  'x = [i**2 for i in range(10)]',\n    'other language': 'sesquipedalian',\n}\n# enc.encode(text) returns the token IDs; len() is the token cost\n# common words -> ~1 token each; rare words split into many subword pieces;\n# a long rare word can cost 5-8 tokens while a common word costs 1\nfor name, txt in examples.items():\n    print(f'{name:16s}: {len(txt)} chars')  # tokens != chars: subword pieces vary by familiarity",
          "caption": "Common words are one token; rare/long words fragment into several subwords. Token count (not character count) drives cost, latency, and context budget."
        }
      ],
      "useCases": [
        "Every LLM and modern NLP model starts with a subword tokenizer - it's the literal first layer of GPT, BERT, LLaMA, and every transformer, converting text to the integer IDs the embedding table indexes.",
        "Cost and context management - API pricing and context-window limits are measured in tokens, so understanding tokenization is how you estimate cost, fit prompts into a window, and explain why some text is unexpectedly expensive.",
        "Handling multilingual and out-of-distribution text - subword/byte tokenization guarantees any string (new words, code, emoji, other scripts) is representable without an 'unknown token' failure, which is why byte-level BPE is standard.",
        "Diagnosing model quirks - many LLM weaknesses (poor arithmetic, spelling/counting-letters tasks, sensitivity to whitespace) trace back to how the tokenizer splits numbers, characters, and spaces."
      ],
      "pitfalls": [
        "Tokenization is not word-splitting: a single 'word' can be several tokens and a token can span a word boundary or a partial word - reasoning about the model in 'words' misleads you about cost and behavior.",
        "Numbers and characters tokenize inconsistently - '123' and '1234' may split completely differently, and letters inside a word aren't individually accessible, which is a large part of why LLMs struggle with arithmetic and character-level tasks (counting letters, reversing strings).",
        "Whitespace and leading spaces matter: in byte-level BPE the space is part of the token (' the' vs 'the' are different tokens), so prompt formatting and trailing spaces can silently change tokenization and model behavior.",
        "The tokenizer is trained on a specific corpus and frozen - text from a very different domain or language than the training corpus fragments into many more tokens (worse efficiency), which is a real cost/performance penalty for underrepresented languages.",
        "Vocabulary size is a fixed design choice with real trade-offs (embedding-table size and softmax cost vs sequence length); you can't compare two models' token counts or 'context length in words' without knowing their tokenizers."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/word-vectors",
          "text": "Once text is tokens, each token ID indexes an embedding vector - the next lesson is how those vectors are learned to carry meaning."
        },
        {
          "ref": "rnn-nlp/classical-lm",
          "text": "Perplexity and language-model probabilities are defined per token, so the tokenizer determines the units the model predicts - and cross-tokenizer perplexity isn't comparable."
        },
        {
          "ref": "rnn-nlp/text-generation",
          "text": "Decoding produces one token at a time, so generation speed and the granularity of sampling are set by the tokenizer."
        },
        {
          "text": "Module 08's transformers consume token-embedding sequences; attention cost is quadratic in the token count, so tokenization efficiency directly affects transformer compute."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does tokenization do?",
          "a": "Splits text into discrete tokens mapped to integer IDs - the first step turning text into the numbers a model can process."
        },
        {
          "q": "Why not use word-level tokenization?",
          "a": "The vocabulary is unbounded (every typo/name/variant is new) and any unseen word becomes a useless unknown token - bad for rare words and morphologically rich languages."
        },
        {
          "q": "Why not use character-level tokenization?",
          "a": "Tiny fixed vocabulary and no unknowns, but sequences get very long and each token carries little meaning, making learning harder and compute higher."
        },
        {
          "q": "What is Byte-Pair Encoding (BPE)?",
          "a": "Start from characters/bytes, repeatedly merge the most frequent adjacent pair into a new token until a target vocabulary size - the merge list is the tokenizer."
        },
        {
          "q": "How does WordPiece differ from BPE?",
          "a": "It merges the pair that most increases the training-data likelihood (a likelihood criterion) rather than raw frequency; used by BERT."
        },
        {
          "q": "What is SentencePiece?",
          "a": "A tokenizer framework that runs BPE or unigram directly on raw text (spaces included), making it language-agnostic and losslessly reversible - no pre-tokenization needed."
        },
        {
          "q": "Why is byte-level BPE used?",
          "a": "Working over raw bytes guarantees every possible string (any language, emoji, code) is representable with no unknown-token failures."
        },
        {
          "q": "Why do LLMs struggle with arithmetic and counting letters?",
          "a": "Numbers split inconsistently into subwords and individual characters within a token aren't accessible, so digit/character-level operations are awkward for the model."
        },
        {
          "q": "Do leading spaces matter in tokenization?",
          "a": "Yes - in byte-level BPE the space is part of the token, so ' the' and 'the' are different tokens; formatting can change tokenization."
        },
        {
          "q": "Why is token count more relevant than word or character count?",
          "a": "Cost, latency, and context-window limits are all measured in tokens, and one word can be several tokens depending on familiarity."
        }
      ],
      "standard": [
        {
          "q": "Walk through how BPE is trained and then applied to new text, and explain why it handles unseen words gracefully.",
          "a": "Training: start with the corpus represented as sequences of base units (characters, or more commonly bytes so nothing is out-of-vocabulary). Count how often each adjacent pair of tokens co-occurs across the whole corpus, find the single most frequent pair, and merge it everywhere into a new token, recording that merge rule. Repeat this greedy merge step until you reach the target vocabulary size (base units + number of merges) - early merges capture common letter pairs, later merges build up common subwords and whole frequent words. The output is an ordered list of merge rules plus the resulting vocabulary. Application: to tokenize new text, split it into base units and then apply the learned merges in order (greedily merging the highest-priority applicable pairs), which deterministically reproduces the subword segmentation. It handles unseen words gracefully because of the base-unit fallback: a word never seen in training doesn't become an 'unknown' token - it's segmented into whatever known subword pieces (down to individual bytes in the worst case) the merge rules produce. So a novel word like a new technical term or a rare name gets broken into meaningful, reusable subword fragments the model has seen in other contexts, rather than being lost - which is the key advantage over word-level tokenization.",
          "deepDive": {
            "q": "Why does BPE apply merges in the order they were learned, and what would go wrong otherwise?",
            "a": "The merge order encodes a priority: earlier (more frequent) merges are applied before later ones, so tokenization is deterministic and matches the segmentation the vocabulary was built to represent. Concretely, when tokenizing new text you repeatedly find the highest-priority (earliest-learned) merge rule that applies to any adjacent pair in the current sequence and apply it, then repeat - this greedy, priority-ordered process reconstructs the same subword units seen in training. If you applied merges in an arbitrary order (or all-at-once by frequency in the new text), you could get a different, inconsistent segmentation of the same word across contexts, which would fragment the vocabulary's meaning - the model would see the same string tokenized different ways, wasting capacity and hurting learning. The ordered merge list makes tokenization a fixed, reproducible function, so a given string always maps to the same token sequence, which is essential for the embedding table to build stable representations of each subword."
          }
        },
        {
          "q": "Explain the vocabulary-size trade-off in tokenization: what does a larger vocabulary buy and cost?",
          "a": "Vocabulary size sits between two competing pressures. A LARGER vocabulary means each token covers more text (common words and even phrases become single tokens), so sequences are SHORTER for the same content - fewer tokens to process, which reduces the number of attention/compute steps (and attention is quadratic in sequence length, so this compounds), lowers API cost, and fits more content into a fixed context window. But a larger vocabulary costs more in the embedding table and the output softmax: the model needs an embedding vector per token and a final linear layer producing a logit per token, both O(|V| * hidden_dim), so a huge vocabulary inflates parameter count and the cost of the output projection, and rare tokens get few training examples (sparse, poorly-learned embeddings). A SMALLER vocabulary is the reverse: a compact, densely-trained embedding table and cheap softmax, but longer sequences (each piece of text costs more tokens), raising per-sequence compute and eating context budget, and pushing more of the modeling burden onto composing many small pieces. So the choice balances sequence length and per-step efficiency against embedding/softmax cost and how well each token is trained - modern LLMs land around 10^4 to 10^5 tokens as the empirical sweet spot, large enough to keep sequences short but not so large that the embedding table dominates or tokens are undertrained.",
          "deepDive": {
            "q": "How does a larger vocabulary interact specifically with the output softmax cost, and what techniques address it?",
            "a": "The final layer of a language model projects the hidden state to a logit for every token in the vocabulary and applies a softmax, costing O(|V| * hidden_dim) per predicted position - so a very large vocabulary makes this output projection and normalization a significant fraction of compute and memory (the weight matrix alone is |V| * hidden_dim parameters). Techniques to mitigate it historically included the hierarchical softmax (organize the vocabulary as a tree so predicting a token costs O(log |V|) instead of O(|V|), used in word2vec) and sampled/noise-contrastive approximations during training (only compute the softmax over the true token plus a sample of negatives, avoiding the full normalization - also used in word2vec's negative sampling). For modern transformers, weight tying (sharing the input embedding matrix with the output projection) halves the parameter cost, and the vocabulary is kept in the sweet-spot range rather than made enormous. The tension is fundamental: a bigger vocabulary shortens sequences (helping the quadratic attention cost) but grows the linear-in-|V| embedding/softmax cost, so the optimal vocabulary size balances these two opposing compute terms - which is why it's a deliberately tuned hyperparameter, not maximized."
          }
        },
        {
          "q": "A user complains that an LLM can't reliably count the letters in a word or do multi-digit arithmetic. Explain how tokenization contributes to this, and what it implies.",
          "a": "Both failures trace substantially to tokenization hiding the sub-token structure the task needs. For counting letters: the tokenizer maps a word to one or a few subword tokens, and the individual characters inside a token are not separately represented - the model sees, say, the single token for 'strawberry' (or a couple of subword pieces), not a sequence of individual letters, so 'how many r's' requires the model to have memorized the spelling of that token rather than being able to inspect its characters directly. The information is there implicitly (the embedding encodes the string) but not in an easily-countable form. For arithmetic: numbers tokenize inconsistently - '123', '1234', and '12345' can split into completely different subword pieces (e.g., '123' as one token but '1234' as '12'+'34' or '123'+'4' depending on the merges), so the model can't rely on a stable per-digit representation with consistent place value; the same digit in different positions or different-length numbers gets different tokens, making the carrying and place-value logic that arithmetic requires very hard to learn. The implication is that these are not fundamental reasoning failures so much as representation mismatches: the tokenizer discards the uniform character/digit-level structure the task depends on. It also implies fixes - some models add digit-level tokenization for numbers, or chain-of-thought prompting that spells out digits/characters explicitly helps by forcing the sub-token structure into the token stream where the model can operate on it - and it's a caution that the tokenizer is a real, consequential modeling choice, not a neutral preprocessing step.",
          "deepDive": {
            "q": "Why might tokenizing each digit separately help arithmetic, and what does it cost?",
            "a": "Tokenizing each digit as its own token (so '1234' becomes four tokens '1','2','3','4') gives the model a uniform, position-aligned representation of numbers: every digit is the same token regardless of the number's length or the digit's position, so the model can learn consistent place-value and carrying operations across the digit sequence rather than facing a different subword segmentation for every number. This is why some models (and prompting tricks that space out digits) improve arithmetic - the regular structure matches the algorithm arithmetic actually requires. The cost is sequence length and efficiency: numbers become much longer token sequences (a 10-digit number is 10 tokens instead of 1-3), consuming more context and compute, and it only helps the numeric case while every other kind of text still uses subword tokenization. So it's a targeted trade-off - spend more tokens on numbers to make their structure learnable - which is exactly the general tokenization theme that the choice of units directly determines which tasks are easy or hard, and there's no single tokenization that's optimal for everything."
          }
        },
        {
          "q": "Compare BPE, WordPiece, and the unigram (SentencePiece) approaches - how each decides on the vocabulary.",
          "a": "All three produce subword vocabularies but differ in the criterion and direction of construction. BPE is bottom-up and frequency-driven: it starts from base units and greedily merges the most FREQUENT adjacent pair at each step, building larger tokens until the target size - simple, deterministic, and the merges define the tokenizer. WordPiece (BERT) is also bottom-up and merge-based, but instead of raw frequency it merges the pair that most increases the LIKELIHOOD of the training corpus under a unigram language model of the tokens - i.e., it picks the merge that best 'explains' the data, which tends to favor merges that are frequent relative to the frequency of their parts, a slightly more principled criterion than raw count. The unigram model (the other SentencePiece option, from Kudo) is top-down and probabilistic: it starts with a large candidate vocabulary and iteratively PRUNES tokens, removing those whose loss (drop in corpus likelihood under a unigram token model) is smallest, until the target size - and crucially it keeps a probability per token, so at tokenization time it can consider MULTIPLE possible segmentations of a word and pick the most probable (or sample among them, enabling 'subword regularization'). SentencePiece is the framework wrapping BPE or unigram to run directly on raw text including spaces (treating the input as a raw character stream, making it language-agnostic and reversible). Practically: BPE is the most common (GPT family, and the mechanism is easiest to reason about), WordPiece is BERT's, and unigram/SentencePiece is favored for multilingual and non-space-delimited languages and when you want a probabilistic model of segmentation.",
          "deepDive": {
            "q": "What is subword regularization and why does the unigram model enable it while BPE doesn't naturally?",
            "a": "Subword regularization is a training-time data augmentation where the SAME word is deliberately tokenized in DIFFERENT valid ways across training examples, so the model sees multiple segmentations of the same string and learns representations robust to how a word happens to be split. The unigram model enables this naturally because it's probabilistic: it assigns a probability to each token and can enumerate the multiple possible segmentations of a word (there are usually several valid ways to break a word into vocabulary subwords) with their probabilities, so during training you can SAMPLE a segmentation from that distribution rather than always taking the single most-probable one. BPE doesn't naturally support this because its greedy, priority-ordered merge process is DETERMINISTIC - a given string maps to exactly one segmentation, so there's no built-in distribution over segmentations to sample from (though a stochastic 'BPE-dropout' variant randomly skips merges to inject similar variability). The benefit of subword regularization is improved robustness and a mild regularization effect - the model doesn't overfit to one arbitrary segmentation and handles noisy or unusually-split text better - which is why the probabilistic unigram approach is attractive for low-resource and multilingual settings where segmentation ambiguity is high and robustness matters."
          }
        },
        {
          "q": "Why is byte-level tokenization (over raw bytes rather than Unicode characters) the modern default, and what problem does it solve?",
          "a": "Byte-level tokenization operates on the raw UTF-8 bytes of the text rather than on Unicode characters, and its key property is that the base vocabulary is just the 256 possible byte values - which is small, fixed, and covers absolutely everything, because any string in any language, any emoji, any symbol, and any code is ultimately a sequence of bytes. This guarantees there is NEVER a true out-of-vocabulary failure: even a character the tokenizer's training corpus never saw is representable as its constituent bytes, so byte-level BPE can encode any possible input string. It solves the problem that character-level tokenization over Unicode faces - Unicode has ~150,000 characters across all scripts, so a character-level base vocabulary is either huge or incomplete, and rare scripts/emoji would be unknown; working at the byte level sidesteps this entirely with a 256-symbol base. On top of these bytes, BPE merges build up common subwords as usual, so common English text still tokenizes efficiently into whole-word tokens while exotic input degrades gracefully to byte sequences rather than failing. The cost is that non-Latin scripts (whose characters are multiple UTF-8 bytes each) can tokenize into more tokens than a script-native tokenizer would, a fairness/efficiency penalty for underrepresented languages - but the universality and the elimination of unknown tokens made byte-level BPE (used by GPT-2 onward) the robust default, especially for models expected to handle arbitrary web text, code, and many languages.",
          "deepDive": {
            "q": "What is the token-efficiency fairness issue byte-level tokenization creates across languages, and why does it matter?",
            "a": "Because byte-level BPE's merges are learned from a training corpus that's typically English-dominated, common English words become single efficient tokens, but text in underrepresented languages - especially those using non-Latin scripts where each character is 2-4 UTF-8 bytes - gets far fewer learned merges and fragments into many more tokens per unit of meaning. Concretely, the same sentence's worth of information can cost several times more tokens in, say, an Indic or Southeast Asian language than in English. This matters for three reasons: (1) COST - since API pricing and compute are per-token, speakers of underrepresented languages pay more for the same content, an equity issue; (2) CONTEXT - the effective context window (measured in tokens) holds less actual text in these languages, so the model can 'see' less of a document; (3) PERFORMANCE - longer token sequences for the same content are harder to model and the undertrained subword pieces carry weaker representations, contributing to worse quality in those languages. It's a concrete, measurable downstream consequence of a tokenizer trained on skewed data, and it's why multilingual models invest in more balanced tokenizer training corpora and larger/more balanced vocabularies - the tokenizer, far from a neutral preprocessing step, encodes and propagates the representation imbalance of its training data."
          }
        },
        {
          "q": "You're building a model for a specialized domain (say chemistry or source code) where standard tokenization fragments key terms badly. What are your options?",
          "a": "The problem is that a general-purpose tokenizer trained on web text has no merges for your domain's frequent terms, so chemical formulae, gene names, or code identifiers shatter into many subword (or byte) pieces - hurting efficiency and forcing the model to reassemble meaningful units from fragments. Options, roughly in increasing cost: (1) Add special/domain tokens to the existing vocabulary - extend the tokenizer with a curated set of important domain terms as new tokens (and correspondingly extend the embedding table with new rows initialized sensibly), keeping the base tokenizer intact so general text still works; this is cheap and common for adding a handful of known-important terms or control tokens. (2) Train a domain-specific tokenizer from scratch on a domain corpus - if the whole application is in-domain (a code model, a biomedical model), learning BPE/unigram merges directly on domain text produces a vocabulary where the frequent domain units are single efficient tokens (this is why code models often use tokenizers trained on code, which handle indentation, camelCase, and operators far better). (3) Continue tokenizer/model pretraining on domain data so the existing subword pieces get better-trained representations even without new tokens. The trade-offs: adding tokens or retraining the tokenizer changes the vocabulary, so you generally must retrain or at least fine-tune the model's embeddings (and can't directly reuse a pretrained model's weights for the new tokens without initialization care), and a fully domain-specific tokenizer sacrifices some general-text efficiency. The decision hinges on how in-domain the application is: a few extra special tokens for a mostly-general model, versus a from-scratch domain tokenizer for a dedicated domain model.",
          "deepDive": {
            "q": "When you add new tokens to a pretrained model's vocabulary, why can't you just use random embeddings for them, and how do you initialize them well?",
            "a": "A pretrained model's embedding space is already highly structured - existing token embeddings occupy a learned geometry where the rest of the network expects inputs to live, and the output softmax expects logits calibrated to that space. Dropping in randomly-initialized embeddings for new tokens places them at arbitrary, out-of-distribution points, so early in fine-tuning those tokens produce meaningless activations that can destabilize training and take a long time to move into the right region, and their output logits are miscalibrated relative to existing tokens. Better initializations exploit the fact that a new token usually has a meaning expressible in existing tokens: a common, effective heuristic is to initialize the new token's embedding as the AVERAGE of the embeddings of the subword tokens it would have been split into under the old tokenizer (so a new single token for a term starts near the centroid of its old pieces, already in a sensible region of the space), and similarly initialize its output-projection row. This gives the new token a warm start that's semantically close to its decomposition, so fine-tuning only has to refine rather than discover its representation from noise - dramatically faster and more stable than random initialization. It's the same principle as any transfer-learning initialization: start new parameters near where the existing structure implies they should be, not at random."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Tokenization",
        "back": "Splitting text into discrete tokens mapped to integer IDs - the first step converting text into numbers a model processes. Shapes vocab size, sequence length, and cost."
      },
      {
        "type": "intuition",
        "front": "Word vs char vs subword",
        "back": "Word: unbounded vocab + unknown-word failures. Char: tiny vocab but very long sequences, weak tokens. Subword (BPE): bounded vocab, no true unknowns, moderate length - the winner."
      },
      {
        "type": "definition",
        "front": "Byte-Pair Encoding (BPE)",
        "back": "Start from chars/bytes; repeatedly merge the most frequent adjacent pair into a new token until a target vocab size. The ordered merge list IS the tokenizer."
      },
      {
        "type": "definition",
        "front": "WordPiece vs BPE",
        "back": "WordPiece (BERT) merges the pair that most increases corpus likelihood; BPE merges the most frequent pair. Both bottom-up and merge-based."
      },
      {
        "type": "definition",
        "front": "SentencePiece / unigram",
        "back": "Runs BPE or a probabilistic unigram model on raw text (spaces included) - language-agnostic, reversible; unigram keeps token probabilities enabling multiple segmentations."
      },
      {
        "type": "intuition",
        "front": "Why byte-level BPE?",
        "back": "A 256-byte base vocabulary covers every possible string (any language/emoji/code) - no true out-of-vocabulary failures, at some token-efficiency cost for non-Latin scripts."
      },
      {
        "type": "pitfall",
        "front": "Tokens != words",
        "back": "One word can be several tokens; a token can span a boundary; leading spaces are part of the token (' the' != 'the'). Reason in tokens, not words, for cost and behavior."
      },
      {
        "type": "pitfall",
        "front": "Why LLMs struggle at arithmetic/counting letters",
        "back": "Numbers split inconsistently across lengths and characters inside a token aren't accessible - the tokenizer hides the uniform digit/char structure those tasks need."
      }
    ],
    "refs": [
      {
        "title": "Sennrich et al., Neural Machine Translation of Rare Words with Subword Units (BPE, 2016)",
        "url": "https://aclanthology.org/P16-1162/"
      },
      {
        "title": "Kudo, Subword Regularization / Unigram LM (2018)",
        "url": "https://aclanthology.org/P18-1007/"
      },
      {
        "title": "Kudo & Richardson, SentencePiece (2018)",
        "url": "https://aclanthology.org/D18-2012/"
      },
      {
        "title": "Hugging Face: Tokenizers course (BPE/WordPiece/Unigram)",
        "url": "https://huggingface.co/learn/nlp-course/chapter6/1"
      }
    ],
    "demos": [
      "tokenizer"
    ]
  },
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
    ]
  },
  "rnn": {
    "level": "core",
    "body": {
      "intuition": [
        "A feedforward network sees a fixed-size input all at once, but language is a variable-length sequence where order and context matter. Recurrent neural networks were the first neural answer: process the sequence one element at a time, and carry a hidden state - a summary of everything seen so far - forward from step to step. At each position the RNN combines the current input with the previous hidden state to produce a new hidden state, so the same small set of weights is applied repeatedly, letting one network handle sequences of any length while remembering the past.",
        "The defining feature is weight sharing across time: it's the SAME recurrent cell applied at every position, just fed a different input and the running hidden state. This is what makes RNNs parameter-efficient (a fixed number of weights regardless of sequence length) and able to generalize across positions - the network learns one update rule and reuses it. Unrolling the recurrence over the sequence turns it into a deep computation graph (as deep as the sequence is long), which is trained by ordinary backpropagation applied through that unrolled graph - 'backpropagation through time'.",
        "But that same recurrence is the RNN's fatal weakness. To learn a dependency between step 1 and step 100, the gradient must flow backward through 100 repeated multiplications by the recurrent weight, and repeated multiplication either shrinks the signal toward zero (vanishing gradients - the network can't learn long-range dependencies) or blows it up (exploding gradients - training diverges). This vanishing/exploding gradient problem is why plain RNNs struggle to remember anything more than a handful of steps back, and it's the precise problem that LSTMs and GRUs (next lesson) were invented to solve, before attention/transformers sidestepped recurrence entirely."
      ],
      "math": [
        {
          "h": "The recurrence: one shared cell over time",
          "paras": [
            "At each timestep t, the RNN computes a new hidden state from the current input x_t and the previous hidden state h_{t-1}, using shared weight matrices. An output can be read off the hidden state at each step (or only at the end). The same W_xh, W_hh, W_hy are reused at every timestep - that's the 'recurrent' weight sharing."
          ],
          "tex": "h_t = \\tanh(W_{xh} x_t + W_{hh} h_{t-1} + b_h), \\qquad y_t = W_{hy} h_t + b_y",
          "texNote": "h_t summarizes the sequence up to t. W_hh (the hidden-to-hidden weight) is applied every step - repeated multiplication by it during backprop is the source of vanishing/exploding gradients."
        },
        {
          "h": "Backpropagation through time and the gradient chain",
          "paras": [
            "Training unrolls the recurrence and backpropagates. The gradient of a loss at step t with respect to an early hidden state involves a product of Jacobians of the recurrence - one factor per timestep - so the long-range gradient is a product of many terms, which shrinks or grows exponentially with the distance."
          ],
          "tex": "\\frac{\\partial \\mathcal{L}_t}{\\partial h_k} = \\frac{\\partial \\mathcal{L}_t}{\\partial h_t} \\prod_{i=k+1}^{t} \\frac{\\partial h_i}{\\partial h_{i-1}}, \\qquad \\Big\\lVert \\frac{\\partial h_i}{\\partial h_{i-1}} \\Big\\rVert \\ne 1 \\Rightarrow \\text{vanish/explode}",
          "texNote": "The product of (t-k) Jacobians: if each has norm < 1 the product vanishes exponentially (can't learn long range); if > 1 it explodes. This is the core RNN limitation."
        }
      ],
      "code": [
        {
          "h": "An RNN cell forward pass from scratch",
          "paras": [
            "The whole recurrence: loop over the sequence, updating the hidden state with the same weights each step. This is exactly what a framework's RNN layer does internally."
          ],
          "code": "import numpy as np\n\ndef rnn_forward(inputs, h0, Wxh, Whh, Why, bh, by):\n    h = h0\n    hs, ys = [], []\n    for x in inputs:                                  # one step per sequence element\n        h = np.tanh(Wxh @ x + Whh @ h + bh)          # SAME weights every step\n        y = Why @ h + by\n        hs.append(h); ys.append(y)\n    return hs, ys\n\n# shapes: x_t (input_dim,), h (hidden_dim,), Wxh (hidden,input), Whh (hidden,hidden)\nH, D = 8, 4\nWxh, Whh, Why = np.random.randn(H,D)*0.1, np.random.randn(H,H)*0.1, np.random.randn(2,H)*0.1\nhs, ys = rnn_forward([np.random.randn(D) for _ in range(10)], np.zeros(H),\n                      Wxh, Whh, Why, np.zeros(H), np.zeros(2))\nprint('processed', len(hs), 'steps; final hidden summarizes the whole sequence')",
          "caption": "The recurrent cell applies the SAME W_xh, W_hh, W_hy at every timestep, carrying the hidden state forward - parameter count is independent of sequence length."
        },
        {
          "h": "Gradient clipping: the standard fix for exploding gradients",
          "paras": [
            "Exploding gradients are cheap to fix - just rescale the gradient when its norm exceeds a threshold, preserving direction while capping magnitude. Vanishing gradients are the harder problem (LSTMs address them)."
          ],
          "code": "import numpy as np\n\ndef clip_grad_norm(grads, max_norm):\n    total = np.sqrt(sum((g**2).sum() for g in grads))\n    if total > max_norm:\n        scale = max_norm / (total + 1e-8)\n        grads = [g * scale for g in grads]           # same direction, capped magnitude\n    return grads\n\n# during BPTT, clip the flattened gradients before the optimizer step:\n# grads = clip_grad_norm(grads, max_norm=5.0)\nprint('clipping bounds exploding gradients; vanishing gradients need architecture (LSTM/GRU)')",
          "caption": "Gradient clipping rescales an over-large gradient to a max norm, preventing divergence - it fixes EXPLODING gradients but not vanishing ones, which need gated cells."
        }
      ],
      "useCases": [
        "The foundational architecture for sequence modeling - character/word language models, time-series forecasting, and sequence labeling all started with RNNs, and the hidden-state-summary idea underlies later sequence models.",
        "Streaming/online processing - because an RNN processes one step at a time and maintains a fixed-size state, it's naturally suited to real-time streaming input (unlike transformers, which reprocess the whole context), still relevant for low-latency/on-device settings.",
        "Teaching the sequence-modeling mindset - hidden state as memory, weight sharing across time, and backpropagation through time are concepts that carry directly into LSTMs, GRUs, and even the recurrence-free reasoning behind attention.",
        "Encoder-decoder sequence-to-sequence models (with attention) for translation and summarization were RNN-based before transformers, and the seq2seq framing (a flagship lesson in this module) originated here."
      ],
      "pitfalls": [
        "Vanishing gradients: gradients backpropagated through many timesteps shrink exponentially (repeated multiplication by Jacobians with norm < 1), so plain RNNs cannot learn dependencies more than a handful of steps apart - the central limitation.",
        "Exploding gradients: the same repeated multiplication can blow up (Jacobian norm > 1), causing NaN losses - fixable with gradient clipping (rescale to a max norm), unlike vanishing gradients.",
        "Sequential computation prevents parallelism: each hidden state depends on the previous one, so an RNN can't be parallelized across the sequence during training (only across the batch) - a key reason transformers, which process all positions in parallel, won at scale.",
        "The hidden state is a fixed-size bottleneck: everything about the past must be compressed into one vector, so long or information-dense sequences lose detail - the motivation for attention, which lets the model look back at all positions directly.",
        "Truncated backpropagation through time (a practical necessity for long sequences to bound memory/compute) limits how far back gradients flow, further capping the effective memory even before vanishing gradients bite."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/lstm-gru",
          "text": "LSTMs and GRUs add gating and a cell state with a near-identity gradient path, directly solving the vanishing-gradient problem that limits plain RNNs to short-range dependencies."
        },
        {
          "ref": "foundations/calculus",
          "text": "Backpropagation through time is the chain rule applied to the unrolled recurrence; the product of Jacobians is exactly the vanishing/exploding-gradient mechanism from the calculus lesson."
        },
        {
          "ref": "rnn-nlp/seq2seq-attention",
          "text": "Attention was introduced to fix the fixed-size hidden-state bottleneck of RNN encoder-decoders by letting the decoder look at all encoder states - the flagship lesson."
        },
        {
          "text": "Module 08's transformers replace recurrence entirely with attention, gaining full parallelism across the sequence and direct long-range connections - the successor to everything here."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a recurrent neural network?",
          "a": "A network that processes a sequence one step at a time, carrying a hidden state (summary of the past) forward and combining it with each new input using shared weights."
        },
        {
          "q": "What does the hidden state represent?",
          "a": "A fixed-size summary of everything the RNN has seen up to the current step - its memory of the sequence so far."
        },
        {
          "q": "What is weight sharing across time?",
          "a": "The SAME recurrent cell (same weight matrices) is applied at every timestep - so parameter count is independent of sequence length and the update rule generalizes across positions."
        },
        {
          "q": "What is backpropagation through time (BPTT)?",
          "a": "Unrolling the recurrence into a deep graph and applying ordinary backpropagation through it - the chain rule over the sequence's timesteps."
        },
        {
          "q": "What is the vanishing gradient problem?",
          "a": "Gradients through many timesteps are a product of Jacobians; if each has norm < 1 the product shrinks exponentially, so RNNs can't learn long-range dependencies."
        },
        {
          "q": "What is the exploding gradient problem?",
          "a": "The same product of Jacobians blows up when norms > 1, giving NaN/divergent training - fixed by gradient clipping (rescale to a max norm)."
        },
        {
          "q": "How do you fix exploding gradients?",
          "a": "Gradient clipping - rescale the gradient to a maximum norm, preserving direction but capping magnitude. (Vanishing gradients need architecture changes.)"
        },
        {
          "q": "Why can't RNNs be parallelized across the sequence?",
          "a": "Each hidden state depends on the previous one, so timesteps must be computed in order - only the batch dimension parallelizes, unlike transformers."
        },
        {
          "q": "What is the hidden-state bottleneck?",
          "a": "The entire past must be compressed into one fixed-size vector, so long/dense sequences lose information - the motivation for attention."
        },
        {
          "q": "What is truncated BPTT?",
          "a": "Backpropagating only a fixed number of steps back (to bound memory/compute on long sequences), which further limits how far gradients - and thus learning - reach."
        }
      ],
      "standard": [
        {
          "q": "Explain the RNN forward pass and why weight sharing across time is important.",
          "a": "The forward pass processes the sequence element by element. It maintains a hidden state h, initialized (usually to zeros), and at each timestep t it computes a new hidden state by combining the current input x_t with the previous hidden state h_{t-1}: h_t = tanh(W_xh x_t + W_hh h_{t-1} + b_h), and optionally produces an output y_t = W_hy h_t + b_y. The hidden state is thus a running summary of the sequence so far, updated at each step, and the final hidden state (or the sequence of outputs) is the RNN's representation. The critical design choice is that the SAME weight matrices W_xh, W_hh, W_hy are used at EVERY timestep - the recurrence applies one shared cell repeatedly. Weight sharing matters for three reasons: (1) Parameter efficiency - the number of parameters is fixed regardless of sequence length, so the same small network handles sequences of any length (a 5-word or 500-word sentence), which a feedforward network with position-specific weights could not do. (2) Generalization across positions - because the model learns ONE update rule applied everywhere, a pattern learned at one position transfers to all positions (like convolution's translation-invariance for sequences), so the model doesn't have to relearn 'a verb follows a subject' separately for each position. (3) Handling variable length - a fixed set of weights with a recurrence naturally consumes arbitrary-length input, which is essential for language. The cost of this elegance is that the repeated application of the same recurrent weight during backpropagation is exactly what causes the vanishing/exploding gradient problem.",
          "deepDive": {
            "q": "How is an RNN's weight sharing across time analogous to a CNN's weight sharing across space, and where do they differ?",
            "a": "Both RNNs and CNNs achieve parameter efficiency and translation-invariance through weight sharing, applying the same small set of weights across a dimension of the input. A CNN shares a convolutional filter across SPATIAL positions - the same filter slides over every location of an image, so a feature (an edge, a texture) is detected the same way wherever it appears, giving translation-invariance in space with a fixed, small parameter count. An RNN shares its recurrent cell across TEMPORAL positions - the same cell processes every timestep, so a temporal pattern is handled the same way wherever it occurs in the sequence, giving a form of translation-invariance in time. The deep analogy is 'one reusable operator applied across a structured dimension'. The key differences: (1) A CNN applies its filters INDEPENDENTLY and in PARALLEL across positions (each output depends only on a local receptive field), so it's fully parallelizable, whereas an RNN's applications are SEQUENTIAL and DEPENDENT - each step needs the previous hidden state - so it can't parallelize across time (a major practical disadvantage). (2) A CNN's receptive field is local and grows only with depth/dilation, while an RNN's hidden state can in principle carry information arbitrarily far (though vanishing gradients prevent this in practice). (3) The RNN's sequential dependency is what enables its unbounded memory in principle but also causes the vanishing/exploding gradient problem, which CNNs (with their parallel, shallow-per-position structure) don't suffer in the same way. So they're two instances of the same weight-sharing principle applied to different structured dimensions, with the RNN's temporal dependency being both its power (memory) and its curse (sequential, gradient issues)."
          }
        },
        {
          "q": "Derive why RNNs suffer from vanishing and exploding gradients, and explain the consequence for what they can learn.",
          "a": "The problem comes from backpropagation through time and the repeated multiplication it entails. Consider a loss at timestep t and its gradient with respect to a much earlier hidden state h_k (k << t). By the chain rule, this gradient must propagate backward through every intermediate hidden state, so it contains the product of the per-step Jacobians dh_i/dh_{i-1} for i from k+1 to t - that's (t - k) factors multiplied together. Each Jacobian dh_i/dh_{i-1} = diag(tanh'(...)) * W_hh (the derivative of the recurrence), so the long-range gradient is essentially a product of (t-k) copies of (a diagonal derivative term times the recurrent weight matrix W_hh). Now the crux: multiplying many matrices together makes the result's magnitude grow or shrink EXPONENTIALLY in the number of factors, governed by the spectral radius / largest singular value of the repeated Jacobian. If those Jacobians have norm consistently LESS than 1 (the common case, since tanh' <= 1 and typical weight scales), the product shrinks toward zero exponentially with (t-k) - the VANISHING gradient - so the gradient signal from a distant timestep is essentially zero by the time it reaches the early state. If they have norm GREATER than 1, the product blows up exponentially - the EXPLODING gradient - giving NaN losses and divergence. The consequence for learning is severe and specific: because the long-range gradient vanishes, the network receives almost no learning signal about dependencies spanning many timesteps, so a plain RNN effectively cannot learn to connect events far apart in the sequence (it forgets beyond a handful of steps) - which for language means it can't reliably track long-range agreement, distant context, or long-term structure. Exploding gradients are the less fundamental of the two because they're easily fixed by gradient clipping; vanishing gradients are the deep limitation that motivated gated architectures.",
          "deepDive": {
            "q": "Given that tanh' <= 1 always, why don't RNNs ALWAYS have vanishing (never exploding) gradients?",
            "a": "Because the per-step Jacobian is the diagonal derivative term MULTIPLIED BY the recurrent weight matrix W_hh, and W_hh's singular values can be large enough to overcome the <= 1 contribution of tanh'. Specifically, the Jacobian dh_i/dh_{i-1} = diag(tanh'(z_i)) * W_hh: the diagonal tanh' factors are each in (0, 1], which alone would shrink the gradient, but if W_hh has large singular values (norm > 1), their product with the tanh' terms can still exceed 1, so the overall Jacobian norm can be greater than 1 and the gradient explodes rather than vanishes. Whether you get vanishing or exploding depends on the interplay: with small recurrent weights (or when the hidden units are saturated so tanh' is near 0), the Jacobians are well below 1 and gradients vanish; with large recurrent weights (norm of W_hh large) and unsaturated units, the Jacobians can exceed 1 and gradients explode. In practice, careful initialization (e.g., orthogonal initialization of W_hh, which keeps singular values near 1) is used precisely to keep the Jacobian norm close to 1 and delay both problems, but it can't eliminate them over long ranges - which is why the real solution is architectural (LSTM/GRU gating creates a near-identity gradient path through the cell state), not just careful scaling. So RNNs can suffer either problem depending on the weight scale, and the saturating nonlinearity biases them toward vanishing while large weights bias toward exploding."
          }
        },
        {
          "q": "Why can't RNNs be parallelized across the sequence during training, and why did this matter for the rise of transformers?",
          "a": "An RNN's computation is inherently SEQUENTIAL along the time dimension because each hidden state depends on the immediately preceding one: h_t = f(x_t, h_{t-1}). You cannot compute h_100 until you've computed h_99, which needs h_98, and so on back to h_1 - there's a strict data dependency chain of length equal to the sequence length. So even with unlimited parallel hardware, you must process the timesteps in order, one after another; the only parallelism available is across the BATCH dimension (process many independent sequences simultaneously) and within each step's matrix multiply, but NOT across the positions of a single sequence. This is a fundamental architectural constraint, not an implementation detail. It mattered enormously for the rise of transformers because it made RNNs slow to train on modern parallel hardware (GPUs/TPUs), which are built to do massive parallel computation - an RNN leaves that parallelism on the table along the sequence axis, so training on long sequences is slow (time proportional to sequence length, unavoidably serial). Transformers replaced recurrence with self-attention, which computes the representation of every position as a function of all positions SIMULTANEOUSLY - there's no left-to-right dependency, so all positions in a sequence are processed in parallel in one matrix operation. This let transformers fully exploit GPU/TPU parallelism, training far faster on far longer sequences and far larger datasets, which was a decisive enabler of the scale that made large language models possible. In short, the RNN's sequential bottleneck capped how fast and how large you could train sequence models, and removing it (via attention's parallelism) was one of the key reasons transformers won - even though attention costs more compute per layer (quadratic in sequence length), its parallelizability made it far more scalable in wall-clock time.",
          "deepDive": {
            "q": "Transformers are quadratic in sequence length while RNNs are linear - so why are transformers still faster to train in practice?",
            "a": "It's the classic distinction between total computational COMPLEXITY (FLOPs) and WALL-CLOCK time on parallel hardware - the two diverge because of parallelizability. An RNN does O(sequence_length) work but that work is SERIAL - it must be done step by step, so the wall-clock time is proportional to sequence length no matter how many parallel processors you have (you're bottlenecked by the dependency chain, using a tiny fraction of a GPU's parallel capacity at each step). A transformer's self-attention does O(sequence_length^2) work (every position attends to every other), which is MORE total FLOPs for long sequences, BUT that work is fully PARALLEL - all the pairwise interactions can be computed simultaneously in a few large matrix multiplications, which is exactly what GPUs/TPUs excel at. So on parallel hardware, the transformer completes its larger-but-parallel workload in far fewer wall-clock steps (roughly constant depth regardless of sequence length) than the RNN takes to grind through its smaller-but-serial workload. For the sequence lengths and hardware common in practice, the transformer's parallelism wins decisively on training speed despite the quadratic cost - which is why 'quadratic but parallel beats linear but serial' held until sequences got long enough that the quadratic term itself became the bottleneck (motivating the efficient-attention work in later modules). It's a concrete example of the complexity-vs-constant-factor / complexity-vs-parallelism distinction: the asymptotically-cheaper algorithm can be slower in practice when it can't use the hardware's parallelism."
          }
        },
        {
          "q": "What is the fixed-size hidden-state bottleneck in RNN encoder-decoder models, and how did attention address it?",
          "a": "In an RNN encoder-decoder (seq2seq) model for tasks like translation, the encoder reads the entire input sequence and compresses it into a single fixed-size vector - the final hidden state - which is then handed to the decoder to generate the output. The bottleneck is that this ONE vector must contain everything the decoder needs to know about the entire input, regardless of how long or information-dense the input is. For a short sentence this is fine, but for a long sentence, cramming all the meaning, word order, and detail into a single fixed-dimensional vector loses information - the model literally cannot fit it all, and performance degrades sharply as input length grows (empirically, translation quality dropped for long sentences precisely because of this compression). It's an information-theoretic constraint: a fixed-capacity channel can't losslessly carry unbounded information. Attention addressed this directly by removing the single-vector requirement. Instead of forcing the encoder to compress everything into the final hidden state, attention keeps ALL of the encoder's hidden states (one per input position) available, and at each decoding step the decoder computes a weighted combination of all those encoder states - 'attending' more to the input positions relevant to the current output word. So when translating a particular word, the decoder can look directly back at the relevant source words rather than relying on a lossy summary. This gives the decoder direct access to the full input with dynamic, content-based focus, eliminating the fixed-size bottleneck (the effective 'memory' now scales with input length) and dramatically improving long-sequence performance - and this attention mechanism, first bolted onto RNN seq2seq models, was the seed that grew into the transformer, where attention replaces recurrence entirely.",
          "deepDive": {
            "q": "How does attention's solution to the bottleneck relate to the difference between a lossy summary and a retrievable memory?",
            "a": "It's exactly the distinction between compressing information into a fixed summary versus keeping a retrievable store you can query. The RNN encoder's final hidden state is a LOSSY SUMMARY - a single fixed-size vector that must encode the whole input in a fixed number of dimensions, so as input grows, information is necessarily discarded or blurred together (like trying to summarize a long document in one fixed-length sentence). Attention instead treats the encoder's per-position hidden states as a RETRIEVABLE MEMORY - a set of key-value entries, one per input position, that the decoder can query at each step, pulling out (via the attention weights) precisely the information relevant to what it's currently generating. Nothing is pre-compressed away; the full detail remains available and is selectively accessed on demand. This is why attention scales with input length gracefully (more input = more memory entries, not a more-overloaded fixed vector) while the RNN summary degrades. The mental model - 'summary vs queryable memory' - recurs throughout modern ML: it's the same reason retrieval-augmented generation keeps documents in an external store rather than cramming them into weights, and the same reason a fixed-size context vector is a bottleneck wherever it appears. Attention's core contribution was replacing 'compress then hope it's enough' with 'keep everything and retrieve what's relevant', which is a fundamentally more scalable way to handle information, and it's the conceptual heart of why transformers can integrate information across long contexts that RNNs could not."
          }
        },
        {
          "q": "Given all their limitations, when might an RNN still be the right choice over a transformer today?",
          "a": "RNNs retain genuine advantages in specific regimes where their weaknesses don't bite and their strengths matter. (1) Streaming / online / real-time inference: an RNN maintains a fixed-size hidden state and processes one input at a time in constant time and memory per step, so it's naturally suited to unbounded streaming input (live audio, sensor streams, incremental processing) where you get elements one at a time and must respond immediately - a transformer, by contrast, attends over the whole context and its cost grows with context length, so pure streaming is less natural (though cached/incremental variants exist). (2) Very long or unbounded sequences with tight memory budgets: the RNN's cost is O(sequence_length) with O(1) state, while a transformer's attention is O(sequence_length^2) in compute and O(sequence_length) in memory (the KV cache), so for extremely long sequences on constrained hardware, the RNN's linear cost and constant memory can win - which is exactly why modern linear-recurrence / state-space models (S4, Mamba) revived RNN-like recurrence for long-context efficiency. (3) Small-data / small-model / on-device settings: a small RNN can be more parameter- and compute-efficient than a transformer for simple sequence tasks, and its small fixed state suits embedded/edge deployment. (4) Low-latency incremental decoding where reprocessing context is costly. So the honest picture is that transformers dominate for most large-scale NLP because of parallel training and long-range modeling, but the RNN's constant-memory, linear-time, streaming-friendly recurrence is a real advantage that modern efficient-sequence-model research (state-space models) has deliberately brought back - the recurrence idea isn't obsolete, it's been refined to fix the gradient problem while keeping the efficiency.",
          "deepDive": {
            "q": "How do modern state-space models (like Mamba/S4) keep the RNN's efficiency while fixing its gradient and parallelism problems?",
            "a": "State-space models (SSMs) like S4 and Mamba are essentially a redesigned recurrence that keeps the RNN's key efficiency properties - linear-time processing and constant-size state (so O(sequence_length) compute and O(1) memory per step at inference, ideal for long sequences and streaming) - while overcoming the two things that killed plain RNNs. First, the vanishing-gradient / long-range problem: SSMs use a carefully-parameterized LINEAR recurrence (a continuous-time state-space formulation, discretized) with structured state matrices designed so that information and gradients propagate stably over very long ranges - the linear, structured dynamics avoid the pathological exponential shrink/growth of the nonlinear RNN's repeated Jacobian products, giving them genuinely long memory that plain RNNs lack. Second, the parallelism problem: because the recurrence is LINEAR (no nonlinearity between steps in the core recurrence), it can be computed either as a recurrence (efficient at inference, one step at a time) OR reformulated as a convolution / parallel scan that processes the whole sequence in parallel during TRAINING - so they get transformer-like training parallelism (exploiting GPUs) while retaining RNN-like sequential efficiency at inference, the best of both. Mamba adds input-dependent (selective) state dynamics to make the SSM content-aware like attention. The upshot is that SSMs are a modern answer to 'can we have the RNN's efficiency without its fatal flaws?' - they demonstrate that recurrence wasn't fundamentally wrong, just that the plain-RNN implementation had fixable problems (nonlinear-recurrence gradient instability and non-parallelizability), and by re-engineering the recurrence to be linear, structured, and stably-initialized, they recover long-range modeling and parallel training at far better long-context efficiency than quadratic attention."
          }
        },
        {
          "q": "Describe the different RNN input/output configurations (one-to-many, many-to-one, many-to-many) and what a bidirectional RNN adds.",
          "a": "RNNs flex to different sequence tasks by choosing where inputs enter and where outputs are read off the hidden-state sequence. (1) ONE-TO-MANY: a single input produces a sequence output - e.g., image captioning (one image -> a sentence), where the input initializes the hidden state and the RNN generates output tokens step by step. (2) MANY-TO-ONE: a sequence produces a single output - e.g., sentiment classification or sequence classification, where you feed the whole sequence and read the output only from the FINAL hidden state (which summarizes everything). (3) MANY-TO-MANY, aligned: a sequence produces an equal-length output with one output per input - e.g., part-of-speech tagging or named-entity recognition, where you read an output at every timestep. (4) MANY-TO-MANY, unaligned (seq2seq/encoder-decoder): an input sequence maps to a different-length output sequence - e.g., translation, where an encoder RNN consumes the input into a summary and a decoder RNN generates the output; this is the configuration that needed attention to fix the fixed-vector bottleneck. A BIDIRECTIONAL RNN adds crucial capability for the tasks where the whole sequence is available at once (not streaming generation): it runs TWO RNNs, one processing the sequence left-to-right and one right-to-left, and concatenates their hidden states at each position. This means each position's representation incorporates context from BOTH directions - what came before AND what comes after - rather than only the past. That matters because meaning often depends on future context: to tag or understand a word, the words after it are as informative as the words before (e.g., disambiguating 'bank' needs the following words). Bidirectional RNNs were standard for sequence labeling and were the basis of ELMo's contextual embeddings; the catch is they require the ENTIRE sequence upfront (you can't run the backward pass on streaming input) and can't be used for left-to-right generation, so they're for encoding/understanding tasks, not autoregressive generation.",
          "deepDive": {
            "q": "Why can't a bidirectional RNN be used for autoregressive language generation, and how does this constraint reappear in transformers?",
            "a": "A bidirectional RNN can't do autoregressive generation because its backward pass requires seeing the ENTIRE sequence, including future tokens, to compute each position's representation - but in generation you're PRODUCING the future tokens one at a time and don't have them yet. Concretely, to generate token t you can only condition on tokens 1..t-1 (the past); a bidirectional model's representation of position t depends on tokens t+1, t+2, ... which don't exist during left-to-right generation, so it's fundamentally incompatible with the generate-one-token-at-a-time setting. It also would be 'cheating' if used for training a generator - the model could see the answer (the future token) it's supposed to predict. This exact constraint reappears in transformers as the distinction between ENCODER (bidirectional) and DECODER (causal/masked) attention. Encoder-style transformers like BERT use bidirectional self-attention - every position attends to all positions, past and future - which is great for UNDERSTANDING tasks (classification, tagging, embeddings) where the whole input is available, mirroring the bidirectional RNN. Decoder-style transformers like GPT use CAUSAL (masked) self-attention - each position can only attend to earlier positions, enforced by masking out future positions - precisely so the model can be trained to predict the next token without seeing it and can generate autoregressively at inference. So the bidirectional-vs-causal split, and the reason generation needs the causal/one-directional version, is the same principle in both architectures: bidirectional context helps understanding but breaks generation, so generative models must restrict themselves to past context only. This is why BERT (bidirectional) is an encoder for understanding and GPT (causal) is a decoder for generation - the RNN-era insight carried directly over."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Recurrent neural network",
        "back": "Processes a sequence one step at a time, carrying a hidden state (summary of the past) forward and combining it with each input using shared weights."
      },
      {
        "type": "formula",
        "front": "RNN recurrence",
        "back": "h_t = tanh(W_xh x_t + W_hh h_{t-1} + b_h); y_t = W_hy h_t + b_y. SAME weights every step - parameter count independent of sequence length."
      },
      {
        "type": "definition",
        "front": "Backpropagation through time (BPTT)",
        "back": "Unroll the recurrence into a deep graph and apply the chain rule through the timesteps. The gradient to an early state is a product of per-step Jacobians."
      },
      {
        "type": "pitfall",
        "front": "Vanishing gradient",
        "back": "Product of (t-k) Jacobians with norm < 1 shrinks exponentially, so RNNs can't learn long-range dependencies - the central limitation, fixed by LSTM/GRU gating."
      },
      {
        "type": "pitfall",
        "front": "Exploding gradient",
        "back": "The Jacobian product blows up (norm > 1) -> NaN/divergence. Fixed by gradient clipping (rescale to a max norm) - unlike vanishing gradients."
      },
      {
        "type": "pitfall",
        "front": "No sequence parallelism",
        "back": "Each hidden state needs the previous one, so timesteps are serial (only the batch parallelizes) - a key reason transformers (fully parallel) won at scale."
      },
      {
        "type": "pitfall",
        "front": "Fixed-size hidden-state bottleneck",
        "back": "The whole past is compressed into one vector, losing detail on long sequences - the motivation for attention (keep all states, retrieve what's relevant)."
      },
      {
        "type": "intuition",
        "front": "RNN weight sharing = CNN's, over time",
        "back": "Same cell applied at every timestep (like a CNN filter over space): parameter-efficient + position-general. But sequential (not parallel) and gradient-unstable."
      }
    ],
    "refs": [
      {
        "title": "Elman, Finding Structure in Time (1990)",
        "url": "https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1402_1"
      },
      {
        "title": "Karpathy, The Unreasonable Effectiveness of Recurrent Neural Networks (2015)",
        "url": "https://karpathy.github.io/2015/05/21/rnn-effectiveness/"
      },
      {
        "title": "Pascanu et al., On the difficulty of training RNNs (vanishing/exploding gradients, 2013)",
        "url": "https://arxiv.org/abs/1211.5063"
      },
      {
        "title": "Gu & Dao, Mamba: Linear-Time Sequence Modeling with Selective State Spaces (2023)",
        "url": "https://arxiv.org/abs/2312.00752"
      }
    ],
    "demos": [
      "rnn-gates"
    ]
  },
  "lstm-gru": {
    "level": "core",
    "body": {
      "intuition": [
        "Plain RNNs can't remember far back because their gradient vanishes through repeated multiplication by the recurrent weight. LSTMs (Long Short-Term Memory) solve this with one central architectural idea: a separate cell state that flows through time along an almost-uninterrupted highway, modified only by gentle, gated additions and forgettings rather than being repeatedly transformed by a matrix multiply. Because the cell state's default behavior is to be carried forward roughly unchanged (multiplied by a forget gate near 1 and added to, not matrix-multiplied), gradients can flow across many timesteps without vanishing - the network can finally learn long-range dependencies.",
        "The mechanism is gates: small neural sub-networks (a sigmoid producing values in 0 to 1) that act as differentiable, learned valves controlling information flow. The forget gate decides what to erase from the cell state, the input gate decides what new information to write, and the output gate decides what to expose as the hidden state. Each gate looks at the current input and previous hidden state and outputs a per-dimension 0-to-1 mask - a soft, learnable decision about how much to remember, update, and reveal. The gates are what let the LSTM selectively keep information for a long time (forget gate near 1 preserves it) or discard it (forget gate near 0), learned from data.",
        "GRUs (Gated Recurrent Units) are a streamlined alternative: they merge the cell and hidden state and use just two gates (a reset gate and an update gate) instead of three, giving fewer parameters and slightly faster computation while achieving similar performance on many tasks. The practical takeaway is that both LSTMs and GRUs replace the plain RNN's naive recurrence with GATED information flow and an additive memory path, which is precisely the fix for vanishing gradients - and understanding this gating idea illuminates why later architectures (highway networks, residual connections, even attention) all rely on additive, gated pathways to train deep."
      ],
      "math": [
        {
          "h": "The LSTM gates and the additive cell-state update",
          "paras": [
            "An LSTM has three gates (forget f, input i, output o), each a sigmoid over the input and previous hidden state, plus a candidate update. The key equation is the cell-state update: the old cell state is scaled by the forget gate and the candidate is scaled by the input gate, then ADDED. This additive update (not a matrix multiply) is what preserves gradients."
          ],
          "tex": "f_t = \\sigma(W_f [h_{t-1}, x_t]), \\; i_t = \\sigma(W_i[\\cdot]), \\; o_t = \\sigma(W_o[\\cdot]), \\quad C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t, \\quad h_t = o_t \\odot \\tanh(C_t)",
          "texNote": "The cell-state update C_t = f_t*C_{t-1} + i_t*C~_t is ADDITIVE and element-wise: with f_t near 1, C flows forward nearly unchanged, giving gradients a near-identity path (the constant error carousel)."
        },
        {
          "h": "The GRU: two gates, merged state",
          "paras": [
            "A GRU drops the separate cell state and output gate, using an update gate z (how much to keep the old state vs the new candidate) and a reset gate r (how much past state to use in the candidate). Fewer gates and parameters, similar gating benefit - the update gate's convex combination is the additive-memory analogue."
          ],
          "tex": "z_t = \\sigma(W_z[h_{t-1}, x_t]), \\; r_t = \\sigma(W_r[\\cdot]), \\quad h_t = (1 - z_t)\\odot h_{t-1} + z_t \\odot \\tilde{h}_t",
          "texNote": "h_t is a gated interpolation between the old state and the new candidate: z near 0 keeps the old state (preserves memory + gradient), z near 1 takes the new one. One state, two gates - fewer parameters than an LSTM."
        }
      ],
      "code": [
        {
          "h": "An LSTM cell forward pass from scratch",
          "paras": [
            "The three gates plus the additive cell-state update - the whole cell. The additive C_t update is the line that matters for gradient flow."
          ],
          "code": "import numpy as np\n\ndef sigmoid(x): return 1 / (1 + np.exp(-x))\n\ndef lstm_cell(x, h_prev, C_prev, W, b):\n    z = np.concatenate([h_prev, x])                 # combined input\n    f = sigmoid(W['f'] @ z + b['f'])                # forget gate: what to erase\n    i = sigmoid(W['i'] @ z + b['i'])                # input gate: what to write\n    o = sigmoid(W['o'] @ z + b['o'])                # output gate: what to expose\n    C_tilde = np.tanh(W['c'] @ z + b['c'])          # candidate update\n    C = f * C_prev + i * C_tilde                     # ADDITIVE cell-state update (the key line)\n    h = o * np.tanh(C)                               # exposed hidden state\n    return h, C\n\n# with the forget gate near 1, C_prev flows into C almost unchanged -> gradient highway\nprint('the additive C = f*C_prev + i*C_tilde is why gradients survive across many steps')",
          "caption": "Three sigmoid gates control information flow; the additive cell-state update (not a matrix multiply) gives gradients a near-identity path across time - the vanishing-gradient fix."
        },
        {
          "h": "Why the additive path preserves gradients",
          "paras": [
            "The gradient of the cell state through time depends on the forget gate, not a repeated weight matrix - so when the network learns to remember (forget gate near 1), the gradient is preserved instead of vanishing."
          ],
          "code": "import numpy as np\n\n# in a plain RNN, dC/dC_prev involves W_hh (repeated matrix mult -> vanish/explode)\n# in an LSTM, dC_t/dC_{t-1} = f_t (the forget gate) - element-wise, no weight matrix\n# so the long-range gradient is a PRODUCT OF FORGET GATES:\nforget_gates = np.array([0.95] * 50)                 # network learned to remember (f ~ 1)\nlong_range_grad_factor = np.prod(forget_gates)\nprint(f'50-step gradient factor with f=0.95: {long_range_grad_factor:.3f}')  # ~0.08, survives\nprint(f'plain RNN with |Jacobian|=0.7:      {0.7**50:.2e}')                    # ~1e-8, vanished",
          "caption": "The long-range gradient through an LSTM is a product of forget gates (which the network sets near 1 to remember) rather than a repeated weight matrix - so it survives where a plain RNN's vanishes."
        }
      ],
      "useCases": [
        "The dominant sequence architecture from ~2014-2018 - LSTMs/GRUs powered machine translation, speech recognition, text generation, and time-series forecasting before transformers, and remain strong for many sequence tasks.",
        "Sequence labeling (NER, POS tagging) via bidirectional LSTMs, often topped with a CRF - the BiLSTM-CRF was the standard for structured sequence prediction (the sequence-labeling lesson).",
        "Streaming and low-latency / on-device sequence modeling where the constant-memory recurrent state and linear-time processing beat a transformer's growing context cost.",
        "Time-series and sensor modeling where sequences are long but the model must be lightweight - GRUs in particular are a common efficient choice."
      ],
      "pitfalls": [
        "LSTMs/GRUs mitigate but don't fully eliminate the vanishing gradient - they enable much longer dependencies than plain RNNs, but very long-range dependencies (hundreds+ of steps) are still hard, which is part of why attention/transformers ultimately won.",
        "They inherit the RNN's sequential-computation limitation: still no parallelism across the sequence during training (each step needs the previous state), so they train slower than transformers on modern hardware.",
        "More parameters and compute than a plain RNN (three gates' worth of weights for an LSTM), so they're heavier - GRUs trade a little capacity for fewer parameters, and which wins is task-dependent and empirical.",
        "The forget gate bias matters: initializing the forget gate bias to a positive value (so it starts near 1, remembering by default) is a well-known trick - without it, LSTMs can start by forgetting everything and train poorly.",
        "They still compress the past into a fixed-size state (the cell/hidden state), so the fixed-size-bottleneck limitation for encoder-decoder tasks remains - attention was still needed on top of LSTM seq2seq for long inputs."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/rnn",
          "text": "LSTMs/GRUs exist specifically to fix the plain RNN's vanishing-gradient problem via gated, additive memory - this lesson is the solution to the previous one's core limitation."
        },
        {
          "ref": "rnn-nlp/seq2seq-attention",
          "text": "LSTM encoder-decoders were the standard seq2seq models; attention was added on top to overcome their remaining fixed-state bottleneck (the flagship lesson)."
        },
        {
          "ref": "rnn-nlp/sequence-labeling",
          "text": "Bidirectional LSTMs (often with a CRF) were the standard for sequence labeling like NER/POS tagging - the next architecture built on this cell."
        },
        {
          "text": "The additive, gated pathway that solves vanishing gradients here is the same idea behind residual connections (Module 04/08), which let very deep networks train - gating/skip-connections recur throughout deep learning."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What problem do LSTMs solve?",
          "a": "The vanishing gradient problem of plain RNNs - they enable learning long-range dependencies via a gated, additive cell state that gives gradients a near-identity path through time."
        },
        {
          "q": "What is the cell state in an LSTM?",
          "a": "A separate memory that flows through time modified only by gated additions/forgettings (not a matrix multiply), so information and gradients are preserved across many steps."
        },
        {
          "q": "What are the three LSTM gates?",
          "a": "Forget (what to erase from the cell state), input (what new info to write), and output (what to expose as the hidden state) - each a sigmoid producing a 0-to-1 mask."
        },
        {
          "q": "Why does the additive cell-state update prevent vanishing gradients?",
          "a": "The gradient through time is a product of forget gates (element-wise, near 1 when remembering) rather than repeated multiplication by a weight matrix - so it survives."
        },
        {
          "q": "How does a GRU differ from an LSTM?",
          "a": "It merges the cell and hidden state and uses two gates (reset, update) instead of three - fewer parameters and slightly faster, similar performance on many tasks."
        },
        {
          "q": "What does the GRU update gate do?",
          "a": "Controls the interpolation between the old hidden state and the new candidate (z near 0 keeps the old state, z near 1 takes the new) - the additive-memory analogue."
        },
        {
          "q": "Do LSTMs completely eliminate vanishing gradients?",
          "a": "No - they greatly extend the learnable range but very long dependencies (hundreds+ of steps) are still hard, which is part of why transformers won."
        },
        {
          "q": "Do LSTMs fix the RNN's parallelism problem?",
          "a": "No - they're still sequential across time (each step needs the previous state), so they train slower than fully-parallel transformers."
        },
        {
          "q": "What is the forget-gate bias trick?",
          "a": "Initialize the forget gate's bias positive so it starts near 1 (remember by default) - without it, LSTMs can start by forgetting everything and train poorly."
        },
        {
          "q": "LSTM vs GRU - which should you use?",
          "a": "It's empirical/task-dependent: GRUs are lighter (fewer parameters, faster), LSTMs slightly more expressive; try both. Neither dominates universally."
        }
      ],
      "standard": [
        {
          "q": "Explain in detail how the LSTM's cell state and gates solve the vanishing gradient problem.",
          "a": "The solution has two coupled parts: a dedicated cell state with an ADDITIVE update, and gates that control it. The cell state C_t is a separate memory vector (distinct from the exposed hidden state h_t) whose update is C_t = f_t * C_{t-1} + i_t * C~_t - the old cell state scaled element-wise by the forget gate f_t, PLUS the candidate update scaled by the input gate i_t. The crucial contrast with a plain RNN: a plain RNN's hidden state is repeatedly transformed by a matrix multiply and a squashing nonlinearity (h_t = tanh(W_hh h_{t-1} + ...)), so the gradient backward through time is a product of Jacobians each containing W_hh, and that product shrinks exponentially. The LSTM's cell-state update, by contrast, is element-wise and additive, so the gradient of C_t with respect to C_{t-1} is just the forget gate f_t (an element-wise factor), NOT a weight matrix. This means the long-range gradient through the cell state is a PRODUCT OF FORGET GATES rather than a product of weight-matrix Jacobians. When the network learns that a piece of information should be remembered, it sets the corresponding forget gate near 1, so that dimension of the cell state flows forward almost unchanged (this is the 'constant error carousel') and its gradient is preserved across many timesteps - the network can learn a dependency spanning hundreds of steps. The gates make this SELECTIVE and LEARNED: the forget gate decides per-dimension what to keep vs discard, the input gate what to write, and the output gate what to expose, so the model learns from data what to remember and for how long, rather than being forced to either always-remember or always-forget. So it's the combination - an additive memory path (for gradient flow) that is gated (for learned, selective control) - that solves vanishing gradients while remaining trainable.",
          "deepDive": {
            "q": "The forget gate is itself between 0 and 1, so a product of forget gates still decays - how is this different from the plain RNN's decay?",
            "a": "It's a crucial and subtle point: yes, a product of forget gates (each <= 1) still decays over time, so LSTMs don't achieve truly infinite memory. But it's fundamentally different from the plain RNN's decay in two ways. First, CONTROL: in a plain RNN the decay rate is fixed by the recurrent weight matrix W_hh and the saturating nonlinearity - the network can't easily make the gradient NOT vanish for a specific piece of information, because the same W_hh transforms everything. In an LSTM, the forget gate is LEARNED and PER-DIMENSION and INPUT-DEPENDENT, so the network can set the forget gate very close to 1 (say 0.99+) specifically for the dimensions carrying information it needs to preserve, making the effective decay extremely slow for that information while discarding other information quickly - it has fine-grained, learnable control over what persists. A product of forget gates near 1.0 decays far more slowly than a product of weight-matrix Jacobians below 1. Second, SEPARATION of memory from computation: the cell state is a dedicated highway that isn't forced to be transformed at every step (unlike the plain RNN's hidden state, which is both the memory AND the thing computed on), so information can ride the cell state without being repeatedly squashed. So the LSTM doesn't magically eliminate all decay - it converts an uncontrollable, always-vanishing decay (governed by a shared weight matrix) into a controllable, per-dimension, learnable decay (governed by forget gates the network can push near 1), which in practice extends the learnable dependency range from a handful of steps to hundreds. The residual gap - that even near-1 forget gates eventually decay over very long ranges - is exactly why attention/transformers, which give every position a DIRECT connection to every other (no decay at all), ultimately surpassed LSTMs for the longest-range dependencies."
          }
        },
        {
          "q": "Walk through what each of the three LSTM gates does and why you need all three.",
          "a": "Each gate is a sigmoid sub-network (outputting a per-dimension value in 0 to 1) that reads the current input x_t and previous hidden state h_{t-1} and produces a soft mask, and together they give the LSTM independent control over the three distinct operations on memory. (1) FORGET gate (f_t): controls what to ERASE from the existing cell state - it multiplies the old cell state C_{t-1} element-wise, so a value near 0 forgets that dimension and near 1 keeps it. You need this to discard information that's no longer relevant (e.g., after a sentence ends, forget the subject) - without a forget gate, the cell state would accumulate everything forever and saturate. (2) INPUT gate (i_t): controls what NEW information to WRITE into the cell state - it scales the candidate update C~_t before adding it, so the model can choose to write a lot, a little, or nothing new at this step. You need this so the model can be selective about when to update its memory (only write when something worth remembering appears) rather than overwriting on every step. (3) OUTPUT gate (o_t): controls what to EXPOSE as the hidden state - h_t = o_t * tanh(C_t), so it decides which parts of the (possibly large) cell state are relevant to output right now. You need this because the cell state may hold information useful for the FUTURE that isn't relevant to the CURRENT output - the output gate lets the LSTM keep something in memory (in the cell state) without necessarily acting on it yet (keeping it out of the hidden state). The three gates are needed because remembering, writing, and reading are genuinely separate decisions: you might want to keep old information (forget near 1), not write anything new (input near 0), but expose what you have (output near 1) - or any other combination. Collapsing them would lose this independence. GRUs show you can get away with fewer by coupling some of these decisions (merging remember-and-write into one update gate), at some cost to flexibility.",
          "deepDive": {
            "q": "How does the GRU achieve similar functionality with only two gates, and what does it give up?",
            "a": "The GRU streamlines the LSTM by MERGING decisions the LSTM keeps separate. Two key simplifications: (1) it merges the cell state and hidden state into a single state vector h (no separate C), eliminating the output gate - the whole state is always exposed, so there's no separate 'what to reveal' decision. (2) It couples the forget and input operations into a single UPDATE gate z: instead of independently deciding what to forget (f) and what to write (i), the GRU's update gate controls a convex interpolation h_t = (1-z)*h_{t-1} + z*h~_t - so it necessarily forgets exactly as much as it writes (the 1-z and z are tied). It adds a RESET gate r that controls how much of the past state feeds into computing the candidate. So the GRU has two gates (update, reset) vs the LSTM's three, no separate cell state, and fewer parameters (roughly 3/4 of an LSTM's). What it gives up: the independence between forgetting and writing (it can't, say, keep old information AND add new information without the coupling), and the ability to hold information in memory without exposing it (no output gate, so the state is always fully visible). In practice these losses often don't matter - GRUs match LSTMs on many tasks and train faster with fewer parameters, which is why they're popular - but the LSTM's extra flexibility can help on tasks needing that finer control, and there's no universal winner. It's a classic capacity-vs-efficiency trade-off: the GRU bets that the coupled, simpler gating is enough, and empirically it often is, but the choice between them is task-dependent and settled by validation, not by theory."
          }
        },
        {
          "q": "How does the LSTM's additive gated pathway relate to residual connections in deep networks?",
          "a": "They share the same core mechanism - an additive identity path that lets gradients flow unimpeded - just applied along different axes. In an LSTM, the cell-state update C_t = f_t * C_{t-1} + i_t * C~_t is (when the forget gate is near 1) approximately C_t ~ C_{t-1} + (new stuff) - an ADDITIVE update where the previous state is carried forward and a learned increment is added, so the gradient of C_t with respect to C_{t-1} is near-identity (the forget gate ~ 1), giving gradients a highway through TIME. A residual (skip) connection in a deep feedforward/transformer network does exactly the analogous thing across DEPTH: the output of a block is x + F(x), where the input x is carried forward and the block computes a learned increment F(x) that's ADDED, so the gradient through the block is (identity + dF/dx), near-identity, giving gradients a highway through LAYERS. In both cases the insight is the same: repeatedly TRANSFORMING a signal (matrix-multiply-then-nonlinearity at every step/layer) causes gradients to vanish or explode over many steps/layers, but ADDING a learned increment to a carried-forward signal preserves gradients, because the derivative of an additive update is close to the identity rather than a product of transformations. This is why both innovations enabled much greater 'depth' - LSTMs enabled long time-depth (sequences of hundreds of steps) and residual connections enabled great layer-depth (networks of hundreds of layers, like ResNets and deep transformers). Historically the LSTM (1997) predates residual connections (2015) and arguably inspired the recognition that additive/gated pathways are the key to training deep computation graphs; highway networks made the gating explicit for depth before ResNets simplified it to a plain additive skip. So the LSTM's forget-gate highway and the ResNet's skip connection are two instances of one principle - carry the signal forward additively so gradients survive - which is one of the most important recurring ideas in deep learning.",
          "deepDive": {
            "q": "If additive identity paths are the key, why did residual connections simplify the LSTM's gate to a plain (ungated) skip, and when is gating still worth it?",
            "a": "Residual connections (ResNets) simplified the additive path to a PLAIN, ungated skip - output = x + F(x), with no learned gate scaling x - whereas the LSTM gates its carried-forward state with the forget gate. The simplification worked for feedforward depth because a plain identity skip is enough to solve the gradient-flow problem (it makes the block's Jacobian identity-plus-a-small-term, which is all you need for gradients to survive across layers), and it's simpler, has fewer parameters, and empirically trains extremely deep networks well - the highway network's learned gate on the skip turned out to be unnecessary overhead for pure depth. So when the ONLY goal is letting gradients flow through many layers, an ungated additive skip suffices. Gating is still worth it when you need SELECTIVE, CONTENT-DEPENDENT control over what to carry forward vs replace - which is exactly the LSTM's situation: it's not just trying to train deep, it's trying to MANAGE MEMORY over a sequence, deciding per-timestep and per-dimension what information to keep, discard, and update based on the input. A plain ungated skip would carry EVERYTHING forward always, which for a memory over a long sequence would accumulate and saturate (you need to forget irrelevant things). The gate provides that learned, input-dependent forgetting/writing. So the rule of thumb: use a plain additive skip when you just need gradient flow through depth (ResNets, transformer residuals); use a GATED additive path when you additionally need learned, selective control over what persists (recurrent memory over sequences). The two applications of the additive-path idea diverge based on whether selective control of the carried signal is required, which is why transformers use plain residual skips for depth but LSTMs use gated paths for memory."
          }
        },
        {
          "q": "Given LSTMs solved vanishing gradients, why did transformers still replace them for most large-scale NLP?",
          "a": "LSTMs fixed the vanishing-gradient problem but retained two other RNN limitations that transformers eliminated, and those turned out to be decisive at scale. (1) SEQUENTIAL COMPUTATION / no parallelism: an LSTM still processes the sequence one step at a time (each state depends on the previous), so it cannot be parallelized across the sequence during training - it can only use batch parallelism. Transformers process all positions simultaneously via self-attention, fully exploiting GPU/TPU parallelism, so they train dramatically faster on long sequences and huge datasets. This parallelizability was the key enabler of the scale (billions of parameters, trillions of tokens) that made modern LLMs possible - the LSTM's serial bottleneck capped how fast and large you could train. (2) RESIDUAL LONG-RANGE LIMITATION: while LSTMs greatly extended the learnable dependency range versus plain RNNs (from ~10 to ~100s of steps), their memory still decays over very long ranges (the product of forget gates eventually shrinks, and everything still passes through a fixed-size state bottleneck). Transformers give every position a DIRECT, constant-length connection to every other position via attention - no decay, no fixed-state bottleneck - so they model very long-range dependencies far better. (3) The fixed-size state bottleneck for encoder-decoder tasks persisted in LSTM seq2seq (attention was already being bolted on to fix it), and transformers made attention the whole architecture. So the honest story is that LSTMs were a huge advance and dominated for years, but transformers offered better long-range modeling AND, crucially, full training parallelism - and the parallelism, by enabling training at unprecedented scale, was the decisive factor. It's a case where the newer architecture won not just on quality per parameter but on its ability to USE modern hardware to scale, which compounded into a large quality gap. (Notably, efficient recurrence has since returned via state-space models that fix both the gradient AND parallelism issues, showing the recurrence idea wasn't fundamentally inferior, just the specific LSTM realization.)",
          "deepDive": {
            "q": "Attention has quadratic cost in sequence length while LSTMs are linear - so in what sense did transformers 'win' on efficiency?",
            "a": "Transformers won on TRAINING WALL-CLOCK efficiency and scalability, not on asymptotic compute cost - and the distinction is exactly the parallelism-vs-complexity trade-off. Per layer, self-attention costs O(sequence_length^2) FLOPs (every position attends to every other) versus an LSTM's O(sequence_length) - so for long sequences the transformer does MORE total computation. But the transformer's computation is fully PARALLEL (all positions processed simultaneously in a few big matrix multiplies), while the LSTM's is SERIAL (must step through positions one at a time due to the recurrent dependency). On massively-parallel hardware (GPUs/TPUs), the transformer completes its larger-but-parallel workload in far less WALL-CLOCK time than the LSTM takes to grind through its smaller-but-serial workload - the LSTM leaves most of the hardware idle waiting for the previous step. So 'efficiency' here means throughput/training-time on the hardware that actually exists, where parallel-but-quadratic beats serial-but-linear for the relevant sequence lengths. This let transformers train on vastly more data in the same wall-clock budget, which is what produced their quality advantage at scale. The quadratic cost only became the binding constraint at very long sequence lengths, which is what later motivated efficient-attention and linear-recurrence (state-space) models - so the trade-off is: transformers traded higher asymptotic compute for parallelism, won on scalability, and the field is now working to recover linear cost without giving up the parallelism (the S4/Mamba line), which closes the loop back to efficient recurrence."
          }
        },
        {
          "q": "You're deciding between an LSTM, a GRU, and a transformer for a sequence task. Walk through how you'd choose.",
          "a": "The choice depends on data scale, sequence length, latency/deployment constraints, and dependency range. I'd reason through several axes. (1) SCALE of data and compute: transformers shine with large data and compute (their parallel training exploits it), and pretrained transformers give strong transfer learning, so for a task where I can use a large dataset or a pretrained model, a transformer (or fine-tuning one) is usually the strongest choice. For small datasets or limited compute, a smaller LSTM/GRU can be more data-efficient and less prone to overfitting, and is simpler to train from scratch. (2) SEQUENCE LENGTH and dependency range: for long-range dependencies with moderate sequence lengths, transformers model them best (direct connections). But for very long sequences where the transformer's quadratic attention cost or growing KV-cache memory is prohibitive, an LSTM/GRU's linear cost and constant state - or a modern state-space model - may be necessary. (3) LATENCY / STREAMING / DEPLOYMENT: for real-time streaming inference or on-device/edge deployment with tight memory, the RNN family's constant-memory recurrent state and one-step-at-a-time processing are advantageous (a transformer must maintain and attend over a growing context). A GRU specifically is the lightest option, good for embedded/low-latency. (4) LSTM vs GRU specifically: GRU for fewer parameters / faster / less data; LSTM for slightly more capacity on complex tasks - decide empirically by validation since neither dominates. (5) SIMPLICITY / baselines: an LSTM/GRU is a fast, well-understood baseline to establish before reaching for a transformer, and if it already meets requirements, its simplicity and efficiency may make it the right final choice. So my process: establish an LSTM/GRU baseline (cheap, informative); if the task needs long-range modeling and I have the data/compute, move to a transformer (likely a pretrained one); if deployment demands streaming/low-memory/very-long-sequence handling, weigh the RNN family or a state-space model against the transformer's costs - and always validate the LSTM-vs-GRU and architecture choices empirically rather than assuming. The honest summary: transformers are the default for large-scale NLP quality, but LSTMs/GRUs remain the right call for small-data, streaming, low-latency, or resource-constrained settings.",
          "deepDive": {
            "q": "For a task with limited labeled data, why might a fine-tuned pretrained transformer still beat a from-scratch LSTM despite transformers being data-hungry?",
            "a": "The key is separating PRETRAINING data from TASK data - the 'transformers are data-hungry' concern applies to training from scratch, but fine-tuning a PRETRAINED transformer flips the equation. A transformer pretrained on a massive unlabeled corpus (BERT, GPT, etc.) has already learned rich, general language representations - syntax, semantics, world knowledge, long-range structure - from far more text than any single task's labeled data. Fine-tuning that model on your small labeled dataset only needs to ADAPT those pretrained representations to your specific task, which requires little task data because the hard part (learning language) is already done - this is transfer learning, and it's why a fine-tuned transformer routinely beats a from-scratch model on small-data tasks. A from-scratch LSTM, by contrast, must learn EVERYTHING - both the language representations AND the task - from only your limited labeled data, so it's starved of the signal needed to learn good general representations and tends to underperform and overfit. So the comparison isn't 'data-hungry transformer vs efficient LSTM on the same small data'; it's 'a transformer that already absorbed enormous pretraining vs an LSTM starting from nothing', and the pretraining advantage usually dominates. The LSTM-from-scratch only competes when there's no suitable pretrained model, when the domain is so unusual that pretraining doesn't transfer, or when constraints (latency, memory, no ability to run a large model) rule out the transformer - which is exactly the regime where the RNN family remains relevant. This is the same lesson as the generative-vs-discriminative and small-data discussions elsewhere: pretraining/transfer changes the data economics, and 'which model needs less data' must account for what knowledge each model starts with, not just its from-scratch sample efficiency."
          }
        },
        {
          "q": "What are the common variants and training practicalities for LSTMs - stacking, bidirectionality, dropout, and peephole connections?",
          "a": "Several standard techniques extend and stabilize the basic LSTM. (1) STACKED (deep) LSTMs: stack multiple LSTM layers so the hidden-state sequence of one layer feeds as the input sequence to the next, building a hierarchy of temporal representations (lower layers capture local patterns, higher layers more abstract/longer-range structure) - depth here is over layers, analogous to depth in a feedforward net, and it typically improves capacity, with 2-4 layers common. (2) BIDIRECTIONAL LSTMs: run one LSTM left-to-right and another right-to-left and concatenate their per-position states, so each position's representation sees both past and future context - essential for understanding/labeling tasks (NER, POS tagging) where future words disambiguate the current one, but usable only when the whole sequence is available (not for streaming generation). (3) DROPOUT in RNNs: applying dropout naively to the recurrent connections hurts (it disrupts the memory), so the correct approach applies dropout to the NON-recurrent (input/output) connections, or uses 'variational' / recurrent dropout that applies the SAME dropout mask at every timestep (rather than a fresh mask each step), which regularizes without destroying the temporal signal - a well-known subtlety. (4) PEEPHOLE connections: a variant that lets the gates also see the cell state directly (not just the hidden state), giving finer timing control - useful for some precise-timing tasks but often omitted as the added complexity rarely pays off. (5) Practical training details: gradient clipping (to control the still-possible exploding gradients), positive forget-gate bias initialization (start by remembering), orthogonal/careful recurrent-weight initialization, and truncated BPTT for very long sequences (bounding how far back to backpropagate). Together these turn the basic cell into the workhorse architectures actually deployed - e.g., a stacked bidirectional LSTM with variational dropout and gradient clipping was the standard recipe for sequence labeling before transformers. The meta-point is that the raw LSTM cell is a building block, and real systems compose it (depth, bidirectionality) and regularize it (proper dropout, clipping, init) with techniques that respect the recurrent structure.",
          "deepDive": {
            "q": "Why does applying standard dropout to the recurrent connections of an LSTM hurt, and what's the fix?",
            "a": "Standard dropout randomly zeros a different subset of activations at every application (a fresh random mask each time), which works well for feedforward nets but is destructive when applied to an LSTM's RECURRENT connections because it corrupts the memory that the cell state is specifically designed to preserve over time. The whole point of the LSTM is to carry information forward across many timesteps via the cell state; if you apply a fresh, independent dropout mask to the recurrent path at every timestep, you're randomly deleting different pieces of the memory at each step, so information can't survive being carried forward - the noise accumulates over the sequence and destroys exactly the long-range signal the LSTM exists to maintain, hurting performance rather than regularizing. There are two standard fixes: (1) Apply dropout only to the NON-recurrent connections - the input-to-hidden and hidden-to-output connections between layers - while leaving the recurrent (hidden-to-hidden, cell-state) path clean, so you regularize without disrupting the memory (Zaremba et al.'s approach). (2) VARIATIONAL / recurrent dropout (Gal & Ghahramani): if you do want to drop recurrent connections, use the SAME dropout mask at every timestep of a given sequence (sampled once per sequence, not per step) - dropping the same units consistently throughout the sequence regularizes the model while keeping the temporal information flow coherent, because the surviving units form a consistent sub-network across time rather than a randomly-changing one. Both fixes respect the principle that the recurrent memory path must be treated carefully - you can't apply techniques designed for independent feedforward activations to a pathway whose entire purpose is to propagate information consistently through time. It's a concrete example of how regularization methods must be adapted to the architecture's structure rather than applied blindly."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "LSTM cell state",
        "back": "A separate memory that flows through time via gated ADDITIVE updates (not a matrix multiply), giving gradients a near-identity path - the vanishing-gradient fix."
      },
      {
        "type": "formula",
        "front": "LSTM cell-state update",
        "back": "C_t = f_t*C_{t-1} + i_t*C~_t (forget-gated old state + input-gated candidate). Additive + element-wise, so dC_t/dC_{t-1}=f_t (a gate, not a weight matrix)."
      },
      {
        "type": "definition",
        "front": "The three LSTM gates",
        "back": "Forget (what to erase), input (what to write), output (what to expose as h_t). Each a sigmoid 0-to-1 mask over [h_{t-1}, x_t]. Remember/write/read are separate decisions."
      },
      {
        "type": "intuition",
        "front": "Why the additive path saves gradients",
        "back": "Long-range gradient is a product of FORGET GATES (element-wise, set near 1 to remember) not repeated weight-matrix Jacobians - so it survives instead of vanishing."
      },
      {
        "type": "definition",
        "front": "GRU",
        "back": "Merges cell+hidden state, uses two gates (reset, update) not three. Update gate interpolates old vs new state. Fewer parameters, similar performance - LSTM vs GRU is empirical."
      },
      {
        "type": "intuition",
        "front": "LSTM gate = residual connection",
        "back": "Both are additive identity paths for gradient flow - LSTM through TIME (forget-gated cell state), residual/skip through DEPTH (x + F(x)). Same principle, different axis."
      },
      {
        "type": "pitfall",
        "front": "LSTMs don't fully solve long-range",
        "back": "They extend range from ~10 to ~100s of steps, but memory still decays (product of forget gates) and stays sequential - very long range + parallelism needed transformers."
      },
      {
        "type": "pitfall",
        "front": "Forget-gate bias init",
        "back": "Initialize the forget gate bias positive (starts near 1, remember by default) - without it LSTMs can start by forgetting everything and train poorly."
      }
    ],
    "refs": [
      {
        "title": "Hochreiter & Schmidhuber, Long Short-Term Memory (1997)",
        "url": "https://www.bioinf.jku.at/publications/older/2604.pdf"
      },
      {
        "title": "Cho et al., GRU / Learning Phrase Representations (2014)",
        "url": "https://arxiv.org/abs/1406.1078"
      },
      {
        "title": "Olah, Understanding LSTM Networks (2015)",
        "url": "https://colah.github.io/posts/2015-08-Understanding-LSTMs/"
      },
      {
        "title": "Greff et al., LSTM: A Search Space Odyssey (2017)",
        "url": "https://arxiv.org/abs/1503.04069"
      }
    ],
    "demos": [
      "rnn-gates"
    ]
  },
  "text-generation": {
    "level": "core",
    "body": {
      "intuition": [
        "A language model doesn't emit text directly - it outputs, at each step, a probability distribution over the next token given everything so far. Turning that sequence of distributions into actual generated text is a separate decision called decoding, and it matters enormously: the SAME model can produce dull repetitive output, incoherent nonsense, or fluent creative text depending only on how you sample from its distributions. Decoding is where 'the model' and 'the text you get' diverge, and understanding it demystifies temperature, top-k, top-p, and why generation has knobs at all.",
        "The core tension is quality versus diversity. Always picking the single most-probable next token (greedy decoding) sounds optimal but produces bland, repetitive, and often degenerate text - it gets stuck in loops and lacks the surprises that make language interesting. Pure random sampling from the full distribution is diverse but frequently incoherent, because the long tail of low-probability tokens includes many bad choices that occasionally get picked. Every practical decoding method is a way to navigate between these extremes: keep enough randomness for diverse, natural text while cutting off the unreliable tail that produces errors.",
        "The main tools are temperature (which sharpens or flattens the distribution before sampling - low temperature approaches greedy, high temperature approaches uniform), top-k sampling (sample only from the k most-probable tokens), and top-p / nucleus sampling (sample from the smallest set of tokens whose cumulative probability exceeds p, an adaptive cutoff). Beam search is a different approach for tasks with a 'correct' answer (translation): it keeps the several most-probable partial sequences and extends them, approximating the highest-probability whole sequence. Knowing which to use when - and why greedy/beam are wrong for open-ended generation - is a practical, frequently-asked skill."
      ],
      "math": [
        {
          "h": "Temperature: sharpening or flattening the distribution",
          "paras": [
            "Temperature T rescales the logits before the softmax. Dividing logits by T < 1 sharpens the distribution (concentrates probability on the top tokens, toward greedy); T > 1 flattens it (spreads probability, toward uniform/random); T = 1 is the model's raw distribution. It's a single knob trading determinism/quality against diversity/randomness."
          ],
          "tex": "p_i = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)}, \\qquad T \\to 0 \\Rightarrow \\text{greedy (argmax)}, \\quad T \\to \\infty \\Rightarrow \\text{uniform}",
          "texNote": "Lower T = sharper = more deterministic/repetitive; higher T = flatter = more diverse/risky. T is applied to logits before softmax, so it reshapes how sampling picks tokens."
        },
        {
          "h": "Nucleus (top-p) sampling: an adaptive cutoff",
          "paras": [
            "Top-p sampling keeps the smallest set of top tokens whose cumulative probability just exceeds p, then renormalizes and samples within it. Unlike top-k's fixed count, the nucleus size ADAPTS: when the model is confident (one token dominates) the set is small; when it's uncertain (probability spread out) the set is larger - matching the cutoff to the model's certainty."
          ],
          "tex": "V_p = \\text{smallest set with } \\sum_{i \\in V_p} p_i \\ge p, \\quad \\text{sample from } \\{p_i / \\textstyle\\sum_{V_p} p_j : i \\in V_p\\}",
          "texNote": "Top-p adapts the candidate set to the distribution's shape (small when confident, large when uncertain), which is why it handles the varying-confidence of real generation better than a fixed top-k."
        }
      ],
      "code": [
        {
          "h": "Temperature, top-k, and top-p sampling from scratch",
          "paras": [
            "The three sampling strategies as transformations of a logit vector - each reshapes which tokens can be sampled and how likely."
          ],
          "code": "import numpy as np\n\ndef softmax(z): e = np.exp(z - z.max()); return e / e.sum()\n\ndef sample(logits, temperature=1.0, top_k=None, top_p=None, rng=np.random.default_rng(0)):\n    logits = logits / temperature                    # temperature: sharpen/flatten\n    if top_k is not None:\n        thresh = np.sort(logits)[-top_k]             # keep only the top-k logits\n        logits = np.where(logits < thresh, -np.inf, logits)\n    probs = softmax(logits)\n    if top_p is not None:\n        order = np.argsort(probs)[::-1]              # descending\n        cum = np.cumsum(probs[order])\n        cutoff = np.searchsorted(cum, top_p) + 1     # smallest nucleus exceeding p\n        keep = order[:cutoff]\n        mask = np.zeros_like(probs); mask[keep] = probs[keep]\n        probs = mask / mask.sum()\n    return rng.choice(len(probs), p=probs)\n\n# greedy = temperature->0 (argmax); creative = temperature~0.8-1.0 + top_p~0.9\nprint('same model, different decoding = very different text')",
          "caption": "Temperature reshapes the whole distribution; top-k caps the candidate count; top-p adapts the candidate set to confidence. Combine (e.g. temperature + top-p) in practice."
        },
        {
          "h": "Greedy repetition vs sampled diversity",
          "paras": [
            "Greedy decoding maximizes each step's probability but produces repetitive, degenerate text; sampling (with a sensible cutoff) restores the natural diversity of human language."
          ],
          "code": "# greedy: always argmax -> can loop ('the the the') or repeat phrases\n# def greedy(model, prompt): return [model.next(prompt).argmax() for _ in range(N)]\n\n# the degeneration is well-documented: greedy/beam maximize probability but\n# human text is NOT the maximum-probability sequence - it has natural surprise.\n# measured: greedy output has far higher n-gram repetition than human text,\n# while nucleus sampling matches human-like repetition/diversity statistics\nprint('maximizing probability != human-like text; some surprise is essential')",
          "caption": "Greedy/beam maximize sequence probability, but human text isn't the max-probability sequence - it carries natural unpredictability, so open-ended generation needs sampling."
        }
      ],
      "useCases": [
        "Every text-generating LLM at inference exposes these knobs (temperature, top-k, top-p) - understanding them is how you tune an application between deterministic/factual and creative/diverse output.",
        "Open-ended creative generation (stories, dialogue, brainstorming) uses sampling (temperature + top-p) for diversity; factual/deterministic tasks (extraction, code, math) use low temperature or greedy for reliability.",
        "Machine translation and summarization - tasks with a 'best' answer - use beam search to approximate the highest-probability output sequence, where diversity is not the goal.",
        "Controlling repetition and quality - repetition penalties, no-repeat-n-gram constraints, and min/max length are decoding-time controls layered on top of the sampling strategy."
      ],
      "pitfalls": [
        "Greedy and beam search maximize sequence probability, but the maximum-probability sequence is NOT human-like text - it's bland and repetitive (and can even degenerate into loops), so they're wrong for open-ended generation despite sounding optimal.",
        "Temperature is not a 'creativity' dial you can turn up freely: too high produces incoherent, error-prone text (sampling from the unreliable tail), too low produces repetitive determinism - there's a task-dependent sweet spot (often ~0.7-1.0 for creative, lower for factual).",
        "Top-k's fixed count is a blunt instrument: k tokens might include garbage when the model is confident (only 1-2 tokens are good) or cut off good options when it's uncertain (many tokens are plausible) - top-p's adaptive cutoff usually handles this better.",
        "Beam search's larger beams don't monotonically improve open-ended quality - beyond translation-like tasks, bigger beams often make text MORE repetitive/generic (they find higher-probability but blander sequences), a counterintuitive failure.",
        "Decoding interacts with the tokenizer and stopping conditions: partial-token artifacts, where to stop (EOS token, max length), and repetition all need handling, and a decoding bug can make a good model look bad (or a bad model look repetitive)."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/classical-lm",
          "text": "The model provides the next-token distribution (its language-modeling output); decoding is the separate step of turning those distributions into text - perplexity measures the former, not the latter."
        },
        {
          "ref": "rnn-nlp/rnn",
          "text": "Autoregressive generation - feeding each generated token back as input for the next step - is the same one-step-at-a-time process, whether the model is an RNN or a transformer."
        },
        {
          "ref": "rnn-nlp/tokenization",
          "text": "Decoding produces one token at a time, so the tokenizer sets the granularity of generation and stopping (EOS token), and token-level artifacts surface during generation."
        },
        {
          "text": "Module 17/21's LLM-serving and agent lessons build on these decoding strategies (plus constrained decoding for structured output and speculative decoding for speed)."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a language model actually output at each step?",
          "a": "A probability distribution over the next token given the context - not text directly. Decoding turns that sequence of distributions into generated text."
        },
        {
          "q": "What is greedy decoding?",
          "a": "Always pick the single most-probable next token (argmax). Deterministic but produces bland, repetitive, often degenerate text - wrong for open-ended generation."
        },
        {
          "q": "What does temperature do?",
          "a": "Rescales logits before softmax: T<1 sharpens (toward greedy/deterministic), T>1 flattens (toward random/diverse), T=1 is the raw distribution."
        },
        {
          "q": "What is top-k sampling?",
          "a": "Sample only from the k most-probable tokens (zero out the rest and renormalize) - cuts the unreliable tail, but the fixed count k is a blunt cutoff."
        },
        {
          "q": "What is top-p (nucleus) sampling?",
          "a": "Sample from the smallest set of top tokens whose cumulative probability exceeds p - an ADAPTIVE cutoff that shrinks when the model is confident and grows when uncertain."
        },
        {
          "q": "Why is greedy/beam wrong for open-ended generation?",
          "a": "They maximize sequence probability, but human text is NOT the max-probability sequence - it has natural surprise; maximizing probability gives bland, repetitive output."
        },
        {
          "q": "What is beam search and when is it used?",
          "a": "Keep the b most-probable partial sequences and extend them, approximating the highest-probability whole sequence - used for tasks with a 'correct' answer like translation."
        },
        {
          "q": "Why does top-p often beat top-k?",
          "a": "Top-p adapts the candidate set to the model's confidence (small when one token dominates, large when uncertain), while top-k's fixed count can include garbage or cut good options."
        },
        {
          "q": "What decoding for factual vs creative tasks?",
          "a": "Factual/deterministic (extraction, code, math): low temperature or greedy for reliability. Creative (stories, dialogue): sampling with temperature ~0.7-1.0 + top-p for diversity."
        },
        {
          "q": "What is autoregressive generation?",
          "a": "Generate one token at a time, feeding each generated token back as input to predict the next - the sequential process underlying all text generation."
        }
      ],
      "standard": [
        {
          "q": "Explain why greedy decoding and beam search produce poor text for open-ended generation, despite maximizing probability.",
          "a": "The counterintuitive core fact is that human-generated text is NOT the maximum-probability sequence under a language model - and greedy/beam search are precisely trying to find high-probability sequences. Greedy decoding picks the single most-likely next token at every step, and beam search approximates the most-likely whole sequence by keeping several high-probability partial candidates - both optimize for probability. But natural language has a characteristic amount of unpredictability and variation: humans regularly use less-than-maximally-probable words, introduce novel phrasings, and avoid repetition, so the text people actually produce sits in a moderate-probability region, not the peak. When you force generation toward maximum probability, you get text that's bland, generic, and - critically - REPETITIVE and DEGENERATE: the model falls into loops ('the the the', repeated phrases, restating the same idea) because once it's in a high-probability rut, the highest-probability continuation is often to keep repeating, so it never escapes. This 'neural text degeneration' was documented empirically: greedy and beam-search output has far higher n-gram repetition than human text and quickly becomes dull or loops. So maximizing probability is the wrong objective for open-ended generation - the goal isn't the single most-likely text but text that's fluent AND has the natural diversity/surprise of human language, which requires SAMPLING (introducing controlled randomness) rather than maximizing. The exception is tasks with a genuinely 'correct' target (translation, where you want the most-probable faithful rendering), where beam search's probability-maximization is appropriate because diversity isn't the goal.",
          "deepDive": {
            "q": "Why does INCREASING the beam width often make open-ended text WORSE, not better?",
            "a": "This is the striking 'beam search curse' for open-ended generation: larger beams find higher-probability sequences, but for open-ended text, higher-probability means BLANDER and MORE REPETITIVE, so bigger beams make the output worse. Here's the mechanism: a wider beam searches more thoroughly for the maximum-probability sequence, and since (as established) the maximum-probability sequence for a language model tends to be generic, repetitive, and degenerate, searching harder for it finds MORE such sequences - a beam of 1 (greedy) is already biased toward blandness, and increasing the beam width intensifies this by finding even-higher-probability (even-blander) options. Concretely, the highest-probability sequences under a language model often collapse to short, generic, or repetitive text (the model can be very confident about safe, dull continuations), so a thorough search surfaces exactly those. This is why for open-ended generation, beam search - and especially wide beam search - is the wrong tool, and why the field moved to sampling methods (top-p) that deliberately DON'T maximize probability. It's a vivid illustration that the decoding OBJECTIVE (maximize probability) is mismatched to the GOAL (human-like text) for open-ended tasks: doing the search better optimizes the wrong thing harder. For translation and similar tasks with a correct answer, moderate beam widths do help (the objective matches the goal there), but even there very large beams can hurt due to a length/probability bias, which is why beam widths are kept modest (~4-10)."
          }
        },
        {
          "q": "Compare temperature, top-k, and top-p sampling - what each controls and how they interact.",
          "a": "They're complementary controls that reshape the next-token distribution before sampling. TEMPERATURE rescales the logits (divide by T) before the softmax, changing the SHAPE of the whole distribution: T < 1 sharpens it (concentrating probability on the top tokens, making sampling more deterministic and conservative), T > 1 flattens it (spreading probability toward the tail, making sampling more random and diverse), and T = 1 leaves the model's distribution unchanged. It affects ALL tokens' relative probabilities. TOP-K TRUNCATION keeps only the k highest-probability tokens (setting the rest to zero and renormalizing), directly cutting off the unreliable tail regardless of the distribution's shape - a fixed-COUNT cutoff. TOP-P (NUCLEUS) keeps the smallest set of top tokens whose cumulative probability exceeds p, then renormalizes - an ADAPTIVE cutoff based on cumulative probability MASS rather than a fixed count. The key difference between top-k and top-p is adaptivity: top-k always keeps exactly k tokens whether the model is confident or not, so when the model is very confident (one token has 0.95 probability) top-k=40 still includes 39 low-probability tokens (potential garbage), and when the model is uncertain (probability spread across 100 plausible tokens) top-k=40 cuts off 60 reasonable options; top-p adapts - it keeps a small set when confident and a large set when uncertain, matching the cutoff to the distribution's shape. They INTERACT and are commonly COMBINED: a typical setup applies temperature first (to set overall randomness) and then top-p (to cut the tail adaptively), e.g., temperature 0.8 + top-p 0.9 for creative generation - temperature controls how much the surviving tokens' probabilities are flattened, and top-p controls which tokens survive. Using them together gives finer control than either alone: temperature for the overall diversity level, top-p for a principled, confidence-aware truncation of bad options.",
          "deepDive": {
            "q": "Why apply temperature and top-p together rather than just cranking temperature to increase diversity?",
            "a": "Because temperature and top-p control diversity through different mechanisms with different failure modes, and combining them avoids each one's weakness. Cranking temperature alone to increase diversity FLATTENS the entire distribution, which raises the probability of the long tail of genuinely-bad tokens - so high temperature makes the model more likely to sample not just interesting alternatives but also incoherent, off-topic, or erroneous tokens from the tail, degrading quality/coherence to get diversity. There's no separation between 'good diverse options' and 'bad tail options' - temperature boosts both. Top-p, by contrast, TRUNCATES the tail (removes the low-cumulative-probability tokens entirely), so it eliminates the bad options regardless of temperature. Combining them lets you get the benefit of each without the cost: top-p first removes the unreliable tail (so you never sample the incoherent garbage no matter what), and then temperature adjusts the diversity AMONG the surviving good tokens (flattening or sharpening within the nucleus). This way you can have meaningful diversity (temperature spreads probability among plausible continuations) WITHOUT the coherence collapse that pure high-temperature causes (because the tail was already cut). Practically, this is why the standard recipe is 'moderate temperature + top-p' rather than 'high temperature alone' - top-p provides the safety floor (no tail garbage) and temperature provides the tunable diversity within the safe set, giving diverse-but-coherent text. It's the same principle as any two-stage filter: cut the clearly-bad options with a hard threshold, then tune among the remaining good ones - more robust than a single knob that trades quality for diversity monotonically."
          }
        },
        {
          "q": "What is the 'quality vs diversity' trade-off in decoding, and how do you choose settings for a specific application?",
          "a": "The quality-diversity trade-off is the fundamental tension in decoding: making generation more DETERMINISTIC (greedy, low temperature, small nucleus) improves per-token reliability and coherence but reduces variety and can cause repetition/blandness, while making it more RANDOM (high temperature, large nucleus, pure sampling) increases diversity and creativity but risks incoherence, errors, and going off-topic. Every decoding choice picks a point on this spectrum. You choose settings based on what the APPLICATION values: (1) FACTUAL / DETERMINISTIC tasks - extraction, classification, math, code generation, structured output, tool-calling - want reliability and correctness, not diversity, so use greedy or very low temperature (near 0); you want the same, most-likely, correct answer every time, and diversity is a liability (a creatively-wrong answer is worse than a boringly-correct one). (2) CREATIVE / OPEN-ENDED tasks - story writing, brainstorming, dialogue, marketing copy - want variety and natural surprise, so use sampling with moderate temperature (~0.7-1.0) and top-p (~0.9), accepting some risk for engaging, varied output. (3) TASKS WITH A CORRECT ANSWER BUT NEEDING FLUENCY - translation, summarization - use beam search (moderate width) to find a high-probability faithful rendering. (4) Applications needing BOTH sometimes generate multiple samples (higher diversity) and then rank/filter them (recovering quality) - e.g., sample several code solutions and pick the one that passes tests. Beyond the task, you also tune based on the model (larger/better-calibrated models tolerate higher temperature) and validate empirically on your actual use case rather than assuming. The meta-point is that there's no universally 'best' decoding setting - it's a deliberate choice matching the randomness to whether your task rewards reliability or variety, and it's one of the cheapest, highest-leverage knobs in deploying a generative model.",
          "deepDive": {
            "q": "How does the 'generate many, then rank/filter' approach let you escape the quality-diversity trade-off, and where does it apply?",
            "a": "The 'generate many, then select' approach sidesteps the trade-off by decoupling exploration (diversity) from the final output (quality): instead of trying to get one perfect sample from a single decoding pass, you use HIGH-diversity sampling to generate MANY candidate outputs (casting a wide net that includes some excellent ones you'd never get from conservative decoding), and then apply a SELECTION step to pick the best - recovering quality by filtering rather than by constraining generation. This works because with enough diverse samples, at least one is often very good, and a separate evaluator can identify it, so you get both the diversity (in the candidate pool) and the quality (in the selected output). It applies wherever you have a way to RANK or VERIFY candidates: (1) Code generation - sample many solutions at high temperature, run them against test cases, and keep one that passes (verification is cheap and reliable), which dramatically improves success rate over a single greedy attempt (this is 'pass@k' and underlies much of code-model performance). (2) Math/reasoning - sample multiple chains of thought and take a majority vote on the answer (self-consistency) or use a verifier/reward model to score them. (3) Any task with a learned reward model or automatic metric to rank outputs (best-of-n sampling, used in RLHF pipelines). The requirement is a reliable selector - the approach shines when verification is easier than generation (checking a solution vs producing it), which is common for code and math (25-05's RAG/verification and 24-10's verification>generation results are the same insight). It doesn't help when you can't tell good from bad outputs (no verifier), and it costs more compute (many samples), but where a cheap verifier exists it's one of the most effective ways to boost generation quality, precisely because it escapes the single-sample quality-diversity trade-off by separating the two concerns."
          }
        },
        {
          "q": "What is neural text degeneration (repetition/looping) and what causes it? How is it mitigated at decoding time?",
          "a": "Neural text degeneration is the tendency of language models, especially under probability-maximizing decoding (greedy/beam), to produce repetitive, looping, or degenerate output - the same phrase or sentence repeated, or the text collapsing into 'the the the' style loops. The causes are twofold. First, as established, the maximum-probability sequence under a language model tends to be repetitive (once the model is in a high-probability rut, repeating what it just said is often the highest-probability continuation, creating a self-reinforcing loop), so greedy/beam decoding actively seeks out this degeneration. Second, there's a self-amplifying feedback dynamic: models tend to assign higher probability to tokens/phrases they've already generated (a repetition often INCREASES the probability of repeating again), so once a repetition starts it can snowball. This is a documented, systematic failure, not random noise. Decoding-time mitigations: (1) SAMPLING instead of maximizing - top-p/nucleus sampling introduces controlled randomness that breaks out of ruts and matches human-like diversity statistics, the primary fix (the nucleus-sampling paper was motivated precisely by curing degeneration). (2) REPETITION PENALTY - explicitly reduce the probability (or logit) of tokens that have already appeared, directly discouraging repetition; a related tool is a frequency/presence penalty that scales with how often a token has been used. (3) NO-REPEAT-N-GRAM constraint - forbid generating any n-gram (say any 3-gram) that has already appeared, a hard constraint that eliminates verbatim loops. (4) Appropriate temperature - a little randomness (not near-zero temperature) helps avoid the deterministic ruts. In practice, nucleus sampling with a modest repetition penalty handles most degeneration. The key insight is that degeneration is largely a DECODING problem (the model's distribution is fine; probability-maximizing decoding surfaces the bad sequences), so it's fixed at decoding time by not maximizing probability and by explicitly penalizing repetition - you don't need to retrain the model.",
          "deepDive": {
            "q": "If degeneration is mostly a decoding problem, are there any cases where it reflects a real model problem rather than a decoding choice?",
            "a": "Yes - while probability-maximizing decoding SURFACES degeneration, the underlying tendency also reflects real properties of how the model's distribution is shaped, and in some cases points to genuine model issues rather than pure decoding choices. Several distinctions: (1) The self-reinforcing repetition dynamic (a repeated token becoming MORE probable) is a property of the trained MODEL's distribution, not just the decoder - the model has learned distributions where repetition is a high-probability attractor, so even sampling can fall into loops on some inputs, and this partly traces to training (maximum-likelihood training on teacher-forced sequences doesn't penalize the exposure-bias-driven drift into repetitive regions at generation time). (2) EXPOSURE BIAS - the mismatch between training (the model always sees ground-truth previous tokens via teacher forcing) and generation (it sees its OWN possibly-erroneous previous tokens) - means errors and repetitions can compound at generation time in ways training never exposed the model to, a genuine train/inference mismatch that decoding tricks only partially paper over. (3) A model that degenerates even under good sampling (top-p with repetition penalty) on normal inputs likely has a real problem - undertraining, a distribution shift between its training data and the current input, or a pathological confidence pattern. So the honest picture is layered: degeneration is PRIMARILY a decoding problem (probability-maximizing decoding is the main culprit and sampling largely fixes it), but the model's distribution genuinely contains repetition attractors shaped by maximum-likelihood training and exposure bias, so it's not PURELY a decoding artifact - which is why some approaches address it at training time too (unlikelihood training explicitly penalizes repetition during training, and RLHF can reduce degeneration by optimizing for human-preferred non-repetitive text). The practical rule: try decoding fixes first (they solve most cases cheaply), but persistent degeneration under good decoding signals a model/training issue."
          }
        },
        {
          "q": "Walk through how autoregressive generation actually works step by step, and what the KV-cache optimization does for it.",
          "a": "Autoregressive generation produces text one token at a time, feeding each generated token back in to produce the next. Step by step: (1) Start with a prompt (a sequence of tokens). (2) Run the model on the current sequence to get the probability distribution over the next token at the final position. (3) DECODE - apply the chosen strategy (greedy/temperature/top-p) to that distribution to select one next token. (4) APPEND the selected token to the sequence. (5) Repeat from step 2 with the now-longer sequence, until a stopping condition (an end-of-sequence token is generated, or a max-length limit is reached). So each new token requires a full forward pass conditioned on ALL previous tokens, and generation is inherently sequential (you can't generate token t+1 until you've committed token t) - which is why generation is slower than a single classification pass and why generation latency scales with output length. The KV-CACHE optimization addresses the redundancy in this process for transformers. Naively, generating each new token reruns the model over the ENTIRE growing sequence, recomputing the attention keys and values for all previous positions every time - hugely wasteful, since those keys/values don't change as new tokens are added. The KV-cache stores the key and value vectors computed for each position the first time they're processed, so when generating the next token the model only computes the query/key/value for the ONE new position and reuses the cached keys/values for all previous positions in the attention computation. This changes the per-token cost from reprocessing the whole sequence (O(sequence_length) work per token, O(sequence_length^2) total) to processing just the new token against the cache (O(sequence_length) attention lookups per token but no recomputation of past positions), dramatically speeding up generation. The cost is memory: the KV-cache grows linearly with sequence length (and with model size, layers, and batch), so it becomes a major memory consumer for long contexts - which is exactly what later serving-optimization lessons (paged attention, etc.) address. So autoregressive generation is 'predict-append-repeat', and the KV-cache is the essential optimization that makes it efficient by not recomputing the unchanging past at every step.",
          "deepDive": {
            "q": "Why does the KV-cache create a memory bottleneck for long-context generation, and what does that imply for serving?",
            "a": "The KV-cache stores, for every layer and every attention head, the key and value vectors for every token position processed so far, so its size is proportional to (sequence_length x number_of_layers x hidden_dimension x 2 [keys and values] x batch_size x bytes_per_value) - it grows LINEARLY with the sequence length and the batch size, and is multiplied by the model's depth and width. For a large model with a long context and a reasonable batch, this can reach many gigabytes - often RIVALING or EXCEEDING the memory used by the model's weights themselves. This creates a serving bottleneck because GPU memory is finite and must hold both the weights AND the KV-caches of all concurrently-generating sequences: the KV-cache memory caps how many requests you can serve simultaneously (batch size) and how long the contexts can be, so it directly limits throughput and maximum context length. It also causes fragmentation and waste under naive allocation (reserving max-length cache per request wastes memory for shorter ones). The implications for serving are significant and motivate a whole line of optimization: (1) techniques to SHRINK the cache - multi-query and grouped-query attention share keys/values across heads to cut the cache size several-fold (the 08/17 lessons), and quantizing the cached values; (2) techniques to MANAGE the cache efficiently - paged attention (vLLM) allocates the cache in small blocks like OS virtual memory to eliminate fragmentation and pack more requests, dramatically improving throughput (the Module 22 serving lesson); (3) context-length limits are partly KV-cache-memory limits. So the KV-cache is a double-edged optimization - essential for generation speed, but its linear-in-context memory growth is one of the central constraints in LLM serving, which is why efficient attention variants and cache-management systems are such an active, important area."
          }
        },
        {
          "q": "You need a model to reliably output valid JSON matching a schema. Why isn't prompting alone sufficient, and how does constrained decoding solve it?",
          "a": "Prompting alone ('respond only with valid JSON matching this schema') is unreliable because generation is probabilistic and the model can, at any step, sample a token that violates the format - a missing quote, a trailing comma, an extra field, a truncated string, or a burst of prose before/after the JSON - and even a small violation makes the output unparseable, so the failure rate is nonzero and unacceptable for a production system that must parse the result. The model has no HARD guarantee of validity; it's just been asked nicely, and the tail of its distribution always includes format-breaking tokens that occasionally get sampled. Constrained (or grammar-guided / structured) decoding solves this by making invalid output IMPOSSIBLE rather than merely unlikely: at each generation step, it computes which tokens would keep the output valid according to the target format (a JSON grammar, a regex, or a schema), and MASKS OUT (sets to probability zero) every token that would violate it, so the model can only sample from format-valid continuations. Concretely, it tracks the parser/grammar state (e.g., 'we're inside a string', 'we just opened a brace so a key or close-brace must come next', 'this field must be an integer'), and at each step allows only the tokens the grammar permits from that state, renormalizing the distribution over just those. This guarantees the output parses and conforms to the schema BY CONSTRUCTION - a 100% valid-format rate - while still letting the model choose the CONTENT among the valid options (which value to put, which allowed key to emit). So the model's language ability picks the semantics and the constraint enforces the syntax. This is why production structured-output and function-calling/tool-use systems use constrained decoding (or fine-tuning plus it) rather than relying on prompting - it converts a probabilistic hope into a hard guarantee.",
          "deepDive": {
            "q": "What are the costs and subtleties of constrained decoding - does forcing valid format hurt the model's outputs?",
            "a": "Constrained decoding guarantees valid format but has real costs and subtleties. (1) COMPUTATIONAL overhead: at each step you must compute the set of grammar-valid tokens (maintaining and querying the parser/grammar state and building a token mask over the vocabulary), which adds per-token work; efficient implementations precompute grammar-to-token-mask mappings, but it's non-trivial engineering, especially reconciling a character-level grammar with the model's subword tokenization (a single token may span a grammar boundary). (2) It constrains SYNTAX but can't guarantee SEMANTIC correctness - it ensures valid JSON matching the schema's structure, but the VALUES can still be wrong (a valid-format but factually incorrect field), so constrained decoding is necessary for parseability, not sufficient for correctness. (3) A subtle QUALITY concern: forcing the model onto grammar-valid tokens can push it off the distribution it was trained on, occasionally DEGRADING content quality - if the model 'wanted' to emit an explanation or a token the grammar forbids, masking it can distort the generation in ways that hurt the semantic quality of the constrained output (there's evidence that overly-rigid constraints can reduce reasoning quality, e.g., preventing the model from 'thinking out loud' before committing to structured output). Mitigations include allowing a free-form reasoning field before the structured part, or fine-tuning the model on the target format so its natural distribution already favors valid output (reducing how much the constraint has to intervene). (4) Local masking != globally-optimal valid sequence: greedily masking per-step enforces validity but doesn't necessarily produce the highest-probability VALID sequence (that would require search over valid sequences), a minor theoretical gap. So constrained decoding is the right tool for guaranteed-parseable structured output, but you pair it with schema design that permits reasoning, awareness that it enforces form not truth, and ideally fine-tuning so the constraint and the model's distribution agree - it's a powerful guarantee with engineering and quality subtleties, not a free lunch (the M17/M21 structured-output lessons quantify these trade-offs)."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "What decoding is",
        "back": "A language model outputs a next-token DISTRIBUTION each step; decoding turns that sequence of distributions into text. Same model + different decoding = very different output."
      },
      {
        "type": "definition",
        "front": "Greedy decoding",
        "back": "Always pick the argmax token. Deterministic but bland/repetitive/degenerate - wrong for open-ended generation because human text isn't the max-probability sequence."
      },
      {
        "type": "formula",
        "front": "Temperature",
        "back": "Divide logits by T before softmax: T<1 sharpens (toward greedy), T>1 flattens (toward random), T=1 raw. Reshapes ALL token probabilities."
      },
      {
        "type": "definition",
        "front": "Top-k vs top-p (nucleus)",
        "back": "Top-k: keep the k most-probable tokens (fixed count). Top-p: keep the smallest set with cumulative prob >= p (adaptive to confidence). Top-p usually better."
      },
      {
        "type": "intuition",
        "front": "Quality vs diversity trade-off",
        "back": "Deterministic (greedy/low-T) = reliable but bland/repetitive; random (high-T/large-p) = diverse but incoherent. Factual->low, creative->moderate sampling+top-p."
      },
      {
        "type": "pitfall",
        "front": "Wider beam -> worse open-ended text",
        "back": "Bigger beams find higher-probability (blander, more repetitive) sequences. Beam is for tasks with a correct answer (translation), not open-ended generation."
      },
      {
        "type": "definition",
        "front": "Neural text degeneration",
        "back": "Repetition/looping under probability-maximizing decoding (self-reinforcing: repeats become more probable). Fix at decoding: sampling (top-p), repetition penalty, no-repeat-n-gram."
      },
      {
        "type": "definition",
        "front": "KV-cache",
        "back": "Cache the attention keys/values of past tokens so each new generation step only computes the new position (not reprocessing the whole sequence). Speeds generation; grows linearly with context (a serving memory bottleneck)."
      }
    ],
    "refs": [
      {
        "title": "Holtzman et al., The Curious Case of Neural Text Degeneration (nucleus sampling, 2020)",
        "url": "https://arxiv.org/abs/1904.09751"
      },
      {
        "title": "Fan et al., Hierarchical Neural Story Generation (top-k sampling, 2018)",
        "url": "https://arxiv.org/abs/1805.04833"
      },
      {
        "title": "Hugging Face: How to generate text (decoding strategies)",
        "url": "https://huggingface.co/blog/how-to-generate"
      },
      {
        "title": "Welleck et al., Neural Text Generation with Unlikelihood Training (2020)",
        "url": "https://arxiv.org/abs/1908.04319"
      }
    ],
    "demos": [
      "decoding",
      "beam-search"
    ]
  },
  "classical-lm": {
    "level": "core",
    "body": {
      "intuition": [
        "A language model, at its core, is a probability distribution over sequences of tokens - it answers 'how likely is this text?' and, equivalently, 'what token is likely to come next?'. Before neural networks, the dominant approach was the n-gram model: estimate the probability of the next word from the previous n-1 words by simply counting how often each such sequence appears in a corpus. It's the crudest possible language model, but studying it is invaluable because it makes the core concepts concrete - the chain rule of probability over tokens, the sparsity problem, smoothing, and the metric that still evaluates every language model today: perplexity.",
        "The n-gram model rests on a Markov assumption: the next word depends only on the previous n-1 words, not the entire history. A bigram (n=2) model predicts each word from just the one before it; a trigram from the two before. This makes estimation tractable (count sequences and divide) but immediately reveals the fundamental tension of language modeling: a larger n captures more context (better predictions) but the number of possible n-grams explodes exponentially, so most never appear in any finite corpus - the data sparsity that plagued classical NLP and that neural models were invented to overcome by generalizing rather than counting.",
        "Perplexity is the standard intrinsic evaluation metric for language models, and it's just a transformation of cross-entropy - the information-theoretic quantity from earlier. Perplexity is the exponential of the per-token cross-entropy, interpretable as the model's average 'branching factor': how many equally-likely options the model is effectively choosing among at each step. A perplexity of 20 means the model is as uncertain as if it were picking uniformly among 20 words. Lower is better, and understanding perplexity - what it measures, its pitfalls, and why it's not comparable across tokenizers - is essential for evaluating any language model, classical or neural."
      ],
      "math": [
        {
          "h": "The chain rule and the n-gram Markov approximation",
          "paras": [
            "The probability of a sequence factorizes exactly by the chain rule into a product of next-token conditionals. An n-gram model approximates each conditional by assuming it depends only on the previous n-1 tokens (the Markov assumption), estimated by counting."
          ],
          "tex": "P(w_1 \\dots w_T) = \\prod_{t} P(w_t \\mid w_{<t}) \\;\\overset{n\\text{-gram}}{\\approx}\\; \\prod_t P(w_t \\mid w_{t-n+1:t-1}), \\quad \\hat{P}(w_t \\mid w_{t-1}) = \\frac{\\text{count}(w_{t-1} w_t)}{\\text{count}(w_{t-1})}",
          "texNote": "The chain rule is exact; the n-gram approximation truncates the history to n-1 tokens (Markov) and estimates by counting - simple, but blind to context beyond the window."
        },
        {
          "h": "Perplexity: exponentiated per-token cross-entropy",
          "paras": [
            "Perplexity is 2 (or e) raised to the average per-token cross-entropy - the average negative log-probability the model assigns to the true next tokens. It's the effective 'branching factor': lower perplexity means the model concentrates probability on the right tokens (less uncertainty)."
          ],
          "tex": "\\text{PPL} = \\exp\\!\\Big(-\\frac{1}{T}\\sum_{t} \\log P(w_t \\mid w_{<t})\\Big) = 2^{H}, \\quad H = \\text{per-token cross-entropy}",
          "texNote": "Perplexity = exp(cross-entropy). A model assigning uniform probability over V options has perplexity V; a perfect model (probability 1 on each true token) has perplexity 1. Lower is better."
        }
      ],
      "code": [
        {
          "h": "A bigram model and its sparsity problem",
          "paras": [
            "Counting bigrams gives a language model, but any word pair unseen in training gets probability zero - so an entire sentence's probability collapses to zero, which is why smoothing is mandatory."
          ],
          "code": "from collections import Counter, defaultdict\nimport numpy as np\n\ndef train_bigram(tokens):\n    unigram = Counter(tokens)\n    bigram = Counter(zip(tokens, tokens[1:]))\n    return unigram, bigram\n\ndef bigram_prob(w_prev, w, unigram, bigram, vocab_size, alpha=0.0):\n    # add-alpha (Laplace) smoothing: alpha>0 gives unseen pairs nonzero probability\n    return (bigram[(w_prev, w)] + alpha) / (unigram[w_prev] + alpha * vocab_size)\n\ntoks = 'the cat sat on the mat the cat ran'.split()\nuni, bi = train_bigram(toks)\nprint('P(cat|the) unsmoothed:', bigram_prob('the', 'cat', uni, bi, len(uni)))\nprint('P(dog|the) unsmoothed:', bigram_prob('the', 'dog', uni, bi, len(uni)))  # 0.0 - never seen!\nprint('P(dog|the) smoothed:  ', bigram_prob('the', 'dog', uni, bi, len(uni), alpha=1.0))",
          "caption": "An unseen bigram gets probability 0 (zeroing the whole sequence) - add-alpha (Laplace) smoothing gives every pair a small nonzero probability. This is the same conjugate-prior idea as before."
        },
        {
          "h": "Computing perplexity",
          "paras": [
            "Perplexity is the exponential of the average negative log-probability the model assigns to the actual next tokens - a direct measure of how surprised the model is by real text."
          ],
          "code": "import numpy as np\n\ndef perplexity(model_probs):\n    # model_probs: the probability the model assigned to each TRUE next token\n    log_probs = np.log(np.clip(model_probs, 1e-12, 1.0))\n    avg_neg_log = -log_probs.mean()               # per-token cross-entropy (nats)\n    return np.exp(avg_neg_log)                     # perplexity\n\n# a model confident and right -> probs near 1 -> low perplexity\nprint('confident+correct:', round(perplexity(np.array([0.9, 0.8, 0.95, 0.85])), 2))\nprint('uncertain:        ', round(perplexity(np.array([0.1, 0.2, 0.15, 0.1])), 2))\n# clip avoids log(0); perplexity 1 = perfect, = V for uniform over V tokens",
          "caption": "Perplexity exponentiates the average negative log-probability of the true tokens - low when the model puts high probability on what actually comes next."
        }
      ],
      "useCases": [
        "Perplexity is STILL the standard intrinsic evaluation for language models, from n-grams to modern LLMs - reported for GPT and every pretrained model to measure how well it predicts held-out text.",
        "N-gram models remain practical baselines and are used where speed/simplicity matter - autocomplete, spelling correction, and as fast components in speech recognition and machine translation pipelines historically.",
        "Understanding smoothing (add-alpha, Kneser-Ney, backoff, interpolation) generalizes to any count-based probability estimation and connects to the Bayesian/conjugate-prior view of adding pseudo-counts.",
        "The chain-rule factorization and next-token-prediction objective here are EXACTLY what modern autoregressive LLMs optimize - a transformer is a very powerful conditional next-token model trained with the same cross-entropy objective."
      ],
      "pitfalls": [
        "Zero-probability problem: any n-gram unseen in training gets probability zero under naive counting, which zeros the entire sequence's probability (and makes perplexity infinite) - smoothing (add-alpha, Kneser-Ney, backoff) is mandatory, not optional.",
        "The context-vs-sparsity trade-off: a larger n captures more context but the number of possible n-grams grows exponentially, so most never appear in a finite corpus - n-grams can't generalize to unseen contexts, only count seen ones (the gap neural models close).",
        "Perplexity is NOT comparable across models with different tokenizers or vocabularies - a coarser tokenizer gives higher per-token perplexity for the same capability, so cross-tokenizer comparisons need normalization (bits-per-byte/character).",
        "Low perplexity doesn't guarantee good downstream performance or good generation: perplexity measures next-token prediction on the eval distribution, which correlates with but doesn't equal task quality, factuality, or usefulness - it's an intrinsic proxy.",
        "Perplexity is sensitive to the evaluation data: it's only meaningful relative to a specific held-out set from a specific distribution, and a model can have low perplexity on in-domain text but high on out-of-domain, so the eval set choice matters as much as the number."
      ],
      "connections": [
        {
          "ref": "foundations/information-theory",
          "text": "Perplexity is exp(cross-entropy) - a direct transformation of the cross-entropy/KL machinery; the whole lesson is information theory applied to sequences."
        },
        {
          "ref": "rnn-nlp/tokenization",
          "text": "Perplexity and probabilities are per-TOKEN, so the tokenizer defines the units - which is exactly why perplexity isn't comparable across different tokenizers."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "Add-alpha smoothing is the conjugate Dirichlet/Beta prior (pseudo-counts) from the Bayesian lesson - the same 'add prior evidence to avoid zeros' idea."
        },
        {
          "text": "Modern autoregressive LLMs (Module 08+) optimize the exact chain-rule next-token cross-entropy objective here - a transformer is an n-gram model's successor that generalizes over context instead of counting."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a language model?",
          "a": "A probability distribution over token sequences - equivalently, a model of P(next token | context). It scores how likely text is and predicts what comes next."
        },
        {
          "q": "What is an n-gram model?",
          "a": "Estimates P(next word | previous n-1 words) by counting n-gram frequencies in a corpus - a Markov approximation truncating the history to n-1 tokens."
        },
        {
          "q": "What is the Markov assumption in n-gram models?",
          "a": "The next token depends only on the previous n-1 tokens, not the full history - what makes counting-based estimation tractable."
        },
        {
          "q": "What is the zero-probability problem?",
          "a": "Any n-gram unseen in training gets probability zero under naive counting, zeroing the whole sequence's probability and making perplexity infinite - fixed by smoothing."
        },
        {
          "q": "What is add-alpha (Laplace) smoothing?",
          "a": "Add a constant alpha to every count before normalizing so unseen n-grams get nonzero probability - the same pseudo-count/conjugate-prior idea as Laplace smoothing elsewhere."
        },
        {
          "q": "What is perplexity?",
          "a": "exp(per-token cross-entropy) - the model's effective branching factor (how many equally-likely options it's choosing among). Lower is better; 1 = perfect, V = uniform over V tokens."
        },
        {
          "q": "What is the context-vs-sparsity trade-off?",
          "a": "Larger n captures more context but the number of possible n-grams explodes, so most are unseen - n-grams can't generalize, only count, which neural models fixed."
        },
        {
          "q": "Why isn't perplexity comparable across tokenizers?",
          "a": "It's per-token, so a coarser tokenizer gives higher per-token perplexity for the same capability - cross-tokenizer comparison needs bits-per-byte/character normalization."
        },
        {
          "q": "What objective do modern LLMs share with n-gram models?",
          "a": "The chain-rule next-token prediction with cross-entropy loss - a transformer is a powerful conditional next-token model, same objective, generalizing instead of counting."
        },
        {
          "q": "Does low perplexity guarantee good generation or task performance?",
          "a": "No - it measures next-token prediction on the eval distribution, an intrinsic proxy that correlates with but doesn't equal downstream quality, factuality, or usefulness."
        }
      ],
      "standard": [
        {
          "q": "Explain how an n-gram language model works and the fundamental limitation it faces.",
          "a": "An n-gram model estimates the probability of a sequence using the chain rule of probability - P(w1...wT) = product of P(w_t | w_1...w_{t-1}) - but approximates each conditional with a Markov assumption: the next word depends only on the previous n-1 words, not the entire history. So a bigram model (n=2) estimates P(w_t | w_{t-1}), a trigram P(w_t | w_{t-2}, w_{t-1}), etc. The estimation is pure counting: P(w_t | w_{t-1}) = count(w_{t-1}, w_t) / count(w_{t-1}) - how often the pair appeared divided by how often the context appeared. This is simple, fast, and interpretable, and it works reasonably for local patterns. The fundamental limitation is the CONTEXT-SPARSITY trade-off and the inability to GENERALIZE. On one hand, a small n (bigram/trigram) captures very little context - it can't model dependencies beyond a couple of words, so it misses long-range structure, agreement, and meaning that depend on distant context. On the other hand, increasing n to capture more context makes the number of possible n-grams grow EXPONENTIALLY (vocabulary^n), so the vast majority of n-grams never appear in any finite training corpus - the counts are zero or unreliably small (data sparsity), and the model simply has no estimate for unseen contexts. Crucially, an n-gram model can only COUNT contexts it has seen; it cannot GENERALIZE to similar-but-unseen contexts, because it treats every distinct n-gram as an atomic, independent event with no notion that 'the cat sat' and 'the dog sat' are related. So it's stuck between too-little-context (small n) and too-sparse-to-estimate (large n), with no way to bridge via similarity - which is precisely the gap neural language models close by learning distributed representations that generalize across similar contexts rather than counting exact matches.",
          "deepDive": {
            "q": "How do neural language models overcome the sparsity/generalization limitation that n-grams face?",
            "a": "Neural language models overcome it by learning DISTRIBUTED, CONTINUOUS representations that generalize across similar contexts, instead of treating each context as a discrete atom to be counted. The key is that a neural LM embeds words (and contexts) into a continuous vector space where similar words/contexts are nearby, and it predicts the next word as a smooth function of that continuous context representation. This means that even if the exact context 'the fluffy cat sat on the' was never seen in training, the model represents it near other similar contexts it HAS learned from (contexts with cats, animals, sitting, etc.), so it can produce a sensible next-word distribution by GENERALIZING from related contexts - the continuous representation lets 'the cat sat' and 'the dog sat' share statistical strength because their embeddings are similar, which an n-gram's discrete counting can never do. Concretely: (1) word embeddings mean the model learns that similar words behave similarly, so a rare or unseen context involving a known-similar word inherits reasonable predictions; (2) the model's parameters are SHARED across all contexts (it's one function, not a per-n-gram count table), so learning from one context improves predictions on related ones; (3) architectures like RNNs and transformers can incorporate LONG context (not just n-1 words) through hidden states or attention, without the exponential blow-up, because they compress context into a fixed-size continuous representation rather than enumerating discrete n-grams. So neural LMs solve BOTH horns of the n-gram dilemma at once: they use unbounded context (fixing the small-n limitation) AND generalize via continuous representations (fixing the sparsity/unseen-context limitation), which is why they dramatically outperformed n-grams and why the field moved from counting to learning - the same 'distributed representations generalize where discrete counts can't' insight that underlies word embeddings and all of deep learning for NLP."
          }
        },
        {
          "q": "Explain perplexity - what it measures, its relationship to cross-entropy, and how to interpret a specific value.",
          "a": "Perplexity is the standard intrinsic evaluation metric for language models, measuring how well a model predicts a held-out text - specifically, how 'surprised' the model is by the actual sequence. Formally, perplexity is the exponential of the per-token cross-entropy: PPL = exp(-(1/T) sum_t log P(w_t | context)), where the sum is the average negative log-probability the model assigned to the TRUE next tokens across the evaluation text. Its relationship to cross-entropy is direct: cross-entropy H is the average number of nats/bits needed to encode the true tokens under the model's distribution (the information-theoretic quantity from earlier), and perplexity is simply 2^H (in bits) or e^H (in nats) - so perplexity and cross-entropy carry the same information, just on different scales, and minimizing one minimizes the other. The interpretation of a specific value is as an effective BRANCHING FACTOR or 'average number of equally-likely choices': a perplexity of 20 means the model, at each step, is as uncertain as if it were choosing uniformly among 20 equally-likely tokens. The bounds anchor the intuition: a PERFECT model that assigns probability 1 to each true token has perplexity 1 (no uncertainty, no branching); a model that assigns UNIFORM probability over a vocabulary of size V has perplexity exactly V (maximal uncertainty, choosing among all V options); a real model falls in between, and lower perplexity means it concentrates probability more tightly on the actual next tokens (less uncertainty, better prediction). So when you see a language model reported with perplexity 15 vs 30, the first is roughly 'twice as certain' in this branching-factor sense - it's effectively deciding among ~15 options per token vs ~30 - and lower is better. It remains THE intrinsic metric because it directly measures the language-modeling objective (next-token prediction quality) on held-out data.",
          "deepDive": {
            "q": "Why is perplexity comparable only within the same tokenizer/vocabulary, and how do you compare models with different tokenizers?",
            "a": "Perplexity is a PER-TOKEN quantity - it's the exponentiated average negative log-probability PER TOKEN - so it fundamentally depends on what a 'token' is, which is set by the tokenizer. This breaks cross-tokenizer comparison because different tokenizers split the same text into different numbers of tokens: a model with a COARSER tokenizer (fewer, longer tokens, so more text per token) faces a HARDER per-token prediction task (each token carries more information / is less predictable) and will show HIGHER per-token perplexity even if it's equally or more capable overall, while a model with a FINER tokenizer (more, shorter tokens) faces an EASIER per-token task (short sub-word continuations are highly predictable) and shows artificially LOWER perplexity - so comparing raw per-token perplexity across models with different vocabularies conflates genuine capability with tokenization granularity, making it meaningless. The fix is to normalize to a tokenization-INDEPENDENT unit: compute bits-per-BYTE or bits-per-CHARACTER instead of per-token. Since the underlying text (in bytes or characters) is the same regardless of tokenizer, you convert the total cross-entropy over the eval text to bits and divide by the number of bytes/characters (not tokens) - this measures how well the model compresses the actual text at the byte/character level, which is comparable across any tokenizers because the denominator is tokenizer-independent. Concretely, bits-per-byte = (total cross-entropy in bits) / (number of bytes in the text), and models with wildly different vocabularies can be fairly compared on it. This is exactly why modern LLM comparisons across different tokenizers report bits-per-byte rather than perplexity, and it's the same 'perplexity depends on the units' caution from the information-theory and tokenization lessons - the tokenizer isn't a neutral choice, it changes the metric, so you must control for it to compare capability fairly."
          }
        },
        {
          "q": "Explain smoothing in n-gram models and connect it to the Bayesian idea of priors.",
          "a": "Smoothing solves the zero-probability problem: with naive maximum-likelihood counting, any n-gram never seen in training gets probability zero, which is catastrophic because it makes the entire sequence's probability zero (a product with a zero factor) and perplexity infinite - and unseen n-grams are ubiquitous due to sparsity. Smoothing redistributes probability mass so that unseen events get a small nonzero probability, 'stealing' a little from the seen events. The simplest is ADD-ALPHA (Laplace when alpha=1) smoothing: add a constant alpha to every count before normalizing, so P(w | context) = (count(context, w) + alpha) / (count(context) + alpha * V) - every n-gram, seen or not, gets at least alpha's worth of pseudo-count. More sophisticated methods (Kneser-Ney, Good-Turing, backoff, interpolation) redistribute mass more cleverly - e.g., backoff/interpolation fall back to lower-order n-grams (use the bigram estimate when the trigram is unseen) and Kneser-Ney accounts for how many distinct contexts a word appears in - but they all share the goal of giving unseen events reasonable nonzero probability. The connection to Bayesian priors is exact and illuminating: add-alpha smoothing IS maximum a posteriori (MAP) estimation under a Dirichlet prior on the n-gram distribution. The Dirichlet is the conjugate prior for the multinomial (categorical) next-word distribution, and adding alpha to every count is precisely the posterior update from a symmetric Dirichlet prior with concentration alpha - the alpha pseudo-counts are the prior 'evidence' that every word has some baseline probability before seeing data. So 'add-alpha smoothing' isn't an ad-hoc hack to avoid zeros; it's the principled Bayesian posterior estimate that combines a prior (every word is somewhat possible) with the observed counts, exactly the same conjugate-prior/pseudo-count idea as the Laplace smoothing in Naive Bayes and the Beta-Binomial update in the Bayesian lesson. The smoothing strength alpha is the prior strength: larger alpha means the uniform prior dominates (more smoothing, more bias toward uniform), smaller alpha trusts the counts more - the standard prior-vs-data balance.",
          "deepDive": {
            "q": "Why do the best classical smoothing methods (like Kneser-Ney) outperform simple add-alpha, and what insight do they capture?",
            "a": "The best classical smoothing methods outperform add-alpha because add-alpha smooths CRUDELY and uniformly - it adds the same pseudo-count to every unseen n-gram regardless of context, which is a poor model of how language actually distributes probability over unseen events. Kneser-Ney (the strongest classical method) captures a subtle, important insight about what makes a word likely in a NOVEL context: it's not the word's raw frequency but the DIVERSITY of contexts it appears in. The classic example: 'Francisco' is a fairly frequent word, but it appears almost exclusively after 'San' - so in a new, unseen context, 'Francisco' is actually UNLIKELY (it doesn't appear in diverse contexts), whereas a word like 'time' that appears after many different words is much more likely to appear in a novel context. Add-alpha (and even frequency-based backoff) would wrongly favor 'Francisco' because it's frequent; Kneser-Ney's key idea is to estimate a word's 'continuation probability' from the NUMBER OF DISTINCT CONTEXTS it follows, not its total count - so words that are versatile (appear after many things) get more probability mass in unseen contexts than words that are frequent-but-narrow. Kneser-Ney also uses ABSOLUTE DISCOUNTING (subtract a fixed discount from each count, redistributing the freed mass) which better matches empirical count statistics than adding a constant, and INTERPOLATION with lower-order models. The general insight these methods capture is that good smoothing requires modeling the STRUCTURE of how words distribute across contexts (versatility, discounting behavior) rather than naively adding uniform pseudo-counts - a more informed prior. This mattered enormously for classical NLP quality, and while neural models made explicit smoothing obsolete (they generalize via representations instead), the underlying lesson - that estimating probabilities of rare/unseen events well requires modeling context diversity, not just frequency - remains conceptually important, and it's a nice example of how a better prior (context-versatility-aware) beats a naive one (uniform pseudo-counts) for the same estimation problem."
          }
        },
        {
          "q": "How is the objective that modern LLMs optimize related to the classical n-gram language model, and what changed?",
          "a": "The OBJECTIVE is essentially identical; what changed is the model class that optimizes it. Both classical n-gram models and modern autoregressive LLMs (GPT-style) are trained to model the same thing: the probability of the next token given the preceding context, via the chain-rule factorization P(sequence) = product of P(w_t | context), and both are evaluated by how well they predict held-out text (cross-entropy / perplexity). A modern LLM is trained by minimizing the cross-entropy of its next-token predictions against the true next tokens - which is exactly maximizing the likelihood of the training text under the chain-rule factorization, the SAME objective an n-gram model estimates by counting. So a transformer LLM is, in the most literal sense, a very powerful next-token prediction model - the successor to the n-gram, optimizing the identical language-modeling objective. What CHANGED is the function class and how the conditional is estimated: (1) UNBOUNDED, LEARNED CONTEXT instead of a fixed Markov window - a transformer attends over the whole context (or a long window) rather than truncating to n-1 tokens, so it captures long-range dependencies n-grams can't. (2) GENERALIZATION via distributed representations instead of counting - it embeds tokens and context in continuous space and predicts as a smooth learned function, so it generalizes to unseen contexts by similarity rather than being limited to exact-match counts, dissolving the sparsity problem. (3) SHARED PARAMETERS instead of a per-n-gram count table - one set of weights predicts for all contexts, so learning transfers across contexts. (4) SCALE - trained on far more data with far more capacity. But the through-line is that the transformer optimizes the classical next-token cross-entropy objective; the revolution was in the MODEL (a deep, attention-based, representation-learning function) that estimates the conditional distribution far better than counting, not in the objective itself. This is why understanding n-grams and perplexity is foundational: they define the task (next-token modeling) and the metric (perplexity) that modern LLMs still target - the LLM is a dramatically better solution to the same problem the n-gram model posed.",
          "deepDive": {
            "q": "If the objective is the same, why did simply scaling this next-token objective lead to the emergent capabilities of large language models?",
            "a": "This is one of the deepest and most surprising findings in modern ML: optimizing the humble next-token-prediction objective at massive scale produces capabilities - reasoning, translation, coding, in-context learning - that go far beyond what 'predicting the next word' seems to promise, and understanding why connects back to what the objective actually requires. The key insight is that to predict the next token WELL across a huge, diverse corpus of human text, a model is implicitly forced to learn an enormous amount ABOUT THE WORLD and about language, because human text encodes reasoning, facts, logic, code, dialogue, and structure - so genuinely minimizing next-token cross-entropy on text that contains, say, worked math problems requires learning to do the math, and on text containing translations requires learning to translate. The objective is 'simple' but the DATA is rich enough that mastering prediction on it requires mastering the underlying competencies. Scale matters because (a) larger models have the capacity to represent these competencies, (b) more data exposes more of them, and (c) empirically, capabilities emerge in a somewhat threshold-like way as scale increases (the model gets good enough at prediction that latent skills become usable) - the scaling-laws finding that loss decreases predictably with scale, accompanied by qualitative capability jumps. Crucially, this is exactly why the n-gram-to-LLM story is about the MODEL not the objective: an n-gram model optimizing the same objective could never develop these capabilities because counting can't represent reasoning or generalize - it's the combination of the right objective (which forces learning the structure of the data) with a model class powerful enough to actually capture that structure (deep attention-based networks) at sufficient scale (huge data + parameters) that unlocked emergence. The objective was always pointing at 'understand the data well enough to predict it'; classical models just couldn't rise to it, and scaling a model class that can turned 'predict the next token' into 'learn to reason, translate, and code' - a profound demonstration that a simple training objective on rich data, given enough capacity, can induce far more than it superficially asks for."
          }
        },
        {
          "q": "You're evaluating a language model and it has excellent perplexity but users complain the outputs are bad. Reconcile this.",
          "a": "Low perplexity and bad user-perceived output can coexist because perplexity measures something related to, but distinct from, output quality - and several gaps explain the discrepancy. (1) Perplexity measures NEXT-TOKEN PREDICTION on a held-out EVALUATION SET, not generation quality: a model can be excellent at predicting the next token in existing text (which is what perplexity scores) while its GENERATED text is poor, because generation involves decoding (sampling choices, repetition, exposure bias / error compounding over many steps) that perplexity doesn't capture at all - perplexity is computed with teacher forcing (the true previous tokens given), whereas generation feeds the model its own possibly-erroneous outputs, so good next-token prediction doesn't guarantee good multi-step generation. (2) EVAL-SET MISMATCH: perplexity is only meaningful relative to a specific distribution, so a model with low perplexity on its eval set (say, web text) can produce bad outputs on the user's actual DISTRIBUTION (a different domain, or interactive prompts unlike the eval corpus) - low in-domain perplexity says nothing about out-of-domain quality. (3) Perplexity doesn't measure what users CARE ABOUT: users judge helpfulness, factuality, coherence, instruction-following, safety, and usefulness, none of which perplexity directly measures - a model can predict plausible-sounding next tokens (low perplexity) while being factually wrong, unhelpful, or misaligned with the user's intent. (4) Perplexity rewards matching the TRAINING/EVAL distribution, but users often want behavior DIFFERENT from raw web text (following instructions, being concise, refusing harmful requests) - which is exactly why models are fine-tuned/RLHF'd AFTER pretraining, a step that can INCREASE perplexity on raw text while dramatically improving user-perceived quality. So the reconciliation is that perplexity is a useful INTRINSIC proxy for pretraining progress and raw language-modeling ability, but it's not a measure of downstream usefulness - you must ALSO evaluate on the actual task with the metrics users care about (human eval, task benchmarks, factuality checks, instruction-following), exactly the intrinsic-vs-extrinsic evaluation distinction. The practical rule: use perplexity to track language-modeling capability during pretraining, but never conclude a model is 'good' for an application from perplexity alone - validate on the real objective.",
          "deepDive": {
            "q": "Given this gap, why is perplexity still universally reported and useful despite not measuring what users care about?",
            "a": "Perplexity remains valuable and universally reported despite the gap because it's an excellent PROGRESS and COMPARISON metric for the core language-modeling capability, with properties that user-facing evaluations lack. (1) It's CHEAP, AUTOMATIC, and REPRODUCIBLE - computed directly from held-out text with no human judgment, so you can track it continuously during pretraining (every checkpoint) and compare models objectively, whereas human evaluation of output quality is slow, expensive, noisy, and hard to reproduce. (2) It's a SENSITIVE, FINE-GRAINED signal - perplexity changes smoothly and measurably with model scale, data, and training, giving a continuous training signal and underlying the scaling laws that predict how loss improves with compute/data/parameters; downstream task metrics are often coarser and noisier. (3) It CORRELATES with downstream capability during PRETRAINING - within a model family, lower pretraining perplexity generally does predict better downstream performance, so it's a useful (if imperfect) leading indicator that the model is learning, which is why it's the primary metric for the pretraining phase. (4) It measures the RIGHT THING for what pretraining optimizes - since pretraining IS next-token prediction, perplexity directly measures that objective's success, making it the natural metric for that stage. So the honest framing is that perplexity is the right tool for the PRETRAINING/language-modeling question ('is the model getting better at predicting text?') - cheap, sensitive, comparable - and a poor tool for the DEPLOYMENT question ('is this model good for users?'), which needs task-specific and human evaluation. Both are used at their appropriate stages: perplexity to develop and compare base models, downstream/human evals to assess usefulness after alignment. It persists because no single metric does both jobs, and for its actual job - measuring language-modeling progress - perplexity is efficient and effective, exactly the intrinsic-metric role that must be complemented by, not replaced by, extrinsic evaluation."
          }
        },
        {
          "q": "Explain the relationship between language modeling and data compression.",
          "a": "Language modeling and lossless compression are two views of the same thing - a deep equivalence rooted in information theory. The connection: a good probability model of data is EXACTLY what you need to compress it well, because the fundamental result of information theory (Shannon) is that the optimal number of bits to encode a symbol with probability p is -log2(p), so the best achievable compression of a text is its cross-entropy under the true distribution (bits per symbol). A language model provides a probability for each token given its context - P(w_t | context) - and if you feed those probabilities to an arithmetic coder (an entropy coder that achieves near the information-theoretic bound), you can compress the text to approximately its cross-entropy under the model, in bits. So a BETTER language model (lower cross-entropy / lower perplexity) is LITERALLY a better compressor: the number of bits it takes to encode a text using the model equals the model's cross-entropy on that text times the number of tokens. This is why perplexity, cross-entropy, and bits-per-byte are all facets of the same quantity - bits-per-byte IS the compression rate the model achieves. The equivalence runs both ways: (1) training a language model to minimize cross-entropy is training it to compress text maximally, so language modeling IS learning to compress; (2) any good compressor implicitly contains a good predictive model of the data. This isn't a loose analogy - it's a mathematical identity (compression rate = cross-entropy under the model), which is why it's sometimes said that 'compression is prediction' and vice versa, and why some argue that a model that compresses text extremely well must 'understand' it (to predict/compress the next token, you must model the structure that generates it). Practically, this connection means: perplexity/cross-entropy measures compression ability, the best language models are the best text compressors, and the whole enterprise of language modeling can be framed as finding the model that assigns the shortest description (fewest bits) to the data - Occam's-razor / minimum-description-length made concrete.",
          "deepDive": {
            "q": "What does the 'compression = intelligence' argument claim, and what are its limits?",
            "a": "The 'compression = intelligence' argument (associated with the minimum-description-length principle, Solomonoff induction, and popularized around LLMs and the Hutter Prize) claims that the ability to COMPRESS data well is equivalent to, or at least a strong proxy for, understanding/intelligence - because to compress data maximally you must model the regularities and structure that generate it, and modeling that structure IS a form of understanding. The chain of reasoning: optimal compression requires optimal prediction (established above); optimal prediction of complex data (like human text, which encodes reasoning, facts, and logic) requires capturing the underlying generative structure (the 'laws' producing the data); capturing that structure is what we mean by understanding/intelligence. So a system that compresses text near the theoretical limit must have internalized the regularities of language and the world it describes - hence 'compression is (or measures) intelligence', and improving compression (lowering cross-entropy) is progress toward understanding. This is a genuinely deep idea with real support: it explains why scaling next-token prediction (= improving compression) yields emergent capabilities, and MDL/Occam's-razor formalizes 'the best model is the one that most compresses the data'. The LIMITS: (1) It conflates predictive modeling of a data distribution with agency, goals, grounding, and reasoning-as-action - a great text compressor models the DISTRIBUTION of text, which includes human reasoning as expressed in text, but this isn't obviously the same as being able to reason reliably, act in the world, or have understanding grounded in anything beyond text statistics. (2) Perfect compression of a corpus is about that corpus's regularities, not truth or usefulness - a model can compress text well while being unable to distinguish true from false statements that are equally 'predictable'. (3) Some capabilities we associate with intelligence (planning, tool use, grounded perception) aren't obviously captured by text compression alone. (4) The equivalence is asymptotic/idealized; real compressors approximate it. So the honest position is that compression ability is a rigorous, meaningful measure of how well a model captures the STRUCTURE of its data - which is a large and important component of what we call understanding, and empirically predicts capability - but equating it fully with 'intelligence' overreaches by ignoring grounding, agency, and truth-tracking. It's the strongest available formalization of 'a better model of the data = a better understanding of it', valuable and largely-right for the modeling component of intelligence, while not the whole story - a fitting capstone to the information-theoretic view of language modeling this lesson builds."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Language model",
        "back": "A probability distribution over token sequences, equivalently P(next token | context). Scores how likely text is; predicts what comes next."
      },
      {
        "type": "definition",
        "front": "N-gram model + Markov assumption",
        "back": "Estimate P(w_t | previous n-1 words) by counting n-gram frequencies. Markov assumption: next token depends only on the last n-1 tokens, not full history."
      },
      {
        "type": "formula",
        "front": "Perplexity",
        "back": "exp(per-token cross-entropy) = effective branching factor (how many equally-likely options per step). 1 = perfect, V = uniform over V tokens. Lower is better."
      },
      {
        "type": "pitfall",
        "front": "Zero-probability problem",
        "back": "An unseen n-gram gets probability 0, zeroing the whole sequence (perplexity infinite). Fix with smoothing (add-alpha, Kneser-Ney, backoff) - mandatory."
      },
      {
        "type": "definition",
        "front": "Add-alpha smoothing = Bayesian prior",
        "back": "Add alpha to every count = MAP estimate under a Dirichlet prior (pseudo-counts). alpha is the prior strength - the same idea as Naive Bayes' Laplace smoothing."
      },
      {
        "type": "intuition",
        "front": "Context-vs-sparsity trade-off",
        "back": "Larger n = more context but exponentially more possible n-grams -> most unseen. N-grams can only COUNT seen contexts, never GENERALIZE - the gap neural LMs close."
      },
      {
        "type": "pitfall",
        "front": "Perplexity isn't cross-tokenizer comparable",
        "back": "It's per-token, so a coarser tokenizer inflates it for the same capability. Compare with bits-per-byte/character (tokenizer-independent)."
      },
      {
        "type": "pitfall",
        "front": "Low perplexity != good outputs",
        "back": "It measures teacher-forced next-token prediction on an eval set - not generation quality, factuality, or usefulness. Complement with extrinsic/human eval."
      }
    ],
    "refs": [
      {
        "title": "Jurafsky & Martin, Speech and Language Processing (Ch. 3, N-gram LMs)",
        "url": "https://web.stanford.edu/~jurafsky/slp3/3.pdf"
      },
      {
        "title": "Chen & Goodman, An Empirical Study of Smoothing Techniques (1999)",
        "url": "https://aclanthology.org/P96-1041/"
      },
      {
        "title": "Bengio et al., A Neural Probabilistic Language Model (2003)",
        "url": "https://www.jmlr.org/papers/v3/bengio03a.html"
      },
      {
        "title": "Kaplan et al., Scaling Laws for Neural Language Models (2020)",
        "url": "https://arxiv.org/abs/2001.08361"
      }
    ],
    "demos": [
      "markov",
      "decoding"
    ]
  },
  "dependency-parsing": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Sentences aren't flat sequences of words - they have structure, a hierarchy of which words modify or depend on which others. Dependency parsing recovers that structure as a tree: every word (except the root) points to its 'head' - the word it grammatically depends on - labeled with the relationship (subject, object, modifier, etc.). 'The cat chased the mouse' becomes a tree where 'chased' is the root, 'cat' is its subject, 'mouse' is its object, and each 'the' depends on the noun it determines. This explicit structure is what lets you answer 'who did what to whom' - the grammatical backbone of meaning.",
        "Why care, in the transformer era? Dependency structure is exactly the kind of relational information that matters for understanding, and it's a clean example of STRUCTURED PREDICTION - predicting an interdependent output (a valid tree) rather than independent labels. There are two classic algorithmic paradigms, and they illustrate a general tension in structured prediction: transition-based parsing builds the tree incrementally with a sequence of local actions (fast, greedy, linear-time), while graph-based parsing scores all possible dependency edges and finds the highest-scoring valid tree globally (slower but globally optimal). This local-greedy-vs-global-optimal contrast recurs throughout ML.",
        "Dependency parsing also teaches the shift from hand-engineered pipelines to learned representations. Classical parsers used carefully designed features; neural parsers replaced them with learned embeddings and (later) contextual representations, and modern systems often get dependency structure implicitly - a transformer's attention heads have been shown to partially encode syntactic dependencies without ever being trained to parse. Understanding explicit parsing clarifies what that implicit structure IS, and dependency parsing remains useful for interpretable NLP, relation extraction, and low-resource settings where explicit structure helps."
      ],
      "math": [
        {
          "h": "The dependency tree and its constraints",
          "paras": [
            "A dependency parse is a directed tree over the words: every word has exactly one head (parent), there's a single root, no cycles, and (for projective parses) no crossing edges. Each edge carries a label (the grammatical relation). The parsing problem is to find the valid tree that best explains the sentence."
          ],
          "tex": "\\text{tree } T: \\; \\text{each word } w_i \\to \\text{head}(w_i), \\quad \\text{one root, no cycles, } |edges| = n-1, \\quad \\hat{T} = \\arg\\max_T \\text{score}(T)",
          "texNote": "A valid dependency tree has n-1 edges (each non-root word has one head), one root, and no cycles. Projective trees additionally forbid crossing edges - most sentences are projective."
        },
        {
          "h": "Transition-based parsing: a sequence of local actions",
          "paras": [
            "Transition-based (arc-standard) parsing maintains a stack and a buffer, and builds the tree with a sequence of actions - SHIFT (move a word from buffer to stack), LEFT-ARC / RIGHT-ARC (create a dependency between the top stack items). A classifier predicts each action from the current configuration; the actions incrementally construct the tree."
          ],
          "tex": "\\text{config} = (\\text{stack}, \\text{buffer}, \\text{arcs}), \\quad a_t = \\arg\\max_a \\text{score}(a \\mid \\text{config}_t), \\quad a \\in \\{\\text{SHIFT}, \\text{LEFT-ARC}, \\text{RIGHT-ARC}\\}",
          "texNote": "Each action is a local classification given the current parser state; 2n-1 actions build a full tree in linear time. Greedy (fast) but a wrong early action can't be undone."
        }
      ],
      "code": [
        {
          "h": "Arc-standard transition parsing (the action loop)",
          "paras": [
            "The core of a transition-based parser: a stack, a buffer, and a loop that applies actions until the sentence is fully parsed. A classifier (features or neural) chooses each action."
          ],
          "code": "def parse(words, predict_action):\n    stack = ['ROOT']\n    buffer = list(words)\n    arcs = []                                        # (head, dependent) pairs\n    while buffer or len(stack) > 1:\n        action = predict_action(stack, buffer, arcs) # a classifier picks the action\n        if action == 'SHIFT' and buffer:\n            stack.append(buffer.pop(0))\n        elif action == 'LEFT-ARC' and len(stack) >= 2:\n            arcs.append((stack[-1], stack[-2]))       # top is head of second\n            stack.pop(-2)\n        elif action == 'RIGHT-ARC' and len(stack) >= 2:\n            arcs.append((stack[-2], stack[-1]))       # second is head of top\n            stack.pop()\n        else:\n            if buffer: stack.append(buffer.pop(0))\n    return arcs\n\n# each action is a local classification; 2n-1 actions -> a full tree in O(n) time\nprint('transition parsing: greedy local actions build the tree left to right, linear time')",
          "caption": "A stack + buffer + a sequence of SHIFT/LEFT-ARC/RIGHT-ARC actions builds the tree incrementally in linear time - fast and greedy, but early mistakes propagate."
        },
        {
          "h": "Graph-based: score all edges, find the best tree",
          "paras": [
            "Graph-based parsing scores every possible head-dependent edge, then finds the maximum-scoring valid tree (a maximum spanning tree) - globally optimal, unlike greedy transition parsing."
          ],
          "code": "import numpy as np\n\ndef score_edges(words, model):\n    n = len(words)\n    # model gives a score for each possible (head, dependent) edge\n    S = np.array([[model.edge_score(h, d) for d in range(n)] for h in range(n)])\n    return S\n\n# then find the maximum spanning tree over the scored edges (Chu-Liu/Edmonds algorithm),\n# subject to the tree constraints (one head each, one root, no cycles).\n# GLOBALLY optimal given the edge scores - no greedy early-commitment problem,\n# at O(n^2) or O(n^3) cost vs transition parsing's O(n)\nprint('graph-based: score all n^2 edges, extract the best valid tree globally')",
          "caption": "Graph-based parsing scores all possible edges and extracts the maximum-scoring valid tree (a maximum spanning tree) - globally optimal, at higher cost than greedy transition parsing."
        }
      ],
      "useCases": [
        "Relation and information extraction - the dependency path between two entities is a strong feature for detecting their relationship (who works for whom, what causes what), used in knowledge-base construction.",
        "Grammatical analysis and interpretable NLP - explicit syntactic structure supports grammar checking, linguistic analysis, and applications where you need to justify 'who did what to whom'.",
        "Low-resource and structured tasks - explicit syntactic structure can help when data is limited or when downstream tasks (semantic role labeling, some question answering) benefit from grammatical scaffolding.",
        "A canonical STRUCTURED PREDICTION problem - the transition-based vs graph-based contrast (local-greedy vs global-optimal) is a transferable lesson for any task predicting interdependent structured outputs."
      ],
      "pitfalls": [
        "Transition-based parsing is greedy: a wrong early action can't be undone and propagates errors down the rest of the parse - the classic error-propagation problem of greedy structured prediction (mitigated by beam search or dynamic oracles).",
        "The output must be a VALID tree (one head per word, one root, no cycles), so you can't just predict edges independently - the structural constraints are what make this structured prediction, not independent classification.",
        "Projectivity: standard transition parsers only produce projective trees (no crossing edges), but some languages/constructions are non-projective - handling them needs special transitions or graph-based methods.",
        "Evaluation nuance: attachment scores (UAS - unlabeled, LAS - labeled) measure the fraction of words with the correct head (and label), but a single high-level attachment error can be more damaging to meaning than several low-level ones, so the aggregate score can understate structural mistakes.",
        "In the transformer era, explicit parsing is often unnecessary - large models capture much syntactic structure implicitly - so building an explicit parser is worthwhile mainly for interpretability, relation extraction, low-resource settings, or when explicit structure is genuinely needed downstream."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/lstm-gru",
          "text": "Neural dependency parsers use (bi)LSTM representations of the words to score actions or edges - the sequence encoder from the previous lessons feeds the parser."
        },
        {
          "ref": "rnn-nlp/sequence-labeling",
          "text": "Both are structured prediction over sentences; sequence labeling predicts a label per word (with a CRF for label dependencies), parsing predicts a tree - related structured-output problems."
        },
        {
          "ref": "foundations/complexity",
          "text": "The transition (O(n), greedy) vs graph-based (O(n^2)-O(n^3), globally optimal) contrast is a concrete complexity-vs-optimality trade-off."
        },
        {
          "text": "Module 08's transformers capture syntactic dependencies implicitly in attention heads - explicit parsing clarifies what that emergent structure represents."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is dependency parsing?",
          "a": "Recovering a sentence's grammatical structure as a tree where each word points to its head (the word it depends on), labeled with the relation (subject, object, modifier...)."
        },
        {
          "q": "What are the constraints on a valid dependency tree?",
          "a": "Each word has exactly one head, there's a single root, no cycles, and n-1 edges; projective trees additionally have no crossing edges."
        },
        {
          "q": "What is transition-based parsing?",
          "a": "Build the tree incrementally with a sequence of local actions (SHIFT, LEFT-ARC, RIGHT-ARC) over a stack and buffer - a classifier picks each action. Fast, greedy, linear-time."
        },
        {
          "q": "What is graph-based parsing?",
          "a": "Score every possible head-dependent edge and extract the maximum-scoring valid tree (a maximum spanning tree) - globally optimal, at higher cost than greedy transition parsing."
        },
        {
          "q": "Transition vs graph-based - the core trade-off?",
          "a": "Transition is local/greedy/fast (O(n)) but early errors propagate; graph-based is global/optimal but slower (O(n^2)-O(n^3)). Local-greedy vs global-optimal."
        },
        {
          "q": "What is the error-propagation problem in transition parsing?",
          "a": "Greedy actions can't be undone, so a wrong early action corrupts the rest of the parse - mitigated with beam search or dynamic oracles."
        },
        {
          "q": "What is projectivity?",
          "a": "A tree is projective if it has no crossing edges (dependencies don't cross when words are in linear order). Standard transition parsers only produce projective trees."
        },
        {
          "q": "What are UAS and LAS?",
          "a": "Unlabeled Attachment Score (fraction of words with the correct head) and Labeled Attachment Score (correct head AND relation label) - the standard parsing metrics."
        },
        {
          "q": "Why is dependency parsing 'structured prediction'?",
          "a": "The output must be a valid interdependent structure (a tree), so you can't predict edges independently - the structural constraints couple the predictions."
        },
        {
          "q": "Is explicit parsing still needed with transformers?",
          "a": "Often not - large models capture syntax implicitly - but explicit parsing helps for interpretability, relation extraction, low-resource settings, or when downstream tasks need explicit structure."
        }
      ],
      "standard": [
        {
          "q": "Explain transition-based dependency parsing in detail, including its key trade-off.",
          "a": "Transition-based (arc-standard) parsing builds the dependency tree incrementally by applying a sequence of local actions to a parser configuration. The configuration has three parts: a STACK (words being processed, initialized with a ROOT symbol), a BUFFER (the remaining input words, in order), and a set of ARCS built so far. At each step, a classifier examines the current configuration (typically the top stack items, the front buffer items, and their existing dependents) and predicts one of a small set of ACTIONS: SHIFT (move the front buffer word onto the stack), LEFT-ARC (create a dependency where the top stack word is the head of the second-from-top word, then remove the dependent), or RIGHT-ARC (the second-from-top is the head of the top, remove the dependent) - with labeled variants for each relation type. Applying about 2n-1 actions (for n words) constructs a complete tree, and because each action is a single classification and there are a linear number of them, parsing runs in LINEAR TIME O(n) - very fast. The key trade-off is SPEED VS GREEDINESS/OPTIMALITY: transition parsing is fast and processes the sentence left-to-right (even suited to incremental/streaming parsing), but it's GREEDY - it commits to each action based on local information without lookahead, and a wrong action early cannot be undone, so errors PROPAGATE (a mistaken attachment corrupts all subsequent decisions that depend on the corrupted configuration). This local-commitment problem is the price of the linear-time greedy approach, and it's exactly the same greedy-structured-prediction issue as elsewhere. Mitigations include BEAM SEARCH (keep several candidate action sequences rather than committing greedily, recovering some global consideration at higher cost) and DYNAMIC ORACLES (a training technique that teaches the parser to recover gracefully from earlier mistakes rather than assuming a perfect history).",
          "deepDive": {
            "q": "How did neural networks change transition-based parsing, and what did Chen & Manning's 2014 parser demonstrate?",
            "a": "Chen & Manning's 2014 neural dependency parser was a landmark that demonstrated the shift from hand-engineered features to learned representations in a clean, high-impact way. Classical transition-based parsers chose actions using a classifier over MILLIONS of sparse, hand-designed features - specific combinations of words, part-of-speech tags, and existing arcs at particular stack/buffer positions (e.g., 'the word on top of the stack is X AND the front of the buffer is Y AND its leftmost child is Z'). These feature templates were painstakingly engineered, produced enormous sparse feature vectors, were slow to compute, and generalized poorly (each exact feature combination had to be seen in training). Chen & Manning replaced this with a small NEURAL network: they embedded the relevant words, POS tags, and arc labels from the configuration into dense vectors, concatenated them, and fed them through a hidden layer to predict the action. This was transformative for several reasons: (1) the dense embeddings GENERALIZED - similar words/tags/configurations got similar representations, so the parser could handle configurations it hadn't seen exactly (fixing the sparse-feature generalization problem); (2) it was FASTER at inference because it computed a small dense network instead of extracting millions of sparse features; (3) it achieved higher accuracy with a far simpler, cleaner model. It was one of the early demonstrations that learned dense representations beat hand-engineered sparse features on a structured NLP task, presaging the broader deep-learning takeover of NLP - the same 'learned representations generalize where hand-engineered features can't' lesson as word embeddings, applied to structured prediction. Later work added (bi)LSTM and then transformer encoders to provide even richer contextual representations of each word for scoring actions/edges, but Chen & Manning's parser was the pivotal proof-of-concept that neural representations belonged in parsing."
          }
        },
        {
          "q": "Compare transition-based and graph-based parsing across the algorithmic and accuracy dimensions.",
          "a": "They're the two dominant paradigms and differ fundamentally in how they search for the tree. TRANSITION-BASED parsing builds the tree incrementally through a sequence of local actions (a classifier picks each action given the current configuration), making decisions greedily left-to-right. Its properties: LINEAR TIME O(n) (a fixed number of local classifications), fast, memory-efficient, naturally incremental, and it can use RICH FEATURES of the partially-built structure (the actions it's already taken, the partial tree) since it has access to the full configuration history. Its weakness is GREEDINESS - local decisions without global guarantees, so early errors propagate and it can be locally-optimal-but-globally-wrong (mitigated by beam search). GRAPH-BASED parsing instead scores every possible dependency edge (head-dependent pair) and then finds the highest-scoring VALID tree globally, typically via a maximum-spanning-tree algorithm (Chu-Liu/Edmonds for non-projective, Eisner's algorithm for projective). Its properties: GLOBALLY OPTIMAL given the edge scores (no greedy early-commitment problem - it considers all trees), which tends to give better accuracy on long-range dependencies and long sentences where greedy errors accumulate; but it's SLOWER (O(n^2) to O(n^3)) because it scores all edges and runs a tree-extraction algorithm, and its edge scores are more LOCAL - to keep the optimization tractable, edges are usually scored somewhat independently (first-order: each edge scored alone; higher-order models score edge combinations but at greater cost), so it can't as easily use rich features of the whole partial structure the way transition parsing can. So the trade-off is: transition-based = fast, incremental, rich structural features, but greedy/local; graph-based = globally optimal tree search, better on long-range structure, but slower and with more-local edge scoring. Historically both achieved similar top accuracy with different error profiles (transition parsers err more on long-range/late decisions, graph parsers on decisions needing rich structural context), and the best systems sometimes combined them; with strong neural (transformer) encoders, both paradigms reach high accuracy, and the choice depends on speed needs (transition for fast/incremental) vs the desire for global optimality (graph-based).",
          "deepDive": {
            "q": "This local-greedy vs global-optimal trade-off appears all over ML - name other instances and the common principle.",
            "a": "The transition-based (greedy, local, fast) vs graph-based (global, optimal, slower) contrast is a specific instance of a pervasive ML/CS trade-off between greedy local search and global optimization, and recognizing the pattern is valuable. Other instances: (1) DECISION TREES - greedy top-down splitting (choose the locally-best split at each node, never reconsidered - fast but not globally optimal, the same 'a wrong early split can't be undone' as transition parsing) versus the NP-hard globally-optimal tree; the greedy heuristic is universal precisely because global is intractable, exactly as most parsing is greedy/beam for speed. (2) DECODING in sequence generation - greedy decoding (pick the best token each step, fast, can be locally-optimal-globally-suboptimal) versus beam search (keep multiple hypotheses, closer to finding the globally-best sequence) - the identical local-vs-global search trade-off, and beam search is the SAME mitigation used in both parsing and generation. (3) k-MEANS - Lloyd's algorithm greedily alternates local optimal steps to a LOCAL optimum, versus the NP-hard global optimum, mitigated by restarts (like beam search's multiple hypotheses). (4) Reinforcement learning - greedy action selection vs planning/search (MCTS) that looks ahead globally. The COMMON PRINCIPLE: finding the globally-optimal structured output is often expensive or intractable, so we use greedy local search for speed and accept sub-optimality, OR pay more compute for global optimization (exact algorithms, spanning trees, dynamic programming) when the structure permits it and the accuracy gain justifies the cost - and BEAM SEARCH is the recurring middle-ground that trades a controllable amount of compute for a controllable improvement over pure greedy. The transferable insight is to recognize when you're in a structured-prediction/search setting and to reason explicitly about where you sit on the greedy-fast-local to optimal-slow-global spectrum, choosing based on whether the problem's structure makes global optimization affordable and whether the accuracy gain is worth it - the same reasoning whether you're parsing, decoding, clustering, or planning."
          }
        },
        {
          "q": "Why is dependency parsing a 'structured prediction' problem, and how does that differ from ordinary classification?",
          "a": "Dependency parsing is structured prediction because the output is not a single label or a set of INDEPENDENT labels, but an interdependent STRUCTURE - a valid tree - where the parts constrain each other and must be predicted jointly. In ordinary (multi-class) classification, you predict ONE label from a fixed set for each independent input, and each prediction is separate; even in multi-label classification, the labels are typically predicted independently. In parsing, the output is a whole tree over the sentence subject to hard STRUCTURAL CONSTRAINTS: every word must have exactly one head, there must be exactly one root, there can be no cycles, and (for projective trees) no crossing edges. These constraints COUPLE the predictions - you cannot choose each word's head independently, because independently-chosen heads could easily form an invalid structure (a cycle, multiple roots, or a word with two heads). So the prediction problem is to find the best VALID structure as a whole, not to make independent per-word decisions. This difference has concrete consequences: (1) the search/inference is over the space of valid trees (exponentially many), requiring specialized algorithms (transition sequences, maximum spanning trees, dynamic programming) rather than a simple argmax per item; (2) the training must account for the interdependence (structured loss functions, or teaching the model to produce valid structures); (3) evaluation is over the structure (attachment scores) rather than independent accuracy. Structured prediction is a whole subfield (encompassing parsing, sequence labeling with CRFs, machine translation, image segmentation) unified by this property: the output has internal structure and constraints that make the pieces interdependent, so you predict the joint structure rather than independent parts. Dependency parsing is a canonical, clean example - a tree with clear constraints - which is why it's a standard vehicle for teaching structured prediction and the transition-vs-graph algorithmic approaches to it.",
          "deepDive": {
            "q": "How does sequence labeling with a CRF handle output interdependence, and how does it compare to parsing's tree constraints?",
            "a": "Sequence labeling (like named-entity recognition or POS tagging) is another structured-prediction problem, and comparing how a CRF handles its interdependence to how parsing handles tree constraints illuminates the structured-prediction landscape. In sequence labeling you assign a label to each word, but the labels are INTERDEPENDENT - e.g., in BIO tagging for NER, an 'Inside-Person' tag can only follow a 'Begin-Person' or another 'Inside-Person' tag (an I-PER after an O or a B-LOC is invalid), so the labels aren't independent. A naive per-word classifier ignores this and can produce invalid label sequences (an I-PER with no preceding B-PER). A Conditional Random Field (CRF) handles the interdependence by modeling the labels JOINTLY: it scores an entire label sequence using both per-word 'emission' scores (how well each label fits its word) AND 'transition' scores (how compatible adjacent labels are), and finds the highest-scoring VALID sequence globally via the Viterbi algorithm (dynamic programming). This lets it enforce label-transition constraints and capture dependencies between adjacent labels, exactly as parsing must enforce tree constraints. The comparison: both are structured prediction with output interdependence, but the STRUCTURE differs - sequence labeling's structure is a LINEAR CHAIN (each label depends mainly on its neighbors, so the interdependence is local/sequential and Viterbi solves it exactly in linear time), while parsing's structure is a TREE (the constraints are global - one root, no cycles, one head each - requiring tree-specific algorithms like spanning trees or transition sequences). So the CRF's chain structure is a SIMPLER form of structured prediction than parsing's tree structure: the chain's local dependencies admit exact, efficient dynamic-programming inference (Viterbi), whereas the tree's global constraints need more elaborate algorithms. Both illustrate the core structured-prediction move - model the output jointly and search over VALID structures - but the tractability and algorithms depend on the structure's shape (chain vs tree), which is exactly why the next lesson (sequence labeling with BiLSTM-CRF) is a natural companion to parsing: they're two points on the structured-prediction spectrum, sharing the principle of coupling predictions but differing in the structure and thus the inference algorithm."
          }
        },
        {
          "q": "In the transformer era, do transformers make explicit dependency parsing obsolete? Discuss both sides.",
          "a": "This is a genuine debate with merit on both sides. The case that transformers make explicit parsing OBSOLETE: (1) Large pretrained transformers capture a great deal of syntactic structure IMPLICITLY - probing studies have shown that BERT's and similar models' internal representations and attention patterns encode dependency relations, part-of-speech, and hierarchical structure without ever being trained to parse, and you can even RECOVER dependency trees from a transformer's representations with a simple probe. (2) On downstream tasks that used to benefit from explicit parse features (sentiment, question answering, relation extraction), end-to-end transformers typically match or beat pipelines that use explicit parses, because the model learns whatever structural information the task needs directly, without an error-prone explicit parsing step in the pipeline. (3) Explicit parsing adds pipeline complexity and a source of error propagation (parse errors hurt downstream) that end-to-end learning avoids. So for many applications, you no longer need to run a parser - the transformer implicitly does the relevant structural reasoning. The case that explicit parsing STILL MATTERS: (1) INTERPRETABILITY - an explicit dependency tree is a human-readable, auditable representation of grammatical structure, valuable when you need to explain or verify 'who did what to whom' (legal, linguistic, or high-stakes analysis), whereas the transformer's implicit structure is entangled and not directly inspectable. (2) RELATION/INFORMATION EXTRACTION - the explicit dependency path between entities remains a strong, interpretable feature and is still used in knowledge-base construction and some IE systems. (3) LOW-RESOURCE settings - explicit syntactic structure (or cross-lingual transfer of it) can help when labeled data is scarce and the transformer can't learn everything implicitly. (4) LINGUISTIC RESEARCH and applications where the structure IS the goal (grammar analysis, treebanking, language documentation). (5) The implicit structure transformers learn is PARTIAL and not guaranteed correct - it's a byproduct, not a reliable parse. So the honest synthesis: transformers have made explicit parsing UNNECESSARY for most mainstream downstream NLP tasks (where end-to-end learning wins), so it's no longer a routine pipeline step, but it remains valuable for interpretability, explicit relation extraction, low-resource scenarios, and applications where the grammatical structure itself is the deliverable - a shift from 'parsing as a necessary preprocessing step' to 'parsing as a specialized tool for when explicit structure is genuinely needed'.",
          "deepDive": {
            "q": "What do 'probing' studies reveal about how transformers encode syntax, and what's the limitation of concluding they 'understand' grammar?",
            "a": "Probing studies investigate whether a model's internal representations ENCODE a property (like syntactic dependencies) by training a simple classifier (a 'probe') to predict that property from the frozen representations - if a simple probe succeeds, the information is decodably present. For transformers, probing has shown that syntactic structure IS substantially encoded: probes can recover part-of-speech, dependency relations, and even reconstruct dependency-tree-like structure from BERT's layer representations (the Hewitt-Manning 'structural probe' famously found that a linear transformation of BERT's embeddings reflects dependency-tree distances), and specific attention heads correlate with specific dependency relations. This is real evidence that pretraining on next-token/masked-token prediction induces syntactic structure as a byproduct. BUT there are important LIMITATIONS to concluding the model 'understands' grammar: (1) DECODABILITY != USE - a probe showing the information is PRESENT in the representations doesn't prove the model USES it for its predictions, or uses it the way a grammar would; the information might be incidental. This is exactly the probing-selectivity caution (the control-task / Hewitt-Liang point from the interpretability lessons): a probe can decode structure that the model isn't actually relying on, and even decode RANDOM labels to some degree, so 'a probe can recover it' overstates the case unless you control for probe capacity and show selectivity. (2) CORRELATIONAL not CAUSAL - probing is correlational; it shows the representation correlates with syntax, not that manipulating the syntax representation changes behavior in the expected way (causal interventions like activation patching are needed for that, per the mech-interp lessons). (3) PARTIAL and APPROXIMATE - the recovered structure is imperfect and entangled, not a clean, reliable parse. (4) 'Encodes syntactic information' is weaker than 'understands grammar' - the model has learned statistical regularities that correlate with grammatical structure because grammatical text is what it was trained to predict, which is genuine but shouldn't be overclaimed as human-like grammatical understanding. So probing gives real, valuable evidence that transformers induce syntactic structure implicitly (supporting the 'explicit parsing often unnecessary' view), but the honest interpretation is measured: the information is present and partly used, the model has learned much about syntax as a byproduct of language modeling, but 'the representation encodes dependency structure' is a decodability claim that needs the selectivity and causal caveats before it becomes 'the model understands and uses grammar', exactly the plausible-vs-faithful and correlational-vs-causal discipline the interpretability lessons make rigorous."
          }
        },
        {
          "q": "You need to extract relationships between entities in text (e.g., 'X acquired Y', 'A works for B'). How could dependency parsing help, and what are the alternatives?",
          "a": "Dependency parsing is a classic, interpretable tool for relation extraction because the grammatical structure directly encodes 'who did what to whom'. How it helps: the DEPENDENCY PATH between two entities in the parse tree is a strong, compact signal of their relationship. For 'Google acquired YouTube', the parse has 'acquired' as the root with 'Google' as its subject and 'YouTube' as its object, so the dependency path Google <-subject- acquired -object-> YouTube directly captures the acquisition relation and its direction (who acquired whom). Concretely, you'd: (1) identify the entity mentions (via named-entity recognition), (2) parse the sentence, (3) extract the shortest dependency path between each entity pair, and (4) use that path (the sequence of relations and the connecting words, especially the verb) as a feature to classify the relationship - a short path through a relation-indicating verb is highly informative, and the path's direction disambiguates which entity plays which role. This is interpretable (you can point to the grammatical path justifying the extraction), works with limited data (the syntactic feature is strong), and handles the direction/role of the relation naturally. The ALTERNATIVES: (1) End-to-end NEURAL relation extraction - a transformer that takes the sentence with marked entities and directly classifies the relation, learning whatever structural cues it needs implicitly; this typically achieves higher accuracy with enough training data and avoids parse-error propagation, and is the mainstream modern approach. (2) LLM-based extraction - prompt a large language model to extract the relations directly (or with structured output/constrained decoding for a clean schema), which is flexible, needs little task-specific data, and handles complex phrasing, at the cost of reliability/verifiability. (3) Pattern/rule-based extraction - hand-written patterns over words or parses for high-precision extraction in narrow domains. The trade-offs: dependency-parse-based extraction is interpretable, data-efficient, and good in low-resource or high-precision settings, but depends on parse accuracy and struggles with relations expressed non-syntactically or across sentences; end-to-end neural/LLM approaches are more accurate and flexible with enough data/scale but less interpretable and can be less reliable. In practice, modern systems lean toward neural/LLM extraction for accuracy, while dependency paths remain valuable for interpretability, low-resource domains, distant supervision, and as features that can complement neural models - a good example of when explicit structure (parsing) is still a useful tool even though end-to-end learning often wins on raw accuracy.",
          "deepDive": {
            "q": "What is the shortest-dependency-path hypothesis, and why is it a strong feature for relation extraction?",
            "a": "The shortest-dependency-path (SDP) hypothesis is the empirical observation - and modeling principle - that the SHORTEST PATH between two entities in the dependency parse tree captures almost all the information needed to determine their relationship, while excluding irrelevant words. The intuition: a sentence may be long and contain many words, but the grammatically-relevant connection between two entities is a compact path through the tree (usually passing through the verb or predicate that relates them), and the words OFF this path (modifiers, other clauses, adjuncts) are mostly irrelevant to THAT relation. So for 'Google, the search giant, recently acquired YouTube for $1.65 billion', the shortest dependency path Google -> acquired -> YouTube strips away 'the search giant', 'recently', and 'for $1.65 billion' - all irrelevant to WHETHER an acquisition relation holds - leaving just the acquisition-indicating verb and the two entities in their subject/object roles. This makes the SDP a powerful feature because: (1) it's a strong DENOISER - it focuses the model on exactly the grammatically-connected words that determine the relation, discarding distracting content, which improves both accuracy and data efficiency (the model learns from a clean signal); (2) it captures the DIRECTION and ROLES (subject vs object) that disambiguate who-did-what-to-whom; (3) it's relatively INVARIANT to surface variation - many different phrasings of the same relation share a similar shortest dependency path, so the feature generalizes across paraphrases better than surface word patterns; (4) it's SHORT and structured, so it's easy to model (early systems used the path as a feature, later ones ran an LSTM/CNN along the SDP). The SDP hypothesis was a productive idea in relation extraction precisely because it operationalizes the insight that grammatical structure isolates the relevant relational information - a clean example of using explicit syntactic structure (from parsing) to extract a focused, generalizable, interpretable feature, which is exactly the enduring value of dependency parsing even in the neural era: it provides a principled way to find the grammatically-relevant substructure connecting entities, whether used as an explicit feature or as an interpretable check on a neural extractor."
          }
        },
        {
          "q": "How is a dependency parser evaluated, and what do the standard metrics miss?",
          "a": "The standard metrics are attachment scores. UNLABELED ATTACHMENT SCORE (UAS) is the fraction of words assigned the correct HEAD (correct parent in the tree), ignoring the relation label. LABELED ATTACHMENT SCORE (LAS) is the fraction of words with BOTH the correct head AND the correct relation label - the stricter, more complete metric, and the one usually reported as the headline number. Both are computed per-word and averaged, and they're intuitive: 'what fraction of words did the parser attach correctly?'. What the metrics MISS: (1) NOT ALL ERRORS ARE EQUAL - attachment scores treat every word's attachment as equally important, but a single HIGH-LEVEL structural error (misattaching the main verb, or attaching a clause to the wrong head) can distort the meaning of the whole sentence far more than several low-level errors (misattaching a determiner or a low modifier), yet they count the same. So a parser with a slightly higher LAS could actually make more MEANING-DAMAGING errors than one with lower LAS, because the aggregate score is blind to which attachments matter for interpretation. (2) PER-WORD, not PER-SENTENCE - a metric averaged over words can look high even if few sentences are FULLY correct (one error per sentence still gives high per-word accuracy but zero fully-correct sentences), and for downstream uses that need a correct whole structure, sentence-level exact-match matters. (3) DISTRIBUTION over error types - the score doesn't tell you WHAT the parser gets wrong (long-range attachments? coordination? specific relations?), which is what you need to improve it or judge fitness for a downstream task; error analysis by relation type, dependency length, and sentence length reveals this. (4) DOWNSTREAM IMPACT - ultimately what matters is whether parse errors hurt the downstream task, and attachment score is an intrinsic metric that may not track downstream utility (the same intrinsic-vs-extrinsic gap as perplexity). So while UAS/LAS are the standard, useful, comparable intrinsic metrics, they're aggregate per-word scores that obscure the SEVERITY and TYPE of errors and their downstream impact - which is why serious parser evaluation supplements them with error analysis (by relation, attachment distance, sentence length), sentence-level exact-match where relevant, and downstream task evaluation when the parser feeds a pipeline.",
          "deepDive": {
            "q": "This 'aggregate score hides which errors matter' issue recurs across ML - what's the general lesson?",
            "a": "The parser-evaluation issue - a per-item aggregate score (LAS) obscuring that some errors are far more consequential than others - is a specific instance of a pervasive ML evaluation lesson: aggregate metrics average away structure that matters, so you must look beneath the aggregate at WHICH errors occur and WHAT they cost. The same pattern appears everywhere: (1) OVERALL ACCURACY hides subgroup/slice failures - a model with high aggregate accuracy can fail badly on a specific subgroup or a backdoor trigger (the 24-09 red-teaming and 25-10 slice-analysis lessons), so you do slice-based error analysis, not just report the headline number. (2) A SINGLE LOSS/PERPLEXITY number hides per-example and per-region behavior - two models with the same average can have very different error distributions and calibration (the 24-01 calibration lesson: aggregate accuracy says nothing about whether confidences are honest, and a good average can hide concentrated failures). (3) A single classification metric hides the cost asymmetry - a false negative and false positive can have wildly different real costs (the fraud/threshold lessons), so aggregate accuracy without a cost structure is misleading. (4) Distances/errors in aggregate hide that they're concentrated in the tail or a specific region (regression residual analysis). The GENERAL LESSON is that any aggregate metric is a lossy summary that weights all errors (or examples) by a fixed, usually-uniform scheme, which rarely matches the true importance/cost of different errors - so a responsible evaluation ALWAYS supplements the headline aggregate with (a) DISAGGREGATION - break the metric down by slice, error type, region, difficulty, or subgroup to find where and how the model fails; (b) COST-AWARENESS - weight errors by their actual consequences rather than counting them equally; and (c) the RIGHT GRANULARITY - per-item vs per-structure vs downstream, matching what the application needs. This is the recurring 'don't trust a single number - look at the distribution of errors and what they cost' discipline that connects parser attachment scores to model calibration, slice analysis, cost-sensitive thresholds, and honest evaluation throughout the curriculum - the aggregate is a starting point, never the whole story."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Dependency parsing",
        "back": "Recover a sentence's structure as a tree: each word points to its head (the word it depends on), labeled with the relation (subject/object/modifier...). 'Who did what to whom'."
      },
      {
        "type": "definition",
        "front": "Valid dependency tree constraints",
        "back": "One head per word, single root, no cycles, n-1 edges; projective trees also forbid crossing edges. These constraints couple the predictions (structured prediction)."
      },
      {
        "type": "definition",
        "front": "Transition-based parsing",
        "back": "Build the tree with local actions (SHIFT/LEFT-ARC/RIGHT-ARC) over a stack+buffer, a classifier picking each. Linear-time, greedy - early errors propagate."
      },
      {
        "type": "definition",
        "front": "Graph-based parsing",
        "back": "Score all possible edges, extract the maximum-scoring valid tree (max spanning tree). Globally optimal, O(n^2)-O(n^3) - no greedy early-commitment problem."
      },
      {
        "type": "intuition",
        "front": "Transition vs graph = local vs global",
        "back": "Transition: fast/greedy/rich-structural-features, errors propagate. Graph: global-optimal, better long-range, but slower + more-local edge scoring. The recurring greedy-vs-optimal trade-off."
      },
      {
        "type": "definition",
        "front": "Structured prediction",
        "back": "Predicting an interdependent structure (a valid tree) with constraints coupling the parts - not independent per-item classification. Needs joint search over valid structures."
      },
      {
        "type": "definition",
        "front": "UAS / LAS",
        "back": "Unlabeled Attachment Score (fraction with correct head) and Labeled Attachment Score (correct head AND relation). Standard parsing metrics."
      },
      {
        "type": "intuition",
        "front": "Shortest dependency path (relation extraction)",
        "back": "The shortest tree path between two entities captures their relation (usually through the verb), denoising irrelevant words - a strong, interpretable relation-extraction feature."
      }
    ],
    "refs": [
      {
        "title": "Chen & Manning, A Fast and Accurate Neural Dependency Parser (2014)",
        "url": "https://aclanthology.org/D14-1082/"
      },
      {
        "title": "Jurafsky & Martin, Speech and Language Processing (Ch. 14, Dependency Parsing)",
        "url": "https://web.stanford.edu/~jurafsky/slp3/14.pdf"
      },
      {
        "title": "Hewitt & Manning, A Structural Probe for Finding Syntax in Word Representations (2019)",
        "url": "https://aclanthology.org/N19-1419/"
      },
      {
        "title": "Dozat & Manning, Deep Biaffine Attention for Neural Dependency Parsing (2017)",
        "url": "https://arxiv.org/abs/1611.01734"
      }
    ],
    "demos": []
  },
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
  },
  "elmo": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Static word embeddings (Word2Vec, GloVe) gave each word ONE fixed vector, which fundamentally couldn't handle polysemy - 'bank' got a single averaged vector for the river-edge and money senses. ELMo (Embeddings from Language Models) fixed this with the pivotal idea of CONTEXTUAL embeddings: instead of a lookup table with one vector per word, the embedding of a word is COMPUTED from the whole sentence it appears in, so 'bank' in 'river bank' gets a different vector than 'bank' in 'bank account'. The representation is now a function of context, not a fixed property of the word type - the breakthrough that resolved polysemy and set the stage for BERT and modern NLP.",
        "The mechanism is elegant and reuses everything from the previous lessons: ELMo trains a deep bidirectional LSTM as a LANGUAGE MODEL (predict the next word forward, and the previous word backward) on a huge unlabeled corpus. After training, the LSTM's internal hidden states at each position - which encode the word IN ITS CONTEXT because the LSTM has read the surrounding words - ARE the contextual embeddings. The key insight is that a language model, trained only to predict words, is forced to build rich context-dependent representations as a byproduct, and you can extract and reuse those representations for other tasks. This is self-supervised representation learning: no labels, just next-word prediction, yielding transferable contextual features.",
        "ELMo also introduced two ideas that carried forward. First, it uses ALL layers of the deep LSTM, not just the top one, combining them with learned task-specific weights - because different layers capture different information (lower layers more syntactic, higher layers more semantic), and the best mix depends on the task. Second, it established the PRETRAIN-THEN-TRANSFER paradigm for contextual representations: pretrain a big language model once on unlabeled text, then feed its contextual embeddings into downstream task models, giving large gains especially with limited labeled data. ELMo was the bridge from static embeddings to the pretraining revolution - BERT and GPT took the same 'language-model-as-representation-learner' idea and replaced the LSTM with a transformer."
      ],
      "math": [
        {
          "h": "Contextual embedding as a function of the whole sentence",
          "paras": [
            "Unlike a static embedding (a fixed lookup e(w)), a contextual embedding is a function of the word AND its entire context - the same word gets different vectors in different sentences. ELMo computes it from the internal states of a bidirectional language model that has read the surrounding words."
          ],
          "tex": "\\text{static: } e(w_i) \\text{ (fixed)} \\quad\\text{vs}\\quad \\text{contextual: } e(w_i \\mid w_1 \\dots w_n) = f_{\\text{biLM}}(w_1 \\dots w_n)_i",
          "texNote": "The contextual embedding of position i depends on the whole sequence w_1..w_n, so 'bank' in different sentences gets different vectors - resolving polysemy that static embeddings cannot."
        },
        {
          "h": "ELMo: a learned combination of all biLM layers",
          "paras": [
            "ELMo doesn't just use the top LSTM layer - it forms each token's representation as a task-specific weighted sum of ALL the biLM layers (the input embedding and each LSTM layer's forward+backward states), scaled by a task-learned factor. Different layers contribute different (syntactic vs semantic) information."
          ],
          "tex": "\\text{ELMo}_i^{\\text{task}} = \\gamma^{\\text{task}} \\sum_{l=0}^{L} s_l^{\\text{task}} \\, h_{i,l}, \\qquad s^{\\text{task}} = \\text{softmax weights over layers}",
          "texNote": "h_{i,l} is layer l's representation of token i; s_l are learned softmax weights (which layers matter for THIS task); gamma scales the whole thing. Lower layers ~ syntax, higher ~ semantics."
        }
      ],
      "code": [
        {
          "h": "Static vs contextual: the polysemy test",
          "paras": [
            "The defining difference: a static embedding gives 'bank' the same vector everywhere; a contextual embedding gives different vectors matching the sense in context."
          ],
          "code": "# static embedding (Word2Vec/GloVe): one vector per word type\n# static['bank']  -> the SAME vector in every sentence (river or money) - polysemy broken\n\n# contextual embedding (ELMo): a function of the whole sentence\n# elmo('I sat by the river bank')     -> 'bank' vector near geography/water senses\n# elmo('I deposited it at the bank')  -> 'bank' vector near finance senses\n# same word, DIFFERENT vectors, because the biLM read the surrounding context\n\n# measurable: cosine similarity between the two 'bank' contextual vectors is LOW,\n# while a static embedding gives them cosine 1.0 (identical) - the polysemy fix\nprint('static: one vector per word; contextual: a vector per word-IN-CONTEXT')",
          "caption": "A static embedding gives 'bank' an identical vector in every sentence; ELMo's contextual embedding differs by sense because it's computed from the whole sentence - the polysemy fix."
        },
        {
          "h": "ELMo's biLM and layer combination",
          "paras": [
            "ELMo pretrains a bidirectional LSTM language model, then combines all its layers with task-learned weights - the extracted representations feed downstream models."
          ],
          "code": "# 1) PRETRAIN (self-supervised, no labels): a deep biLSTM language model\n#    forward LSTM predicts w_{t+1} from w_1..w_t; backward predicts w_{t-1} from w_t..w_n\n#    trained on a huge unlabeled corpus by next/previous-word prediction\n\n# 2) EXTRACT: at each position, collect the input embedding + each LSTM layer's\n#    forward+backward hidden states -> L+1 representations per token\n\n# 3) COMBINE (per downstream task): ELMo_i = gamma * sum_l softmax(s)_l * h_{i,l}\n#    the task LEARNS which layers matter (s) - lower layers syntactic, higher semantic\n\n# 4) TRANSFER: feed ELMo vectors as (context-aware) input features to a task model\n#    -> large gains, especially with limited labeled data\nprint('pretrain a biLM once (unlabeled) -> reuse its contextual layers for any task')",
          "caption": "Pretrain a bidirectional LSTM language model on unlabeled text, then combine all its layers with task-learned weights and feed the contextual vectors into downstream models - pretrain-then-transfer."
        }
      ],
      "useCases": [
        "ELMo gave large gains across virtually every NLP task (NER, question answering, sentiment, textual entailment) when it replaced static embeddings as input features - the empirical demonstration that contextual representations broadly help.",
        "It established the PRETRAIN-THEN-TRANSFER paradigm for contextual representations - pretrain a language model on unlabeled text, transfer its features to downstream tasks - which BERT/GPT then took over completely.",
        "The 'language-model-as-representation-learner' insight (a model trained only to predict words builds reusable representations) is the foundation of all modern self-supervised NLP and the reason pretraining scales.",
        "The layer-combination idea (different layers capture different linguistic information, combine them task-specifically) informs how practitioners still probe and use intermediate representations of large models."
      ],
      "pitfalls": [
        "ELMo is a FEATURE-EXTRACTION approach - it produces contextual vectors that feed a separate task model, keeping the biLM frozen - which is less powerful than the FINE-TUNING paradigm (BERT/GPT) where the whole pretrained model is adapted to the task; contextual features are good, adapting the whole model is better.",
        "It uses LSTMs, so it inherits their limitations: sequential (non-parallel) computation and the residual difficulty with very long-range dependencies - transformers fixed both, which is a key reason BERT superseded ELMo quickly.",
        "ELMo's forward and backward language models are trained SEPARATELY and concatenated (it's 'shallowly' bidirectional) - it never jointly conditions on both directions at once, unlike BERT's deeply-bidirectional masked language modeling, so its bidirectionality is weaker.",
        "Contextual embeddings are far more expensive than static ones: you must run the whole biLM on each input at inference (not a cheap lookup), so ELMo trades static embeddings' speed/simplicity for context-awareness - a real cost for large-scale/latency-sensitive systems.",
        "Overselling ELMo as the endpoint: it was a crucial BRIDGE (static -> contextual, and pretrain-then-transfer), but was rapidly superseded by transformer-based BERT/GPT, which took the same core ideas further - understand it as the pivotal transition, not the destination."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/word-vectors",
          "text": "ELMo directly fixes static embeddings' fundamental limitation - one vector per word (polysemy) - by making the embedding a function of context."
        },
        {
          "ref": "rnn-nlp/lstm-gru",
          "text": "ELMo's engine is a deep bidirectional LSTM language model - the contextual representations ARE its hidden states, built on the recurrent architecture from earlier."
        },
        {
          "ref": "rnn-nlp/classical-lm",
          "text": "ELMo is a language model repurposed as a representation learner - the next-word-prediction objective from the classical-LM lesson, whose byproduct is the contextual embeddings."
        },
        {
          "text": "Module 08/10's BERT and GPT take ELMo's 'pretrained language model as representation learner' idea and replace the LSTM with a transformer, adding deep bidirectionality (BERT) and fine-tuning - the pretraining revolution ELMo began."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a contextual embedding?",
          "a": "A word representation computed from the whole sentence, so the same word gets different vectors in different contexts - unlike a static embedding's one fixed vector per word."
        },
        {
          "q": "What problem does ELMo solve that static embeddings can't?",
          "a": "Polysemy - static embeddings give 'bank' one averaged vector; ELMo gives different vectors for the river vs money senses based on context."
        },
        {
          "q": "How does ELMo produce contextual embeddings?",
          "a": "Train a deep bidirectional LSTM as a language model on unlabeled text; its internal hidden states (which encode words in context) ARE the contextual embeddings."
        },
        {
          "q": "What is ELMo's training objective?",
          "a": "Bidirectional language modeling - a forward LSTM predicts the next word, a backward LSTM the previous word - self-supervised on unlabeled text (no labels)."
        },
        {
          "q": "Why does ELMo combine ALL LSTM layers?",
          "a": "Different layers capture different information (lower ~ syntactic, higher ~ semantic), so a task-specific learned weighting of all layers works better than using only the top."
        },
        {
          "q": "What paradigm did ELMo establish?",
          "a": "Pretrain-then-transfer for contextual representations: pretrain a language model on unlabeled text, then feed its contextual features into downstream task models."
        },
        {
          "q": "How is ELMo a 'feature-extraction' approach?",
          "a": "It produces contextual vectors that feed a separate downstream model while keeping the biLM frozen - less powerful than fine-tuning the whole pretrained model (BERT/GPT)."
        },
        {
          "q": "Why is ELMo only 'shallowly' bidirectional?",
          "a": "Its forward and backward LMs are trained separately and concatenated - it never jointly conditions on both directions at once, unlike BERT's deep bidirectional masked LM."
        },
        {
          "q": "Why are contextual embeddings more expensive than static ones?",
          "a": "You must run the whole biLM on each input at inference (not a cheap table lookup), trading speed for context-awareness."
        },
        {
          "q": "How does ELMo relate to BERT/GPT?",
          "a": "It pioneered the 'pretrained LM as representation learner' idea; BERT/GPT took the same idea, replaced the LSTM with a transformer, and added deep bidirectionality (BERT) and fine-tuning."
        }
      ],
      "standard": [
        {
          "q": "Explain how ELMo produces contextual embeddings and why a language-modeling objective yields useful representations.",
          "a": "ELMo produces contextual embeddings by training a deep bidirectional LSTM as a LANGUAGE MODEL on a large unlabeled corpus, then extracting its internal hidden states as the representations. Concretely: a forward LSTM reads the sentence left-to-right and is trained to predict the next word at each position (given all previous words), and a separate backward LSTM reads right-to-left predicting the previous word - together forming a bidirectional language model (biLM). Crucially, to predict a word well, the LSTM must build a hidden state at each position that encodes the word IN ITS CONTEXT - what came before (forward) and after (backward) - so after training, the LSTM's hidden state at each position is a rich, context-dependent representation of that word. ELMo takes these hidden states (from all layers) as the contextual embedding: the vector for 'bank' is computed from the actual sentence, so it differs between 'river bank' and 'bank account'. Why the language-modeling objective yields useful representations is the deep, general insight: predicting the next/previous word is a SELF-SUPERVISED task that requires understanding a great deal about language - syntax (what word forms can follow), semantics (what meanings are coherent), and context (how surrounding words disambiguate) - so a model trained to do it well is FORCED to build representations encoding this linguistic knowledge as a byproduct, even though no task labels were used. The representations are USEFUL because they capture exactly the context-dependent linguistic information that downstream tasks (NER, sentiment, QA) also need - the same features that help predict the next word help identify entities or sentiment. This is self-supervised representation learning: an objective computed from the raw data itself (next-word prediction) forces the model to learn transferable structure, which you then reuse. It's the foundational idea behind all modern pretraining - the 'predict part of the data from the rest' objective is a universal representation learner because doing it well requires modeling the data's structure, and ELMo was the pivotal demonstration of this for CONTEXTUAL word representations.",
          "deepDive": {
            "q": "Why does using all layers of the biLM (not just the top) with learned weights help, and what does it reveal about what the layers learn?",
            "a": "Using all layers with task-learned weights helps because different layers of a deep biLM capture DIFFERENT kinds of linguistic information, and the optimal mix depends on the downstream task - so combining them flexibly beats committing to any single layer. ELMo forms each token's representation as a learned weighted sum over the input embedding and every LSTM layer's states, with the weights (a softmax over layers, plus a scaling factor) LEARNED PER TASK. What this reveals about the layers: probing studies of ELMo (and later contextual models) found a rough HIERARCHY - LOWER layers tend to capture more SYNTACTIC / surface information (part-of-speech, morphology, local structure, word identity), while HIGHER layers capture more SEMANTIC / contextual information (word sense, semantic roles, longer-range meaning). This makes intuitive sense: the network builds up from surface form toward abstract meaning as depth increases, so early layers 'know' the word and its local grammar and later layers 'know' its contextual meaning. Because tasks differ in what they need - a part-of-speech or syntactic task benefits more from the syntactic lower layers, while a word-sense-disambiguation or semantic task benefits more from the semantic higher layers - letting each task LEARN its own layer weighting lets it draw on the most relevant information rather than being stuck with, say, only the top layer (which might be too semantic for a syntactic task) or only the bottom (too surface-level for a semantic task). Empirically, this learned all-layer combination outperformed using any single layer, and the finding that layers form a syntactic-to-semantic hierarchy was influential - it revealed that deep language models build interpretable, hierarchical linguistic representations, and it informs how practitioners still probe and select intermediate representations of large models (the interpretability lessons make this rigorous). So the all-layer combination is both a practical improvement (flexible per-task feature selection) and a scientific finding (deep LMs learn a hierarchy of linguistic abstraction), and it presaged the broader understanding that different depths of a pretrained model encode different, task-differentially-useful information."
          }
        },
        {
          "q": "Contrast the feature-extraction approach (ELMo) with the fine-tuning approach (BERT/GPT) to using pretrained language models.",
          "a": "Both extract value from a language model pretrained on unlabeled text, but they DIFFER in how they use it for downstream tasks, and this distinction defines a major evolution in transfer learning. FEATURE EXTRACTION (ELMo's approach): the pretrained biLM is FROZEN, and you extract its contextual representations (the hidden states) as fixed FEATURES that you feed as INPUT into a SEPARATE, task-specific model (which you train from scratch on the task). The pretrained model is a fixed feature generator; the task model sits on top and does the actual task learning. FINE-TUNING (BERT/GPT's approach): you take the ENTIRE pretrained model and CONTINUE TRAINING it (all its weights, or most of them) on the downstream task, typically by adding a small task-specific head (a classification layer) and updating the whole model end-to-end on the task data. The pretrained model isn't just a feature source - it's the model you adapt. The differences and why fine-tuning generally wins: (1) ADAPTABILITY - fine-tuning adjusts ALL the pretrained representations to the specific task, so they become task-optimized, whereas feature extraction uses fixed representations the task model must work with as-is; adapting the whole model lets it reshape its internal features for the task, which is more powerful. (2) DEPTH of integration - in fine-tuning, the task signal flows through the whole pretrained network, so the task benefits from the full model's capacity being tuned toward it; feature extraction only trains the (usually smaller) task model on top. (3) SIMPLICITY - fine-tuning often needs just a simple task head (the pretrained model does the heavy lifting), while feature extraction requires designing and training a separate task architecture. Empirically, fine-tuning (BERT/GPT) substantially outperformed feature extraction (ELMo) on most tasks, which is why the field moved to it. The trade-offs favoring feature extraction in some cases: it's cheaper (the big model is frozen and can be run once to cache features), it avoids the risk of catastrophic forgetting or overfitting the whole model on small task data, and it lets one frozen model serve many tasks without per-task copies. But overall, fine-tuning's ability to adapt the entire pretrained model to the task made it the dominant paradigm, and ELMo's feature-extraction approach is understood as the transitional step - it proved contextual pretrained representations help, and BERT/GPT then showed that adapting the whole pretrained model helps even more.",
          "deepDive": {
            "q": "Given fine-tuning's advantages, why has parameter-efficient fine-tuning (like LoRA) and even feature-extraction-like approaches seen renewed interest for very large models?",
            "a": "As models grew to billions of parameters, full fine-tuning's costs reintroduced problems that make lighter approaches - including parameter-efficient fine-tuning (PEFT) and feature-extraction-like methods - attractive again, in a partial swing back toward ELMo's 'don't retrain the whole model' philosophy. Full fine-tuning of a huge model has several drawbacks at scale: (1) it requires storing a FULL COPY of the model's weights for EACH task (a separate multi-billion-parameter fine-tuned model per task), which is enormously expensive in storage and serving; (2) it needs enough memory to compute gradients for ALL parameters during training, which is costly for large models; (3) with limited task data, fine-tuning all parameters risks overfitting or catastrophic forgetting of pretrained knowledge. Parameter-efficient methods like LoRA address this by FREEZING the pretrained model and training only a small number of added/adapted parameters (LoRA adds low-rank update matrices to the frozen weights) - so you get most of fine-tuning's task-adaptation benefit while (a) storing only tiny per-task adapters instead of full model copies, (b) training far fewer parameters (cheaper memory/compute), and (c) reducing overfitting/forgetting since the pretrained weights are preserved. This is conceptually a MIDDLE GROUND between ELMo's frozen-feature-extraction and full fine-tuning: like feature extraction it keeps the big model frozen (cheap, one shared model, no forgetting), but unlike pure feature extraction it DOES adapt the model's behavior (via the small trainable adapters), recovering much of full fine-tuning's task-specialization. And in the era of very large 'foundation models', pure feature-extraction-like use (frozen model + prompting, or frozen embeddings for retrieval) also returned because running or copying the full model per task is impractical, and frozen large models are already so capable that their fixed representations/behaviors suffice for many uses. So the arc is: ELMo (frozen features) -> BERT/GPT (full fine-tuning, more powerful) -> at extreme scale, PEFT/LoRA and frozen-model approaches (recovering efficiency without full retraining) - the field oscillated based on model scale and the cost/benefit of adapting all parameters, and the 'freeze the expensive pretrained model, adapt lightly' instinct that ELMo embodied became attractive again precisely when models got large enough that full fine-tuning's costs dominated, connecting directly to the fine-tuning lessons in Module 13."
          }
        },
        {
          "q": "Explain why ELMo is described as only 'shallowly' bidirectional and how BERT achieved deep bidirectionality.",
          "a": "ELMo is 'shallowly' or 'weakly' bidirectional because its forward and backward language models are trained SEPARATELY and only COMBINED (concatenated) at the end, so the model never JOINTLY conditions on both directions at once when building its representations. Concretely, ELMo has a forward LSTM that predicts each word from the words BEFORE it (using only left context) and a completely separate backward LSTM that predicts each word from the words AFTER it (using only right context); each direction's representation is built independently using only ONE side's context, and ELMo just concatenates the two independently-built representations. So at no point does a single representation get built by simultaneously looking at both left AND right context in a deeply-integrated way - the bidirectionality is a shallow concatenation of two unidirectional models, not a truly bidirectional encoding. Why not just train a single model that conditions on both directions at once? Because for a standard language-modeling objective (predict a word), letting the model see both the left AND right context would be CHEATING - if you're predicting word t and the model can see word t (or use it via the right-context path), the task is trivial (it can just copy the answer), so you can't naively train a deeply-bidirectional LANGUAGE model; the left-to-right (or right-to-left) constraint exists precisely to prevent the model from seeing the word it's predicting. BERT achieved deep bidirectionality by changing the OBJECTIVE from next-word prediction to MASKED LANGUAGE MODELING (MLM): instead of predicting the next word from left context, BERT randomly MASKS some words in the input and trains the model to predict the masked words from the ENTIRE surrounding context (both left AND right simultaneously). Because the word being predicted is MASKED (hidden), the model can safely attend to all the OTHER words on both sides without cheating - there's nothing to copy since the target is masked out. This lets BERT build DEEPLY bidirectional representations: every layer's representation of every (non-masked) position integrates information from both directions at once through the transformer's self-attention, rather than concatenating two separately-trained unidirectional models. This deep bidirectionality - representations that jointly condition on full left-and-right context at every layer - was a key reason BERT outperformed ELMo, and the masking trick was the clever objective change that made training a deeply-bidirectional model possible without the see-the-answer problem.",
          "deepDive": {
            "q": "If masked language modeling enables deep bidirectionality, why do generative models like GPT use left-to-right (causal) language modeling instead?",
            "a": "GPT uses left-to-right (causal) language modeling instead of masked language modeling because its purpose is GENERATION, and generation fundamentally requires left-to-right, unidirectional modeling - the same constraint that appeared with bidirectional RNNs. The trade-off is between representation quality for UNDERSTANDING tasks (where bidirectionality helps) and the ability to GENERATE (which requires causality): (1) BERT's masked LM is bidirectional and excellent for UNDERSTANDING tasks (classification, tagging, QA) where the whole input is available and you want the richest possible representation of each token using full context - but it CANNOT generate text autoregressively, because it's trained to fill in masks given surrounding context, not to produce the next token from only preceding context; it has no natural left-to-right generation process. (2) GPT's causal LM predicts each token from ONLY the preceding tokens (masking out future positions via causal attention masking), which is exactly what generation needs - to generate token t you can only condition on tokens 1..t-1 (you haven't produced the future yet), so the model must be trained the same way, seeing only past context. This makes GPT autoregressive and able to generate, at the cost of each token's representation only integrating LEFT context (weaker for understanding tasks than BERT's bidirectional representations, though scale compensates). So the choice of objective encodes the intended use: masked LM (BERT) for deeply-bidirectional representations optimized for understanding, causal LM (GPT) for left-to-right modeling that enables generation. This is the SAME bidirectional-vs-causal distinction from the RNN lesson (bidirectional RNNs for understanding, unidirectional for generation), now at the objective level for transformers: BERT is an encoder (bidirectional, understanding) and GPT is a decoder (causal, generative), and the reason you can't just always use the more-bidirectional option is that generation intrinsically requires only-see-the-past causality. The field ended up with both because they serve different purposes - and later work (encoder-decoder models, and the recognition that large causal LMs can also do understanding tasks well via scale and prompting) explored the spectrum between them - but the core reason GPT is causal despite bidirectionality helping representations is simply that it must be able to generate, and generation demands left-to-right conditioning."
          }
        },
        {
          "q": "Why was ELMo a pivotal moment in NLP even though it was quickly superseded by BERT?",
          "a": "ELMo was pivotal because it established the core ideas and demonstrated the results that launched the pretraining revolution, even though the specific architecture was rapidly improved upon - its importance is in the paradigm it proved, not its longevity. Several reasons it was a watershed: (1) It DEMONSTRATED CONTEXTUAL EMBEDDINGS WORK - it was the breakthrough that showed replacing static one-vector-per-word embeddings with context-dependent representations gives large, broad improvements across virtually every NLP task; this validated the fundamental shift from static to contextual representations that all subsequent models (BERT, GPT) build on, and resolved the polysemy limitation that had constrained static embeddings. (2) It ESTABLISHED PRETRAIN-THEN-TRANSFER for contextual representations - it showed that pretraining a large language model on unlabeled text and then transferring its representations to downstream tasks yields big gains, especially with limited labeled data; this pretraining paradigm became THE dominant approach in NLP, and ELMo was the compelling proof-of-concept. (3) It proved the LANGUAGE-MODEL-AS-REPRESENTATION-LEARNER insight at scale - that a model trained only on self-supervised next-word prediction learns rich, transferable linguistic representations as a byproduct, which is the conceptual foundation of all modern self-supervised NLP. (4) It CATALYZED the field - ELMo's strong results (in 2018) directly motivated the rapid development of BERT and GPT the same year, which took its ideas (pretrained LM, contextual representations, transfer) and pushed them further (transformer instead of LSTM, deep bidirectionality via masking, fine-tuning instead of feature extraction). So ELMo was the BRIDGE from the static-embedding era to the pretraining era: it proved the destination was right (contextual, pretrained, transferable representations) and the field then found faster vehicles (transformers) to get there. Being superseded quickly doesn't diminish its importance - it's precisely because ELMo demonstrated the paradigm so convincingly that the field moved fast to improve it. It's a classic case of a pivotal proof-of-concept that changes the direction of a field and is then rapidly built upon: the specific model becomes obsolete, but the IDEAS it validated (contextual embeddings, pretrain-then-transfer, LM-as-representation-learner) became the foundation of everything after, which is the more important legacy.",
          "deepDive": {
            "q": "What is the general pattern of 'pivotal-but-quickly-superseded' innovations in ML, and why does it happen?",
            "a": "ELMo exemplifies a recurring pattern in ML (and science generally): an innovation that VALIDATES A PARADIGM is pivotal and field-changing even though the specific technique is rapidly superseded, because proving a direction works is more important and harder than optimizing within it. The pattern: a method demonstrates for the first time that a new APPROACH is viable and valuable (contextual pretrained representations help broadly), which redirects the field's effort toward that approach, and then rapid follow-up work - now that everyone knows the direction is fruitful - quickly finds better implementations, superseding the original. It happens for several reasons: (1) The hard part is often the CONCEPTUAL LEAP / proof of viability, not the engineering optimization - once ELMo showed contextual pretraining works, improving the architecture (LSTM -> transformer) and the objective (bidirectional LM -> masked LM) were natural optimizations that the field could execute quickly given the validated direction. (2) A convincing demonstration MOBILIZES the whole field - strong results attract massive follow-up effort, so the original is improved upon fast precisely BECAUSE it was impactful. (3) The first working version is rarely optimal - it proves the concept with whatever tools are at hand (ELMo used LSTMs and feature extraction), and better tools/variants follow. Other examples of the same pattern: AlexNet (2012) proved deep CNNs + GPUs work for vision and was quickly superseded by better architectures (VGG, ResNet), but it launched the deep learning era; the original seq2seq and the first attention mechanism were quickly improved by the transformer, but they proved the direction; Word2Vec proved learned dense embeddings work and was superseded by contextual embeddings. The lesson for understanding ML progress is that the IMPORTANCE of a contribution isn't its longevity but whether it VALIDATED A PARADIGM that redirected the field - the 'pivotal bridge' role. This also has a practical implication: when evaluating research or deciding what to learn, the paradigm-validating ideas (contextual representations, pretrain-then-transfer, attention) are the durable, foundational concepts worth deep understanding, while specific superseded architectures (ELMo's exact biLSTM) are worth understanding as historical context and for the ideas they proved, not as current best practice - which is exactly why this lesson teaches ELMo as the pivotal transition from static to contextual and into the pretraining era, not as a deployment recommendation."
          }
        },
        {
          "q": "How would you decide today between using static embeddings, ELMo-style contextual embeddings, and a fine-tuned transformer for an NLP task?",
          "a": "The decision depends on the task's needs, resource constraints, and data availability, and in practice today the choice is usually between the simplest sufficient option and a fine-tuned (or prompted) transformer, with ELMo-style approaches largely historical. Reasoning through the options: (1) STATIC EMBEDDINGS (Word2Vec/GloVe/FastText) - choose these when you need EXTREME efficiency and simplicity, the task doesn't require deep context/polysemy resolution, or you have very limited compute (they're a cheap lookup, no model to run). They remain useful for lightweight applications, as features in simple models, for very large-scale settings where running a transformer per input is prohibitive, or as a strong efficient baseline. Their limitation is no context-awareness (polysemy unresolved) and generally lower accuracy on tasks needing contextual understanding. (2) CONTEXTUAL EMBEDDINGS as frozen features (ELMo-style, or frozen transformer embeddings) - choose a feature-extraction approach when you want context-awareness but need to keep the big model FROZEN (to serve many tasks from one model, cache features, avoid the cost/risk of fine-tuning, or when task data is very small); modern practice would use frozen TRANSFORMER embeddings (e.g., sentence-transformers for similarity/retrieval) rather than literal ELMo, but the frozen-contextual-features pattern is alive for retrieval, semantic search, and clustering where you need embeddings not task-specific fine-tuning. (3) FINE-TUNED TRANSFORMER (BERT/GPT-family) - the DEFAULT for most supervised NLP tasks today when you have moderate task data and compute: fine-tuning (or parameter-efficient fine-tuning like LoRA for large models) adapts the whole pretrained model to the task and gives the best accuracy, and pretrained transformers transfer strongly even from limited task data. For many tasks now you'd also consider (4) PROMPTING a large LLM (zero/few-shot) - when you have very little task data, need flexibility, or the task suits an instruction-following model, prompting a large model can beat training anything from scratch, at the cost of inference expense and less reliability. So the practical decision tree: need cheapest/simplest and context doesn't matter much -> static embeddings; need contextual features but a frozen shared model (retrieval, similarity, low resources) -> frozen transformer embeddings; have task data and want best supervised accuracy -> fine-tune a transformer (with PEFT if the model is huge); very little data or want flexibility -> prompt a large LLM. ELMo specifically is essentially never the right CURRENT choice (transformers superseded it), but its feature-extraction PATTERN persists in the frozen-embedding option. The overarching principle is the same as all model selection: match the method to the task's context-needs, resource/latency constraints, and data availability, preferring the simplest approach that meets the accuracy bar - static embeddings and frozen features for efficiency/simplicity, fine-tuned transformers for maximum supervised accuracy, prompting for flexibility/low-data - and validate empirically rather than defaulting to the heaviest option.",
          "deepDive": {
            "q": "For a semantic search / retrieval application specifically, why are frozen contextual embeddings (not fine-tuned per query) the natural choice, connecting back to the word-vectors lesson?",
            "a": "For semantic search/retrieval, frozen contextual embeddings are the natural choice because the task's structure - comparing a query against a large fixed corpus by similarity - requires PRECOMPUTABLE, COMPARABLE vector representations, which is exactly what a frozen embedding model provides and what fine-tuning-per-query would break. The retrieval setup: you have a large corpus of documents/passages, and for each incoming query you want to find the most semantically similar items. The efficient way to do this is to EMBED every corpus item ONCE (offline) into a vector, store them (often in a vector index for approximate nearest-neighbor search), and at query time embed just the query and find its nearest neighbors among the precomputed corpus vectors by cosine similarity - the same nearest-neighbor-in-embedding-space idea from the word-vectors lesson, now with contextual sentence/passage embeddings instead of static word vectors. This requires a FROZEN embedding model because: (1) the corpus vectors must be PRECOMPUTED and STABLE - if the model changed per query (fine-tuning), all corpus embeddings would become invalid and need recomputing every time, which is infeasible for a large corpus; (2) the query and corpus embeddings must live in the SAME fixed vector space to be comparable by distance, which requires one consistent frozen model embedding both; (3) it must be CHEAP at query time - a single forward pass to embed the query, then fast vector search, rather than running a per-query-fine-tuned model over the whole corpus. So a frozen contextual embedding model (typically a transformer fine-tuned ONCE for producing good similarity embeddings - like sentence-transformers - then frozen for deployment) is the right tool: you fine-tune it once to make its embeddings semantically meaningful for similarity (a one-time training step), then FREEZE it and use it as a fixed feature extractor for both corpus and queries. This connects directly back to the word-vectors lesson's semantic-search use case - the whole 'represent items as vectors and find nearest neighbors' paradigm - upgraded from static word vectors to frozen contextual (sentence/passage) embeddings that capture context and meaning far better, and it's the foundation of modern dense retrieval and RAG (retrieval-augmented generation). It's a clean illustration that the RIGHT approach follows from the task's computational structure: retrieval needs precomputed comparable vectors, which mandates a frozen embedding model, which is exactly the frozen-contextual-features pattern that ELMo pioneered and that persists as the natural choice for embedding-based retrieval even though fine-tuning dominates for supervised classification tasks."
          }
        },
        {
          "q": "ELMo used LSTMs. Why did the transformer replace the LSTM in the pretraining paradigm ELMo started, and what did that change enable?",
          "a": "The transformer replaced the LSTM as the pretraining backbone for the same reasons transformers beat LSTMs generally, but the impact was amplified because the pretraining paradigm depends critically on SCALE - and the transformer's advantages are precisely about enabling scale. Two core reasons: (1) PARALLELISM enabling scale - ELMo's biLSTM processes sequences SEQUENTIALLY (each hidden state needs the previous one), so it can't be parallelized across the sequence during training, capping how fast and how large you can train. The transformer's self-attention processes all positions in PARALLEL, fully exploiting GPU/TPU hardware, so it can be trained on FAR more data with FAR more parameters in the same wall-clock time. Since the whole value of the pretraining paradigm ELMo started is that a bigger model trained on more unlabeled text learns better representations, the transformer's parallelism was transformative - it let the pretrain-then-transfer idea scale to the enormous models (BERT, GPT, and beyond) that dwarf ELMo, and scale is what drove the dramatic capability gains. (2) BETTER LONG-RANGE MODELING - the transformer gives every position a DIRECT connection to every other via attention (no decay, no fixed-state bottleneck), so it models long-range dependencies far better than the LSTM's decaying, sequential memory, producing richer representations. What the switch ENABLED, beyond just better/bigger models: (a) DEEP BIDIRECTIONALITY - the transformer's architecture (with masked language modeling) allowed BERT to build deeply bidirectional representations that jointly condition on full left-and-right context at every layer, versus ELMo's shallow concatenation of separate forward/backward LSTMs. (b) FINE-TUNING at scale - the transformer's architecture made it practical to fine-tune the whole pretrained model on downstream tasks (BERT/GPT), superseding ELMo's feature-extraction approach. (c) The SCALING that produced emergent capabilities - only because the transformer could be scaled to billions of parameters on trillions of tokens did the pretraining paradigm yield the reasoning, generation, and in-context-learning capabilities of modern LLMs. So the transformer didn't change the CORE IDEA ELMo established (pretrain a language model on unlabeled text as a representation learner, then transfer) - it changed the ENGINE, and that engine change (parallelism + long-range attention) is what let the idea scale from ELMo's LSTM to the modern LLM era. It's the culmination of this whole module's arc: tokenization -> embeddings -> RNNs -> LSTMs (fixing gradients) -> attention/contextual representations -> and the transformer (Module 08) that replaces recurrence entirely, taking ELMo's pretraining paradigm to its full potential.",
          "deepDive": {
            "q": "Given that the transformer was the key enabler, was ELMo's contribution just 'the right idea with the wrong architecture'?",
            "a": "That framing captures part of the truth but undersells ELMo, and untangling it clarifies how progress actually works. It's TRUE that ELMo's specific architecture (the biLSTM) was quickly replaced by the transformer, and that the transformer was the enabler of the paradigm's full potential - so in a narrow sense ELMo had 'the right idea (contextual pretrained representations, pretrain-then-transfer) with an architecture that couldn't scale as well'. But 'just the wrong architecture' undersells it for several reasons: (1) PROVING the idea was the hard, essential part - before ELMo, it wasn't established that contextual pretrained representations would broadly help, and demonstrating this convincingly (with an LSTM, the best available sequence tool at the time) is what redirected the field toward pretraining; the architecture was secondary to validating the paradigm. (2) The transformer already existed (2017, for translation) when ELMo appeared (2018), but it was ELMo (and GPT/BERT following) that showed the transformer's power specifically for PRETRAINED LANGUAGE REPRESENTATIONS - so it's not that ELMo missed an obvious better architecture; it proved the pretraining direction, and the field then combined that direction with the transformer. (3) Several of ELMo's specific insights carried forward beyond the architecture: the all-layers-are-useful finding (different layers capture different linguistic information), the demonstration that a pure language-modeling objective yields transferable representations, and the pretrain-then-transfer methodology - these ideas outlived the LSTM. So the accurate framing is that ELMo made the PARADIGM-VALIDATING contribution (contextual pretrained representations transfer and broadly help), which is the durable, field-changing part, and the architecture (LSTM) was the then-best vehicle that the transformer soon improved upon - not a mistake but a natural step. This is the general pattern from the 'pivotal-but-superseded' discussion: the enduring contribution is validating the direction, and the specific architecture is an implementation detail that gets optimized once the direction is proven. Calling it 'right idea, wrong architecture' is a useful shorthand for why it was superseded, but the deeper truth is that proving the idea was ELMo's real and lasting contribution, and the architecture swap (LSTM -> transformer) was the field executing on the direction ELMo opened - which is exactly why understanding ELMo matters for understanding how NLP got to transformers and modern LLMs, the destination the next module (08) builds toward."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Contextual embedding",
        "back": "A word representation computed from the whole sentence, so the same word gets different vectors in different contexts - unlike a static embedding's one fixed vector per word."
      },
      {
        "type": "intuition",
        "front": "What ELMo fixed",
        "back": "Polysemy: static embeddings give 'bank' one averaged vector; ELMo gives different vectors for river vs money senses because the embedding is a function of context."
      },
      {
        "type": "definition",
        "front": "How ELMo works",
        "back": "Train a deep bidirectional LSTM as a language model on unlabeled text; its internal hidden states (word-in-context representations) ARE the contextual embeddings."
      },
      {
        "type": "intuition",
        "front": "Why a language-model objective learns good representations",
        "back": "Predicting words well requires modeling syntax, semantics, and context - so the model builds rich transferable representations as a byproduct. Self-supervised representation learning."
      },
      {
        "type": "definition",
        "front": "ELMo's all-layer combination",
        "back": "Represent each token as a task-learned weighted sum of ALL biLM layers - lower layers ~ syntactic, higher ~ semantic - so each task picks the mix it needs."
      },
      {
        "type": "definition",
        "front": "Feature extraction vs fine-tuning",
        "back": "ELMo: frozen biLM produces features for a separate task model. BERT/GPT: fine-tune the whole pretrained model on the task - more powerful (adapts all representations)."
      },
      {
        "type": "intuition",
        "front": "Shallow vs deep bidirectionality",
        "back": "ELMo trains forward+backward LMs separately and concatenates (shallow). BERT's masked LM predicts masked words from BOTH directions at once (deeply bidirectional)."
      },
      {
        "type": "intuition",
        "front": "ELMo's legacy",
        "back": "Pivotal bridge from static to contextual embeddings and the pretrain-then-transfer paradigm; BERT/GPT took the same ideas, swapped LSTM for transformer, and added fine-tuning."
      }
    ],
    "refs": [
      {
        "title": "Peters et al., Deep Contextualized Word Representations (ELMo, 2018)",
        "url": "https://aclanthology.org/N18-1202/"
      },
      {
        "title": "Devlin et al., BERT (2019)",
        "url": "https://aclanthology.org/N19-1423/"
      },
      {
        "title": "Radford et al., Improving Language Understanding by Generative Pre-Training (GPT, 2018)",
        "url": "https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf"
      },
      {
        "title": "The Illustrated BERT, ELMo, and co. (Jay Alammar)",
        "url": "https://jalammar.github.io/illustrated-bert/"
      }
    ],
    "demos": [
      "embeddings"
    ]
  }
};
