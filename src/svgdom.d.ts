declare module 'svgdom' {
  export function createSVGWindow(): {
    document: {
      documentElement: {
        innerHTML: string;
        firstChild: { getBBox(): DOMRect };
      };
    };
  };
}
