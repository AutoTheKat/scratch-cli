import { JSDOM } from 'jsdom';
import { ImageData } from 'canvas';
import { createSVGWindow } from 'svgdom';

// todo: this is a vibecoded library made entirely by Claude.
// Will it work reliably? Who knows. We should replace this in the future though.
import { createWebGLContext } from '@onirenaud/node-webgl';

const dom = new JSDOM(
  `
  <html>
    <body>
      <div id="app"></div>
    </body>
  </html>
`,
  {
    resources: 'usable',
    pretendToBeVisual: true
  }
);

// Patch some web stuff that scaffolding expects.
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,

  DOMParser: dom.window.DOMParser,
  XMLSerializer: dom.window.XMLSerializer,
  Image: dom.window.Image,
  ImageData,
  HTMLImageElement: dom.window.HTMLImageElement,
  HTMLCanvasElement: dom.window.HTMLCanvasElement
});

const getContext = dom.window.HTMLCanvasElement.prototype.getContext;

Object.assign(dom.window.SVGElement.prototype, {
  getBBox(this: SVGElement) {
    const document = createSVGWindow().document;
    document.documentElement.innerHTML = this.outerHTML;
    return document.documentElement.firstChild.getBBox();
  }
});

// The WebGL backend reads canvas textures through this pixel hook.
Object.assign(dom.window.HTMLCanvasElement.prototype, {
  _toRGBA8(this: HTMLCanvasElement) {
    return this.getContext('2d')!.getImageData(
      0,
      0,
      this.width,
      this.height
    );
  }
});

Object.assign(dom.window.HTMLImageElement.prototype, {
  _toRGBA8(this: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = this.naturalWidth;
    canvas.height = this.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(this, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }
});

dom.window.HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string
) {
  switch (contextId) {
    case 'webgl':
      return createWebGLContext(480, 360, {
        version: 1
      });
    case 'webgl2':
      return createWebGLContext(480, 360, {
        version: 2
      });
  }

  return getContext.call(this, contextId);
} as unknown as HTMLCanvasElement['getContext'];
