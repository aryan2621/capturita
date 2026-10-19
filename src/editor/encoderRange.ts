import { api } from '../lib/api';

/**
 * WebKit's H.264 encoder (VideoToolbox) on recent macOS writes limited-range samples with no VUI
 * in the SPS (which by the H.264 spec means limited range), yet reports `fullRange: true` in its
 * decoder config. Mediabunny copies that into the MP4 `colr` box, so players expand nothing and
 * every export looks washed out (whites ~232, blacks ~16). The SPS describes the samples, so
 * when the two disagree the reported colour space is corrected to match it.
 *
 * (A decode round trip can't detect this: WebKit's decoder hands back NV12 already expanded to
 * full range and labelled so, whatever the stream's range.)
 */
export function correctColorSpace(meta: EncodedVideoChunkMetadata | undefined) {
    const decoderConfig = meta?.decoderConfig;
    const reported = decoderConfig?.colorSpace;
    if (!decoderConfig?.description || reported?.fullRange === undefined || reported.fullRange === null) return;
    const fullRange = spsFullRange(decoderConfig.description);
    if (fullRange === null || fullRange === reported.fullRange) return;
    api.log(`[export] encoder reports fullRange=${reported.fullRange} but its SPS says ${fullRange}; tagging the file ${fullRange ? 'full' : 'limited'} range`);
    decoderConfig.colorSpace = { primaries: reported.primaries, transfer: reported.transfer, matrix: reported.matrix, fullRange };
}

/** video_full_range_flag of the first SPS in an avcC record (false when the SPS has no VUI), or null if it can't be read. */
function spsFullRange(description: AllowSharedBufferSource): boolean | null {
    try {
        const avcc = ArrayBuffer.isView(description) ? new Uint8Array(description.buffer, description.byteOffset, description.byteLength) : new Uint8Array(description);
        if (avcc[0] !== 1 || (avcc[5] & 0x1f) === 0) return null;
        const length = (avcc[6] << 8) | avcc[7];
        // Drop emulation-prevention bytes (00 00 03) and the one-byte NAL header.
        const bytes: number[] = [];
        for (let i = 9; i < 8 + length; i++) {
            if (i >= 11 && avcc[i] === 3 && avcc[i - 1] === 0 && avcc[i - 2] === 0) continue;
            bytes.push(avcc[i]);
        }
        const bits = new BitReader(bytes);
        const profile = bits.u(8);
        bits.u(16); // constraint flags, level
        bits.ue(); // seq_parameter_set_id
        if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].includes(profile)) {
            const chroma = bits.ue();
            if (chroma === 3) bits.u(1);
            bits.ue();
            bits.ue();
            bits.u(1);
            if (bits.u(1)) {
                for (let i = 0; i < (chroma === 3 ? 12 : 8); i++) {
                    if (!bits.u(1)) continue;
                    let last = 8;
                    let next = 8;
                    for (let j = 0; j < (i < 6 ? 16 : 64) && next !== 0; j++) {
                        next = (last + bits.se() + 256) % 256;
                        last = next === 0 ? last : next;
                    }
                }
            }
        }
        bits.ue(); // log2_max_frame_num
        const pocType = bits.ue();
        if (pocType === 0) bits.ue();
        else if (pocType === 1) {
            bits.u(1);
            bits.se();
            bits.se();
            for (let n = bits.ue(); n > 0; n--) bits.se();
        }
        bits.ue(); // max_num_ref_frames
        bits.u(1);
        bits.ue(); // width in macroblocks
        bits.ue(); // height in map units
        if (!bits.u(1)) bits.u(1);
        bits.u(1);
        if (bits.u(1)) for (let i = 0; i < 4; i++) bits.ue();
        if (!bits.u(1)) return false; // no VUI
        if (bits.u(1) && bits.u(8) === 255) bits.u(32);
        if (bits.u(1)) bits.u(1);
        if (!bits.u(1)) return false; // no video signal type
        bits.u(3);
        return bits.u(1) === 1;
    } catch {
        return null;
    }
}

class BitReader {
    private position = 0;
    constructor(private bytes: number[]) {}
    u(count: number) {
        let value = 0;
        for (let i = 0; i < count; i++) {
            const byte = this.bytes[this.position >> 3];
            if (byte === undefined) throw new Error('SPS ended early');
            value = value * 2 + ((byte >> (7 - (this.position & 7))) & 1);
            this.position++;
        }
        return value;
    }
    ue() {
        let zeros = 0;
        while (this.u(1) === 0) if (++zeros > 31) throw new Error('bad exp-Golomb code');
        return 2 ** zeros - 1 + this.u(zeros);
    }
    se() {
        const k = this.ue();
        return k % 2 ? (k + 1) / 2 : -k / 2;
    }
}
