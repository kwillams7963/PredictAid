(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-REGION u101)
(define-constant ERR-INVALID-DATA-TYPE u102)
(define-constant ERR-INVALID-PERIOD u103)
(define-constant ERR-INVALID-THRESHOLD u104)
(define-constant ERR-NO-DATA u105)
(define-constant ERR-INSUFFICIENT-DATA u106)
(define-constant ERR-INVALID-PREDICTION-ID u107)
(define-constant ERR-PREDICTION-ALREADY-EXISTS u108)
(define-constant ERR-INVALID-CONFIDENCE u109)
(define-constant ERR-INVALID-FORECAST-HORIZON u110)
(define-constant ERR-CALCULATION-OVERFLOW u111)
(define-constant ERR-INVALID-WEIGHT u112)
(define-constant ERR-INVALID-MODEL-PARAMS u113)
(define-constant ERR-MODEL-NOT-FOUND u114)
(define-constant ERR-INVALID-TIMESTAMP u115)
(define-constant ERR-FUTURE-TIMESTAMP u116)
(define-constant ERR-INVALID-AGGREGATOR u117)
(define-constant ERR-MAX-PREDICTIONS-EXCEEDED u118)
(define-constant ERR-INVALID-RISK-LEVEL u119)
(define-constant ERR-INVALID-IMPACT-SCORE u120)
(define-constant ERR-INVALID-URGENCY u121)
(define-constant ERR-INVALID-SEVERITY u122)
(define-constant ERR-INVALID-PROBABILITY u123)
(define-constant ERR-INVALID-CATEGORY u124)
(define-constant ERR-INVALID-SOURCE u125)
(define-constant ERR-INVALID-UPDATE u126)
(define-constant ERR-UPDATE-NOT-ALLOWED u127)
(define-constant ERR-INVALID-VARIANCE u128)
(define-constant ERR-INVALID-STANDARD-DEVIATION u129)
(define-constant ERR-INVALID-CORRELATION u130)

(define-data-var next-prediction-id uint u0)
(define-data-var max-predictions uint u5000)
(define-data-var aggregator-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var model-version uint u1)
(define-data-var default-threshold uint u50)
(define-data-var default-period uint u30)
(define-data-var default-horizon uint u7)

(define-map predictions
  uint
  {
    region: (string-ascii 50),
    data-type: (string-ascii 50),
    forecast-value: uint,
    confidence: uint,
    timestamp: uint,
    creator: principal,
    risk-level: uint,
    impact-score: uint,
    urgency: uint,
    severity: uint,
    probability: uint,
    category: (string-ascii 50),
    source: principal
  }
)

(define-map prediction-updates
  uint
  {
    update-forecast: uint,
    update-confidence: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map models
  (string-ascii 50)
  {
    weights: (list 10 uint),
    thresholds: (list 5 uint),
    periods: (list 5 uint)
  }
)

(define-map data-cache
  { region: (string-ascii 50), data-type: (string-ascii 50) }
  (list 100 { timestamp: uint, value: uint })
)

(define-read-only (get-prediction (id uint))
  (map-get? predictions id)
)

(define-read-only (get-prediction-update (id uint))
  (map-get? prediction-updates id)
)

(define-read-only (get-model (model-name (string-ascii 50)))
  (map-get? models model-name)
)

(define-read-only (get-data-cache (region (string-ascii 50)) (data-type (string-ascii 50)))
  (map-get? data-cache { region: region, data-type: data-type })
)

(define-read-only (get-prediction-count)
  (var-get next-prediction-id)
)

(define-private (validate-region (region (string-ascii 50)))
  (if (> (len region) u0)
      (ok true)
      (err ERR-INVALID-REGION))
)

(define-private (validate-data-type (dtype (string-ascii 50)))
  (if (or (is-eq dtype "donations") (is-eq dtype "disasters") (is-eq dtype "economic") (is-eq dtype "weather"))
      (ok true)
      (err ERR-INVALID-DATA-TYPE))
)

(define-private (validate-period (period uint))
  (if (and (> period u0) (<= period u365))
      (ok true)
      (err ERR-INVALID-PERIOD))
)

(define-private (validate-threshold (thresh uint))
  (if (<= thresh u100)
      (ok true)
      (err ERR-INVALID-THRESHOLD))
)

(define-private (validate-confidence (conf uint))
  (if (<= conf u100)
      (ok true)
      (err ERR-INVALID-CONFIDENCE))
)

(define-private (validate-horizon (horizon uint))
  (if (and (> horizon u0) (<= horizon u30))
      (ok true)
      (err ERR-INVALID-FORECAST-HORIZON))
)

(define-private (validate-weight (weight uint))
  (if (<= weight u100)
      (ok true)
      (err ERR-INVALID-WEIGHT))
)

(define-private (validate-timestamp (ts uint))
  (if (<= ts block-height)
      (ok true)
      (err ERR-FUTURE-TIMESTAMP))
)

(define-private (validate-risk-level (risk uint))
  (if (<= risk u5)
      (ok true)
      (err ERR-INVALID-RISK-LEVEL))
)

(define-private (validate-impact-score (impact uint))
  (if (<= impact u10)
      (ok true)
      (err ERR-INVALID-IMPACT-SCORE))
)

(define-private (validate-urgency (urg uint))
  (if (<= urg u5)
      (ok true)
      (err ERR-INVALID-URGENCY))
)

(define-private (validate-severity (sev uint))
  (if (<= sev u5)
      (ok true)
      (err ERR-INVALID-SEVERITY))
)

(define-private (validate-probability (prob uint))
  (if (<= prob u100)
      (ok true)
      (err ERR-INVALID-PROBABILITY))
)

(define-private (validate-category (cat (string-ascii 50)))
  (if (or (is-eq cat "famine") (is-eq cat "flood") (is-eq cat "earthquake") (is-eq cat "conflict"))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-source (src principal))
  (if (not (is-eq src 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-SOURCE))
)

(define-private (fetch-data (region (string-ascii 50)) (dtype (string-ascii 50)) (period uint))
  (let ((cached (get-data-cache region dtype)))
    (match cached
      data (ok data)
      (let ((fetched (as-contract (contract-call? .data-aggregator get-historical-data region dtype period))))
        (match fetched
          res (begin
                (map-set data-cache { region: region, data-type: dtype } res)
                (ok res))
          (err ERR-NO-DATA)))))
)

(define-private (compute-moving-average (values (list 100 uint)) (window uint))
  (let ((sum (fold + values u0))
        (count (len values)))
    (if (>= count window)
        (/ sum count)
        u0))
)

(define-private (compute-variance (values (list 100 uint)) (mean uint))
  (let ((diffs (map (lambda (v) (* (- v mean) (- v mean))) values))
        (sum-diffs (fold + diffs u0))
        (count (len values)))
    (if (> count u1)
        (/ sum-diffs (- count u1))
        u0))
)

(define-private (apply-weights (values (list 100 uint)) (weights (list 10 uint)))
  (fold + (map * values (unwrap-panic (slice? weights u0 (len values)))) u0)
)

(define-public (set-aggregator-contract (new-aggregator principal))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR-NOT-AUTHORIZED))
    (var-set aggregator-contract new-aggregator)
    (ok true))
)

