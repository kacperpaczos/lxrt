import { ProgressTracker } from '../../../src/utils/ProgressTracker';

describe('ProgressTracker (Node + ORT)', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  afterEach(() => {
    tracker.dispose();
  });

  it('tworzy tracker instance', () => {
    expect(tracker).toBeDefined();
    expect(tracker).toBeInstanceOf(ProgressTracker);
  });

  it('obsługuje progress events', (done) => {
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

  it('obsługuje error events', (done) => {
    const testError = new Error('Test error');

    tracker.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toBe('Test error');
      done();
    });

    tracker.emit('error', testError);
  });

  it('obsługuje complete events', (done) => {
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

  it('obsługuje multiple listeners', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    tracker.on('progress', listener);
    tracker.on('progress', listener);
    tracker.on('progress', listener);

    tracker.emit('progress', { stage: 'test', progress: 100 });

    expect(callCount).toBe(3);
  });

  it('obsługuje listener removal', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    tracker.on('progress', listener);
    tracker.off('progress', listener);

    tracker.emit('progress', { stage: 'test', progress: 100 });

    expect(callCount).toBe(0);
  });

  it('obsługuje once listeners', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    tracker.once('progress', listener);

    tracker.emit('progress', { stage: 'test', progress: 100 });
    tracker.emit('progress', { stage: 'test', progress: 200 });

    expect(callCount).toBe(1);
  });

  it('obsługuje progress tracking', () => {
    const progress = tracker.createProgress('test-operation');
    
    expect(progress).toBeDefined();
    expect(progress.stage).toBe('test-operation');
    expect(progress.progress).toBe(0);
    
    progress.update(50, 'Halfway done');
    expect(progress.progress).toBe(50);
    expect(progress.message).toBe('Halfway done');
    
    progress.complete('Done!');
    expect(progress.progress).toBe(100);
    expect(progress.message).toBe('Done!');
  });

  it('obsługuje progress chaining', () => {
    const progress = tracker.createProgress('chained-operation');
    
    progress
      .update(25, 'Step 1')
      .update(50, 'Step 2')
      .update(75, 'Step 3')
      .complete('All done');
    
    expect(progress.progress).toBe(100);
    expect(progress.message).toBe('All done');
  });

  it('obsługuje progress error handling', () => {
    const progress = tracker.createProgress('error-operation');
    
    progress.update(50, 'Halfway');
    progress.error(new Error('Something went wrong'));
    
    expect(progress.progress).toBe(50);
    expect(progress.error).toBeDefined();
  });

  it('obsługuje progress cleanup', () => {
    const progress = tracker.createProgress('cleanup-operation');
    
    expect(progress).toBeDefined();
    
    tracker.dispose();
    
    // After dispose, progress should still be accessible but tracker should be cleaned up
    expect(progress.progress).toBe(0);
  });

  it('obsługuje progress statistics', () => {
    const progress1 = tracker.createProgress('operation-1');
    const progress2 = tracker.createProgress('operation-2');
    
    progress1.update(50, 'Halfway');
    progress2.update(100, 'Complete');
    
    const stats = tracker.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalOperations).toBe(2);
    expect(stats.completedOperations).toBe(1);
    expect(stats.activeOperations).toBe(1);
  });
});
