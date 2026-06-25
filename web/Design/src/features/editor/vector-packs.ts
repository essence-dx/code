export type VectorPackCategory =
  | "Icons"
  | "Stickers"
  | "Illustrations"
  | "Mockups"
  | "Shapes";

export type VectorPackItem = {
  id: string;
  name: string;
  category: VectorPackCategory;
  width: number;
  height: number;
  svgText: string;
};

export const vectorPackItems = [
  {
    id: "check-badge",
    name: "Check badge",
    category: "Icons",
    width: 220,
    height: 220,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><circle cx="110" cy="110" r="88" fill="#0ea5e9"/><path d="M69 112l27 27 57-67" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: "arrow-sweep",
    name: "Arrow sweep",
    category: "Icons",
    width: 260,
    height: 160,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160"><path d="M31 112c41-58 103-76 180-54" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round"/><path d="M190 28l39 38-54 12" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: "play-pill",
    name: "Play pill",
    category: "Icons",
    width: 260,
    height: 160,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160"><rect x="20" y="28" width="220" height="104" rx="52" fill="#ef4444"/><path d="M111 56l56 24-56 24z" fill="#ffffff"/></svg>`,
  },
  {
    id: "spark-burst",
    name: "Spark burst",
    category: "Stickers",
    width: 240,
    height: 240,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><path d="M120 20l18 67 67-18-49 51 49 51-67-18-18 67-18-67-67 18 49-51-49-51 67 18z" fill="#facc15" stroke="#111827" stroke-width="10" stroke-linejoin="round"/></svg>`,
  },
  {
    id: "sale-tag",
    name: "Sale tag",
    category: "Stickers",
    width: 260,
    height: 180,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 180"><path d="M24 34h112l100 72-100 72H24z" fill="#22c55e" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><circle cx="62" cy="106" r="14" fill="#ffffff"/><path d="M111 80l54 54M113 132l54-54" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/></svg>`,
  },
  {
    id: "speech-sticker",
    name: "Speech sticker",
    category: "Stickers",
    width: 260,
    height: 210,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 210"><path d="M34 38h192v112H111l-54 42 14-42H34z" fill="#a855f7" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><path d="M75 88h110M75 118h72" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/></svg>`,
  },
  {
    id: "launch-panel",
    name: "Launch panel",
    category: "Illustrations",
    width: 320,
    height: 240,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect x="30" y="48" width="260" height="154" rx="22" fill="#f8fafc" stroke="#111827" stroke-width="8"/><rect x="55" y="78" width="96" height="84" rx="16" fill="#0ea5e9"/><path d="M177 90h72M177 122h55M177 154h82" stroke="#111827" stroke-width="12" stroke-linecap="round"/><circle cx="76" cy="184" r="10" fill="#22c55e"/><circle cx="107" cy="184" r="10" fill="#f97316"/><circle cx="138" cy="184" r="10" fill="#a855f7"/></svg>`,
  },
  {
    id: "growth-chart",
    name: "Growth chart",
    category: "Illustrations",
    width: 320,
    height: 240,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect x="34" y="38" width="252" height="166" rx="18" fill="#ffffff" stroke="#111827" stroke-width="8"/><path d="M68 166l48-42 47 20 76-76" fill="none" stroke="#0ea5e9" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M219 68h20v20" fill="none" stroke="#0ea5e9" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M66 183h192" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round"/></svg>`,
  },
  {
    id: "profile-card",
    name: "Profile card",
    category: "Illustrations",
    width: 300,
    height: 220,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220"><rect x="32" y="30" width="236" height="160" rx="22" fill="#f8fafc" stroke="#111827" stroke-width="8"/><circle cx="94" cy="98" r="34" fill="#f97316"/><path d="M61 157c16-26 50-26 66 0" fill="none" stroke="#f97316" stroke-width="14" stroke-linecap="round"/><path d="M158 80h62M158 112h78M158 144h48" stroke="#111827" stroke-width="12" stroke-linecap="round"/></svg>`,
  },
  {
    id: "phone-mockup-frame",
    name: "Phone mockup frame",
    category: "Mockups",
    width: 260,
    height: 420,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 420"><rect x="42" y="18" width="176" height="384" rx="38" fill="#111827"/><rect x="58" y="50" width="144" height="306" rx="18" fill="#f8fafc"/><path d="M99 34h62" stroke="#334155" stroke-width="8" stroke-linecap="round"/><circle cx="130" cy="378" r="12" fill="#334155"/><path d="M80 102h100M80 142h74M80 210h100M80 250h62" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round"/><rect x="80" y="286" width="100" height="34" rx="17" fill="#0ea5e9"/></svg>`,
  },
  {
    id: "browser-mockup-frame",
    name: "Browser mockup frame",
    category: "Mockups",
    width: 420,
    height: 280,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 280"><rect x="22" y="32" width="376" height="216" rx="18" fill="#ffffff" stroke="#111827" stroke-width="8"/><path d="M26 82h368" stroke="#111827" stroke-width="8"/><circle cx="58" cy="58" r="8" fill="#ef4444"/><circle cx="86" cy="58" r="8" fill="#f59e0b"/><circle cx="114" cy="58" r="8" fill="#22c55e"/><rect x="144" y="48" width="204" height="20" rx="10" fill="#e4e4e7"/><rect x="58" y="116" width="132" height="92" rx="14" fill="#dbeafe"/><path d="M220 126h104M220 158h80M220 190h122" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"/></svg>`,
  },
  {
    id: "poster-wall-mockup",
    name: "Poster wall mockup",
    category: "Mockups",
    width: 360,
    height: 300,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300"><rect x="18" y="18" width="324" height="264" rx="18" fill="#f1f5f9"/><path d="M20 224h320" stroke="#cbd5e1" stroke-width="8"/><rect x="94" y="42" width="172" height="210" rx="6" fill="#ffffff" stroke="#111827" stroke-width="8"/><rect x="122" y="72" width="116" height="84" rx="10" fill="#bae6fd"/><path d="M122 184h116M122 212h82" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"/><path d="M102 256h156" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"/></svg>`,
  },
  {
    id: "shirt-product-mockup",
    name: "Shirt product mockup",
    category: "Mockups",
    width: 360,
    height: 320,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 320"><path d="M119 46l35 24h52l35-24 78 48-40 70-39-20v128H120V144l-39 20-40-70z" fill="#ffffff" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><path d="M154 70c8 20 44 20 52 0" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/><rect x="134" y="124" width="92" height="76" rx="12" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="6"/><path d="M150 224h60" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round"/></svg>`,
  },
  {
    id: "soft-blob",
    name: "Soft blob",
    category: "Shapes",
    width: 260,
    height: 220,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220"><path d="M63 41c34-30 82-15 111 4 34 23 68 55 54 93-14 39-68 56-113 50-45-5-89-33-95-73-5-31 18-52 43-74z" fill="#38bdf8"/></svg>`,
  },
  {
    id: "ticket-frame",
    name: "Ticket frame",
    category: "Shapes",
    width: 300,
    height: 180,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180"><path d="M34 38h232v38a20 20 0 000 40v26H34v-26a20 20 0 000-40z" fill="#fef3c7" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><path d="M104 48v84" stroke="#111827" stroke-width="8" stroke-dasharray="10 12" stroke-linecap="round"/></svg>`,
  },
  {
    id: "wave-divider",
    name: "Wave divider",
    category: "Shapes",
    width: 360,
    height: 120,
    svgText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120"><path d="M0 66c48-38 90-38 138 0s90 38 138 0c30-24 58-32 84-24v78H0z" fill="#0ea5e9"/></svg>`,
  },
] satisfies VectorPackItem[];

export const vectorPackCategories = [
  "Icons",
  "Stickers",
  "Illustrations",
  "Mockups",
  "Shapes",
] satisfies VectorPackCategory[];
