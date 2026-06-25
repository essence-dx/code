import type { SlideTransition } from "./types"

export function transitionAnimationClass(transition: SlideTransition) {
  return {
    none: "",
    fade: "slideshow-transition-fade",
    push: "slideshow-transition-push",
    zoom: "slideshow-transition-zoom",
  }[transition]
}
