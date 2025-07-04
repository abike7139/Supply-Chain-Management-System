import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity contract functions
const mockProductTracker = {
  products: new Map(),
  productHistory: new Map(),
  productHistoryCount: new Map(),
  nextProductId: 1,
  contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  
  registerProduct(name, description, batchNumber, qualityScore, sender) {
    if (qualityScore > 100) {
      return { error: "ERR_INVALID_STATUS" }
    }
    
    const productId = this.nextProductId
    this.products.set(productId, {
      name,
      description,
      manufacturer: sender,
      currentOwner: sender,
      status: 1, // STATUS_MANUFACTURED
      createdAt: 100,
      updatedAt: 100,
      batchNumber,
      qualityScore,
    })
    
    this.productHistoryCount.set(productId, { count: 0 })
    this.nextProductId++
    
    return { success: productId }
  },
  
  updateProductStatus(productId, newStatus, notes, sender) {
    const product = this.products.get(productId)
    if (!product) {
      return { error: "ERR_PRODUCT_NOT_FOUND" }
    }
    
    if (sender !== product.currentOwner && sender !== this.contractOwner) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    if (newStatus < 1 || newStatus > 5) {
      return { error: "ERR_INVALID_STATUS" }
    }
    
    // Add to history
    const historyCount = this.productHistoryCount.get(productId) || { count: 0 }
    const historyKey = `${productId}-${historyCount.count}`
    this.productHistory.set(historyKey, {
      previousOwner: product.currentOwner,
      newOwner: product.currentOwner,
      statusChange: newStatus,
      timestamp: 101,
      notes,
    })
    
    this.productHistoryCount.set(productId, { count: historyCount.count + 1 })
    
    // Update product
    product.status = newStatus
    product.updatedAt = 101
    this.products.set(productId, product)
    
    return { success: true }
  },
  
  transferProduct(productId, newOwner, notes, sender) {
    const product = this.products.get(productId)
    if (!product) {
      return { error: "ERR_PRODUCT_NOT_FOUND" }
    }
    
    if (sender !== product.currentOwner) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    // Add to history
    const historyCount = this.productHistoryCount.get(productId) || { count: 0 }
    const historyKey = `${productId}-${historyCount.count}`
    this.productHistory.set(historyKey, {
      previousOwner: product.currentOwner,
      newOwner,
      statusChange: product.status,
      timestamp: 102,
      notes,
    })
    
    this.productHistoryCount.set(productId, { count: historyCount.count + 1 })
    
    // Update product ownership
    product.currentOwner = newOwner
    product.updatedAt = 102
    this.products.set(productId, product)
    
    return { success: true }
  },
  
  updateQualityScore(productId, newScore, sender) {
    const product = this.products.get(productId)
    if (!product) {
      return { error: "ERR_PRODUCT_NOT_FOUND" }
    }
    
    if (sender !== product.currentOwner && sender !== this.contractOwner) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    if (newScore > 100) {
      return { error: "ERR_INVALID_STATUS" }
    }
    
    product.qualityScore = newScore
    product.updatedAt = 103
    this.products.set(productId, product)
    
    return { success: true }
  },
  
  getProduct(productId) {
    return this.products.get(productId) || null
  },
  
  getProductHistory(productId, sequence) {
    const historyKey = `${productId}-${sequence}`
    return this.productHistory.get(historyKey) || null
  },
  
  getProductHistoryCount(productId) {
    return this.productHistoryCount.get(productId) || { count: 0 }
  },
  
  getNextProductId() {
    return this.nextProductId
  },
  
  productExists(productId) {
    return this.products.has(productId)
  },
  
  getProductOwner(productId) {
    const product = this.products.get(productId)
    return product ? product.currentOwner : null
  },
  
  getProductStatus(productId) {
    const product = this.products.get(productId)
    return product ? product.status : null
  },
}

