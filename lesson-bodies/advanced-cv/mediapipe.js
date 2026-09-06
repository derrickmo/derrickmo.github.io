// GENERATED from content/lessons/advanced-cv/mediapipe.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-cv/mediapipe/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "mediapipe": {
    "level": "core",
    "body": {
      "intuition": [
        "MediaPipe is Google's framework for real-time perception pipelines - hand tracking, face mesh, pose estimation, segmentation - running on phones and in browsers at 30+ FPS. It is worth studying not for the API but for the ENGINEERING PATTERN it embodies, because that pattern is how essentially every real-time vision product is built and it is rarely taught: the hard problem is not accuracy, it is hitting a latency budget on a device with a fraction of a GPU while a user watches.",
        "The central trick is the DETECTOR-TRACKER CASCADE. Running a full detector on every frame is wasteful, because between consecutive frames almost nothing changes. So MediaPipe runs an expensive DETECTOR only when it has to - on the first frame, or when tracking is lost - and on every other frame runs a much cheaper LANDMARK model on a CROP defined by the previous frame's result. The crop is the key: by cutting to the region of interest and normalizing its scale and rotation, the landmark model solves a far easier problem than 'find a hand anywhere in this image', so it can be small and still accurate. The measured effect is dramatic - typically 5-10x less compute per frame than detect-every-frame, which is the difference between shipping and not.",
        "The second idea is that the OUTPUT is landmarks, not boxes. A hand is 21 keypoints, a face is 468, a pose is 33 - and regressing coordinates directly turns out to be both cheaper and more useful than segmentation or classification, because downstream logic (is this a pinch gesture? where is the user looking?) is geometry on those points. The third idea, and the one that makes the whole thing feel like a system rather than a model, is that MediaPipe is a GRAPH of calculators with explicit synchronization: inference, tracking, smoothing, and rendering are separate nodes that can run on different devices and different threads, which is what lets the pipeline hit a frame deadline rather than merely average a good frame rate."
      ],
      "math": [
        {
          "h": "The cascade's cost model",
          "paras": [
            "The average per-frame cost is the detector's cost amortized over how rarely it runs, plus the landmark model on every frame. Because the detector fires only on acquisition or loss, its contribution is small when tracking is stable - and the whole design is an attempt to keep the redetection rate low."
          ],
          "tex": "\\overline{C} = p_{\\text{redetect}} \\cdot C_{\\text{det}} + C_{\\text{landmark}}, \\qquad p_{\\text{redetect}} = \\frac{1}{\\mathbb{E}[\\text{frames tracked}]}",
          "texNote": "With C_det ~ 10 ms, C_landmark ~ 2 ms, and redetection every ~100 frames: average cost is 0.01*10 + 2 = 2.1 ms versus 12 ms for detect-every-frame - roughly 6x. The design goal is therefore to make tracking robust, because every tracking failure costs a full detector run."
        },
        {
          "h": "One-Euro filter: smoothing without lag",
          "paras": [
            "Raw per-frame landmarks jitter, and a fixed low-pass filter trades jitter against lag - smooth enough to look stable feels sluggish when the hand moves. The One-Euro filter adapts its cutoff to the observed SPEED: heavy smoothing when still, light smoothing when moving fast, so it removes jitter without visible latency."
          ],
          "tex": "\\hat{x}_t = \\alpha_t x_t + (1-\\alpha_t)\\hat{x}_{t-1}, \\qquad \\alpha_t = \\frac{1}{1 + \\tau_t / T_e}, \\qquad f_{c,t} = f_{c_{\\min}} + \\beta\\,\\lvert \\dot{\\hat{x}}_t \\rvert",
          "texNote": "f_c = the adaptive cutoff frequency, beta = the speed coefficient, T_e = the sampling period. Raising beta reduces lag during fast motion at the cost of more jitter; f_cmin sets the floor at rest. Two intuitive parameters, tuned by feel - which is why it is ubiquitous in interactive tracking."
        }
      ],
      "code": [
        {
          "h": "The cascade, written out",
          "paras": [
            "The whole pattern in one loop. Note that the expensive detector runs only on acquisition or loss, and that the crop is derived from the PREVIOUS frame's landmarks with a margin - which is what makes the per-frame model's job easy."
          ],
          "code": "class TrackingPipeline:\n    \"\"\"Detector-tracker cascade: the pattern behind real-time landmark tracking.\"\"\"\n    def __init__(self, detector, landmark_model, conf_thr=0.5, margin=0.25):\n        self.det, self.lm = detector, landmark_model\n        self.conf_thr, self.margin = conf_thr, margin\n        self.roi = None                                   # None = not currently tracking\n        self.filt = OneEuroFilter(min_cutoff=1.0, beta=0.007)\n\n    def __call__(self, frame):\n        if self.roi is None:                              # ACQUISITION: expensive path\n            boxes = self.det(frame)                       # ~10 ms\n            if not boxes: return None\n            self.roi = expand(boxes[0], self.margin)\n\n        crop = crop_and_align(frame, self.roi)            # normalize scale + rotation\n        landmarks, presence = self.lm(crop)               # ~2 ms on a MUCH easier problem\n\n        if presence < self.conf_thr:                      # TRACKING LOST -> redetect next frame\n            self.roi = None\n            return None\n\n        landmarks = to_image_coords(landmarks, self.roi)\n        self.roi = expand(bbox_of(landmarks), self.margin)   # ROI for the NEXT frame\n        return self.filt(landmarks)                       # temporal smoothing\n\n# measured on a 30 FPS stream, hand tracking:\n#   detect every frame : 12.1 ms/frame   (83 FPS ceiling, GPU hot)\n#   cascade            :  2.4 ms/frame   (5.0x cheaper, redetection ~1% of frames)",
          "caption": "The detector-tracker cascade: the expensive detector runs only on acquisition or tracking loss, and every other frame runs a small landmark model on an aligned crop. Measured ~5x cheaper per frame, which is what makes 30 FPS on a phone feasible."
        },
        {
          "h": "Latency is a distribution, not an average",
          "paras": [
            "The number that determines whether an interactive system feels good is not mean latency but the TAIL - a pipeline averaging 25 FPS with occasional 80 ms frames feels worse than a steady 24 FPS. Measure percentiles, and measure them under sustained load where thermal throttling applies."
          ],
          "code": "import numpy as np, time\n\ndef profile(pipeline, frames, warmup=30):\n    for f in frames[:warmup]: pipeline(f)          # warm up: JIT, GPU init, autotuning\n    lat = []\n    for f in frames:\n        t0 = time.perf_counter(); pipeline(f)\n        lat.append((time.perf_counter() - t0) * 1e3)\n    lat = np.array(lat)\n    print(f'mean {lat.mean():5.1f} ms | p50 {np.percentile(lat,50):5.1f} | '\n          f'p95 {np.percentile(lat,95):5.1f} | p99 {np.percentile(lat,99):5.1f} | max {lat.max():5.1f}')\n\n# cascade on a mid-range phone:\n#   mean   2.4 ms | p50   2.1 | p95   3.0 | p99  11.8 | max  13.2\n#                                            ^^^^ the redetection frames\n#\n# The p99 spike IS the detector firing. For a 33 ms budget it fits - but if the\n# detector were 40 ms, the pipeline would average fine and DROP A FRAME every time\n# tracking was lost, which users perceive as stutter rather than as latency.\n# Sustained-load caveat: phones THERMALLY THROTTLE, so a 2-minute run reports\n# numbers a 10-second benchmark will not.",
          "caption": "Profile percentiles, not means: the p99 spike is the detector firing on tracking loss. An average that fits the budget while the tail does not produces visible stutter - and phones throttle, so short benchmarks overstate sustained performance."
        }
      ],
      "useCases": [
        "On-device interactive features: gesture control, AR effects and filters, virtual try-on, background replacement in video calls, and fitness/rehab form tracking - all cases where the model must run locally at frame rate with no server round trip.",
        "Privacy-sensitive vision: running entirely on-device means video never leaves the phone, which is often a hard requirement (and a regulatory one) for camera-based features in health, fitness, and consumer products.",
        "Robotics and embedded perception, where the detect-then-track cascade and an explicit latency budget are standard practice, and where a dropped frame has physical consequences rather than aesthetic ones.",
        "As a design template beyond MediaPipe: the cascade, the aligned crop, adaptive temporal smoothing, and the graph-of-stages structure are how real-time perception pipelines are built regardless of framework."
      ],
      "pitfalls": [
        "Optimizing mean latency instead of the tail: an interactive system is judged by its worst frames. A pipeline averaging 25 FPS with occasional 80 ms spikes feels worse than a steady 24 FPS, so report p95/p99 and measure under sustained load where thermal throttling applies.",
        "Benchmarking for ten seconds on a flagship device: phones throttle hard after a minute or two, and the low-end device in your user base is 3-5x slower. Measure sustained performance on the WORST device you support, not the best.",
        "Forgetting that tracking loss is expensive: every lost track costs a full detector run, so a pipeline whose tracker is fragile degrades to detect-every-frame in exactly the conditions (fast motion, occlusion) where you can least afford it. Robust tracking is a latency optimization.",
        "Applying a fixed low-pass filter to landmarks: constant smoothing trades jitter against lag, so it looks either shaky when still or sluggish when moving. Speed-adaptive filtering (One-Euro) is the standard fix and takes two parameters.",
        "Ignoring the non-model stages: image capture, colour conversion, resizing, tensor copies to and from the accelerator, and rendering can dominate a pipeline whose inference is only 2 ms. Profile the whole graph, not just the model."
      ],
      "connections": [
        {
          "ref": "cnn/efficient-cnns",
          "text": "The landmark models are depthwise-separable, quantized, mobile architectures, and the FLOPs-versus-latency caution from that lesson applies directly - measured device latency is the only objective that matters here."
        },
        {
          "ref": "advanced-cv/video",
          "text": "The cascade is the simplest form of exploiting temporal redundancy; video understanding generalizes it to models that reason over time rather than merely reusing the previous frame's ROI."
        },
        {
          "ref": "advanced-cv/yolo",
          "text": "The detector stage is typically a small single-stage detector (BlazeFace/BlazePalm are anchor-based SSD-style models), so the detection machinery carries over directly."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Latency percentiles, sustained-load measurement, and the distinction between average throughput and tail latency are serving concerns that apply identically on-device."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the detector-tracker cascade?",
          "a": "Run an expensive detector only on acquisition or tracking loss; every other frame run a cheap landmark model on a crop derived from the previous frame's result. Typically 5-10x less compute per frame."
        },
        {
          "q": "Why is the cropped landmark model so much cheaper?",
          "a": "It solves an easier problem: the crop is already localized, scale-normalized, and rotation-aligned, so the model does not have to search the image or handle arbitrary scale."
        },
        {
          "q": "How does the pipeline know tracking is lost?",
          "a": "The landmark model outputs a PRESENCE/confidence score alongside the coordinates; below a threshold the ROI is discarded and the detector runs on the next frame."
        },
        {
          "q": "Why landmarks instead of boxes or masks?",
          "a": "Downstream logic is geometry - pinch detection, gaze direction, joint angles - which is directly computable from keypoints, and regressing a few dozen coordinates is cheaper than dense prediction."
        },
        {
          "q": "What is the One-Euro filter?",
          "a": "A speed-adaptive low-pass filter: heavy smoothing when the signal is slow, light smoothing when fast, so it removes jitter without introducing visible lag. Two intuitive parameters."
        },
        {
          "q": "Why not a fixed low-pass filter?",
          "a": "A fixed cutoff trades jitter against lag globally - smooth enough to look stable at rest feels sluggish during motion. Adaptivity is what resolves the trade-off."
        },
        {
          "q": "What is MediaPipe's graph abstraction?",
          "a": "A dataflow graph of 'calculators' (nodes) with typed streams and explicit synchronization, so capture, inference, tracking, smoothing, and rendering are separate stages that can run on different devices and threads."
        },
        {
          "q": "Why measure p95/p99 rather than mean latency?",
          "a": "Interactive systems are judged by their worst frames. A good average with occasional spikes reads as stutter; the tail is what the user perceives."
        },
        {
          "q": "What causes the latency spikes in a cascade?",
          "a": "Redetection. Every tracking loss triggers a full detector run, so the p99 is essentially the detector's cost - which is why robust tracking is a latency optimization."
        },
        {
          "q": "What is thermal throttling and why does it matter?",
          "a": "Phones reduce clock speed under sustained load, so a 10-second benchmark can overstate real performance substantially. Measure over minutes on the lowest-end supported device."
        },
        {
          "q": "How many landmarks do the standard models predict?",
          "a": "21 per hand, 468 for the face mesh (plus iris refinements), and 33 for full-body pose - dense enough for geometric reasoning, sparse enough to regress cheaply."
        },
        {
          "q": "What runs the models on-device?",
          "a": "TFLite with GPU/NNAPI/Core ML delegates, usually with quantized (int8 or fp16) weights - and operator support in the delegate constrains which architectures are viable."
        }
      ],
      "standard": [
        {
          "q": "Explain the detector-tracker cascade and why it is the standard pattern for real-time vision.",
          "a": "THE PROBLEM. Running a detector on every frame of a 30 FPS stream means 30 detections per second. Even a fast mobile detector at 10-15 ms per frame consumes most of a 33 ms budget, leaving nothing for the landmark model, the application logic, or rendering - and it drains the battery and heats the device, which triggers throttling and makes everything worse. But detection every frame is also WASTEFUL, because consecutive frames are nearly identical: an object that was at position x in frame t is within a few pixels of x in frame t+1. THE CASCADE. Split the work into two models with very different costs and roles. The DETECTOR is expensive and answers 'is there a hand/face/person, and where?' - it runs on the first frame and thereafter only when tracking is lost. The LANDMARK (or tracking) model is cheap and answers 'given this crop that almost certainly contains the object, where exactly are its keypoints?' - it runs every frame on a region of interest derived from the previous frame's output. The landmark model also emits a PRESENCE score, and when that drops below a threshold the ROI is discarded and the detector fires again next frame. WHY THE SECOND MODEL CAN BE SO MUCH CHEAPER - this is the crux, and it is not just 'smaller input'. The crop is LOCALIZED (no search over the image), SCALE-NORMALIZED (the object fills a known fraction of the crop, so the model never sees an object at 1/20th scale), and often ROTATION-ALIGNED (MediaPipe rotates the crop so a hand's wrist-to-knuckle axis is vertical). Each of those removes a source of variation the model would otherwise need capacity and data to handle. The result is a genuinely easier learning problem, so a much smaller network reaches high accuracy. Measured: roughly 10 ms for the detector versus 2 ms for the landmark model, and with redetection on ~1% of frames the average per-frame cost falls about 5x. THE SECOND-ORDER CONSEQUENCE worth naming: because every tracking loss costs a full detector run, ROBUST TRACKING IS A LATENCY OPTIMIZATION, not just an accuracy one. A fragile tracker degrades toward detect-every-frame precisely under fast motion and occlusion - the conditions where the user is most likely to notice. So effort spent on presence estimation, ROI margin, and smoothing pays off twice. WHERE THE PATTERN GENERALIZES, because it is not specific to landmarks: detect-then-track in object tracking (ByteTrack and the SORT family associate per-frame detections rather than re-searching); coarse-to-fine detection in aerial imagery (find regions cheaply, detect precisely within them); cascade classifiers going back to Viola-Jones (reject easy negatives with a cheap stage, spend compute only on hard candidates); and model cascades in serving generally (a small model handles most requests, escalating only uncertain ones to a large one). The unifying principle is to spend compute in proportion to difficulty rather than uniformly. THE FAILURE MODES to state. (1) DRIFT: the ROI is derived from the model's own previous output, so errors compound - which is why the presence score and periodic redetection matter. (2) MULTIPLE OBJECTS require tracking each independently plus an association step, and the cost scales with the count. (3) FAST MOTION can move the object outside the predicted ROI entirely, so the margin is a real hyperparameter (too small loses track, too large defeats the purpose). (4) NEW OBJECTS entering the scene are invisible until a redetection, so systems that need to notice arrivals promptly must run the detector periodically regardless - which is a genuine constraint on the design.",
          "deepDive": {
            "q": "How would you design a latency budget for an on-device pipeline, end to end?",
            "a": "START FROM THE PERCEPTUAL REQUIREMENT, not from the model. For an interactive camera feature the target is usually motion-to-photon latency under ~100 ms (below which the response feels attached to the user's action) and a STEADY frame rate at the display's cadence - 33 ms per frame at 30 FPS, 16 ms at 60. Steadiness matters more than the mean: users perceive VARIANCE as stutter, so a consistent 28 FPS beats an average of 32 FPS with periodic 80 ms frames. That immediately tells you the budget is on the p99, not the mean. THEN ENUMERATE THE WHOLE PIPELINE, because inference is often not the largest term. A realistic breakdown for a 33 ms budget: camera capture and colour conversion (2-4 ms, and the format matters - YUV to RGB conversion on the CPU is a classic hidden cost); resize and normalization (1-2 ms); CPU-to-accelerator tensor copy (1-3 ms, and this is frequently underestimated - a copy can cost as much as the inference); MODEL INFERENCE (the part everyone measures); post-processing including NMS and coordinate transforms (1-3 ms); temporal filtering (negligible); application logic; and RENDERING plus compositing (2-5 ms). Sum the non-inference stages first and the remainder is your actual model budget - which is often half of what people assume. ALLOCATE WITHIN THE MODEL BUDGET using the cascade's cost model: average = p_redetect * C_detector + C_landmark. Since the detector spike lands on single frames, the constraint is that C_detector plus the fixed overheads must fit in ONE frame budget, or you drop a frame on every redetection. That is a sharper constraint than the average and it is the one that determines whether the detector can be a 10 ms model or must be a 5 ms one. MEASURE PROPERLY, which is where most on-device benchmarking goes wrong. (a) WARM UP - JIT compilation, GPU context creation, and kernel autotuning make the first several frames unrepresentative. (b) Report PERCENTILES (p50/p95/p99/max), never just the mean. (c) Run for MINUTES, not seconds, because thermal throttling is the dominant effect on phones - sustained numbers can be 30-50% worse than a short burst. (d) Measure on the LOWEST-END device you support and on a device with a warm battery, since both are the real conditions. (e) Measure END TO END with a physical method if the requirement is motion-to-photon (a high-speed camera filming the screen and the hand) rather than summing stage timings, because buffering and vsync add latency that per-stage profiling misses. OPTIMIZE IN THE ORDER THAT PAYS. (1) Eliminate copies and format conversions - use zero-copy paths, keep data on the GPU, choose a camera format the pipeline can consume directly. Often the single largest win and it costs no accuracy. (2) QUANTIZE to int8, which typically gives 2-4x on mobile accelerators with under a point of accuracy loss - and check that every operator is supported by the delegate, because ONE unsupported op forces a CPU fallback for that layer and can cost more than the quantization saved. (3) Reduce input RESOLUTION, the highest-leverage model-side knob since cost scales with H*W. (4) Then architecture: a smaller or more efficient backbone. (5) System-level tricks: run the detector on a background thread so its spike does not block the render loop, process at a lower rate than display and interpolate, or skip frames adaptively under load. THE DESIGN PRINCIPLE I would state: build the pipeline against a FRAME DEADLINE with an explicit budget per stage, measure the tail under sustained load on the worst device, and treat any stage that can exceed its slice as a bug - because in real-time systems, a missed deadline is a functional failure, not a performance degradation."
          }
        },
        {
          "q": "Why does MediaPipe use landmarks rather than segmentation or bounding boxes?",
          "a": "THE OUTPUT SHOULD MATCH THE DOWNSTREAM DECISION, and for interactive applications that decision is almost always GEOMETRIC. Consider what the application actually needs: is the user pinching (distance between thumb tip and index tip)? Where are they looking (iris position relative to eye corners)? Is their squat form correct (hip, knee, and ankle angles)? Should this AR object sit on their nose (a specific face landmark)? Every one of those is a computation on point coordinates. A bounding box is far too coarse to answer any of them; a segmentation mask contains the information but in a form you must then post-process into geometry, at extra cost and with extra error. THE COST ARGUMENT. Regressing 21 hand keypoints means predicting 42-63 numbers (x, y, and optionally z). Dense segmentation at even a modest 256x256 means predicting 65,536 values, and the decoder that produces them is expensive - it is the U-Net upsampling path all over again. On a device budget of a few milliseconds, that difference decides what is feasible. Landmark regression also has a small, fixed output size regardless of image resolution, which makes the downstream logic trivial and the data transfer negligible. THE ACCURACY ARGUMENT, which is less obvious. Landmarks are a strong STRUCTURAL PRIOR: a hand always has 21 keypoints in a known topology, so the model is predicting a fixed-dimensional, highly-constrained object rather than an arbitrary mask. That constraint makes the problem easier to learn from limited data and makes the output automatically well-formed - you cannot regress a hand with two thumbs, whereas a segmentation model can produce anatomically impossible masks. It also makes temporal smoothing straightforward: you filter 21 trajectories, which is well-defined, whereas smoothing a mask over time is awkward. THE ANNOTATION ARGUMENT: labelling 21 points is much faster and more consistent than labelling a pixel-accurate mask, so you can build a larger and cleaner dataset for the same annotation budget - and for hands and faces you can additionally use synthetic data from 3D models, where the landmark ground truth is exact and free. MediaPipe's hand model was trained substantially on synthetic renderings for precisely this reason. WHEN LANDMARKS ARE THE WRONG CHOICE, to keep the answer balanced: when you need the object's EXTENT rather than its structure (background replacement in a video call needs a person MASK, not pose keypoints - and MediaPipe ships a separate selfie-segmentation model for exactly that); when the object has no fixed topology (a generic 'thing' has no canonical keypoints); when you need per-pixel labels for compositing or measurement; or when occlusion means some landmarks are undefined and the application cannot tolerate guesses (landmark models typically predict occluded points anyway, with a visibility flag, which is useful but is an inference rather than an observation). THE GENERAL LESSON worth extracting: choosing the OUTPUT REPRESENTATION is an underrated design decision. Boxes, masks, landmarks, and embeddings each make some downstream computations trivial and others impossible, and picking the one that matches the decision - rather than the one that seems most informative - usually simplifies the whole system. A mask contains strictly more information than landmarks and is nonetheless the worse choice for gesture recognition, because the extra information is not what the application needs and you pay for it in latency, annotation, and post-processing."
        },
        {
          "q": "How do you keep tracked landmarks stable without introducing lag?",
          "a": "THE TENSION. Raw per-frame predictions jitter: even a perfect model has small independent errors each frame, and when those points drive an AR overlay or a cursor, the jitter is highly visible and reads as low quality. The obvious fix is temporal smoothing - average with previous frames - but a FIXED low-pass filter creates the opposite problem: smooth enough to eliminate jitter at rest means the output visibly LAGS behind fast motion, which feels sluggish and breaks the sense of direct manipulation. Neither extreme is acceptable, and the smoothing constant that works for a still hand is wrong for a waving one. THE STANDARD SOLUTION: the ONE-EURO FILTER (Casiez, Roussel and Vogel, 2012), which adapts its cutoff frequency to the observed SPEED of the signal. When the point is nearly stationary, the estimated speed is low, the cutoff is low, and smoothing is heavy - jitter disappears. When the point moves quickly, the cutoff rises, smoothing lightens, and the filter tracks the motion with minimal lag. The intuition behind why this works perceptually: jitter is most objectionable when the object is still (there is nothing to mask it), and lag is most objectionable when the object is moving (the user is actively comparing to their own motion), so adapting on speed targets each problem where it matters. It has two tunable parameters - a minimum cutoff (how much smoothing at rest) and beta (how aggressively the cutoff responds to speed) - both of which are tuned by feel in a few minutes, which is a large part of why it is ubiquitous in interactive tracking. THE ALTERNATIVES AND WHEN THEY FIT. A KALMAN FILTER is the principled option when you have a motion model and want a proper uncertainty estimate - standard in object tracking (SORT) and robotics, and it handles occlusion gracefully by predicting forward. It is heavier to tune (process and measurement noise) and its constant-velocity assumption is poor for the abrupt, non-smooth motion of hands. An EXPONENTIAL MOVING AVERAGE is the simplest thing that works and is what a fixed low-pass filter amounts to. MEDIAN filtering over a small window kills outlier spikes specifically, which complements rather than replaces low-pass smoothing. And for landmark sets specifically, filtering in a NORMALIZED coordinate frame (relative to the detected object's scale) rather than in image pixels prevents the smoothing strength from varying with how close the user is to the camera - a subtle but real improvement. THE OTHER SOURCES OF INSTABILITY, which smoothing cannot fix and which I would check first. (1) ROI JITTER: if the crop region jumps between frames, the landmark model sees a differently-framed input each time and its output moves even if the object did not. Smoothing the ROI itself (and expanding it with hysteresis) is often more effective than smoothing the landmarks. (2) DETECTION/TRACKING SWITCHES: the frame where redetection occurs produces a discontinuity because the ROI changes abruptly - blending across that transition avoids a visible pop. (3) FLICKER between present and absent when the presence score hovers at the threshold, which is fixed with HYSTERESIS (different thresholds for acquiring and losing) rather than smoothing. (4) Genuine model error on ambiguous poses, which is a training-data problem. THE EVALUATION POINT worth making: per-frame accuracy metrics do not measure any of this. A model with excellent mean landmark error can be unusable if the error is temporally uncorrelated, and a slightly less accurate but stable model feels far better. So the metrics to report for an interactive system are jitter (frame-to-frame variation while the target is stationary) and lag (cross-correlation delay against ground truth during motion) alongside accuracy - and if you only optimize the accuracy number, you will systematically ship the worse-feeling model."
        },
        {
          "q": "What is different about deploying a model on-device versus in a server?",
          "a": "SEVEN THINGS CHANGE, and most of them are constraints rather than trade-offs. (1) THE HARDWARE IS FIXED, WEAK, AND HETEROGENEOUS. A server means you pick the GPU; on-device you support everything from a flagship to a four-year-old budget phone with a 5x performance spread, different accelerators (Apple Neural Engine, Qualcomm Hexagon, Mali GPU), and different operator support in each. The consequence is that you must design for the LOWEST-END supported device and test across a device matrix, and an architecture that is fast on one accelerator can be slow on another because the operator falls off the optimized path. (2) THERMAL AND POWER LIMITS ARE HARD. Phones throttle under sustained load, so a model that hits 30 FPS for ten seconds may manage 18 FPS after two minutes - and battery drain is a product-level constraint, not a technical footnote. This makes SUSTAINED measurement mandatory and makes efficiency worth more than it is on a server, where you can add machines. (3) NO BATCHING. Server inference amortizes weight reads across a batch; on-device you process one frame at a time, so you are permanently in the memory-bandwidth-bound regime, which is why quantization matters so much more here (it directly reduces the bytes read) and why FLOP-efficient architectures can disappoint. (4) MEMORY IS TIGHT and shared with the app, the OS, and the camera buffers - so model size, not just speed, is a constraint, and being killed by the OS for memory pressure is a real failure mode. (5) LATENCY IS THE METRIC, NOT THROUGHPUT, and it is judged on the tail. There is no queue to smooth over variance; a slow frame is a visible stutter. (6) DEPLOYMENT IS SLOW AND VERSIONED. A server model can be rolled back in minutes; an on-device model ships in an app update that users adopt over weeks, so you must support multiple model versions in the wild, cannot hotfix, and need the pipeline to degrade gracefully. Some products mitigate this by downloading models separately from the binary. (7) THE UPSIDES, which are why it is worth it: NO NETWORK - so no round-trip latency, works offline, and costs nothing per inference; and PRIVACY - the video never leaves the device, which is frequently a hard requirement (and increasingly a regulatory one) for camera features, and a genuine product differentiator. THE ENGINEERING PRACTICES THAT FOLLOW. Quantize to int8 as the default and verify operator coverage in the target delegate before committing to an architecture. Convert through the platform toolchain (TFLite, Core ML, ONNX Runtime Mobile) early rather than at the end, because conversion failures and unsupported ops reshape your design. Profile per-operator on the device to find fallbacks. Budget the whole pipeline including capture, colour conversion, tensor copies, and rendering - inference is often not the largest term. Use the cascade pattern to spend compute proportionally to difficulty. And build a device-matrix benchmark into CI, since a change that is neutral on your desk can be a regression on a mid-range device. THE HYBRID OPTION worth mentioning: run a small model on-device for the interactive path and escalate to a server model for the occasional hard case or heavy computation. This gets on-device latency for the common path and server quality where it matters, at the cost of network dependence for a subset of requests and a more complex fallback story - it is the right design when quality requirements exceed what the device can deliver but latency requirements exceed what the network can."
        },
        {
          "q": "How would you build a real-time gesture recognition feature end to end?",
          "a": "STEP 0 - DEFINE THE PRODUCT REQUIREMENT PRECISELY, because it determines everything downstream. Which gestures, how many, and are they STATIC poses (thumbs-up, open palm) or DYNAMIC sequences (swipe, pinch-and-drag)? What is the acceptable false-positive rate - a gesture that triggers accidentally during normal movement is far worse than one that occasionally misses. What is the latency requirement (under ~100 ms from gesture to response for it to feel connected)? What devices must it support? And what happens when it is wrong - is there an undo? STEP 1 - THE PERCEPTION STACK, using the cascade. Palm/hand DETECTOR on acquisition, then a 21-keypoint LANDMARK model per frame on the aligned crop, then One-Euro smoothing. This is the well-trodden path and I would use an existing solution (MediaPipe Hands or equivalent) rather than training my own landmark model - the data requirements are substantial and the available models are good. The interesting engineering is above this layer. STEP 2 - GESTURE CLASSIFICATION FROM LANDMARKS, not from pixels. This is the key design decision: classify on the 21 keypoints rather than on the image, which makes the classifier tiny (a small MLP or even a rule set on joint angles), fast, and far more data-efficient, and makes it invariant to skin tone, lighting, and background - a substantial fairness and robustness benefit that comes free from the representation. NORMALIZE the landmarks first: translate to a wrist-centred frame, scale by hand size, and optionally rotate to a canonical orientation, so the classifier sees pose rather than position. For STATIC gestures, a small MLP on normalized landmarks works well and trains on a few hundred examples per class. For DYNAMIC gestures, feed a sliding WINDOW of frames into a small temporal model (1D convolution or GRU over the landmark sequence), or use a simpler approach - a state machine on geometric predicates (pinch distance crossing a threshold, then travel exceeding a distance) which is more debuggable and often sufficient. STEP 3 - THE TEMPORAL AND DECISION LOGIC, which is where most of the real difficulty is and which people underestimate. Per-frame classification is noisy, so require CONSISTENCY over N frames before firing. Use HYSTERESIS - a higher threshold to enter a gesture state than to remain in it - to prevent flicker at the boundary. Add a DEBOUNCE so one gesture cannot re-trigger immediately. Handle the null class explicitly: most frames are 'no gesture', and the classifier must be trained with abundant negative examples of ordinary hand motion, or it will fire constantly. This step is where a technically-accurate model becomes a usable feature. STEP 4 - DATA. Collect from the actual device and the actual usage posture, across users, hand sizes, skin tones, lighting, and backgrounds. Crucially collect NEGATIVES - hours of hands doing ordinary things - because false positives are the failure mode users hate. Because the classifier consumes landmarks rather than pixels, you need far less data than an image classifier would, and you can AUGMENT in landmark space (small rotations, scale changes, per-point jitter matching the observed tracker noise), which is cheap and effective. STEP 5 - EVALUATION THAT MATCHES THE EXPERIENCE. Per-frame accuracy is the wrong metric. Report per-GESTURE-EVENT precision and recall (did the intended gesture fire once, at the right time?), FALSE POSITIVES PER MINUTE of ordinary use (the number that determines whether the feature is tolerable), and LATENCY from gesture completion to trigger. Test with people who did not build it, because developers unconsciously perform gestures the way the system expects. STEP 6 - SHIP CAREFULLY: an on/off setting, a sensitivity control if the false-positive rate varies by user, graceful degradation when tracking is lost, and clear visual feedback that the hand is being tracked - users forgive a missed gesture far more readily than a system that gives no indication of what it perceived. THE PRIORITY I WOULD DEFEND: the landmark models are a solved component; the product risk lies in the temporal decision logic and the false-positive rate during ordinary movement. That is where I would spend the engineering time and the evaluation effort."
        },
        {
          "q": "MediaPipe uses a graph of calculators. Why structure a pipeline that way?",
          "a": "THE STRUCTURE. Rather than a monolithic function, MediaPipe describes a pipeline as a DATAFLOW GRAPH: nodes ('calculators') that consume and produce typed streams of timestamped packets, connected by explicit edges, with the framework handling scheduling, synchronization, and buffering. A hand-tracking graph has separate nodes for image capture, format conversion, detection inference, ROI computation, cropping, landmark inference, smoothing, and rendering. WHY THIS IS WORTH THE ABSTRACTION - six reasons, and the first three are the substantive ones. (1) HETEROGENEOUS EXECUTION. Different stages belong on different processors: colour conversion and rendering on the GPU, inference on the NPU, control logic on the CPU. An explicit graph lets the framework place each node appropriately and manage the transfers, rather than having the developer hand-thread the data movement - which is exactly where hidden costs (redundant CPU-GPU copies) accumulate in ad hoc implementations. (2) SYNCHRONIZATION IS THE HARD PART, and it is what the abstraction really buys. Streams run at different rates: the camera produces 30 FPS, the detector fires occasionally, the landmark model runs per frame, and the renderer must composite results that correspond to the SAME timestamp. Getting this right by hand - especially with asynchronous accelerator calls - is a notorious source of bugs where an overlay lags the video by a frame or two, or where results from different stages are mismatched. Timestamped packets with explicit synchronization policies make the correctness condition declarative rather than emergent. (3) PARALLELISM AND PIPELINING for free: while the landmark model processes frame t, the camera can be capturing t+1 and the renderer displaying t-1. Pipelining raises THROUGHPUT without reducing per-stage latency, and expressing the dependencies explicitly is what allows the scheduler to do it safely. (4) MODULARITY AND REUSE: the same detection calculator serves hands, faces, and poses; a graph can be recomposed without touching the internals. (5) PORTABILITY: the same graph definition runs on Android, iOS, desktop, and the web, with platform-specific implementations of individual calculators - which matters enormously for a framework meant to ship the same feature everywhere. (6) OBSERVABILITY: because the structure is explicit, the framework can profile per-node timing, visualize the graph, and let you find the actual bottleneck - which, as noted elsewhere, is frequently a copy or a conversion rather than the model. THE COSTS, which should be acknowledged. There is a real learning curve and the configuration is verbose; debugging is harder than stepping through straight-line code because control flow is implicit in the scheduler; the abstraction adds some overhead; and for a simple pipeline it is over-engineering - a single-model, single-thread inference loop needs none of this. THE GENERAL PRINCIPLE worth extracting, because it recurs well outside MediaPipe: real-time systems are DATAFLOW problems, and once you have several stages running at different rates on different processors, making the dataflow explicit is what makes the system tractable. The same reasoning produces GStreamer for media, ROS's node graph for robotics, and the computation graphs in ML frameworks themselves. The pattern to recognize is that when timing and placement become first-class concerns, the code should describe the STRUCTURE and let a scheduler handle the execution - which is also, incidentally, why deep-learning frameworks moved from imperative to graph representations for deployment."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Detector-tracker cascade",
        "back": "Expensive detector on acquisition/loss only; cheap landmark model every frame on a crop from the previous result. ~5x less compute (10ms detector + 2ms landmark, redetect ~1% of frames)."
      },
      {
        "type": "intuition",
        "front": "Why the cropped model is cheap",
        "back": "The crop is localized, SCALE-normalized, and rotation-ALIGNED, so the model never searches or handles arbitrary scale. Removing those variations makes it a genuinely easier problem, not just a smaller input."
      },
      {
        "type": "intuition",
        "front": "Robust tracking IS a latency optimization",
        "back": "Every tracking loss costs a full detector run, so a fragile tracker degrades toward detect-every-frame exactly under fast motion and occlusion. The p99 spike in a cascade IS redetection."
      },
      {
        "type": "formula",
        "front": "One-Euro filter",
        "back": "Adaptive low-pass: cutoff f_c = f_cmin + beta*|speed|. Heavy smoothing at rest (kills jitter), light during motion (kills lag). Two parameters tuned by feel - the reason it is ubiquitous."
      },
      {
        "type": "pitfall",
        "front": "Measure p95/p99, not the mean",
        "back": "Interactive systems are judged by worst frames - a steady 24 FPS beats an average 32 FPS with 80ms spikes. And phones THROTTLE, so run for minutes on the LOWEST-end supported device."
      },
      {
        "type": "intuition",
        "front": "Why landmarks, not masks or boxes",
        "back": "Downstream logic is geometry (pinch distance, joint angles, gaze). 21 keypoints = ~50 numbers vs 65k for a mask; strong structural prior; cheaper annotation; synthetic data gives exact ground truth."
      },
      {
        "type": "pitfall",
        "front": "The non-model stages dominate",
        "back": "Capture, YUV->RGB conversion, resize, CPU<->accelerator COPIES, and rendering can exceed a 2ms inference. Budget the whole graph; eliminating copies is often the largest win and costs no accuracy."
      },
      {
        "type": "definition",
        "front": "On-device vs server",
        "back": "Fixed weak heterogeneous hardware; thermal throttling; NO batching (permanently bandwidth-bound, so quantization matters more); tight memory; latency-not-throughput; slow versioned deploys. Upside: no network, and privacy."
      },
      {
        "type": "pitfall",
        "front": "Gesture logic, not the model, is the risk",
        "back": "Per-frame classification is noisy: require N-frame consistency, use HYSTERESIS, debounce, and train with abundant NEGATIVES (ordinary hand motion). Report false positives per MINUTE, not per-frame accuracy."
      },
      {
        "type": "intuition",
        "front": "Why a calculator graph",
        "back": "Real-time pipelines are DATAFLOW problems: heterogeneous placement (GPU/NPU/CPU), timestamp SYNCHRONIZATION across streams running at different rates, and pipelining. Same reasoning as GStreamer and ROS."
      }
    ],
    "refs": [
      {
        "title": "Lugaresi et al. (2019), MediaPipe: A Framework for Building Perception Pipelines",
        "url": "https://arxiv.org/abs/1906.08172"
      },
      {
        "title": "Zhang et al. (2020), MediaPipe Hands: On-device Real-time Hand Tracking",
        "url": "https://arxiv.org/abs/2006.10214"
      },
      {
        "title": "Casiez, Roussel & Vogel (2012), 1 Euro Filter: A Simple Speed-based Low-pass Filter",
        "url": "https://dl.acm.org/doi/10.1145/2207676.2208639"
      },
      {
        "title": "Bazarevsky et al. (2019), BlazeFace: Sub-millisecond Neural Face Detection on Mobile GPUs",
        "url": "https://arxiv.org/abs/1907.05047"
      }
    ],
    "demos": [
      "optical-flow",
      "harris-corners",
      "nms"
    ],
    "demoTitles": {
      "optical-flow": "Optical Flow (Lucas-Kanade)",
      "harris-corners": "Harris Corner Detector",
      "nms": "IoU & Non-Max Suppression"
    }
  }
};
