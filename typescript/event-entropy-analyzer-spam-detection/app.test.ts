import {
  calculateEntropy,
  analyzePatterns,
  calculateSpamScore,
  getSpamLevel,
  generateRecommendations,
  analyzeEventEntropy,
  EventData,
  EntropyAnalysis
} from './app';

describe('Event Entropy Analyzer', () => {
  describe('calculateEntropy', () => {
    it('should return 0 for empty array', () => {
      expect(calculateEntropy([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(calculateEntropy(['value1'])).toBe(0);
    });

    it('should return 0 for all identical values', () => {
      expect(calculateEntropy(['value1', 'value1', 'value1'])).toBe(0);
    });

    it('should return maximum entropy for all unique values', () => {
      const values = ['a', 'b', 'c', 'd'];
      const entropy = calculateEntropy(values);
      expect(entropy).toBeCloseTo(2, 1); // log2(4) = 2
    });

    it('should calculate correct entropy for mixed values', () => {
      const values = ['a', 'a', 'b', 'b', 'c'];
      const entropy = calculateEntropy(values);
      // Expected: -2*(2/5)*log2(2/5) - (1/5)*log2(1/5)
      expect(entropy).toBeGreaterThan(0);
      expect(entropy).toBeLessThan(2.5);
    });

    it('should handle large arrays', () => {
      const values = Array(1000).fill('a').concat(Array(1000).fill('b'));
      const entropy = calculateEntropy(values);
      expect(entropy).toBeCloseTo(1, 0.1); // log2(2) = 1
    });
  });

  describe('analyzePatterns', () => {
    it('should return zeros for empty events', () => {
      const result = analyzePatterns([]);
      expect(result).toEqual({
        repeatedFrom: 0,
        repeatedTo: 0,
        repeatedValue: 0,
        sequentialBlocks: 0
      });
    });

    it('should detect repeated addresses', () => {
      const events: EventData[] = [
        { blockNumber: 100, transactionHash: '0x1', from: '0xA', to: '0xB', value: '100', eventName: 'Transfer' },
        { blockNumber: 101, transactionHash: '0x2', from: '0xA', to: '0xC', value: '200', eventName: 'Transfer' },
        { blockNumber: 102, transactionHash: '0x3', from: '0xA', to: '0xD', value: '300', eventName: 'Transfer' },
      ];
      const result = analyzePatterns(events);
      expect(result.repeatedFrom).toBe(3);
      expect(result.repeatedTo).toBe(1);
    });

    it('should detect repeated values', () => {
      const events: EventData[] = [
        { blockNumber: 100, transactionHash: '0x1', from: '0xA', to: '0xB', value: '100', eventName: 'Transfer' },
        { blockNumber: 101, transactionHash: '0x2', from: '0xC', to: '0xD', value: '100', eventName: 'Transfer' },
        { blockNumber: 102, transactionHash: '0x3', from: '0xE', to: '0xF', value: '100', eventName: 'Transfer' },
      ];
      const result = analyzePatterns(events);
      expect(result.repeatedValue).toBe(3);
    });

    it('should detect sequential blocks', () => {
      const events: EventData[] = [
        { blockNumber: 100, transactionHash: '0x1', from: '0xA', to: '0xB', value: '100', eventName: 'Transfer' },
        { blockNumber: 101, transactionHash: '0x2', from: '0xC', to: '0xD', value: '200', eventName: 'Transfer' },
        { blockNumber: 102, transactionHash: '0x3', from: '0xE', to: '0xF', value: '300', eventName: 'Transfer' },
        { blockNumber: 105, transactionHash: '0x4', from: '0xG', to: '0xH', value: '400', eventName: 'Transfer' },
      ];
      const result = analyzePatterns(events);
      expect(result.sequentialBlocks).toBe(3);
    });

    it('should handle non-sequential blocks', () => {
      const events: EventData[] = [
        { blockNumber: 100, transactionHash: '0x1', from: '0xA', to: '0xB', value: '100', eventName: 'Transfer' },
        { blockNumber: 105, transactionHash: '0x2', from: '0xC', to: '0xD', value: '200', eventName: 'Transfer' },
        { blockNumber: 110, transactionHash: '0x3', from: '0xE', to: '0xF', value: '300', eventName: 'Transfer' },
      ];
      const result = analyzePatterns(events);
      expect(result.sequentialBlocks).toBe(1);
    });
  });

  describe('calculateSpamScore', () => {
    it('should return 0 for no events', () => {
      const score = calculateSpamScore(0, 0, 0, {
        repeatedFrom: 0,
        repeatedTo: 0,
        repeatedValue: 0,
        sequentialBlocks: 0
      });
      expect(score).toBe(0);
    });

    it('should return high score for low entropy', () => {
      const score = calculateSpamScore(0.5, 100, 2, {
        repeatedFrom: 50,
        repeatedTo: 50,
        repeatedValue: 50,
        sequentialBlocks: 30
      });
      expect(score).toBeGreaterThan(50);
    });

    it('should return low score for high entropy', () => {
      const score = calculateSpamScore(10, 100, 80, {
        repeatedFrom: 2,
        repeatedTo: 2,
        repeatedValue: 1,
        sequentialBlocks: 1
      });
      expect(score).toBeLessThan(30);
    });

    it('should return score between 0 and 100', () => {
      const score = calculateSpamScore(5, 100, 50, {
        repeatedFrom: 10,
        repeatedTo: 10,
        repeatedValue: 5,
        sequentialBlocks: 10
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should increase score with high repetition', () => {
      const lowRepetition = calculateSpamScore(5, 100, 50, {
        repeatedFrom: 2,
        repeatedTo: 2,
        repeatedValue: 1,
        sequentialBlocks: 1
      });
      
      const highRepetition = calculateSpamScore(5, 100, 50, {
        repeatedFrom: 80,
        repeatedTo: 80,
        repeatedValue: 80,
        sequentialBlocks: 1
      });
      
      expect(highRepetition).toBeGreaterThan(lowRepetition);
    });
  });

  describe('getSpamLevel', () => {
    it('should return LOW for score < 40', () => {
      expect(getSpamLevel(0)).toBe('LOW');
      expect(getSpamLevel(39)).toBe('LOW');
    });

    it('should return MEDIUM for score 40-59', () => {
      expect(getSpamLevel(40)).toBe('MEDIUM');
      expect(getSpamLevel(59)).toBe('MEDIUM');
    });

    it('should return HIGH for score 60-79', () => {
      expect(getSpamLevel(60)).toBe('HIGH');
      expect(getSpamLevel(79)).toBe('HIGH');
    });

    it('should return CRITICAL for score >= 80', () => {
      expect(getSpamLevel(80)).toBe('CRITICAL');
      expect(getSpamLevel(100)).toBe('CRITICAL');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for high spam level', () => {
      const analysis: EntropyAnalysis = {
        entropy: 1,
        uniqueAddresses: 5,
        totalEvents: 100,
        spamScore: 85,
        spamLevel: 'CRITICAL',
        patterns: {
          repeatedFrom: 60,
          repeatedTo: 50,
          repeatedValue: 70,
          sequentialBlocks: 40
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('High spam'))).toBe(true);
    });

    it('should detect repeated from address pattern', () => {
      const analysis: EntropyAnalysis = {
        entropy: 5,
        uniqueAddresses: 10,
        totalEvents: 100,
        spamScore: 50,
        spamLevel: 'MEDIUM',
        patterns: {
          repeatedFrom: 60,
          repeatedTo: 10,
          repeatedValue: 10,
          sequentialBlocks: 10
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('same address'))).toBe(true);
    });

    it('should detect repeated to address pattern', () => {
      const analysis: EntropyAnalysis = {
        entropy: 5,
        uniqueAddresses: 10,
        totalEvents: 100,
        spamScore: 50,
        spamLevel: 'MEDIUM',
        patterns: {
          repeatedFrom: 10,
          repeatedTo: 60,
          repeatedValue: 10,
          sequentialBlocks: 10
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('target the same'))).toBe(true);
    });

    it('should detect repeated value pattern', () => {
      const analysis: EntropyAnalysis = {
        entropy: 5,
        uniqueAddresses: 10,
        totalEvents: 100,
        spamScore: 50,
        spamLevel: 'MEDIUM',
        patterns: {
          repeatedFrom: 10,
          repeatedTo: 10,
          repeatedValue: 60,
          sequentialBlocks: 10
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('identical values'))).toBe(true);
    });

    it('should detect sequential blocks pattern', () => {
      const analysis: EntropyAnalysis = {
        entropy: 5,
        uniqueAddresses: 10,
        totalEvents: 100,
        spamScore: 50,
        spamLevel: 'MEDIUM',
        patterns: {
          repeatedFrom: 10,
          repeatedTo: 10,
          repeatedValue: 10,
          sequentialBlocks: 40
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('sequential blocks'))).toBe(true);
    });

    it('should detect low entropy', () => {
      const analysis: EntropyAnalysis = {
        entropy: 1,
        uniqueAddresses: 10,
        totalEvents: 100,
        spamScore: 50,
        spamLevel: 'MEDIUM',
        patterns: {
          repeatedFrom: 10,
          repeatedTo: 10,
          repeatedValue: 10,
          sequentialBlocks: 10
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('low entropy'))).toBe(true);
    });

    it('should detect low unique addresses ratio', () => {
      const analysis: EntropyAnalysis = {
        entropy: 5,
        uniqueAddresses: 5,
        totalEvents: 100,
        spamScore: 50,
        spamLevel: 'MEDIUM',
        patterns: {
          repeatedFrom: 10,
          repeatedTo: 10,
          repeatedValue: 10,
          sequentialBlocks: 10
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('few unique addresses'))).toBe(true);
    });

    it('should return positive message for normal patterns', () => {
      const analysis: EntropyAnalysis = {
        entropy: 8,
        uniqueAddresses: 80,
        totalEvents: 100,
        spamScore: 20,
        spamLevel: 'LOW',
        patterns: {
          repeatedFrom: 2,
          repeatedTo: 2,
          repeatedValue: 1,
          sequentialBlocks: 1
        },
        recommendations: []
      };
      const recommendations = generateRecommendations(analysis);
      expect(recommendations.some(r => r.includes('appear normal'))).toBe(true);
    });
  });

  describe('analyzeEventEntropy', () => {
    it('should return default analysis for empty events', () => {
      const result = analyzeEventEntropy([]);
      expect(result.totalEvents).toBe(0);
      expect(result.entropy).toBe(0);
      expect(result.spamScore).toBe(0);
      expect(result.spamLevel).toBe('LOW');
      expect(result.recommendations).toContain('No events to analyze.');
    });

    it('should analyze events with high diversity', () => {
      const events: EventData[] = [];
      for (let i = 0; i < 100; i++) {
        events.push({
          blockNumber: 1000 + i,
          transactionHash: `0x${i}`,
          from: `0x${i.toString(16).padStart(40, '0')}`,
          to: `0x${(i + 100).toString(16).padStart(40, '0')}`,
          value: (i * 1000).toString(),
          eventName: 'Transfer'
        });
      }
      const result = analyzeEventEntropy(events);
      expect(result.totalEvents).toBe(100);
      expect(result.entropy).toBeGreaterThan(5);
      expect(result.spamScore).toBeLessThan(40);
      expect(result.spamLevel).toBe('LOW');
    });

    it('should detect spam in repetitive events', () => {
      const events: EventData[] = [];
      for (let i = 0; i < 100; i++) {
        events.push({
          blockNumber: 1000 + i,
          transactionHash: `0x${i}`,
          from: '0x' + 'A'.repeat(40),
          to: '0x' + 'B'.repeat(40),
          value: '1000',
          eventName: 'Transfer'
        });
      }
      const result = analyzeEventEntropy(events);
      expect(result.totalEvents).toBe(100);
      expect(result.entropy).toBeLessThan(3);
      expect(result.spamScore).toBeGreaterThan(50);
      expect(['HIGH', 'CRITICAL']).toContain(result.spamLevel);
      expect(result.patterns.repeatedFrom).toBe(100);
      expect(result.patterns.repeatedTo).toBe(100);
      expect(result.patterns.repeatedValue).toBe(100);
    });

    it('should calculate correct unique addresses', () => {
      const events: EventData[] = [
        { blockNumber: 100, transactionHash: '0x1', from: '0xA', to: '0xB', value: '100', eventName: 'Transfer' },
        { blockNumber: 101, transactionHash: '0x2', from: '0xA', to: '0xC', value: '200', eventName: 'Transfer' },
        { blockNumber: 102, transactionHash: '0x3', from: '0xD', to: '0xB', value: '300', eventName: 'Transfer' },
      ];
      const result = analyzeEventEntropy(events);
      // Unique addresses: A, B, C, D = 4
      expect(result.uniqueAddresses).toBe(4);
    });

    it('should include recommendations in result', () => {
      const events: EventData[] = [];
      for (let i = 0; i < 50; i++) {
        events.push({
          blockNumber: 1000 + i,
          transactionHash: `0x${i}`,
          from: '0x' + 'A'.repeat(40),
          to: '0x' + 'B'.repeat(40),
          value: '1000',
          eventName: 'Transfer'
        });
      }
      const result = analyzeEventEntropy(events);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});


