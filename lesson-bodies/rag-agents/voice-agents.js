// GENERATED from content/lessons/rag-agents/voice-agents.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rag-agents/voice-agents/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "voice-agents": {
    "level": "advanced",
    "body": {
      "intuition": [
        "A voice agent is the module's structure in the TIME dimension. Text pipelines compose reliabilities and the factors multiply; a voice cascade composes LATENCIES and they add - speech in, transcription, a language model, speech out, and every stage spends from one fixed budget. That budget is set by human conversational expectation rather than by engineering preference: people leave gaps of a couple of hundred milliseconds between turns, and a system that takes a second and a half feels broken even when every individual component is fast. The total is the product experience, and no stage owns it.",
        "The second idea is that the largest item in the budget is usually the one nobody counts. It is not the model - it is ENDPOINTING, the wait to be confident the user actually stopped talking rather than paused mid-sentence. That wait is a deliberate delay, it commonly runs several hundred milliseconds, and it is a pure trade: shorten it and you interrupt people mid-thought, lengthen it and every response feels sluggish. Budget analyses that start at the transcript have already missed the biggest line item.",
        "The third idea is that STREAMING changes which quantity matters. Turn-based, total latency grows with the length of the response, because nothing is spoken until everything is generated. Streaming, the user hears the first syllable after the first sentence is generated, so TIME TO FIRST AUDIO becomes roughly independent of response length. That reframing is why every serious voice system streams at all three stages, and it means optimizing average total latency is optimizing the wrong number."
      ],
      "math": [
        {
          "h": "The budget is a SUM, and it has a hard ceiling",
          "paras": [
            "Every stage draws from one total, which conversational expectation caps at a few hundred milliseconds.",
            "Writing it out shows immediately where the room actually is."
          ],
          "tex": "T_{\\text{response}} = \\underbrace{t_{\\text{endpoint}}}_{200\\text{-}800\\,\\mathrm{ms}} + t_{\\text{ASR}} + \\underbrace{t_{\\text{TTFT}}}_{\\text{LLM prefill}} + t_{\\text{TTS-first}} + t_{\\text{net}} \\;\\lesssim\\; 800\\,\\mathrm{ms}",
          "texNote": "Human turn gaps sit around 200 milliseconds, and perceived responsiveness degrades sharply past roughly 800. Note what dominates: endpointing is frequently the single largest term and it is a DELIBERATE wait, not a computation. So the first optimization in most voice systems is not a faster model - it is smarter turn detection, because that is where the milliseconds actually are."
        },
        {
          "h": "Why streaming changes the objective",
          "paras": [
            "Turn-based, you pay for the whole response before any of it is heard. Streaming, you pay for the first chunk only.",
            "The difference grows linearly with response length, which is why the two curves diverge."
          ],
          "tex": "T_{\\text{turn}} = t_{\\text{pre}} + N t_{\\text{dec}} + t_{\\text{TTS}}(N) \\qquad\\text{vs}\\qquad T_{\\text{stream}} = t_{\\text{pre}} + k\\,t_{\\text{dec}} + t_{\\text{TTS}}(k), \\;\\; k \\ll N",
          "texNote": "Turn-based latency is LINEAR in response length; streaming time-to-first-audio is roughly flat, because k is the tokens in the first sentence rather than the whole answer. So a long answer costs the user nothing extra in waiting - which also means the metric to optimize and report is TTFA, not total. Optimizing mean total latency in a streaming system measures something the user never experiences."
        },
        {
          "h": "Error through a cascade is not linear in word error rate",
          "paras": [
            "Transcription errors do not damage the downstream task uniformly - it depends entirely on WHICH words are wrong.",
            "That is why word error rate is a poor proxy for the thing you care about."
          ],
          "tex": "\\text{WER} = \\frac{S+D+I}{N} \\quad\\text{treats every word equally}, \\qquad \\text{task success} \\;\\ne\\; f(\\text{WER}) \\;\\text{alone}",
          "texNote": "A 5% WER concentrated on names, numbers and product identifiers is far more damaging than 5% spread across function words - the first breaks the task, the second is often absorbed by the language model, which reconstructs intent from context. So measure TASK SUCCESS end-to-end, and if you must use WER, weight it by entity: an ENTITY error rate on the terms that actually drive the action correlates with product outcomes in a way plain WER does not."
        }
      ],
      "code": [
        {
          "h": "The latency budget, itemized - and where the room really is",
          "paras": [
            "Write it down before optimizing anything; the ranking is usually not what people expect."
          ],
          "code": "# A REALISTIC BUDGET (order-of-magnitude; measure YOUR stack):\n#   endpointing / VAD wait   200-800 ms   ★ often the LARGEST item,\n#                                            and it's a deliberate WAIT\n#   ASR final (streaming)      50-200 ms   partials arrive continuously\n#   LLM time-to-first-token   100-500 ms   prefill; grows with context\n#   TTS time-to-first-audio    50-300 ms\n#   network round trips        20-200 ms   x however many hops\n#   ------------------------------------\n#   target                     < ~800 ms   (human turn gaps ≈ 200 ms)\n\n# WHAT THIS RANKING IMPLIES, and it surprises people:\n#  1. FIX ENDPOINTING FIRST. Semantic endpointing - is this utterance\n#     COMPLETE? - beats a fixed silence timer, because \"my number is\n#     four one five...\" has long pauses inside one utterance.\n#  2. SHRINK THE PROMPT. TTFT scales with context length, so a bloated\n#     system prompt is a latency cost on EVERY turn (17's prefill).\n#  3. STREAM ALL THREE STAGES. Partial ASR -> LLM tokens -> TTS per\n#     SENTENCE. Chunk TTS at sentence boundaries: prosody needs a\n#     full clause, so per-token TTS sounds wrong.\n#  4. SPECULATE. Start the LLM on the partial transcript before the\n#     endpoint fires; discard if the user continues. Trades compute\n#     for latency, and compute is the cheaper resource here.\n\n# ★ AND MEASURE THE RIGHT NUMBER:\n#   report TTFA (time to first audio) at p50 AND p95 - not mean total.\n#   In a streaming system, total latency is a number no user experiences,\n#   and the TAIL is what people remember.",
          "caption": "Endpointing usually dominates and is a deliberate wait rather than a computation - which is why the first optimization is turn detection, not a faster model."
        },
        {
          "h": "Barge-in, and the two things it breaks",
          "paras": [
            "Interruption is what makes a voice agent feel conversational, and it creates a state problem the text version never has."
          ],
          "code": "# BARGE-IN: the user starts talking while the agent is speaking.\n# Required for a natural feel - and it breaks state in two ways.\n\n# BREAK 1 - WHAT DID THE USER ACTUALLY HEAR?\n#   You generated 40 words; playback reached word 12 when they cut in.\n#   The agent's own history must record WHAT WAS SPOKEN, not what was\n#   generated - otherwise it will refer back to something the user\n#   never heard, which is a uniquely confusing failure.\nspoken = truncate_at_playback_position(generated, ms_played)\nhistory.append(Assistant(spoken))          # NOT the full generation\n\n# BREAK 2 - THE SENSITIVITY TRADE, with no free setting:\n#   AGGRESSIVE -> triggers on backchannels (\"mhm\", \"right\", \"yeah\"),\n#                 so the agent stops constantly and feels timid\n#   CONSERVATIVE -> talks over a real interruption, which is the\n#                 rudest failure a voice product has\n#   The usable middle: require sustained speech (~300 ms) AND classify\n#   backchannel-vs-interruption on the partial transcript, not on\n#   energy alone. Echo cancellation is a hard prerequisite - without it\n#   the agent barges in on ITSELF.\n\n# AND THE THIRD STATE PROBLEM PEOPLE FORGET: the pipeline is still\n# running. Cancel the in-flight LLM and TTS calls on barge-in, or you\n# pay for tokens nobody hears - and risk queued audio playing later,\n# on top of the new turn.",
          "caption": "The agent's history must record what was SPOKEN, not what was generated - otherwise it refers back to words the user never heard."
        }
      ],
      "useCases": [
        "Phone-based support and scheduling systems, where the latency budget is unforgiving and the failure mode is a caller talking over an agent that will not stop.",
        "Hands-free and accessibility interfaces, where voice is not a convenience but the only channel and abstention behaviour matters more than fluency.",
        "In-car and embedded assistants, where network round trips are variable and a local wake-word plus endpointing stage is what keeps the budget viable.",
        "Any product deciding between a cascade and an end-to-end speech model, which is a trade of controllability and debuggability against latency and prosody."
      ],
      "pitfalls": [
        "Optimizing total latency in a streaming system. Time to first audio is what the user experiences, and it is roughly independent of response length - mean total latency measures something nobody feels.",
        "Ignoring endpointing. It is frequently the largest single item in the budget and it is a deliberate wait, so a fixed silence timer that is too long makes every turn sluggish and one that is too short cuts people off mid-sentence.",
        "Using word error rate as the quality metric. A 5% error rate concentrated on names and numbers breaks the task while 5% on function words is often absorbed by the model - measure task success, or weight errors by entity.",
        "Recording generated text rather than spoken text in the conversation history. After a barge-in the agent will refer to words the user never heard, which is confusing in a way text products never have to handle.",
        "Setting barge-in sensitivity by energy alone. Aggressive detection fires on backchannels like 'mhm' and makes the agent timid; conservative detection talks over real interruptions, which is the rudest failure the product has.",
        "Failing to cancel in-flight work on interruption. The LLM and TTS calls keep running, so you pay for tokens nobody hears and risk queued audio playing on top of the next turn.",
        "Letting the system prompt grow. Time-to-first-token scales with context length, so prompt bloat is a latency tax charged on every single turn of every conversation.",
        "Testing only on clean speech. Real traffic has accents, background noise, crosstalk and phone-quality audio, and a system tuned on clean recordings degrades exactly where the users are."
      ],
      "connections": [
        {
          "ref": "multimodal/stt-tts",
          "text": "The models inside the cascade - CTC versus attention versus transducer as a streaming choice, and why WER weights every word equally."
        },
        {
          "ref": "rag-agents/agent-loops",
          "text": "The same composition, in reliability rather than time: there each step multiplies a probability, here each stage adds milliseconds from a fixed total."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Why time-to-first-token is a prefill cost that scales with context, which is what makes prompt length a per-turn latency tax in a voice product."
        },
        {
          "ref": "rag-agents/guardrails",
          "text": "Voice raises the stakes on guardrails - there is no visual affordance for a citation or a warning, so the safe behaviour has to be in what the agent says and declines to say."
        },
        {
          "ref": "multimodal/audio-representations",
          "text": "The front end this all sits on, including why the phase problem exists and why vocoders are the reason synthesis is a separate hard problem."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the target end-to-end latency for a voice agent?",
          "a": "Under roughly 800 milliseconds. Human turn gaps sit around 200 milliseconds and perceived responsiveness degrades sharply beyond that ceiling."
        },
        {
          "q": "What is usually the biggest item in the budget?",
          "a": "Endpointing - the wait to be sure the user stopped talking. It is a deliberate delay of several hundred milliseconds, not a computation."
        },
        {
          "q": "Why is a fixed silence timer a poor endpoint detector?",
          "a": "Utterances contain long internal pauses - 'my number is four one five...' - so a short timer cuts people off and a long one makes every turn sluggish."
        },
        {
          "q": "What should you measure instead of total latency?",
          "a": "Time to first audio, at p50 and p95. In a streaming system total latency is a number no user experiences."
        },
        {
          "q": "Why is streaming TTFA roughly flat in response length?",
          "a": "The user hears the first sentence as soon as it is generated, so you pay for k tokens rather than N. Turn-based latency is linear in N."
        },
        {
          "q": "Why chunk TTS at sentence boundaries?",
          "a": "Prosody needs a full clause - intonation and stress depend on the whole phrase - so per-token synthesis sounds wrong."
        },
        {
          "q": "Why is WER a poor product metric?",
          "a": "It weights every word equally. Errors on names, numbers and identifiers break the task; errors on function words are often absorbed by the language model."
        },
        {
          "q": "What is barge-in?",
          "a": "The user speaking while the agent is talking. It is required for a natural feel and it creates a state problem text products never have."
        },
        {
          "q": "What must the history record after a barge-in?",
          "a": "What was actually SPOKEN, truncated at the playback position - not what was generated - or the agent refers to words the user never heard."
        },
        {
          "q": "What is the barge-in sensitivity trade?",
          "a": "Aggressive detection fires on backchannels like 'mhm' and makes the agent timid; conservative detection talks over real interruptions."
        },
        {
          "q": "Why does prompt length matter more in voice?",
          "a": "Time-to-first-token scales with context, so a bloated system prompt is a latency tax charged on every turn of every conversation."
        },
        {
          "q": "Cascade or end-to-end speech model?",
          "a": "The cascade is debuggable, swappable and controllable; end-to-end is lower latency and preserves prosody and emotion but is opaque and harder to constrain."
        }
      ],
      "standard": [
        {
          "q": "Walk me through the latency budget of a voice agent and how you would optimize it.",
          "a": "I WOULD WRITE THE BUDGET DOWN AS A SUM FIRST, because the ranking of items is usually not what people expect and optimizing without it produces effort in the wrong place. THE ITEMS, order-of-magnitude and to be measured on the actual stack: endpointing 200-800 milliseconds, streaming ASR finalization 50-200, LLM time-to-first-token 100-500, TTS time-to-first-audio 50-300, and network round trips 20-200 per hop. The target is under about 800 total, because human turn gaps sit near 200 milliseconds and perceived responsiveness falls off sharply past that. THE FIRST OBSERVATION: endpointing is frequently the LARGEST single item and it is a deliberate WAIT rather than a computation. So the first optimization in most voice systems is not a faster model, it is smarter turn detection - and a budget analysis that starts at the transcript has already skipped the biggest line. OPTIMIZATION 1 - SEMANTIC ENDPOINTING. A fixed silence timer is a bad detector because utterances contain long internal pauses; 'my number is four one five...' has gaps that look exactly like the end of a turn. A model that asks whether the utterance is COMPLETE - syntactically and semantically - can cut hundreds of milliseconds off a conservative timer without cutting people off, which is the single largest available win. OPTIMIZATION 2 - STREAM ALL THREE STAGES. Partial ASR results feed the model as they arrive, model tokens feed TTS as they are generated, and TTS synthesizes per SENTENCE. Sentence-level chunking matters because prosody needs a full clause; per-token synthesis sounds wrong. This changes the objective: TTFA becomes roughly flat in response length while turn-based latency is linear in it. OPTIMIZATION 3 - SHRINK THE PROMPT. TTFT is a prefill cost scaling with context length, so a large system prompt is a tax on every turn. Retrieved context has the same property, which makes voice a setting where retrieval must be tight rather than generous - a place where the earlier half of this module's 'retrieve more, rerank' advice actively conflicts with the latency budget and has to be traded explicitly. OPTIMIZATION 4 - SPECULATE. Start the model on the partial transcript before the endpoint fires and discard if the user continues. It trades compute for latency, and in this setting compute is the cheaper resource. OPTIMIZATION 5 - CO-LOCATE. Each network hop is 20-200 milliseconds and a naive architecture has four or five of them. Putting the stages in one region, or on device where possible, removes latency nobody has to optimize. WHAT I WOULD REPORT: TTFA at p50 and p95, and the per-stage breakdown so regressions are attributable. The p95 matters more than the mean here - conversation is a real-time interaction and users remember the turn that hung, not the average, which is the same tail argument that applies to any interactive system.",
          "deepDive": {
            "q": "How would you handle interruption and turn-taking properly?",
            "a": "TURN-TAKING IS THE HARDEST PART OF A VOICE AGENT AND IT IS MOSTLY NOT A MODEL PROBLEM - it is state management under a real-time constraint, and it is where products feel broken even when every component is accurate. THE FOUR PROBLEMS. (1) WHEN HAS THE USER FINISHED? Not a silence threshold, because pauses inside an utterance are common and long - mid-number, mid-list, thinking. What works is combining acoustic silence with a completeness judgement on the partial transcript, and adapting to context: after asking for a phone number, expect pauses and wait longer; after a yes/no question, a short silence is genuinely the end. Context-dependent endpointing is one of the largest quality wins available and it is rarely implemented. (2) WHEN IS THE USER INTERRUPTING VERSUS BACKCHANNELING? 'Mhm', 'right', 'yeah' are listening signals, not interruptions - a human speaker continues through them. If barge-in fires on those, the agent stops constantly and reads as timid and unreliable. If it never fires, the agent talks over a genuine interruption, which is the rudest failure the product has. The usable middle requires sustained speech, a few hundred milliseconds, AND classifies the partial transcript rather than deciding on energy alone. Echo cancellation is a hard prerequisite - without it the agent barges in on its own output, which produces spectacular failures. (3) WHAT DID THE USER ACTUALLY HEAR? This is the state bug that text systems never face. You generated forty words, playback reached word twelve, the user interrupted. The conversation history must record the TRUNCATED text, cut at the playback position, because the agent referring back to something the user never heard is uniquely confusing - it reads as the agent being confidently wrong about a shared conversation. This requires the audio player to report its position back into the dialogue state, which is a plumbing requirement that is easy to omit and hard to diagnose later. (4) WHAT IS STILL RUNNING? On barge-in the model and TTS calls are still in flight. Cancel them, or you pay for tokens nobody hears and risk queued audio playing on top of the next turn. Cancellation has to propagate through every stage, which means every stage needs a cancellation path - another plumbing requirement that gets discovered in production. THE BEHAVIOURS THAT MAKE IT FEEL HUMAN, beyond correctness. Filled pauses and acknowledgements while thinking, so silence does not read as a hang - though these should be honest rather than decorative. Yielding gracefully: when interrupted, stop and LISTEN rather than finishing the sentence. Handling overlap, since both parties sometimes speak at once and someone has to yield. And responding to what was actually said rather than restarting the turn, which requires the truncation state from problem three to be correct. HOW I WOULD EVALUATE IT, since none of this shows up in WER or task success: build a suite of recorded interaction PATTERNS - interruption at various points, backchannels during a long answer, pauses mid-utterance, overlapping speech, silence after a question - and score the behaviour on each. That is the only way turn-taking quality becomes a measurement rather than a matter of whether the demo went well, and it is the difference between a voice product that feels natural and one that is merely accurate."
          }
        },
        {
          "q": "Cascade or end-to-end speech model - how would you choose?",
          "a": "BY WHAT I NEED TO CONTROL AND WHAT I NEED TO DEBUG, because that is where the two architectures genuinely differ. THE CASCADE - speech to text, text to a language model, text to speech - has three properties that matter in production. It is DEBUGGABLE: when the answer is wrong you can read the transcript and see immediately whether ASR misheard or the model misreasoned, which localizes the failure to a stage. It is SWAPPABLE: each component can be upgraded independently, and you can mix providers or run one stage on device. And it is CONTROLLABLE: the text in the middle is where every guardrail, retrieval call, tool call and content filter lives - the whole apparatus of a text-based agent applies directly, because there IS text. THE COSTS. Latency adds up across stages. Information is lost at the text boundary: tone, emotion, emphasis, hesitation, and often the speaker's identity all vanish when speech becomes a transcript, so the model cannot know the user sounded frustrated or was unsure. And errors compound - a misheard entity is unrecoverable downstream, because the model receives a confident wrong transcript with no signal that it was uncertain. THE END-TO-END SPEECH MODEL takes audio in and produces audio out. It is lower latency because there are fewer stages and no text serialization. It PRESERVES paralinguistic information - it can hear frustration and respond to it, and produce genuinely expressive speech rather than reading text aloud. And it can handle full-duplex interaction, listening while speaking, which is what makes overlap and backchannels feel natural rather than mechanical. ITS COSTS ARE THE MIRROR IMAGE. It is opaque - a wrong answer has no transcript to inspect, so debugging is much harder. It is difficult to constrain: tool calling, retrieval and content filtering all assume a text interface, and they have to be reintroduced somehow. It is harder to evaluate for the same reason. And the model choice is coupled - you cannot swap the reasoning model without swapping the voice. HOW I WOULD DECIDE. For most products today I would build the CASCADE, because controllability and debuggability dominate in anything doing real work - tool calls, retrieval, policy compliance - and because the ecosystem of guardrails assumes text. I would choose end-to-end when the interaction quality IS the product - companionship, language practice, anything where prosody and interruption dynamics carry the value - and when the tasks are simple enough that losing tool control is acceptable. THE HYBRID that I think is where this is heading: an end-to-end model for the conversational surface, with a text path for anything requiring tools, retrieval or verification. That keeps the responsiveness where it is felt and the control where it is needed. AND THE MEASUREMENT that decides it honestly: build the same task suite for both, and report task success, TTFA at p95, and a human rating of interaction quality. The cascade usually wins the first, the end-to-end model usually wins the last two, and which of those your product is actually about is the real question."
        },
        {
          "q": "How would you evaluate a voice agent?",
          "a": "IN THREE LAYERS, BECAUSE THE OBVIOUS METRIC MEASURES THE WRONG THING. Word error rate is the number everyone reaches for and it weights every word equally - so a 5% WER concentrated on names, numbers and product identifiers is a broken product, while 5% spread across function words is often invisible because the language model reconstructs intent from context. Optimizing WER can therefore make the product worse if the gains come on words that did not matter. LAYER 1 - COMPONENT METRICS, useful for regression detection and useless as a product measure. WER, and more usefully an ENTITY error rate computed only over the terms that drive the action - names, numbers, dates, product codes. Also ASR latency and TTS naturalness. I would treat these as diagnostics, not as goals. LAYER 2 - TASK SUCCESS, end to end, on realistic audio. This is the number that matters: did the caller accomplish what they called to do. It has to be measured on REAL audio conditions - accents, background noise, phone-quality codecs, crosstalk - because a system tuned on clean recordings degrades exactly where the users are, and that gap is large. I would stratify success by condition so the degradation is visible rather than averaged away. LAYER 3 - INTERACTION QUALITY, which is unique to voice and where the product is usually won or lost. TTFA at p50 and p95, not mean total latency. Interruption handling, scored on a suite of recorded patterns: interruption at various points in a response, backchannels during a long answer, pauses mid-utterance, overlapping speech, silence after a question. Turn-taking naturalness. And the rate of talking over the user, which is the failure people remember. THE DATASET THAT MAKES IT REAL, and it is the part that takes actual work: recorded interactions covering the conditions above, not scripted clean speech. I would build it from real traffic where possible, keep the hard cases, and add every production complaint as a permanent case. Synthetic audio - TTS output fed back into ASR - is useful for scale and systematically flatters the system, because it lacks disfluency, noise and accent variation. WHAT I WOULD ALSO WATCH IN PRODUCTION, label-free: barge-in rate, which rises when the agent is too verbose or too slow; repeat and rephrase rate, a strong implicit failure signal; call abandonment; escalation to a human; and silence timeouts, which usually mean endpointing is misconfigured. AND THE ONE THAT REVEALS MOST: listen to recordings. Voice failures are frequently obvious in five seconds of audio and invisible in the metrics - an agent that is technically correct but sounds robotic, interrupts, or leaves awkward gaps will fail commercially while scoring well on every number above. This is one of the few places where I would insist that the team regularly consume the raw artefact rather than the dashboard."
        },
        {
          "q": "How does RAG change inside a voice agent?",
          "a": "IT GETS HARDER IN THREE SPECIFIC WAYS, and each one puts the earlier half of this module in direct conflict with the latency budget. CONFLICT 1 - RETRIEVAL COSTS TIME YOU DO NOT HAVE. In a text product, adding a retrieval call plus a reranker is a few hundred milliseconds nobody notices. In voice, that is most of the budget. So the generous advice from 18-03 - retrieve deep, rerank, maybe rewrite the query first - directly opposes the constraint here, and the trade has to be made explicitly rather than inherited. WHAT I WOULD DO: run retrieval SPECULATIVELY on the partial transcript before endpointing fires, so it overlaps with the wait rather than following it; cache aggressively, since voice traffic is repetitive; and use a smaller k with a tighter index rather than a deep retrieve-and-rerank funnel. CONFLICT 2 - CONTEXT LENGTH IS A PER-TURN TAX. TTFT scales with prefill, so every retrieved chunk is paid for in time-to-first-audio on every turn. In text you would happily put ten passages in the context; in voice, five hundred extra tokens is a perceptible delay. This makes retrieval PRECISION matter much more than recall relative to a text product - a rare inversion of the module's usual emphasis, and worth naming because the instinct carried over from text is wrong here. CONFLICT 3 - THE ANSWER MUST BE SPEAKABLE. This is the one people underestimate. A retrieved passage cannot be read aloud: no bullet points, no tables, no URLs, no citation markers, and no long enumerations, because a listener cannot skim, cannot re-read, and cannot hold nine items in memory. So the generation constraint is different in kind - short, linear, one idea per sentence, with the key fact FIRST rather than after a preamble, since the user may interrupt. And provenance is a real problem: 'according to the 2024 policy document' is the only citation available when there is no screen, which means source attribution has to be spoken and therefore has to be brief. THE ABSTENTION POINT IS SHARPER TOO. In text a hedged answer with citations lets the user judge for themselves; in voice there is no affordance for that - the user hears a confident sentence and has no way to check it. So the threshold for declining should be more conservative, and the decline itself should be useful: 'I don't have that, but I can tell you about X' rather than a flat refusal. WHAT STAYS THE SAME: every ceiling from earlier in the module. If the answer is not in the corpus, or chunking split it, no amount of voice engineering helps - and it fails more expensively, because the user is on a call. AND ONE THING GETS EASIER: queries are usually shorter and more conversational, which suits dense retrieval and makes query rewriting genuinely valuable, since 'what about the other one' needs the conversation history folded in before it can be retrieved against at all."
        },
        {
          "q": "What breaks when a voice agent meets real-world audio?",
          "a": "ALMOST EVERYTHING THAT WAS TUNED ON CLEAN SPEECH, and the gap between demo audio and production audio is the largest single source of unpleasant surprises in voice products. THE CONDITIONS THAT ACTUALLY OCCUR. Telephone audio is narrowband and heavily compressed, so a model trained on wideband recordings loses accuracy immediately - and phone is exactly the channel where voice agents get deployed. Background noise: traffic, offices, kitchens, other people talking. Accents and dialects, where error rates vary substantially across speaker groups, which is a fairness problem as much as a quality one and needs to be measured per group rather than in aggregate. Disfluency - real speech has restarts, filler, repairs, half-finished sentences - where clean training data has none. And CROSSTALK, where a second person speaks and the system has no notion of who it is talking to. WHAT EACH ONE BREAKS. Noise degrades ASR, and the damage concentrates on exactly the high-information words - names, numbers, identifiers - because those are short, unpredictable and unrecoverable from context, which is also why plain WER understates the harm. Disfluency breaks ENDPOINTING more than transcription: a restart looks like the end of a turn, so the agent interrupts. Accents shift the error distribution unevenly, so an aggregate WER can look acceptable while one user group is unusable. Crosstalk breaks turn-taking entirely, because the system responds to speech that was not addressed to it. THE MITIGATIONS, in the order I would apply them. Test on the real distribution first - that is not a mitigation but it is the prerequisite, and it usually reverses assumptions about where the problem is. Then: use a model trained or fine-tuned on your channel, since telephone-specific models exist and matter; add noise suppression and echo cancellation before ASR rather than hoping the model absorbs it; bias the recognizer toward your domain vocabulary, since contextual biasing on product names, customer names and identifiers is one of the largest available wins and is frequently unused; and make endpointing disfluency-aware, because a semantic completeness judgement handles a restart that a silence timer cannot. THE DESIGN RESPONSES that matter more than model quality. CONFIRM the high-stakes fields rather than trusting them - read back a phone number or an amount, which converts a silent transcription error into a caught one, and costs one turn. Give the user an easy repair path, because 'no, I said...' is going to happen and handling it gracefully is worth more than a point of WER. And degrade honestly: 'I'm having trouble hearing you' is better than confidently acting on a bad transcript, which is the abstention principle from 18-05 arriving in the audio channel. WHAT I WOULD MEASURE: task success stratified by condition - channel, noise level, accent group - so degradation is visible rather than averaged away. An aggregate number over a mixed population hides exactly the segment that is failing, which is the same structural blindness this module keeps finding in aggregates."
        },
        {
          "q": "How does this lesson fit the module's framing?",
          "a": "IT IS THE MODULE'S COMPOSITION STRUCTURE IN A DIFFERENT CURRENCY, and seeing the same shape in a new dimension is what makes the framing worth having. In 18-06 the loop composed RELIABILITIES and the factors multiplied below one. Here the cascade composes LATENCIES and they add, against a fixed ceiling set by human conversational expectation rather than by anything in the system. Different arithmetic, identical consequence: no single stage owns the outcome, an aggregate number cannot tell you which stage to fix, and adding a component is never free. THE SHARPEST TRANSFERABLE POINT is that the dominant term is usually the one nobody counts. In RAG it was chunking - a boring ingestion parameter upstream of the interesting model. Here it is ENDPOINTING - a deliberate wait that is not a computation at all, sitting upstream of every model in the pipeline. In both cases attention flows to the visible expensive component and the binding constraint is somewhere unglamorous. That pattern has now appeared enough times in this module that it is worth treating as a prior: when you first look at a composed system, suspect the cheapest, least interesting stage. THE SECOND POINT is about measuring the right quantity, which connects to 18-05 and to 17-10. Total latency is the obvious metric and in a streaming system it is a number no user experiences - TTFA is. Word error rate is the obvious quality metric and it weights every word equally, so it can improve while the product gets worse. Both are instruments answering a different question from the one being asked, correctly, which is the failure that recurs across this whole curriculum. The correction is the same: pick the metric that moves when the thing you care about moves, and here that means TTFA at p95 and task success, not mean latency and WER. AND IT SETS UP THE STAKES FOR 18-09. Voice removes the affordances that make a text agent's mistakes survivable. There is no citation to click, no hedge the user can weigh, no ability to skim or re-read - just a confident sentence arriving in real time. That makes abstention and guardrails more important here than anywhere else in the module, and it is a good place to arrive at the lesson where composition finally works in your favour."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The budget is a SUM with a hard ceiling",
        "back": "T = endpoint(200–800ms) + ASR + TTFT + TTS-first + network ≲ 800 ms. Human turn gaps ≈ 200 ms. Same composition as the rest of the module, in the TIME currency: latencies ADD where reliabilities MULTIPLY."
      },
      {
        "type": "intuition",
        "front": "★ The biggest item is the one nobody counts",
        "back": "ENDPOINTING — the wait to be sure the user stopped. It's a deliberate DELAY, not a computation, and it's upstream of every model. Same pattern as chunking in RAG: suspect the cheapest, least interesting stage first."
      },
      {
        "type": "formula",
        "front": "Why streaming changes the OBJECTIVE",
        "back": "turn-based: t_pre + N·t_dec + TTS(N) — LINEAR in response length. streaming: t_pre + k·t_dec + TTS(k), k≪N — roughly FLAT. So report TTFA at p50/p95; mean total latency is a number no user experiences."
      },
      {
        "type": "pitfall",
        "front": "A fixed silence timer is a bad endpoint detector",
        "back": "\"my number is four one five…\" has pauses that look exactly like the end of a turn. Use SEMANTIC endpointing (is the utterance complete?) and make it context-dependent — wait longer after asking for a number."
      },
      {
        "type": "formula",
        "front": "Task success ≠ f(WER)",
        "back": "WER = (S+D+I)/N weights every word EQUALLY. 5% on names/numbers/IDs breaks the task; 5% on function words is absorbed by the LM. Use an ENTITY error rate, and measure task success end-to-end."
      },
      {
        "type": "pitfall",
        "front": "★ Record what was SPOKEN, not what was generated",
        "back": "You generated 40 words, playback reached 12, the user interrupted. History must store the truncation at the playback position — otherwise the agent refers to words the user never heard. Needs the player to report position into dialogue state."
      },
      {
        "type": "intuition",
        "front": "The barge-in sensitivity trade",
        "back": "AGGRESSIVE → fires on backchannels (\"mhm\", \"right\") → the agent feels timid. CONSERVATIVE → talks over real interruptions → the rudest failure the product has. Middle: sustained speech (~300 ms) AND classify the partial transcript, not energy. Echo cancellation is a prerequisite."
      },
      {
        "type": "pitfall",
        "front": "Cancel the in-flight work",
        "back": "On barge-in the LLM and TTS calls are still running: you pay for tokens nobody hears and risk queued audio playing over the next turn. Cancellation must propagate through EVERY stage — a plumbing requirement usually discovered in production."
      },
      {
        "type": "intuition",
        "front": "Chunk TTS at SENTENCE boundaries",
        "back": "Prosody needs a full clause — intonation and stress depend on the whole phrase — so per-token synthesis sounds wrong. Stream all three stages, but chunk the last one semantically."
      },
      {
        "type": "intuition",
        "front": "Cascade vs end-to-end",
        "back": "CASCADE: debuggable (read the transcript), swappable, controllable (guardrails/tools/retrieval all assume TEXT). END-TO-END: lower latency, keeps prosody/emotion, full-duplex — but opaque, hard to constrain, hard to evaluate. Most real products: cascade."
      },
      {
        "type": "pitfall",
        "front": "RAG inverts inside a voice agent",
        "back": "Retrieval costs budget you don't have (speculate on the PARTIAL transcript), context length is a per-turn TTFT tax (so PRECISION beats recall — the opposite of the usual emphasis), and the answer must be SPEAKABLE: no bullets, no tables, key fact FIRST."
      },
      {
        "type": "intuition",
        "front": "Listen to the recordings",
        "back": "Voice failures are obvious in five seconds of audio and invisible in the metrics. An agent that is accurate but robotic, interrupts, or leaves awkward gaps fails commercially while scoring well on every number."
      }
    ],
    "refs": [
      {
        "title": "Radford et al. (2022), Robust Speech Recognition via Large-Scale Weak Supervision (Whisper)",
        "url": "https://arxiv.org/abs/2212.04356"
      },
      {
        "title": "Graves et al. (2006), Connectionist Temporal Classification",
        "url": "https://www.cs.toronto.edu/~graves/icml_2006.pdf"
      },
      {
        "title": "He et al. (2019), Streaming End-to-End Speech Recognition for Mobile Devices (RNN-T)",
        "url": "https://arxiv.org/abs/1811.06621"
      },
      {
        "title": "Kim, Kong & Son (2021), VITS: Conditional VAE with Adversarial Learning for End-to-End TTS",
        "url": "https://arxiv.org/abs/2106.06103"
      },
      {
        "title": "Defossez et al. (2024), Moshi: A Speech-Text Foundation Model for Real-Time Dialogue",
        "url": "https://arxiv.org/abs/2410.00037"
      }
    ],
    "demos": [
      "spectrogram",
      "beam-search",
      "decoding",
      "kv-cache"
    ],
    "demoTitles": {
      "spectrogram": "Spectrogram (STFT)",
      "beam-search": "Beam Search Tree",
      "decoding": "Decoding Strategies",
      "kv-cache": "KV Cache"
    }
  }
};
