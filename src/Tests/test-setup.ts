import "@testing-library/jest-dom/vitest";

/*
 * jsdom gaps that vaul (the bottom-sheet drawer) relies on during pointer
 * handling: pointer capture and a computed `transform` string.
 */
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

const jsdomGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element, pseudoElt) => {
  const style = jsdomGetComputedStyle(element, pseudoElt);
  if (!style.transform) style.transform = "none";
  return style;
};
