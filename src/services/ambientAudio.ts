/**
 * Ambient Audio Synthesizer Engine
 * 100% Free, Zero Bandwidth, Client-Side Web Audio API
 * Generates focus sounds mathematically with zero external audio files.
 */

export type AmbientSoundType = 'none' | 'alpha40' | 'rain' | 'brown' | 'clock';

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private currentType: AmbientSoundType = 'none';
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private volume: number = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentType(): AmbientSoundType {
    return this.currentType;
  }

  public stop() {
    this.activeNodes.forEach((node) => {
      if (typeof node === 'number') {
        window.clearInterval(node);
      } else {
        try {
          if ('stop' in node && typeof (node as any).stop === 'function') {
            (node as any).stop();
          }
          node.disconnect();
        } catch {}
      }
    });
    this.activeNodes = [];
    this.currentType = 'none';
  }

  public play(type: AmbientSoundType) {
    this.stop();
    if (type === 'none') return;

    this.initContext();
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.currentType = type;

    switch (type) {
      case 'alpha40':
        this.playAlphaBinaural();
        break;
      case 'rain':
        this.playRainNoise();
        break;
      case 'brown':
        this.playBrownNoise();
        break;
      case 'clock':
        this.playClockTick();
        break;
    }
  }

  /**
   * 40Hz Alpha / Gamma Focus Binaural Beat:
   * Left ear: 200 Hz carrier wave
   * Right ear: 240 Hz carrier wave
   * Brain perceives 40 Hz difference frequency associated with peak cognitive focus.
   */
  private playAlphaBinaural() {
    if (!this.ctx || !this.masterGain) return;

    const merger = this.ctx.createChannelMerger(2);

    // Left Oscillator (200Hz)
    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(200, this.ctx.currentTime);

    const gainLeft = this.ctx.createGain();
    gainLeft.gain.setValueAtTime(0.3, this.ctx.currentTime);
    oscLeft.connect(gainLeft);
    gainLeft.connect(merger, 0, 0);

    // Right Oscillator (240Hz -> 40Hz difference)
    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(240, this.ctx.currentTime);

    const gainRight = this.ctx.createGain();
    gainRight.gain.setValueAtTime(0.3, this.ctx.currentTime);
    oscRight.connect(gainRight);
    gainRight.connect(merger, 0, 1);

    merger.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();

    this.activeNodes.push(oscLeft, oscRight, gainLeft, gainRight, merger);
  }

  /**
   * Synthesized Rain Noise:
   * Pink noise buffer passed through a bandpass filter with resonant gentle turbulence.
   */
  private playRainNoise() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to simulate soft raindrops on rooftop
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.masterGain);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter);
  }

  /**
   * Synthesized Deep Brown Noise:
   * Smooth, deep low-frequency waterfall hum for anxiety reduction.
   */
  private playBrownNoise() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for volume
    }

    const brownSource = this.ctx.createBufferSource();
    brownSource.buffer = noiseBuffer;
    brownSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    brownSource.connect(filter);
    filter.connect(this.masterGain);

    brownSource.start();
    this.activeNodes.push(brownSource, filter);
  }

  /**
   * Synthesized Exam Hall Clock Pacer:
   * Generates a soft rhythmic 1-second acoustic tick (60 BPM) for timed exam pacing.
   */
  private playClockTick() {
    if (!this.ctx || !this.masterGain) return;

    const scheduleTick = () => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    };

    scheduleTick();
    const timerId = window.setInterval(scheduleTick, 1000);
    this.activeNodes.push(timerId);
  }
}

export const ambientAudio = new AmbientAudioEngine();
