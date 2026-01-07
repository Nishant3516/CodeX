// Enable React 18+ act() environment for testing
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

globalThis.failAssertion = function ({ scenario, expected, received, hint }) {
  throw new Error(
    "__DEVSARENA_ASSERTION__:" +
      JSON.stringify({ scenario, expected, received, hint })
  );
};

beforeEach(() => {
  if (typeof document !== "undefined") {
    document.body.innerHTML = '<div id="root"></div>';
  }
});

globalThis.bySelector = function (container, selector, hint) {
  const el = container?.querySelector?.(selector);
  if (!el) {
    failAssertion({
      scenario: `Element exists: ${selector}`,
      expected: `An element matching ${selector}`,
      received: "Not found",
      hint: hint || "Check your component renders the expected element",
    });
  }
  return el;
};

globalThis.byId = function (container, id, hint) {
  return bySelector(container, `#${id}`, hint);
};

globalThis.typeInto = function (input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  if (setter) setter.call(input, value);
  else input.value = value;

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};
