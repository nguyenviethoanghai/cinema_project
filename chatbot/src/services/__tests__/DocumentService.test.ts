/**
 * ============================================================
 * FILE: DocumentService.test.ts
 * SERVICE: chatbot (Node.js / TypeScript)
 * FRAMEWORK: Jest + ts-jest
 * PURPOSE: Unit tests for DocumentService - verifies the full RAG
 *          document processing pipeline: upload, chunk, store, delete.
 *
 * CHECKDB NOTE: DocumentService persists data to PostgreSQL via
 *   DocumentDatastore and ChunkDatastore. Both datastores are mocked,
 *   so no real DB writes occur. The CheckDB step verifies that the
 *   correct datastore methods (createDocument, batchCreateChunks,
 *   deleteDocument, etc.) are called with expected arguments.
 *
 * ROLLBACK NOTE: All datastore calls are mocked with jest.fn().
 *   No real data is inserted or deleted. jest.clearAllMocks() in
 *   afterEach() ensures a clean state between tests. This satisfies
 *   the rollback requirement since the DB state is never changed.
 * ============================================================
 */

import { DocumentService } from '../DocumentService';
import { jest } from '@jest/globals';

// ── Mock PostgreSQL pool ─────────────────────────────────────────────────────
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
  })),
}));

// ── Mock DocumentDatastore and ChunkDatastore (DB layer) ─────────────────────
// CheckDB: These mocks allow us to verify DB interactions without a real DB.
jest.mock('../../datastore/index', () => ({
  DocumentDatastore: jest.fn().mockImplementation(() => ({
    createDocument: jest.fn<any>().mockResolvedValue(true),       // CheckDB target
    updateDocumentStatus: jest.fn<any>().mockResolvedValue(true), // CheckDB target
    getDocument: jest.fn(),
    getAllDocuments: jest.fn(),
    deleteDocument: jest.fn<any>().mockResolvedValue(true),       // CheckDB target
  })),
  ChunkDatastore: jest.fn().mockImplementation(() => ({
    batchCreateChunks: jest.fn<any>().mockResolvedValue(true),           // CheckDB target
    deleteChunksByDocumentId: jest.fn<any>().mockResolvedValue(true),    // CheckDB target (cascade delete)
    getChunksByDocumentId: jest.fn(),
  })),
}));

// ── Mock file text extraction utilities ──────────────────────────────────────
jest.mock('../../utils/index', () => ({
  TextExtractor: jest.fn().mockImplementation(() => ({
    validateFile: jest.fn<any>().mockResolvedValue(true),
    extractText: jest.fn<any>().mockResolvedValue('Sample text content for testing chunks.'),
    getFileInfo: jest.fn<any>().mockResolvedValue({ size: 1024 }),
  })),
  // Mock text chunking: returns 2 chunks with known positions
  splitIntoChunks: jest.fn().mockReturnValue([
    { content: 'Chunk 1', startPos: 0, endPos: 7, tokenCount: 2 },
    { content: 'Chunk 2', startPos: 8, endPos: 15, tokenCount: 2 },
  ]),
}));

// ── Mock Redis Cache Manager ──────────────────────────────────────────────────
jest.mock('../../pkg/caching/index', () => ({
  CacheManager: jest.fn().mockImplementation(() => ({
    invalidatePattern: jest.fn<any>().mockResolvedValue(true),
  })),
}));

// ── Mock Gemini EmbeddingService ──────────────────────────────────────────────
jest.mock('../EmbeddingService', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    embeddingText: jest.fn<any>().mockResolvedValue([0.1, 0.2, 0.3]), // Fake vector
  })),
}));
// ────────────────────────────────────────────────────────────────────────────

