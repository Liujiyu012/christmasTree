// "Oh, Christmas Tree" — Kevin MacLeod (incompetech.com), ISRC USUAN1100366.
// CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
// Source, original checksum and attribution are in public/audio/CREDITS.txt.
// A smaller copy is self-hosted and prepared while waiting for playback permission.
async function loadChristmasTree(context: AudioContext) {
  const response = await fetch("/audio/oh-christmas-tree-96k-v1.mp3");
  if (!response.ok) throw new Error("Music could not be loaded");
  return context.decodeAudioData(await response.arrayBuffer());
}

// A blocked resume can stay pending until a later gesture. Keep the controls usable.
function resumeAudio(context: AudioContext): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(false), 300);
    context.resume().then(() => {
      clearTimeout(timer);
      resolve(context.state === "running");
    }, error => {
      clearTimeout(timer);
      if (error?.name === "NotAllowedError") resolve(false);
      else reject(error);
    });
  });
}

export class ChristmasMusic {
  private context: AudioContext | null = null;
  private buffer: Promise<AudioBuffer> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private startedAt = 0;
  private offset = 0;
  private request = 0;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;

  async play() {
    const request = ++this.request;
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    this.suspendTimer = null;
    this.context ??= new AudioContext();
    const context = this.context;
    // Download/decode independently of autoplay permission, so a first tap does not
    // have to wait for the entire recording to download before it can make sound.
    const loading = this.buffer ??= loadChristmasTree(context).catch(error => {
      this.buffer = null;
      throw error;
    });
    // Permission can be denied before loading finishes. Keep that background
    // preload rejection handled; a permitted play still reports it to the UI.
    void loading.catch(() => {});
    // Try autoplay; if blocked, a later page gesture will call play/unlock again.
    if (!await resumeAudio(context) || request !== this.request) return false;
    const buffer = await loading;
    if (request !== this.request || context.state !== "running") return false;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(.24, context.currentTime + .8);
    source.connect(gain).connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(0, this.offset % buffer.duration);
    this.startedAt = context.currentTime;
    this.source = source;
    this.gain = gain;
    return true;
  }

  unlock() {
    // Called synchronously from a gesture even if a previous play is still pending.
    void this.context?.resume().catch(() => {});
  }

  pause() {
    ++this.request;
    const context = this.context, source = this.source, gain = this.gain;
    if (!source || !context || !gain) {
      if (context?.state === "running") void context.suspend().catch(() => {});
      return;
    }
    this.offset += context.currentTime - this.startedAt;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + .15);
    source.stop(context.currentTime + .16);
    this.source = null;
    this.gain = null;
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = null;
      if (context.state === "running") void context.suspend().catch(() => {});
    }, 200);
  }

  dispose() {
    this.pause();
    if (this.suspendTimer) clearTimeout(this.suspendTimer);
    this.suspendTimer = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.buffer = null;
  }
}
