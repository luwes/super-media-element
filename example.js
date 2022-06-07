import { SuperVideoElement } from './index.js';

class MyVideoElement extends SuperVideoElement {
  constructor() {
    super();

    // This shows that the video like API can be delayed for players like
    // YouTube, Vimeo, Wistia, any player that requires an async load.
    this.loadComplete = new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
  }
}

if (!globalThis.customElements.get('my-video')) {
  globalThis.customElements.define('my-video', MyVideoElement);
  globalThis.MyVideoElement = MyVideoElement;
}

export default MyVideoElement;
