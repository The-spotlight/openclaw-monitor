class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(h => {
        try { h(data); } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
      });
    }
  }
}

export default new EventBus();
