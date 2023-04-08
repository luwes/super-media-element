/**
 * Super Media Element
 * Based on https://github.com/muxinc/custom-video-element - Mux - MIT License
 *
 * The goal is to create an element that works just like the video element
 * but can be extended/sub-classed, because native elements cannot be
 * extended today across browsers. Support for extending async loaded video
 * like API's. e.g. video players.
 */

// The onevent like props are weirdly set on the HTMLElement prototype with other
// generic events making it impossible to pick these specific to HTMLMediaElement.
const Events = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'encrypted',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting',
  'waitingforkey',
  'resize',
  'enterpictureinpicture',
  'leavepictureinpicture',
];

const styles = `
  :host {
    display: inline-block;
    line-height: 0;
    width: auto;
    height: auto;
  }

  video,
  audio {
    max-width: 100%;
    max-height: 100%;
    min-width: 100%;
    min-height: 100%;
  }
`;

const template = document.createElement('template');
template.innerHTML = `
<style>
  ${styles}
</style>
<slot></slot>
`;

/**
 * @see https://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 */
export const SuperMediaMixin = (superclass, { tag, is }) => {

  const nativeElTest = document.createElement(tag, { is });
  const nativeElProps = getNativeElProps(nativeElTest);

  return class SuperMedia extends superclass {
    static template = template;
    static Events = Events;
    static #isDefined;

    static get observedAttributes() {
      SuperMedia.#define();

      // Include any attributes from the custom built-in.
      const natAttrs = Object.getPrototypeOf(nativeElTest).observedAttributes;

      const attrs = [
        ...(natAttrs ?? []),
        'autopictureinpicture',
        'disablepictureinpicture',
        'disableremoteplayback',
        'autoplay',
        'controls',
        'controlslist',
        'crossorigin',
        'loop',
        'muted',
        'playsinline',
        'poster',
        'preload',
        'src',
      ];
      return attrs;
    }

    static #define() {
      if (this.#isDefined) return;
      this.#isDefined = true;

      const observedAttributes = this.observedAttributes;

      // Passthrough native el functions from the custom el to the native el
      nativeElProps.forEach((prop) => {
        if (prop in this.prototype) return;

        const type = typeof nativeElTest[prop];
        if (type == 'function') {
          // Function
          this.prototype[prop] = function (...args) {
            this.#init();

            const fn = () => {
              if (this.call) return this.call(prop, ...args);
              return this.nativeEl[prop].apply(this.nativeEl, args);
            };

            if (this.loadComplete && !this.isLoaded) {
              return this.loadComplete.then(fn);
            }
            return fn();
          };
        } else {
          // Getter
          let config = {
            get() {
              this.#init();

              let attr = prop.toLowerCase();
              if (observedAttributes.includes(attr)) {
                const val = this.getAttribute(attr);
                return val === null ? false : val === '' ? true : val;
              }

              return this.get?.(prop) ?? this.nativeEl?.[prop] ?? this.#standinEl[prop];
            },
          };

          if (prop !== prop.toUpperCase()) {
            // Setter (not a CONSTANT)
            config.set = async function (val) {
              this.#init();

              if (this.set) {
                if (this.loadComplete && !this.isLoaded) await this.loadComplete;

                this.set(prop, val);
                return;
              }

              let attr = prop.toLowerCase();
              if (observedAttributes.includes(attr)) {
                if (val === true || val === false || val == null) {
                  this.toggleAttribute(attr, Boolean(val));
                } else {
                  this.setAttribute(attr, val);
                }
                return;
              }

              if (this.loadComplete && !this.isLoaded) await this.loadComplete;
              this.nativeEl[prop] = val;
            };
          }

          Object.defineProperty(this.prototype, prop, config);
        }
      });
    }

    #isInit;
    #loadComplete;
    #hasLoaded = false;
    #isLoaded = false;
    #nativeEl;
    #standinEl;

    constructor() {
      super();

      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.append(this.constructor.template.content.cloneNode(true));
      }

      // If the custom element is defined before the custom element's HTML is parsed
      // no attributes will be available in the constructor (construction process).
      // Wait until initializing in the attributeChangedCallback or
      // connectedCallback or accessing any properties.
    }

    async loadStart() {
      // The first time we use the Promise created in the constructor.
      if (!this.loadComplete || this.#hasLoaded) {
        this.loadComplete = new PublicPromise();
      }
      this.#hasLoaded = true;
    }

    loadEnd() {
      this.loadComplete.resolve();
      return this.loadComplete;
    }

    get loadComplete() {
      return this.#loadComplete;
    }

    set loadComplete(promise) {
      this.#isLoaded = false;
      this.#loadComplete = promise;
      promise.then(() => {
        this.#isLoaded = true;
      });
    }

    get isLoaded() {
      return this.#isLoaded;
    }

    get nativeEl() {
      return this.#nativeEl ?? this.shadowRoot.querySelector(tag);
    }

    set nativeEl(val) {
      this.#nativeEl = val;
    }

    get defaultMuted() {
      return this.hasAttribute('muted');
    }

    set defaultMuted(val) {
      this.toggleAttribute('muted', Boolean(val));
    }

    get src() {
      return this.getAttribute('src');
    }

    set src(val) {
      this.setAttribute('src', `${val}`);
    }

    async #init() {
      if (this.#isInit) return;
      this.#isInit = true;

      this.#initStandinEl();
      this.#initNativeEl();

      // Keep some native child elements like track and source in sync.
      const childMap = new Map();
      // An unnamed <slot> will be filled with all of the custom element's
      // top-level child nodes that do not have the slot attribute.
      const slotEl = this.shadowRoot.querySelector('slot');
      slotEl?.addEventListener('slotchange', () => {
        const removeNativeChildren = new Map(childMap);
        slotEl
          .assignedElements()
          .filter((el) => ['track', 'source'].includes(el.localName))
          .forEach(async (el) => {
            // If the source or track is still in the assigned elements keep it.
            removeNativeChildren.delete(el);
            // Re-use clones if possible.
            let clone = childMap.get(el);
            if (!clone) {
              clone = el.cloneNode();
              childMap.set(el, clone);
            }
            if (this.loadComplete && !this.isLoaded) await this.loadComplete;
            this.nativeEl.append?.(clone);
          });
        removeNativeChildren.forEach((el) => el.remove());
      });

      // The video events are dispatched on the SuperMediaElement instance.
      // This makes it possible to add event listeners before the element is upgraded.
      Events.forEach((type) => {
        this.shadowRoot.addEventListener?.(type, (evt) => {
          if (evt.target !== this.nativeEl) return;
          this.dispatchEvent(new CustomEvent(evt.type, { detail: evt.detail }));
        }, true);
      });
    }

    #initStandinEl() {
      const dummyEl = document.createElement(tag, { is });

      [...this.attributes].forEach(({ name, value }) => {
        dummyEl.setAttribute(name, value);
      });

      this.#standinEl = {};
      getNativeElProps(dummyEl).forEach((name) => {
        this.#standinEl[name] = dummyEl[name];
      });

      // unload dummy video element
      dummyEl.removeAttribute('src');
      dummyEl.load();
    }

    async #initNativeEl() {
      if (this.loadComplete && !this.isLoaded) await this.loadComplete;

      // If there is no nativeEl by now, create it our bloody selves.
      if (!this.nativeEl) {
        // Neither Chrome or Firefox support setting the muted attribute
        // after using document.createElement.
        // Get around this by building the native tag as a string.
        const muted = this.hasAttribute('muted') ? ' muted' : '';

        const tpl = document.createElement('template');
        tpl.innerHTML = `<${tag}${is ? ` is="${is}"` : ''}${muted}></${tag}>`;
        this.shadowRoot.append(tpl.content);
      }
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
      // Initialize right after construction when the attributes become available.
      this.#init();
      this.#forwardAttribute(attrName, oldValue, newValue);
    }

    async #forwardAttribute(attrName, oldValue, newValue) {
      if (this.loadComplete && !this.isLoaded) await this.loadComplete;

      if (newValue === null) {
        this.nativeEl.removeAttribute?.(attrName);
      } else {
        // Ignore a few that don't need to be passed through just in case
        // it creates unexpected behavior.
        if (!['id', 'class'].includes(attrName)) {
          this.nativeEl.setAttribute?.(attrName, newValue);
        }
      }
    }

    connectedCallback() {
      this.#init();
    }
  };
};

