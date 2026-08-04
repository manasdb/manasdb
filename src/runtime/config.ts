import { StorageProvider } from '../storage/providers/StorageProvider.ts';

export interface RuntimeConfig {
  storageProvider?: StorageProvider;
  debug?: boolean;
}
