
type Constructor = new (...args: any[]) => {};

export function SuperMediaMixin<TBase extends Constructor>(Base: TBase);

export class SuperAudioElement extends HTMLAudioElement implements HTMLAudioElement {
  static readonly observedAttributes: string[];
  readonly nativeEl: HTMLAudioElement;
  loadComplete?: Promise<void>;
  isLoaded: Boolean;
  attributeChangedCallback(attrName: string, oldValue?: string | null, newValue?: string | null): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
}

export class SuperVideoElement extends HTMLVideoElement implements HTMLVideoElement {
  static readonly observedAttributes: string[];
  readonly nativeEl: HTMLVideoElement;
  loadComplete?: Promise<void>;
  isLoaded: Boolean;
  attributeChangedCallback(attrName: string, oldValue?: string | null, newValue?: string | null): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
}
