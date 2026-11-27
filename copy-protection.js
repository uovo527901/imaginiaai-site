(() => {
  const blockOutsideTextFields = (event) => {
    const tagName = event.target?.tagName;
    if (tagName !== "INPUT" && tagName !== "TEXTAREA") {
      event.preventDefault();
    }
  };

  for (const type of ["copy", "cut", "contextmenu", "selectstart"]) {
    document.addEventListener(type, blockOutsideTextFields, true);
  }

  document.addEventListener("dragstart", (event) => event.preventDefault(), true);
})();
