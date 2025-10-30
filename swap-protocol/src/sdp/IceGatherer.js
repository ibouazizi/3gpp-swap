export class IceGatherer {
  static async waitForGathering(pc) {
    if (pc.iceGatheringState === 'complete') return;
    return new Promise((resolve) => {
      const onState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener?.('icegatheringstatechange', onState);
          resolve();
        }
      };
      pc.addEventListener?.('icegatheringstatechange', onState);
    });
  }
}

