import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom lacks IntersectionObserver / ResizeObserver, which framer-motion's
// whileInView animations and some shadcn primitives require.
class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockObserver,
});
Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: MockObserver,
});
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockObserver,
});
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: MockObserver,
});

