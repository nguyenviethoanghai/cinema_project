import analyticsService from '../analytics-service';
import bookingGrpcClient from '../../grpc/booking-client';
import movieGrpcClient from '../../grpc/movie-client';
import redisClient from '../../config/redis';
import { AnalyticsFilters } from '../../types';

// Mock dependencies
jest.mock('../../grpc/booking-client');
jest.mock('../../grpc/movie-client');
jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueByMovie', () => {
    it('[TC-ANALYTICS-01] Should calculate and group revenue by movie correctly', async () => {
      // Test Objective: Verify algorithm to calculate and group revenue by movie.
      // Expected Output: Returns array of grouped revenue by movie.
      
      const filters: AnalyticsFilters = { limit: 10 };
      
      // Setup mock data
      (redisClient.get as jest.Mock).mockResolvedValue(null); // Cache miss
      
      const mockRawData = [
        { showtime_id: 'st-1', total_revenue: 500, total_bookings: 5, total_tickets: 10 },
        { showtime_id: 'st-2', total_revenue: 300, total_bookings: 3, total_tickets: 6 },
        { showtime_id: 'st-1', total_revenue: 200, total_bookings: 2, total_tickets: 4 }, // Same movie as st-1
      ];
      
      const mockShowtimes = [
        { id: 'st-1', movie_id: 'm-1', movie_title: 'Movie A', showtime_date: '2023-10-01', showtime_time: '10:00', room_number: 'R1', seat_numbers: ['A1', 'A2'] },
        { id: 'st-2', movie_id: 'm-2', movie_title: 'Movie B', showtime_date: '2023-10-01', showtime_time: '12:00', room_number: 'R2', seat_numbers: ['B1', 'B2'] },
      ];
      
      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);
      
      const result = await analyticsService.getRevenueByMovie(filters);
      
      // Assertions
      expect(bookingGrpcClient.getRevenueByShowtime).toHaveBeenCalled();
      expect(movieGrpcClient.getShowtimes).toHaveBeenCalledWith(['st-1', 'st-2']);
      
      expect(result).toHaveLength(2);
      // Movie A should sum st-1 (500+200=700)
      const movieA = result.find(r => r.movie_id === 'm-1');
      expect(movieA).toBeDefined();
      expect(movieA?.total_revenue).toBe(700);
      expect(movieA?.total_bookings).toBe(7);
      expect(movieA?.total_tickets).toBe(14);
      
      // Movie B should have 300
      const movieB = result.find(r => r.movie_id === 'm-2');
      expect(movieB).toBeDefined();
      expect(movieB?.total_revenue).toBe(300);
    });

    it('[TC-ANALYTICS-02] Should return cached data if available', async () => {
      const filters: AnalyticsFilters = { limit: 10 };
      const cachedData = [{ movie_id: 'm-1', total_revenue: 1000 }];
      
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
      
      const result = await analyticsService.getRevenueByMovie(filters);
      
      expect(result).toEqual(cachedData);
      expect(bookingGrpcClient.getRevenueByShowtime).not.toHaveBeenCalled();
    });
  });

  describe('getRevenueByShowtime', () => {
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
          seat_numbers: new Array(100).fill('S') // 100 seats 
        },
      ];
      
      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);
      
      const result = await analyticsService.getRevenueByShowtime(filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].movie_title).toBe('Movie A');
      // 50 tickets out of 100 seats = 50%
      expect(result[0].occupancy_rate).toBe(50);
    });
  });

  describe('getRevenueByTime', () => {
    it('[TC-ANALYTICS-04] Should fetch revenue by time from booking service', async () => {
      const filters: AnalyticsFilters = { start_date: '2023-10-01', end_date: '2023-10-31' };
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const mockData = [{ date: '2023-10-01', revenue: 1000 }];
      (bookingGrpcClient.getRevenueByTime as jest.Mock).mockResolvedValue(mockData);
      
      const result = await analyticsService.getRevenueByTime(filters);
      expect(result).toEqual(mockData);
      expect(bookingGrpcClient.getRevenueByTime).toHaveBeenCalledWith('2023-10-01', '2023-10-31', 100);
    });
  });

  describe('getRevenueByGenre', () => {
    it('[TC-ANALYTICS-05] Should group revenue by genre', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const mockRawData = [{ showtime_id: 'st-1', total_revenue: 500, total_bookings: 5, total_tickets: 5 }];
      const mockShowtimes = [{ id: 'st-1', movie_id: 'm-1', movie_title: 'Movie A' }];
      
      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);
      
      const result = await analyticsService.getRevenueByGenre({});
      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Unknown'); // Based on logic in analytics-service.ts
    });
  });

  describe('getTotalRevenueSummary', () => {
    it('[TC-ANALYTICS-06] Should get total revenue summary', async () => {
      (bookingGrpcClient.getTotalRevenue as jest.Mock).mockResolvedValue(5000);
      const result = await analyticsService.getTotalRevenueSummary({ start_date: '2023-01-01' });
      expect(result.total_revenue).toBe(5000);
      expect(result.period_start).toBe('2023-01-01');
    });
  });

  describe('Performance Testing', () => {
    it('[TC-ANALYTICS-PERF-01] Should handle 10,000 mock records efficiently', async () => {
      // Test Objective: Verify performance of aggregation logic with 10k records
      const filters: AnalyticsFilters = { limit: 100 };
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      
      // Generate 10,000 mock records
      const mockRawData = [];
      const mockShowtimes = [];
      
      for (let i = 0; i < 10000; i++) {
        const showtimeId = `st-${i % 50}`; // 50 unique showtimes
        const movieId = `m-${i % 10}`;     // 10 unique movies
        
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
            seat_numbers: ['A1', 'A2']
          });
        }
      }
      
      (bookingGrpcClient.getRevenueByShowtime as jest.Mock).mockResolvedValue(mockRawData);
      (movieGrpcClient.getShowtimes as jest.Mock).mockResolvedValue(mockShowtimes);
      
      const startTime = performance.now();
      
      const result = await analyticsService.getRevenueByMovie(filters);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // CheckDB: Database is mocked, verifying mock calls
      expect(bookingGrpcClient.getRevenueByShowtime).toHaveBeenCalled();
      
      // Should group down to 10 movies
      expect(result.length).toBeLessThanOrEqual(10);
      
      // Verify performance (should ideally be less than 500ms for 10k records in memory)
      expect(executionTime).toBeLessThan(1000); // Allow up to 1 second for CI environments
      
      console.log(`[PERFORMANCE] 10,000 records processed in ${executionTime.toFixed(2)}ms`);
    });
  });
});
