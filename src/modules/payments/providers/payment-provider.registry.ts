import { PAYMENTS_CONSTANTS } from '../constants/payments.constants.js';
import { razorpayProvider } from './razorpay.provider.js';
import type { PaymentGatewayProvider } from '../types/payments.types.js';

const providers: Record<string, PaymentGatewayProvider> = {
  [PAYMENTS_CONSTANTS.DEFAULT_GATEWAY]: razorpayProvider,
};

export function getPaymentGateway(gateway?: string): PaymentGatewayProvider {
  const name = gateway ?? PAYMENTS_CONSTANTS.DEFAULT_GATEWAY;
  const provider = providers[name];
  if (!provider) {
    return razorpayProvider;
  }
  return provider;
}

export function registerPaymentGateway(name: string, provider: PaymentGatewayProvider): void {
  providers[name] = provider;
}
