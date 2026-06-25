import type { Material } from "../types";

export interface MaterialPreset {
  id: string;
  name: string;
  description: string;
  material: Material;
}

export const materialPresets: MaterialPreset[] = [
  {
    id: "mint-matte",
    name: "Mint Matte",
    description: "Soft studio surface",
    material: {
      color: "#51e0c3",
      opacity: 1,
      roughness: 0.68,
      metalness: 0.04,
      wireframe: false,
    },
  },
  {
    id: "violet-clay",
    name: "Violet Clay",
    description: "Warm sculpted color",
    material: {
      color: "#b38cff",
      opacity: 1,
      roughness: 0.8,
      metalness: 0.02,
      wireframe: false,
    },
  },
  {
    id: "chrome",
    name: "Chrome",
    description: "Reflective metal",
    material: {
      color: "#d8e4ef",
      opacity: 1,
      roughness: 0.18,
      metalness: 0.94,
      wireframe: false,
    },
  },
  {
    id: "smoked-glass",
    name: "Smoked Glass",
    description: "Transparent dark shell",
    material: {
      color: "#7f9cad",
      opacity: 0.34,
      roughness: 0.12,
      metalness: 0.1,
      wireframe: false,
    },
  },
  {
    id: "wire",
    name: "Wireframe",
    description: "Structural preview",
    material: {
      color: "#f5f7fb",
      opacity: 1,
      roughness: 0.4,
      metalness: 0,
      wireframe: true,
    },
  },
];
