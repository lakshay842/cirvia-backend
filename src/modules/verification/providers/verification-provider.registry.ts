import type {
  VerificationProvider,
  VerificationProviderInput,
  VerificationProviderResult,
} from '../types/verification.types.js';
import { VERIFICATION_CONSTANTS } from '../constants/verification.constants.js';
import { getLogger } from '@logger/index.js';

const logger = getLogger();

abstract class BaseVerificationProvider implements VerificationProvider {
  abstract readonly name: string;

  async verify(input: VerificationProviderInput): Promise<VerificationProviderResult> {
    logger.info({ provider: this.name, verificationId: input.verificationId }, 'Provider stub invoked');
    return {
      provider: this.name,
      success: false,
      errorMessage: `${this.name} integration not configured.`,
    };
  }
}

export class HyperVergeProvider extends BaseVerificationProvider {
  readonly name = VERIFICATION_CONSTANTS.PROVIDERS.HYPERVERGE;
}

export class AuthBridgeProvider extends BaseVerificationProvider {
  readonly name = VERIFICATION_CONSTANTS.PROVIDERS.AUTHBRIDGE;
}

export class IdfyProvider extends BaseVerificationProvider {
  readonly name = VERIFICATION_CONSTANTS.PROVIDERS.IDFY;
}

export class SignzyProvider extends BaseVerificationProvider {
  readonly name = VERIFICATION_CONSTANTS.PROVIDERS.SIGNZY;
}

export class DecentroProvider extends BaseVerificationProvider {
  readonly name = VERIFICATION_CONSTANTS.PROVIDERS.DECENTRO;
}

export class ManualVerificationProvider extends BaseVerificationProvider {
  readonly name = VERIFICATION_CONSTANTS.PROVIDERS.MANUAL;

  override async verify(_input: VerificationProviderInput): Promise<VerificationProviderResult> {
    return {
      provider: this.name,
      success: true,
      metadata: { mode: 'manual_review' },
    };
  }
}

export const verificationProviders: Record<string, VerificationProvider> = {
  [VERIFICATION_CONSTANTS.PROVIDERS.HYPERVERGE]: new HyperVergeProvider(),
  [VERIFICATION_CONSTANTS.PROVIDERS.AUTHBRIDGE]: new AuthBridgeProvider(),
  [VERIFICATION_CONSTANTS.PROVIDERS.IDFY]: new IdfyProvider(),
  [VERIFICATION_CONSTANTS.PROVIDERS.SIGNZY]: new SignzyProvider(),
  [VERIFICATION_CONSTANTS.PROVIDERS.DECENTRO]: new DecentroProvider(),
  [VERIFICATION_CONSTANTS.PROVIDERS.MANUAL]: new ManualVerificationProvider(),
};

export function getVerificationProvider(name: string): VerificationProvider {
  return verificationProviders[name] ?? verificationProviders[VERIFICATION_CONSTANTS.PROVIDERS.MANUAL]!;
}