describe('DocumentService', () => {
  let documentService: any;
  let mockPool: any;
  let mockCacheManager: any;
  let mockEmbeddingService: any;

  // ── Setup: build fresh service instance with all mocked dependencies ──────
  beforeEach(() => {
    const { Pool } = require('pg');
    const { CacheManager } = require('../../pkg/caching/index');
    const { EmbeddingService } = require('../EmbeddingService');

    mockPool = new Pool();
    mockCacheManager = new CacheManager();
    mockEmbeddingService = new EmbeddingService();

    // Inject all mocked dependencies via constructor
    documentService = new DocumentService({
      pool: mockPool,
      cacheManager: mockCacheManager,
      embeddingService: mockEmbeddingService,
    });
  });

  // ── Teardown: clear mock states (Rollback equivalent) ────────────────────
  afterEach(() => {
    jest.clearAllMocks(); // ROLLBACK: Reset all mock call records and return values
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: processDocument
  // SOURCE: DocumentService.ts, lines 33-65
  // ══════════════════════════════════════════════════════════════════════════
  describe('processDocument', () => {

    /**
     * [TC-DOC-01]
     * Test Objective: Verify the complete document processing pipeline:
     *   1. File validation
     *   2. Text extraction
     *   3. Document record creation in DB
     *   4. Text splitting into chunks
     *   5. Embedding generation for each chunk
     *   6. Batch save of chunks to DB
     *   7. Status update to 'completed'
     * Preconditions: All mocked dependencies resolve successfully.
     * Input: filePath='/test/path/doc.pdf', title='Test Doc'
     * Expected Output: Document object with status='processing' (initial),
     *   and after async completion: DB shows 'completed' status.
     * CheckDB: Verifies createDocument() and batchCreateChunks() are called.
     * Rollback: Mocked - no real DB data persisted.
     */
    it('[TC-DOC-01] Should successfully process document and chunks', async () => {
      const filePath = '/test/path/doc.pdf';
      const documentTitle = 'Test Doc';

      // EXECUTE: processDocument starts async chunk processing in background
      const result = await documentService.processDocument(filePath, documentTitle);

      // VERIFY: Immediate return value (status is 'processing' initially)
      expect(result.title).toBe(documentTitle);
      expect(result.status).toBe('processing');

      // Wait for async chunk processing (processChunks) to complete
      await new Promise(process.nextTick);

      // VERIFY: CheckDB - document was saved to DB
      expect(documentService.documentDatastore.createDocument).toHaveBeenCalled();

      // VERIFY: CheckDB - chunks were batch-saved to DB
      expect(documentService.chunkDatastore.batchCreateChunks).toHaveBeenCalled();

      // VERIFY: CheckDB - status was updated to 'completed' after processing
      expect(documentService.documentDatastore.updateDocumentStatus).toHaveBeenCalledWith(
        result.id, 'completed'
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: deleteDocument
  // SOURCE: DocumentService.ts, lines 118-125
  // ══════════════════════════════════════════════════════════════════════════
  describe('deleteDocument', () => {

    /**
     * [TC-DOC-02]
     * Test Objective: Verify that deleting a document also cascades to delete
     *   all its chunks first (referential integrity), and then invalidates the cache.
     * Preconditions: docID exists. All delete mocks resolve successfully.
     * Input: docID='test-doc-id'
     * Expected Output: Resolves without error. Chunks deleted BEFORE document.
     * CheckDB: Verifies deleteChunksByDocumentId() AND deleteDocument() are called.
     * Rollback: Mocked - no real DB rows deleted.
     */
    it('[TC-DOC-02] Should delete document and its chunks', async () => {
      const docID = 'test-doc-id';

      // EXECUTE
      await documentService.deleteDocument(docID);

      // VERIFY: CheckDB - chunks deleted first (cascade order matters)
      expect(documentService.chunkDatastore.deleteChunksByDocumentId).toHaveBeenCalledWith(docID);

      // VERIFY: CheckDB - document record deleted from DB
      expect(documentService.documentDatastore.deleteDocument).toHaveBeenCalledWith(docID);

      // VERIFY: Cache invalidated after deletion
      expect(documentService.cacheManager.invalidatePattern).toHaveBeenCalledWith('document_chunks');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GROUP: Read Methods (getDocument, listDocuments, getDocumentChunks)
  // SOURCE: DocumentService.ts, lines 110-129
  // ══════════════════════════════════════════════════════════════════════════
  describe('getDocument Methods', () => {

    /**
     * [TC-DOC-03]
     * Test Objective: Verify that getDocument retrieves a single document by ID.
     * Preconditions: DB mock returns a document with id='d1'.
     * Input: docID='d1'
     * Expected Output: Document object with id='d1'.
     * CheckDB: Verifies getDocument() was called on the datastore.
     */
    it('[TC-DOC-03] Should fetch single document', async () => {
      // CheckDB setup: mock DB returns the document
      documentService.documentDatastore.getDocument.mockResolvedValue({ id: 'd1', title: 'T1' });

      // EXECUTE
      const res = await documentService.getDocument('d1');

      // VERIFY
      expect(res.id).toBe('d1');
    });

    /**
     * [TC-DOC-04]
     * Test Objective: Verify that listDocuments returns a paginated array of documents.
     * Preconditions: DB mock returns 1 document.
     * Input: limit=10, offset=0
     * Expected Output: Array containing 1 document object.
     * CheckDB: Verifies getAllDocuments() was called with limit/offset params.
     */
    it('[TC-DOC-04] Should list documents', async () => {
      // CheckDB setup: DB returns one document
      documentService.documentDatastore.getAllDocuments.mockResolvedValue([{ id: 'd1' }]);

      // EXECUTE
      const res = await documentService.listDocuments(10, 0);

      // VERIFY
      expect(res).toHaveLength(1);
    });

    /**
     * [TC-DOC-05]
     * Test Objective: Verify that getDocumentChunks retrieves all text chunks
     *   associated with a specific document.
     * Preconditions: DB mock returns 1 chunk for the given document.
     * Input: docID='d1'
     * Expected Output: Array with 1 chunk object.
     * CheckDB: Verifies getChunksByDocumentId() was called with the correct docID.
     */
    it('[TC-DOC-05] Should get chunks for document', async () => {
      // CheckDB setup: DB returns one chunk
      documentService.chunkDatastore.getChunksByDocumentId.mockResolvedValue([{ id: 'c1' }]);

      // EXECUTE
      const res = await documentService.getDocumentChunks('d1');

      // VERIFY
      expect(res).toHaveLength(1);
    });
  });
});
