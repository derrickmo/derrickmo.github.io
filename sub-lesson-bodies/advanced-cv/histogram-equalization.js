// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/histogram-equalization/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Advanced Computer Vision",
    "lessons": {
      "edge-detection": {
        "title": "Edge Detection"
      },
      "hough-transform": {
        "title": "The Hough Transform"
      },
      "harris-corners": {
        "title": "Corner Detection"
      },
      "hog": {
        "title": "HOG Features"
      },
      "optical-flow": {
        "title": "Optical Flow"
      },
      "image-segmentation": {
        "title": "Image Segmentation"
      },
      "iou-nms": {
        "title": "IoU and Non-Max Suppression"
      },
      "histogram-equalization": {
        "title": "Histogram Equalization"
      },
      "morphological-operations": {
        "title": "Morphological Operations"
      },
      "template-matching": {
        "title": "Template Matching (Cross-Correlation)"
      }
    }
  },
  "moduleSlug": "advanced-cv",
  "conceptId": "histogram-equalization",
  "lesson": {
    "title": "Histogram Equalization",
    "oneLine": "Remap intensities through their own cumulative distribution to spread contrast — and amplify noise by the same factor, wherever the image was flat.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A low-contrast image wastes its dynamic range: every pixel crowds into a narrow band of values, so real structure spans only a few levels and is invisible. Equalization asks for a monotone remapping of intensity that spreads the pixels out as evenly as the histogram allows.",
          "The answer falls out of probability. Passing any random variable through its own cumulative distribution function yields something uniform. So build the histogram, accumulate it into a CDF, and use that CDF — rescaled to the output range — as the lookup table. Values that were crowded together get pushed apart, values in sparse regions get pulled together.",
          "Measured on a synthetic low-contrast image with all values squeezed into 96 to 160: the output spans the full 0 to 255, and the standard deviation rises from 15.5 to 74.1. The image looks dramatically better."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The transform is the empirical CDF, shifted so the darkest occupied level maps to zero:"
        ],
        "tex": "s_k = \\operatorname{round}\\!\\left( \\frac{\\mathrm{cdf}(k) - \\mathrm{cdf}_{\\min}}{MN - \\mathrm{cdf}_{\\min}} \\times (L-1) \\right), \\qquad \\mathrm{cdf}(k) = \\sum_{i=0}^{k} h(i)",
        "texNote": "Because the CDF is non-decreasing, the mapping is monotone: pixel A brighter than pixel B stays brighter than pixel B. That is what makes the result an enhancement rather than a distortion — no ordering is ever inverted."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef equalize(img):                       # img: uint8, single channel\n    hist = np.bincount(img.ravel(), minlength=256)\n    cdf = hist.cumsum()\n    cdf_min = cdf[cdf > 0][0]\n    lut = np.round((cdf - cdf_min) / (img.size - cdf_min) * 255).astype(np.uint8)\n    return lut[img]\n\n# For colour, equalize LUMINANCE only. Equalizing R, G and B independently changes the\n# ratios between channels, which is the same thing as changing the hue.\n#   ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)\n#   ycrcb[..., 0] = equalize(ycrcb[..., 0])\n#   out = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)",
        "caption": "The per-channel mistake is common and its symptom is distinctive: colours shift rather than simply brightening."
      },
      {
        "h": "Two things it does not do",
        "paras": [
          "It does not create information. On the same test image the entropy was 5.820 bits before equalization and 5.820 bits after — identical. A monotone lookup table can merge levels but never separate them, so the information content can only stay the same or fall. What changed is how that information is distributed across the display range, which is a statement about your eyes and your monitor, not about the image.",
          "And it amplifies noise in exactly the regions where you least want it. A near-flat patch in the same image had a standard deviation of 0.59 — imperceptible sensor noise. After equalization it was 10.82, an eighteenfold amplification. The mechanism is direct: flat regions have a tall narrow histogram spike, the CDF is steep there, and a steep mapping multiplies small differences. Global equalization reliably turns a clean sky into visible mottling.",
          "CLAHE is the standard answer to both problems. It equalizes small tiles independently so the mapping adapts to local content, and it clips each histogram at a ceiling before accumulating, redistributing the excess — which directly bounds the slope of the CDF and therefore bounds the noise gain. Bilinear interpolation between neighbouring tile mappings removes the block seams. In medical and low-light imaging CLAHE is the default and global equalization is the teaching example."
        ]
      }
    ],
    "takeaways": [
      "Passing intensities through their own CDF makes the histogram approximately uniform: range 96-160 became 0-255 and the standard deviation went from 15.5 to 74.1.",
      "It redistributes information rather than adding any — entropy measured 5.820 bits before and after, because a monotone lookup table cannot separate levels it has merged.",
      "Flat regions get a steep CDF and therefore amplified noise: a near-flat patch went from 0.59 to 10.82 standard deviation, an 18x gain. CLAHE clips the histogram to bound exactly that slope."
    ],
    "demo": "histogram-equalization"
  },
  "order": [
    "edge-detection",
    "hough-transform",
    "harris-corners",
    "hog",
    "optical-flow",
    "image-segmentation",
    "iou-nms",
    "histogram-equalization",
    "morphological-operations",
    "template-matching"
  ],
  "index": 7,
  "prev": "iou-nms",
  "next": "morphological-operations"
};