describe("Product Tracker Contract", () => {
  beforeEach(() => {
    // Reset mock state
    mockProductTracker.products.clear()
    mockProductTracker.productHistory.clear()
    mockProductTracker.productHistoryCount.clear()
    mockProductTracker.nextProductId = 1
  })
  
  describe("Product Registration", () => {
    it("should register a new product successfully", () => {
      const result = mockProductTracker.registerProduct(
          "Test Product",
          "A test product description",
          "BATCH001",
          85,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.success).toBe(1)
      expect(mockProductTracker.getNextProductId()).toBe(2)
      
      const product = mockProductTracker.getProduct(1)
      expect(product.name).toBe("Test Product")
      expect(product.status).toBe(1) // STATUS_MANUFACTURED
      expect(product.qualityScore).toBe(85)
    })
    
    it("should reject product with invalid quality score", () => {
      const result = mockProductTracker.registerProduct(
          "Test Product",
          "Description",
          "BATCH001",
          150, // Invalid score > 100
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_INVALID_STATUS")
    })
    
    it("should increment product ID for each registration", () => {
      mockProductTracker.registerProduct(
          "Product 1",
          "Desc 1",
          "BATCH001",
          80,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      mockProductTracker.registerProduct(
          "Product 2",
          "Desc 2",
          "BATCH002",
          90,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(mockProductTracker.getNextProductId()).toBe(3)
      expect(mockProductTracker.productExists(1)).toBe(true)
      expect(mockProductTracker.productExists(2)).toBe(true)
    })
  })
  
  describe("Product Status Updates", () => {
    beforeEach(() => {
      mockProductTracker.registerProduct(
          "Test Product",
          "Description",
          "BATCH001",
          85,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
    })
    
    it("should update product status by owner", () => {
      const result = mockProductTracker.updateProductStatus(
          1,
          2, // STATUS_IN_TRANSIT
          "Product shipped",
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.success).toBe(true)
      expect(mockProductTracker.getProductStatus(1)).toBe(2)
      
      const historyCount = mockProductTracker.getProductHistoryCount(1)
      expect(historyCount.count).toBe(1)
    })
    
    it("should reject status update from unauthorized user", () => {
      const result = mockProductTracker.updateProductStatus(1, 2, "Unauthorized update", "ST2DIFFERENT_USER_ADDRESS")
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
      expect(mockProductTracker.getProductStatus(1)).toBe(1) // Should remain unchanged
    })
    
    it("should reject invalid status values", () => {
      const result = mockProductTracker.updateProductStatus(
          1,
          10, // Invalid status
          "Invalid status",
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_INVALID_STATUS")
    })
    
    it("should reject status update for non-existent product", () => {
      const result = mockProductTracker.updateProductStatus(
          999,
          2,
          "Update non-existent",
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_PRODUCT_NOT_FOUND")
    })
  })
  
  describe("Product Ownership Transfer", () => {
    beforeEach(() => {
      mockProductTracker.registerProduct(
          "Test Product",
          "Description",
          "BATCH001",
          85,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
    })
    
    it("should transfer product ownership successfully", () => {
      const newOwner = "ST2NEW_OWNER_ADDRESS"
      const result = mockProductTracker.transferProduct(
          1,
          newOwner,
          "Ownership transferred",
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.success).toBe(true)
      expect(mockProductTracker.getProductOwner(1)).toBe(newOwner)
      
      const historyCount = mockProductTracker.getProductHistoryCount(1)
      expect(historyCount.count).toBe(1)
    })
    
    it("should reject transfer from non-owner", () => {
      const result = mockProductTracker.transferProduct(
          1,
          "ST2NEW_OWNER_ADDRESS",
          "Unauthorized transfer",
          "ST2DIFFERENT_USER_ADDRESS",
      )
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject transfer of non-existent product", () => {
      const result = mockProductTracker.transferProduct(
          999,
          "ST2NEW_OWNER_ADDRESS",
          "Transfer non-existent",
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_PRODUCT_NOT_FOUND")
    })
  })
  
  describe("Quality Score Management", () => {
    beforeEach(() => {
      mockProductTracker.registerProduct(
          "Test Product",
          "Description",
          "BATCH001",
          85,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
    })
    
    it("should update quality score by owner", () => {
      const result = mockProductTracker.updateQualityScore(1, 95, "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
      
      expect(result.success).toBe(true)
      
      const product = mockProductTracker.getProduct(1)
      expect(product.qualityScore).toBe(95)
    })
    
    it("should reject invalid quality score", () => {
      const result = mockProductTracker.updateQualityScore(
          1,
          150, // Invalid score > 100
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_INVALID_STATUS")
    })
    
    it("should reject quality update from unauthorized user", () => {
      const result = mockProductTracker.updateQualityScore(1, 95, "ST2DIFFERENT_USER_ADDRESS")
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("Product History Tracking", () => {
    beforeEach(() => {
      mockProductTracker.registerProduct(
          "Test Product",
          "Description",
          "BATCH001",
          85,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
    })
    
    it("should track product history correctly", () => {
      // Update status
      mockProductTracker.updateProductStatus(1, 2, "Status updated", "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
      
      // Transfer ownership
      mockProductTracker.transferProduct(1, "ST2NEW_OWNER", "Transferred", "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
      
      const historyCount = mockProductTracker.getProductHistoryCount(1)
      expect(historyCount.count).toBe(2)
      
      const firstHistory = mockProductTracker.getProductHistory(1, 0)
      expect(firstHistory.statusChange).toBe(2)
      expect(firstHistory.notes).toBe("Status updated")
      
      const secondHistory = mockProductTracker.getProductHistory(1, 1)
      expect(secondHistory.newOwner).toBe("ST2NEW_OWNER")
      expect(secondHistory.notes).toBe("Transferred")
    })
    
    it("should return null for non-existent history", () => {
      const history = mockProductTracker.getProductHistory(1, 999)
      expect(history).toBe(null)
    })
  })
  
  describe("Read-only Functions", () => {
    beforeEach(() => {
      mockProductTracker.registerProduct(
          "Test Product",
          "Description",
          "BATCH001",
          85,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
    })
    
    it("should return product details correctly", () => {
      const product = mockProductTracker.getProduct(1)
      expect(product).toBeTruthy()
      expect(product.name).toBe("Test Product")
      expect(product.batchNumber).toBe("BATCH001")
      expect(product.qualityScore).toBe(85)
    })
    
    it("should return null for non-existent product", () => {
      const product = mockProductTracker.getProduct(999)
      expect(product).toBe(null)
    })
    
    it("should check product existence correctly", () => {
      expect(mockProductTracker.productExists(1)).toBe(true)
      expect(mockProductTracker.productExists(999)).toBe(false)
    })
    
    it("should return correct product owner", () => {
      expect(mockProductTracker.getProductOwner(1)).toBe("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
      expect(mockProductTracker.getProductOwner(999)).toBe(null)
    })
    
    it("should return correct product status", () => {
      expect(mockProductTracker.getProductStatus(1)).toBe(1) // STATUS_MANUFACTURED
      expect(mockProductTracker.getProductStatus(999)).toBe(null)
    })
  })
})
