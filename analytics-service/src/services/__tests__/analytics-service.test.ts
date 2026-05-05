/**
 * ============================================================
 * FILE: analytics-service.test.ts
 * SERVICE: analytics-service (Node.js / TypeScript)
 * FRAMEWORK: Jest + ts-jest
 * PURPOSE: Unit tests for AnalyticsService - verifies revenue
 *          calculation, caching, and performance with mock data.
 *
 * CHECKDB NOTE: This service does NOT directly access the database.
 *   It calls external gRPC clients (bookingGrpcClient, movieGrpcClient)
 *   and Redis cache. All external dependencies are fully mocked below,
 *   so no real DB state changes occur during testing.
 *
 * ROLLBACK NOTE: Because all dependencies are mocked with jest.mock(),
 *   each test starts from a clean state via beforeEach(jest.clearAllMocks).
 *   No rollback of real data is required.
 * ============================================================
 */

import analyticsService from '../analytics-service';
import bookingGrpcClient from '../../grpc/booking-client';
import movieGrpcClient from '../../grpc/movie-client';
import redisClient from '../../config/redis';
import { AnalyticsFilters } from '../../types';

// ── Mock external dependencies ──────────────────────────────────────────────
// These mocks prevent real network calls to gRPC services and Redis.
jest.mock('../../grpc/booking-client');
jest.mock('../../grpc/movie-client');
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),  // Mock Redis GET (cache read)
    set: jest.fn(),  // Mock Redis SET (cache write)
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));
// ────────────────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {

  // Reset all mock states before each test to ensure test isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getRevenueByMovie
  // SOURCE: analytics-service.ts, lines 30-84
  // ══════════════════════════════════════════════════════════════════════════
  describe('getRevenueByMovie', () => {

    /**
     * [TC-ANALYTICS-01]
     * Test Objective: Verify that the revenue grouping algorithm correctly
     *   aggregates (sums) total_revenue, total_bookings, and total_tickets
     *   for each unique movie_id from raw showtime-level data.
     * Preconditions: Redis cache is empty (miss). gRPC mocks return 3 showtime
     *   records (2 from Movie A, 1 from Movie B).
     * Input: AnalyticsFilters { limit: 10 }
     * Expected Output: Array of 2 RevenueByMovie objects. Movie A = 700 revenue.
     * CheckDB: Verifies bookingGrpcClient.getRevenueByShowtime is called once.
     *          Verifies movieGrpcClient.getShowtimes is called with unique IDs.
     */
    it('[TC-ANALYTICS-01] Should calculate and group revenue by movie correctly', async () => {
      const filters: AnalyticsFilters = { limit: 10 };

      // SETUP: Cache miss → force fetching from gRPC
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Mock raw booking data: showtime st-1 appears TWICE (same movie m-1)
      const mockRawData = [
        { showtime_id: 'st-1', total_revenue: 500, total_bookings: 5, total_tickets: 10 },
        { showtime_id: 'st-2', total_revenue: 300, total_bookings: 3, total_tickets: 6 },
        { showtime_id: 'st-1', total_revenue: 200, total_bookings: 2, total_tickets: 4 }, // same movie as st-1
      ];

      // Mock showtime details from movie service
      const mockShowtimes = [
        { id: 'st-1', movie_id: 'm-1', movie_title: 'Movie A', showtime_date: '2023-10-01', showtime_time: '10:00', room_number: 'R1', seat_numbers: ['A1', 'A2'] },
        { id: 'st-2', movie_id: 'm-2', movie_title: 'Movie B', showtime_date: '2023-10-01', showtime_time: '12:00', room_number: 'R2', seat_numbers: ['B1', 'B2'] },
      ];

      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);

      // EXECUTE
      const result = await analyticsService.getRevenueByMovie(filters);

      // VERIFY: CheckDB - correct gRPC calls were made
      expect(bookingGrpcClient.getRevenueByShowtime).toHaveBeenCalled();
      expect(movieGrpcClient.getShowtimes).toHaveBeenCalledWith(['st-1', 'st-2']);

      // VERIFY: Result grouping
      expect(result).toHaveLength(2);
      const movieA = result.find(r => r.movie_id === 'm-1');
      expect(movieA).toBeDefined();
      expect(movieA?.total_revenue).toBe(700);  // 500 + 200
      expect(movieA?.total_bookings).toBe(7);   // 5 + 2
      expect(movieA?.total_tickets).toBe(14);   // 10 + 4

      const movieB = result.find(r => r.movie_id === 'm-2');
      expect(movieB).toBeDefined();
      expect(movieB?.total_revenue).toBe(300);
    });

    /**
     * [TC-ANALYTICS-02]
     * Test Objective: Verify that when Redis has cached data, the service
     *   returns it immediately without calling the gRPC clients (cache-hit path).
     * Preconditions: Redis cache contains pre-serialized JSON data.
     * Input: AnalyticsFilters { limit: 10 }
     * Expected Output: Returns parsed cached data exactly.
     * CheckDB: Confirms gRPC was NOT called (no unnecessary external I/O).
     */
    it('[TC-ANALYTICS-02] Should return cached data if available', async () => {
      const filters: AnalyticsFilters = { limit: 10 };
      const cachedData = [{ movie_id: 'm-1', total_revenue: 1000 }];

      // SETUP: Cache hit → return serialized data
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      // EXECUTE
      const result = await analyticsService.getRevenueByMovie(filters);

      // VERIFY
      expect(result).toEqual(cachedData);
      // CheckDB: gRPC must NOT be called when cache hit
      expect(bookingGrpcClient.getRevenueByShowtime).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getRevenueByShowtime
  // SOURCE: analytics-service.ts, lines 86-149
  // ══════════════════════════════════════════════════════════════════════════
  describe('getRevenueByShowtime', () => {

    /**
     * [TC-ANALYTICS-03]
     * Test Objective: Verify that occupancy rate is calculated correctly as
     *   (total_tickets / total_seats) * 100, and that showtime metadata
     *   (movie title, date, time) is correctly mapped into the result.
     * Preconditions: Cache miss. Showtime has 100 seats, 50 tickets sold.
     * Input: AnalyticsFilters { limit: 10 }
     * Expected Output: occupancy_rate = 50, movie_title = 'Movie A'
     */
    it('[TC-ANALYTICS-03] Should calculate occupancy rate and map showtime data', async () => {
      const filters: AnalyticsFilters = { limit: 10 };
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const mockRawData = [
        { showtime_id: 'st-1', total_revenue: 500, total_bookings: 5, total_tickets: 50 },
      ];
      const mockShowtimes = [
        {
          id: 'st-1', movie_id: 'm-1', movie_title: 'Movie A',
          showtime_date: '2023-10-01', showtime_time: '10:00', room_number: 'R1',
          seat_numbers: new Array(100).fill('S'), // 100 seats total
        },
      ];

      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);

      // EXECUTE
      const result = await analyticsService.getRevenueByShowtime(filters);

      // VERIFY
      expect(result).toHaveLength(1);
      expect(result[0].movie_title).toBe('Movie A');
      expect(result[0].occupancy_rate).toBe(50); // 50/100 = 50%
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getRevenueByTime
  // SOURCE: analytics-service.ts, lines 12-28
  // ══════════════════════════════════════════════════════════════════════════
  describe('getRevenueByTime', () => {

    /**
     * [TC-ANALYTICS-04]
     * Test Objective: Verify that date filters are correctly passed to the
     *   booking gRPC client and the raw response is returned.
     * Preconditions: Cache miss.
     * Input: AnalyticsFilters { start_date: '2023-10-01', end_date: '2023-10-31' }
     * Expected Output: Returns the mocked gRPC array as-is.
     */
    it('[TC-ANALYTICS-04] Should fetch revenue by time from booking service', async () => {
      const filters: AnalyticsFilters = { start_date: '2023-10-01', end_date: '2023-10-31' };
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const mockData = [{ date: '2023-10-01', revenue: 1000 }];
      (bookingGrpcClient.getRevenueByTime as jest.Mock).mockResolvedValue(mockData);

      // EXECUTE
      const result = await analyticsService.getRevenueByTime(filters);

      // VERIFY
      expect(result).toEqual(mockData);
      // CheckDB: Verify correct params passed to gRPC
      expect(bookingGrpcClient.getRevenueByTime).toHaveBeenCalledWith('2023-10-01', '2023-10-31', 100);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getRevenueByGenre
  // SOURCE: analytics-service.ts, lines 151-212
  // ══════════════════════════════════════════════════════════════════════════
  describe('getRevenueByGenre', () => {

    /**
     * [TC-ANALYTICS-05]
     * Test Objective: Verify that revenue is grouped by genre. Since the
     *   service doesn't pull actual genre data from the movie service currently,
     *   the genre defaults to 'Unknown'.
     * Preconditions: Cache miss.
     * Input: Empty filters {}
     * Expected Output: Array with 1 genre entry named 'Unknown'.
     */
    it('[TC-ANALYTICS-05] Should group revenue by genre', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const mockRawData = [{ showtime_id: 'st-1', total_revenue: 500, total_bookings: 5, total_tickets: 5 }];
      const mockShowtimes = [{ id: 'st-1', movie_id: 'm-1', movie_title: 'Movie A' }];

      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);

      // EXECUTE
      const result = await analyticsService.getRevenueByGenre({});

      // VERIFY
      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Unknown');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: getTotalRevenueSummary
  // SOURCE: analytics-service.ts, lines 214-229
  // ══════════════════════════════════════════════════════════════════════════
  describe('getTotalRevenueSummary', () => {

    /**
     * [TC-ANALYTICS-06]
     * Test Objective: Verify the summary object is correctly structured with
     *   total_revenue from gRPC and period_start/period_end from input filters.
     * Input: { start_date: '2023-01-01' }
     * Expected Output: { total_revenue: 5000, period_start: '2023-01-01' }
     */
    it('[TC-ANALYTICS-06] Should get total revenue summary', async () => {
      (bookingGrpcClient.getTotalRevenue as jest.Mock).mockResolvedValue(5000);

      // EXECUTE
      const result = await analyticsService.getTotalRevenueSummary({ start_date: '2023-01-01' });

      // VERIFY
      expect(result.total_revenue).toBe(5000);
      expect(result.period_start).toBe('2023-01-01');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: Performance Testing
  // ══════════════════════════════════════════════════════════════════════════
  describe('Performance Testing', () => {

    /**
     * [TC-ANALYTICS-PERF-01]
     * Test Objective: Verify that the revenue aggregation algorithm can process
     *   10,000 mock booking records within 1000ms (acceptable for in-memory ops).
     * Preconditions: Cache miss. gRPC returns 10,000 records with 50 showtimes.
     * Input: { limit: 100 }, 10,000 generated mock records
     * Expected Output: Result length <= 10 movies. Execution time < 1000ms.
     * CheckDB: Verifies gRPC was called for the large dataset.
     */
    it('[TC-ANALYTICS-PERF-01] Should handle 10,000 mock records efficiently', async () => {
      const filters: AnalyticsFilters = { limit: 100 };
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Generate 10,000 mock booking records across 50 showtimes and 10 movies
      const mockRawData: any[] = [];
      const mockShowtimes: any[] = [];

      for (let i = 0; i < 10000; i++) {
        const showtimeId = `st-${i % 50}`;  // 50 unique showtimes
        const movieId = `m-${i % 10}`;       // 10 unique movies

        mockRawData.push({
          showtime_id: showtimeId,
          total_revenue: 100,
          total_bookings: 1,
          total_tickets: 2,
        });

        if (i < 50) {
          mockShowtimes.push({
            id: showtimeId,
            movie_id: movieId,
            movie_title: `Movie ${movieId}`,
            showtime_date: '2023-10-01',
            showtime_time: '10:00',
            room_number: 'R1',
            seat_numbers: ['A1', 'A2'],
          });
        }
      }

      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);

      // MEASURE execution time
      const startTime = performance.now();
      const result = await analyticsService.getRevenueByMovie(filters);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // VERIFY: CheckDB - gRPC was called with large dataset
      expect(bookingGrpcClient.getRevenueByShowtime).toHaveBeenCalled();

      // VERIFY: Result correctly grouped to 10 unique movies
      expect(result.length).toBeLessThanOrEqual(10);

      // VERIFY: Performance threshold
      expect(executionTime).toBeLessThan(1000); // Must finish under 1 second

      console.log(`[PERFORMANCE] 10,000 records processed in ${executionTime.toFixed(2)}ms`);
    });
  });
});