function getNativeElProps(nativeElTest) {
  // Map all native element properties to the custom element
  // so that they're applied to the native element.
  // Skipping HTMLElement because of things like "attachShadow"
  // causing issues. Most of those props still need to apply to
  // the custom element.
  let nativeElProps = [];

  // Walk the prototype chain up to HTMLElement.
  // This will grab all super class props in between.
  // i.e. VideoElement and MediaElement
  for (
    let proto = Object.getPrototypeOf(nativeElTest);
    proto && proto !== HTMLElement.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    nativeElProps.push(...Object.getOwnPropertyNames(proto));
  }

  return nativeElProps;
}

/**
 * A utility to create Promises with convenient public resolve and reject methods.
 * @return {Promise}
 */
class PublicPromise extends Promise {
  constructor(executor = () => {}) {
    let res, rej;
    super((resolve, reject) => {
      executor(resolve, reject);
      res = resolve;
      rej = reject;
    });
    this.resolve = res;
    this.reject = rej;
  }
}

export const SuperVideoElement = SuperMediaMixin(HTMLElement, { tag: 'video' });
if (!globalThis.customElements.get('super-video')) {
  globalThis.customElements.define('super-video', SuperVideoElement);
}

export const SuperAudioElement = SuperMediaMixin(HTMLElement, { tag: 'audio' });
if (!globalThis.customElements.get('super-audio')) {
  globalThis.customElements.define('super-audio', SuperAudioElement);
}
