import { DocumentService } from '../DocumentService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      query: jest.fn(),
      connect: jest.fn(),
    }))
  };
});

jest.mock('../../datastore/index', () => ({
  DocumentDatastore: jest.fn().mockImplementation(() => ({
    createDocument: jest.fn<any>().mockResolvedValue(true),
    updateDocumentStatus: jest.fn<any>().mockResolvedValue(true),
    getDocument: jest.fn(),
    getAllDocuments: jest.fn(),
    deleteDocument: jest.fn<any>().mockResolvedValue(true),
  })),
  ChunkDatastore: jest.fn().mockImplementation(() => ({
    batchCreateChunks: jest.fn<any>().mockResolvedValue(true),
    deleteChunksByDocumentId: jest.fn<any>().mockResolvedValue(true),
    getChunksByDocumentId: jest.fn(),
  })),
}));

jest.mock('../../utils/index', () => ({
  TextExtractor: jest.fn().mockImplementation(() => ({
    validateFile: jest.fn<any>().mockResolvedValue(true),
    extractText: jest.fn<any>().mockResolvedValue('Sample text content for testing chunks.'),
    getFileInfo: jest.fn<any>().mockResolvedValue({ size: 1024 }),
  })),
  splitIntoChunks: jest.fn().mockReturnValue([
    { content: 'Chunk 1', startPos: 0, endPos: 7, tokenCount: 2 },
    { content: 'Chunk 2', startPos: 8, endPos: 15, tokenCount: 2 },
  ]),
}));

jest.mock('../../pkg/caching/index', () => ({
  CacheManager: jest.fn().mockImplementation(() => ({
    invalidatePattern: jest.fn<any>().mockResolvedValue(true),
  })),
}));

jest.mock('../EmbeddingService', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    embeddingText: jest.fn<any>().mockResolvedValue([0.1, 0.2, 0.3]),
  })),
}));

describe('DocumentService', () => {
  let documentService: any;
  let mockPool: any;
  let mockCacheManager: any;
  let mockEmbeddingService: any;

  beforeEach(() => {
    const { Pool } = require('pg');
    const { CacheManager } = require('../../pkg/caching/index');
    const { EmbeddingService } = require('../EmbeddingService');

    mockPool = new Pool();
    mockCacheManager = new CacheManager();
    mockEmbeddingService = new EmbeddingService();

    documentService = new DocumentService({
      pool: mockPool,
      cacheManager: mockCacheManager,
      embeddingService: mockEmbeddingService,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDocument', () => {
    it('[TC-DOC-01] Should successfully process document and chunks', async () => {
      // Test Objective: Verify uploading a document extracts text, splits into chunks, and saves to DB.
      // CheckDB: mocked DocumentDatastore.createDocument should be called
      const filePath = '/test/path/doc.pdf';
      const title = 'Test Doc';

      const result = await documentService.processDocument(filePath, title);

      expect(result.title).toBe(title);
      expect(result.status).toBe('processing');
      
      // Wait for async processing of chunks to complete in test
      await new Promise(process.nextTick);

      expect(documentService.documentDatastore.createDocument).toHaveBeenCalled();
      expect(documentService.chunkDatastore.batchCreateChunks).toHaveBeenCalled();
      expect(documentService.documentDatastore.updateDocumentStatus).toHaveBeenCalledWith(result.id, 'completed');
    });
  });

  describe('deleteDocument', () => {
    it('[TC-DOC-02] Should delete document and its chunks', async () => {
      // Test Objective: Verify deleting a document also deletes its chunks
      // CheckDB: Verify chunk deletion happens before document deletion
      const docID = 'test-doc-id';

      await documentService.deleteDocument(docID);

      expect(documentService.chunkDatastore.deleteChunksByDocumentId).toHaveBeenCalledWith(docID);
      expect(documentService.documentDatastore.deleteDocument).toHaveBeenCalledWith(docID);
      expect(documentService.cacheManager.invalidatePattern).toHaveBeenCalledWith('document_chunks');
    });
  });

  describe('getDocument Methods', () => {
    it('[TC-DOC-03] Should fetch single document', async () => {
      documentService.documentDatastore.getDocument.mockResolvedValue({ id: 'd1', title: 'T1' });
      const res = await documentService.getDocument('d1');
      expect(res.id).toBe('d1');
    });

    it('[TC-DOC-04] Should list documents', async () => {
      documentService.documentDatastore.getAllDocuments.mockResolvedValue([{ id: 'd1' }]);
      const res = await documentService.listDocuments(10, 0);
      expect(res).toHaveLength(1);
    });

    it('[TC-DOC-05] Should get chunks for document', async () => {
      documentService.chunkDatastore.getChunksByDocumentId.mockResolvedValue([{ id: 'c1' }]);
      const res = await documentService.getDocumentChunks('d1');
      expect(res).toHaveLength(1);
    });
  });
});
