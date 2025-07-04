;; Product Tracker Contract
;; Manages individual product tracking throughout the supply chain

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_PRODUCT_NOT_FOUND (err u101))
(define-constant ERR_PRODUCT_EXISTS (err u102))
(define-constant ERR_INVALID_STATUS (err u103))
(define-constant ERR_INVALID_OWNER (err u104))

;; Data Variables
(define-data-var next-product-id uint u1)

;; Product Status Types
(define-constant STATUS_MANUFACTURED u1)
(define-constant STATUS_IN_TRANSIT u2)
(define-constant STATUS_DELIVERED u3)
(define-constant STATUS_QUALITY_CHECK u4)
(define-constant STATUS_RECALLED u5)

;; Product Data Structure
(define-map products
  { product-id: uint }
  {
    name: (string-ascii 100),
    description: (string-ascii 500),
    manufacturer: principal,
    current-owner: principal,
    status: uint,
    created-at: uint,
    updated-at: uint,
    batch-number: (string-ascii 50),
    quality-score: uint
  }
)

;; Product History Tracking
(define-map product-history
  { product-id: uint, sequence: uint }
  {
    previous-owner: principal,
    new-owner: principal,
    status-change: uint,
    timestamp: uint,
    notes: (string-ascii 200)
  }
)

;; History sequence tracking
(define-map product-history-count
  { product-id: uint }
  { count: uint }
)

;; Public Functions

;; Register a new product
(define-public (register-product
  (name (string-ascii 100))
  (description (string-ascii 500))
  (batch-number (string-ascii 50))
  (quality-score uint))
  (let ((product-id (var-get next-product-id)))
    (asserts! (<= quality-score u100) ERR_INVALID_STATUS)
    (map-set products
      { product-id: product-id }
      {
        name: name,
        description: description,
        manufacturer: tx-sender,
        current-owner: tx-sender,
        status: STATUS_MANUFACTURED,
        created-at: block-height,
        updated-at: block-height,
        batch-number: batch-number,
        quality-score: quality-score
      }
    )
    (map-set product-history-count
      { product-id: product-id }
      { count: u0 }
    )
    (var-set next-product-id (+ product-id u1))
    (ok product-id)
  )
)

;; Update product status
(define-public (update-product-status (product-id uint) (new-status uint) (notes (string-ascii 200)))
  (let ((product (unwrap! (map-get? products { product-id: product-id }) ERR_PRODUCT_NOT_FOUND)))
    (asserts! (or (is-eq tx-sender (get current-owner product))
                  (is-eq tx-sender CONTRACT_OWNER)) ERR_UNAUTHORIZED)
    (asserts! (and (>= new-status u1) (<= new-status u5)) ERR_INVALID_STATUS)

    ;; Add to history
    (let ((history-count (default-to { count: u0 }
                           (map-get? product-history-count { product-id: product-id }))))
      (map-set product-history
        { product-id: product-id, sequence: (get count history-count) }
        {
          previous-owner: (get current-owner product),
          new-owner: (get current-owner product),
          status-change: new-status,
          timestamp: block-height,
          notes: notes
        }
      )
      (map-set product-history-count
        { product-id: product-id }
        { count: (+ (get count history-count) u1) }
      )
    )

    ;; Update product
    (map-set products
      { product-id: product-id }
      (merge product { status: new-status, updated-at: block-height })
    )
    (ok true)
  )
)

;; Transfer product ownership
(define-public (transfer-product (product-id uint) (new-owner principal) (notes (string-ascii 200)))
  (let ((product (unwrap! (map-get? products { product-id: product-id }) ERR_PRODUCT_NOT_FOUND)))
    (asserts! (is-eq tx-sender (get current-owner product)) ERR_UNAUTHORIZED)

    ;; Add to history
    (let ((history-count (default-to { count: u0 }
                           (map-get? product-history-count { product-id: product-id }))))
      (map-set product-history
        { product-id: product-id, sequence: (get count history-count) }
        {
          previous-owner: (get current-owner product),
          new-owner: new-owner,
          status-change: (get status product),
          timestamp: block-height,
          notes: notes
        }
      )
      (map-set product-history-count
        { product-id: product-id }
        { count: (+ (get count history-count) u1) }
      )
    )

    ;; Update product ownership
    (map-set products
      { product-id: product-id }
      (merge product { current-owner: new-owner, updated-at: block-height })
    )
    (ok true)
  )
)

;; Update quality score
(define-public (update-quality-score (product-id uint) (new-score uint))
  (let ((product (unwrap! (map-get? products { product-id: product-id }) ERR_PRODUCT_NOT_FOUND)))
    (asserts! (or (is-eq tx-sender (get current-owner product))
                  (is-eq tx-sender CONTRACT_OWNER)) ERR_UNAUTHORIZED)
    (asserts! (<= new-score u100) ERR_INVALID_STATUS)

    (map-set products
      { product-id: product-id }
      (merge product { quality-score: new-score, updated-at: block-height })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get product details
(define-read-only (get-product (product-id uint))
  (map-get? products { product-id: product-id })
)

;; Get product history entry
(define-read-only (get-product-history (product-id uint) (sequence uint))
  (map-get? product-history { product-id: product-id, sequence: sequence })
)

;; Get product history count
(define-read-only (get-product-history-count (product-id uint))
  (default-to { count: u0 } (map-get? product-history-count { product-id: product-id }))
)

;; Get next product ID
(define-read-only (get-next-product-id)
  (var-get next-product-id)
)

;; Check if product exists
(define-read-only (product-exists (product-id uint))
  (is-some (map-get? products { product-id: product-id }))
)

;; Get product owner
(define-read-only (get-product-owner (product-id uint))
  (match (map-get? products { product-id: product-id })
    product (some (get current-owner product))
    none
  )
)

;; Get product status
(define-read-only (get-product-status (product-id uint))
  (match (map-get? products { product-id: product-id })
    product (some (get status product))
    none
  )
)
