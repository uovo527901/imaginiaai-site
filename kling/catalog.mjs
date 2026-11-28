const wideRatios = ["16:9", "9:16", "1:1", "21:9", "4:3", "3:4"];
const standardRatios = wideRatios.slice(0, 3);
const videoResolutions = ["1080p", "720p", "4k"];
export const maxImageBytes = 2 * 1024 * 1024;
export const maxReferences = 4;

export const models = [
  { id: "kling-4.0", name: "Kling 4.0", badge: "30 sec · 4K HDR", kind: "video",
    description: "True-to-life video with up to 30 seconds per clip, 10-bit HDR, and precise control over first, middle, and last keyframes.",
    maxDuration: 30, resolutions: videoResolutions, ratios: wideRatios, frames: true, hdr: true },
  { id: "kling-4.0-flash", name: "Kling 4.0 Flash", badge: "Fast iteration", kind: "video",
    description: "Generate more while spending less. Use Omni Reference or edit a source clip, with multilingual output for faster iteration.",
    maxDuration: 20, resolutions: ["720p"], ratios: wideRatios, references: true, editing: true },
  { id: "kling-3.0", name: "Kling 3.0", badge: "Native audio", kind: "video",
    description: "Synchronized audio and video with multi-shot storytelling and an optional starting image.",
    maxDuration: 15, resolutions: videoResolutions, ratios: standardRatios, startFrame: true, storyboard: true },
  { id: "kling-3.0-omni", name: "Kling 3.0 Omni", badge: "Element reference", kind: "video",
    description: "Use reference images and Kling Elements to keep subjects consistent across shots, with synchronized audio and precise prompt following.",
    maxDuration: 15, resolutions: videoResolutions, ratios: standardRatios, references: true, elements: true, storyboard: true },
  { id: "kling-image-4.0", name: "Kling Image 4.0", badge: "8K stills", kind: "image",
    description: "Create detailed stills with improved realism, text rendering, and consistency, up to native 8K Ultra HD.",
    resolutions: ["2k", "4k", "8k"], ratios: ["auto", ...wideRatios, "3:2", "2:3"], references: true },
];
