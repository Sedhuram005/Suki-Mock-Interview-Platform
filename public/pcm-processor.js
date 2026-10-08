class PCMProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.len = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.buf.push(new Float32Array(ch));
      this.len += ch.length;
      // Flush every 512 samples (~32 ms at 16 kHz) for low-latency real-time captions
      if (this.len >= 512) {
        const out = new Float32Array(this.len);
        let o = 0;
        for (const b of this.buf) { out.set(b, o); o += b.length; }
        this.port.postMessage(out, [out.buffer]);
        this.buf = []; this.len = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
