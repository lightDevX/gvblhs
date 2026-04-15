declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
    [key: string]: any;
  }

  export interface VerifyOptions {
    [key: string]: any;
  }

  export function sign(
    payload: object,
    secretOrPrivateKey: string,
    options?: SignOptions,
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string,
    options?: VerifyOptions,
  ): any;

  export default { sign, verify };
}
