import { fixture, assert, aTimeout } from '@open-wc/testing';
// The super-video-element JS import is defined in web-test-runner.config.js
// for both an eager and lazy custom element upgrade.

describe('<super-video>', () => {
  it('is an instance of SuperVideoElement and HTMLElement', async function () {
    const superVideo = await fixture(`<super-video></super-video>`);
    assert(superVideo instanceof globalThis.SuperVideoElement);
    assert(superVideo instanceof HTMLElement);
  });

  it('uses attributes for getters if nativeEl is not ready yet', async function () {
    class MyVideoElement extends globalThis.SuperVideoElement {
      constructor() {
        super();
        // This shows that the video like API can be delayed for players like
        // YouTube, Vimeo, Wistia, any player that requires an async load.
        this.loadComplete = new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      }
    }
    if (!globalThis.customElements.get('my-video')) {
      globalThis.customElements.define('my-video', MyVideoElement);
    }

    const superVideo = await fixture(
      `<my-video muted autoplay src="http://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/low.mp4"></my-video>`
    );

    assert.equal(superVideo.defaultMuted, true, 'defaultMuted is true');
    assert.equal(superVideo.autoplay, true, 'autoplay is true');
    assert.equal(
      superVideo.src,
      'http://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/low.mp4'
    );
  });

  it('has a working muted attribute', async function () {
    this.timeout(10000);

    const superVideo = window.superVideo;

    assert(superVideo.hasAttribute('muted'), 'has muted attribute');
    assert(superVideo.muted, 'has muted=true property');
    assert(
      superVideo.nativeEl.hasAttribute('muted'),
      'nativeEl has muted attribute'
    );
    assert(superVideo.nativeEl.muted, 'nativeEl has muted=true property');

    let playing;
    superVideo.addEventListener('playing', () => (playing = true));

    try {
      await superVideo.play();
    } catch (error) {
      console.warn(error);
    }

    assert(playing, 'playing event fired');
    assert(!superVideo.paused, 'paused prop is false');
  });

  it('adds and removes tracks and sources', async function () {
    const superVideo = window.superVideo;

    superVideo.innerHTML = `
      <track default label="English" kind="captions" srclang="en" src="../en-cc.vtt">
      <track label="thumbnails" id="customTrack" default kind="metadata" src="https://image.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/storyboard.vtt">
    `;

    await aTimeout(0);

    assert.equal(superVideo.querySelectorAll('track').length, 2);
    assert.equal(superVideo.textTracks.length, 2);

    superVideo.querySelector('track').remove();

    await aTimeout(0);

    assert.equal(superVideo.querySelectorAll('track').length, 1);
    assert.equal(superVideo.textTracks.length, 1);
  });

  it('has HTMLVideoElement like properties', async function () {
    const superVideo = await fixture(`<super-video></super-video>`);
    const superVideoElementProps = [
      'addEventListener',
      'addTextTrack',
      'autoplay',
      'buffered',
      'cancelVideoFrameCallback',
      'canPlayType',
      'captureStream',
      'controls',
      'controlsList',
      'crossOrigin',
      'currentSrc',
      'currentTime',
      'defaultMuted',
      'defaultPlaybackRate',
      'disablePictureInPicture',
      'disableRemotePlayback',
      'dispatchEvent',
      'duration',
      'ended',
      'error',
      'getVideoPlaybackQuality',
      'HAVE_CURRENT_DATA',
      'HAVE_ENOUGH_DATA',
      'HAVE_FUTURE_DATA',
      'HAVE_METADATA',
      'HAVE_NOTHING',
      'height',
      'load',
      'loop',
      'mediaKeys',
      'muted',
      'NETWORK_EMPTY',
      'NETWORK_IDLE',
      'NETWORK_LOADING',
      'NETWORK_NO_SOURCE',
      'networkState',
      'onencrypted',
      'onenterpictureinpicture',
      'onleavepictureinpicture',
      'onwaitingforkey',
      'pause',
      'paused',
      'play',
      'playbackRate',
      'played',
      'playsInline',
      'poster',
      'preload',
      'preservesPitch',
      'readyState',
      'remote',
      'removeEventListener',
      'requestPictureInPicture',
      'requestVideoFrameCallback',
      'seekable',
      'seeking',
      'setMediaKeys',
      'setSinkId',
      'sinkId',
      'src',
      'srcObject',
      'textTracks',
      'videoHeight',
      'videoWidth',
      'volume',
      'webkitAudioDecodedByteCount',
      'webkitDecodedFrameCount',
      'webkitDroppedFrameCount',
      'webkitEnterFullScreen',
      'webkitEnterFullscreen',
      'webkitExitFullScreen',
      'webkitExitFullscreen',
      'webkitVideoDecodedByteCount',
      'width',
    ];

    superVideoElementProps.forEach((prop) => {
      assert(
        prop in superVideo,
        `${prop} exists in an instance of SuperVideoElement`
      );
    });
  });
});
