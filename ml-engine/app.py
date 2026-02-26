# =============================================================================
# SentinelOps - ML Engine for AI Threat Detection
# =============================================================================
# This module implements anomaly detection using Isolation Forest
# Input: Wazuh alerts, Suricata logs, System logs
# Output: Threat Score (Normal → Suspicious → High Risk → Attack)
# =============================================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SentinelOps-ML')

app = Flask(__name__)
CORS(app)

# Model storage
MODEL_PATH = 'models/threat_detector.joblib'
SCALER_PATH = 'models/scaler.joblib'

# Global model instance
model = None
scaler = None
model_info = {
    'trained': False,
    'last_trained': None,
    'training_samples': 0,
    'version': '1.0.0'
}


def extract_features(data: dict) -> np.ndarray:
    """
    Extract features from log/alert data for ML model
    
    Features:
    - alert_count: Number of alerts in time window
    - unique_sources: Number of unique source IPs
    - unique_destinations: Number of unique destination IPs
    - severity_score: Weighted severity score
    - port_diversity: Number of unique ports accessed
    - time_variance: Variance in event timestamps
    - bytes_transferred: Total bytes (if available)
    - failed_attempts: Count of failed login attempts
    - suspicious_commands: Count of suspicious commands
    - network_connections: Number of network connections
    """
    features = []
    
    # Alert-based features
    alerts = data.get('alerts', [])
    features.append(len(alerts))  # alert_count
    
    source_ips = set(a.get('source_ip', '') for a in alerts)
    features.append(len(source_ips))  # unique_sources
    
    dest_ips = set(a.get('dest_ip', '') for a in alerts if a.get('dest_ip'))
    features.append(len(dest_ips))  # unique_destinations
    
    # Severity score (weighted)
    severity_map = {'low': 1, 'medium': 2, 'high': 4, 'critical': 8}
    severity_score = sum(severity_map.get(a.get('severity', 'low'), 1) for a in alerts)
    features.append(severity_score)  # severity_score
    
    # Port diversity
    ports = set()
    for a in alerts:
        if 'port' in a:
            ports.add(a['port'])
    features.append(len(ports))  # port_diversity
    
    # Log-based features
    logs = data.get('logs', [])
    features.append(len(logs))  # log_count
    
    # Failed attempts
    failed_attempts = sum(1 for log in logs if 'failed' in str(log).lower())
    features.append(failed_attempts)  # failed_attempts
    
    # Suspicious patterns
    suspicious_keywords = ['sudo', 'chmod', 'wget', 'curl', 'nc', 'netcat', 'base64']
    suspicious_count = sum(
        1 for log in logs 
        if any(kw in str(log).lower() for kw in suspicious_keywords)
    )
    features.append(suspicious_count)  # suspicious_commands
    
    # Network features
    network_events = sum(1 for log in logs if 'network' in str(log).lower() or 'connection' in str(log).lower())
    features.append(network_events)  # network_connections
    
    # Time-based features (hour of day, is_weekend)
    current_hour = datetime.now().hour
    features.append(current_hour)  # hour_of_day
    
    is_weekend = 1 if datetime.now().weekday() >= 5 else 0
    features.append(is_weekend)  # is_weekend
    
    return np.array(features).reshape(1, -1)


def calculate_threat_score(anomaly_score: float) -> int:
    """
    Convert anomaly score to threat score (0-100)
    
    Anomaly scores from Isolation Forest:
    - Negative values indicate anomalies (more negative = more anomalous)
    - Positive values indicate normal behavior
    """
    # Normalize to 0-100 scale
    # Isolation Forest scores typically range from -0.5 to 0.5
    normalized = (1 - anomaly_score) * 50 + 50
    return max(0, min(100, int(normalized)))


