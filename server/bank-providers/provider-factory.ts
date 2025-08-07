import type { SupportedProvider } from "@shared/schema";
import { BaseBankProvider, type AuthCredentials } from "./base-provider";
import { WiseProvider } from "./wise-provider";
import { RevolutProvider } from "./revolut-provider";

export class ProviderFactory {
  static createProvider(provider: SupportedProvider, credentials: AuthCredentials): BaseBankProvider {
    switch (provider) {
      case 'wise':
        return new WiseProvider(credentials);
      case 'revolut':
        return new RevolutProvider(credentials);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  static getSupportedProviders(): SupportedProvider[] {
    return ['wise', 'revolut'];
  }

  static getProviderInfo(provider: SupportedProvider) {
    const providerInfoMap = {
      wise: {
        name: 'Wise',
        authType: 'api_key',
        authUrl: 'https://wise.com/settings/api-tokens',
        instructions: 'Create a read-only API token in your Wise settings',
        requiredScopes: ['read'],
        testable: true,
      },
      revolut: {
        name: 'Revolut Business',
        authType: 'oauth',
        authUrl: 'https://business.revolut.com/settings/api',
        instructions: 'Create API credentials in your Revolut Business settings',
        requiredScopes: ['READ'],
        testable: true,
      },
    };

    return providerInfoMap[provider];
  }
}