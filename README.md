# 🌍 PredictAid: Decentralized Analytics for Predictive Humanitarian Aid

Welcome to PredictAid, a groundbreaking Web3 project that leverages the Stacks blockchain to analyze historical on-chain data for forecasting and preempting humanitarian needs! In a world where aid is often reactive, this decentralized system uses transparent, immutable data to predict crises like food shortages, natural disasters, or economic downturns based on patterns in donations, token flows, and oracle-fed external indicators. By enabling proactive aid allocation, PredictAid empowers NGOs, donors, and communities to act before needs escalate, saving lives and resources.

## ✨ Features

🔮 Predictive analytics using on-chain historical data for forecasting needs  
📊 Immutable storage of data feeds and predictions for transparency  
💰 Automated aid allocation based on verified forecasts  
🤝 Donor incentives via tokenized rewards for contributions  
✅ Oracle integration for real-world data (e.g., weather, economic indicators)  
🛡️ Governance for community-driven model updates  
📈 Dashboard-like queries for real-time insights  
🚫 Fraud prevention through multi-signature verifications  

## 🛠 How It Works

**For Data Providers (Oracles and Reporters)**  
- Submit historical on-chain data (e.g., donation trends) or external feeds via the OracleFeed contract.  
- Use the DataAggregator to compile and store datasets immutably.  
Your contributions are rewarded with governance tokens, ensuring a decentralized data ecosystem.

**For Analysts and Predictors**  
- Query the AnalyticsEngine with parameters like region or crisis type.  
- Run on-chain computations via the PredictionModel to generate forecasts (e.g., "High risk of famine in region X based on 20% drop in aid inflows").  
Predictions are stored and verifiable, triggering alerts for aid organizations.

**For Donors and Aid Allocators**  
- Contribute funds to the AidPool contract.  
- When a prediction meets verification thresholds (via multi-sig in the Verifier contract), funds are automatically disbursed to predefined recipients.  
Track everything transparently—no middlemen, no delays.

**For Governance Participants**  
- Hold tokens from the TokenIssuer to vote on updates via the Governance contract.  
This keeps the system adaptable to new data models or crisis types.

That's it! A fully decentralized loop from data to action, all on the Stacks blockchain using Clarity smart contracts.

## 📜 Smart Contracts Overview

This project involves 8 smart contracts written in Clarity, each handling a specific aspect of the system for modularity and security:

1. **OracleFeed**: Handles submission of external data feeds (e.g., via oracles) and validates authenticity before storage.  
2. **DataAggregator**: Aggregates historical on-chain data (e.g., transaction volumes, donation patterns) into structured datasets.  
3. **DataStorage**: Provides immutable storage for all compiled data, with query functions for retrieval.  
4. **PredictionModel**: Implements simple on-chain logic (e.g., threshold-based forecasting) to generate predictions from aggregated data.  
5. **Verifier**: Uses multi-signature verification to confirm predictions and prevent false positives.  
6. **AidPool**: Manages pooled funds from donors, with automated release functions triggered by verified predictions.  
7. **TokenIssuer**: Issues and manages governance tokens as incentives for data providers and participants.  
8. **Governance**: Enables token holders to propose and vote on system upgrades, like model tweaks or new data sources.

These contracts interact seamlessly: Data flows from OracleFeed to DataAggregator, predictions are computed and verified, then aid is allocated—all transparently and without central control.