(define-public (set-max-predictions (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR-NOT-AUTHORIZED))
    (var-set max-predictions new-max)
    (ok true))
)

(define-public (update-model (model-name (string-ascii 50)) (weights (list 10 uint)) (thresholds (list 5 uint)) (periods (list 5 uint)))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR-NOT-AUTHORIZED))
    (try! (fold (lambda (w acc) (and acc (is-ok (validate-weight w)))) weights (ok true)))
    (try! (fold (lambda (t acc) (and acc (is-ok (validate-threshold t)))) thresholds (ok true)))
    (try! (fold (lambda (p acc) (and acc (is-ok (validate-period p)))) periods (ok true)))
    (map-set models model-name { weights: weights, thresholds: thresholds, periods: periods })
    (ok true))
)

(define-public (generate-prediction
  (region (string-ascii 50))
  (data-type (string-ascii 50))
  (period uint)
  (threshold uint)
  (horizon uint)
  (model-name (string-ascii 50))
  (risk-level uint)
  (impact-score uint)
  (urgency uint)
  (severity uint)
  (probability uint)
  (category (string-ascii 50))
  (source principal))
  (let (
    (next-id (var-get next-prediction-id))
    (current-max (var-get max-predictions))
    (data (try! (fetch-data region data-type period)))
    (values (map (lambda (d) (get value d)) data))
    (model (unwrap! (get-model model-name) (err ERR-MODEL-NOT-FOUND)))
    (weighted-sum (apply-weights values (get weights model)))
    (mean (compute-moving-average values (default-to (var-get default-period) (element-at? (get periods model) u0))))
    (variance (compute-variance values mean))
    (forecast (+ mean (/ weighted-sum horizon)))
    (confidence (- u100 (/ variance u100)))
    )
    (asserts! (< next-id current-max) (err ERR-MAX-PREDICTIONS-EXCEEDED))
    (try! (validate-region region))
    (try! (validate-data-type data-type))
    (try! (validate-period period))
    (try! (validate-threshold threshold))
    (try! (validate-horizon horizon))
    (try! (validate-confidence confidence))
    (try! (validate-risk-level risk-level))
    (try! (validate-impact-score impact-score))
    (try! (validate-urgency urgency))
    (try! (validate-severity severity))
    (try! (validate-probability probability))
    (try! (validate-category category))
    (try! (validate-source source))
    (asserts! (> (len values) u5) (err ERR-INSUFFICIENT-DATA))
    (asserts! (> forecast threshold) (err ERR-INVALID_FORECAST-HORIZON))
    (map-set predictions next-id
      {
        region: region,
        data-type: data-type,
        forecast-value: forecast,
        confidence: confidence,
        timestamp: block-height,
        creator: tx-sender,
        risk-level: risk-level,
        impact-score: impact-score,
        urgency: urgency,
        severity: severity,
        probability: probability,
        category: category,
        source: source
      })
    (var-set next-prediction-id (+ next-id u1))
    (print { event: "prediction-generated", id: next-id })
    (ok next-id))
)

(define-public (update-prediction
  (pred-id uint)
  (new-forecast uint)
  (new-confidence uint))
  (let (
    (pred (unwrap! (map-get? predictions pred-id) (err ERR-INVALID-PREDICTION-ID)))
    )
    (asserts! (is-eq (get creator pred) tx-sender) (err ERR-NOT-AUTHORIZED))
    (try! (validate-confidence new-confidence))
    (map-set predictions pred-id
      (merge pred { forecast-value: new-forecast, confidence: new-confidence, timestamp: block-height }))
    (map-set prediction-updates pred-id
      {
        update-forecast: new-forecast,
        update-confidence: new-confidence,
        update-timestamp: block-height,
        updater: tx-sender
      })
    (print { event: "prediction-updated", id: pred-id })
    (ok true))
)