import { SdpUtils } from './SdpUtils.js';

export class SdpValidator {
  static validateOffer(sdp) {
    if (typeof sdp !== 'string' || sdp.length < 10) return { valid: false, reason: 'invalid_sdp' };
    if (!SdpUtils.mediaSections(sdp).length) return { valid: false, reason: 'no_media' };
    // No trickle ICE in v1: forbid explicit ice-options:trickle
    if (SdpUtils.hasLine(sdp, 'a=ice-options:trickle')) return { valid: false, reason: 'trickle_forbidden' };
    // Must include gathered candidates
    if (SdpUtils.countCandidates(sdp) === 0) return { valid: false, reason: 'no_candidates' };
    return { valid: true };
  }

  static validateAnswer(sdp) {
    // Similar baseline checks
    return this.validateOffer(sdp);
  }
}

