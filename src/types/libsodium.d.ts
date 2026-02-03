declare module "libsodium-wrappers" {
  export interface CryptoBox {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }

  interface LibSodium {
    ready: Promise<void>;
    crypto_box_seed_keypair(seed: Uint8Array): CryptoBox;
    crypto_box_keypair(): CryptoBox;
    crypto_secretbox_easy(
      message: string | Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array,
    ): Uint8Array;
    crypto_secretbox_open_easy(
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array,
    ): Uint8Array | false;
    crypto_box_easy(
      message: string | Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array,
    ): Uint8Array;
    crypto_box_open_easy(
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array,
    ): Uint8Array | false;
    crypto_box_seal(
      message: string | Uint8Array,
      publicKey: Uint8Array,
    ): Uint8Array;
    crypto_box_seal_open(
      ciphertext: Uint8Array,
      publicKey: Uint8Array,
      secretKey: Uint8Array,
    ): Uint8Array | false;
    randombytes_buf(length: number): Uint8Array;
    crypto_generichash(
      hashLen: number,
      message: string | Uint8Array,
      key?: Uint8Array,
    ): Uint8Array;
    to_base64(buffer: Uint8Array): string;
    from_base64(str: string, ignore_padding?: boolean): Uint8Array;
    from_string(str: string): Uint8Array;
    to_string(buffer: Uint8Array): string;
    to_hex(buffer: Uint8Array): string;
    from_hex(hexStr: string): Uint8Array;
  }

  const sodium: LibSodium;
  export default sodium;
}
