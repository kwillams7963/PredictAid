import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_REGION = 101;
const ERR_INVALID_DATA_TYPE = 102;
const ERR_INVALID_PERIOD = 103;
const ERR_INVALID_THRESHOLD = 104;
const ERR_NO_DATA = 105;
const ERR_INSUFFICIENT_DATA = 106;
const ERR_INVALID_PREDICTION_ID = 107;
const ERR_MAX_PREDICTIONS_EXCEEDED = 118;
const ERR_INVALID_CONFIDENCE = 109;
const ERR_INVALID_FORECAST_HORIZON = 110;
const ERR_INVALID_RISK_LEVEL = 119;
const ERR_INVALID_IMPACT_SCORE = 120;
const ERR_INVALID_URGENCY = 121;
const ERR_INVALID_SEVERITY = 122;
const ERR_INVALID_PROBABILITY = 123;
const ERR_INVALID_CATEGORY = 124;
const ERR_INVALID_SOURCE = 125;
const ERR_MODEL_NOT_FOUND = 114;

interface Prediction {
  region: string;
  dataType: string;
  forecastValue: number;
  confidence: number;
  timestamp: number;
  creator: string;
  riskLevel: number;
  impactScore: number;
  urgency: number;
  severity: number;
  probability: number;
  category: string;
  source: string;
}

interface PredictionUpdate {
  updateForecast: number;
  updateConfidence: number;
  updateTimestamp: number;
  updater: string;
}

interface Model {
  weights: number[];
  thresholds: number[];
  periods: number[];
}

interface DataPoint {
  timestamp: number;
  value: number;
}

