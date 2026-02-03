declare module "tweetnacl" {
  export interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface BoxStatic {
    keyPair(): BoxKeyPair;
    (
      msg: Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array,
    ): Uint8Array;
    open(
      msg: Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array,
    ): Uint8Array | false;
    readonly nonceLength: number;
  }

  export function randomBytes(n: number): Uint8Array;

  const nacl: {
    box: BoxStatic;
    randomBytes: typeof randomBytes;
  };
  export default nacl;
}

declare module "tweetnacl-util" {
  export function encodeUTF8(bytes: Uint8Array): string;
  export function decodeUTF8(str: string): Uint8Array;
}
