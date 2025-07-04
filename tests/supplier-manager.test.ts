import { describe, it, expect, beforeEach } from "vitest"

// Mock Supplier Manager contract functions
const mockSupplierManager = {
  suppliers: new Map(),
  supplierRatings: new Map(),
  supplierPerformance: new Map(),
  totalSuppliers: 0,
  contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  
  registerSupplier(name, description, contactInfo, sender) {
    if (this.suppliers.has(sender)) {
      return { error: "ERR_SUPPLIER_EXISTS" }
    }
    
    this.suppliers.set(sender, {
      name,
      description,
      contactInfo,
      registrationDate: 100,
      status: 1, // STATUS_PENDING
      totalOrders: 0,
      completedOrders: 0,
      averageRating: 0,
      totalRatings: 0,
      certificationLevel: 1,
    })
    
    this.supplierPerformance.set(sender, {
      onTimeDeliveryRate: 0,
      qualityScore: 0,
      responseTime: 0,
      lastUpdated: 100,
    })
    
    this.totalSuppliers++
    return { success: true }
  },
  
  updateSupplierStatus(supplierAddress, newStatus, sender) {
    const supplier = this.suppliers.get(supplierAddress)
    if (!supplier) {
      return { error: "ERR_SUPPLIER_NOT_FOUND" }
    }
    
    if (sender !== this.contractOwner) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    if (newStatus < 1 || newStatus > 4) {
      return { error: "ERR_INVALID_STATUS" }
    }
    
    supplier.status = newStatus
    this.suppliers.set(supplierAddress, supplier)
    return { success: true }
  },
  
  rateSupplier(supplierAddress, rating, comment, sender) {
    const supplier = this.suppliers.get(supplierAddress)
    if (!supplier) {
      return { error: "ERR_SUPPLIER_NOT_FOUND" }
    }
    
    if (rating < 1 || rating > 5) {
      return { error: "ERR_INVALID_RATING" }
    }
    
    if (sender === supplierAddress) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    // Store individual rating
    const ratingKey = `${supplierAddress}-${sender}`
    this.supplierRatings.set(ratingKey, {
      rating,
      comment,
      timestamp: 101,
    })
    
    // Update average rating
    const totalRatings = supplier.totalRatings
    const currentAvg = supplier.averageRating
    const newTotalRatings = totalRatings + 1
    const newAverage = Math.floor((currentAvg * totalRatings + rating) / newTotalRatings)
    
    supplier.averageRating = newAverage
    supplier.totalRatings = newTotalRatings
    this.suppliers.set(supplierAddress, supplier)
    
    return { success: true }
  },
  
  updatePerformanceMetrics(supplierAddress, onTimeRate, qualityScore, responseTime, sender) {
    if (!this.suppliers.has(supplierAddress)) {
      return { error: "ERR_SUPPLIER_NOT_FOUND" }
    }
    
    if (sender !== this.contractOwner && sender !== supplierAddress) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    if (onTimeRate > 100 || qualityScore > 100) {
      return { error: "ERR_INVALID_RATING" }
    }
    
    this.supplierPerformance.set(supplierAddress, {
      onTimeDeliveryRate: onTimeRate,
      qualityScore,
      responseTime,
      lastUpdated: 102,
    })
    
    return { success: true }
  },
  
  updateOrderStats(supplierAddress, completed, sender) {
    const supplier = this.suppliers.get(supplierAddress)
    if (!supplier) {
      return { error: "ERR_SUPPLIER_NOT_FOUND" }
    }
    
    if (sender !== this.contractOwner) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    const newTotal = supplier.totalOrders + 1
    const newCompleted = completed ? supplier.completedOrders + 1 : supplier.completedOrders
    
    supplier.totalOrders = newTotal
    supplier.completedOrders = newCompleted
    this.suppliers.set(supplierAddress, supplier)
    
    return { success: true }
  },
  
  updateCertification(supplierAddress, level, sender) {
    const supplier = this.suppliers.get(supplierAddress)
    if (!supplier) {
      return { error: "ERR_SUPPLIER_NOT_FOUND" }
    }
    
    if (sender !== this.contractOwner) {
      return { error: "ERR_UNAUTHORIZED" }
    }
    
    if (level < 1 || level > 5) {
      return { error: "ERR_INVALID_RATING" }
    }
    
    supplier.certificationLevel = level
    this.suppliers.set(supplierAddress, supplier)
    return { success: true }
  },
  
  getSupplier(supplierAddress) {
    return this.suppliers.get(supplierAddress) || null
  },
  
  getSupplierPerformance(supplierAddress) {
    return this.supplierPerformance.get(supplierAddress) || null
  },
  
  getSupplierRating(supplierAddress, rater) {
    const ratingKey = `${supplierAddress}-${rater}`
    return this.supplierRatings.get(ratingKey) || null
  },
  
  isSupplierApproved(supplierAddress) {
    const supplier = this.suppliers.get(supplierAddress)
    return supplier ? supplier.status === 2 : false // STATUS_APPROVED
  },
  
  getCompletionRate(supplierAddress) {
    const supplier = this.suppliers.get(supplierAddress)
    if (!supplier) return null
    
    if (supplier.totalOrders > 0) {
      return Math.floor((supplier.completedOrders * 100) / supplier.totalOrders)
    }
    return 0
  },
  
  getTotalSuppliers() {
    return this.totalSuppliers
  },
  
  getSupplierStatus(supplierAddress) {
    const supplier = this.suppliers.get(supplierAddress)
    return supplier ? supplier.status : null
  },
}

