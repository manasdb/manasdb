export type EventCallback<T = any> = (payload: T) => void | Promise<void>;

export class EventBus {
  private _listeners = new Map<string, EventCallback[]>();

  public subscribe<T>(event: string, callback: EventCallback<T>): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(callback);
  }

  public unsubscribe<T>(event: string, callback: EventCallback<T>): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  public async publish<T>(event: string, payload: T): Promise<void> {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    // Execute all listeners concurrently, they should not block the main pipeline unless required.
    // In our architecture, events are asynchronous notifications.
    const promises = listeners.map(cb => {
      try {
        return Promise.resolve(cb(payload));
      } catch (err) {
        console.error(`Error executing event listener for ${event}:`, err);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  public clear(): void {
    this._listeners.clear();
  }
}

// Global default instance, though it will typically be injected via ServiceContainer.
export const defaultEventBus = new EventBus();
