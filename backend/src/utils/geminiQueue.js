import logger from '../config/logger.js';

class GeminiQueue {
  constructor() {
    this.queue = [];
    this.activeCount = 0;
    this.maxConcurrency = 2; // Concurrency limit
    this.minDelayMs = 1500;  // Throttle request frequency
    this.lastRequestTime = 0;
  }

  /**
   * Enqueues a function making a Gemini call.
   * 
   * @param {Function} requestFn Function that performs the API call
   * @param {object} options Options like label, retries, etc.
   * @returns {Promise<any>}
   */
  async enqueue(requestFn, options = {}) {
    const { label = 'Gemini Request', retries = 3, initialDelay = 1500 } = options;

    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        label,
        retries,
        currentAttempt: 1,
        delay: initialDelay,
        resolve,
        reject
      });
      this.processNext();
    });
  }

  async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < this.minDelayMs) {
      setTimeout(() => this.processNext(), this.minDelayMs - timeSinceLast);
      return;
    }

    const task = this.queue.shift();
    this.activeCount++;
    this.lastRequestTime = Date.now();

    logger.info(`[Gemini Queue] Executing task "${task.label}" (Active tasks: ${this.activeCount}, Queue length: ${this.queue.length})`);

    const executeTask = async () => {
      try {
        const result = await task.requestFn();
        this.activeCount--;
        task.resolve(result);
        this.processNext();
      } catch (error) {
        const status = error.status || (error.message?.includes('429') ? 429 : 500);
        const isRateLimit = status === 429 || error.message?.includes('Quota exceeded') || error.message?.includes('429');

        logger.warn(`[Gemini Queue] Task "${task.label}" failed (Attempt ${task.currentAttempt}/${task.retries}): ${error.message}`);

        if (isRateLimit) {
          if (task.currentAttempt < task.retries) {
            // Exponential backoff with random jitter
            const backoffDelay = Math.pow(2, task.currentAttempt) * 2000 + Math.random() * 1000;
            logger.info(`[Gemini Queue] Rate limit hit. Retrying task "${task.label}" in ${backoffDelay.toFixed(0)}ms...`);
            task.currentAttempt++;
            setTimeout(() => executeTask(), backoffDelay);
          } else {
            this.activeCount--;
            // Wrap in required error message
            task.reject(new Error('AI analysis is temporarily unavailable due to API usage limits. Core dashboard functionality remains available. Please try again later.'));
            this.processNext();
          }
        } else {
          if (task.currentAttempt < task.retries) {
            task.currentAttempt++;
            const nextDelay = task.currentAttempt * 1000;
            setTimeout(() => executeTask(), nextDelay);
          } else {
            this.activeCount--;
            task.reject(error);
            this.processNext();
          }
        }
      }
    };

    executeTask();
  }
}

export const geminiQueue = new GeminiQueue();