describe("Supplier Manager Contract", () => {
  beforeEach(() => {
    // Reset mock state
    mockSupplierManager.suppliers.clear()
    mockSupplierManager.supplierRatings.clear()
    mockSupplierManager.supplierPerformance.clear()
    mockSupplierManager.totalSuppliers = 0
  })
  
  describe("Supplier Registration", () => {
    it("should register a new supplier successfully", () => {
      const supplierAddress = "ST2SUPPLIER_ADDRESS"
      const result = mockSupplierManager.registerSupplier(
          "Test Supplier",
          "A reliable supplier",
          "contact@supplier.com",
          supplierAddress,
      )
      
      expect(result.success).toBe(true)
      expect(mockSupplierManager.getTotalSuppliers()).toBe(1)
      
      const supplier = mockSupplierManager.getSupplier(supplierAddress)
      expect(supplier.name).toBe("Test Supplier")
      expect(supplier.status).toBe(1) // STATUS_PENDING
      expect(supplier.certificationLevel).toBe(1)
    })
    
    it("should reject duplicate supplier registration", () => {
      const supplierAddress = "ST2SUPPLIER_ADDRESS"
      
      // First registration
      mockSupplierManager.registerSupplier("Test Supplier", "Description", "contact@supplier.com", supplierAddress)
      
      // Second registration attempt
      const result = mockSupplierManager.registerSupplier(
          "Another Supplier",
          "Different description",
          "different@supplier.com",
          supplierAddress,
      )
      
      expect(result.error).toBe("ERR_SUPPLIER_EXISTS")
    })
    
    it("should initialize performance metrics on registration", () => {
      const supplierAddress = "ST2SUPPLIER_ADDRESS"
      mockSupplierManager.registerSupplier("Test Supplier", "Description", "contact@supplier.com", supplierAddress)
      
      const performance = mockSupplierManager.getSupplierPerformance(supplierAddress)
      expect(performance.onTimeDeliveryRate).toBe(0)
      expect(performance.qualityScore).toBe(0)
      expect(performance.responseTime).toBe(0)
    })
  })
  
  describe("Supplier Status Management", () => {
    beforeEach(() => {
      mockSupplierManager.registerSupplier(
          "Test Supplier",
          "Description",
          "contact@supplier.com",
          "ST2SUPPLIER_ADDRESS",
      )
    })
    
    it("should update supplier status by admin", () => {
      const result = mockSupplierManager.updateSupplierStatus(
          "ST2SUPPLIER_ADDRESS",
          2, // STATUS_APPROVED
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.success).toBe(true)
      expect(mockSupplierManager.isSupplierApproved("ST2SUPPLIER_ADDRESS")).toBe(true)
      expect(mockSupplierManager.getSupplierStatus("ST2SUPPLIER_ADDRESS")).toBe(2)
    })
    
    it("should reject status update from non-admin", () => {
      const result = mockSupplierManager.updateSupplierStatus("ST2SUPPLIER_ADDRESS", 2, "ST3UNAUTHORIZED_USER")
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject invalid status values", () => {
      const result = mockSupplierManager.updateSupplierStatus(
          "ST2SUPPLIER_ADDRESS",
          10, // Invalid status
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_INVALID_STATUS")
    })
    
    it("should reject status update for non-existent supplier", () => {
      const result = mockSupplierManager.updateSupplierStatus(
          "ST3NON_EXISTENT_SUPPLIER",
          2,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_SUPPLIER_NOT_FOUND")
    })
  })
  
  describe("Supplier Rating System", () => {
    beforeEach(() => {
      mockSupplierManager.registerSupplier(
          "Test Supplier",
          "Description",
          "contact@supplier.com",
          "ST2SUPPLIER_ADDRESS",
      )
    })
    
    it("should rate supplier successfully", () => {
      const result = mockSupplierManager.rateSupplier("ST2SUPPLIER_ADDRESS", 4, "Good service", "ST3CUSTOMER_ADDRESS")
      
      expect(result.success).toBe(true)
      
      const supplier = mockSupplierManager.getSupplier("ST2SUPPLIER_ADDRESS")
      expect(supplier.averageRating).toBe(4)
      expect(supplier.totalRatings).toBe(1)
      
      const rating = mockSupplierManager.getSupplierRating("ST2SUPPLIER_ADDRESS", "ST3CUSTOMER_ADDRESS")
      expect(rating.rating).toBe(4)
      expect(rating.comment).toBe("Good service")
    })
    
    it("should calculate average rating correctly", () => {
      // First rating
      mockSupplierManager.rateSupplier("ST2SUPPLIER_ADDRESS", 5, "Excellent", "ST3CUSTOMER1")
      
      // Second rating
      mockSupplierManager.rateSupplier("ST2SUPPLIER_ADDRESS", 3, "Average", "ST3CUSTOMER2")
      
      const supplier = mockSupplierManager.getSupplier("ST2SUPPLIER_ADDRESS")
      expect(supplier.totalRatings).toBe(2)
      expect(supplier.averageRating).toBe(4) // (5 + 3) / 2 = 4
    })
    
    it("should reject invalid rating values", () => {
      const result = mockSupplierManager.rateSupplier(
          "ST2SUPPLIER_ADDRESS",
          6, // Invalid rating > 5
          "Invalid rating",
          "ST3CUSTOMER_ADDRESS",
      )
      
      expect(result.error).toBe("ERR_INVALID_RATING")
    })
    
    it("should reject self-rating", () => {
      const result = mockSupplierManager.rateSupplier(
          "ST2SUPPLIER_ADDRESS",
          5,
          "Self rating",
          "ST2SUPPLIER_ADDRESS", // Same as supplier address
      )
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject rating non-existent supplier", () => {
      const result = mockSupplierManager.rateSupplier("ST3NON_EXISTENT_SUPPLIER", 4, "Rating", "ST3CUSTOMER_ADDRESS")
      
      expect(result.error).toBe("ERR_SUPPLIER_NOT_FOUND")
    })
  })
  
  describe("Performance Metrics Management", () => {
    beforeEach(() => {
      mockSupplierManager.registerSupplier(
          "Test Supplier",
          "Description",
          "contact@supplier.com",
          "ST2SUPPLIER_ADDRESS",
      )
    })
    
    it("should update performance metrics by admin", () => {
      const result = mockSupplierManager.updatePerformanceMetrics(
          "ST2SUPPLIER_ADDRESS",
          85, // on-time rate
          90, // quality score
          24, // response time
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.success).toBe(true)
      
      const performance = mockSupplierManager.getSupplierPerformance("ST2SUPPLIER_ADDRESS")
      expect(performance.onTimeDeliveryRate).toBe(85)
      expect(performance.qualityScore).toBe(90)
      expect(performance.responseTime).toBe(24)
    })
    
    it("should update performance metrics by supplier themselves", () => {
      const result = mockSupplierManager.updatePerformanceMetrics(
          "ST2SUPPLIER_ADDRESS",
          80,
          85,
          48,
          "ST2SUPPLIER_ADDRESS", // Supplier updating their own metrics
      )
      
      expect(result.success).toBe(true)
    })
    
    it("should reject performance update from unauthorized user", () => {
      const result = mockSupplierManager.updatePerformanceMetrics(
          "ST2SUPPLIER_ADDRESS",
          85,
          90,
          24,
          "ST3UNAUTHORIZED_USER",
      )
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject invalid performance values", () => {
      const result = mockSupplierManager.updatePerformanceMetrics(
          "ST2SUPPLIER_ADDRESS",
          150, // Invalid on-time rate > 100
          90,
          24,
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_INVALID_RATING")
    })
  })
  
  describe("Order Statistics Management", () => {
    beforeEach(() => {
      mockSupplierManager.registerSupplier(
          "Test Supplier",
          "Description",
          "contact@supplier.com",
          "ST2SUPPLIER_ADDRESS",
      )
    })
    
    it("should update order statistics correctly", () => {
      // Add completed order
      let result = mockSupplierManager.updateOrderStats(
          "ST2SUPPLIER_ADDRESS",
          true, // completed
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      expect(result.success).toBe(true)
      
      // Add incomplete order
      result = mockSupplierManager.updateOrderStats(
          "ST2SUPPLIER_ADDRESS",
          false, // not completed
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      expect(result.success).toBe(true)
      
      const supplier = mockSupplierManager.getSupplier("ST2SUPPLIER_ADDRESS")
      expect(supplier.totalOrders).toBe(2)
      expect(supplier.completedOrders).toBe(1)
      
      const completionRate = mockSupplierManager.getCompletionRate("ST2SUPPLIER_ADDRESS")
      expect(completionRate).toBe(50) // 1/2 * 100 = 50%
    })
    
    it("should reject order stats update from non-admin", () => {
      const result = mockSupplierManager.updateOrderStats("ST2SUPPLIER_ADDRESS", true, "ST3UNAUTHORIZED_USER")
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should calculate completion rate correctly for zero orders", () => {
      const completionRate = mockSupplierManager.getCompletionRate("ST2SUPPLIER_ADDRESS")
      expect(completionRate).toBe(0)
    })
  })
  
  describe("Certification Management", () => {
    beforeEach(() => {
      mockSupplierManager.registerSupplier(
          "Test Supplier",
          "Description",
          "contact@supplier.com",
          "ST2SUPPLIER_ADDRESS",
      )
    })
    
    it("should update certification level by admin", () => {
      const result = mockSupplierManager.updateCertification(
          "ST2SUPPLIER_ADDRESS",
          3, // Level 3 certification
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.success).toBe(true)
      
      const supplier = mockSupplierManager.getSupplier("ST2SUPPLIER_ADDRESS")
      expect(supplier.certificationLevel).toBe(3)
    })
    
    it("should reject certification update from non-admin", () => {
      const result = mockSupplierManager.updateCertification("ST2SUPPLIER_ADDRESS", 3, "ST3UNAUTHORIZED_USER")
      
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
    
    it("should reject invalid certification levels", () => {
      const result = mockSupplierManager.updateCertification(
          "ST2SUPPLIER_ADDRESS",
          10, // Invalid level > 5
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.error).toBe("ERR_INVALID_RATING")
    })
  })
  
  describe("Read-only Functions", () => {
    beforeEach(() => {
      mockSupplierManager.registerSupplier(
          "Test Supplier",
          "A reliable supplier",
          "contact@supplier.com",
          "ST2SUPPLIER_ADDRESS",
      )
    })
    
    it("should return supplier details correctly", () => {
      const supplier = mockSupplierManager.getSupplier("ST2SUPPLIER_ADDRESS")
      expect(supplier).toBeTruthy()
      expect(supplier.name).toBe("Test Supplier")
      expect(supplier.description).toBe("A reliable supplier")
      expect(supplier.contactInfo).toBe("contact@supplier.com")
    })
    
    it("should return null for non-existent supplier", () => {
      const supplier = mockSupplierManager.getSupplier("ST3NON_EXISTENT")
      expect(supplier).toBe(null)
    })
    
    it("should check supplier approval status correctly", () => {
      expect(mockSupplierManager.isSupplierApproved("ST2SUPPLIER_ADDRESS")).toBe(false)
      
      // Approve supplier
      mockSupplierManager.updateSupplierStatus("ST2SUPPLIER_ADDRESS", 2, "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
      
      expect(mockSupplierManager.isSupplierApproved("ST2SUPPLIER_ADDRESS")).toBe(true)
    })
    
    it("should return correct total suppliers count", () => {
      expect(mockSupplierManager.getTotalSuppliers()).toBe(1)
      
      // Register another supplier
      mockSupplierManager.registerSupplier(
          "Second Supplier",
          "Description",
          "contact2@supplier.com",
          "ST3SECOND_SUPPLIER",
      )
      
      expect(mockSupplierManager.getTotalSuppliers()).toBe(2)
    })
  })
})
