export class SdpUtils {
  static hasLine(sdp, prefix) {
    return sdp.split(/\r?\n/).some((l) => l.startsWith(prefix));
  }

  static countCandidates(sdp) {
    return sdp.split(/\r?\n/).filter((l) => l.startsWith('a=candidate:')).length;
  }

  static mediaSections(sdp) {
    return sdp.split(/\r?\n/).filter((l) => l.startsWith('m='));
  }
}

