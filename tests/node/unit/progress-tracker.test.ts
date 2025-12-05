import { ProgressTracker } from '../../../src/utils/ProgressTracker';

describe('ProgressTracker (Node + ORT)', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  afterEach(() => {
    // Properly dispose tracker to clean up timers
    tracker.dispose();
  });

  it('tworzy tracker instance', () => {
    expect(tracker).toBeDefined();
    expect(tracker).toBeInstanceOf(ProgressTracker);
  });

  it('handles progress events', (done) => {
    const testProgress = {
      stage: 'loading',
      progress: 50,
      message: 'Loading model...',
    };

    tracker.on('progress', (data) => {
      expect(data).toBeDefined();
      expect(data.stage).toBe(testProgress.stage);
      expect(data.progress).toBe(testProgress.progress);
      expect(data.message).toBe(testProgress.message);
      done();
    });

    tracker.emit('progress', testProgress);
  });

  it('handles error events', (done) => {
    const testError = new Error('Test error');

    tracker.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toBe('Test error');
      done();
    });

    tracker.emit('error', testError);
  });

  it('handles complete events', (done) => {
    const testResult = {
      success: true,
      duration: 1000,
      message: 'Operation completed',
    };

    tracker.on('complete', (result) => {
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.duration).toBe(1000);
      expect(result.message).toBe('Operation completed');
      done();
    });

    tracker.emit('complete', testResult);
  });

  it('handles multiple listeners', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    tracker.on('progress', listener);
    tracker.on('progress', listener);
    tracker.on('progress', listener);

    tracker.update('test', 100, 'Test message');

    expect(callCount).toBe(3);
  });

  it('handles listener removal', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    tracker.on('progress', listener);
    tracker.removeListener('progress', listener);

    tracker.update('test', 100, 'Test message');

    expect(callCount).toBe(0);
  });

  it('handles once listeners', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    tracker.once('progress', listener);

    tracker.update('test', 100, 'Test message');
    tracker.update('test', 200, 'Test message 2');

    expect(callCount).toBe(1);
  });

  it('handles progress tracking', () => {
    tracker.update('test-operation', 0, 'Starting');
    
    const progress = tracker.getProgress('test-operation');
    expect(progress).toBeDefined();
    expect(progress?.stage).toBe('test-operation');
    expect(progress?.progress).toBe(0);
    
    tracker.update('test-operation', 50, 'Halfway done');
    const progress50 = tracker.getProgress('test-operation');
    expect(progress50?.progress).toBe(50);
    expect(progress50?.message).toBe('Halfway done');
    
    tracker.complete('test-operation', 'Done!');
    const progressComplete = tracker.getProgress('test-operation');
    expect(progressComplete?.progress).toBe(100);
    expect(progressComplete?.message).toBe('Done!');
  });

  it('handles progress chaining', () => {
    tracker.update('chained-operation', 25, 'Step 1');
    tracker.update('chained-operation', 50, 'Step 2');
    tracker.update('chained-operation', 75, 'Step 3');
    tracker.complete('chained-operation', 'All done');
    
    const progress = tracker.getProgress('chained-operation');
    expect(progress?.progress).toBe(100);
    expect(progress?.message).toBe('All done');
  });

  it('handles progress error handling', () => {
    tracker.update('error-operation', 50, 'Halfway');
    tracker.error('error-operation', new Error('Something went wrong'));
    
    const progress = tracker.getProgress('error-operation');
    expect(progress?.progress).toBe(0); // Error resets progress
    expect(progress?.message).toContain('Error: Something went wrong');
  });

  it('handles progress cleanup', () => {
    tracker.update('cleanup-operation', 50, 'Halfway');
    
    const progress = tracker.getProgress('cleanup-operation');
    expect(progress).toBeDefined();
    
    tracker.clear();
    
    // After clear, progress should be removed
    const clearedProgress = tracker.getProgress('cleanup-operation');
    expect(clearedProgress).toBeUndefined();
  });

  it('handles progress statistics', () => {
    tracker.update('operation-1', 50, 'Halfway');
    tracker.update('operation-2', 100, 'Complete');
    
    const stats = tracker.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalOperations).toBe(0); // No operations tracked yet
    expect(stats.completedOperations).toBe(0);
    expect(stats.activeOperations).toBe(2); // 2 active operations
  });
});
