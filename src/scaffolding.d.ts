declare module '@turbowarp/scaffolding' {
  const Packages: {
    VM: typeof VM;
    Renderer: typeof RenderWebGL;
    Storage: typeof ScratchStorage;
    SVGRenderer: typeof ScratchSVGRenderer;
  };

  const scaffolding: {
    Scaffolding: typeof Scaffolding;
    Packages: typeof Packages;
  };

  export default scaffolding;
}
