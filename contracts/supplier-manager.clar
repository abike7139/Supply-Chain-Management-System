;; Supplier Manager Contract
;; Manages supplier information and performance ratings

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_SUPPLIER_NOT_FOUND (err u201))
(define-constant ERR_SUPPLIER_EXISTS (err u202))
(define-constant ERR_INVALID_RATING (err u203))
(define-constant ERR_INVALID_STATUS (err u204))

;; Supplier Status Types
(define-constant STATUS_PENDING u1)
(define-constant STATUS_APPROVED u2)
(define-constant STATUS_SUSPENDED u3)
(define-constant STATUS_BLACKLISTED u4)

;; Data Variables
(define-data-var total-suppliers uint u0)

;; Supplier Data Structure
(define-map suppliers
  { supplier-address: principal }
  {
    name: (string-ascii 100),
    description: (string-ascii 500),
    contact-info: (string-ascii 200),
    registration-date: uint,
    status: uint,
    total-orders: uint,
    completed-orders: uint,
    average-rating: uint,
    total-ratings: uint,
    certification-level: uint
  }
)

;; Individual Ratings
(define-map supplier-ratings
  { supplier-address: principal, rater: principal }
  {
    rating: uint,
    comment: (string-ascii 200),
    timestamp: uint
  }
)

;; Performance Metrics
(define-map supplier-performance
  { supplier-address: principal }
  {
    on-time-delivery-rate: uint,
    quality-score: uint,
    response-time: uint,
    last-updated: uint
  }
)

;; Public Functions

;; Register a new supplier
(define-public (register-supplier
  (name (string-ascii 100))
  (description (string-ascii 500))
  (contact-info (string-ascii 200)))
  (begin
    (asserts! (is-none (map-get? suppliers { supplier-address: tx-sender })) ERR_SUPPLIER_EXISTS)
    (map-set suppliers
      { supplier-address: tx-sender }
      {
        name: name,
        description: description,
        contact-info: contact-info,
        registration-date: block-height,
        status: STATUS_PENDING,
        total-orders: u0,
        completed-orders: u0,
        average-rating: u0,
        total-ratings: u0,
        certification-level: u1
      }
    )
    (map-set supplier-performance
      { supplier-address: tx-sender }
      {
        on-time-delivery-rate: u0,
        quality-score: u0,
        response-time: u0,
        last-updated: block-height
      }
    )
    (var-set total-suppliers (+ (var-get total-suppliers) u1))
    (ok true)
  )
)

;; Update supplier status (admin only)
(define-public (update-supplier-status (supplier-address principal) (new-status uint))
  (let ((supplier (unwrap! (map-get? suppliers { supplier-address: supplier-address }) ERR_SUPPLIER_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (and (>= new-status u1) (<= new-status u4)) ERR_INVALID_STATUS)

    (map-set suppliers
      { supplier-address: supplier-address }
      (merge supplier { status: new-status })
    )
    (ok true)
  )
)

;; Rate a supplier
(define-public (rate-supplier
  (supplier-address principal)
  (rating uint)
  (comment (string-ascii 200)))
  (let ((supplier (unwrap! (map-get? suppliers { supplier-address: supplier-address }) ERR_SUPPLIER_NOT_FOUND)))
    (asserts! (and (>= rating u1) (<= rating u5)) ERR_INVALID_RATING)
    (asserts! (not (is-eq tx-sender supplier-address)) ERR_UNAUTHORIZED)

    ;; Store individual rating
    (map-set supplier-ratings
      { supplier-address: supplier-address, rater: tx-sender }
      {
        rating: rating,
        comment: comment,
        timestamp: block-height
      }
    )

    ;; Update average rating
    (let ((total-ratings (get total-ratings supplier))
          (current-avg (get average-rating supplier))
          (new-total-ratings (+ total-ratings u1))
          (new-average (/ (+ (* current-avg total-ratings) rating) new-total-ratings)))
      (map-set suppliers
        { supplier-address: supplier-address }
        (merge supplier {
          average-rating: new-average,
          total-ratings: new-total-ratings
        })
      )
    )
    (ok true)
  )
)

;; Update supplier performance metrics
(define-public (update-performance-metrics
  (supplier-address principal)
  (on-time-rate uint)
  (quality-score uint)
  (response-time uint))
  (begin
    (asserts! (is-some (map-get? suppliers { supplier-address: supplier-address })) ERR_SUPPLIER_NOT_FOUND)
    (asserts! (or (is-eq tx-sender CONTRACT_OWNER) (is-eq tx-sender supplier-address)) ERR_UNAUTHORIZED)
    (asserts! (and (<= on-time-rate u100) (<= quality-score u100)) ERR_INVALID_RATING)

    (map-set supplier-performance
      { supplier-address: supplier-address }
      {
        on-time-delivery-rate: on-time-rate,
        quality-score: quality-score,
        response-time: response-time,
        last-updated: block-height
      }
    )
    (ok true)
  )
)

;; Update order statistics
(define-public (update-order-stats (supplier-address principal) (completed bool))
  (let ((supplier (unwrap! (map-get? suppliers { supplier-address: supplier-address }) ERR_SUPPLIER_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (let ((new-total (+ (get total-orders supplier) u1))
          (new-completed (if completed
                           (+ (get completed-orders supplier) u1)
                           (get completed-orders supplier))))
      (map-set suppliers
        { supplier-address: supplier-address }
        (merge supplier {
          total-orders: new-total,
          completed-orders: new-completed
        })
      )
    )
    (ok true)
  )
)

;; Update certification level
(define-public (update-certification (supplier-address principal) (level uint))
  (let ((supplier (unwrap! (map-get? suppliers { supplier-address: supplier-address }) ERR_SUPPLIER_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (and (>= level u1) (<= level u5)) ERR_INVALID_RATING)

    (map-set suppliers
      { supplier-address: supplier-address }
      (merge supplier { certification-level: level })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get supplier details
(define-read-only (get-supplier (supplier-address principal))
  (map-get? suppliers { supplier-address: supplier-address })
)

;; Get supplier performance
(define-read-only (get-supplier-performance (supplier-address principal))
  (map-get? supplier-performance { supplier-address: supplier-address })
)

;; Get supplier rating from specific rater
(define-read-only (get-supplier-rating (supplier-address principal) (rater principal))
  (map-get? supplier-ratings { supplier-address: supplier-address, rater: rater })
)

;; Check if supplier is approved
(define-read-only (is-supplier-approved (supplier-address principal))
  (match (map-get? suppliers { supplier-address: supplier-address })
    supplier (is-eq (get status supplier) STATUS_APPROVED)
    false
  )
)

;; Get supplier completion rate
(define-read-only (get-completion-rate (supplier-address principal))
  (match (map-get? suppliers { supplier-address: supplier-address })
    supplier (if (> (get total-orders supplier) u0)
               (some (/ (* (get completed-orders supplier) u100) (get total-orders supplier)))
               (some u0))
    none
  )
)

;; Get total suppliers count
(define-read-only (get-total-suppliers)
  (var-get total-suppliers)
)

;; Check supplier status
(define-read-only (get-supplier-status (supplier-address principal))
  (match (map-get? suppliers { supplier-address: supplier-address })
    supplier (some (get status supplier))
    none
  )
)
