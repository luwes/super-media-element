/**
 * Super Media Element
 * Based on https://github.com/muxinc/custom-video-element - Mux - MIT License
 *
 * The goal is to create an element that works just like the video element
 * but can be extended/sub-classed, because native elements cannot be
 * extended today across browsers. Support for extending async loaded video
 * like API's. e.g. video players.
 */

const styles = `
  :host {
    display: inline-grid;
    line-height: 0;
    width: auto;
    height: auto;
  }

  video,
  audio {
    grid-column: 1;
    grid-row: 1;
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
  // Can't check typeof directly on element prototypes without
  // throwing Illegal Invocation errors, so creating an element
  // to check on instead.
  const nativeElTest = document.createElement(tag, { is });
  const nativeElProps = getNativeElProps(nativeElTest);

  // Most of the media events are set on the HTMLElement prototype.
  const AllEvents = [
    ...nativeElProps,
    ...Object.getOwnPropertyNames(HTMLElement.prototype),
  ]
    .filter((name) => name.startsWith('on'))
    .map((name) => name.slice(2));

  return class SuperMedia extends superclass {
    static #isDefined;

    // observedAttributes is required to trigger attributeChangedCallback
    // for any attributes on the custom element.
    // Attributes need to be the lowercase word, e.g. crossorigin, not crossOrigin
    static get observedAttributes() {
      SuperMedia.#define();

      // Instead of manually creating a list of all observed attributes,
      // observe any getter/setter prop name (lowercase)
      let attrs = [];
      Object.getOwnPropertyNames(this.prototype).forEach((propName) => {
        // Non-func properties throw errors because it's not an instance
        let isFunc = false;
        try {
          if (typeof this.prototype[propName] === 'function') isFunc = true;
        } catch (e) {
          //
        }
        // Exclude functions and constants
        if (!isFunc && propName !== propName.toUpperCase()) {
          attrs.push(propName.toLowerCase());
        }
      });

      // Include any attributes from the super class (recursive)
      const supAttrs = Object.getPrototypeOf(this).observedAttributes;
      // Include any attributes from the custom built-in.
      const natAttrs = Object.getPrototypeOf(nativeElTest).observedAttributes;

      return [...(natAttrs ?? []), ...attrs, ...(supAttrs ?? [])];
    }

    static #define() {
      if (this.#isDefined) return;
      this.#isDefined = true;

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
              return (
                this.get?.(prop) ??
                this.nativeEl?.[prop] ??
                this.#standinEl[prop]
              );
            },
          };

          if (prop !== prop.toUpperCase()) {
            // Setter (not a CONSTANT)
            config.set = async function (val) {
              this.#init();
              if (this.loadComplete && !this.isLoaded) await this.loadComplete;
              if (this.set) {
                this.set(prop, val);
                return;
              }
              this.nativeEl[prop] = val;
            };
          }

          Object.defineProperty(this.prototype, prop, config);
        }
      });
    }

    #isInit;
    #loadComplete;
    #isLoaded = false;
    #nativeEl;
    #standinEl;

    constructor() {
      super();

      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.append(template.content.cloneNode(true));
      }

      // If the custom element is defined before the custom element's HTML is parsed
      // no attributes will be available in the constructor (construction process).
      // Wait until initializing in the attributeChangedCallback or
      // connectedCallback or accessing any properties.
    }

    set loadComplete(promise) {
      this.#isLoaded = false;
      this.#loadComplete = promise;
      promise.then(() => {
        this.#isLoaded = true;
      });
    }

    get loadComplete() {
      return this.#loadComplete;
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
        this.shadowRoot.append(document.createElement(tag, { is }));
      }
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
      AllEvents.forEach((type) => {
        this.shadowRoot.addEventListener?.(
          type,
          (evt) => {
            if (evt.target !== this.nativeEl) {
              return;
            }
            // Filter out non-media events.
            if (
              !['Event', 'CustomEvent', 'PictureInPictureEvent'].includes(
                evt.constructor.name
              )
            ) {
              return;
            }
            this.dispatchEvent(
              new CustomEvent(evt.type, { detail: evt.detail })
            );
          },
          true
        );
      });

      // Initialize all the attribute properties
      // This is required before attributeChangedCallback is called after construction
      // so the initial state of all the attributes are forwarded to the native element.
      // Don't call attributeChangedCallback directly here because the extending class
      // could have overridden attributeChangedCallback leading to unexpected results.
      [...this.attributes].forEach((attrNode) => {
        this.#forwardAttribute(attrNode.name, null, attrNode.value);
      });

      // Neither Chrome or Firefox support setting the muted attribute
      // after using document.createElement.
      // One way to get around this would be to build the native tag as a string.
      // But just fixing it manually for now.
      // Apparently this may also be an issue with <input checked> for buttons
      if (this.loadComplete && !this.isLoaded) await this.loadComplete;
      if (this.nativeEl.defaultMuted) {
        this.muted = true;
      }
    }

    async attributeChangedCallback(attrName, oldValue, newValue) {
      // Initialize right after construction when the attributes become available.
      if (!this.#isInit) {
        await this.#init();
      }

      this.#forwardAttribute(attrName, oldValue, newValue);
    }

    // We need to handle sub-class custom attributes differently from
    // attrs meant to be passed to the internal native el.
    async #forwardAttribute(attrName, oldValue, newValue) {
      if (this.loadComplete && !this.isLoaded) await this.loadComplete;

      // Find the matching prop for custom attributes
      const ownProps = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
      const propName = ownProps.find(
        (name) => name.toLowerCase() === attrName.toLowerCase()
      );

      // Check if this is the original custom native element or a subclass
      const isBaseElement =
        Object.getPrototypeOf(this.constructor).name === 'HTMLElement';

      // If this is a subclass custom attribute we want to set the
      // matching property on the subclass
      if (propName && !isBaseElement) {
        // Boolean props should never start as null
        if (typeof this[propName] == 'boolean') {
          // null is returned when attributes are removed i.e. boolean attrs
          if (newValue === null) {
            this[propName] = false;
          } else {
            // The new value might be an empty string, which is still true
            // for boolean attributes
            this[propName] = true;
          }
        } else {
          this[propName] = newValue;
        }
      } else {
        // When this is the original Custom Element, or the subclass doesn't
        // have a matching prop, pass it through.
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

export const SuperVideoElement = SuperMediaMixin(HTMLElement, { tag: 'video' });
if (!globalThis.customElements.get('super-video')) {
  globalThis.customElements.define('super-video', SuperVideoElement);
  globalThis.SuperVideoElement = SuperVideoElement;
}

export const SuperAudioElement = SuperMediaMixin(HTMLElement, { tag: 'audio' });
if (!globalThis.customElements.get('super-audio')) {
  globalThis.customElements.define('super-audio', SuperAudioElement);
  globalThis.SuperAudioElement = SuperAudioElement;
}
