# Generated Images Metadata

This directory contains high-fidelity AI-generated digital illustrations used for custom interactive hotspots visualizations in the Lineage section.

---

## 1. Kongu Landscape

* **Filename**: `public/images/kongu_landscape.png`
* **Visual Role**: Panoramic visual container representing the material agricultural and socio-technical landscape of Vellala ancestors in the Kongu region. 
* **Target Page**: `/lineage/ancestors` (rendered within `src/components/viz/AncestorPractices.tsx`)
* **Aspect Ratio**: 1:1 (Square, responsive aspect-square card)
* **Date Generated**: May 24, 2026

### Reference Prompt
```text
A highly stylized, premium digital vector art illustration of a traditional Kongu landscape in Tamil Nadu under a warm, glowing sun. The landscape has a wide panoramic aspect ratio. In the foreground are vibrant green paddy fields, cotton plants with white tufts, sugarcane stalks, and golden millet crops. In the midground, there is a large traditional village irrigation tank (lake/eri) with calm blue water, a stone-lined circular water well with a bullock-drawn lift ramp, and a circular stone threshing floor. On the far right is a traditional carved stone hero stone (nadukal) decorated with a small orange garland. In the background are soft, rolling hills silhouette against a warm amber and pastel sky. The style is modern, elegant, flat-vector art with rich color gradients, subtle textures, clean lines, and deep visual harmony, feeling like a premium editorial illustration.
```

---

## 2. Konur Kaliamman Deity Iconography

* **Filename**: `public/images/konur_kaliamman.png`
* **Visual Role**: Illustrative representation of the Kuladeivam deity (Kaliamman) featuring traditional iconographic objects used as hotspots.
* **Target Page**: `/lineage/konur` (rendered within `src/components/viz/KonurIconography.tsx`)
* **Aspect Ratio**: 1:1 (Square, responsive aspect-square card)
* **Date Generated**: May 24, 2026

### Reference Prompt
```text
A highly stylized, premium digital art illustration of the goddess Kaliamman (Amman) as a village deity inside a simple temple shrine arch. She is depicted with serene yet powerful features. On her head is a beautifully decorated tall golden crown (karagam) adorned with yellow flowers. In her right hand she holds a golden metal trident (trishul), and in her left hand she holds a fresh green neem leaf branch. A small bowl of yellow turmeric paste is placed as an offering in front of her. The artwork has a modern flat-vector illustration style with rich color gradients, subtle textures, clean lines, and deep visual harmony, featuring warm amber, red, and golden yellow colors. No photographic elements, clean editorial graphic style.
```

---

## 3. Maintenance & Replication Guide

If you wish to modify these images in the future while retaining a similar aesthetic:
1. **Model**: Use a modern high-fidelity image generation model (e.g., Imagen 3).
2. **Aesthetic Anchors**: Ensure words like `"highly stylized"`, `"premium digital vector art illustration"`, `"flat-vector"`, `"rich color gradients"`, `"clean lines"`, `"deep visual harmony"`, and `"clean editorial graphic style"` are included in your prompts to maintain visual consistency.
3. **Coordinate Calibration**: If you generate an image with an altered layout, you will need to calibrate the SVG hotspot coordinate positions (`x` and `y`) in the respective React components (`AncestorPractices.tsx` and `KonurIconography.tsx`). The coordinate space is a `1000x1000` grid overlaying the image.
