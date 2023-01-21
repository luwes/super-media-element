# Super Media Element

A custom element that helps save alienated player API's to bring back their true inner [HTMLMediaElement API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement), or to extend a native media element like `<audio>` or `<video>`.

## Usage

```js
import { SuperVideoElement } from 'super-media-element';

class MyVideoElement extends SuperVideoElement {
  constructor() {
    super();

    this.loadComplete = new Promise((resolve) => {
      this.loadResolve = resolve;
    });
  }

  async attributeChangedCallback(attrName, oldValue, newValue) {
    // This is required to come before the await for resolving loadComplete.
    if (attrName === 'src' && newValue) {
      this.load();
      return;
    }

    super.attributeChangedCallback(attrName, oldValue, newValue);
  }

  async load() {
    if (this.hasLoaded) {
      this.loadComplete = new Promise((resolve) => {
        this.loadResolve = resolve;
      });
    }
    this.hasLoaded = true;

    // Wait 1 tick to allow other attributes to be set.
    await Promise.resolve();

    // code to load a video element from a script
    // example: https://github.com/luwes/jwplayer-video-element/blob/main/src/jwplayer-video-element.js#L49-L69

    this.loadResolve();
  }

  get nativeEl() {
    return this.querySelector('.loaded-video-element');
  }

  get src() {
    return this.getAttribute('src');
  }

  set src(val) {
    if (this.src == val) return;
    this.setAttribute('src', val);
  }
}

if (!globalThis.customElements.get('my-video')) {
  globalThis.customElements.define('my-video', MyVideoElement);
}

export { MyVideoElement };
```


## Related

- [Media Chrome](https://github.com/muxinc/media-chrome) Your media player's dancing suit. 🕺
- [`<mux-video>`](https://github.com/muxinc/elements/tree/main/packages/mux-video) A Mux-flavored HTML5 video element w/ hls.js and Mux data builtin.
- [`<youtube-video>`](https://github.com/muxinc/youtube-video-element) A web component for the YouTube player.
- [`<wistia-video>`](https://github.com/luwes/wistia-video-element) A web component for the Wistia player.
- [`<jwplayer-video>`](https://github.com/luwes/jwplayer-video-element) A web component for the JW player.
- [`<hls-video>`](https://github.com/muxinc/hls-video-element) A web component for playing HTTP Live Streaming (HLS) videos.
- [`<videojs-video>`](https://github.com/luwes/videojs-video-element) A web component for Video.js.
- [`castable-video`](https://github.com/muxinc/castable-video) Cast your video element to the big screen with ease!
- [`<mux-player>`](https://github.com/muxinc/elements/tree/main/packages/mux-player) The official Mux-flavored video player web component.