class PredictionModelMock {
  state!: {
    nextPredictionId: number;
    maxPredictions: number;
    aggregatorContract: string;
    modelVersion: number;
    defaultThreshold: number;
    defaultPeriod: number;
    defaultHorizon: number;
    predictions: Map<number, Prediction>;
    predictionUpdates: Map<number, PredictionUpdate>;
    models: Map<string, Model>;
    dataCache: Map<string, DataPoint[]>;
  };
  blockHeight = 0;
  caller = "ST1TEST";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPredictionId: 0,
      maxPredictions: 5000,
      aggregatorContract: "SP000000000000000000002Q6VF78",
      modelVersion: 1,
      defaultThreshold: 50,
      defaultPeriod: 30,
      defaultHorizon: 7,
      predictions: new Map(),
      predictionUpdates: new Map(),
      models: new Map(),
      dataCache: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
  }

  getDataCache(region: string, dataType: string): { ok: boolean; value: DataPoint[] | null } {
    const key = `${region}:${dataType}`;
    const data = this.state.dataCache.get(key);
    return data ? { ok: true, value: data } : { ok: false, value: null };
  }

  setModel(modelName: string, weights: number[], thresholds: number[], periods: number[]): { ok: boolean; value: boolean | number } {
    if (this.caller !== this.state.aggregatorContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    for (const w of weights) if (w > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    for (const t of thresholds) if (t > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    for (const p of periods) if (p <= 0 || p > 365) return { ok: false, value: ERR_INVALID_PERIOD };
    this.state.models.set(modelName, { weights, thresholds, periods });
    return { ok: true, value: true };
  }

  fetchData(region: string, dataType: string, period: number): { ok: boolean; value: DataPoint[] } {
    const key = `${region}:${dataType}`;
    let data = this.state.dataCache.get(key);
    if (!data) {
      data = Array.from({ length: period }, (_, i) => ({
        timestamp: this.blockHeight - i,
        value: 100 + i,
      }));
      this.state.dataCache.set(key, data);
    }
    return { ok: true, value: data };
  }

  computeMovingAverage(values: number[], window: number): number {
    if (values.length < window) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.floor(sum / values.length);
  }

  computeVariance(values: number[], mean: number): number {
    if (values.length <= 1) return 0;
    const diffs = values.map(v => (v - mean) ** 2);
    const sumDiffs = diffs.reduce((a, b) => a + b, 0);
    return Math.floor(sumDiffs / (values.length - 1));
  }

  applyWeights(values: number[], weights: number[]): number {
    return values.reduce((sum, v, i) => sum + v * (weights[i] || 0), 0);
  }

  generatePrediction(
    region: string,
    dataType: string,
    period: number,
    threshold: number,
    horizon: number,
    modelName: string,
    riskLevel: number,
    impactScore: number,
    urgency: number,
    severity: number,
    probability: number,
    category: string,
    source: string
  ): { ok: boolean; value: number } {
    if (this.state.nextPredictionId >= this.state.maxPredictions) return { ok: false, value: ERR_MAX_PREDICTIONS_EXCEEDED };
    if (region.length === 0) return { ok: false, value: ERR_INVALID_REGION };
    if (!["donations", "disasters", "economic", "weather"].includes(dataType)) return { ok: false, value: ERR_INVALID_DATA_TYPE };
    if (period <= 0 || period > 365) return { ok: false, value: ERR_INVALID_PERIOD };
    if (threshold > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (horizon <= 0 || horizon > 30) return { ok: false, value: ERR_INVALID_FORECAST_HORIZON };
    if (riskLevel > 5) return { ok: false, value: ERR_INVALID_RISK_LEVEL };
    if (impactScore > 10) return { ok: false, value: ERR_INVALID_IMPACT_SCORE };
    if (urgency > 5) return { ok: false, value: ERR_INVALID_URGENCY };
    if (severity > 5) return { ok: false, value: ERR_INVALID_SEVERITY };
    if (probability > 100) return { ok: false, value: ERR_INVALID_PROBABILITY };
    if (!["famine", "flood", "earthquake", "conflict"].includes(category)) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (source === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_INVALID_SOURCE };

    const model = this.state.models.get(modelName);
    if (!model) return { ok: false, value: ERR_MODEL_NOT_FOUND };

    const dataResult = this.fetchData(region, dataType, period);
    if (!dataResult.ok) return { ok: false, value: ERR_NO_DATA };
    const values = dataResult.value.map(d => d.value);
    if (values.length < 5) return { ok: false, value: ERR_INSUFFICIENT_DATA };

    const mean = this.computeMovingAverage(values, this.state.defaultPeriod);
    const variance = this.computeVariance(values, mean);
    const weightedSum = this.applyWeights(values, model.weights);
    const forecast = mean + Math.floor(weightedSum / horizon);
    const confidence = Math.max(0, 100 - Math.floor(variance / 100));

    if (forecast <= threshold) return { ok: false, value: ERR_INVALID_FORECAST_HORIZON };

    const nextId = this.state.nextPredictionId;
    this.state.predictions.set(nextId, {
      region,
      dataType,
      forecastValue: forecast,
      confidence,
      timestamp: this.blockHeight,
      creator: this.caller,
      riskLevel,
      impactScore,
      urgency,
      severity,
      probability,
      category,
      source,
    });
    this.state.nextPredictionId++;
    return { ok: true, value: nextId };
  }

  updatePrediction(predId: number, newForecast: number, newConfidence: number): { ok: boolean; value: boolean | number } {
    const pred = this.state.predictions.get(predId);
    if (!pred) return { ok: false, value: ERR_INVALID_PREDICTION_ID };
    if (newConfidence > 100) return { ok: false, value: ERR_INVALID_CONFIDENCE };
    if (pred.creator !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };

    this.state.predictions.set(predId, {
      ...pred,
      forecastValue: newForecast,
      confidence: newConfidence,
      timestamp: this.blockHeight,
    });
    this.state.predictionUpdates.set(predId, {
      updateForecast: newForecast,
      updateConfidence: newConfidence,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getPrediction(id: number): { ok: boolean; value: Prediction | null } {
    const pred = this.state.predictions.get(id);
    return pred ? { ok: true, value: pred } : { ok: false, value: null };
  }
}

describe("PredictionModel", () => {
  let contract: PredictionModelMock;

  beforeEach(() => {
    contract = new PredictionModelMock();
  });

  it("generates a valid prediction", () => {
    contract.caller = contract.state.aggregatorContract; // authorize model creation
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    const result = contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    expect(result.ok).toBe(true);
    const pred = contract.getPrediction(0).value;
    expect(pred?.region).toBe("RegionA");
    expect(pred?.dataType).toBe("donations");
    expect(pred?.riskLevel).toBe(3);
    expect(pred?.category).toBe("famine");
  });

  it("rejects prediction with invalid region", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    const result = contract.generatePrediction(
      "",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_REGION);
  });

  it("rejects prediction with invalid data type", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    const result = contract.generatePrediction(
      "RegionA",
      "invalid",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DATA_TYPE);
  });

  it("rejects prediction with insufficient data", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    contract.state.dataCache.set("RegionA:donations", [
      { timestamp: contract.blockHeight, value: 100 },
      { timestamp: contract.blockHeight - 1, value: 90 },
    ]);
    const result = contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_DATA);
  });

  it("rejects prediction with non-existent model", () => {
    const result = contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MODEL_NOT_FOUND);
  });

  it("rejects prediction with max predictions exceeded", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    contract.state.nextPredictionId = 5000;
    const result = contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PREDICTIONS_EXCEEDED);
  });

  it("updates a valid prediction", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    const result = contract.updatePrediction(0, 200, 90);
    expect(result.ok).toBe(true);
    const updated = contract.getPrediction(0).value;
    expect(updated?.forecastValue).toBe(200);
    expect(updated?.confidence).toBe(90);
  });

  it("rejects update for non-existent prediction", () => {
    const result = contract.updatePrediction(99, 200, 90);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PREDICTION_ID);
  });

  it("rejects unauthorized prediction update", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    contract.caller = "ST2OTHER";
    const result = contract.updatePrediction(0, 200, 90);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects update with invalid confidence", () => {
    contract.caller = contract.state.aggregatorContract;
    contract.setModel("test-model", [10, 20, 30], [50, 60, 70], [30, 60, 90]);
    contract.generatePrediction(
      "RegionA",
      "donations",
      30,
      50,
      7,
      "test-model",
      3,
      5,
      4,
      3,
      80,
      "famine",
      "ST2SOURCE"
    );
    const result = contract.updatePrediction(0, 200, 101);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CONFIDENCE);
  });
});