def classify_threat(score: int) -> str:
    """Classify threat based on score"""
    if score >= 80:
        return 'attack'
    elif score >= 60:
        return 'high_risk'
    elif score >= 40:
        return 'suspicious'
    return 'normal'


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/status', methods=['GET'])
def status():
    """Get model status"""
    return jsonify({
        'success': True,
        'data': {
            **model_info,
            'model_loaded': model is not None,
            'features': [
                'alert_count', 'unique_sources', 'unique_destinations',
                'severity_score', 'port_diversity', 'log_count',
                'failed_attempts', 'suspicious_commands', 'network_connections',
                'hour_of_day', 'is_weekend'
            ]
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict threat level from incoming data
    
    Expected input:
    {
        "alerts": [...],
        "logs": [...]
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract features
        features = extract_features(data)
        
        # Scale features if scaler is available
        if scaler is not None:
            features = scaler.transform(features)
        
        # Predict
        if model is not None:
            anomaly_score = model.decision_function(features)[0]
            threat_score = calculate_threat_score(anomaly_score)
        else:
            # Fallback: rule-based scoring
            threat_score = rule_based_scoring(data)
        
        classification = classify_threat(threat_score)
        
        # Calculate confidence based on model and feature quality
        confidence = 0.85 if model is not None else 0.6
        
        result = {
            'source_ip': data.get('source_ip', data.get('alerts', [{}])[0].get('source_ip', 'unknown')),
            'threat_score': threat_score,
            'classification': classification,
            'confidence': confidence,
            'features': {
                'alert_count': int(features[0][0]) if scaler is None else 'scaled',
                'severity_score': int(features[0][3]) if scaler is None else 'scaled',
            },
            'related_alerts': [a.get('alert_id') for a in data.get('alerts', [])[:5]],
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Prediction: {classification} (score: {threat_score}) for {result['source_ip']}")
        
        return jsonify([result])
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


def rule_based_scoring(data: dict) -> int:
    """Fallback rule-based scoring when model is not available"""
    score = 0
    
    alerts = data.get('alerts', [])
    logs = data.get('logs', [])
    
    # Score based on alert count
    score += min(len(alerts) * 5, 30)
    
    # Score based on severity
    for alert in alerts:
        severity = alert.get('severity', 'low')
        if severity == 'critical':
            score += 20
        elif severity == 'high':
            score += 10
        elif severity == 'medium':
            score += 5
    
    # Score based on suspicious patterns
    suspicious_patterns = ['sql injection', 'xss', 'brute force', 'port scan', 'unauthorized']
    for alert in alerts:
        message = str(alert.get('message', '')).lower()
        if any(pattern in message for pattern in suspicious_patterns):
            score += 15
    
    return min(score, 100)


@app.route('/train', methods=['POST'])
def train():
    """
    Train or retrain the model with new data
    
    Expected input:
    {
        "training_data": [
            {"alerts": [...], "logs": [...], "label": "normal|attack"},
            ...
        ]
    }
    """
    global model, scaler, model_info
    
    try:
        data = request.json
        training_data = data.get('training_data', [])
        
        if len(training_data) < 10:
            return jsonify({'error': 'Insufficient training data (minimum 10 samples)'}), 400
        
        # Extract features from all training samples
        X = []
        for sample in training_data:
            features = extract_features(sample)
            X.append(features.flatten())
        
        X = np.array(X)
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train Isolation Forest
        model = IsolationForest(
            n_estimators=100,
            contamination=0.1,  # Assume 10% of data is anomalous
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_scaled)
        
        # Save model
        os.makedirs('models', exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        
        # Update model info
        model_info = {
            'trained': True,
            'last_trained': datetime.now().isoformat(),
            'training_samples': len(training_data),
            'version': '1.0.0'
        }
        
        logger.info(f"Model trained with {len(training_data)} samples")
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'samples_used': len(training_data),
            'model_info': model_info
        })
        
    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction for multiple data points
    """
    try:
        data = request.json
        items = data.get('items', [])
        
        results = []
        for item in items:
            features = extract_features(item)
            
            if scaler is not None:
                features = scaler.transform(features)
            
            if model is not None:
                anomaly_score = model.decision_function(features)[0]
                threat_score = calculate_threat_score(anomaly_score)
            else:
                threat_score = rule_based_scoring(item)
            
            results.append({
                'source_ip': item.get('source_ip', 'unknown'),
                'threat_score': threat_score,
                'classification': classify_threat(threat_score)
            })
        
        return jsonify({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


def load_model():
    """Load pre-trained model if available"""
    global model, scaler, model_info
    
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            logger.info("Model loaded from disk")
            
            if os.path.exists(SCALER_PATH):
                scaler = joblib.load(SCALER_PATH)
                logger.info("Scaler loaded from disk")
            
            model_info['trained'] = True
        else:
            logger.info("No pre-trained model found, using rule-based scoring")
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")


if __name__ == '__main__':
    load_model()
    
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"""
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 SentinelOps ML Engine                                    ║
║                                                               ║
║   Status:  RUNNING                                            ║
║   Port:    {port}                                               ║
║   Model:   {'Loaded' if model else 'Rule-based (no model)'}                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
