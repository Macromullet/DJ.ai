// Dependency Injection Container
// Follows SOLID principles - Dependency Inversion Principle

import type { IMusicProvider } from '../types/IMusicProvider';
import type { ITTSService } from '../types/ITTSService';
import type { IAICommentaryService } from '../types/IAICommentaryService';

export interface ServiceContainer {
  musicProvider: IMusicProvider;
  ttsService: ITTSService;
  aiCommentaryService?: IAICommentaryService;
}

class DIContainer {
  private services: Partial<ServiceContainer> = {};

  // Register a service
  register<K extends keyof ServiceContainer>(
    key: K,
    service: ServiceContainer[K]
  ): void {
    this.services[key] = service;
  }

  // Get a service
  get<K extends keyof ServiceContainer>(key: K): ServiceContainer[K] {
    const service = this.services[key];
    if (!service) {
      throw new Error(`Service not registered: ${key}`);
    }
    return service as ServiceContainer[K];
  }

  // Check if service is registered
  has<K extends keyof ServiceContainer>(key: K): boolean {
    return this.services[key] !== undefined;
  }

  // Clear all services (for testing)
  clear(): void {
    this.services = {};
  }

  // Get all registered services
  getAll(): Partial<ServiceContainer> {
    return { ...this.services };
  }
}

// Export singleton container
export const container = new DIContainer();

// Helper functions for common operations
export function registerServices(services: Partial<ServiceContainer>): void {
  Object.entries(services).forEach(([key, service]) => {
    if (service) {
      container.register(key as keyof ServiceContainer, service);
    }
  });
}

export function getMusicProvider(): IMusicProvider {
  return container.get('musicProvider');
}

export function getTTSService(): ITTSService {
  return container.get('ttsService');
}

export function getAICommentaryService(): IAICommentaryService | undefined {
  return container.has('aiCommentaryService') 
    ? container.get('aiCommentaryService') 
    : undefined;
}
