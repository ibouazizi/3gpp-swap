import { IceGatherer } from './IceGatherer.js';

export class SwapWebRTCHelper {
  constructor(swapClient) {
    this.swap = swapClient;
    this.pc = null;
  }

  async createOffer(config) {
    if (typeof RTCPeerConnection === 'undefined') throw new Error('RTCPeerConnection not available');
    this.pc = new RTCPeerConnection(config);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await IceGatherer.waitForGathering(this.pc);
    return this.pc.localDescription.sdp;
  }

  async sendOffer(offer, criteria) {
    return new Promise((resolve, reject) => {
      this.swap.connectOffer(offer, criteria).catch(reject);
      this.swap.once('accept', async (answer) => {
        await this.pc.setRemoteDescription({ type: 'answer', sdp: answer });
        resolve(this.pc);
      });
      this.swap.once('reject', (reason) => reject(new Error(`Connection rejected: ${reason}`)));
    });
  }
}

