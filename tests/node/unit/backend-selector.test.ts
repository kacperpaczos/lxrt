import { BackendSelector } from '../../../src/app/BackendSelector';

describe('BackendSelector (Node + ORT)', () => {
  let selector: BackendSelector;

  beforeEach(() => {
    selector = new BackendSelector();
  });

  afterEach(() => {
    // BackendSelector doesn't have dispose method, just clear
    selector.clear();
  });

  it('tworzy selector instance', () => {
    expect(selector).toBeDefined();
    expect(selector).toBeInstanceOf(BackendSelector);
  });

  it('obsługuje backend detection', () => {
    const backends = selector.detectAvailableBackends();
    
    expect(backends).toBeDefined();
    expect(Array.isArray(backends)).toBe(true);
    expect(backends.length).toBeGreaterThan(0);
    
    // Should detect at least CPU backend
    expect(backends).toContain('cpu');
    
    console.log(`✅ Available backends: ${backends.join(', ')}`);
  });

  it('obsługuje backend selection', () => {
    const selectedBackend = selector.selectBackend('cpu');
    
    expect(selectedBackend).toBeDefined();
    expect(selectedBackend.type).toBe('cpu');
    expect(selectedBackend.available).toBe(true);
    
    console.log(`✅ Selected backend: ${selectedBackend.type}`);
  });

  it('obsługuje backend preferences', () => {
    const preferences = ['gpu', 'cpu', 'wasm'];
    const selectedBackend = selector.selectBackend('cpu', preferences);
    
    expect(selectedBackend).toBeDefined();
    expect(selectedBackend.type).toBe('cpu');
    expect(selectedBackend.available).toBe(true);
    
    console.log(`✅ Backend with preferences: ${selectedBackend.type}`);
  });

  it('obsługuje backend fallback', () => {
    const selectedBackend = selector.selectBackend('gpu'); // Might not be available
    
    expect(selectedBackend).toBeDefined();
    expect(selectedBackend.type).toBeDefined();
    
    // Should fallback to available backend
    if (!selectedBackend.available) {
      expect(selectedBackend.fallback).toBeDefined();
    }
    
    console.log(`✅ Backend fallback: ${selectedBackend.type} (available: ${selectedBackend.available})`);
  });

  it('obsługuje backend configuration', () => {
    const config = selector.getBackendConfig('cpu');
    
    expect(config).toBeDefined();
    expect(config.type).toBe('cpu');
    expect(config.settings).toBeDefined();
    
    console.log(`✅ Backend config: ${JSON.stringify(config.settings)}`);
  });

  it('obsługuje backend performance metrics', () => {
    const metrics = selector.getPerformanceMetrics('cpu');
    
    expect(metrics).toBeDefined();
    expect(metrics.type).toBe('cpu');
    expect(metrics.performance).toBeDefined();
    expect(metrics.performance.score).toBeGreaterThan(0);
    
    console.log(`✅ Backend performance: ${metrics.performance.score}`);
  });

  it('obsługuje backend comparison', () => {
    const comparison = selector.compareBackends(['cpu', 'wasm']);
    
    expect(comparison).toBeDefined();
    expect(Array.isArray(comparison)).toBe(true);
    expect(comparison.length).toBeGreaterThan(0);
    
    comparison.forEach(backend => {
      expect(backend.type).toBeDefined();
      expect(backend.performance).toBeDefined();
      expect(backend.performance.score).toBeGreaterThan(0);
    });
    
    console.log(`✅ Backend comparison: ${comparison.length} backends`);
  });

  it('obsługuje backend optimization', () => {
    const optimized = selector.optimizeBackend('cpu', {
      modelType: 'llm',
      modelSize: 'large',
      deviceMemory: 8192,
    });
    
    expect(optimized).toBeDefined();
    expect(optimized.type).toBe('cpu');
    expect(optimized.optimized).toBe(true);
    expect(optimized.settings).toBeDefined();
    
    console.log(`✅ Optimized backend: ${JSON.stringify(optimized.settings)}`);
  });

  it('obsługuje backend monitoring', () => {
    const monitor = selector.startMonitoring('cpu');
    
    expect(monitor).toBeDefined();
    expect(monitor.type).toBe('cpu');
    expect(monitor.active).toBe(true);
    
    // Simulate some usage
    monitor.recordUsage(1000, 0.5);
    monitor.recordUsage(2000, 0.8);
    
    const stats = monitor.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalUsage).toBeGreaterThan(0);
    expect(stats.averageLoad).toBeGreaterThan(0);
    
    monitor.stop();
    expect(monitor.active).toBe(false);
    
    console.log(`✅ Backend monitoring: ${stats.totalUsage}ms usage, ${stats.averageLoad} load`);
  });

  it('obsługuje backend error handling', () => {
    const errorBackend = selector.selectBackend('invalid-backend');
    
    expect(errorBackend).toBeDefined();
    // Invalid backend should fallback to CPU which is available
    expect(errorBackend.available).toBe(true);
    expect(errorBackend.fallback).toBe('invalid-backend');
    
    console.log(`✅ Backend error handling: fallback to ${errorBackend.type}`);
  });

  it('obsługuje backend cleanup', () => {
    const monitor = selector.startMonitoring('cpu');
    expect(monitor.active).toBe(true);
    
    selector.dispose();
    
    // After dispose, monitor should be stopped
    expect(monitor.active).toBe(false);
  });
});
